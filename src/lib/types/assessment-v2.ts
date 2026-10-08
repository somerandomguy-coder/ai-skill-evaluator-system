export type SfiaLevel = 2 | 3; // SFIA 9 Standard: Level 2: Assist (Junior), Level 3: Apply (Mid-Level)

export type SfiaSkillCode = "PROG" | "DESN" | "TEST" | "DBDS" | "ITOP";

export interface SfiaProfile {
  level: SfiaLevel;
  primarySkills: SfiaSkillCode[];
  attributes: {
    autonomy: string;
    influence: string;
    complexity: string;
    knowledge: string;
    businessSkills: string;
  };
}

export type TierLevel = "TIER_1_VERIFIED" | "TIER_2_CACHED" | "TIER_3_GENERATED";

export type ResolutionReason = "DEMO_FAST_PATH" | "GENERATED" | "SEMANTIC_MATCH";

export type TaskOrigin = "curated_demo" | "ai" | "deterministic_fallback";

export interface ChallengeProvenance {
  origin: TaskOrigin;
  resolutionReason?: ResolutionReason;
  parentChallengeId?: string;
}

export type VerificationStatus = "APPROVED" | "RE_CALIBRATE" | "REJECTED" | "PENDING";

export interface MentorBadge {
  mentorId: string;
  mentorName?: string;
  verifiedAt: string;
  auditScore: number; // Max 20 across 5 dimensions
  notes?: string;
}

export type RubricCategory =
  | "PROBLEM_FRAMING"
  | "TECHNICAL_APPROACH"
  | "AI_DIRECTION"
  | "CRITICAL_JUDGMENT"
  | "TRADEOFF_AWARENESS"
  | "DOMAIN_FIT"
  | "COMMUNICATION";

export interface RubricRequirement {
  id: string;
  category: RubricCategory;
  weight: number;
  sfiaLevel: SfiaLevel;
  statement: string;
  injectedTrap?: string; // Deliberate AI failure mode the candidate must catch
  successSignals: string[]; // Observable cues in chat turns / code diffs
  failureModes: string[]; // Observable vibe-coding anti-patterns
}

export interface StageExecutionRecord {
  stage: string;
  origin: "ai" | "deterministic_fallback" | "curated_demo";
  model?: string;
  durationMs?: number;
  attemptCount: number;
  fallbackReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  } | "unknown";
}

export interface ChallengeMetadata {
  createdAt: string;
  usageCount: number;
  promptVersion?: string;
  sourceTruncated?: boolean;
  omittedChars?: number;
  stages?: StageExecutionRecord[];
}

export interface ChallengeV2 {
  id: string;
  tier: TierLevel;
  companyName: string;
  roleTitle: string;
  embeddingVector?: number[];
  sfiaProfile: SfiaProfile;
  briefMarkdown: string;
  technicalInvariants: string[];
  starterSchemas: Record<string, string>;
  rubric: RubricRequirement[];
  provenance?: ChallengeProvenance;
  verification: {
    status: VerificationStatus;
    badge?: MentorBadge;
  };
  metadata: ChallengeMetadata;
}
