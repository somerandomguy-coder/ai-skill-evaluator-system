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
import { ASSISTANT_SYSTEM, getAssistantSystemPrompt } from "./prompts/assistant";
import { AssistantTurnSchema, type AssistantTurn } from "./schemas";

import { routeMessageTier, type MessageTier } from "./message-router";

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

export function buildSystemPrompt(challenge: ChallengeContext, tier: MessageTier = "CODE"): string {
  const tierPrompt =
    tier === "ASK"
      ? `\n\n<execution_mode tier="ASK">
CRITICAL INSTRUCTION - CLARIFICATION MODE (CONVERSATIONAL / ASK TIER):
- The candidate is asking a clarifying, conceptual, domain, or architectural question.
- Your answer must be VERY SHORT, concise, and directly targeted to their specific question (around 2 to 4 sentences or concise bullet points).
- Do NOT generate code implementations or write to files: the "files" array in your JSON response MUST be empty ([]).
- Answer only what was asked without volunteering unsolicited full implementations.
</execution_mode>`
      : `\n\n<execution_mode tier="CODE">
CRITICAL INSTRUCTION - CODING MODE (IMPLEMENTATION TIER):
- The candidate wants code written, debugged, refactored, or implemented.
- Explain your approach and architectural decisions, then output complete whole-file implementations in the "files" array.
</execution_mode>`;

  const skillInstruction = `\n\n<active_skill_instruction>
ACTIVE SKILL / PERSONA DIRECTIVE:
If the user's message contains an <active_skill> block (e.g. grill-me, prototype, audit, or custom), you MUST strictly adopt that persona and prioritize all of its constraints above default behavior.
For example:
- In grill-me mode: STRICTLY REFUSE to generate code implementations or file writes; ask 1 or 2 targeted, probing questions to interrogate architectural assumptions, failure modes, and invariants.
- In prototype mode: Focus on the simplest working vertical slice with immediate visual feedback.
- In audit mode: Interrogate code for boundary underflow, IEEE-754 float drift, PII leaks, and swallowed errors.
</active_skill_instruction>`;

  return `${getAssistantSystemPrompt(challenge)}${tierPrompt}${skillInstruction}

<challenge title="${challenge.title}" timebox_minutes="${challenge.timeboxMinutes}">
${challenge.domainContext}

${challenge.brief}
</challenge>`;
}

function getSkillAwareDemoTurn(content: string): AssistantTurn | null {
  if (/<active_skill name="grill-me"/i.test(content) || /(?:^|\s)\/grill-me(?=\s|$)/i.test(content)) {
    return {
      message: "Architectural Socratic Review (/grill-me):\n\nBefore writing code, let's interrogate your design boundaries:\n\n1. How does your state model ensure idempotency when an event is replayed or retried over the network?\n2. What data structure guarantees sub-linear query efficiency rather than an O(N²) nested scan under load?\n\nWalk me through your boundary validation and error handling invariants before we move to code.",
      files: [],
      reasoning: "Grill-Me mode active: Halting code generation. Interrogating candidate on state idempotency and algorithmic efficiency invariants.",
    };
  }

  if (/<active_skill name="audit"/i.test(content) || /(?:^|\s)\/audit(?=\s|$)/i.test(content)) {
    return {
      message: "Zero-Trust Invariant Audit (/audit):\n\nInspecting workspace files against statutory and resilience rules:\n\n• Statutory Currency: Verify that all calculations operate in integer cents ($19.99 = 1999) to eliminate IEEE-754 float drift.\n• Boundary Bounds: Confirm array and capacity checks guard against negative underflow (< 0).\n• Data Hygiene: Ensure customer identifiers and bearer tokens are masked before logging.\n\nWhich of these boundaries needs immediate remediation in your implementation?",
      files: [],
      reasoning: "Audit mode active: Emitting zero-trust security and statutory invariance checklist.",
    };
  }

  if (/<active_skill name="rubber-duck"/i.test(content) || /(?:^|\s)\/rubber-duck(?=\s|$)/i.test(content)) {
    return {
      message: "Rubber Duck Debugging (/rubber-duck):\n\nLet's trace the logic together step by step.\n\n1. What was the exact input passed to the failing function?\n2. What value did you expect it to return versus what it actually returned?\n3. Which specific line of code first makes an assumption that might be false?",
      files: [],
      reasoning: "Rubber Duck mode active: Guiding candidate to isolate logic flaw through Socratic questions.",
    };
  }

  return null;
}

export async function buildAssistant(
  history: ChatMessage[],
  files: FileMap,
  challenge: ChallengeContext,
  traceContext?: TraceContext,
  tierOverride?: MessageTier
): Promise<AssistantTurn> {
  const last = history[history.length - 1];
  if (!last || last.role !== "user") throw new Error("buildAssistant needs a final user message to answer.");

  const tier = tierOverride ?? routeMessageTier(last.content);

  if (isDemoMode()) {
    const skillDemo = getSkillAwareDemoTurn(last.content);
    if (skillDemo) return skillDemo;

    const turn = demoAssistantTurn(history.filter((m) => m.role === "assistant").length);
    if (tier === "ASK") {
      turn.files = [];
    }
    return turn;
  }

  // Earlier turns stay as-is (stable, cache-friendly); the current file state rides on the last user message.
  const messages = history.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: "user", content: `${renderProjectFiles(files)}\n\n${last.content}` });

  const { data } = await generateStructured({
    stage: "assistant",
    system: buildSystemPrompt(challenge, tier),
    messages,
    schema: AssistantTurnSchema,
    maxTokens: tier === "ASK" ? 4_000 : 32_000,
    effort: "medium",
    traceContext,
  });
  if (tier === "ASK") {
    data.files = [];
  }
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
  traceContext?: TraceContext,
  tierOverride?: MessageTier
): Promise<AssistantTurn> {
  const last = history[history.length - 1];
  if (!last || last.role !== "user") throw new Error("buildAssistant needs a final user message to answer.");

  const tier = tierOverride ?? routeMessageTier(last.content);

  if (isDemoMode()) {
    const skillDemo = getSkillAwareDemoTurn(last.content);
    const turn = skillDemo ?? demoAssistantTurn(history.filter((m) => m.role === "assistant").length);
    if (tier === "ASK") {
      turn.files = [];
    }
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
    system: buildSystemPrompt(challenge, tier),
    messages,
    schema: AssistantTurnSchema,
    maxTokens: tier === "ASK" ? 4_000 : 32_000,
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
      if (!statusEmitted && accumulatedJson.includes('"files"') && tier === "CODE") {
        statusEmitted = true;
        onEvent({ type: "status", message: "Generating project files..." });
      }
    },
  });

  if (tier === "ASK") {
    data.files = [];
  }

  return data;
}

