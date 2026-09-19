/**
 * Postgres-backed data source. Reads rows through Prisma and maps them to the
 * view models the UI renders; mutations that involve rules live in services/.
 */
import type { Prisma } from "@prisma/client";
import { CompanyResearchSchema, ParsedJdSchema, type CompanyResearch, type ParsedJd } from "../ai/schemas";
import { computeOverall } from "../ai/scoring";
import { prisma } from "../db";
import { SEED_JD_SOURCE_URL } from "../fixtures/seed-jd";
import { parseChallengeMeta, parseEscalationReasons, parseFileList, parseFileMap, parseRequirementResults } from "../json";
import { effectiveScore } from "../services/effective-score";
import { reconstructFiles, startSession } from "../services/sessions";
import { buildCognitiveSuites } from "../services/cognitive-rubric";
import { mockDataSource } from "./mock";
import { sortRequirements, toRequirementView, toTurnView } from "./mappers";
import type {
  ChallengeView,
  DataSource,
  EvaluationSource,
  EvaluationView,
  HomeView,
  JobView,
  QueueItemView,
  ReviewStatus,
  UserView,
  WorkspaceView,
} from "./types";

const toUser = (u: { id: string; name: string; email: string; role: "CANDIDATE" | "MENTOR" }): UserView => ({ id: u.id, name: u.name, email: u.email, role: u.role });

const EMPTY_JOB: ParsedJd = { roleTitle: "Unknown role", seniority: "UNSPECIFIED", employer: "Unknown", location: null, domain: "", teamContext: "", mustHaveSkills: [], niceToHaveSkills: [], barriers: [] };

function readJob(parsedJd: unknown, sourceUrl: string | null): JobView {
  const r = ParsedJdSchema.safeParse(parsedJd);
  return { ...(r.success ? r.data : EMPTY_JOB), sourceUrl };
}

function readResearch(json: unknown): ChallengeView["research"] {
  const r = CompanyResearchSchema.safeParse(json);
  const c: CompanyResearch | null = r.success ? r.data : null;
  return {
    whatTheyDo: c?.whatTheyDo ?? "",
    domainAndUsers: c?.domainAndUsers ?? "",
    technicalSignals: c?.technicalSignals ?? [],
    groundedInSearch: c?.groundedInSearch ?? false,
    sources: (c?.sources ?? []).map((s) => ({ title: s.title, url: s.url })),
  };
}

const challengeInclude = { requirements: true, jobSubmission: true } satisfies Prisma.ChallengeInclude;

function toChallengeView(c: Prisma.ChallengeGetPayload<{ include: typeof challengeInclude }>): ChallengeView {
  return {
    id: c.id,
    title: c.title,
    brief: c.brief,
    domainContext: c.domainContext,
    timeboxMinutes: c.timeboxMinutes,
    rubricVersion: c.rubricVersion,
    requirements: sortRequirements(c.requirements).map(toRequirementView),
    job: readJob(c.jobSubmission.parsedJd, c.jobSubmission.sourceUrl),
    research: readResearch(c.jobSubmission.companyResearch),
    fromDemoCache: c.jobSubmission.fromDemoCache || parseChallengeMeta(c.meta).source === "demo-cache",
  };
}

const evaluationInclude = {
  mentorReviews: { orderBy: { reviewedAt: "desc" } },
  buildSession: {
    include: {
      turns: { orderBy: { seq: "asc" } },
      snapshot: true,
      challenge: { include: challengeInclude },
    },
  },
} satisfies Prisma.EvaluationInclude;

type EvaluationRow = Prisma.EvaluationGetPayload<{ include: typeof evaluationInclude }>;

function toEvaluationView(e: EvaluationRow): EvaluationView {
  const session = e.buildSession;
  const challenge = toChallengeView(session.challenge);
  const byId = new Map(challenge.requirements.map((r) => [r.id, r]));
  const stored = parseRequirementResults(e.perRequirement);
  const results = challenge.requirements.flatMap((req) => {
    const r = stored.find((s) => s.requirementId === req.id);
    return r ? [{ ...r, requirement: req }] : [];
  });
  const reviews = e.mentorReviews.map((m) => ({
    id: m.id,
    verdict: m.verdict,
    comments: m.comments,
    adjustedScore: m.adjustedScore,
    reviewedAt: m.reviewedAt.toISOString(),
  }));
  const end = session.submittedAt ?? e.createdAt;
  const turns = session.turns.map(toTurnView);
  const cognitive = buildCognitiveSuites({
    sessionId: session.id,
    challengeTitle: challenge.title,
    overallScore: e.overallScore,
    turns,
  });

  return {
    id: e.id,
    sessionId: session.id,
    ownerId: session.userId,
    createdAt: e.createdAt.toISOString(),
    challenge: { id: challenge.id, title: challenge.title, timeboxMinutes: challenge.timeboxMinutes, rubricVersion: e.rubricVersion },
    job: { roleTitle: challenge.job.roleTitle, employer: challenge.job.employer },
    source: e.source as EvaluationSource,
    overallScore: e.overallScore,
    confidence: e.confidence,
    coverage: computeOverall(stored, [...byId.values()]).coverage,
    effective: effectiveScore(e, reviews),
    results,
    strengths: e.strengths,
    gaps: e.gaps,
    needsHumanReview: e.needsHumanReview,
    reviewStatus: e.reviewStatus as ReviewStatus,
    contested: e.contested,
    contestReason: e.contestReason,
    escalation: parseEscalationReasons(e.escalationDetail),
    reviews,
    turns,
    files: parseFileList(session.snapshot?.tree),
    durationMinutes: Math.max(0, (end.getTime() - session.startedAt.getTime()) / 60_000),
    suiteA: cognitive.suiteA,
    suiteB: cognitive.suiteB,
    ztAiedAudit: cognitive.ztAiedAudit,
    verificationReceipt: cognitive.verificationReceipt,
  };
}

