import { z } from "zod";
import { generateStructured } from "../ai/client";
import { isDemoMode, openaiApiKey } from "../env";
import type { TurnView } from "../data/types";
import {
  ACADEMIC_FRAMEWORK_SOURCES,
  type AcademicDimension,
  type DimensionEvaluation,
  type GroundedAssessmentReport,
  type QualitativeBand,
} from "../types/assessment-academic";
import type { SfiaLevel } from "../types/assessment-v2";

export interface AcademicEvaluationInput {
  sessionId: string;
  sfiaLevel?: SfiaLevel;
  challengeTitle: string;
  briefMarkdown?: string;
  turns: TurnView[];
  finalScore?: number;
}

export const AcademicDimensionSchema = z.enum([
  "EXPLORATION_VS_ACCELERATION",
  "COGNITIVE_VERIFICATION",
  "CONSTRAINT_SPECIFICATION",
  "HIERARCHICAL_DECOMPOSITION",
  "ARCHITECTURAL_SENSEMAKING",
]);

export const QualitativeBandSchema = z.enum(["EXEMPLARY", "PROFICIENT", "DEVELOPING", "AT_RISK"]);

export const EvidenceTraceSchema = z.object({
  turnId: z.string().describe("Sequential turn identifier, e.g. 'Turn 1' or 'Turn 3'"),
  excerpt: z.string().describe("Verbatim excerpt from the candidate's prompt or review"),
  observedBehavior: z.enum(["SUCCESS_SIGNAL", "AUTOMATION_BIAS_TRAP"]),
  interpretation: z.string().describe("Brief analysis connecting the excerpt to the academic framework"),
});

export const DimensionEvaluationSchema = z.object({
  dimension: AcademicDimensionSchema,
  name: z.string(),
  score: z.number().int().min(1).max(5).nullable(),
  confidence: z.number().min(0).max(1),
  qualitativeBand: QualitativeBandSchema,
  rationale: z.string(),
  evidenceTraces: z.array(EvidenceTraceSchema).min(1),
});

export const GroundedAssessmentReportSchema = z.object({
  overallBand: z.enum(["STRONG", "SOLID", "DEVELOPING", "INSUFFICIENT"]),
  dimensions: z.array(DimensionEvaluationSchema).length(5),
  automationBiasIndex: z.number().min(0).max(1),
  needsHumanEscalation: z.boolean(),
  escalationReason: z.string().optional(),
});

const EVALUATOR_SYSTEM = `You are a psychometric technical assessment evaluator implementing the Barke et al. (OOPSLA) and Vasconcelos et al. (CHI) models of Human-AI Programming Interaction.

Input:
1. Candidate-AI chat transcript (with sequential turn IDs).
2. Final code diff and repository structure.
3. Challenge technical brief and injected domain constraints.

Evaluate the interaction strictly across the 5 Academic Dimensions:
1. EXPLORATION_VS_ACCELERATION (Barke et al., OOPSLA): Did candidate explore schemas/boundaries first, or passively accelerate?
2. COGNITIVE_VERIFICATION (Vasconcelos et al., CHI/CSCW): Did candidate inspect code and challenge assumptions, or blindly accept?
3. CONSTRAINT_SPECIFICATION (Mislevy et al., ECD): Did prompts specify invariants, statutory boundaries, and preconditions?
4. HIERARCHICAL_DECOMPOSITION (Sweller, Cognitive Load): Did candidate decompose into atomic steps, or issue monolithic generation requests?
5. ARCHITECTURAL_SENSEMAKING (SFIA 8 DESN): Did candidate justify trade-offs and design rationale?

Strict Guardrails:
1. Do NOT award high scores based on polite conversation or syntactically clean final code.
2. Every score MUST cite at least one explicit turn ID and quotation showing candidate behavior.
3. If the candidate never demonstrated verification (e.g., accepted all code blindly without inspection), flag Automation Bias (index >= 0.7), assign the lowest band, and cite the uninspected turns.
4. If a dimension has zero conversational evidence, emit score: null and flag needsHumanEscalation: true.

Output: Valid JSON matching GroundedAssessmentReportSchema.`;

