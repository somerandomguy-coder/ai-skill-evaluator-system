/**
 * Build sessions: starting one, handling a chat turn, and submitting.
 *
 * Two integrity decisions worth knowing:
 *  - The SERVER owns the conversation and the file state. The client sends only
 *    its new message; history and current files are rebuilt from the database
 *    (starter template + every assistant turn's writes, in order). So the
 *    transcript and the final snapshot cannot be forged from the browser, and
 *    they are guaranteed to agree with each other.
 *  - The candidate's message is persisted BEFORE the model is called. If the
 *    model fails, the unedited prompt is still on record and the client can
 *    retry it without sending a duplicate.
 */
import type { ChatTurn, Prisma } from "@prisma/client";
import { buildAssistant, type ChatMessage } from "../ai/build-assistant";
import { prisma } from "../db";
import { applyWrites, sanitizeWrites, toFileList, type FileMap, type FileWrite } from "../files";
import { parseFileList, parseFileMap, toJson } from "../json";
import { guardPackageJson } from "../starter";
import { evaluateAndStore } from "./evaluations";
import { ServiceError } from "./errors";

export const MAX_MESSAGE_CHARS = 8_000;
export const MAX_TURNS = 200;

/** Starter template plus every turn's writes, in order. The same function rebuilds the final snapshot. */
export function reconstructFiles(starter: FileMap, turns: Pick<ChatTurn, "filesWritten">[]): FileMap {
  let files: FileMap = { ...starter };
  for (const t of turns) {
    const writes = parseFileList(t.filesWritten);
    if (writes.length) files = applyWrites(files, writes);
  }
  return files;
}

