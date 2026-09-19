/**
 * View models: the plain, serialisable shapes the UI renders.
 *
 * Pages and components depend only on these types and on the `data` facade
 * (./index.ts). They never see Prisma rows, so the storage behind them can
 * change (fixtures for design work, Postgres for real use) without touching UI.
 */
import type { EscalationReason } from "../ai/escalation";
import type { Barrier, RequirementCategory, RequirementResult } from "../ai/schemas";
import type { FileMap, FileWrite } from "../files";

export type Role = "CANDIDATE" | "MENTOR";

export interface UserView {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface RequirementView {
  id: string;
  category: RequirementCategory;
  statement: string;
  weight: number;
  successSignals: string[];
  failureModes: string[];
}

export interface JobView {
  roleTitle: string;
  seniority: string;
  employer: string;
  location: string | null;
  domain: string;
  teamContext: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  barriers: Barrier[];
  sourceUrl: string | null;
}

export interface ResearchView {
  whatTheyDo: string;
  domainAndUsers: string;
  technicalSignals: string[];
  groundedInSearch: boolean;
  sources: { title: string; url: string }[];
}

export interface ChallengeView {
  id: string;
  title: string;
  brief: string;
  domainContext: string;
  timeboxMinutes: number;
  rubricVersion: string;
  requirements: RequirementView[];
  job: JobView;
  research: ResearchView;
  /** True when served from DEMO_MODE fixtures rather than generated live. */
  fromDemoCache: boolean;
}

export interface TurnView {
  seq: number;
  role: "USER" | "ASSISTANT";
  content: string;
  filesWritten: FileWrite[];
  reasoning: string | null;
  createdAt: string;
}

export interface WorkspaceView {
  sessionId: string;
  ownerId: string;
  status: "ACTIVE" | "SUBMITTED";
  startedAt: string;
  challenge: Pick<ChallengeView, "id" | "title" | "brief" | "domainContext" | "timeboxMinutes" | "rubricVersion" | "requirements">;
  /** The starter template as generated (what the container first mounts). */
  starter: FileMap;
  turns: TurnView[];
  /** Starter plus every turn's writes: the project as it stands now. */
  files: FileMap;
  evaluationId: string | null;
}

export type ReviewStatus = "NONE" | "PENDING" | "REVIEWED";
export type EvaluationSource = "ai" | "demo-cache" | "demo-offline";

export interface MentorReviewView {
  id: string;
  verdict: "CONFIRM" | "OVERRIDE";
  comments: string;
  adjustedScore: number | null;
  reviewedAt: string;
}

export interface ResultView extends RequirementResult {
  requirement: RequirementView;
}

export interface EvaluationView {
  id: string;
  sessionId: string;
  ownerId: string;
  createdAt: string;
  challenge: { id: string; title: string; timeboxMinutes: number; rubricVersion: string };
  job: { roleTitle: string; employer: string };
  source: EvaluationSource;
  overallScore: number;
  confidence: number;
  coverage: number;
  /** The score that stands: the latest mentor review wins over the AI's. */
  effective: { score: number; basis: "ai" | "mentor-confirmed" | "mentor-override" };
  results: ResultView[];
  strengths: string[];
  gaps: string[];
  needsHumanReview: boolean;
  reviewStatus: ReviewStatus;
  contested: boolean;
  contestReason: string | null;
  /** Structured routing reasons (what a mentor is asked to look at). */
  escalation: EscalationReason[];
  reviews: MentorReviewView[];
  turns: TurnView[];
  files: FileWrite[];
  durationMinutes: number;
}

export interface QueueItemView {
  id: string;
  challengeTitle: string;
  roleTitle: string;
  createdAt: string;
  overallScore: number;
  coverage: number;
  confidence: number;
  contested: boolean;
  source: EvaluationSource;
  escalation: EscalationReason[];
}

export interface HomeView {
  example: {
    challengeId: string;
    roleTitle: string;
    employer: string;
    domain: string;
    skills: string[];
    barrierCount: number;
    sourceUrl: string | null;
  } | null;
  mySessions: {
    sessionId: string;
    challengeTitle: string;
    roleTitle: string;
    status: "ACTIVE" | "SUBMITTED";
    startedAt: string;
    evaluationId: string | null;
  }[];
}

export interface DataSource {
  readonly kind: "mock" | "db";
  listUsers(): Promise<UserView[]>;
  findUser(id: string): Promise<UserView | null>;
  findUserByEmail(email: string): Promise<UserView | null>;
  /** Sign-up: create a candidate account. */
  createCandidate(email: string, name?: string): Promise<UserView>;
  getHome(userId: string | null): Promise<HomeView>;
  getChallenge(id: string): Promise<ChallengeView | null>;
  /** Begin (or resume) a build session on a challenge; returns its id. */
  startSession(challengeId: string, userId: string): Promise<string>;
  getWorkspace(sessionId: string): Promise<WorkspaceView | null>;
  getEvaluation(id: string): Promise<EvaluationView | null>;
  getQueue(): Promise<QueueItemView[]>;
  countReviewed(): Promise<number>;
}
