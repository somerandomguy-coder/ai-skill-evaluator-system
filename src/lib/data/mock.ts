/**
 * Fixture-backed data source: renders every screen from the seed fixtures with
 * no database. Read-only apart from sign-up. Used while designing the UI and as
 * a zero-setup preview (DATA_SOURCE=mock).
 */
import { shouldEscalate } from "../ai/escalation";
import { detectManipulation, type RequirementRef, type TranscriptTurn } from "../ai/scoring";
import { RUBRIC_VERSION } from "../constants";
import { toFileList } from "../files";
import { buildSeedEvaluation, STRONG_EVALUATION, WEAK_EVALUATION, type SeedEvaluation } from "../fixtures/seed-evaluations";
import { SEED_CHALLENGE } from "../fixtures/seed-challenge";
import { SEED_JD_SOURCE_URL } from "../fixtures/seed-jd";
import { SEED_PARSED_JD } from "../fixtures/seed-parsed";
import { SEED_REQUIREMENTS } from "../fixtures/seed-requirements";
import { SEED_RESEARCH } from "../fixtures/seed-research";
import { STRONG_SESSION, WEAK_SESSION, finalFilesOf, type SeedSession } from "../fixtures/seed-sessions";
import { effectiveScore } from "../services/effective-score";
import type {
  ChallengeView,
  DataSource,
  EvaluationView,
  HomeView,
  QueueItemView,
  RequirementView,
  TurnView,
  UserView,
  WorkspaceView,
} from "./types";

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;
const BOOT = Date.now();

export const MOCK_CHALLENGE_ID = "seed-challenge";

const users: UserView[] = [
  { id: "u-alex", name: "Alex Morgan", email: "alex.morgan@example.com", role: "CANDIDATE" },
  { id: "u-riley", name: "Riley Chen", email: "riley.chen@example.com", role: "CANDIDATE" },
  { id: "u-jordan", name: "Jordan Ellis", email: "jordan.ellis@example.com", role: "CANDIDATE" },
  { id: "u-casey", name: "Casey Rivera", email: "casey.rivera@example.com", role: "MENTOR" },
  { id: "u-robin", name: "Robin Patel", email: "robin.patel@example.com", role: "MENTOR" },
];

const requirements: RequirementView[] = SEED_REQUIREMENTS.map((r, i) => ({ id: `seed-req-${i}`, ...r }));
const refs: RequirementRef[] = requirements;

const challenge: ChallengeView = {
  id: MOCK_CHALLENGE_ID,
  title: SEED_CHALLENGE.title,
  brief: SEED_CHALLENGE.brief,
  domainContext: SEED_CHALLENGE.domainContext,
  timeboxMinutes: SEED_CHALLENGE.timeboxMinutes,
  rubricVersion: RUBRIC_VERSION,
  requirements,
  job: { ...SEED_PARSED_JD, sourceUrl: SEED_JD_SOURCE_URL },
  research: {
    whatTheyDo: SEED_RESEARCH.whatTheyDo,
    domainAndUsers: SEED_RESEARCH.domainAndUsers,
    technicalSignals: SEED_RESEARCH.technicalSignals,
    groundedInSearch: SEED_RESEARCH.groundedInSearch,
    sources: SEED_RESEARCH.sources.map((s) => ({ title: s.title, url: s.url })),
  },
  fromDemoCache: true,
};

interface MockSession {
  id: string;
  ownerId: string;
  seed: SeedSession | null;
  evaluation: { id: string; seed: SeedEvaluation } | null;
  startedAt: number;
}

const sessions: MockSession[] = [
  { id: "seed-session-strong", ownerId: "u-riley", seed: STRONG_SESSION, evaluation: { id: "seed-eval-strong", seed: STRONG_EVALUATION }, startedAt: BOOT - 3 * DAY },
  { id: "seed-session-weak", ownerId: "u-jordan", seed: WEAK_SESSION, evaluation: { id: "seed-eval-weak", seed: WEAK_EVALUATION }, startedAt: BOOT - 1 * DAY },
  // An empty, active session: opens the workspace on the starter template.
  { id: "seed-session-new", ownerId: "u-alex", seed: null, evaluation: null, startedAt: BOOT - 4 * MIN },
];

function turnViews(s: MockSession): TurnView[] {
  return (s.seed?.turns ?? []).map((t) => ({
    seq: t.seq,
    role: t.role,
    content: t.content,
    filesWritten: t.files ?? [],
    reasoning: t.reasoning ?? null,
    createdAt: new Date(s.startedAt + t.atMinute * MIN).toISOString(),
  }));
}

function filesOf(s: MockSession) {
  return s.seed ? finalFilesOf(s.seed) : { ...SEED_CHALLENGE.starterTemplate };
}

