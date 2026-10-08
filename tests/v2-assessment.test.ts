import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const savedDemoMode = process.env.DEMO_MODE;
beforeAll(() => {
  process.env.DEMO_MODE = "true";
});
afterAll(() => {
  process.env.DEMO_MODE = savedDemoMode;
});
import {
  cosineSimilarity,
  generateEmbedding,
} from "@/lib/engine/embedding";
import {
  runAgent1SfiaDeconstructor,
  runAgent2EcdTaskSynthesizer,
  runAgent3RubricGenerator,
  runAgenticGenerationPipeline,
} from "@/lib/engine/pipeline";
import {
  initializeRepository,
  queryVectorStore,
  resolveChallenge,
  incrementChallengeUsage,
  getChallengeFromRepository,
} from "@/lib/engine/resolver";
import {
  AUDIT_THRESHOLDS,
  evaluateMentorAudit,
  applyAuditToChallenge,
} from "@/lib/engine/verification";
import { VERIFIED_CHALLENGE_BANK } from "@/lib/engine/verified-bank";
import type { SfiaProfile } from "@/lib/types/assessment-v2";

describe("V2 SFIA 8 Integration & Psychometric Grounding", () => {
  it("classifies junior/associate roles strictly into SFIA Level 2 (Assist)", async () => {
    const juniorJd = `Role: Junior React Developer\nCompany: Canva Sydney\nDescription: We are looking for a graduate or junior developer to assist the team with UI bug fixes and pair-programming.`;
    const profile = await runAgent1SfiaDeconstructor(juniorJd, "Canva");

    expect(profile.level).toBe(2);
    expect(profile.primarySkills).toContain("PROG");
    expect(profile.attributes.autonomy).toMatch(/routine direction/i);
  });

  it("classifies mid-level / standard engineer roles strictly into SFIA Level 3 (Apply)", async () => {
    const midJd = `Role: Software Engineer — Payroll Integrations\nCompany: Employment Hero\nDescription: Own the statutory disaggregation engine for STP Phase 2, resolving edge cases and collaborating with architecture.`;
    const profile = await runAgent1SfiaDeconstructor(midJd, "Employment Hero");

    expect(profile.level).toBe(3);
    expect(profile.primarySkills.length).toBeGreaterThanOrEqual(2);
    expect(profile.attributes.complexity).toMatch(/complexity|disaggregation|statutory/i);
  });

  it("synthesizes authentic Australian compliance task model with deliberate AI traps", async () => {
    const profile: SfiaProfile = {
      level: 3,
      primarySkills: ["PROG", "DBDS", "TEST"],
      attributes: {
        autonomy: "General guidance",
        influence: "Squad",
        complexity: "Statutory",
        knowledge: "ATO specs",
        businessSkills: "Compliance",
      },
    };

    const task = await runAgent2EcdTaskSynthesizer(
      profile,
      "Payroll systems, Single Touch Payroll Phase 2 disaggregation, tax withholdings, superannuation",
      "Employment Hero"
    );

    expect(task.title).toContain("Australian Statutory Wage & Tax");
    expect(task.technicalInvariants.some((inv) => inv.includes("integer cents") || inv.includes("cents"))).toBe(true);
    expect(task.technicalInvariants.some((inv) => inv.includes("TFN") || inv.includes("masked"))).toBe(true);
    expect(task.starterSchemas).toHaveProperty("statutory-types.ts");
  });

  it("constructs a 7-category interaction rubric with baseline weights summing to 100%", async () => {
    const profile: SfiaProfile = {
      level: 3,
      primarySkills: ["PROG", "DESN", "TEST"],
      attributes: {
        autonomy: "Apply",
        influence: "Squad",
        complexity: "Complex",
        knowledge: "Domain",
        businessSkills: "Clear",
      },
    };

    const task = await runAgent2EcdTaskSynthesizer(profile, "Statutory STP2 payroll calculations", "FinTech AU");
    const rubric = await runAgent3RubricGenerator(profile, task);

    expect(rubric.length).toBe(7);

    const categories = new Set(rubric.map((r) => r.category));
    expect(categories.has("PROBLEM_FRAMING")).toBe(true);
    expect(categories.has("TECHNICAL_APPROACH")).toBe(true);
    expect(categories.has("AI_DIRECTION")).toBe(true);
    expect(categories.has("CRITICAL_JUDGMENT")).toBe(true);
    expect(categories.has("TRADEOFF_AWARENESS")).toBe(true);
    expect(categories.has("DOMAIN_FIT")).toBe(true);
    expect(categories.has("COMMUNICATION")).toBe(true);

    const totalWeight = rubric.reduce((sum, r) => sum + r.weight, 0);
    expect(totalWeight).toBe(100);

    const criticalReq = rubric.find((r) => r.category === "CRITICAL_JUDGMENT");
    expect(criticalReq?.injectedTrap).toBeDefined();
    expect(criticalReq?.weight).toBe(20);
  });
});

