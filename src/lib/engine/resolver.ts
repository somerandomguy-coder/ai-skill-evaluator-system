import { ChallengeV2, TierLevel } from "../types/assessment-v2";
import { cosineSimilarity, generateEmbedding } from "./embedding";
import { runAgenticGenerationPipeline } from "./pipeline";
import { VERIFIED_CHALLENGE_BANK } from "./verified-bank";

export interface ResolutionResult {
  challenge: ChallengeV2;
  tierResolved: TierLevel;
  similarityScore?: number;
  latencyMs: number;
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

// Pre-populate with verified bank and compute embeddings
let initialized = false;

export async function initializeRepository(): Promise<void> {
  if (initialized) return;
  initialized = true;

  for (const item of VERIFIED_CHALLENGE_BANK) {
    if (!item.embeddingVector) {
      const corpus = `${item.roleTitle} ${item.companyName} ${item.briefMarkdown.slice(0, 500)}`;
      item.embeddingVector = await generateEmbedding(corpus);
    }
    challengeRepository.set(item.id, item);
  }
}

/**
 * Saves or updates a challenge in the semantic repository.
 */
export function registerChallengeInRepository(challenge: ChallengeV2): void {
  challengeRepository.set(challenge.id, challenge);
}

/**
 * Retrieves a challenge by ID from the repository.
 */
export function getChallengeFromRepository(id: string): ChallengeV2 | null {
  return challengeRepository.get(id) ?? null;
}

/**
 * Returns all challenges currently in the repository.
 */
export function listRepositoryChallenges(): ChallengeV2[] {
  return Array.from(challengeRepository.values());
}

/**
 * Increments the usage counter for a challenge.
 */
export async function incrementChallengeUsage(challengeId: string): Promise<void> {
  const found = challengeRepository.get(challengeId);
  if (found) {
    found.metadata.usageCount = (found.metadata.usageCount || 0) + 1;
  }
}

/**
 * Queries the challenge repository using vector cosine similarity.
 */
export async function queryVectorStore(params: VectorQueryParams): Promise<VectorMatch | null> {
  await initializeRepository();

  let bestMatch: VectorMatch | null = null;
  let highestScore = -1;

  for (const item of challengeRepository.values()) {
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
      const corpus = `${item.roleTitle} ${item.companyName} ${item.briefMarkdown}`;
      item.embeddingVector = await generateEmbedding(corpus);
    }

    // 3. Compute cosine similarity
    const score = cosineSimilarity(params.vector, item.embeddingVector);

    if (score >= params.threshold && score > highestScore) {
      highestScore = score;
      bestMatch = { item, score };
    }
  }

  return bestMatch;
}

/**
 * Resolves an incoming Job Description through the 3-Tier Challenge Hierarchy:
 * - Tier 1: Check Mentor-Verified Repository (Status = APPROVED, Similarity >= 0.88)
 * - Tier 2: Check Historical Semantic Cache (Status != REJECTED, Similarity >= 0.82)
 * - Tier 3: Agentic Generation Pipeline Fallback (enqueued for audit)
 */
export async function resolveChallenge(
  rawJd: string,
  companyName: string
): Promise<ResolutionResult> {
  const startTime = Date.now();
  await initializeRepository();

  const jdEmbedding = await generateEmbedding(rawJd);

  // 1. Tier 1 Check: Pre-audited, Mentor-Verified Bank (Threshold: >= 0.88)
  const tier1Match = await queryVectorStore({
    vector: jdEmbedding,
    filter: { "verification.status": "APPROVED" },
    threshold: 0.88,
  });

  if (tier1Match) {
    await incrementChallengeUsage(tier1Match.item.id);
    return {
      challenge: tier1Match.item,
      tierResolved: "TIER_1_VERIFIED",
      similarityScore: Math.round(tier1Match.score * 100) / 100,
      latencyMs: Date.now() - startTime,
    };
  }

  // 2. Tier 2 Check: Historical Semantic Cache (Threshold: >= 0.82)
  const tier2Match = await queryVectorStore({
    vector: jdEmbedding,
    filter: { "verification.status": { $ne: "REJECTED" } },
    threshold: 0.82,
  });

  if (tier2Match) {
    await incrementChallengeUsage(tier2Match.item.id);
    return {
      challenge: {
        ...tier2Match.item,
        tier: "TIER_2_CACHED",
      },
      tierResolved: "TIER_2_CACHED",
      similarityScore: Math.round(tier2Match.score * 100) / 100,
      latencyMs: Date.now() - startTime,
    };
  }

  // 3. Tier 3 Fallback: Agentic Generation Pipeline
  const generatedChallenge = await runAgenticGenerationPipeline(rawJd, companyName, jdEmbedding);

  // Register in repository as Tier 2 candidate pending mentor verification
  registerChallengeInRepository(generatedChallenge);

  return {
    challenge: generatedChallenge,
    tierResolved: "TIER_3_GENERATED",
    latencyMs: Date.now() - startTime,
  };
}
