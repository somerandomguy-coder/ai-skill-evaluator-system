import { describe, expect, it } from "vitest";
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
    const result = await resolveChallenge(query, "Australian Bank");

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
  });
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

