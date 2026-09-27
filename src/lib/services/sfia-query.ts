/**
 * SFIA 9 Deep Query & Filtering Service.
 *
 * Enables fine-grained retrieval of challenges and requirements by:
 * - Company / Employer
 * - Role Title
 * - SFIA 9 Skill Code (PROG, DESN, TEST, DBDS, ITOP, DATA, EMER, PEMT)
 * - SFIA Responsibility Level (Level 2: Assist, Level 3: Apply, Level 4: Enable)
 * - Importance Level (CRITICAL >= 20%, CORE >= 15%, STANDARD < 15%)
 */
import { prisma } from "../db";
import { VERIFIED_CHALLENGE_BANK } from "../engine/verified-bank";
import type { SfiaLevel, SfiaSkillCode, TierLevel } from "../types/assessment-v2";

export type ImportanceLevel = "CRITICAL" | "CORE" | "STANDARD" | "ALL";

export interface SfiaQueryFilters {
  company?: string;
  role?: string;
  skill?: SfiaSkillCode | string;
  level?: SfiaLevel | number;
  importance?: ImportanceLevel;
  tier?: TierLevel;
  limit?: number;
}

export interface SfiaRequirementView {
  id: string;
  category: string;
  statement: string;
  weight: number;
  importance: "CRITICAL" | "CORE" | "STANDARD";
  successSignals: string[];
  failureModes: string[];
}

export interface SfiaChallengeQueryResult {
  id: string;
  title: string;
  employer: string;
  tier: TierLevel;
  timeboxMinutes: number;
  sfiaLevel: SfiaLevel;
  primarySkills: SfiaSkillCode[];
  requirements: SfiaRequirementView[];
  totalRequirements: number;
  source: "DATABASE" | "VERIFIED_BANK";
}

function classifyImportance(weight: number): "CRITICAL" | "CORE" | "STANDARD" {
  if (weight >= 20) return "CRITICAL";
  if (weight >= 15) return "CORE";
  return "STANDARD";
}

/**
 * Searches challenges and requirements across PostgreSQL database and the Tier 1 Verified Bank.
 */
export async function queryChallengesBySfia(
  filters: SfiaQueryFilters = {}
): Promise<SfiaChallengeQueryResult[]> {
  const { company, role, skill, level, importance, tier, limit = 50 } = filters;

  const results: SfiaChallengeQueryResult[] = [];
  const normalizedCompany = company?.toLowerCase().trim();
  const normalizedRole = role?.toLowerCase().trim();
  const normalizedSkill = skill?.toUpperCase().trim() as SfiaSkillCode | undefined;
  const targetLevel = level ? Number(level) as SfiaLevel : undefined;

  // 1. Search Tier 1 Verified Bank
  for (const v of VERIFIED_CHALLENGE_BANK) {
    if (normalizedCompany && !v.companyName.toLowerCase().includes(normalizedCompany)) continue;
    if (normalizedRole && !v.roleTitle.toLowerCase().includes(normalizedRole)) continue;
    if (targetLevel && v.sfiaProfile.level !== targetLevel) continue;
    if (normalizedSkill && !v.sfiaProfile.primarySkills.includes(normalizedSkill)) continue;
    if (tier && v.tier !== tier) continue;

    const reqs: SfiaRequirementView[] = v.rubric.map((r) => ({
      id: r.id,
      category: r.category,
      statement: r.statement,
      weight: r.weight,
      importance: classifyImportance(r.weight),
      successSignals: r.successSignals,
      failureModes: r.failureModes,
    }));

    const filteredReqs =
      importance && importance !== "ALL"
        ? reqs.filter((r) => r.importance === importance)
        : reqs;

    if (importance && importance !== "ALL" && filteredReqs.length === 0) continue;

    results.push({
      id: v.id,
      title: v.roleTitle,
      employer: v.companyName,
      tier: v.tier,
      timeboxMinutes: v.sfiaProfile.level === 2 ? 120 : 180,
      sfiaLevel: v.sfiaProfile.level,
      primarySkills: v.sfiaProfile.primarySkills,
      requirements: filteredReqs,
      totalRequirements: reqs.length,
      source: "VERIFIED_BANK",
    });
  }

  // 2. Search Database Challenges
  try {
    const dbChallenges = await prisma.challenge.findMany({
      include: {
        requirements: true,
        jobSubmission: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    for (const ch of dbChallenges) {
      const meta = typeof ch.meta === "object" && ch.meta !== null ? (ch.meta as Record<string, any>) : {};
      const sfiaProfile = meta.sfiaProfile || { level: 3, primarySkills: ["PROG", "DESN"] };
      const chTier: TierLevel = meta.tier || "TIER_2_CACHED";
      const employer = ch.jobSubmission?.parsedJd
        ? (ch.jobSubmission.parsedJd as Record<string, any>).employer || "Enterprise"
        : "Enterprise";

      if (normalizedCompany && !employer.toLowerCase().includes(normalizedCompany) && !ch.title.toLowerCase().includes(normalizedCompany)) continue;
      if (normalizedRole && !ch.title.toLowerCase().includes(normalizedRole)) continue;
      if (targetLevel && sfiaProfile.level !== targetLevel) continue;
      if (normalizedSkill && !sfiaProfile.primarySkills?.includes(normalizedSkill)) continue;
      if (tier && chTier !== tier) continue;

      const reqs: SfiaRequirementView[] = ch.requirements.map((r) => ({
        id: r.id,
        category: r.category,
        statement: r.statement,
        weight: r.weight,
        importance: classifyImportance(r.weight),
        successSignals: r.successSignals,
        failureModes: r.failureModes,
      }));

      const filteredReqs =
        importance && importance !== "ALL"
          ? reqs.filter((r) => r.importance === importance)
          : reqs;

      if (importance && importance !== "ALL" && filteredReqs.length === 0) continue;

      // Avoid duplicate IDs if already in verified bank
      if (results.some((r) => r.id === ch.id)) continue;

      results.push({
        id: ch.id,
        title: ch.title,
        employer,
        tier: chTier,
        timeboxMinutes: ch.timeboxMinutes,
        sfiaLevel: sfiaProfile.level ?? 3,
        primarySkills: sfiaProfile.primarySkills ?? ["PROG", "DESN"],
        requirements: filteredReqs,
        totalRequirements: reqs.length,
        source: "DATABASE",
      });
    }
  } catch (err) {
    console.warn("[queryChallengesBySfia] DB query error (falling back to bank):", err);
  }

  return results.slice(0, limit);
}

/**
 * Returns distinct metrics across the SFIA 9 challenge bank.
 */
export async function getSfiaBankStats() {
  const all = await queryChallengesBySfia({ limit: 500 });
  const companies = Array.from(new Set(all.map((c) => c.employer)));
  const skillsCount: Record<string, number> = {};
  const levelsCount: Record<string, number> = { "Level 2": 0, "Level 3": 0, "Level 4": 0 };
  let totalRequirements = 0;

  for (const item of all) {
    totalRequirements += item.totalRequirements;
    const lvlKey = `Level ${item.sfiaLevel}`;
    levelsCount[lvlKey] = (levelsCount[lvlKey] || 0) + 1;
    for (const sk of item.primarySkills) {
      skillsCount[sk] = (skillsCount[sk] || 0) + 1;
    }
  }

  return {
    totalChallenges: all.length,
    totalCompanies: companies.length,
    companies: companies.slice(0, 20),
    totalRequirements,
    skillsDistribution: skillsCount,
    levelsDistribution: levelsCount,
  };
}