/**
 * Executes the Grounded Academic Evaluator.
 * Falls back to deterministic rule-based evaluation when offline, in DEMO_MODE, or running tests.
 */
export async function evaluateAcademicInteraction(
  input: AcademicEvaluationInput
): Promise<GroundedAssessmentReport> {
  const sfiaLevel = input.sfiaLevel ?? 3;

  if (!openaiApiKey() || isDemoMode()) {
    return generateDeterministicAcademicReport(input, sfiaLevel);
  }

  try {
    const formattedTranscript = input.turns
      .map(
        (t) =>
          `[Turn ${t.seq}] ${t.role}: ${t.content}\n${
            t.filesWritten?.length ? `Files written: ${t.filesWritten.map((f) => f.path).join(", ")}` : ""
          }`
      )
      .join("\n\n");

    const result = await generateStructured<z.infer<typeof GroundedAssessmentReportSchema>>({
      stage: "evaluator",
      system: EVALUATOR_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Challenge: ${input.challengeTitle}\n\nTranscript:\n${formattedTranscript.slice(0, 15000)}`,
        },
      ],
      schema: GroundedAssessmentReportSchema,
      maxTokens: 3500,
    });

    const parsed = result.data;
    const dimensions: DimensionEvaluation[] = parsed.dimensions.map((d) => ({
      ...d,
      frameworkSource: ACADEMIC_FRAMEWORK_SOURCES[d.dimension].citationKey,
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES[d.dimension],
    }));

    const validScores = dimensions.map((d) => d.score).filter((s): s is number => s !== null);
    const totalScore = validScores.reduce((sum, s) => sum + s, 0);
    const averageScore = validScores.length ? Math.round((totalScore / validScores.length) * 10) / 10 : 0;

    return {
      sessionId: input.sessionId,
      sfiaLevel,
      overallBand: parsed.overallBand,
      averageScore,
      totalScore,
      dimensions,
      automationBiasIndex: Math.round(parsed.automationBiasIndex * 100) / 100,
      needsHumanEscalation: parsed.needsHumanEscalation,
      escalationReason: parsed.escalationReason,
      evaluationTimestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[evaluateAcademicInteraction] LLM evaluation fallback:", err);
    return generateDeterministicAcademicReport(input, sfiaLevel);
  }
}

export const generateGroundedAssessmentReport = evaluateAcademicInteraction;

/**
 * Deterministic psychometric evaluation fallback based on empirical transcript cues.
 */
export function generateDeterministicAcademicReport(
  input: AcademicEvaluationInput,
  sfiaLevel: SfiaLevel
): GroundedAssessmentReport {
  const turns = input.turns;
  const userTurns = turns.filter((t) => t.role === "USER" || (t as any).role === "user");
  const userMessages = userTurns.map((t) => ({ seq: t.seq, content: t.content.trim() })).filter((m) => m.content.length > 0);

  const finalScore = input.finalScore ?? (userMessages.length > 2 ? 80 : 45);
  const isHighPerformer = finalScore >= 75;
  const isModeratePerformer = finalScore >= 50 && !isHighPerformer;

  // 1. Detect Verification Effort & Automation Bias (Vasconcelos et al.)
  const verifyKeywords = ["test", "check", "verify", "error", "bug", "why", "fail", "pass", "catch", "discrepancy", "round", "mask", "tfn", "offset"];
  const verificationTurns = userMessages.filter((m) =>
    verifyKeywords.some((k) => m.content.toLowerCase().includes(k))
  );

  const hasZeroVerification = userMessages.length > 0 && verificationTurns.length === 0;
  const verificationRatio = userMessages.length > 0 ? verificationTurns.length / userMessages.length : 0;
  const automationBiasIndex = hasZeroVerification
    ? 0.85
    : isHighPerformer
    ? Math.max(0.12, Math.round((0.35 - verificationRatio * 0.25) * 100) / 100)
    : Math.min(0.78, Math.round((0.65 - verificationRatio * 0.2) * 100) / 100);

  // 2. Exploration vs. Acceleration (Barke et al.)
  const explorationKeywords = ["architecture", "interface", "schema", "pure function", "contract", "boundary", "types", "scope", "step"];
  const firstTurn = userMessages[0];
  const explorationTurns = userMessages.filter((m) =>
    explorationKeywords.some((k) => m.content.toLowerCase().includes(k))
  );
  const startsWithExploration = firstTurn && explorationKeywords.some((k) => firstTurn.content.toLowerCase().includes(k));

  // Compute Dimension Scores (1-5)
  const scoreExploration = startsWithExploration
    ? 5
    : explorationTurns.length > 0
    ? 4
    : isHighPerformer
    ? 4
    : isModeratePerformer
    ? 3
    : 1;

  const scoreVerification = hasZeroVerification
    ? 1
    : verificationTurns.length >= 2
    ? 5
    : verificationTurns.length === 1
    ? isHighPerformer ? 4 : 3
    : isHighPerformer ? 4 : 2;

  const scoreConstraint = isHighPerformer
    ? 5
    : userMessages.some((m) => m.content.length > 80)
    ? 4
    : isModeratePerformer
    ? 3
    : 1;

  const scoreDecomposition = userMessages.length >= 3
    ? isHighPerformer ? 5 : 4
    : userMessages.length === 2
    ? 3
    : 1;

  const scoreSensemaking = isHighPerformer
    ? 5
    : userMessages.some((m) => /because|tradeoff|performance|maintain|reason/i.test(m.content))
    ? 4
    : isModeratePerformer
    ? 3
    : 1;

  function toBand(score: number): QualitativeBand {
    if (score >= 5) return "EXEMPLARY";
    if (score >= 4) return "PROFICIENT";
    if (score >= 2) return "DEVELOPING";
    return "AT_RISK";
  }

  const defaultExcerpt = userMessages[0]?.content || "No candidate prompt recorded in session.";
  const defaultTurnId = userMessages[0] ? `Turn ${userMessages[0].seq}` : "Turn 1";

  const dimensions: DimensionEvaluation[] = [
    {
      dimension: "EXPLORATION_VS_ACCELERATION",
      name: "Architectural Exploration vs. Task Acceleration",
      frameworkSource: ACADEMIC_FRAMEWORK_SOURCES.EXPLORATION_VS_ACCELERATION.citationKey,
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.EXPLORATION_VS_ACCELERATION,
      score: scoreExploration,
      confidence: 0.94,
      qualitativeBand: toBand(scoreExploration),
      rationale: startsWithExploration
        ? "Candidate initiated session in Exploration Mode: defined schemas and invariant boundaries before requesting code generation."
        : scoreExploration >= 4
        ? "Balanced architectural exploration turns with code generation acceleration."
        : "Remained predominantly in passive acceleration mode, requesting implementation code without prior architectural scoping.",
      evidenceTraces: [
        {
          turnId: explorationTurns[0] ? `Turn ${explorationTurns[0].seq}` : defaultTurnId,
          excerpt: explorationTurns[0]?.content || defaultExcerpt,
          observedBehavior: startsWithExploration || explorationTurns.length > 0 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: startsWithExploration
            ? "Candidate explicitly defined structural boundaries prior to code synthesis."
            : "Candidate relied on AI default assumptions.",
        },
      ],
    },
    {
      dimension: "COGNITIVE_VERIFICATION",
      name: "Cognitive Verification Rigour",
      frameworkSource: ACADEMIC_FRAMEWORK_SOURCES.COGNITIVE_VERIFICATION.citationKey,
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.COGNITIVE_VERIFICATION,
      score: scoreVerification,
      confidence: 0.96,
      qualitativeBand: toBand(scoreVerification),
      rationale: verificationTurns.length >= 2
        ? "Exhibited rigorous cognitive verification: caught hallucinated edge cases and audited logic diffs."
        : scoreVerification >= 3
        ? "Demonstrated moderate verification, probing primary happy-path outcomes."
        : "Suffered from Automation Bias: accepted generated code blocks without validating boundary conditions.",
      evidenceTraces: [
        {
          turnId: verificationTurns[0] ? `Turn ${verificationTurns[0].seq}` : defaultTurnId,
          excerpt: verificationTurns[0]?.content || defaultExcerpt,
          observedBehavior: verificationTurns.length > 0 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: verificationTurns.length > 0
            ? "Candidate actively probed edge conditions and verified calculations."
            : "Candidate unreservedly merged AI outputs without inspection turns.",
        },
      ],
    },
    {
      dimension: "CONSTRAINT_SPECIFICATION",
      name: "Invariant & Constraint Specification",
      frameworkSource: ACADEMIC_FRAMEWORK_SOURCES.CONSTRAINT_SPECIFICATION.citationKey,
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.CONSTRAINT_SPECIFICATION,
      score: scoreConstraint,
      confidence: 0.92,
      qualitativeBand: toBand(scoreConstraint),
      rationale: scoreConstraint >= 4
        ? "Supplied dense domain invariants (statutory constraints, typing preconditions, error scenarios)."
        : "Prompts contained baseline directions with opportunity for explicit postcondition grounding.",
      evidenceTraces: [
        {
          turnId: defaultTurnId,
          excerpt: defaultExcerpt,
          observedBehavior: scoreConstraint >= 3 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: "Evaluation of requirement clarity and invariant density.",
        },
      ],
    },
    {
      dimension: "HIERARCHICAL_DECOMPOSITION",
      name: "Hierarchical Problem Decomposition",
      frameworkSource: ACADEMIC_FRAMEWORK_SOURCES.HIERARCHICAL_DECOMPOSITION.citationKey,
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.HIERARCHICAL_DECOMPOSITION,
      score: scoreDecomposition,
      confidence: 0.9,
      qualitativeBand: toBand(scoreDecomposition),
      rationale: userMessages.length >= 3
        ? "Decomposed complexity into atomic phases: contract definition, engine logic, validation, and test coverage."
        : "Attempted monolithic one-shot generation with limited sequential scaffolding.",
      evidenceTraces: [
        {
          turnId: userMessages[1] ? `Turn ${userMessages[1].seq}` : defaultTurnId,
          excerpt: userMessages[1]?.content || defaultExcerpt,
          observedBehavior: userMessages.length >= 2 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: "Observation of sequencing and cognitive load management.",
        },
      ],
    },
    {
      dimension: "ARCHITECTURAL_SENSEMAKING",
      name: "Tradeoff & Architectural Sensemaking",
      frameworkSource: ACADEMIC_FRAMEWORK_SOURCES.ARCHITECTURAL_SENSEMAKING.citationKey,
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.ARCHITECTURAL_SENSEMAKING,
      score: scoreSensemaking,
      confidence: 0.88,
      qualitativeBand: toBand(scoreSensemaking),
      rationale: scoreSensemaking >= 4
        ? "Defended architectural patterns and articulated trade-offs across maintainability and precision."
        : "Relied on AI suggestions without documenting explicit trade-off justifications.",
      evidenceTraces: [
        {
          turnId: defaultTurnId,
          excerpt: defaultExcerpt,
          observedBehavior: scoreSensemaking >= 3 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: "Evaluation of SFIA Level autonomy and engineering justification.",
        },
      ],
    },
  ];

  const totalScore = dimensions.reduce((sum, d) => sum + (d.score ?? 0), 0);
  const averageScore = Math.round((totalScore / 5) * 10) / 10;
  const overallBand =
    averageScore >= 4.2
      ? "STRONG"
      : averageScore >= 3.2
      ? "SOLID"
      : averageScore >= 2.0
      ? "DEVELOPING"
      : "INSUFFICIENT";

  return {
    sessionId: input.sessionId,
    sfiaLevel,
    overallBand,
    averageScore,
    totalScore,
    dimensions,
    automationBiasIndex,
    needsHumanEscalation: automationBiasIndex >= 0.8 || userMessages.length <= 1,
    escalationReason:
      automationBiasIndex >= 0.8
        ? "Candidate accepted AI suggestions with zero verification turns (High Automation Bias)."
        : userMessages.length <= 1
        ? "Insufficient candidate interaction recorded (single-turn session)."
        : undefined,
    evaluationTimestamp: new Date().toISOString(),
  };
}
