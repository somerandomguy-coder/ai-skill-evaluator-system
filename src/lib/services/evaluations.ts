/**
 * Evaluation persistence, escalation, contest and mentor review.
 *
 * The mentor queue is an explicit state machine on Evaluation.reviewStatus:
 *   NONE ──(escalated by rules / contested by candidate)──> PENDING
 *   PENDING ──(mentor confirms or overrides)──> REVIEWED
 *   REVIEWED ──(candidate contests again)──> PENDING
 */
import type { Evaluation, MentorReview, Prisma } from "@prisma/client";
import { isDemoMode } from "../env";
import { detectManipulation, type RequirementRef, type TranscriptTurn } from "../ai/scoring";
import { evaluateSubmission } from "../ai/evaluate-submission";
import { shouldEscalate } from "../ai/escalation";
import type { EvaluationResult } from "../ai/schemas";
import { prisma } from "../db";
import { sortRequirements, toTurnView } from "../data/mappers";
import { fromFileList } from "../files";
import { parseFileList, parseRequirementResults, toJson } from "../json";
import { ServiceError } from "./errors";
import { trackEvent } from "../ai/langfuse";
import { DEMO_USERS } from "../data/demo-users";
import { buildCognitiveSuites } from "./cognitive-rubric";
import { generateDeterministicAcademicReport } from "../engine/evaluator";
import type { GroundedAssessmentReport } from "../types/assessment-academic";
import type { TurnView } from "../data/types";

export { effectiveScore, type EffectiveScore } from "./effective-score";

export interface EvaluationRowInput {
  buildSessionId: string;
  rubricVersion: string;
  result: EvaluationResult;
  requirements: RequirementRef[];
  turns: TranscriptTurn[];
  session: { durationMinutes: number; timeboxMinutes: number };
  source: "ai" | "demo-offline" | "demo-cache";
  academicReport?: GroundedAssessmentReport | null;
  challengeTitle?: string;
  sfiaLevel?: number;
  files?: Record<string, string>;
}

/** Pure: everything that goes into an Evaluation row, including the deterministic routing decision and immutable envelope. */
export function buildEvaluationData(i: EvaluationRowInput): Prisma.EvaluationUncheckedCreateInput {
  const turnViews: TurnView[] = i.turns.map((t, idx) => ({
    seq: t.seq ?? idx + 1,
    role: (t.role === "ASSISTANT" ? "ASSISTANT" : "USER") as "USER" | "ASSISTANT",
    content: t.content,
    filesWritten: t.filesWritten ?? [],
    reasoning: t.reasoning ?? null,
    createdAt: new Date().toISOString(),
  }));
  const challengeLevel = (i.sfiaLevel as 2 | 3) ?? 3;

  const academicReport =
    i.academicReport !== undefined
      ? i.academicReport
      : generateDeterministicAcademicReport(
          {
            sessionId: i.buildSessionId,
            challengeTitle: i.challengeTitle ?? "Technical Assessment",
            turns: turnViews,
            finalScore: i.result.overallScore,
          },
          challengeLevel
        );

  const cognitive = buildCognitiveSuites({
    sessionId: i.buildSessionId,
    challengeTitle: i.challengeTitle ?? "Technical Assessment",
    overallScore: i.result.overallScore,
    turns: turnViews,
    files: i.files,
    academicReport,
    sfiaLevel: challengeLevel,
  });

  const decision = shouldEscalate({
    evaluation: i.result,
    requirements: i.requirements,
    session: i.session,
    integrityFlags: detectManipulation(i.turns),
    noAiEvaluation: i.source === "demo-offline",
    academicReport,
  });

  const assessmentEnvelope = {
    version: 1,
    createdAt: new Date().toISOString(),
    challengeLevel,
    origin: i.source === "ai" ? "model" : (i.source === "demo-offline" ? "demo-offline" : "deterministic"),
    primaryResults: i.result.perRequirement,
    overallScore: i.result.overallScore,
    confidence: i.result.confidence,
    coverage: i.result.coverage,
    academicReport,
    cognitiveSuites: {
      suiteA: cognitive.suiteA,
      suiteB: cognitive.suiteB,
      ztAiedAudit: cognitive.ztAiedAudit,
      verificationReceipt: cognitive.verificationReceipt,
    },
    escalationReasons: decision.reasons,
    needsHumanReview: decision.escalate,
    privacyChecked: false,
    fairnessChecked: false,
  };

  return {
    buildSessionId: i.buildSessionId,
    overallScore: i.result.overallScore,
    confidence: i.result.confidence,
    perRequirement: toJson(i.result.perRequirement),
    strengths: i.result.strengths,
    gaps: i.result.gaps,
    needsHumanReview: decision.escalate,
    escalationReason: decision.summary,
    escalationDetail: toJson(decision.reasons),
    rubricVersion: i.rubricVersion,
    reviewStatus: decision.escalate ? "PENDING" : "NONE",
    source: i.source,
    assessmentEnvelope: toJson(assessmentEnvelope),
  };
}

