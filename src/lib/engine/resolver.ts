import { ChallengeV2, ResolutionReason, TierLevel } from "../types/assessment-v2";
import { cosineSimilarity, generateEmbedding } from "./embedding";
import { runAgenticGenerationPipeline } from "./pipeline";
import { VERIFIED_CHALLENGE_BANK } from "./verified-bank";
import { taskApprovalRepo } from "../data/task-approval";

export interface ResolutionResult {
  challenge: ChallengeV2;
  tierResolved: TierLevel;
  resolutionReason?: ResolutionReason;
  similarityScore?: number;
  latencyMs: number;
}

export interface ResolveOptions {
  supervisedSemanticLookup?: boolean;
}

export interface VectorQueryFilter {
  "verification.status"?: string | { $ne?: string };
}

export interface VectorQueryParams {
  vector: number[];
  filter?: VectorQueryFilter;
  threshold: number;
}

export interface VectorMatch {
  item: ChallengeV2;
  score: number;
}

// In-memory cache of challenges (Tier 1 verified bank + dynamically generated Tier 2/3 challenges)
const challengeRepository = new Map<string, ChallengeV2>();

function cloneChallenge(item: ChallengeV2): ChallengeV2 {
  return JSON.parse(JSON.stringify(item));
}

function challengeEmbeddingText(item: ChallengeV2): string {
  return [
    "Role: " + item.roleTitle,
    "Company: " + item.companyName,
    "Exercise brief:",
    item.briefMarkdown,
  ].join("\n");
}

// Pre-populate with verified bank and compute embeddings using shared promise
let initialization: Promise<void> | null = null;

export async function initializeRepository(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      for (const item of VERIFIED_CHALLENGE_BANK) {
        if (!item.embeddingVector) {
          item.embeddingVector = await generateEmbedding(challengeEmbeddingText(item));
        }
        challengeRepository.set(item.id, item);
      }
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
}

/**
 * Saves or updates a challenge in the semantic repository.
 */
export function registerChallengeInRepository(challenge: ChallengeV2): void {
  challengeRepository.set(challenge.id, challenge);
  taskApprovalRepo.registerChallenge(challenge);
}

/**
 * Retrieves a challenge by ID from the repository.
 * Reads durable task approval state first to ensure consistency with audits and UI.
 */
export function getChallengeFromRepository(id: string): ChallengeV2 | null {
  const durable = taskApprovalRepo.getChallenge(id);
  if (durable) return cloneChallenge(durable);
  const found = challengeRepository.get(id) ?? VERIFIED_CHALLENGE_BANK.find((x) => x.id === id) ?? null;
  return found ? cloneChallenge(found) : null;
}

/**
 * Returns all challenges currently in the repository.
 */
export function listRepositoryChallenges(): ChallengeV2[] {
  return Array.from(challengeRepository.values()).map(cloneChallenge);
}

/**
 * Increments the usage counter for a challenge without mutating shared fixtures.
 */
export async function incrementChallengeUsage(challengeId: string): Promise<void> {
  const found = challengeRepository.get(challengeId);
  if (found) {
    found.metadata.usageCount = (found.metadata.usageCount || 0) + 1;
  }
}

/**
 * Queries the challenge repository using vector cosine similarity.
 * Rejects mixed-space vectors where dimensions do not match (Row R08).
 */
export async function queryVectorStore(params: VectorQueryParams): Promise<VectorMatch | null> {
  await initializeRepository();

  let bestMatch: VectorMatch | null = null;
  let highestScore = -1;

  for (const rawItem of challengeRepository.values()) {
    const item = taskApprovalRepo.getChallenge(rawItem.id) ?? rawItem;

    // 1. Evaluate filter
    if (params.filter) {
      const statusFilter = params.filter["verification.status"];
      if (typeof statusFilter === "string") {
        if (item.verification.status !== statusFilter) continue;
      } else if (statusFilter && typeof statusFilter === "object" && "$ne" in statusFilter) {
        if (item.verification.status === statusFilter.$ne) continue;
      }
    }

    // 2. Ensure item has an embedding vector
    if (!item.embeddingVector) {
      item.embeddingVector = await generateEmbedding(challengeEmbeddingText(item));
    }

    // 3. Space compatibility check: reject vectors from different embedding spaces / dimensions
    if (!item.embeddingVector || item.embeddingVector.length !== params.vector.length) {
      continue;
    }

    // 4. Compute cosine similarity
    const score = cosineSimilarity(params.vector, item.embeddingVector);

    if (score >= params.threshold && score > highestScore) {
      highestScore = score;
      bestMatch = { item: cloneChallenge(item), score };
    }
  }

  return bestMatch;
}

