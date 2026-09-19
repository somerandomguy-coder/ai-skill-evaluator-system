import { describe, expect, it } from "vitest";
import { shouldEscalate, type EscalationInput } from "@/lib/ai/escalation";
import type { RequirementResult } from "@/lib/ai/schemas";
import { BORDERLINE_BAND, CONFIDENCE_THRESHOLD, PASS_BOUNDARY } from "@/lib/constants";

const res = (id: string, score: number | null, confidence: number): RequirementResult => ({
  requirementId: id,
  score,
  confidence,
  evidence: [],
  rationale: "",
});

const requirements = [
  { id: "a", category: "PROBLEM_FRAMING" as const },
  { id: "b", category: "CRITICAL_JUDGMENT" as const },
  { id: "c", category: "TRADEOFF_AWARENESS" as const },
];

/** A clean evaluation that should not escalate: high score, high confidence, on-timebox. */
function clean(over: Partial<EscalationInput> = {}): EscalationInput {
  return {
    evaluation: {
      perRequirement: [res("a", 5, 0.9), res("b", 4, 0.85), res("c", 5, 0.9)],
      overallScore: 90,
      coverage: 1,
      unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    },
    requirements,
    session: { durationMinutes: 120, timeboxMinutes: 180 },
    ...over,
  };
}

const codes = (i: EscalationInput) => shouldEscalate(i).reasons.map((r) => r.code);

describe("shouldEscalate", () => {
  it("does not escalate a clean, confident, on-timebox evaluation", () => {
    const d = shouldEscalate(clean());
    expect(d.escalate).toBe(false);
    expect(d.reasons).toEqual([]);
    expect(d.summary).toBeNull();
  });

  it("rule 1: escalates a requirement scored below the confidence threshold, and names it", () => {
    const i = clean();
    i.evaluation.perRequirement[1] = res("b", 4, CONFIDENCE_THRESHOLD - 0.01);
    const d = shouldEscalate(i);
    expect(d.escalate).toBe(true);
    expect(d.reasons[0]).toMatchObject({ code: "LOW_CONFIDENCE", requirementIds: ["b"] });
    expect(d.summary).toContain("CRITICAL_JUDGMENT");
  });

  it("rule 1: confidence exactly at the threshold is not low", () => {
    const i = clean();
    i.evaluation.perRequirement[1] = res("b", 4, CONFIDENCE_THRESHOLD);
    expect(codes(i)).not.toContain("LOW_CONFIDENCE");
  });

  it("rule 2: escalates any requirement returned null for lack of evidence", () => {
    const i = clean();
    i.evaluation.perRequirement[2] = res("c", null, 0);
    const d = shouldEscalate(i);
    expect(d.reasons.find((r) => r.code === "NO_EVIDENCE")).toMatchObject({ requirementIds: ["c"] });
    expect(d.summary).toContain("TRADEOFF_AWARENESS");
  });

  it("rule 3: escalates a score within the borderline band of the pass boundary, both sides, inclusive", () => {
    for (const score of [PASS_BOUNDARY - BORDERLINE_BAND, PASS_BOUNDARY, PASS_BOUNDARY + BORDERLINE_BAND]) {
      const i = clean();
      i.evaluation.overallScore = score;
      expect(codes(i)).toContain("BORDERLINE_SCORE");
    }
    for (const score of [PASS_BOUNDARY - BORDERLINE_BAND - 0.1, PASS_BOUNDARY + BORDERLINE_BAND + 0.1]) {
      const i = clean();
      i.evaluation.overallScore = score;
      expect(codes(i)).not.toContain("BORDERLINE_SCORE");
    }
  });

  it("rule 3: does not call a score borderline when nothing was scored", () => {
    const i = clean();
    i.evaluation.overallScore = 0;
    i.evaluation.coverage = 0;
    i.evaluation.perRequirement = requirements.map((r) => res(r.id, null, 0));
    expect(codes(i)).not.toContain("BORDERLINE_SCORE");
    expect(codes(i)).toContain("NO_EVIDENCE");
  });

  it("rule 4: escalates a disagreement the evaluator could not adjudicate, with the turns", () => {
    const i = clean();
    i.evaluation.unadjudicatedDisagreement = { present: true, turns: [5, 9], note: "unclear whether the threshold is inclusive" };
    const d = shouldEscalate(i);
    expect(d.reasons.find((r) => r.code === "UNADJUDICATED_DISAGREEMENT")).toMatchObject({ turns: [5, 9] });
    expect(d.summary).toContain("turns 5, 9");
  });

  it("rule 5: escalates a session much shorter or much longer than the timebox", () => {
    expect(codes(clean({ session: { durationMinutes: 20, timeboxMinutes: 180 } }))).toContain("SESSION_TOO_SHORT");
    expect(codes(clean({ session: { durationMinutes: 400, timeboxMinutes: 180 } }))).toContain("SESSION_TOO_LONG");
    expect(codes(clean({ session: { durationMinutes: 60, timeboxMinutes: 180 } }))).toEqual([]);
    expect(codes(clean({ session: { durationMinutes: 300, timeboxMinutes: 180 } }))).toEqual([]);
  });

  it("integrity: escalates when the transcript addresses the evaluator", () => {
    const d = shouldEscalate(clean({ integrityFlags: [{ turn: 4, reason: "Turn 4 asks to be awarded a score." }] }));
    expect(d.reasons[0]).toMatchObject({ code: "INTEGRITY_FLAG", turns: [4] });
  });

  it("offline demo evaluation always routes to a mentor and says why", () => {
    const i = clean({ noAiEvaluation: true });
    i.evaluation.perRequirement = requirements.map((r) => res(r.id, null, 0));
    i.evaluation.coverage = 0;
    i.evaluation.overallScore = 0;
    const d = shouldEscalate(i);
    expect(d.escalate).toBe(true);
    expect(d.reasons[0].code).toBe("NO_AI_EVALUATION");
    expect(d.reasons.map((r) => r.code)).not.toContain("NO_EVIDENCE"); // one clear reason, not noise
  });

  it("collects every reason so the mentor knows where to look", () => {
    const i = clean({ session: { durationMinutes: 10, timeboxMinutes: 180 } });
    i.evaluation.perRequirement = [res("a", 2, 0.3), res("b", null, 0), res("c", 3, 0.9)];
    i.evaluation.overallScore = 55;
    const d = shouldEscalate(i);
    expect(d.reasons.map((r) => r.code).sort()).toEqual(
      ["BORDERLINE_SCORE", "LOW_CONFIDENCE", "NO_EVIDENCE", "SESSION_TOO_SHORT"].sort()
    );
    expect(d.summary).toBe(d.reasons.map((r) => r.message).join(" "));
  });
});
