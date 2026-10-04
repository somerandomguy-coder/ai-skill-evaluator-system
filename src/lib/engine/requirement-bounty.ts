import fs from "node:fs";
import path from "node:path";
import { VERIFIED_CHALLENGE_BANK } from "./verified-bank";

export type BountyStatus = "PENDING" | "VERIFIED" | "FLAGGED_DUPLICATE" | "FLAGGED_BAD";

export interface BountyReview {
  mentorId: string;
  mentorName: string;
  action: "VERIFY" | "FLAG_DUPLICATE" | "FLAG_BAD";
  reason?: string;
  notes?: string;
  duplicateOfId?: string;
  timestamp: string;
  creditsEarned: number;
}

export interface BountyRequirement {
  id: string;
  requirementId: string;
  challengeId: string;
  challengeTitle: string;
  employer: string;
  roleTitle: string;
  category: string;
  statement: string;
  weight: number;
  sfiaLevel: number;
  injectedTrap: string | null;
  successSignals: string[];
  failureModes: string[];
  bountyCredits: number;
  bountyUsd: number;
  status: BountyStatus;
  reviews: BountyReview[];
  briefMarkdown?: string;
  technicalInvariants?: string[];
  allChallengeRequirements?: {
    id: string;
    statement: string;
    category: string;
    weight: number;
    sfiaLevel: number;
  }[];
  verifiedBy?: {
    mentorId: string;
    mentorName: string;
    verifiedAt: string;
    notes?: string;
  };
}

export interface MentorBountyStats {
  mentorId: string;
  totalCredits: number;
  totalUsd: number;
  verifiedCount: number;
  duplicatesFlagged: number;
  badFlagged: number;
  totalReviewed: number;
  curatorRank: string;
  nextRankThreshold: number;
}

const REVIEWS_FILE_PATH = path.join(process.cwd(), "data-export", "bounty-reviews.json");
const DATASET_FILE_PATH = path.join(process.cwd(), "data-export", "requirements-dataset.json");

// In-memory cache of reviews keyed by requirement ID
const reviewsStore = new Map<string, BountyReview[]>();

// Initialize persistent reviews from disk
function loadPersistedReviews(): void {
  try {
    if (fs.existsSync(REVIEWS_FILE_PATH)) {
      const raw = fs.readFileSync(REVIEWS_FILE_PATH, "utf-8");
      const data: Record<string, BountyReview[]> = JSON.parse(raw);
      for (const [k, v] of Object.entries(data)) {
        reviewsStore.set(k, v);
      }
    }
  } catch (err) {
    console.warn("[BountyEngine] Could not load persisted reviews:", err);
  }
}

function savePersistedReviews(): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return;
  }
  try {
    const data: Record<string, BountyReview[]> = {};
    for (const [k, v] of reviewsStore.entries()) {
      data[k] = v;
    }
    fs.mkdirSync(path.dirname(REVIEWS_FILE_PATH), { recursive: true });
    fs.writeFileSync(REVIEWS_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[BountyEngine] Could not save reviews to disk:", err);
  }
}

// Load on module initialization
loadPersistedReviews();

/**
 * Loads and caches base requirements from verified bank and requirements dataset.
 */
let baseRequirementsCache: BountyRequirement[] | null = null;