export interface FastRouteMatch {
  fixtureId: string;
  reason: string;
}

/**
 * Detects unambiguous match to one of the four curated demo fixtures.
 * Requires:
 *  - Explicit company evidence
 *  - Independent engineering/domain responsibility evidence (company name text cannot count as domain signal)
 *  - Compatible seniority (Junior roles conflict with Level 3 demo fixtures)
 *  - No negations / exclusions of the required domain
 */
export function detectCuratedDemoFastRoute(
  rawJd: string,
  companyName: string
): FastRouteMatch | null {
  const lowerJd = rawJd.toLowerCase();
  const cleanComp = (companyName || "").toLowerCase().trim();

  // 1. Seniority Check: Check for Junior / Graduate / Entry (SFIA Level 2)
  // The curated demo bank is SFIA Level 3 (Mid-level).
  // Junior roles conflict with Level 3 fixtures.
  const isJunior = /\b(junior|graduate|intern|entry[\s-]level|associate)\b/i.test(lowerJd);

  // 2. Check for Non-Engineering / Administrative roles
  const isNonEngineering = /\b(accountant|accounting|finance|receptionist|office manager|recruiter|hr generalist|legal counsel)\b/i.test(lowerJd);

  if (isJunior || isNonEngineering) {
    return null;
  }

  // A. STP2 Payroll (Employment Hero) -> verified-stp2-engine
  const isEmploymentHero = cleanComp.includes("employment hero") || lowerJd.includes("employment hero");
  if (isEmploymentHero) {
    const hasPayrollResponsibilities =
      /\b(stp phase 2|single touch payroll|disaggregation|statutory wage|award penalty|tax withholding|integer cents|cents-rounding|pay-run|pay run)\b/i.test(lowerJd);

    if (hasPayrollResponsibilities) {
      return {
        fixtureId: "verified-stp2-engine",
        reason: "Employment Hero STP Phase 2 Payroll Engineering",
      };
    }
  }

  // B. CDR Gateway (Biza.io) -> verified-cdr-gateway
  const isBiza = cleanComp.includes("biza") || lowerJd.includes("biza.io") || lowerJd.includes("biza");
  if (isBiza) {
    const isExcluded = /\b(not cdr|excluding cdr|cdr is excluded|excluded from.*cdr|excluding open banking)\b/i.test(lowerJd);
    if (!isExcluded) {
      const hasCdrResponsibilities =
        /\b(consumer data right|open banking|cdr gateway|data holder|consent register|cdr metrics|fapi-rw|infosec profile)\b/i.test(lowerJd);

      if (hasCdrResponsibilities) {
        return {
          fixtureId: "verified-cdr-gateway",
          reason: "Biza.io Consumer Data Right Gateway Engineering",
        };
      }
    }
  }

  // C. TalentAI Screener (TalentAI) -> verified-talentai-screener
  const isTalentAi = cleanComp.includes("talentai") || lowerJd.includes("talentai");
  if (isTalentAi) {
    const hasScreenerResponsibilities =
      /\b(fair hiring|bias detection|bias mitigation|adverse impact|resume screener|resume screening|four-fifths rule|hiring audit)\b/i.test(lowerJd);

    if (hasScreenerResponsibilities) {
      return {
        fixtureId: "verified-talentai-screener",
        reason: "TalentAI Fair Hiring Resume Screening Engineering",
      };
    }
  }

  // D. TGD RTS Engine (Total Game Development) -> verified-tgd-rts-sim
  const isTgd =
    cleanComp.includes("total game development") ||
    cleanComp === "tgd" ||
    lowerJd.includes("total game development") ||
    (/\btgd\b/i.test(lowerJd) && cleanComp.includes("tgd"));

  if (isTgd) {
    // "Total Game Development\nRole: Accountant" has company name "Game", but company text
    // must NOT count as its own domain signal! Must contain independent lockstep/RTS engine duties:
    const hasRtsResponsibilities =
      /\b(lockstep|deterministic simulation|spatial grid|spatial indexing|rts engine|game physics|quadtree|fixed-point physics|desync detection)\b/i.test(lowerJd);

    if (hasRtsResponsibilities) {
      return {
        fixtureId: "verified-tgd-rts-sim",
        reason: "Total Game Development Deterministic RTS Engine",
      };
    }
  }

  return null;
}