describe("Embedding Vectorizer & Cosine Similarity", () => {
  it("calculates exact cosine similarity for identical, orthogonal, and arbitrary vectors", () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    const c = [0, 1, 0];

    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
    expect(cosineSimilarity(a, c)).toBeCloseTo(0.0, 5);

    const v1 = [0.6, 0.8];
    const v2 = [0.8, 0.6];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.96, 2);
  });

  it("generates deterministic unit-normalized embeddings with fixed dimensions", async () => {
    const vec1 = await generateEmbedding("Single Touch Payroll Phase 2 disaggregation engine");
    const vec2 = await generateEmbedding("Single Touch Payroll Phase 2 disaggregation engine");
    const vecOther = await generateEmbedding("Unrelated culinary recipe for sourdough bread");

    expect(vec1.length).toBe(128);
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1.0, 4);

    const simDifferent = cosineSimilarity(vec1, vecOther);
    expect(simDifferent).toBeLessThan(0.7);
  });
});

describe("3-Tier Challenge Hierarchy & Resolution Engine", () => {
  it("resolves Tier 1 (Verified Bank) on high similarity (>= 0.88)", async () => {
    await initializeRepository();

    const query = `Role: Mid-Level Full-Stack Engineer — STP Phase 2 Disaggregation
Company: Employment Hero / Australian Payroll Systems
Under Australian Taxation Office (ATO) Single Touch Payroll Phase 2 reporting, disaggregate gross pay into discrete statutory components rather than a single sum.`;

    const result = await resolveChallenge(query, "Employment Hero");

    expect(result.tierResolved).toBe("TIER_1_VERIFIED");
    expect(result.similarityScore).toBeGreaterThanOrEqual(0.88);
    expect(result.challenge.verification.status).toBe("APPROVED");
    expect(result.challenge.verification.badge).toBeDefined();
    expect(result.challenge.verification.badge?.auditScore).toBeGreaterThanOrEqual(16);
  });

  it("resolves Tier 2 (Cached) on moderate similarity (>= 0.82)", async () => {
    await initializeRepository();

    // Register a known challenge in unverified/pending state
    const cachedChallenge = {
      ...VERIFIED_CHALLENGE_BANK[1],
      id: "cached-cdr-variant",
      tier: "TIER_2_CACHED" as const,
      verification: { status: "PENDING" as const },
      embeddingVector: await generateEmbedding("Consumer Data Right CDR Open Banking Gateway with AEST timing and token expiry"),
    };
    const { registerChallengeInRepository } = await import("@/lib/engine/resolver");
    registerChallengeInRepository(cachedChallenge);

    const query = `Consumer Data Right CDR Open Banking Gateway with AEST timing and token expiry`;
    const result = await resolveChallenge(query, "Australian Bank", { supervisedSemanticLookup: true });

    expect(result.tierResolved).toBe("TIER_2_CACHED");
    expect(result.similarityScore).toBeGreaterThanOrEqual(0.82);
  });

  it("falls back to Tier 3 Agentic Generation on cache miss and enqueues as PENDING", async () => {
    const uniqueJd = `Role: Quantum Satellite Telemetry Cryptographer\nCompany: DeepSpace Labs Perth\nDescription: Design quantum key distribution software for low Earth orbit satellites under Australian Space Agency guidelines.`;

    const result = await resolveChallenge(uniqueJd, "DeepSpace Labs");

    expect(result.tierResolved).toBe("TIER_3_GENERATED");
    expect(result.challenge.verification.status).toBe("PENDING");
    expect(result.challenge.sfiaProfile).toBeDefined();
    expect(result.challenge.rubric.length).toBeGreaterThanOrEqual(7);

    // Verify it is registered in semantic cache for future queries
    const stored = getChallengeFromRepository(result.challenge.id);
    expect(stored).toBeDefined();
  }, 15000);
});

