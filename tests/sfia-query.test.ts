import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    challenge: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { queryChallengesBySfia, getSfiaBankStats } from "@/lib/services/sfia-query";

describe("SFIA 9 Deep Query Engine", () => {
  it("queries challenges from the verified bank", async () => {
    const results = await queryChallengesBySfia();
    expect(results.length).toBeGreaterThan(0);
    const hero = results.find((c) => c.employer.toLowerCase().includes("employment hero"));
    expect(hero).toBeDefined();
    expect(hero?.source).toBe("VERIFIED_BANK");
    expect(hero?.sfiaLevel).toBe(3);
  });

  it("filters by company name case-insensitively", async () => {
    const results = await queryChallengesBySfia({ company: "employment hero" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.employer.toLowerCase().includes("employment hero"))).toBe(true);

    const macquarieResults = await queryChallengesBySfia({ company: "macquarie" });
    expect(macquarieResults.length).toBeGreaterThan(0);
    expect(macquarieResults.every((r) => r.employer.toLowerCase().includes("macquarie"))).toBe(true);
  });

  it("filters by SFIA 9 skill code (e.g. PROG, DESN, DBDS)", async () => {
    const progResults = await queryChallengesBySfia({ skill: "PROG" });
    expect(progResults.length).toBeGreaterThan(0);
    expect(progResults.every((r) => r.primarySkills.includes("PROG"))).toBe(true);

    const dbdsResults = await queryChallengesBySfia({ skill: "DBDS" });
    expect(dbdsResults.length).toBeGreaterThan(0);
    expect(dbdsResults.every((r) => r.primarySkills.includes("DBDS"))).toBe(true);
  });

  it("filters by SFIA responsibility level (Level 2 vs Level 3)", async () => {
    const level3Results = await queryChallengesBySfia({ level: 3 });
    expect(level3Results.length).toBeGreaterThan(0);
    expect(level3Results.every((r) => r.sfiaLevel === 3)).toBe(true);
  });

  it("filters requirements by importance level (CRITICAL vs CORE vs STANDARD)", async () => {
    const criticalResults = await queryChallengesBySfia({ importance: "CRITICAL" });
    expect(criticalResults.length).toBeGreaterThan(0);
    for (const ch of criticalResults) {
      expect(ch.requirements.length).toBeGreaterThan(0);
      expect(ch.requirements.every((req) => req.importance === "CRITICAL")).toBe(true);
      expect(ch.requirements.every((req) => req.weight >= 20)).toBe(true);
    }

    const coreResults = await queryChallengesBySfia({ importance: "CORE" });
    expect(coreResults.length).toBeGreaterThan(0);
    for (const ch of coreResults) {
      expect(ch.requirements.every((req) => req.importance === "CORE")).toBe(true);
      expect(ch.requirements.every((req) => req.weight >= 15 && req.weight < 20)).toBe(true);
    }
  });

  it("computes accurate aggregate statistics across the SFIA 9 bank", async () => {
    const stats = await getSfiaBankStats();
    expect(stats.totalChallenges).toBeGreaterThan(0);
    expect(stats.totalCompanies).toBeGreaterThan(0);
    expect(stats.totalRequirements).toBeGreaterThan(0);
    expect(stats.skillsDistribution["PROG"]).toBeGreaterThan(0);
    expect(stats.levelsDistribution["Level 3"]).toBeGreaterThan(0);
  });
});
