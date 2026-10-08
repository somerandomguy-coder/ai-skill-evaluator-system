import type { EvaluationView, UserView } from "./types";
import type { ShareCapability } from "./shares";
import { ServiceError } from "../services/errors";

export interface PublicEvidenceExcerpt {
  requirementId: string;
  category: string;
  statement: string;
  score: number | null;
  publicExcerpt?: string;
}

export interface EmployerReportDto {
  id: string; // share capability id
  evaluationId: string;
  roleTitle: string;
  employer: string;
  candidateName?: string;
  overallScore: number;
  confidence: number;
  coverage: number;
  effectiveScore: number;
  strengths: string[];
  gaps: string[];
  publicEvidence: PublicEvidenceExcerpt[];
  shareScope: "EMPLOYER_VIEW";
  shareTokenHash: string;
}

/**
 * Server-side construction of the minimal authorized employer DTO.
 * Excludes raw transcripts, full files, assistant reasoning, private contest reasons,
 * internal traps, and private source JDs.
 */
export function toEmployerReportDto(
  evaluation: EvaluationView,
  capability: ShareCapability
): EmployerReportDto {
  const publicEvidence: PublicEvidenceExcerpt[] = evaluation.results.map((r) => {
    // Only verified candidate quotations from USER turns can be public excerpts
    const candidateTurn = r.evidence.find(
      (e) => e.verified && e.type === "turn" && (e as any).speaker !== "ASSISTANT"
    );
    return {
      requirementId: r.requirementId,
      category: r.requirement?.category || (r as any).category || "GENERAL",
      statement: r.requirement?.statement || (r as any).statement || "",
      score: r.score,
      publicExcerpt: candidateTurn?.quote,
    };
  });

  return {
    id: capability.id,
    evaluationId: evaluation.id,
    roleTitle: evaluation.job.roleTitle,
    employer: evaluation.job.employer,
    candidateName: evaluation.candidateName,
    overallScore: evaluation.overallScore,
    confidence: evaluation.confidence,
    coverage: evaluation.coverage,
    effectiveScore: evaluation.effective.score,
    strengths: evaluation.strengths,
    gaps: evaluation.gaps,
    publicEvidence,
    shareScope: "EMPLOYER_VIEW",
    shareTokenHash: capability.tokenHash,
  };
}

/**
 * Ensures that private evaluations are NEVER serialized to client components
 * for unauthorized viewers (not owner and not mentor).
 */
export function assertPrivateReportAuthorized(
  viewer: UserView | null,
  ownerId: string
): void {
  if (!viewer) {
    throw new ServiceError("Authentication required to access private evaluation report.", 401);
  }
  if (viewer.id !== ownerId && viewer.role !== "MENTOR") {
    throw new ServiceError("Forbidden: Cross-owner access to private evaluation is prohibited.", 403);
  }
}