export async function startSession(challengeId: string, userId: string): Promise<string> {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { id: true } });
  if (!challenge) throw new ServiceError("Challenge not found.", 404);
  // Resume an unfinished session rather than stacking up duplicates.
  const existing = await prisma.buildSession.findFirst({
    where: { challengeId, userId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (existing) return existing.id;
  return (await prisma.buildSession.create({ data: { challengeId, userId }, select: { id: true } })).id;
}

async function loadOwned(sessionId: string, userId: string) {
  const session = await prisma.buildSession.findUnique({
    where: { id: sessionId },
    include: { challenge: true, turns: { orderBy: { seq: "asc" } }, snapshot: true },
  });
  if (!session) throw new ServiceError("Session not found.", 404);
  if (session.userId !== userId) throw new ServiceError("This is not your workspace.", 403);
  return session;
}

export interface TurnDto {
  seq: number;
  role: "USER" | "ASSISTANT";
  content: string;
  filesWritten: FileWrite[];
  createdAt: string;
}

export const toTurnDto = (t: ChatTurn): TurnDto => ({
  seq: t.seq,
  role: t.role,
  content: t.content,
  filesWritten: parseFileList(t.filesWritten),
  createdAt: t.createdAt.toISOString(),
});

/** Assistant turns carry a note of which files they wrote, so later turns know the project's history. */
function historyOf(turns: ChatTurn[]): ChatMessage[] {
  return turns.map((t) => {
    if (t.role === "USER") return { role: "user", content: t.content };
    const paths = parseFileList(t.filesWritten).map((f) => f.path);
    return { role: "assistant", content: paths.length ? `${t.content}\n\n[Files written: ${paths.join(", ")}]` : t.content };
  });
}

export interface SendResult {
  turns: TurnDto[];
  /** Sanitised writes to mount into the runtime (what was persisted). */
  writes: FileWrite[];
  /** Adjustments made to keep the environment bootable, shown to the candidate. */
  notes: string[];
}

export async function sendMessage(input: {
  sessionId: string;
  userId: string;
  message: string;
  retry?: boolean;
}): Promise<SendResult> {
  const session = await loadOwned(input.sessionId, input.userId);
  if (session.status !== "ACTIVE") throw new ServiceError("This session has already been submitted.", 409);
  if (session.turns.length >= MAX_TURNS) throw new ServiceError("This session has reached its message limit. Please submit.", 409);

  let turns = session.turns;
  const last = turns[turns.length - 1];
  let userTurn: ChatTurn;

  if (input.retry) {
    if (!last || last.role !== "USER") throw new ServiceError("There is no unanswered message to retry.", 409);
    userTurn = last;
  } else {
    if (last?.role === "USER") throw new ServiceError("Your previous message has not been answered yet. Retry it first.", 409);
    const text = input.message.trim();
    if (!text) throw new ServiceError("Write a message first.");
    if (text.length > MAX_MESSAGE_CHARS) throw new ServiceError(`Please keep messages under ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`);
    try {
      userTurn = await prisma.chatTurn.create({
        data: { buildSessionId: session.id, seq: (last?.seq ?? 0) + 1, role: "USER", content: text },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === "P2002") {
        throw new ServiceError("Another message is already being processed.", 409);
      }
      throw err;
    }
    turns = [...turns, userTurn];
  }

  const files = reconstructFiles(parseFileMap(session.challenge.starterTemplate), turns);
  const reply = await buildAssistant(historyOf(turns), files, {
    title: session.challenge.title,
    brief: session.challenge.brief,
    domainContext: session.challenge.domainContext,
    timeboxMinutes: session.challenge.timeboxMinutes,
  });

  // Whatever the model returned is checked before it is persisted: what we store is exactly what runs.
  const { valid, rejected } = sanitizeWrites(reply.files, files);
  const notes = rejected.map((r) => `Skipped ${r.path || "(no path)"}: ${r.reason}.`);
  let writes = valid;
  const pkg = writes.find((w) => w.path === "package.json");
  if (pkg) {
    const guarded = guardPackageJson(pkg.contents, files["package.json"] ?? "");
    notes.push(...guarded.notes);
    writes = guarded.accepted
      ? writes.map((w) => (w.path === "package.json" ? { ...w, contents: guarded.contents } : w))
      : writes.filter((w) => w.path !== "package.json");
  }

  const assistantTurn = await prisma.chatTurn.create({
    data: {
      buildSessionId: session.id,
      seq: userTurn.seq + 1,
      role: "ASSISTANT",
      content: reply.message,
      filesWritten: toJson(writes),
      reasoning: reply.reasoning || null,
    },
  });

  return { turns: [toTurnDto(userTurn), toTurnDto(assistantTurn)], writes, notes };
}

/**
 * Submit: snapshot the file tree, then evaluate. Safe to call again: a session
 * that was submitted but whose evaluation failed is evaluated on the retry, and a
 * finished one just returns its evaluation.
 */
export async function submitSession(sessionId: string, userId: string): Promise<string> {
  const session = await loadOwned(sessionId, userId);

  if (session.status === "ACTIVE") {
    if (!session.turns.some((t) => t.role === "USER")) {
      throw new ServiceError("Send at least one message to the assistant before submitting.");
    }
    const files = reconstructFiles(parseFileMap(session.challenge.starterTemplate), session.turns);
    try {
      await prisma.$transaction([
        prisma.buildSession.update({ where: { id: session.id }, data: { status: "SUBMITTED", submittedAt: new Date() } }),
        prisma.fileSnapshot.create({ data: { buildSessionId: session.id, tree: toJson(toFileList(files)) } }),
      ]);
    } catch (err) {
      // A concurrent submit already took the snapshot: carry on to the evaluation.
      if ((err as Prisma.PrismaClientKnownRequestError).code !== "P2002") throw err;
    }
  }

  const existing = await prisma.evaluation.findUnique({ where: { buildSessionId: sessionId }, select: { id: true } });
  if (existing) return existing.id;
  try {
    return (await evaluateAndStore(sessionId)).id;
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError).code === "P2002") {
      const again = await prisma.evaluation.findUnique({ where: { buildSessionId: sessionId }, select: { id: true } });
      if (again) return again.id;
    }
    throw err;
  }
}
