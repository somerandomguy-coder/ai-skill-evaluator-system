/**
 * The only module that talks to the model API (OpenAI). Server-side only.
 *
 * Every pipeline function funnels through `generateStructured`, which:
 *  - refuses to run in DEMO_MODE (demo paths must be served from fixtures
 *    *before* reaching here — this is the backstop that guarantees zero live calls);
 *  - asks for a Zod-validated structured output (Chat Completions `parse` with
 *    a strict JSON schema), so nothing downstream parses free text;
 *  - retries once, telling the model what failed validation;
 *  - only sends `reasoning_effort` to reasoning models, so overriding a stage to
 *    a non-reasoning model (e.g. gpt-4.1) cannot produce a 400.
 */
import OpenAI from "openai";
import { ContentFilterFinishReasonError, LengthFinishReasonError } from "openai/core/error";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { aiApiKey, aiBaseUrl, aiProvider, isDemoMode, modelFor, openaiApiKey, type AiStage } from "../env";
import { flushLangfuse, observeOpenAiClient } from "./langfuse";

export class AiError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class DemoModeError extends AiError {
  constructor(stage: string) {
    super(`Live AI calls are disabled in DEMO_MODE (stage: ${stage}).`, "demo_mode");
  }
}
export class MissingApiKeyError extends AiError {
  constructor() {
    super("OPENAI_API_KEY (or DEEPSEEK_API_KEY) is not set. Add it to .env, or set DEMO_MODE=true to use cached responses.", "no_api_key");
  }
}
export class ModelRefusalError extends AiError {}
export class TruncatedOutputError extends AiError {}
export class InvalidOutputError extends AiError {}
export class AiUnavailableError extends AiError {}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TraceContext {
  sessionId?: string;
  userId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface StructuredRequest<T> {
  stage: AiStage;
  system: string;
  messages: ChatMessage[];
  schema: z.ZodType<T>;
  maxTokens: number;
  effort?: Effort;
  traceContext?: TraceContext;
}


export interface StructuredResult<T> {
  data: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

/** Reasoning models accept `reasoning_effort`; chat/non-reasoning models reject it. */
export function supportsReasoningEffort(model: string): boolean {
  if (aiProvider() === "deepseek") return false;
  if (/deepseek/i.test(model)) return false;
  return /^(gpt-5|gpt-6|o1|o3|o4)/.test(model) && !/-chat-latest$/.test(model);
}

/** DeepSeek and some OpenAI-compatible endpoints do not support `type: "json_schema"`. */
export function isJsonSchemaSupported(model: string): boolean {
  if (aiProvider() === "deepseek") return false;
  if (/deepseek/i.test(model)) return false;
  return true;
}

/** Safely extract a JSON substring from raw text or markdown fences. */
export function extractJsonFromText(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    if (lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }
  return trimmed;
}

function getJsonSchemaPrompt(schema: z.ZodType<unknown>, name: string): string {
  try {
    const format = zodResponseFormat(schema, name);
    const schemaObj = (format as { json_schema?: { schema?: unknown } })?.json_schema?.schema;
    if (schemaObj) {
      return JSON.stringify(schemaObj, null, 2);
    }
  } catch {
    // Graceful fallback if zodResponseFormat fails
  }
  return "";
}

/** low/medium/high are accepted by every reasoning model; the higher tiers are not universal. */
function toReasoningEffort(effort: Effort | undefined): "low" | "medium" | "high" {
  if (effort === "low" || effort === "medium") return effort;
  return "high";
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = aiApiKey();
  if (!apiKey) throw new MissingApiKeyError();
  const baseURL = aiBaseUrl();
  client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return client;
}

/** Test seam: inject a fake client. Pass null to reset. */
export function setAiClientForTests(fake: OpenAI | null) {
  client = fake;
}

/** Turn SDK errors into messages that are safe to show a user. Most specific first. */
export function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof OpenAI.AuthenticationError) {
    return new AiUnavailableError("The OpenAI API key was rejected. Check OPENAI_API_KEY.", "auth");
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new AiUnavailableError("The AI service is rate-limiting requests (or the account is out of quota). Wait a moment and retry.", "rate_limit");
  }
  if (err instanceof OpenAI.BadRequestError) {
    return new AiUnavailableError(`The AI service rejected the request: ${err.message}`, "bad_request");
  }
  if (err instanceof OpenAI.APIError) {
    return new AiUnavailableError(`The AI service returned an error (HTTP ${err.status ?? "?"}).`, "api");
  }
  return new AiUnavailableError(err instanceof Error ? err.message : "Unknown AI error.", "unknown");
}

