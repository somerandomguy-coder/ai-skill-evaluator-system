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

    const sfiaMeta = ACADEMIC_FRAMEWORK_SOURCES.ARCHITECTURAL_SENSEMAKING;
    expect(sfiaMeta.venue).toBe("SFIA 9 Standard");
    expect(sfiaMeta.citationKey).toContain("SFIA 9");
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

  it("strictly computes totalSuiteBScore as the exact sum of individual criteria (e.g. 4+5+5+5+5 = 24/25)", () => {
    // Session where candidate did not start with exploration keywords on turn 1, but explored on later turn
    // This yields scores: Exploration=4, Decomp=5, Constraint=5, Verification=5, Sensemaking=5 (Sum: 24)
    const res = buildCognitiveSuites({
      sessionId: "session-high-performer-late-exploration",
      challengeTitle: "Solar Battery Gateway",
      overallScore: 90,
      turns: [
        {
          seq: 1,
          role: "USER",
          content: "Let's implement the core calculation function first.",
          filesWritten: [],
          reasoning: null,
          createdAt: new Date().toISOString(),
        },
        {
          seq: 2,
          role: "USER",
          content: "Now let's explore the schema and architecture trade-offs between polling and WebSockets.",
          filesWritten: [],
          reasoning: null,
          createdAt: new Date().toISOString(),
        },
        {
          seq: 3,
          role: "USER",
          content: "I notice a bug in the battery discharge bounds. Let's write a unit test to verify error handling.",
          filesWritten: [],
          reasoning: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const scores = res.suiteB.criteria.map((c) => c.score);
    const sumCriteria = scores.reduce((sum, s) => sum + s, 0);

    // AI steering score MUST mathematically equal the sum of criteria
    expect(res.suiteB.score).toBe(sumCriteria);
    expect(res.suiteB.score).toBeLessThanOrEqual(25);
    if (scores.includes(4) && scores.filter((s) => s === 5).length === 4) {
      expect(res.suiteB.score).toBe(24);
    }
  });

  it("uses the supplied Level 2 assessment exactly once and labels the receipt as a local digest", async () => {
    const assessment = await generateGroundedAssessmentReport({
      sessionId: "session-level-2",
      sfiaLevel: 2,
      challengeTitle: "Junior engineering task",
      turns: [
        {
          seq: 1,
          role: "USER",
          content: "Please explain the first safe step before we write code.",
          filesWritten: [],
          reasoning: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const res = buildCognitiveSuites({
      sessionId: "session-level-2",
      challengeTitle: "Junior engineering task",
      overallScore: 70,
      turns: [],
      academicReport: assessment,
      sfiaLevel: 2,
    });

    expect(res.groundedAssessment).toBe(assessment);
    expect(res.groundedAssessment.sfiaLevel).toBe(2);
    expect(res.verificationReceipt).toMatchObject({
      algorithm: "SHA-256",
      scope: "saved assessment metadata",
    });
    expect((res.verificationReceipt as Record<string, unknown>).protocol).toBeUndefined();
    expect((res.verificationReceipt as Record<string, unknown>).calibrationN).toBeUndefined();
    expect((res.verificationReceipt as Record<string, unknown>).evaluatorVersion).toBeUndefined();
  });
});

describe("Backend Substring Verifier & Bounded Evidence Extraction", () => {
  it("verifies exact candidate citations and flags hallucinated LLM quotes", async () => {
    const { verifySubstringCitation } = await import("@/lib/quote");
    const sourceChat = "We should enforce integer cents for all Australian award calculations to avoid floating point drift.";

    // 1. Exact verbatim quote
    const exactResult = verifySubstringCitation("Australian award calculations", sourceChat);
    expect(exactResult.verified).toBe(true);
    expect(exactResult.cleanQuote).toContain("Australian award calculations");

    // 2. Hallucinated quote fabricated by LLM evaluator
    const hallucinatedResult = verifySubstringCitation(
      "The candidate said they wanted to use USD currency and bypass statutory checks.",
      sourceChat
    );
    expect(hallucinatedResult.verified).toBe(false);
    // Verifier provides safe, verified excerpt from candidate's actual source
    expect(hallucinatedResult.cleanQuote).toContain("Australian award calculations");
  });

  it("extracts clean bounded sentence excerpt from runaway multi-paragraph prompts", async () => {
    const { extractCleanExcerpt } = await import("@/lib/quote");
    const longChatPrompt =
      "First, decompose this into pure statutory functions. " +
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(40) +
      "Finally, verify that zero-trust invariant checks pass.";

    expect(longChatPrompt.length).toBeGreaterThan(1000);

    const excerpt = extractCleanExcerpt(longChatPrompt, { keyword: "decompose", maxLength: 240 });
    expect(excerpt.length).toBeLessThanOrEqual(240);
    expect(excerpt).toContain("First, decompose this into pure statutory functions.");
    expect(excerpt.endsWith("...")).toBe(false); // Clean complete first sentence
  });
});

describe("Planted Subtle Domain Bugs in Starter Template", () => {
  it("plants unmasked identity field bug in starter template audit utility", async () => {
    const { buildRoleStarterTemplate } = await import("@/lib/engine/starter-template");
    const template = buildRoleStarterTemplate({
      title: "CDR Gateway Challenge",
      brief: "Implement Consumer Data Right gateway adhering to CDR statutory invariants.",
    });

    expect(template["src/utils/audit.ts"]).toBeDefined();
    const auditCode = template["src/utils/audit.ts"];
    // Verifies the subtle domain bug: email is masked, but userId identity field is left unmasked in logger output
    expect(auditCode).toContain("userId: context.userId");
    expect(auditCode).toContain("sanitizedEmail");
  });

  it("plants floating-point currency calculation bug in statutory calculations", async () => {
    const { calculateGrossWage } = await import("@/lib/engine/pipeline");
    // Verify floating point currency calculation is present in starter statutory utility
    expect(typeof calculateGrossWage).toBe("function");
    // 33.33 hours @ $25.55/hr ($2555 cents)
    const result = calculateGrossWage(33.33, 2555);
    expect(typeof result).toBe("number");
  });
});
