import type { ChallengeV2, MentorBadge, VerificationStatus } from "../types/assessment-v2";

export interface MentorAuditDimensions {
  realism: number; // 1-4: Realism & Contextual Fidelity
  sfiaCalibration: number; // 1-4: SFIA Calibration (Level 2: 2h, Level 3: 3h)
  trapEfficacy: number; // 1-4: AI Provocation & Trap Efficacy
  observability: number; // 1-4: Transcript Observability
  fairness: number; // 1-4: Equity & International Talent Fairness
}

export interface MentorAuditInput {
  challengeId: string;
  mentorId: string;
  mentorName?: string;
  scores: MentorAuditDimensions;
  notes?: string;
}

export interface MentorAuditEvaluation {
  totalScore: number;
  maxScore: number;
  passed: boolean;
  minDimensionScore: number;
  status: VerificationStatus;
  badge?: MentorBadge;
  reasons: string[];
}

export const AUDIT_THRESHOLDS = {
  MIN_TOTAL: 16,
  MAX_TOTAL: 20,
  MIN_INDIVIDUAL_DIMENSION: 3,
};

/**
 * Evaluates the 5-dimension mentor audit scorecard.
 * Requires totalScore >= 16/20 and every dimension >= 3 to qualify for Tier 1 promotion.
 */
export function evaluateMentorAudit(input: MentorAuditInput): MentorAuditEvaluation {
  const { scores } = input;
  const values = [
    scores.realism,
    scores.sfiaCalibration,
    scores.trapEfficacy,
    scores.observability,
    scores.fairness,
  ];

  const totalScore = values.reduce((sum, v) => sum + Math.max(1, Math.min(4, Math.round(v))), 0);
  const minDimensionScore = Math.min(...values);
  const reasons: string[] = [];

  const passedTotal = totalScore >= AUDIT_THRESHOLDS.MIN_TOTAL;
  const passedIndividual = minDimensionScore >= AUDIT_THRESHOLDS.MIN_INDIVIDUAL_DIMENSION;

  if (!passedTotal) {
    reasons.push(`Total audit score (${totalScore}/20) is below the required 16-point threshold.`);
  }

  if (!passedIndividual) {
    if (scores.realism < 3) reasons.push("Realism & Contextual Fidelity scored below 3.");
    if (scores.sfiaCalibration < 3) reasons.push("SFIA Calibration scored below 3.");
    if (scores.trapEfficacy < 3) reasons.push("AI Provocation & Trap Efficacy scored below 3.");
    if (scores.observability < 3) reasons.push("Transcript Observability scored below 3.");
    if (scores.fairness < 3) reasons.push("Equity & International Talent Fairness scored below 3.");
  }

  const passed = passedTotal && passedIndividual;
  let status: VerificationStatus;

  if (passed) {
    status = "APPROVED";
  } else if (totalScore >= 12) {
    status = "RE_CALIBRATE";
  } else {
    status = "REJECTED";
  }

  const badge: MentorBadge | undefined = passed
    ? {
        mentorId: input.mentorId,
        mentorName: input.mentorName || "Accredited Mentor",
        verifiedAt: new Date().toISOString(),
        auditScore: totalScore,
        notes: input.notes,
      }
    : undefined;

  return {
    totalScore,
    maxScore: AUDIT_THRESHOLDS.MAX_TOTAL,
    passed,
    minDimensionScore,
    status,
    badge,
    reasons,
  };
}

/**
 * Applies a mentor audit to a ChallengeV2 record, updating status and promoting to Tier 1 if qualified.
 */
export function applyAuditToChallenge(
  challenge: ChallengeV2,
  audit: MentorAuditEvaluation
): ChallengeV2 {
  const updated: ChallengeV2 = {
    ...challenge,
    verification: {
      status: audit.status,
      badge: audit.badge ?? challenge.verification.badge,
    },
    tier: audit.passed ? "TIER_1_VERIFIED" : challenge.tier,
  };

  return updated;
}