/**
 * True when the model answered but its output failed our schema (bad JSON, or a
 * Zod issue including our semantic rules). Matched by name so it holds across
 * the several zod module copies the SDK may load.
 */
function validationIssue(err: unknown): string | null {
  if (!(err instanceof Error) || err instanceof OpenAI.APIError) return null;
  if (err.name === "ZodError") {
    const issues = (err as unknown as { issues?: { path: (string | number)[]; message: string }[] }).issues ?? [];
    const lines = issues.slice(0, 5).map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    const more = issues.length > 5 ? `\n  ... and ${issues.length - 5} more issue(s)` : "";
    return `Validation issues:\n${lines.join("\n")}${more}`;
  }
  if (err instanceof SyntaxError) return `The output was not valid JSON: ${err.message}`;
  return null;
}

/** Append a note to the final user turn without mutating the caller's messages. */
function withFeedback(messages: ChatMessage[], issue: string): ChatMessage[] {
  const note =
    `\n\n[Your previous attempt failed schema validation:\n${issue}\n` +
    `Return the complete response again, fixing exactly those problems.]`;
  const copy = messages.slice();
  const last = copy[copy.length - 1];
  if (last?.role === "user") copy[copy.length - 1] = { ...last, content: last.content + note };
  else copy.push({ role: "user", content: note.trim() });
  return copy;
}