function loadBaseRequirements(): BountyRequirement[] {
  if (baseRequirementsCache) return baseRequirementsCache;

  const items: BountyRequirement[] = [];
  const seenIds = new Set<string>();

  // 1. First add all verified bank requirements (prioritize curated challenges like Total Game Development)
  for (const challenge of VERIFIED_CHALLENGE_BANK) {
    const allRubric = challenge.rubric.map((cr) => ({
      id: cr.id,
      statement: cr.statement,
      category: cr.category,
      weight: cr.weight,
      sfiaLevel: cr.sfiaLevel || challenge.sfiaProfile.level,
    }));

    for (const r of challenge.rubric) {
      const id = r.id;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const weight = r.weight || 3;
      // If weight > 5, it is a percentage allocation (e.g. 15% or 20%), normalize bounty credits
      const bountyCredits = weight > 5 ? Math.round(weight * 3.5) : weight * 15;
      const bountyUsd = weight > 5 ? Math.round(weight * 1.5) : weight * 5;

      items.push({
        id,
        requirementId: id,
        challengeId: challenge.id,
        challengeTitle: challenge.briefMarkdown.split("\n")[0].replace(/^#+\s*/, "") || challenge.roleTitle,
        employer: challenge.companyName,
        roleTitle: challenge.roleTitle,
        category: r.category,
        statement: r.statement,
        weight,
        sfiaLevel: r.sfiaLevel || challenge.sfiaProfile.level,
        injectedTrap: r.injectedTrap || null,
        successSignals: r.successSignals || [],
        failureModes: r.failureModes || [],
        bountyCredits,
        bountyUsd,
        status: challenge.verification.status === "APPROVED" ? "VERIFIED" : "PENDING",
        reviews: [],
        briefMarkdown: challenge.briefMarkdown,
        technicalInvariants: challenge.technicalInvariants || [],
        allChallengeRequirements: allRubric,
        verifiedBy: challenge.verification.status === "APPROVED" ? {
          mentorId: challenge.verification.badge?.mentorId || "mentor_curator_1",
          mentorName: challenge.verification.badge?.mentorName || "Verified Studio Architect",
          verifiedAt: challenge.verification.badge?.verifiedAt || new Date().toISOString(),
          notes: challenge.verification.badge?.notes || "Accredited under MentorME 5-Point Studio Checklist.",
        } : undefined,
      });
    }
  }

  // 2. Add requirements from the 621 requirements dataset
  try {
    if (fs.existsSync(DATASET_FILE_PATH)) {
      const raw = fs.readFileSync(DATASET_FILE_PATH, "utf-8");
      const dataset = JSON.parse(raw);
      if (Array.isArray(dataset)) {
        // Index sibling requirements by challengeId
        const challengeGroups = new Map<string, any[]>();
        for (const item of dataset) {
          const cId = item.challengeId || "generic-challenge";
          if (!challengeGroups.has(cId)) challengeGroups.set(cId, []);
          challengeGroups.get(cId)!.push(item);
        }

        for (const item of dataset) {
          const id = item.requirementId || `req-${items.length}`;
          if (seenIds.has(id)) continue;
          seenIds.add(id);

          const cId = item.challengeId || "generic-challenge";
          const siblings = challengeGroups.get(cId) || [item];
          const allRubric = siblings.map((s) => ({
            id: s.requirementId,
            statement: s.statement,
            category: s.category || "TECHNICAL_APPROACH",
            weight: s.weight || 3,
            sfiaLevel: s.sfiaLevel || 3,
          }));

          const weight = item.weight || 3;
          const bountyCredits = weight > 5 ? Math.round(weight * 3.5) : weight * 15;
          const bountyUsd = weight > 5 ? Math.round(weight * 1.5) : weight * 5;

          const synthesizedBrief = `# ${item.challengeTitle || item.roleTitle}

## Employer & Context
Real-world authentic work-sample challenge derived from active requirements at **${item.employer}** for **${item.roleTitle}** (Target SFIA Level ${item.sfiaLevel || 3}).

## Assessment Overview
Candidates must demonstrate real engineering competence in an interactive Claude/DeepSeek-powered workspace. The candidate is evaluated under Evidence-Centered Design (ECD) on how they frame problems, drive the AI assistant, and verify domain invariants before shipping.

## Challenge Rubric Criteria (${siblings.length} Core Requirements)
${siblings.map((s, idx) => `${idx + 1}. **[${s.category}]** ${s.statement} *(Weight: ${s.weight}/5)*`).join("\n")}
`;

          items.push({
            id,
            requirementId: id,
            challengeId: cId,
            challengeTitle: item.challengeTitle || item.roleTitle || "Technical Work-Sample",
            employer: item.employer || "Australian Tech Employer",
            roleTitle: item.roleTitle || "Software Engineer",
            category: item.category || "TECHNICAL_APPROACH",
            statement: item.statement,
            weight,
            sfiaLevel: item.sfiaLevel || 3,
            injectedTrap: item.injectedTrap || null,
            successSignals: item.successSignals?.length ? item.successSignals : [
              `Candidate explicitly articulates design boundaries matching ${item.category} standards`,
              `Interrogates the brief and clarifies assumptions before requesting code generation`,
            ],
            failureModes: item.failureModes?.length ? item.failureModes : [
              `Blindly accepts default AI output without inspecting statutory or boundary constraints`,
              `Single-prompt code dump without verification or unit tests`,
            ],
            bountyCredits,
            bountyUsd,
            status: "PENDING",
            reviews: [],
            briefMarkdown: synthesizedBrief,
            technicalInvariants: [
              `Adheres to ${item.employer} statutory engineering standards and SFIA Level ${item.sfiaLevel || 3} rigor`,
              `Zero-trust verification: candidate must validate AI assumptions with tests or assertions`,
              `Guards against subtle edge case regressions and unhandled boundary states`,
            ],
            allChallengeRequirements: allRubric,
          });
        }
      }
    }
  } catch (err) {
    console.warn("[BountyEngine] Could not load dataset requirements:", err);
  }

  baseRequirementsCache = items;
  return items;
}

/**
 * Returns all bounty requirements with review statuses merged in.
 */
export function getBountyRequirements(filters?: {
  query?: string;
  category?: string;
  status?: string;
  employer?: string;
  sfiaLevel?: number;
}): { items: BountyRequirement[]; totalCount: number; categories: string[]; employers: string[] } {
  const base = loadBaseRequirements();

  // Distinct categories and employers for filter UI
  const categoriesSet = new Set<string>();
  const employersSet = new Set<string>();

  const merged = base.map((item) => {
    categoriesSet.add(item.category);
    employersSet.add(item.employer);

    const reviews = reviewsStore.get(item.id) || [];
    if (reviews.length === 0) return item;

    const latest = reviews[reviews.length - 1];
    let status: BountyStatus = item.status;
    let verifiedBy = item.verifiedBy;

    if (latest.action === "VERIFY") {
      status = "VERIFIED";
      verifiedBy = {
        mentorId: latest.mentorId,
        mentorName: latest.mentorName,
        verifiedAt: latest.timestamp,
        notes: latest.notes,
      };
    } else if (latest.action === "FLAG_DUPLICATE") {
      status = "FLAGGED_DUPLICATE";
    } else if (latest.action === "FLAG_BAD") {
      status = "FLAGGED_BAD";
    }

    return {
      ...item,
      status,
      reviews,
      verifiedBy,
    };
  });

  let filtered = merged;

  if (filters?.query) {
    const q = filters.query.toLowerCase().trim();
    filtered = filtered.filter(
      (i) =>
        i.statement.toLowerCase().includes(q) ||
        i.employer.toLowerCase().includes(q) ||
        i.challengeTitle.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.injectedTrap && i.injectedTrap.toLowerCase().includes(q))
    );
  }

  if (filters?.category && filters.category !== "ALL") {
    filtered = filtered.filter((i) => i.category === filters.category);
  }

  if (filters?.status && filters.status !== "ALL") {
    filtered = filtered.filter((i) => i.status === filters.status);
  }

  if (filters?.employer && filters.employer !== "ALL") {
    filtered = filtered.filter((i) => i.employer.toLowerCase().includes(filters.employer!.toLowerCase()));
  }

  if (filters?.sfiaLevel) {
    filtered = filtered.filter((i) => i.sfiaLevel === filters.sfiaLevel);
  }

  return {
    items: filtered,
    totalCount: filtered.length,
    categories: Array.from(categoriesSet).sort(),
    employers: Array.from(employersSet).sort(),
  };
}