describe("5-Minute Mentor Verification Engine", () => {
  it("approves and awards MentorBadge when total >= 16 and all dimensions >= 3", () => {
    const evaluation = evaluateMentorAudit({
      challengeId: "test-challenge-1",
      mentorId: "mentor-dr-vance",
      mentorName: "Dr. Alistair Vance, CPEng",
      scores: {
        realism: 4,
        sfiaCalibration: 4,
        trapEfficacy: 4,
        observability: 3,
        fairness: 4,
      },
      notes: "Exceptional fidelity to enterprise Australian banking constraints.",
    });

    expect(evaluation.passed).toBe(true);
    expect(evaluation.totalScore).toBe(19);
    expect(evaluation.status).toBe("APPROVED");
    expect(evaluation.badge).toBeDefined();
    expect(evaluation.badge?.mentorId).toBe("mentor-dr-vance");
    expect(evaluation.badge?.auditScore).toBe(19);
  });

  it("rejects promotion if any single dimension falls below 3, even if total >= 16", () => {
    const evaluation = evaluateMentorAudit({
      challengeId: "test-challenge-2",
      mentorId: "mentor-1",
      scores: {
        realism: 4,
        sfiaCalibration: 4,
        trapEfficacy: 2, // Fails individual minimum threshold of 3
        observability: 4,
        fairness: 4,
      },
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.totalScore).toBe(18); // 18 >= 16, but trapEfficacy is 2
    expect(evaluation.status).toBe("RE_CALIBRATE");
    expect(evaluation.badge).toBeUndefined();
    expect(evaluation.reasons.some((r) => r.includes("Trap Efficacy"))).toBe(true);
  });

  it("promotes challenge tier to TIER_1_VERIFIED upon passing mentor audit", async () => {
    const baseChallenge = await runAgenticGenerationPipeline(
      "Mid-level cloud engineer with Australian privacy compliance",
      "Enterprise Cloud AU"
    );

    expect(baseChallenge.tier).toBe("TIER_3_GENERATED");
    expect(baseChallenge.verification.status).toBe("PENDING");

    const audit = evaluateMentorAudit({
      challengeId: baseChallenge.id,
      mentorId: "mentor-expert-1",
      mentorName: "Sarah Chen",
      scores: {
        realism: 4,
        sfiaCalibration: 3,
        trapEfficacy: 4,
        observability: 3,
        fairness: 4,
      },
    });

    const promoted = applyAuditToChallenge(baseChallenge, audit);

    expect(promoted.tier).toBe("TIER_1_VERIFIED");
    expect(promoted.verification.status).toBe("APPROVED");
    expect(promoted.verification.badge?.mentorName).toBe("Sarah Chen");
    expect(promoted.verification.badge?.auditScore).toBe(18);
  });
});

describe("POST /api/challenge/generate Endpoint", () => {
  it("resolves challenge and returns structured ResolutionResult JSON", async () => {
    const { POST } = await import("@/app/api/challenge/generate/route");

    const request = new Request("http://localhost:3000/api/challenge/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rawJd: "Role: Software Engineer — STP Phase 2 Payroll\nCompany: Employment Hero\nAustralian payroll tax withholding and disaggregation engine.",
        companyName: "Employment Hero",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("challenge");
    expect(data).toHaveProperty("tierResolved");
    expect(data).toHaveProperty("latencyMs");
    expect(data.challenge.sfiaProfile).toBeDefined();
    expect(data.challenge.rubric.length).toBeGreaterThanOrEqual(7);
  });

  it("returns 400 bad request for empty or invalid payloads", async () => {
    const { POST } = await import("@/app/api/challenge/generate/route");

    const request = new Request("http://localhost:3000/api/challenge/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rawJd: "Too short" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

describe("Rehearsal Routing Loopholes & Safeguards (Rows R01–R06)", () => {
  it("R01: fast-routes four curated engineering JDs with zero embedding/generation calls and honest curated provenance", async () => {
    const embeddingMod = await import("@/lib/engine/embedding");
    const pipelineMod = await import("@/lib/engine/pipeline");
    const embeddingSpy = vi.spyOn(embeddingMod, "generateEmbedding");
    const pipelineSpy = vi.spyOn(pipelineMod, "runAgenticGenerationPipeline");

    embeddingSpy.mockClear();
    pipelineSpy.mockClear();

    const curatedCases = [
      {
        company: "Employment Hero",
        jd: "Role: Software Engineer — Payroll Systems\nCompany: Employment Hero\nBuild our STP Phase 2 disaggregation engine with statutory wage and integer cents precision.",
        expectedId: "verified-stp2-engine",
      },
      {
        company: "Biza.io",
        jd: "Role: Backend Engineer — Open Banking\nCompany: Biza.io\nImplement Consumer Data Right CDR gateway for accredited data recipients with consent register.",
        expectedId: "verified-cdr-gateway",
      },
      {
        company: "TalentAI",
        jd: "Role: AI Evaluation Engineer\nCompany: TalentAI\nDevelop fair hiring bias detection algorithm for resume screener to prevent adverse impact.",
        expectedId: "verified-talentai-screener",
      },
      {
        company: "Total Game Development",
        jd: "Role: Game Engine Programmer\nCompany: Total Game Development\nBuild deterministic simulation engine for lockstep multiplayer RTS engine with spatial grid.",
        expectedId: "verified-tgd-rts-sim",
      },
    ];

    for (const testCase of curatedCases) {
      embeddingSpy.mockClear();
      pipelineSpy.mockClear();

      const result = await resolveChallenge(testCase.jd, testCase.company);

      expect(result.challenge.id).toBe(testCase.expectedId);
      expect(result.tierResolved).toBe("TIER_1_VERIFIED");
      expect(result.resolutionReason).toBe("DEMO_FAST_PATH");
      expect(result.challenge.provenance?.origin).toBe("curated_demo");
      expect(result.challenge.provenance?.resolutionReason).toBe("DEMO_FAST_PATH");

      // Verify ZERO embedding calls and ZERO generation calls
      expect(embeddingSpy).toHaveBeenCalledTimes(0);
      expect(pipelineSpy).toHaveBeenCalledTimes(0);
    }

    embeddingSpy.mockRestore();
    pipelineSpy.mockRestore();
  });

  it("R02: does not fast-route company name without responsibilities (e.g. Total Game Development + Accountant)", async () => {
    const accountantJd = `Role: Staff Accountant\nCompany: Total Game Development\nResponsibilities: Corporate balance sheet reconciliation, tax filings, accounts payable.`;
    const result = await resolveChallenge(accountantJd, "Total Game Development");

    expect(result.challenge.id).not.toBe("verified-tgd-rts-sim");
    expect(result.resolutionReason).not.toBe("DEMO_FAST_PATH");
    expect(result.tierResolved).toBe("TIER_3_GENERATED");
  });

  it("R03: rejects incompatible seniority (junior payroll engineer vs Level 3 fixture)", async () => {
    const juniorJd = `Role: Junior Payroll Engineer\nCompany: Employment Hero\nResponsibilities: Assist senior developers with bug fixes in Single Touch Payroll Phase 2 disaggregation engine.`;
    const result = await resolveChallenge(juniorJd, "Employment Hero");

    expect(result.resolutionReason).not.toBe("DEMO_FAST_PATH");
    expect(result.tierResolved).toBe("TIER_3_GENERATED");
  });

  it("R04: does not fast-route Macquarie vulnerability role where CDR is mentioned only as excluded work", async () => {
    const macquarieJd = `Role: Application Security Vulnerability Analyst\nCompany: Macquarie Bank\nResponsibilities: Conduct vulnerability assessment and penetration testing across retail banking apps.\nNote: Consumer Data Right (CDR) systems are excluded from this scope.`;
    const result = await resolveChallenge(macquarieJd, "Macquarie Bank");

    expect(result.challenge.id).not.toBe("verified-cdr-gateway");
    expect(result.challenge.id).not.toBe("verified-stp2-engine");
    expect(result.resolutionReason).not.toBe("DEMO_FAST_PATH");
  });

  it("R05: does not fast-route correct domain with wrong company, unknown employer, or rejected items", async () => {
    const wrongCompanyJd = `Role: Payroll Systems Engineer\nCompany: Canva\nResponsibilities: Implement STP Phase 2 disaggregation with integer cents and tax withholding.`;
    const result = await resolveChallenge(wrongCompanyJd, "Canva");

    expect(result.challenge.id).not.toBe("verified-stp2-engine");
    expect(result.resolutionReason).not.toBe("DEMO_FAST_PATH");

    // Also test unknown company with CDR
    const unknownCompJd = `Role: Open Banking Engineer\nCompany: Unknown Company\nResponsibilities: Build Consumer Data Right CDR gateway for accredited data recipients.`;
    const resUnknown = await resolveChallenge(unknownCompJd, "Unknown Company");
    expect(resUnknown.challenge.id).not.toBe("verified-cdr-gateway");
    expect(resUnknown.resolutionReason).not.toBe("DEMO_FAST_PATH");
  });

  it("R06: prevents cross-request fixture mutation across repeated/concurrent reads", async () => {
    const payrollJd = `Role: Payroll Engineer\nCompany: Employment Hero\nBuild STP Phase 2 disaggregation engine with statutory wage.`;

    const originalUsage = VERIFIED_CHALLENGE_BANK[0].metadata.usageCount || 0;
    const res1 = await resolveChallenge(payrollJd, "Employment Hero");
    const res2 = await resolveChallenge(payrollJd, "Employment Hero");

    // Returned challenge has incremented usage count on its own copy
    expect(res1.challenge.metadata.usageCount).toBe(originalUsage + 1);
    expect(res2.challenge.metadata.usageCount).toBe(originalUsage + 1);

    // Verify in-memory bank was NOT mutated
    expect(VERIFIED_CHALLENGE_BANK[0].metadata.usageCount).toBe(originalUsage);

    // Verify mutating returned object does not affect second object
    res1.challenge.briefMarkdown = "MUTATED";
    expect(res2.challenge.briefMarkdown).not.toBe("MUTATED");
  });

  it("R07: non-demo JD succeeds as pending even if embedding function throws (zero avoidable embeddings in default generation)", async () => {
    const embeddingMod = await import("@/lib/engine/embedding");
    const embeddingSpy = vi.spyOn(embeddingMod, "generateEmbedding");
    embeddingSpy.mockImplementation(() => {
      throw new Error("AVOIDABLE_EMBEDDING_TOUCHED: embedding function must not be called in default generation path!");
    });

    const unfamiliarJd = `Role: Quantum Satellite Telemetry Cryptographer\nCompany: DeepSpace Labs Perth\nDescription: Design quantum key distribution software for low Earth orbit satellites.`;

    const result = await resolveChallenge(unfamiliarJd, "DeepSpace Labs");

    expect(result.tierResolved).toBe("TIER_3_GENERATED");
    expect(result.resolutionReason).toBe("GENERATED");
    expect(result.challenge.verification.status).toBe("PENDING");
    expect(result.challenge.roleTitle).toBeDefined();

    // Verify embedding function was NEVER called
    expect(embeddingSpy).toHaveBeenCalledTimes(0);

    embeddingSpy.mockRestore();
  });

  it("R08: explicit supervised lookup rejects mixed vector spaces/dimensions and awaits initialization", async () => {
    // 1. Space incompatibility: query vector with 3 dimensions vs 128 dimensions in bank
    const mismatchedVectorMatch = await queryVectorStore({
      vector: [1, 0, 0], // 3 dimensions
      threshold: 0.5,
    });
    // Vector with mismatched dimensions is rejected (returns null)
    expect(mismatchedVectorMatch).toBeNull();

    // 2. Space incompatibility in cosineSimilarity directly
    const { cosineSimilarity } = await import("@/lib/engine/embedding");
    expect(cosineSimilarity([1, 0, 0], [1, 0])).toBe(0);
    expect(cosineSimilarity([NaN, 0], [1, 0])).toBe(0);

    // 3. Supervised semantic search on matching dimension succeeds
    const validEmbedding = await generateEmbedding("Single Touch Payroll Phase 2 disaggregation engine");
    const match = await queryVectorStore({
      vector: validEmbedding,
      filter: { "verification.status": "APPROVED" },
      threshold: 0.6,
    });
    expect(match).not.toBeNull();
    expect(match?.item.verification.status).toBe("APPROVED");
  });
});

