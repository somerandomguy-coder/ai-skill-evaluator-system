/**
 * buildAssistant(history, files, challenge)
 *
 * The in-workspace coding assistant. Structured output:
 *   { message, files: [{ path, contents }], reasoning }
 * Whole-file rewrites per turn: token-heavy but reliable, and there is no
 * server-side tool loop touching a browser filesystem.
 *
 * It is deliberately a normal, capable assistant. The signal being assessed is
 * how the candidate directs a competent tool — not whether they notice sabotage.
 *
 * It sees the brief exactly as the candidate does. It never sees the generator's
 * internal notes (valid approaches, deliberate ambiguities): if it did, it would
 * volunteer the very questions the candidate is supposed to ask.
 */
import type { FileMap } from "../files";
import { isDemoMode } from "../env";
import { generateStructured, type TraceContext } from "./client";
import { demoAssistantTurn } from "./demo";
import { ASSISTANT_SYSTEM } from "./prompts/assistant";
import { AssistantTurnSchema, type AssistantTurn } from "./schemas";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChallengeContext {
  title: string;
  brief: string;
  domainContext: string;
  timeboxMinutes: number;
}

const MAX_FILE_CHARS = 20_000;
const MAX_TOTAL_FILE_CHARS = 120_000;
const SKIP = new Set(["package-lock.json"]);

export function renderProjectFiles(files: FileMap): string {
  let budget = MAX_TOTAL_FILE_CHARS;
  const blocks: string[] = [];
  for (const path of Object.keys(files).sort()) {
    if (SKIP.has(path)) continue;
    const contents = files[path];
    const body = contents.length > MAX_FILE_CHARS ? `${contents.slice(0, MAX_FILE_CHARS)}\n…[file truncated for length]` : contents;
    if (budget - body.length < 0) {
      blocks.push(`=== ${path} === (omitted: project too large to include in full)`);
      continue;
    }
    budget -= body.length;
    blocks.push(`=== ${path} ===\n${body}`);
  }
  return `<project_files>\n${blocks.join("\n\n")}\n</project_files>`;
}

export function buildSystemPrompt(challenge: ChallengeContext): string {
  return `${ASSISTANT_SYSTEM}

<challenge title="${challenge.title}" timebox_minutes="${challenge.timeboxMinutes}">
${challenge.domainContext}

${challenge.brief}
</challenge>`;
}

export async function buildAssistant(
  history: ChatMessage[],
  files: FileMap,
  challenge: ChallengeContext,
  traceContext?: TraceContext
): Promise<AssistantTurn> {
  const last = history[history.length - 1];
  if (!last || last.role !== "user") throw new Error("buildAssistant needs a final user message to answer.");

  if (isDemoMode()) {
    return demoAssistantTurn(history.filter((m) => m.role === "assistant").length);
  }

  // Earlier turns stay as-is (stable, cache-friendly); the current file state rides on the last user message.
  const messages = history.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: "user", content: `${renderProjectFiles(files)}\n\n${last.content}` });

  const { data } = await generateStructured({
    stage: "assistant",
    system: buildSystemPrompt(challenge),
    messages,
    schema: AssistantTurnSchema,
    maxTokens: 32_000,
    effort: "medium",
    traceContext,
  });
  return data;
}

export function extractStreamingMessage(rawJson: string): string {
  const match = rawJson.match(/"message"\s*:\s*"/);
  if (!match || match.index === undefined) {
    if (!rawJson.trim().startsWith("{")) return rawJson;
    return "";
  }
  const startIndex = match.index + match[0].length;
  let result = "";
  let escaped = false;
  for (let i = startIndex; i < rawJson.length; i++) {
    const char = rawJson[i];
    if (escaped) {
      if (char === "n") result += "\n";
      else if (char === "r") result += "\r";
      else if (char === "t") result += "\t";
      else if (char === '"') result += '"';
      else if (char === "\\") result += "\\";
      else result += char;
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      break;
    } else {
      result += char;
    }
  }
  return result;
}

export type AssistantStreamEvent =
  | { type: "token"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "status"; message: string };

export async function buildAssistantStream(
  history: ChatMessage[],
  files: FileMap,
  challenge: ChallengeContext,
  onEvent: (event: AssistantStreamEvent) => void,
  traceContext?: TraceContext
): Promise<AssistantTurn> {
  const last = history[history.length - 1];
  if (!last || last.role !== "user") throw new Error("buildAssistant needs a final user message to answer.");

  if (isDemoMode()) {
    const turn = demoAssistantTurn(history.filter((m) => m.role === "assistant").length);
    const words = turn.message.split(" ");
    for (let i = 0; i < words.length; i++) {
      onEvent({ type: "token", delta: (i === 0 ? "" : " ") + words[i] });
      await new Promise((r) => setTimeout(r, 20));
    }
    if (turn.files.length) {
      onEvent({ type: "status", message: "Updating project files..." });
    }
    return turn;
  }

  const messages = history.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: "user", content: `${renderProjectFiles(files)}\n\n${last.content}` });

  let accumulatedJson = "";
  let lastEmittedLength = 0;
  let statusEmitted = false;

  const { data } = await generateStructured({
    stage: "assistant",
    system: buildSystemPrompt(challenge),
    messages,
    schema: AssistantTurnSchema,
    maxTokens: 32_000,
    effort: "medium",
    traceContext,
    onReasoning: (chunk) => {
      onEvent({ type: "reasoning", delta: chunk });
    },
    onToken: (chunk) => {
      accumulatedJson += chunk;
      const currentMessage = extractStreamingMessage(accumulatedJson);
      if (currentMessage.length > lastEmittedLength) {
        const delta = currentMessage.slice(lastEmittedLength);
        lastEmittedLength = currentMessage.length;
        onEvent({ type: "token", delta });
      }
      if (!statusEmitted && accumulatedJson.includes('"files"')) {
        statusEmitted = true;
        onEvent({ type: "status", message: "Generating project files..." });
      }
    },
  });

  return data;
}