/**
 * Gets a single bounty requirement by ID.
 */
export function getBountyRequirementById(id: string): BountyRequirement | null {
  const { items } = getBountyRequirements();
  return items.find((i) => i.id === id || i.requirementId === id) || null;
}

/**
 * Submits a mentor review for a requirement, awarding credits and stamping verification.
 */
export function submitRequirementReview(params: {
  requirementId: string;
  mentorId: string;
  mentorName: string;
  action: "VERIFY" | "FLAG_DUPLICATE" | "FLAG_BAD";
  reason?: string;
  notes?: string;
  duplicateOfId?: string;
}): {
  item: BountyRequirement;
  reward: { credits: number; usd: number; badge: string };
  updatedStats: MentorBountyStats;
} {
  const req = getBountyRequirementById(params.requirementId);
  if (!req) {
    throw new Error(`Requirement ${params.requirementId} not found`);
  }

  const existing = reviewsStore.get(req.id) || [];
  if (existing.some((r) => r.mentorId === params.mentorId)) {
    throw new Error(`You have already submitted an audit for requirement ${params.requirementId}.`);
  }
  if (existing.some((r) => r.action === "VERIFY")) {
    throw new Error(`Requirement ${params.requirementId} has already been verified and credited.`);
  }

  // Credit reward rules:
  // - Verify: 100% of bountyCredits (35 - 75 credits)
  // - Flag Bad: 35 credits (Defect curation bounty)
  // - Flag Duplicate: 25 credits (Deduplication bounty)
  let creditsEarned = req.bountyCredits;
  let badge = "Mentor Verified Stamp";

  if (params.action === "FLAG_BAD") {
    creditsEarned = 35;
    badge = "Quality Vigilance Award";
  } else if (params.action === "FLAG_DUPLICATE") {
    creditsEarned = 25;
    badge = "Deduplication Bounty";
  }

  const review: BountyReview = {
    mentorId: params.mentorId,
    mentorName: params.mentorName,
    action: params.action,
    reason: params.reason,
    notes: params.notes,
    duplicateOfId: params.duplicateOfId,
    timestamp: new Date().toISOString(),
    creditsEarned,
  };

  existing.push(review);
  reviewsStore.set(req.id, existing);
  savePersistedReviews();

  const updatedItem = getBountyRequirementById(req.id)!;
  const updatedStats = getMentorBountyStats(params.mentorId);

  return {
    item: updatedItem,
    reward: {
      credits: creditsEarned,
      usd: Math.round(creditsEarned * 0.5),
      badge,
    },
    updatedStats,
  };
}

