/**
 * Seed data for the demo — everything the stage flow needs, with zero live calls:
 *
 *  - five mock users (3 candidates, 2 mentors)
 *  - one real Australian job description (Culture Amp, Senior Applied AI Engineer)
 *    with its parsed form and cached company research
 *  - the pre-generated challenge, starter template and 12-requirement bank
 *  - two complete build sessions with full transcripts:
 *      Riley Chen   — strong: questions the brief, catches an error, names trade-offs
 *      Jordan Ellis — weak:   accepts everything
 *  - evaluations for both. They are built through the SAME finalisation and
 *    routing code the live app uses, so the weak one lands in the mentor queue
 *    for real reasons rather than because a flag was hard-coded.
 *
 * Idempotent: re-running does nothing once seeded. `--force` rebuilds the seeded
 * challenge (and any sessions on it); it never touches other data.
 */
import { PrismaClient } from "@prisma/client";
import { buildEvaluationData } from "../src/lib/services/evaluations";
import { RUBRIC_VERSION } from "../src/lib/constants";
import { toFileList } from "../src/lib/files";
import { SEED_CHALLENGE } from "../src/lib/fixtures/seed-challenge";
import { buildSeedEvaluation, STRONG_EVALUATION, WEAK_EVALUATION, type SeedEvaluation } from "../src/lib/fixtures/seed-evaluations";
import { SEED_JD_SOURCE_URL, SEED_JD_TEXT } from "../src/lib/fixtures/seed-jd";
import { SEED_PARSED_JD } from "../src/lib/fixtures/seed-parsed";
import { SEED_REQUIREMENTS } from "../src/lib/fixtures/seed-requirements";
import { SEED_RESEARCH, seedSearchCache } from "../src/lib/fixtures/seed-research";
import { STRONG_SESSION, WEAK_SESSION, finalFilesOf, type SeedSession } from "../src/lib/fixtures/seed-sessions";
import { queryHash } from "../src/lib/search";
import type { RequirementRef } from "../src/lib/ai/scoring";

const db = new PrismaClient();
const force = process.argv.includes("--force");

export const SEED_USERS = [
  { email: "alex.morgan@example.com", name: "Alex Morgan", role: "CANDIDATE" },
  { email: "riley.chen@example.com", name: "Riley Chen", role: "CANDIDATE" },
  { email: "jordan.ellis@example.com", name: "Jordan Ellis", role: "CANDIDATE" },
  { email: "casey.rivera@example.com", name: "Casey Rivera", role: "MENTOR" },
  { email: "robin.patel@example.com", name: "Robin Patel", role: "MENTOR" },
] as const;

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

async function removeSeededChallenge() {
  const submissions = await db.jobSubmission.findMany({ where: { sourceUrl: SEED_JD_SOURCE_URL }, select: { id: true } });
  const ids = submissions.map((s) => s.id);
  const challenges = await db.challenge.findMany({ where: { jobSubmissionId: { in: ids } }, select: { id: true } });
  const challengeIds = challenges.map((c) => c.id);
  // Sessions cascade to their turns, snapshot, evaluation and mentor reviews.
  const sessions = await db.buildSession.deleteMany({ where: { challengeId: { in: challengeIds } } });
  await db.challenge.deleteMany({ where: { id: { in: challengeIds } } }); // requirements cascade
  await db.jobSubmission.deleteMany({ where: { id: { in: ids } } });
  console.log(`  removed ${challengeIds.length} seeded challenge(s) and ${sessions.count} session(s) on them`);
}

