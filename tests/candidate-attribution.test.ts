import { describe, expect, it } from "vitest";
import {
  FABRICATED_CITATION_CONFIDENCE_CAP,
  finalizeEvaluation,
  verifyEvidence,
} from "@/lib/ai/scoring";
import type { EvidenceContext, RequirementRef } from "@/lib/ai/scoring";
import type { EvaluatorOutput } from "@/lib/ai/schemas";

const TEST_REQS: RequirementRef[] = [
  {
    id: "req-crit-judgment",
    category: "CRITICAL_JUDGMENT",
    statement: "Audits AI suggestions, detects injected traps, and verifies code boundary conditions.",
    weight: 20,
    successSignals: ["Candidate verifies test boundaries."],
    failureModes: ["Uncritical acceptance of generated code."],
  },
  {
    id: "req-problem-framing",
    category: "PROBLEM_FRAMING",
    statement: "Interrogates domain invariants before writing implementation code.",
    weight: 15,
    successSignals: ["Candidate clarifies requirements."],
    failureModes: ["Jumps to code immediately."],
  },
];

const TEST_CTX: EvidenceContext & { requirements: RequirementRef[] } = {
  requirements: TEST_REQS,
  turns: [
    {
      seq: 1,
      role: "USER",
      content: "Before writing code, let me clarify: must we handle negative values or float drift?",
    },
    {
      seq: 2,
      role: "ASSISTANT",
      content: "I have written the complete module in src/main.ts and verified all tests pass perfectly.",
      filesWritten: [{ path: "src/main.ts", contents: "export function solve() { return 42; }" }],
      reasoning: "Generated standard solution.",
    },
    {
      seq: 3,
      role: "USER",
      content: "I didn't run tests or inspect the boundary conditions, let's just ship it.",
    },
  ],
  files: {
    "src/main.ts": "export function solve() {\n  // Injected starter invariant\n  return 42;\n}",
  },
};