/** Load a submitted session, evaluate it, route it, and store the result. */
export async function evaluateAndStore(sessionId: string): Promise<Evaluation> {
  const session = await prisma.buildSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      turns: { orderBy: { seq: "asc" } },
      snapshot: true,
      challenge: { include: { requirements: true } },
    },
  });
  if (!session.snapshot) throw new ServiceError("This session has not been submitted yet.", 409);

  const files = fromFileList(parseFileList(session.snapshot.tree));
  const requirements: RequirementRef[] = sortRequirements(session.challenge.requirements).map((r) => ({
    id: r.id,
    category: r.category as RequirementRef["category"],
    statement: r.statement,
    weight: r.weight,
    successSignals: r.successSignals,
    failureModes: r.failureModes,
  }));
  // Row D06: Frozen transcript cutoff. Exclude any late turns appended after submission.
  const cutoffTime = session.submittedAt ?? session.snapshot?.capturedAt;
  const eligibleTurns = cutoffTime
    ? session.turns.filter((t) => !t.createdAt || t.createdAt <= cutoffTime)
    : session.turns;

  const turns: TranscriptTurn[] = eligibleTurns.map((t) => ({
    seq: t.seq,
    role: t.role,
    content: t.content,
    filesWritten: parseFileList(t.filesWritten),
    reasoning: t.reasoning,
  }));

  const result = await evaluateSubmission(turns, files, requirements, {
    rubricVersion: session.challenge.rubricVersion,
    traceContext: {
      sessionId,
      userId: session.userId,
      tags: ["evaluation"],
      metadata: { challengeTitle: session.challenge.title },
    },
  });

  const end = session.submittedAt ?? new Date();
  const challengeMeta = session.challenge.meta && typeof session.challenge.meta === "object"
    ? session.challenge.meta as Record<string, unknown>
    : {};
  const storedSfiaLevel = (challengeMeta.sfiaProfile as { level?: unknown } | undefined)?.level;
  const challengeLevel = storedSfiaLevel === 2 ? 2 : 3;
  const data = buildEvaluationData({
    buildSessionId: sessionId,
    rubricVersion: session.challenge.rubricVersion,
    result,
    requirements,
    turns,
    session: { durationMinutes: (end.getTime() - session.startedAt.getTime()) / 60_000, timeboxMinutes: session.challenge.timeboxMinutes },
    source: isDemoMode() ? "demo-offline" : "ai",
    challengeTitle: session.challenge.title,
    sfiaLevel: challengeLevel,
    files,
  });
  return prisma.evaluation.create({ data });
}

// --- candidate: contest ----------------------------------------------------

export async function contestEvaluation(evaluationId: string, userId: string, reason: string): Promise<void> {
  const text = reason.trim();
  if (text.length < 10) throw new ServiceError("Please say what you think was scored wrongly (at least a sentence).");
  if (text.length > 2000) throw new ServiceError("Please keep the reason under 2000 characters.");

  const ev = await prisma.evaluation.findUnique({ where: { id: evaluationId }, include: { buildSession: true } });
  if (!ev) throw new ServiceError("Evaluation not found.", 404);
  if (ev.buildSession.userId !== userId) throw new ServiceError("Only the candidate can contest this score.", 403);

  // The rule-based escalationReason is left as it was; the contest has its own
  // columns and the queue/mentor pages show both.
  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      contested: true,
      contestReason: text,
      contestedAt: new Date(),
      needsHumanReview: true,
      reviewStatus: "PENDING",
    },
  });

  trackEvent("evaluation_contested", {
    sessionId: ev.buildSessionId,
    userId,
    metadata: { reason: text },
  });
}