export const prismaDataSource: DataSource = {
  kind: "db",

  async listUsers() {
    return (await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] })).map(toUser);
  },
  async findUser(id) {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? toUser(u) : null;
  },
  async findUserByEmail(email) {
    const u = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    return u ? toUser(u) : null;
  },
  async createCandidate(email, name) {
    const e = email.trim().toLowerCase();
    const derived = (e.split("@")[0] ?? "")
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p[0]!.toUpperCase() + p.slice(1))
      .join(" ");
    return toUser(await prisma.user.create({ data: { email: e, name: name?.trim() || derived || "Candidate", role: "CANDIDATE" } }));
  },

  async getHome(userId): Promise<HomeView> {
    const seeded = await prisma.challenge.findFirst({
      where: { jobSubmission: { sourceUrl: SEED_JD_SOURCE_URL } },
      include: { jobSubmission: true },
      orderBy: { createdAt: "asc" },
    });
    const example = seeded && readJob(seeded.jobSubmission.parsedJd, seeded.jobSubmission.sourceUrl);
    const sessions = userId
      ? await prisma.buildSession.findMany({
          where: { userId },
          orderBy: { startedAt: "desc" },
          take: 12,
          include: { challenge: { include: { jobSubmission: true } }, evaluation: { select: { id: true } } },
        })
      : [];
    return {
      example:
        seeded && example
          ? {
              challengeId: seeded.id,
              roleTitle: example.roleTitle,
              employer: example.employer,
              domain: example.domain,
              skills: example.mustHaveSkills.slice(0, 4),
              barrierCount: example.barriers.length,
              sourceUrl: example.sourceUrl,
            }
          : null,
      mySessions: sessions.map((s) => ({
        sessionId: s.id,
        challengeTitle: s.challenge.title,
        roleTitle: readJob(s.challenge.jobSubmission.parsedJd, null).roleTitle,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        evaluationId: s.evaluation?.id ?? null,
      })),
    };
  },

  async getChallenge(id) {
    let c = await prisma.challenge.findUnique({ where: { id }, include: challengeInclude });
    if (!c && (id === "seed-challenge" || id.startsWith("demo-") || id.startsWith("seed-"))) {
      c = await prisma.challenge.findFirst({
        where: { jobSubmission: { sourceUrl: SEED_JD_SOURCE_URL } },
        include: challengeInclude,
        orderBy: { createdAt: "asc" },
      });
    }
    return c ? toChallengeView(c) : null;
  },

  startSession,

  async getWorkspace(sessionId): Promise<WorkspaceView | null> {
    let s = await prisma.buildSession.findUnique({
      where: { id: sessionId },
      include: { challenge: { include: { requirements: true } }, turns: { orderBy: { seq: "asc" } }, evaluation: { select: { id: true } } },
    });
    if (!s && (sessionId === "seed-session-active" || sessionId.startsWith("seed-") || sessionId.startsWith("demo-"))) {
      return mockDataSource.getWorkspace(sessionId);
    }
    if (!s) return null;
    const starter = parseFileMap(s.challenge.starterTemplate);
    return {
      sessionId: s.id,
      ownerId: s.userId,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      challenge: {
        id: s.challenge.id,
        title: s.challenge.title,
        brief: s.challenge.brief,
        domainContext: s.challenge.domainContext,
        timeboxMinutes: s.challenge.timeboxMinutes,
        rubricVersion: s.challenge.rubricVersion,
        requirements: sortRequirements(s.challenge.requirements).map(toRequirementView),
      },
      starter,
      turns: s.turns.map(toTurnView),
      files: reconstructFiles(starter, s.turns),
      evaluationId: s.evaluation?.id ?? null,
    };
  },

  async getEvaluation(id) {
    let e = await prisma.evaluation.findUnique({ where: { id }, include: evaluationInclude });
    if (!e && (id === "seed-eval-strong" || id === "seed-eval-weak" || id.startsWith("demo-") || id.startsWith("seed-"))) {
      e = await prisma.evaluation.findFirst({
        where: { buildSession: { challenge: { jobSubmission: { sourceUrl: SEED_JD_SOURCE_URL } } } },
        include: evaluationInclude,
        orderBy: { overallScore: id === "seed-eval-weak" ? "asc" : "desc" },
      });
    }
    return e ? toEvaluationView(e) : null;
  },

  async getQueue(): Promise<QueueItemView[]> {
    const rows = await prisma.evaluation.findMany({
      where: { reviewStatus: "PENDING" },
      include: { buildSession: { include: { challenge: { include: challengeInclude } } } },
      orderBy: { createdAt: "asc" },
    });
    return rows
      .map((e) => {
        const challenge = toChallengeView(e.buildSession.challenge);
        return {
          id: e.id,
          challengeTitle: challenge.title,
          roleTitle: challenge.job.roleTitle,
          createdAt: e.createdAt.toISOString(),
          overallScore: e.overallScore,
          coverage: computeOverall(parseRequirementResults(e.perRequirement), challenge.requirements).coverage,
          confidence: e.confidence,
          contested: e.contested,
          source: e.source as EvaluationSource,
          escalation: parseEscalationReasons(e.escalationDetail),
        };
      })
      .sort((a, b) => Number(b.contested) - Number(a.contested));
  },

  async countReviewed() {
    return prisma.evaluation.count({ where: { reviewStatus: "REVIEWED" } });
  },
};
