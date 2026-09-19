import type { RequirementRef, TranscriptTurn } from "@/lib/ai/scoring";
import type { EvaluatorOutput } from "@/lib/ai/schemas";

export const REQS: RequirementRef[] = [
  {
    id: "r1",
    category: "PROBLEM_FRAMING",
    statement: "Interrogates the brief before building",
    weight: 4,
    successSignals: ["asks a clarifying question", "states an assumption"],
    failureModes: ["builds immediately", "asks only about styling"],
  },
  {
    id: "r2",
    category: "CRITICAL_JUDGMENT",
    statement: "Verifies the assistant's output",
    weight: 2,
    successSignals: ["reads the code", "tests a boundary"],
    failureModes: ["accepts claims", "never inspects files"],
  },
  {
    id: "r3",
    category: "COMMUNICATION",
    statement: "Makes decisions legible to a reviewer",
    weight: 4,
    successSignals: ["gives reasons", "records decisions"],
    failureModes: ["no reasons", "no record"],
  },
];

export const TURNS: TranscriptTurn[] = [
  { seq: 1, role: "USER", content: "Before we build: do we count people or comments?" },
  {
    seq: 2,
    role: "ASSISTANT",
    content: "People.",
    filesWritten: [{ path: "src/a.js", contents: "x" }],
    reasoning: "keep the rules simple",
  },
  { seq: 3, role: "USER", content: "You said tested but you cannot run code. I will check the boundary myself." },
];

export const FILES = { "src/a.js": "export const MIN = 5;\nexport const ok = (n) => n >= MIN;" };

export function output(over: Partial<EvaluatorOutput> = {}): EvaluatorOutput {
  return {
    perRequirement: [
      {
        requirementId: "r1",
        score: 5,
        confidence: 0.9,
        evidence: [{ type: "turn", ref: "1", quote: "do we count people or comments?" }],
        rationale: "Asked before building.",
      },
      {
        requirementId: "r2",
        score: 4,
        confidence: 0.8,
        evidence: [{ type: "turn", ref: "3", quote: "You said tested but you cannot run code." }],
        rationale: "Challenged an unsupported claim.",
      },
      {
        requirementId: "r3",
        score: 3,
        confidence: 0.7,
        evidence: [{ type: "file", ref: "src/a.js", quote: "export const MIN = 5;" }],
        rationale: "Some record.",
      },
    ],
    strengths: ["one", "two", "three"],
    gaps: ["four", "five", "six"],
    unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    ...over,
  };
}
