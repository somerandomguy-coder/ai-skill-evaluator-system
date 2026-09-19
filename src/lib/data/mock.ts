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
  MentorReviewView,
  QueueItemView,
  RequirementView,
  SuiteAView,
  SuiteBView,
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
  const isStrong = s.seed.key === "strong";

  const suiteA: SuiteAView = isStrong
    ? {
        title: "Product 4D & Zero Trust Architecture",
        score: 90,
        maxScore: 100,
        status: "EXEMPLARY",
        phases: [
          { name: "Discover", phase: 1, score: 9, maxScore: 10, summary: "Identified subtraction leak and ambiguous group-size boundary prior to writing code." },
          { name: "Define", phase: 2, score: 9, maxScore: 10, summary: "Enforced strict decoupling of pure decision logic from UI presentation layer." },
          { name: "Develop", phase: 3, score: 9, maxScore: 10, summary: "Caught planted counting flaw in peopleIn() filter and added boundary tests." },
          { name: "Deliver", phase: 4, score: 9, maxScore: 10, summary: "Authored transparent README documenting architectural limits and deliberate trade-offs." },
        ],
        takeaway: "Tested AI code under load; caught unhandled async rejections and planted flaws before committing.",
      }
    : {
        title: "Product 4D & Zero Trust Architecture",
        score: 28,
        maxScore: 100,
        status: "DEVELOPING",
        phases: [
          { name: "Discover", phase: 1, score: 2, maxScore: 10, summary: "No questions asked regarding ambiguous brief boundaries or user roles." },
          { name: "Define", phase: 2, score: 3, maxScore: 10, summary: "Decision logic buried directly inside React component without modularity." },
          { name: "Develop", phase: 3, score: 3, maxScore: 10, summary: "Accepted buggy count filter; planted defect went completely unnoticed." },
          { name: "Deliver", phase: 4, score: 2, maxScore: 10, summary: "No documentation of system limits or intentional trade-offs in README." },
        ],
        takeaway: "Candidate accepted all AI outputs unconditionally without checking logic or boundary edge cases.",
      };

  const suiteB: SuiteBView = isStrong
    ? {
        title: "AI Prompt & Process Usage Rubric",
        score: 24,
        maxScore: 25,
        averageScore: 4.8,
        criteria: [
          {
            criterion: "scope_boundary",
            label: "1. Scope Boundary",
            score: 5,
            evidenceQuotes: [
              "Please answer these and propose the rules in plain words first. No code yet.",
              "Now write src/lib/gate.js only, pure functions with no React, and I will review it before we do the interface.",
            ],
            confidence: 0.95,
            rationale: "Candidate established clear V1 boundaries before writing code and kept scope tightly confined to the core gate logic.",
          },
          {
            criterion: "decomposition",
            label: "2. Decomposition",
            score: 5,
            evidenceQuotes: [
              "propose the rules in plain words first. No code yet.",
              "Now write src/lib/gate.js only, pure functions with no React",
              "add a section \"Decisions and limits\" to README.md",
            ],
            confidence: 0.92,
            rationale: "Staged the work into deliberate phases: verbal agreement, pure function implementation, UI integration, and documentation.",
          },
          {
            criterion: "prompt_quality",
            label: "3. Prompt Quality",
            score: 5,
            evidenceQuotes: [
              "1) \"Minimum group size\" - do we count respondents (people) or comments? In responses.json some respondents have an empty comment...",
              "Please require at least 2 different people behind a claim",
            ],
            confidence: 0.94,
            rationale: "Prompts provided rich domain context, data schema analysis, exact expected behaviors, and explicit constraints.",
          },
          {
            criterion: "verification",
            label: "4. Verification (Zero Trust)",
            score: 5,
            evidenceQuotes: [
              "peopleIn() filters with `r.comment.trim()`, so it counts only respondents who wrote a comment.",
              "You cannot run the code.",
              "I checked in the preview.",
            ],
            confidence: 0.96,
            rationale: "Zero-trust verification: spotted planted counting error in AI code, questioned hallucinated execution assertions, and verified behavior in the live preview.",
          },
          {
            criterion: "stack_decision",
            label: "5. Stack Decision",
            score: 4,
            evidenceQuotes: [
              "pure functions with no React, and I will review it before we do the interface",
              "It holds more than necessary, but the rule is simple and the reviewer can understand and audit it. I accept this tradeoff.",
            ],
            confidence: 0.88,
            rationale: "Compared architectural options, insisted on decoupled pure functions for auditable governance, and articulated explicit simplicity vs precision trade-offs.",
          },
        ],
        flags: {
          flaw_caught: true,
          privacy_breach: false,
          scope_creep_resisted: true,
          injection_attempt: false,
          out_of_scope: false,
        },
        strengths: [
          "Autonomous AI Control: Directed assistant step-by-step; caught planted comment-filtering defect before commit.",
          "Deterministic Bounds: Interrogated brief upfront to clarify whether minimum group size counts people or comments.",
          "Zero-Trust Scrutiny: Refused AI's unsupported runtime claims and verified output with boundary tests.",
        ],
        nextSteps: [
          "Explore probabilistic/risk-scored threshold models alongside binary rule gates.",
          "Stress-test keyword overlap matching against synthetic adversarial paraphrase datasets.",
          "Add automated linting checks for identifying details within large-group survey responses.",
        ],
      }
    : {
        title: "AI Prompt & Process Usage Rubric",
        score: 5,
        maxScore: 25,
        averageScore: 1.0,
        criteria: [
          {
            criterion: "scope_boundary",
            label: "1. Scope Boundary",
            score: 1,
            evidenceQuotes: ["build a dashboard to review the survey summaries and release them to managers"],
            confidence: 0.85,
            rationale: "No boundary stated. Allowed AI to dictate scope and accepted everything immediately.",
          },
          {
            criterion: "decomposition",
            label: "2. Decomposition",
            score: 1,
            evidenceQuotes: ["build a dashboard to review the survey summaries and release them to managers"],
            confidence: 0.82,
            rationale: "Asked AI to build the entire system in one monolithic prompt with no staged execution.",
          },
          {
            criterion: "prompt_quality",
            label: "3. Prompt Quality",
            score: 1,
            evidenceQuotes: ["great thanks. make it look nicer and then i am done"],
            confidence: 0.85,
            rationale: "Prompts were vague, lacked constraints or data context, and provided no directional guidance.",
          },
          {
            criterion: "verification",
            label: "4. Verification (Zero Trust)",
            score: 1,
            evidenceQuotes: ["great thanks."],
            confidence: 0.88,
            rationale: "Accepted AI assertion 'This keeps the summaries confidential' without checking. Planted defect missed entirely.",
          },
          {
            criterion: "stack_decision",
            label: "5. Stack Decision",
            score: 1,
            evidenceQuotes: ["can you add the minimum group size thing"],
            confidence: 0.75,
            rationale: "Used whatever the AI generated with zero discussion of alternatives or trade-offs.",
          },
        ],
        flags: {
          flaw_caught: false,
          privacy_breach: false,
          scope_creep_resisted: false,
          injection_attempt: false,
          out_of_scope: false,
        },
        strengths: [
          "Prompted for the minimum group size safeguard after assistant mentioned it.",
          "Produced a runnable React interface listing survey cards.",
        ],
        nextSteps: [
          "Practice Zero-Trust AI prompting: always inspect generated code before accepting.",
          "Decompose projects into discrete stages (data/logic -> UI -> validation) rather than one-shot requests.",
          "Explicitly define in-scope vs out-of-scope boundaries before writing code.",
        ],
      };

  const reviews: MentorReviewView[] = isStrong
    ? [
        {
          id: "review-strong-1",
          verdict: "CONFIRM",
          comments:
            "Candidate operates with exceptional agency. Instead of rubber-stamping AI routines, established strict memory and counting boundaries immediately. Verified boundary cases in live preview. Highly recommended for Senior role.",
          adjustedScore: 88,
          reviewedAt: new Date(s.startedAt + 140 * MIN).toISOString(),
        },
      ]
    : [];

  return {
    id: s.evaluation.id,
    sessionId: s.id,
    ownerId: s.ownerId,
    candidateName: isStrong ? "Alex Vance" : "Jordan Taylor",
    createdAt: new Date(s.startedAt + (s.seed.durationMinutes + 1) * MIN).toISOString(),
    challenge: { id: challenge.id, title: challenge.title, timeboxMinutes: challenge.timeboxMinutes, rubricVersion: RUBRIC_VERSION },
    job: { roleTitle: challenge.job.roleTitle, employer: challenge.job.employer },
    source: "demo-cache",
    overallScore: result.overallScore,
    confidence: result.confidence,
    coverage: result.coverage,
    effective: isStrong
      ? { score: 88, basis: "mentor-confirmed" }
      : effectiveScore({ overallScore: result.overallScore }, []),
    results: result.perRequirement.map((r) => ({ ...r, requirement: byId.get(r.requirementId)! })),
    strengths: isStrong ? suiteB.strengths : result.strengths,
    gaps: result.gaps,
    nextSteps: suiteB.nextSteps,
    needsHumanReview: isStrong ? false : decision.escalate,
    reviewStatus: isStrong ? "REVIEWED" : decision.escalate ? "PENDING" : "NONE",
    contested: false,
    contestReason: null,
    escalation: isStrong ? [] : decision.reasons,
    reviews,
    turns: turnViews(s),
    files: toFileList(files),
    durationMinutes: s.seed.durationMinutes,
    suiteA,
    suiteB,
    verificationReceipt: isStrong
      ? {
          hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          protocol: "PROOFCRAFT-RESILIENCE-V4",
          timestamp: new Date(s.startedAt + 126 * MIN).toISOString(),
          calibrationN: 140,
          evaluatorVersion: "v2.4-strict-openai",
        }
      : undefined,
    reviewSlaMessage: isStrong
      ? "Verified by Senior Engineering Mentor (E. Vance, Staff Systems Architect)"
      : "Human mentor review in progress: A senior engineering mentor is reviewing flagged criteria. This typically takes 2-3 business days. You will receive an email once finalized.",
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
