import { describe, expect, it } from "vitest";
import { ACADEMIC_FRAMEWORK_SOURCES } from "@/lib/types/assessment-academic";
import { generateGroundedAssessmentReport } from "@/lib/engine/evaluator";
import { buildCognitiveSuites } from "@/lib/services/cognitive-rubric";
import type { TurnView } from "@/lib/data/types";

describe("Academic Assessment Framework Specifications", () => {
  it("defines all 5 academic framework dimensions with peer-reviewed open-access citations", () => {
    const dimensions = [
      "EXPLORATION_VS_ACCELERATION",
      "COGNITIVE_VERIFICATION",
      "CONSTRAINT_SPECIFICATION",
      "HIERARCHICAL_DECOMPOSITION",
      "ARCHITECTURAL_SENSEMAKING",
    ] as const;

    for (const dim of dimensions) {
      const meta = ACADEMIC_FRAMEWORK_SOURCES[dim];
      expect(meta).toBeDefined();
      expect(meta.title).toBeTruthy();
      expect(meta.authors).toBeTruthy();
      expect(meta.venue).toBeTruthy();
      expect(meta.year).toBeGreaterThanOrEqual(1988);
      expect(meta.openAccessUrl).toMatch(/^https?:\/\//);
      expect(meta.coreFinding).toBeTruthy();
    }
  });
});

describe("generateGroundedAssessmentReport()", () => {
  const rigorousTurns: TurnView[] = [
    {
      seq: 1,
      role: "USER",
      content: "Let's first explore the architecture tradeoffs between polling vs WebSockets for live energy readings.",
      filesWritten: [],
      reasoning: null,
      createdAt: new Date().toISOString(),
    },
    {
      seq: 2,
      role: "USER",
      content: "I checked the generated mock data and noticed an edge case where solar kW is negative at night. Let's fix that validation constraint and run tests.",
      filesWritten: [],
      reasoning: null,
      createdAt: new Date().toISOString(),
    },
    {
      seq: 3,
      role: "USER",
      content: "Verify unit tests pass for the clamped inverter calculations and check error bounds.",
      filesWritten: [],
      reasoning: null,
      createdAt: new Date().toISOString(),
    },
  ];

  const passiveTurns: TurnView[] = [
    {
      seq: 1,
      role: "USER",
      content: "Write all the code for me.",
      filesWritten: [],
      reasoning: null,
      createdAt: new Date().toISOString(),
    },
    {
      seq: 2,
      role: "USER",
      content: "Looks good, whatever you say.",
      filesWritten: [],
      reasoning: null,
      createdAt: new Date().toISOString(),
    },
  ];

  it("calculates low automation bias index and high verification rigour for active verifying candidate", async () => {
    const report = await generateGroundedAssessmentReport({
      sessionId: "session-rigorous",
      challengeTitle: "Solar Battery Dashboard",
      finalScore: 92,
      turns: rigorousTurns,
    });

    expect(report.dimensions).toHaveLength(5);
    expect(report.automationBiasIndex).toBeLessThanOrEqual(0.35);

    const verificationDim = report.dimensions.find((d) => d.dimension === "COGNITIVE_VERIFICATION");
    expect(verificationDim).toBeDefined();
    expect(verificationDim?.qualitativeBand).toMatch(/^(EXEMPLARY|PROFICIENT)$/);
    expect(verificationDim?.score).toBeGreaterThanOrEqual(4);
    expect(verificationDim?.paperMeta.venue).toContain("CHI");

    // Check evidential traces linking to turns
    expect(verificationDim?.evidenceTraces.length).toBeGreaterThan(0);
    expect(verificationDim?.evidenceTraces[0].turnId).toBeTruthy();
    expect(verificationDim?.evidenceTraces[0].excerpt).toBeTruthy();
  });

  it("detects high automation bias and assigns AT_RISK or DEVELOPING band for passive uncritical candidate", async () => {
    const report = await generateGroundedAssessmentReport({
      sessionId: "session-passive",
      challengeTitle: "Solar Battery Dashboard",
      finalScore: 45,
      turns: passiveTurns,
    });

    expect(report.dimensions).toHaveLength(5);
    expect(report.automationBiasIndex).toBeGreaterThanOrEqual(0.65);

    const verificationDim = report.dimensions.find((d) => d.dimension === "COGNITIVE_VERIFICATION");
    expect(verificationDim).toBeDefined();
    expect(verificationDim?.qualitativeBand).toMatch(/^(AT_RISK|DEVELOPING)$/);
    expect(verificationDim?.score).toBeLessThanOrEqual(3);
  });
});

describe("buildCognitiveSuites() Integration", () => {
  it("aligns suiteB criteria with the 5 academic dimensions and populates groundedAssessment", () => {
    const res = buildCognitiveSuites({
      sessionId: "session-test",
      challengeTitle: "Solar Inverter App",
      overallScore: 88,
      turns: [
        {
          seq: 1,
          role: "USER",
          content: "Inspect the schema for negative power factors before generating UI.",
          filesWritten: [],
          reasoning: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    expect(res.suiteB.criteria).toHaveLength(5);
    const labels = res.suiteB.criteria.map((c) => c.label);
    expect(labels).toContain("1. Exploration vs Acceleration");
    expect(labels).toContain("2. Problem Decomposition");
    expect(labels).toContain("3. Invariant Specification");
    expect(labels).toContain("4. Cognitive Verification Rigour");
    expect(labels).toContain("5. Architectural Sensemaking");

    expect(res.groundedAssessment).toBeDefined();
    expect(res.groundedAssessment?.dimensions).toHaveLength(5);
    expect(typeof res.groundedAssessment?.automationBiasIndex).toBe("number");
  });
});
