import { z } from "zod";
import { generateStructured } from "../ai/client";
import { isDemoMode, aiApiKey, openaiApiKey } from "../env";
import type { TurnView } from "../data/types";
import {
  ACADEMIC_FRAMEWORK_SOURCES,
  type AcademicDimension,
  type DimensionEvaluation,
  type EvidenceTrace,
  type GroundedAssessmentReport,
  type QualitativeBand,
} from "../types/assessment-academic";
import type { SfiaLevel } from "../types/assessment-v2";
import { extractCleanExcerpt, verifySubstringCitation } from "../quote";

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

export const EXPECTED_ACADEMIC_DIMENSIONS: AcademicDimension[] = [
  "EXPLORATION_VS_ACCELERATION",
  "COGNITIVE_VERIFICATION",
  "CONSTRAINT_SPECIFICATION",
  "HIERARCHICAL_DECOMPOSITION",
  "ARCHITECTURAL_SENSEMAKING",
];

export const GroundedAssessmentReportSchema = z.object({
  overallBand: z.enum(["STRONG", "SOLID", "DEVELOPING", "INSUFFICIENT"]),
  dimensions: z.array(DimensionEvaluationSchema),
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
5. ARCHITECTURAL_SENSEMAKING (SFIA 9 DESN): Did candidate justify trade-offs and design rationale?

Strict Guardrails:
1. Do NOT award high scores based on polite conversation or syntactically clean final code.
2. Every score MUST cite at least one explicit turn ID and quotation showing candidate behavior.
3. If the candidate never demonstrated verification (e.g., accepted all code blindly without inspection), flag Automation Bias (index >= 0.7), assign the lowest band, and cite the uninspected turns.
4. If a dimension has zero conversational evidence, emit score: null and flag needsHumanEscalation: true.
5. Plain Language: Write all rationales in simple, plain English (under 25 words) that non-technical hiring managers and candidates can understand in 5 seconds. Avoid academic jargon.

Output: Valid JSON matching GroundedAssessmentReportSchema.`;

/**
 * Executes the Grounded Academic Evaluator.
 * Falls back to deterministic rule-based evaluation when offline, in DEMO_MODE, or running tests.
 */
export async function evaluateAcademicInteraction(
  input: AcademicEvaluationInput
): Promise<GroundedAssessmentReport> {
  const sfiaLevel = input.sfiaLevel ?? 3;

  if ((!aiApiKey() && !openaiApiKey()) || isDemoMode()) {
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

    // M06 / E08: Require the 5 distinct expected dimensions exactly once. Contract rejects duplicates.
    const seenDimensions = new Set<AcademicDimension>();
    const uniqueDimensionsFromModel = new Map<AcademicDimension, z.infer<typeof DimensionEvaluationSchema>>();
    let hasDuplicateDimensions = false;

    for (const d of parsed.dimensions) {
      if (seenDimensions.has(d.dimension)) {
        hasDuplicateDimensions = true;
        continue; // Contract rejects duplicates: do not use duplicate dimension
      }
      seenDimensions.add(d.dimension);
      uniqueDimensionsFromModel.set(d.dimension, d);
    }

    let needsHumanEscalation = parsed.needsHumanEscalation || hasDuplicateDimensions;
    let escalationReason = parsed.escalationReason;
    if (hasDuplicateDimensions) {
      escalationReason = "Academic dimension contract violation: duplicate dimension names received.";
    }

    const dimensions: DimensionEvaluation[] = EXPECTED_ACADEMIC_DIMENSIONS.map((dimKey) => {
      const rawDim = uniqueDimensionsFromModel.get(dimKey);
      if (!rawDim) {
        return {
          dimension: dimKey,
          name: dimKey,
          frameworkSource: ACADEMIC_FRAMEWORK_SOURCES[dimKey].citationKey,
          paperMeta: ACADEMIC_FRAMEWORK_SOURCES[dimKey],
          score: null,
          confidence: 0,
          qualitativeBand: "AT_RISK" as const,
          rationale: "Dimension missing or rejected due to duplicate output.",
          evidenceTraces: [],
          confidenceOrigin: "unverified" as const,
        };
      }

      let hasCandidateAttribution = false;
      const verifiedTraces: EvidenceTrace[] = rawDim.evidenceTraces.map((trace) => {
        const turnNum = Number.parseInt(/\d+/.exec(trace.turnId)?.[0] ?? "", 10);
        const turn = Number.isFinite(turnNum)
          ? input.turns.find((t) => t.seq === turnNum)
          : undefined;

        const isUserTurn = turn?.role === "USER" || (turn as any)?.role === "user";
        const sourceText = turn?.content || "";
        const check = verifySubstringCitation(trace.excerpt, sourceText);

        // M06: Do NOT replace an invalid citation with another quote that appears verified!
        const isVerified = Boolean(check.verified && turn);
        if (isVerified && isUserTurn) {
          hasCandidateAttribution = true;
        }

        return {
          turnId: trace.turnId,
          excerpt: trace.excerpt, // Preserved verbatim; do not substitute cleanQuote!
          observedBehavior: isVerified
            ? trace.observedBehavior
            : ("AUTOMATION_BIAS_TRAP" as const),
          interpretation: isVerified
            ? trace.interpretation
            : `[UNVERIFIED CITATION] ${trace.interpretation}`,
        };
      });

      // M06: Invalid/missing/assistant-only traces cannot support a score.
      let score: number | null = rawDim.score;
      let confidence = rawDim.confidence;
      let band = rawDim.qualitativeBand;
      let rationale = rawDim.rationale;

      if (!hasCandidateAttribution || score === null) {
        score = null;
        confidence = 0;
        band = "AT_RISK";
        rationale = !hasCandidateAttribution
          ? "No verified candidate-turn evidence cited for this dimension."
          : rationale;
      }

      return {
        ...rawDim,
        score,
        confidence,
        qualitativeBand: band,
        rationale,
        evidenceTraces: verifiedTraces,
        frameworkSource: ACADEMIC_FRAMEWORK_SOURCES[dimKey].citationKey,
        paperMeta: ACADEMIC_FRAMEWORK_SOURCES[dimKey],
        confidenceOrigin: score !== null ? ("model" as const) : ("unverified" as const),
      };
    });

    const validScores = dimensions.map((d) => d.score).filter((s): s is number => s !== null);
    const totalScore = validScores.reduce((sum, s) => sum + s, 0);
    const averageScore = validScores.length ? Math.round((totalScore / validScores.length) * 10) / 10 : 0;
    const scoredCoverage = Math.round((validScores.length / EXPECTED_ACADEMIC_DIMENSIONS.length) * 100) / 100;

    // M06 / E08: Recompute summary state from accepted dimensions; all-null must be insufficient, not STRONG
    let overallBand: GroundedAssessmentReport["overallBand"] = "INSUFFICIENT";
    if (validScores.length > 0) {
      if (averageScore >= 4.2 && scoredCoverage >= 0.8) overallBand = "STRONG";
      else if (averageScore >= 3.2 && scoredCoverage >= 0.6) overallBand = "SOLID";
      else if (averageScore >= 2.0) overallBand = "DEVELOPING";
      else overallBand = "INSUFFICIENT";
    } else {
      overallBand = "INSUFFICIENT";
      needsHumanEscalation = true;
      escalationReason = escalationReason || "All academic dimension scores were withheld due to lack of verified candidate evidence.";
    }

    // M06: Do not classify absence alone as automation bias.
    const candidateTurns = input.turns.filter((t) => t.role === "USER" || (t as any)?.role === "user");
    let automationBiasIndex = Math.round(parsed.automationBiasIndex * 100) / 100;
    if (candidateTurns.length === 0) {
      automationBiasIndex = 0;
    }

    return {
      sessionId: input.sessionId,
      sfiaLevel,
      overallBand,
      averageScore,
      totalScore,
      dimensions,
      automationBiasIndex,
      needsHumanEscalation,
      escalationReason,
      evaluationTimestamp: new Date().toISOString(),
      scoredCoverage,
      confidenceOrigin: "model",
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

  // M06 / E09: Empty transcript: missing coverage visible, confidence origin honest, no execution certification or inferred automation-bias finding from absence
  if (userMessages.length === 0) {
    const dimensions: DimensionEvaluation[] = EXPECTED_ACADEMIC_DIMENSIONS.map((dimKey) => ({
      dimension: dimKey,
      name: dimKey,
      frameworkSource: ACADEMIC_FRAMEWORK_SOURCES[dimKey].citationKey,
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES[dimKey],
      score: null,
      confidence: 0,
      confidenceOrigin: "heuristic" as const,
      qualitativeBand: "AT_RISK" as const,
      rationale: "No candidate messages recorded in session transcript.",
      evidenceTraces: [],
    }));

    return {
      sessionId: input.sessionId,
      sfiaLevel,
      overallBand: "INSUFFICIENT",
      averageScore: 0,
      totalScore: 0,
      dimensions,
      automationBiasIndex: 0, // Absence alone must not be classified as automation bias!
      needsHumanEscalation: true,
      escalationReason: "Empty transcript: no candidate activity recorded.",
      evaluationTimestamp: new Date().toISOString(),
      scoredCoverage: 0,
      confidenceOrigin: "heuristic",
    };
  }

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

  const archTurn = userMessages.find((m) =>
    /because|tradeoff|performance|maintain|reason|architecture|pure function|component/i.test(m.content)
  );

  const scoreSensemaking = isHighPerformer
    ? 5
    : archTurn
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

  const defaultExcerpt = userMessages[0]
    ? extractCleanExcerpt(userMessages[0].content, { maxLength: 240 })
    : "No candidate prompt recorded in session.";
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
        ? "Planned schemas and design rules before asking for code."
        : scoreExploration >= 4
        ? "Balanced design planning with AI coding."
        : "Asked AI to code right away without planning the design first.",
      evidenceTraces: [
        {
          turnId: explorationTurns[0] ? `Turn ${explorationTurns[0].seq}` : defaultTurnId,
          excerpt: explorationTurns[0]
            ? extractCleanExcerpt(explorationTurns[0].content, { keyword: "explore", maxLength: 240 })
            : defaultExcerpt,
          observedBehavior: startsWithExploration || explorationTurns.length > 0 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: startsWithExploration
            ? "Set design boundaries before coding."
            : "Jumped straight to coding without boundaries.",
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
        ? "Tested calculations carefully and caught hidden edge cases."
        : scoreVerification >= 3
        ? "Checked basic functionality; could test edge cases deeper."
        : "Accepted AI-written code without testing for edge cases or bugs.",
      evidenceTraces: [
        {
          turnId: verificationTurns[0] ? `Turn ${verificationTurns[0].seq}` : defaultTurnId,
          excerpt: verificationTurns[0]
            ? extractCleanExcerpt(verificationTurns[0].content, { keyword: "test", maxLength: 240 })
            : defaultExcerpt,
          observedBehavior: verificationTurns.length > 0 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: verificationTurns.length > 0
            ? "Actively tested and questioned AI code."
            : "Merged AI code without checking.",
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
        ? "Gave clear constraints, data types, and error rules upfront."
        : "Gave basic prompts with few rules or constraints.",
      evidenceTraces: [
        {
          turnId: defaultTurnId,
          excerpt: defaultExcerpt,
          observedBehavior: scoreConstraint >= 3 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: "Provided explicit input boundaries.",
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
        ? "Broke the problem down into clean, step-by-step phases."
        : "Asked for all code at once instead of building step-by-step.",
      evidenceTraces: [
        {
          turnId: userMessages[1] ? `Turn ${userMessages[1].seq}` : defaultTurnId,
          excerpt: userMessages[1]
            ? extractCleanExcerpt(userMessages[1].content, { keyword: "first", maxLength: 240 })
            : defaultExcerpt,
          observedBehavior: userMessages.length >= 2 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: "Guided the AI step-by-step.",
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
        ? "Clearly explained design choices and evaluated trade-offs."
        : "Accepted AI design defaults without discussing pros or cons.",
      evidenceTraces: [
        {
          turnId: archTurn ? `Turn ${archTurn.seq}` : defaultTurnId,
          excerpt: archTurn
            ? extractCleanExcerpt(archTurn.content, { keyword: "architecture", maxLength: 240 })
            : defaultExcerpt,
          observedBehavior: scoreSensemaking >= 3 ? "SUCCESS_SIGNAL" : "AUTOMATION_BIAS_TRAP",
          interpretation: "Justified technical choices.",
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
        ? "Accepted AI code with zero testing (high overreliance risk)."
        : userMessages.length <= 1
        ? "Only one prompt recorded; insufficient session data."
        : undefined,
    evaluationTimestamp: new Date().toISOString(),
    scoredCoverage: 1.0,
    confidenceOrigin: "heuristic",
  };
}
