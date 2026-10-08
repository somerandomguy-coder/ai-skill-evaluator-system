/**
 * Task approval and versioning repository.
 *
 * Implements B03 (Rows P07–P09):
 *  - Immutable content digest calculation (SHA-256 over brief, schemas, invariants, rubric).
 *  - Durable versioning: edits to approved tasks create a new PENDING version.
 *  - Durable mentor audit records: actor, timestamp, scores, decision, notes, digest/version.
 *  - 404 on unknown challenge audit without recording orphan audit.
 *  - Re-audit failure immediately revokes live approved badge while preserving historical audit log.
 *  - Cross-instance & restart durability through file-backed durable persistence.
 *  - Session pinning: historical sessions resolve the exact challenge version and rubric they started with.
 */
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ChallengeV2, MentorBadge, TierLevel, VerificationStatus } from "../types/assessment-v2";
import {
  evaluateMentorAudit,
  type MentorAuditDimensions,
  type MentorAuditEvaluation,
  type MentorAuditInput,
} from "../engine/verification";
import { VERIFIED_CHALLENGE_BANK } from "../engine/verified-bank";

export interface MentorAuditRecord {
  id: string;
  challengeId: string;
  version: number;
  contentDigest: string;
  mentorId: string;
  mentorName: string;
  scores: MentorAuditDimensions;
  totalScore: number;
  decision: "APPROVED" | "RE_CALIBRATE" | "REJECTED";
  notes?: string;
  reasons: string[];
  auditedAt: string;
}

export interface ChallengeContentVersion {
  challengeId: string;
  version: number;
  contentDigest: string;
  challenge: ChallengeV2;
  status: VerificationStatus;
  tier: TierLevel;
  badge?: MentorBadge;
  createdAt: string;
  updatedAt: string;
}

interface StoredChallengeData {
  challengeId: string;
  currentVersion: number;
  versions: Record<number, ChallengeContentVersion>;
  audits: MentorAuditRecord[];
}

interface StoreSchema {
  challenges: Record<string, StoredChallengeData>;
}