/**
 * Computes mentor bounty statistics across all reviews.
 */
export function getMentorBountyStats(mentorId: string): MentorBountyStats {
  let totalCredits = 250; // Starting baseline for accredited mentor
  let verifiedCount = 0;
  let duplicatesFlagged = 0;
  let badFlagged = 0;
  let totalReviewed = 0;

  for (const reviews of reviewsStore.values()) {
    for (const r of reviews) {
      if (r.mentorId === mentorId) {
        totalReviewed++;
        totalCredits += r.creditsEarned;
        if (r.action === "VERIFY") verifiedCount++;
        else if (r.action === "FLAG_DUPLICATE") duplicatesFlagged++;
        else if (r.action === "FLAG_BAD") badFlagged++;
      }
    }
  }

  let curatorRank = "Junior Assessor";
  let nextRankThreshold = 500;

  if (totalCredits >= 1500) {
    curatorRank = "Principal SFIA Fellow";
    nextRankThreshold = 3000;
  } else if (totalCredits >= 800) {
    curatorRank = "Senior Studio Curator";
    nextRankThreshold = 1500;
  } else if (totalCredits >= 400) {
    curatorRank = "Accredited MentorME Reviewer";
    nextRankThreshold = 800;
  }

  return {
    mentorId,
    totalCredits,
    totalUsd: Math.round(totalCredits * 0.5),
    verifiedCount,
    duplicatesFlagged,
    badFlagged,
    totalReviewed,
    curatorRank,
    nextRankThreshold,
  };
}