function buildEvaluation(s: MockSession): EvaluationView | null {
  if (!s.seed || !s.evaluation) return null;
  const turns: TranscriptTurn[] = s.seed.turns.map((t) => ({
    seq: t.seq,
    role: t.role,
    content: t.content,
    filesWritten: t.files ?? null,
    reasoning: t.reasoning ?? null,
  }));
  const files = filesOf(s);
  const result = buildSeedEvaluation(s.evaluation.seed, refs, turns, files);
  const decision = shouldEscalate({
    evaluation: result,
    requirements: refs,
    session: { durationMinutes: s.seed.durationMinutes, timeboxMinutes: challenge.timeboxMinutes },
    integrityFlags: detectManipulation(turns),
  });
  const byId = new Map(requirements.map((r) => [r.id, r]));
  return {
    id: s.evaluation.id,
    sessionId: s.id,
    ownerId: s.ownerId,
    createdAt: new Date(s.startedAt + (s.seed.durationMinutes + 1) * MIN).toISOString(),
    challenge: { id: challenge.id, title: challenge.title, timeboxMinutes: challenge.timeboxMinutes, rubricVersion: RUBRIC_VERSION },
    job: { roleTitle: challenge.job.roleTitle, employer: challenge.job.employer },
    source: "demo-cache",
    overallScore: result.overallScore,
    confidence: result.confidence,
    coverage: result.coverage,
    effective: effectiveScore({ overallScore: result.overallScore }, []),
    results: result.perRequirement.map((r) => ({ ...r, requirement: byId.get(r.requirementId)! })),
    strengths: result.strengths,
    gaps: result.gaps,
    needsHumanReview: decision.escalate,
    reviewStatus: decision.escalate ? "PENDING" : "NONE",
    contested: false,
    contestReason: null,
    escalation: decision.reasons,
    reviews: [],
    turns: turnViews(s),
    files: toFileList(files),
    durationMinutes: s.seed.durationMinutes,
  };
}

const findSession = (id: string) => sessions.find((s) => s.id === id) ?? null;

export const mockDataSource: DataSource = {
  kind: "mock",

  async listUsers() {
    return users;
  },
  async findUser(id) {
    return users.find((u) => u.id === id) ?? null;
  },
  async findUserByEmail(email) {
    const e = email.trim().toLowerCase();
    return users.find((u) => u.email.toLowerCase() === e) ?? null;
  },
  async createCandidate(email, name) {
    const e = email.trim().toLowerCase();
    const local = e.split("@")[0] ?? "candidate";
    const derived = local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p[0]!.toUpperCase() + p.slice(1))
      .join(" ");
    const u: UserView = { id: `u-${users.length + 1}`, name: name?.trim() || derived || "Candidate", email: e, role: "CANDIDATE" };
    users.push(u);
    return u;
  },

  async startSession(challengeId, userId) {
    if (challengeId !== challenge.id) throw new Error("Challenge not found.");
    const existing = sessions.find((s) => s.ownerId === userId && !s.evaluation && s.seed === null);
    if (existing) return existing.id;
    const id = `mock-session-${sessions.length + 1}`;
    sessions.push({ id, ownerId: userId, seed: null, evaluation: null, startedAt: Date.now() });
    return id;
  },

  async getHome(userId): Promise<HomeView> {
    return {
      example: {
        challengeId: challenge.id,
        roleTitle: challenge.job.roleTitle,
        employer: challenge.job.employer,
        domain: challenge.job.domain,
        skills: challenge.job.mustHaveSkills.slice(0, 4),
        barrierCount: challenge.job.barriers.length,
        sourceUrl: challenge.job.sourceUrl,
      },
      mySessions: sessions
        .filter((s) => s.ownerId === userId)
        .map((s) => ({
          sessionId: s.id,
          challengeTitle: challenge.title,
          roleTitle: challenge.job.roleTitle,
          status: s.evaluation ? "SUBMITTED" : "ACTIVE",
          startedAt: new Date(s.startedAt).toISOString(),
          evaluationId: s.evaluation?.id ?? null,
        })),
    };
  },

  async getChallenge(id) {
    return id === challenge.id ? challenge : null;
  },

  async getWorkspace(sessionId): Promise<WorkspaceView | null> {
    const s = findSession(sessionId);
    if (!s) return null;
    return {
      sessionId: s.id,
      ownerId: s.ownerId,
      status: s.evaluation ? "SUBMITTED" : "ACTIVE",
      startedAt: new Date(s.startedAt).toISOString(),
      challenge: {
        id: challenge.id,
        title: challenge.title,
        brief: challenge.brief,
        domainContext: challenge.domainContext,
        timeboxMinutes: challenge.timeboxMinutes,
        rubricVersion: challenge.rubricVersion,
        requirements,
      },
      starter: { ...SEED_CHALLENGE.starterTemplate },
      turns: turnViews(s),
      files: filesOf(s),
      evaluationId: s.evaluation?.id ?? null,
    };
  },

  async getEvaluation(id) {
    const s = sessions.find((x) => x.evaluation?.id === id);
    return s ? buildEvaluation(s) : null;
  },

  async getQueue(): Promise<QueueItemView[]> {
    return sessions
      .map(buildEvaluation)
      .filter((e): e is EvaluationView => !!e && e.reviewStatus === "PENDING")
      .map((e) => ({
        id: e.id,
        challengeTitle: e.challenge.title,
        roleTitle: e.job.roleTitle,
        createdAt: e.createdAt,
        overallScore: e.overallScore,
        coverage: e.coverage,
        confidence: e.confidence,
        contested: e.contested,
        source: e.source,
        escalation: e.escalation,
      }));
  },

  async countReviewed() {
    return 0;
  },
};
