/**
 * shouldEscalate — deterministic routing to a human mentor. No LLM call.
 *
 * Rules (each contributes a reason; any one is enough to escalate):
 *  1. a requirement scored with confidence below the threshold
 *  2. a requirement that could not be scored for lack of evidence (null)
 *  3. the overall score sits within +/- BORDERLINE_BAND of the pass boundary
 *  4. the candidate disagreed with the assistant in a way the evaluator could not adjudicate
 *  5. the session was substantially shorter or longer than the brief anticipated
 *  6. (integrity) the transcript tries to instruct the evaluator
 *
 * Every reason names where the mentor should look, and `summary` is what gets
 * stored as `escalationReason`.
 */
import {
  BORDERLINE_BAND,
  CONFIDENCE_THRESHOLD,
  PASS_BOUNDARY,
  SESSION_LENGTH,
} from "../constants";
import type { EvaluationResult, RequirementCategory } from "./schemas";
import type { IntegrityFlag } from "./scoring";

export type EscalationCode =
  | "LOW_CONFIDENCE"
  | "NO_EVIDENCE"
  | "BORDERLINE_SCORE"
  | "UNADJUDICATED_DISAGREEMENT"
  | "SESSION_TOO_SHORT"
  | "SESSION_TOO_LONG"
  | "INTEGRITY_FLAG"
  | "NO_AI_EVALUATION"
  | "CONTESTED";

export interface EscalationReason {
  code: EscalationCode;
  message: string;
  requirementIds?: string[];
  turns?: number[];
}

export interface EscalationInput {
  evaluation: Pick<EvaluationResult, "perRequirement" | "overallScore" | "coverage" | "unadjudicatedDisagreement">;
  /** Used only to make reasons readable; escalation never depends on it. */
  requirements: { id: string; category: RequirementCategory }[];
  session: { durationMinutes: number; timeboxMinutes: number };
  integrityFlags?: IntegrityFlag[];
  /** True when no AI evaluator ran at all (DEMO_MODE offline evaluation). */
  noAiEvaluation?: boolean;
}

export interface EscalationDecision {
  escalate: boolean;
  reasons: EscalationReason[];
  /** Single string for `Evaluation.escalationReason`; null when not escalated. */
  summary: string | null;
}

const pct = (n: number) => `${Math.round(n)}%`;

export function shouldEscalate(input: EscalationInput): EscalationDecision {
  const { evaluation, session } = input;
  const label = new Map(input.requirements.map((r) => [r.id, r.category]));
  const named = (ids: string[]) => ids.map((id) => label.get(id) ?? id).join(", ");
  const reasons: EscalationReason[] = [];

  if (input.noAiEvaluation) {
    reasons.push({
      code: "NO_AI_EVALUATION",
      message: "No AI evaluator ran (offline demo mode), so every requirement needs a human score.",
    });
  }

  // 2. Nothing to go on for a requirement.
  const unscored = evaluation.perRequirement.filter((r) => r.score === null).map((r) => r.requirementId);
  if (unscored.length && !input.noAiEvaluation) {
    reasons.push({
      code: "NO_EVIDENCE",
      message: `${unscored.length} requirement${unscored.length === 1 ? "" : "s"} could not be scored for lack of evidence: ${named(unscored)}.`,
      requirementIds: unscored,
    });
  }

  // 1. Scored, but not confidently.
  const lowConfidence = evaluation.perRequirement
    .filter((r) => r.score !== null && r.confidence < CONFIDENCE_THRESHOLD)
    .map((r) => r.requirementId);
  if (lowConfidence.length) {
    reasons.push({
      code: "LOW_CONFIDENCE",
      message: `Confidence below ${CONFIDENCE_THRESHOLD} on ${named(lowConfidence)}.`,
      requirementIds: lowConfidence,
    });
  }

  // 3. Too close to the pass boundary to leave to a model.
  if (evaluation.coverage > 0 && Math.abs(evaluation.overallScore - PASS_BOUNDARY) <= BORDERLINE_BAND) {
    reasons.push({
      code: "BORDERLINE_SCORE",
      message: `Overall score ${pct(evaluation.overallScore)} is within ${BORDERLINE_BAND} points of the ${PASS_BOUNDARY}% pass boundary.`,
    });
  }

  // 4. A disagreement the evaluator could not settle.
  const dis = evaluation.unadjudicatedDisagreement;
  if (dis.present) {
    reasons.push({
      code: "UNADJUDICATED_DISAGREEMENT",
      message: `The candidate disagreed with the assistant and the evaluator could not tell who was right${dis.turns.length ? ` (turns ${dis.turns.join(", ")})` : ""}${dis.note ? `: ${dis.note}` : "."}`,
      turns: dis.turns,
    });
  }

  // 5. Session length vs the brief's timebox.
  const { durationMinutes: took, timeboxMinutes: box } = session;
  if (box > 0) {
    if (took < box * SESSION_LENGTH.tooShortFraction) {
      reasons.push({
        code: "SESSION_TOO_SHORT",
        message: `Session lasted ${Math.round(took)} min against a ${box} min timebox — much shorter than the brief anticipated.`,
      });
    } else if (took > box * SESSION_LENGTH.tooLongFraction) {
      reasons.push({
        code: "SESSION_TOO_LONG",
        message: `Session lasted ${Math.round(took)} min against a ${box} min timebox — much longer than the brief anticipated.`,
      });
    }
  }

  // 6. Someone talking to the evaluator.
  for (const f of input.integrityFlags ?? []) {
    reasons.push({ code: "INTEGRITY_FLAG", message: f.reason, turns: [f.turn] });
  }

  return {
    escalate: reasons.length > 0,
    reasons,
    summary: reasons.length ? reasons.map((r) => r.message).join(" ") : null,
  };
}