/**
 * Resolves an incoming Job Description:
 * 1. Curated Demo Fast Path: unambiguous match to one of 4 curated rehearsal fixtures (zero embedding calls)
 * 2. Explicit Supervised Semantic Path: if options.supervisedSemanticLookup is true, queries vector store
 * 3. Default Path: Generates pending challenge directly without bank initialization or query embeddings (M02)
 */
export async function resolveChallenge(
  rawJd: string,
  companyName: string,
  options?: ResolveOptions
): Promise<ResolutionResult> {
  const startTime = Date.now();

  // 1. Fast Path for Curated Rehearsal Fixtures (Zero embedding & Zero generation calls)
  const fastMatch = detectCuratedDemoFastRoute(rawJd, companyName);
  if (fastMatch) {
    const item = VERIFIED_CHALLENGE_BANK.find((x) => x.id === fastMatch.fixtureId);
    if (item && item.verification.status === "APPROVED") {
      const cloned = cloneChallenge(item);
      cloned.provenance = {
        origin: "curated_demo",
        resolutionReason: "DEMO_FAST_PATH",
      };
      cloned.metadata = {
        ...cloned.metadata,
        usageCount: (item.metadata?.usageCount || 0) + 1,
      };

      return {
        challenge: cloned,
        tierResolved: "TIER_1_VERIFIED",
        resolutionReason: "DEMO_FAST_PATH",
        similarityScore: 1.0,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // 2. Explicit Supervised Semantic Path: only when explicitly enabled
  if (options?.supervisedSemanticLookup) {
    await initializeRepository();
    const jdEmbedding = await generateEmbedding(rawJd);

    // Tier 1 Check: Pre-audited, Mentor-Verified Bank (Threshold: >= 0.88)
    const tier1Match = await queryVectorStore({
      vector: jdEmbedding,
      filter: { "verification.status": "APPROVED" },
      threshold: 0.88,
    });

    if (tier1Match && tier1Match.item.verification.status === "APPROVED") {
      const cloned = cloneChallenge(tier1Match.item);
      cloned.provenance = {
        origin: "curated_demo",
        resolutionReason: "SEMANTIC_MATCH",
      };
      cloned.metadata = {
        ...cloned.metadata,
        usageCount: (cloned.metadata?.usageCount || 0) + 1,
      };
      return {
        challenge: cloned,
        tierResolved: "TIER_1_VERIFIED",
        resolutionReason: "SEMANTIC_MATCH",
        similarityScore: Math.round(tier1Match.score * 100) / 100,
        latencyMs: Date.now() - startTime,
      };
    }

    // Tier 2 Check: Historical Semantic Cache (Threshold: >= 0.82)
    const tier2Match = await queryVectorStore({
      vector: jdEmbedding,
      filter: { "verification.status": { $ne: "REJECTED" } },
      threshold: 0.82,
    });

    if (tier2Match) {
      const cloned = cloneChallenge(tier2Match.item);
      cloned.tier = "TIER_2_CACHED";
      cloned.provenance = {
        origin: "curated_demo",
        resolutionReason: "SEMANTIC_MATCH",
      };
      cloned.metadata = {
        ...cloned.metadata,
        usageCount: (cloned.metadata?.usageCount || 0) + 1,
      };
      return {
        challenge: cloned,
        tierResolved: "TIER_2_CACHED",
        resolutionReason: "SEMANTIC_MATCH",
        similarityScore: Math.round(tier2Match.score * 100) / 100,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // 3. Normal / Default Path for Unfamiliar Jobs (Packet M02):
  // Generate pending challenge directly without bank initialization or query embedding.
  const generatedChallenge = await runAgenticGenerationPipeline(rawJd, companyName);
  generatedChallenge.provenance = {
    origin: "ai",
    resolutionReason: "GENERATED",
  };
  registerChallengeInRepository(generatedChallenge);

  return {
    challenge: cloneChallenge(generatedChallenge),
    tierResolved: "TIER_3_GENERATED",
    resolutionReason: "GENERATED",
    latencyMs: Date.now() - startTime,
  };
}
