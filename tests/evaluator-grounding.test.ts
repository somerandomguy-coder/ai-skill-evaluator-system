import { describe, expect, it, vi } from "vitest";
import { finalizeEvaluation, type EvidenceContext, type RequirementRef } from "@/lib/ai/scoring";
import type { EvaluatorOutput } from "@/lib/ai/schemas";
import {
  evaluateAcademicInteraction,
  generateDeterministicAcademicReport,
  type AcademicEvaluationInput,
} from "@/lib/engine/evaluator";
import * as aiClient from "@/lib/ai/client";
import * as env from "@/lib/env";

const MOCK_REQS: RequirementRef[] = [
  {
    id: "req-1",
    category: "CRITICAL_JUDGMENT",
    statement: "Audits AI code and tests edge cases before merging.",
    weight: 20,
    successSignals: ["Candidate verifies calculations."],
    failureModes: ["Merges without checking."],
  },
  {
    id: "req-2",
    category: "PROBLEM_FRAMING",
    statement: "Defines statutory boundary constraints and data schemas.",
    weight: 20,
    successSignals: ["Candidate clarifies schemas."],
    failureModes: ["Begins coding without schemas."],
  },
];

describe("M06 — Narrative Grounding & Academic Output Contract (Rows E06–E09)", () => {
  // E06: Invalidated score plus raw "caught all bugs" strength / "leaked PII" gap
  it("E06: removes unsupported public claims when score is invalidated, keeping raw prose private/unverified", () => {
    const ctx: EvidenceContext & { requirements: RequirementRef[] } = {
      requirements: MOCK_REQS,
      turns: [
        {
          seq: 1,
          role: "USER",
          content: "Hello, can you write the module please?",
        },
        {
          seq: 2,
          role: "ASSISTANT",
          content: "Sure, here is the module.",
          filesWritten: [{ path: "src/main.ts", contents: "export const x = 1;" }],
        },
      ],
      files: {
        "src/main.ts": "export const x = 1;",
      },
    };

    // Evaluator gives high score with fabricated citation, plus wild raw praise and gap
    const rawOutput: EvaluatorOutput = {
      perRequirement: [
        {
          requirementId: "req-1",
          score: 5,
          confidence: 0.9,
          // Fabricated quote not in transcript
          evidence: [{ type: "turn", ref: "1", quote: "I caught all edge case bugs in testing" }],
          rationale: "Candidate caught all bugs and verified everything.",
        },
        {
          requirementId: "req-2",
          score: null,
          confidence: 0,
          evidence: [],
          rationale: "No schemas defined.",
        },
      ],
      strengths: ["Candidate expertly caught all bugs in distributed transactions", "Exemplary zero-trust rigor"],
      gaps: ["Candidate leaked PII in diagnostic logs"],
      unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    };

    const result = finalizeEvaluation(rawOutput, ctx);

    // Score on req-1 is withheld (null) because citation was fabricated
    expect(result.perRequirement[0].score).toBeNull();
    expect(result.perRequirement[0].confidence).toBe(0);

    // Unsupported public claims MUST NOT survive in public strengths / gaps
    expect(result.strengths).not.toContain("Candidate expertly caught all bugs in distributed transactions");
    expect(result.strengths).not.toContain("Exemplary zero-trust rigor");
    expect(result.gaps).not.toContain("Candidate leaked PII in diagnostic logs");

    // Because no requirements had validated score >= 4, public strengths should not invent 3 items
    expect(result.strengths).toEqual([]);

    // Raw model prose is quarantined privately with unverified flag
    expect(result.rawModelProse).toEqual({
      strengths: ["Candidate expertly caught all bugs in distributed transactions", "Exemplary zero-trust rigor"],
      gaps: ["Candidate leaked PII in diagnostic logs"],
      unverified: true,
    });
  });

  // E07: Correct quote but unrelated interpretation, e.g. candidate says "build it"
  it("E07: correct quote but unrelated interpretation does not produce unsupported certified success claims in default summary", () => {
    const ctx: EvidenceContext & { requirements: RequirementRef[] } = {
      requirements: MOCK_REQS,
      turns: [
        {
          seq: 1,
          role: "USER",
          content: "build it",
        },
        {
          seq: 2,
          role: "ASSISTANT",
          content: "Built the whole app.",
        },
      ],
      files: {
        "src/app.ts": "console.log('done');",
      },
    };

    // The candidate literally said "build it". A model awards 5/5 citing "build it" claiming candidate verified everything
    const rawOutput: EvaluatorOutput = {
      perRequirement: [
        {
          requirementId: "req-1",
          score: 5,
          confidence: 0.95,
          evidence: [{ type: "turn", ref: "1", quote: "build it" }],
          rationale: "Candidate commanded the AI to build it with deep critical verification.",
        },
        {
          requirementId: "req-2",
          score: 1,
          confidence: 0.8,
          evidence: [{ type: "turn", ref: "1", quote: "build it" }],
          rationale: "Did not define schemas.",
        },
      ],
      strengths: ["Certified flawless edge case verification across all systems"],
      gaps: ["Schema definition missing"],
      unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    };

    const result = finalizeEvaluation(rawOutput, ctx);

    // Exact quote match exists ("build it"), but the public strength is NOT the model's certified claim
    expect(result.strengths).not.toContain("Certified flawless edge case verification across all systems");
    // Public summary is anchored to requirement statement, not certified LLM praise
    expect(result.strengths).toEqual(["Strong candidate evidence on: Audits AI code and tests edge cases before merging."]);
    // Raw praise is kept in rawModelProse
    expect(result.rawModelProse?.strengths).toContain("Certified flawless edge case verification across all systems");
  });

  // E08: Five repeated academic dimension names; STRONG overall with all-null accepted scores
  it("E08: academic evaluator rejects duplicate dimension names and forces all-null summary to INSUFFICIENT, not STRONG", async () => {
    vi.spyOn(env, "openaiApiKey").mockReturnValue("test-key");
    vi.spyOn(env, "isDemoMode").mockReturnValue(false);

    // Model returns 5 repeated dimensions of EXPLORATION_VS_ACCELERATION with fabricated citations
    // claiming overallBand is STRONG
    vi.spyOn(aiClient, "generateStructured").mockResolvedValueOnce({
      stage: "evaluator",
      model: "mock-model",
      data: {
        overallBand: "STRONG",
        dimensions: [
          {
            dimension: "EXPLORATION_VS_ACCELERATION",
            name: "Duplicate 1",
            score: 5,
            confidence: 0.99,
            qualitativeBand: "EXEMPLARY",
            rationale: "Repeated dimension 1",
            evidenceTraces: [
              {
                turnId: "Turn 1",
                excerpt: "fabricated quote not in source",
                observedBehavior: "SUCCESS_SIGNAL",
                interpretation: "Model hallucinated verification",
              },
            ],
          },
          {
            dimension: "EXPLORATION_VS_ACCELERATION",
            name: "Duplicate 2",
            score: 5,
            confidence: 0.99,
            qualitativeBand: "EXEMPLARY",
            rationale: "Repeated dimension 2",
            evidenceTraces: [
              {
                turnId: "Turn 1",
                excerpt: "fabricated quote not in source",
                observedBehavior: "SUCCESS_SIGNAL",
                interpretation: "Model hallucinated verification",
              },
            ],
          },
          {
            dimension: "EXPLORATION_VS_ACCELERATION",
            name: "Duplicate 3",
            score: 5,
            confidence: 0.99,
            qualitativeBand: "EXEMPLARY",
            rationale: "Repeated dimension 3",
            evidenceTraces: [
              {
                turnId: "Turn 1",
                excerpt: "fabricated quote not in source",
                observedBehavior: "SUCCESS_SIGNAL",
                interpretation: "Model hallucinated verification",
              },
            ],
          },
          {
            dimension: "EXPLORATION_VS_ACCELERATION",
            name: "Duplicate 4",
            score: 5,
            confidence: 0.99,
            qualitativeBand: "EXEMPLARY",
            rationale: "Repeated dimension 4",
            evidenceTraces: [
              {
                turnId: "Turn 1",
                excerpt: "fabricated quote not in source",
                observedBehavior: "SUCCESS_SIGNAL",
                interpretation: "Model hallucinated verification",
              },
            ],
          },
          {
            dimension: "EXPLORATION_VS_ACCELERATION",
            name: "Duplicate 5",
            score: 5,
            confidence: 0.99,
            qualitativeBand: "EXEMPLARY",
            rationale: "Repeated dimension 5",
            evidenceTraces: [
              {
                turnId: "Turn 1",
                excerpt: "fabricated quote not in source",
                observedBehavior: "SUCCESS_SIGNAL",
                interpretation: "Model hallucinated verification",
              },
            ],
          },
        ],
        automationBiasIndex: 0.1,
        needsHumanEscalation: false,
      },
    } as any);

    const input: AcademicEvaluationInput = {
      sessionId: "session-e08",
      challengeTitle: "Test Challenge",
      turns: [
        {
          seq: 1,
          role: "USER",
          content: "Let us start building the app now.",
          filesWritten: [],
          reasoning: null,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const report = await evaluateAcademicInteraction(input);

    // Contract rejects duplicates: duplicates cannot satisfy the 5 expected dimensions
    const uniqueDims = new Set(report.dimensions.map((d) => d.dimension));
    expect(uniqueDims.size).toBe(5);

    // Citations were fabricated and dimensions were duplicated -> all scores withheld (null)
    const validScores = report.dimensions.map((d) => d.score).filter((s) => s !== null);
    expect(validScores.length).toBe(0);

    // Summary state is recomputed from accepted dimensions: all-null MUST be INSUFFICIENT, not model's STRONG!
    expect(report.overallBand).toBe("INSUFFICIENT");
    expect(report.needsHumanEscalation).toBe(true);
    expect(report.scoredCoverage).toBe(0);

    vi.restoreAllMocks();
  });

  // E09: Empty transcript; model/rule confidence present; candidate reports a test run without receipt
  it("E09: empty transcript shows missing coverage, honest confidence, and no inferred automation-bias finding from absence", () => {
    const input: AcademicEvaluationInput = {
      sessionId: "session-empty",
      challengeTitle: "Test Challenge",
      turns: [], // Empty transcript
    };

    const report = generateDeterministicAcademicReport(input, 3);

    // Missing coverage is visible
    expect(report.scoredCoverage).toBe(0);
    expect(report.overallBand).toBe("INSUFFICIENT");
    expect(report.totalScore).toBe(0);
    expect(report.averageScore).toBe(0);

    // All dimensions null with 0 confidence
    for (const d of report.dimensions) {
      expect(d.score).toBeNull();
      expect(d.confidence).toBe(0);
      expect(d.evidenceTraces).toHaveLength(0);
    }

    // Honest origin label
    expect(report.confidenceOrigin).toBe("heuristic");

    // ABSENCE ALONE IS NOT INFERRED AS AUTOMATION BIAS
    expect(report.automationBiasIndex).toBe(0);
    expect(report.needsHumanEscalation).toBe(true);
    expect(report.escalationReason).toContain("Empty transcript");
  });
});