export function computeChallengeContentDigest(challenge: {
  title?: string;
  roleTitle?: string;
  brief?: string;
  briefMarkdown?: string;
  domainContext?: string;
  technicalInvariants?: string[];
  starterSchemas?: Record<string, string>;
  starterTemplate?: Record<string, string>;
  rubric?: Array<{ id: string; category?: string; statement: string; weight?: number; sfiaLevel?: number }>;
}): string {
  const title = (challenge.title || challenge.roleTitle || "").trim();
  const brief = (challenge.briefMarkdown || challenge.brief || "").trim();
  const domain = (challenge.domainContext || "").trim();
  const invariants = [...(challenge.technicalInvariants || [])].map((s) => s.trim()).sort();
  const schemas = Object.entries(challenge.starterSchemas || challenge.starterTemplate || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => [k, typeof v === "string" ? v.trim() : JSON.stringify(v)]);
  const rubric = [...(challenge.rubric || [])]
    .map((r) => ({
      id: r.id,
      category: r.category || "",
      statement: r.statement.trim(),
      weight: r.weight ?? 1,
      sfiaLevel: r.sfiaLevel ?? 3,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const canonical = JSON.stringify({ title, brief, domain, invariants, schemas, rubric });
  return createHash("sha256").update(canonical).digest("hex");
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export class TaskApprovalRepository {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), ".cache", "proofcraft-task-approval.json");
    this.ensureStoreInitialized();
  }

  private ensureStoreInitialized(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // Ignore if directory already created concurrently
      }
    }
    if (!fs.existsSync(this.filePath)) {
      const initial: StoreSchema = { challenges: {} };
      this.writeStore(initial);
    }
  }

  private readStore(): StoreSchema {
    this.ensureStoreInitialized();
    try {
      const content = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(content) as StoreSchema;
    } catch {
      return { challenges: {} };
    }
  }

  private writeStore(data: StoreSchema): void {
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, this.filePath);
  }

  public reset(): void {
    const empty: StoreSchema = { challenges: {} };
    this.writeStore(empty);
  }

  /**
   * Registers a challenge in the repository.
   * If it doesn't exist, initializes version 1.
   * For curated demo fixtures with explicit provenance origin 'curated_demo', approval is preserved.
   * For generated/imported production challenges, initial status is PENDING and tier TIER_3_GENERATED.
   */
  public registerChallenge(
    challenge: ChallengeV2,
    options?: { isCuratedDemo?: boolean }
  ): ChallengeContentVersion {
    const store = this.readStore();
    const digest = computeChallengeContentDigest(challenge);
    let record = store.challenges[challenge.id];

    if (!record) {
      const isCurated = options?.isCuratedDemo || challenge.provenance?.origin === "curated_demo";
      const status: VerificationStatus = isCurated ? (challenge.verification?.status ?? "APPROVED") : "PENDING";
      const tier: TierLevel = isCurated ? (challenge.tier ?? "TIER_1_VERIFIED") : "TIER_3_GENERATED";
      const badge = isCurated ? challenge.verification?.badge : undefined;

      const registeredChallenge: ChallengeV2 = {
        ...clone(challenge),
        verification: { status, badge },
        tier,
      };

      const versionRecord: ChallengeContentVersion = {
        challengeId: challenge.id,
        version: 1,
        contentDigest: digest,
        challenge: registeredChallenge,
        status,
        tier,
        badge,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      record = {
        challengeId: challenge.id,
        currentVersion: 1,
        versions: { 1: versionRecord },
        audits: [],
      };
      store.challenges[challenge.id] = record;
      this.writeStore(store);
      return clone(versionRecord);
    }

    // If challenge exists and digest matches current version, return current version
    const currentVersion = record.versions[record.currentVersion];
    if (currentVersion.contentDigest === digest) {
      return clone(currentVersion);
    }

    // Content digest changed -> create new version!
    return this.updateChallengeContent(challenge.id, challenge);
  }

  /**
   * Updates challenge content. If content digest changes from the current version,
   * a new PENDING version is created and any active approval badge is revoked on the new version.
   */
  public updateChallengeContent(
    challengeId: string,
    updatedData: Partial<ChallengeV2>
  ): ChallengeContentVersion {
    const store = this.readStore();
    const record = store.challenges[challengeId];
    if (!record) {
      throw new Error(`Challenge "${challengeId}" not found in repository`);
    }

    const currentVersionRecord = record.versions[record.currentVersion];
    const mergedChallenge: ChallengeV2 = {
      ...clone(currentVersionRecord.challenge),
      ...clone(updatedData),
      id: challengeId,
    };

    const newDigest = computeChallengeContentDigest(mergedChallenge);

    // If content digest is identical, just update metadata on current version
    if (newDigest === currentVersionRecord.contentDigest) {
      currentVersionRecord.challenge = mergedChallenge;
      currentVersionRecord.updatedAt = new Date().toISOString();
      this.writeStore(store);
      return clone(currentVersionRecord);
    }

    // Content has changed! Create new version with PENDING status.
    const newVersionNum = record.currentVersion + 1;
    const newChallenge: ChallengeV2 = {
      ...mergedChallenge,
      verification: {
        status: "PENDING",
        badge: undefined,
      },
      tier: "TIER_3_GENERATED",
    };

    const newVersionRecord: ChallengeContentVersion = {
      challengeId,
      version: newVersionNum,
      contentDigest: newDigest,
      challenge: newChallenge,
      status: "PENDING",
      tier: "TIER_3_GENERATED",
      badge: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    record.currentVersion = newVersionNum;
    record.versions[newVersionNum] = newVersionRecord;
    this.writeStore(store);

    return clone(newVersionRecord);
  }

  /**
   * Retrieves a challenge by ID.
   * If version is specified, returns that exact historical version.
   * Otherwise returns the latest active version.
   */
  public getChallenge(challengeId: string, version?: number): ChallengeV2 | null {
    const store = this.readStore();
    let record = store.challenges[challengeId];

    if (!record) {
      // Check seeded bank fallback
      const bankItem = VERIFIED_CHALLENGE_BANK.find((x) => x.id === challengeId);
      if (bankItem) {
        this.registerChallenge(bankItem, { isCuratedDemo: true });
        const refreshed = this.readStore();
        record = refreshed.challenges[challengeId];
      }
    }

    if (!record) return null;

    if (version !== undefined) {
      const ver = record.versions[version];
      return ver ? clone(ver.challenge) : null;
    }

    const current = record.versions[record.currentVersion];
    return current ? clone(current.challenge) : null;
  }

  /**
   * Retrieves the version record for a challenge.
   */
  public getChallengeVersion(challengeId: string, version?: number): ChallengeContentVersion | null {
    const store = this.readStore();
    const record = store.challenges[challengeId];
    if (!record) return null;

    const targetVersion = version !== undefined ? version : record.currentVersion;
    const ver = record.versions[targetVersion];
    return ver ? clone(ver) : null;
  }

  /**
   * Performs an audit on a challenge.
   * Rejects non-mentors (403).
   * Rejects unknown challenges (404) without recording an audit record.
   * If a re-audit fails, revokes current approved status and badge on the challenge,
   * while preserving the historical audit log intact.
   */
  public auditChallenge(input: MentorAuditInput & { actorRole?: string }): {
    evaluation: MentorAuditEvaluation;
    auditRecord: MentorAuditRecord;
    challenge: ChallengeV2;
  } {
    // 1. Authorization check
    if (input.actorRole && input.actorRole !== "MENTOR") {
      const err = new Error("Unauthorized: Mentor access required");
      (err as any).statusCode = 403;
      throw err;
    }

    const store = this.readStore();
    let record = store.challenges[input.challengeId];

    if (!record) {
      // Check seeded bank fallback
      const bankItem = VERIFIED_CHALLENGE_BANK.find((x) => x.id === input.challengeId);
      if (bankItem) {
        this.registerChallenge(bankItem, { isCuratedDemo: true });
        const refreshed = this.readStore();
        record = refreshed.challenges[input.challengeId];
      }
    }

    // 2. Existence check (Row P07: unknown challenge returns 404 without recording approval or orphan audit)
    if (!record) {
      const err = new Error(`Challenge "${input.challengeId}" not found in repository`);
      (err as any).statusCode = 404;
      throw err;
    }

    const targetVersion = input.version !== undefined ? input.version : record.currentVersion;
    const versionRecord = record.versions[targetVersion];
    if (!versionRecord) {
      const err = new Error(`Challenge "${input.challengeId}" version ${targetVersion} not found`);
      (err as any).statusCode = 404;
      throw err;
    }

    // 3. Evaluate audit dimensions
    const evaluation = evaluateMentorAudit(input);

    // 4. Create durable audit record
    const auditRecord: MentorAuditRecord = {
      id: `audit_${randomUUID()}`,
      challengeId: input.challengeId,
      version: targetVersion,
      contentDigest: versionRecord.contentDigest,
      mentorId: input.mentorId,
      mentorName: input.mentorName || "Accredited Mentor",
      scores: input.scores,
      totalScore: evaluation.totalScore,
      decision: evaluation.passed ? "APPROVED" : evaluation.status === "RE_CALIBRATE" ? "RE_CALIBRATE" : "REJECTED",
      notes: input.notes,
      reasons: evaluation.reasons,
      auditedAt: new Date().toISOString(),
    };

    record.audits.push(auditRecord);

    // 5. Update challenge state
    if (evaluation.passed) {
      versionRecord.status = "APPROVED";
      versionRecord.tier = "TIER_1_VERIFIED";
      versionRecord.badge = evaluation.badge;
      versionRecord.challenge.verification = {
        status: "APPROVED",
        badge: evaluation.badge,
      };
      versionRecord.challenge.tier = "TIER_1_VERIFIED";
    } else {
      // Row P08: Failed re-audit revokes badge and tier
      versionRecord.status = evaluation.status;
      versionRecord.tier = "TIER_3_GENERATED";
      versionRecord.badge = undefined;
      versionRecord.challenge.verification = {
        status: evaluation.status,
        badge: undefined,
      };
      versionRecord.challenge.tier = "TIER_3_GENERATED";
    }

    versionRecord.updatedAt = new Date().toISOString();
    this.writeStore(store);

    return {
      evaluation,
      auditRecord: clone(auditRecord),
      challenge: clone(versionRecord.challenge),
    };
  }

  /**
   * Returns all audit records for a challenge.
   */
  public getAudits(challengeId: string): MentorAuditRecord[] {
    const store = this.readStore();
    const record = store.challenges[challengeId];
    return record ? clone(record.audits) : [];
  }

  /**
   * Checks whether a challenge is currently eligible for Tier 1 verified resolution.
   * If a challenge failed re-audit or is PENDING/REJECTED, it is ineligible.
   */
  public isEligible(challengeId: string): boolean {
    const store = this.readStore();
    const record = store.challenges[challengeId];
    if (!record) return false;

    const current = record.versions[record.currentVersion];
    if (!current) return false;

    return current.status === "APPROVED" && Boolean(current.badge);
  }

  /**
   * Lists all current challenges in the repository.
   */
  public listChallenges(): ChallengeV2[] {
    const store = this.readStore();
    return Object.values(store.challenges).map((c) => clone(c.versions[c.currentVersion].challenge));
  }
}

export const taskApprovalRepo = new TaskApprovalRepository();