async function main() {
  const existing = await db.jobSubmission.findFirst({ where: { sourceUrl: SEED_JD_SOURCE_URL } });
  if (existing && !force) {
    console.log("Already seeded. Use `npm run db:seed -- --force` to rebuild the seeded challenge.");
    return;
  }
  if (existing) {
    console.log("--force: rebuilding the seeded challenge");
    await removeSeededChallenge();
  }

  // Users
  const users: Record<string, string> = {};
  for (const u of SEED_USERS) {
    const row = await db.user.upsert({ where: { email: u.email }, update: { name: u.name, role: u.role }, create: u });
    users[u.email] = row.id;
  }

  // Cached company research: the exact queries the pipeline issues, so DEMO_MODE search hits the cache.
  for (const { query, results } of seedSearchCache()) {
    const hash = queryHash(query);
    await db.searchCache.upsert({
      where: { queryHash: hash },
      update: { results: results as never, failed: false, retryAfter: null },
      create: { queryHash: hash, query: query.toLowerCase(), results: results as never, failed: false },
    });
  }

  // JD -> challenge -> requirements
  const submission = await db.jobSubmission.create({
    data: {
      userId: users["alex.morgan@example.com"],
      rawJd: SEED_JD_TEXT,
      sourceUrl: SEED_JD_SOURCE_URL,
      parsedJd: SEED_PARSED_JD as never,
      companyResearch: SEED_RESEARCH as never,
      fromDemoCache: true,
    },
  });
  const challenge = await db.challenge.create({
    data: {
      jobSubmissionId: submission.id,
      title: SEED_CHALLENGE.title,
      brief: SEED_CHALLENGE.brief,
      domainContext: SEED_CHALLENGE.domainContext,
      timeboxMinutes: SEED_CHALLENGE.timeboxMinutes,
      starterTemplate: SEED_CHALLENGE.starterTemplate as never,
      rubricVersion: RUBRIC_VERSION,
      meta: SEED_CHALLENGE.meta as never,
    },
  });
  const requirementRows = [];
  for (const r of SEED_REQUIREMENTS) {
    requirementRows.push(
      await db.requirement.create({
        data: {
          challengeId: challenge.id,
          category: r.category,
          statement: r.statement,
          weight: r.weight,
          successSignals: r.successSignals,
          failureModes: r.failureModes,
        },
      })
    );
  }
  const refs: RequirementRef[] = requirementRows.map((r) => ({
    id: r.id,
    category: r.category as RequirementRef["category"],
    statement: r.statement,
    weight: r.weight,
    successSignals: r.successSignals,
    failureModes: r.failureModes,
  }));

  // Sessions, transcripts, snapshots, evaluations
  const seedSession = async (s: SeedSession, evaluation: SeedEvaluation, startedDaysAgo: number) => {
    const startedAt = new Date(Date.now() - startedDaysAgo * DAY);
    const at = (m: number) => new Date(startedAt.getTime() + m * MIN);
    const session = await db.buildSession.create({
      data: {
        challengeId: challenge.id,
        userId: users[s.userEmail],
        status: "SUBMITTED",
        startedAt,
        submittedAt: at(s.durationMinutes),
      },
    });
    for (const t of s.turns) {
      await db.chatTurn.create({
        data: {
          buildSessionId: session.id,
          seq: t.seq,
          role: t.role,
          content: t.content,
          filesWritten: t.role === "ASSISTANT" ? ((t.files ?? []) as never) : undefined,
          reasoning: t.reasoning ?? null,
          createdAt: at(t.atMinute),
        },
      });
    }
    const files = finalFilesOf(s);
    await db.fileSnapshot.create({
      data: { buildSessionId: session.id, tree: toFileList(files) as never, capturedAt: at(s.durationMinutes) },
    });

    const turns = s.turns.map((t) => ({ seq: t.seq, role: t.role, content: t.content, filesWritten: t.files ?? null, reasoning: t.reasoning ?? null }));
    const result = buildSeedEvaluation(evaluation, refs, turns, files);
    const data = buildEvaluationData({
      buildSessionId: session.id,
      rubricVersion: RUBRIC_VERSION,
      result,
      requirements: refs,
      turns,
      session: { durationMinutes: s.durationMinutes, timeboxMinutes: SEED_CHALLENGE.timeboxMinutes },
      source: "demo-cache",
    });
    const ev = await db.evaluation.create({ data: { ...data, createdAt: at(s.durationMinutes + 1) } });
    return { session, evaluation: ev };
  };

  const strong = await seedSession(STRONG_SESSION, STRONG_EVALUATION, 3);
  const weak = await seedSession(WEAK_SESSION, WEAK_EVALUATION, 1);

  console.log("Seeded.");
  console.log(`  challenge : /challenge/${challenge.id}`);
  console.log(`  strong    : score ${strong.evaluation.overallScore}%  needsHumanReview=${strong.evaluation.needsHumanReview}  /report/${strong.evaluation.id}`);
  console.log(`  weak      : score ${weak.evaluation.overallScore}%  needsHumanReview=${weak.evaluation.needsHumanReview}  /report/${weak.evaluation.id}  (in the mentor queue)`);
  console.log(`  reason    : ${weak.evaluation.escalationReason}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
