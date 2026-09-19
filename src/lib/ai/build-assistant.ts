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
import { generateStructured } from "./client";
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
  challenge: ChallengeContext
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
  });
  return data;
}