export async function generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
  if (isDemoMode()) throw new DemoModeError(req.stage);

  const rawClient = getClient();
  const openai = observeOpenAiClient(rawClient, {
    traceName: `ai_stage:${req.stage}`,
    sessionId: req.traceContext?.sessionId,
    userId: req.traceContext?.userId,
    tags: [req.stage, ...(req.traceContext?.tags ?? [])],
    metadata: {
      stage: req.stage,
      effort: req.effort,
      maxTokens: req.maxTokens,
      ...req.traceContext?.metadata,
    },
  });
  const model = modelFor(req.stage);

  let responseFormatMode: "json_schema" | "json_object" | "none" = isJsonSchemaSupported(model)
    ? "json_schema"
    : "json_object";

  let messages = req.messages;
  let lastIssue = "";

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        let parsedData: T;
        let completionModel: string;
        let usage = { inputTokens: 0, outputTokens: 0 };

        if (responseFormatMode === "json_schema") {
          const completion = await openai.chat.completions.parse({
            model,
            max_completion_tokens: req.maxTokens,
            messages: [{ role: "system", content: req.system }, ...messages],
            response_format: zodResponseFormat(req.schema, `${req.stage}_output`),
            ...(supportsReasoningEffort(model) ? { reasoning_effort: toReasoningEffort(req.effort) } : {}),
          });

          const choice = completion.choices[0];
          if (!choice) throw new InvalidOutputError(`The AI returned no answer (stage: ${req.stage}).`, "no_output");
          if (choice.message.refusal || choice.finish_reason === "content_filter") {
            throw new ModelRefusalError("The AI declined this request. Try rewording the input, or reduce sensitive content.", "refusal");
          }
          if (choice.finish_reason === "length") {
            throw new TruncatedOutputError(`The AI's answer was cut off at ${req.maxTokens} tokens (stage: ${req.stage}).`, "truncated");
          }
          if (choice.message.parsed == null) {
            throw new InvalidOutputError(`The AI returned no structured output (stage: ${req.stage}).`, "no_output");
          }
          parsedData = choice.message.parsed as T;
          completionModel = completion.model;
          usage = {
            inputTokens: completion.usage?.prompt_tokens ?? 0,
            outputTokens: completion.usage?.completion_tokens ?? 0,
          };
        } else {
          const isReasoning = supportsReasoningEffort(model);
          const schemaJson = getJsonSchemaPrompt(req.schema, `${req.stage}_output`);
          const schemaInstruction = schemaJson
            ? `\n\nCRITICAL: Respond ONLY with a valid JSON object strictly matching this schema:\n${schemaJson}`
            : `\n\nCRITICAL: Respond ONLY with a valid JSON object.`;

          const completion = await openai.chat.completions.create({
            model,
            messages: [{ role: "system", content: `${req.system}${schemaInstruction}` }, ...messages],
            ...(responseFormatMode === "json_object" ? { response_format: { type: "json_object" } } : {}),
            ...(isReasoning
              ? { max_completion_tokens: req.maxTokens, reasoning_effort: toReasoningEffort(req.effort) }
              : { max_tokens: req.maxTokens }),
          });

          const choice = completion.choices[0];
          if (!choice) throw new InvalidOutputError(`The AI returned no answer (stage: ${req.stage}).`, "no_output");
          if (choice.message.refusal || choice.finish_reason === "content_filter") {
            throw new ModelRefusalError("The AI declined this request. Try rewording the input, or reduce sensitive content.", "refusal");
          }
          if (choice.finish_reason === "length") {
            throw new TruncatedOutputError(`The AI's answer was cut off at ${req.maxTokens} tokens (stage: ${req.stage}).`, "truncated");
          }

          const rawContent = choice.message.content;
          if (!rawContent || !rawContent.trim()) {
            throw new InvalidOutputError(`The AI returned no structured output (stage: ${req.stage}).`, "no_output");
          }

          let jsonParsed: unknown;
          try {
            jsonParsed = JSON.parse(extractJsonFromText(rawContent));
          } catch (e) {
            throw new SyntaxError(`The output was not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
          }

          parsedData = req.schema.parse(jsonParsed);
          completionModel = completion.model;
          usage = {
            inputTokens: completion.usage?.prompt_tokens ?? 0,
            outputTokens: completion.usage?.completion_tokens ?? 0,
          };
        }

        return {
          data: parsedData,
          model: completionModel,
          usage,
        };
      } catch (err) {
        // Fallback if provider rejected json_schema or response_format
        const isBadReq =
          err instanceof OpenAI.BadRequestError ||
          (err instanceof OpenAI.APIError && err.status === 400);

        if (isBadReq && /response_format|json_schema|unavailable/i.test((err as Error).message)) {
          if (responseFormatMode === "json_schema") {
            responseFormatMode = "json_object";
            attempt--;
            continue;
          }
          if (responseFormatMode === "json_object") {
            responseFormatMode = "none";
            attempt--;
            continue;
          }
        }

        // The SDK throws these itself when the model runs out of tokens or is filtered.
        if (err instanceof LengthFinishReasonError) {
          throw new TruncatedOutputError(`The AI's answer was cut off at ${req.maxTokens} tokens (stage: ${req.stage}).`, "truncated");
        }
        if (err instanceof ContentFilterFinishReasonError) {
          throw new ModelRefusalError("The AI declined this request. Try rewording the input, or reduce sensitive content.", "refusal");
        }
        const issue = validationIssue(err);
        if (issue && attempt === 0) {
          lastIssue = issue;
          messages = withFeedback(req.messages, issue);
          continue;
        }
        if (issue) {
          throw new InvalidOutputError(
            `The AI's answer did not match the expected structure after a retry (stage: ${req.stage}). ${lastIssue}`,
            "invalid_output"
          );
        }
        throw toAiError(err);
      }
    }
    // Unreachable: the loop either returns or throws.
    throw new InvalidOutputError(`Structured generation failed (stage: ${req.stage}).`, "invalid_output");
  } finally {
    await flushLangfuse().catch(() => {});
  }
}