// --- mentor ----------------------------------------------------------------

export interface MentorReviewInput {
  evaluationId: string;
  mentorId: string;
  verdict: "CONFIRM" | "OVERRIDE";
  comments: string;
  adjustedScore?: number | null;
}

export async function submitMentorReview(i: MentorReviewInput): Promise<MentorReview> {
  const comments = i.comments.trim();
  if (comments.length < 10) throw new ServiceError("Please explain your decision (at least a sentence) — the candidate will see it.");
  if (comments.length > 4000) throw new ServiceError("Please keep the comments under 4000 characters.");

  const ev = await prisma.evaluation.findUnique({ where: { id: i.evaluationId } });
  if (!ev) throw new ServiceError("Evaluation not found.", 404);

  // With no AI scores at all (offline demo), there is nothing to confirm: the mentor must score it.
  const hasAiScore = parseRequirementResults(ev.perRequirement).some((r) => r.score !== null);
  if (i.verdict === "CONFIRM" && !hasAiScore) {
    throw new ServiceError("This evaluation has no AI scores to confirm. Override it with your own score.");
  }
  let adjustedScore: number | null = null;
  if (i.verdict === "OVERRIDE") {
    const n = i.adjustedScore;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 100) {
      throw new ServiceError("An override needs a score between 0 and 100.");
    }
    adjustedScore = Math.round(n * 10) / 10;
  }

  // Ensure the mentor user exists in the database and has MENTOR role
  let mentorDbId = i.mentorId;
  const existingMentor = await prisma.user.findUnique({ where: { id: i.mentorId } });
  if (existingMentor) {
    if (existingMentor.role !== "MENTOR") {
      throw new ServiceError("User does not have mentor authority.", 403);
    }
  } else {
    // In demo mode only, map known demo mentor accounts
    if (isDemoMode()) {
      const demo = DEMO_USERS.find((u) => u.id === i.mentorId && u.role === "MENTOR");
      if (demo) {
        const userWithEmail = await prisma.user.findUnique({ where: { email: demo.email } });
        if (userWithEmail) {
          mentorDbId = userWithEmail.id;
        } else {
          const created = await prisma.user.create({
            data: { id: demo.id, email: demo.email, name: demo.name, role: "MENTOR" },
          });
          mentorDbId = created.id;
        }
      } else {
        throw new ServiceError("Mentor user not found in demo environment.", 403);
      }
    } else {
      throw new ServiceError("Mentor user not found or unauthorized.", 403);
    }
  }

  const [review] = await prisma.$transaction([
    prisma.mentorReview.create({
      data: { evaluationId: i.evaluationId, mentorId: mentorDbId, verdict: i.verdict, comments, adjustedScore },
    }),
    prisma.evaluation.update({ where: { id: i.evaluationId }, data: { reviewStatus: "REVIEWED" } }),
  ]);

  trackEvent("mentor_review_submitted", {
    sessionId: ev.buildSessionId,
    userId: i.mentorId,
    metadata: { verdict: i.verdict, adjustedScore, evaluationId: i.evaluationId },
  });

  return review;
}

// --- reading ---------------------------------------------------------------

export async function getQueue() {
  const rows = await prisma.evaluation.findMany({
    where: { reviewStatus: "PENDING" },
    include: { buildSession: { include: { challenge: { select: { title: true, timeboxMinutes: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  // Contested submissions first: a candidate is waiting on a human.
  return rows.sort((a, b) => Number(b.contested) - Number(a.contested));
}

export async function getReviewedCount(): Promise<number> {
  return prisma.evaluation.count({ where: { reviewStatus: "REVIEWED" } });
}
