/**
 * evaluateSubmission(chatTurns, fileSnapshot, requirements)
 *
 * Scores each requirement 0-5 with a confidence and verified evidence, then
 * computes the weighted overall score. Its inputs are exactly the transcript,
 * the final file tree and the rubric — there is no parameter for a candidate's
 * name, CV or any other attribute, so the evaluator can never see one.
 */
import type { FileMap } from "../files";
import { isDemoMode } from "../env";
import { RUBRIC_VERSION } from "../constants";
import { generateStructured, type TraceContext } from "./client";
import { EVALUATOR_SYSTEM_PROMPT, buildEvaluatorUserMessage } from "./prompts/evaluator";
import { EvaluatorOutputSchema, type EvaluationResult } from "./schemas";
import { finalizeEvaluation, type RequirementRef, type TranscriptTurn } from "./scoring";

export interface EvaluateOptions {
  rubricVersion?: string;
  traceContext?: TraceContext;
}


/**
 * DEMO_MODE has no model to ask. Rather than invent a judgment, every
 * requirement is left unscored ("no evidence to go on") and the submission is
 * routed to a human mentor. The result is explicit about what it is.
 */
export function offlineEvaluation(requirements: RequirementRef[]): EvaluationResult {
  return {
    overallScore: 0,
    confidence: 0,
    coverage: 0,
    perRequirement: requirements.map((r) => ({
      requirementId: r.id,
      score: null,
      confidence: 0,
      evidence: [],
      rationale: "No AI evaluator ran (demo mode). A mentor will score this requirement.",
      note: "Not scored: demo mode has no live evaluator.",
    })),
    strengths: [],
    gaps: [],
    unadjudicatedDisagreement: { present: false, turns: [], note: "" },
  };
}

export async function evaluateSubmission(
  chatTurns: TranscriptTurn[],
  fileSnapshot: FileMap,
  requirements: RequirementRef[],
  options: EvaluateOptions = {}
): Promise<EvaluationResult> {
  if (isDemoMode()) return offlineEvaluation(requirements);

  const { data } = await generateStructured({
    stage: "evaluator",
    system: EVALUATOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildEvaluatorUserMessage({
          requirements,
          turns: chatTurns,
          files: fileSnapshot,
          rubricVersion: options.rubricVersion ?? RUBRIC_VERSION,
        }),
      },
    ],
    schema: EvaluatorOutputSchema,
    maxTokens: 24_000,
    effort: "high",
    traceContext: options.traceContext,
  });

  return finalizeEvaluation(data, { requirements, turns: chatTurns, files: fileSnapshot });

}