describe("M05 — Candidate Attribution in Primary Scoring (E01–E05)", () => {
  // E01: Fabricated / missing quote yields null, confidence 0, explicit reason, preserving valid scores
  it("E01: withholds score with null and confidence 0 when citation is fabricated, preserving valid scores", () => {
    const rawOutput: EvaluatorOutput = {
      perRequirement: [
        {
          requirementId: "req-crit-judgment",
          score: 4,
          confidence: 0.9,
          evidence: [
            {
              type: "turn",
              ref: "99", // turn 99 does not exist
              quote: "Candidate ran thorough fuzz tests on turn 99.",
            },
          ],
          rationale: "Claimed candidate ran tests.",
        },
        {
          requirementId: "req-problem-framing",
          score: 5,
          confidence: 0.85,
          evidence: [
            {
              type: "turn",
              ref: "1",
              quote: "must we handle negative values or float drift?",
            },
          ],
          rationale: "Candidate clarified boundary conditions before implementation.",
        },
      ],
      strengths: ["Clear framing", "Proactive questions", "Solid approach"],
      gaps: ["Testing missing", "No benchmark", "Limited validation"],
      unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    };

    const result = finalizeEvaluation(rawOutput, TEST_CTX);

    // req-crit-judgment fabricated -> withheld
    const critRes = result.perRequirement.find((r) => r.requirementId === "req-crit-judgment");
    expect(critRes).toBeDefined();
    expect(critRes?.score).toBeNull();
    expect(critRes?.confidence).toBe(0);
    expect(critRes?.note).toMatch(/none of the evaluator's citations could be verified/i);

    // req-problem-framing valid candidate turn -> preserved
    const frameRes = result.perRequirement.find((r) => r.requirementId === "req-problem-framing");
    expect(frameRes).toBeDefined();
    expect(frameRes?.score).toBe(5);
    expect(frameRes?.confidence).toBe(0.85);
  });

  // E02: Exact assistant quote with no candidate support yields withheld score
  it("E02: withholds score when evidence only cites ASSISTANT turn without USER candidate action", () => {
    const rawOutput: EvaluatorOutput = {
      perRequirement: [
        {
          requirementId: "req-crit-judgment",
          score: 5,
          confidence: 0.9,
          evidence: [
            {
              type: "turn",
              ref: "2", // Turn 2 is ASSISTANT
              quote: "verified all tests pass perfectly",
            },
          ],
          rationale: "Assistant reported all tests passed.",
        },
      ],
      strengths: ["Assistant reported tests pass", "Good syntax", "Clean files"],
      gaps: ["No candidate tests", "No candidate comments", "Passive observer"],
      unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    };

    const result = finalizeEvaluation(rawOutput, TEST_CTX);

    const critRes = result.perRequirement.find((r) => r.requirementId === "req-crit-judgment");
    expect(critRes).toBeDefined();
    expect(critRes?.score).toBeNull();
    expect(critRes?.confidence).toBe(0);
    expect(critRes?.note).toMatch(/assistant turns/i);
    // Assistant evidence is preserved as labelled context
    expect(critRes?.evidence.length).toBe(1);
    expect(critRes?.evidence[0].verified).toBe(true);
    expect(critRes?.evidence[0].speaker).toBe("ASSISTANT");
  });

  // E03: Exact starter/assistant file quote with no candidate support yields withheld score
  it("E03: withholds score of 5 supported only by a valid file quote in files['src/main.ts'] without candidate action", () => {
    // Proves row E03: File quote verifies perfectly, but candidate action is absent.
    const rawOutput: EvaluatorOutput = {
      perRequirement: [
        {
          requirementId: "req-crit-judgment",
          score: 5,
          confidence: 0.95,
          evidence: [
            {
              type: "file",
              ref: "src/main.ts",
              quote: "Injected starter invariant",
            },
          ],
          rationale: "File contains correct invariant definition.",
        },
      ],
      strengths: ["File has invariant", "Clean code", "Proper structure"],
      gaps: ["Candidate did not write code", "No candidate verification", "No transcript action"],
      unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    };

    const result = finalizeEvaluation(rawOutput, TEST_CTX);

    const critRes = result.perRequirement.find((r) => r.requirementId === "req-crit-judgment");
    expect(critRes).toBeDefined();
    // Must be withheld even though file verification succeeds
    expect(critRes?.score).toBeNull();
    expect(critRes?.confidence).toBe(0);
    expect(critRes?.note).toMatch(/file artifacts were cited without candidate-turn action/i);
    // Verified file evidence remains preserved as context
    expect(critRes?.evidence.length).toBe(1);
    expect(critRes?.evidence[0].verified).toBe(true);
    expect(critRes?.evidence[0].type).toBe("file");
  });

  // E04: Valid candidate quote describing observed weak action receives low score (not null), versus absence (null)
  it("E04: preserves low score (1) for observed weak candidate behavior, but gives null for total absence", () => {
    const rawOutput: EvaluatorOutput = {
      perRequirement: [
        {
          requirementId: "req-crit-judgment",
          score: 1, // Observed weak behavior: candidate explicitly admitted skipping tests
          confidence: 0.8,
          evidence: [
            {
              type: "turn",
              ref: "3", // Turn 3 is USER
              quote: "I didn't run tests or inspect the boundary conditions",
            },
          ],
          rationale: "Candidate explicitly declined to run tests or inspect boundaries.",
        },
        {
          requirementId: "req-problem-framing",
          score: null, // Total absence of evidence
          confidence: 0,
          evidence: [],
          rationale: "No evidence found.",
        },
      ],
      strengths: ["Honest communication", "Fast iteration", "Simple decisions"],
      gaps: ["Skipped testing", "No verification", "Ignored edge cases"],
      unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    };

    const result = finalizeEvaluation(rawOutput, TEST_CTX);

    const critRes = result.perRequirement.find((r) => r.requirementId === "req-crit-judgment");
    // Observed weak behavior maintains its low score (1), not null
    expect(critRes?.score).toBe(1);
    expect(critRes?.confidence).toBe(0.8);

    // Total absence receives null
    const frameRes = result.perRequirement.find((r) => r.requirementId === "req-problem-framing");
    expect(frameRes?.score).toBeNull();
    expect(frameRes?.confidence).toBe(0);
  });

  // E05: One valid candidate quote plus one fabricated citation preserves score, drops bad quote, caps confidence
  it("E05: drops fabricated citation, caps confidence, and preserves valid candidate score", () => {
    const rawOutput: EvaluatorOutput = {
      perRequirement: [
        {
          requirementId: "req-problem-framing",
          score: 4,
          confidence: 0.9,
          evidence: [
            {
              type: "turn",
              ref: "1", // Valid USER turn quote
              quote: "Before writing code, let me clarify: must we handle negative values",
            },
            {
              type: "turn",
              ref: "1", // Fabricated quote not in turn 1
              quote: "I have calculated all mathematical matrices to 10 decimal places.",
            },
          ],
          rationale: "Candidate framed problem well.",
        },
      ],
      strengths: ["Framed problem", "Asked about float drift", "Careful planning"],
      gaps: ["Some fabricated evidence", "No speed test", "Limited scope"],
      unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    };

    const result = finalizeEvaluation(rawOutput, TEST_CTX);

    const frameRes = result.perRequirement.find((r) => r.requirementId === "req-problem-framing");
    expect(frameRes).toBeDefined();
    // Valid candidate-backed score is preserved
    expect(frameRes?.score).toBe(4);
    // Fabricated citation is removed from evidence list
    expect(frameRes?.evidence.length).toBe(1);
    expect(frameRes?.evidence[0].verified).toBe(true);
    // Confidence is capped at 0.5
    expect(frameRes?.confidence).toBe(FABRICATED_CITATION_CONFIDENCE_CAP);
    // Note explicitly records discarded citation
    expect(frameRes?.note).toMatch(/1 citation could not be verified and was discarded/i);
  });
});
