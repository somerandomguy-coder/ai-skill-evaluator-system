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
import {
  aiApiKey,
  aiBaseUrl,
  aiProvider,
  isDeepSeekThinkingEnabled,
  isDemoMode,
  modelFor,
  resolveProviderConfig,
  type AiStage,
  type ProviderConfig,
} from "../env";
import { flushLangfuse, observeOpenAiClient } from "./langfuse";
import { calculateCost, type CalculatedCost } from "./pricing";

export interface AttemptMetric {
  attempt: number;
  success: boolean;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
  errorCode?: string;
  durationMs?: number;
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    public attempts?: AttemptMetric[]
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
  constructor(provider: string = "ai", code: string = "no_api_key") {
    const keyHint =
      provider === "deepseek"
        ? "DEEPSEEK_API_KEY is not configured"
        : provider === "openai"
          ? "OPENAI_API_KEY is not configured"
          : "API key is not configured";
    super(`${keyHint}. Cross-vendor key fallback is prohibited. Add it to .env, or set DEMO_MODE=true to use cached responses.`, code);
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
  maxRetries?: number;
  traceContext?: TraceContext;
  onToken?: (chunk: string) => void;
  onReasoning?: (chunk: string) => void;
}


export interface StructuredResult<T> {
  data: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  cost?: CalculatedCost;
  attempts?: AttemptMetric[];
  totalAttempts?: number;
}

/** Reasoning models accept `reasoning_effort`; chat/non-reasoning models reject it. */
export function supportsReasoningEffort(model: string): boolean {
  if (/deepseek/i.test(model)) return false;
  return /^(gpt-5|gpt-6|o1|o3|o4)/.test(model) && !/-chat-latest$/.test(model);
}

/** DeepSeek and some OpenAI-compatible endpoints do not support `type: "json_schema"`. */
export function isJsonSchemaSupported(model: string): boolean {
  if (aiProvider() === "deepseek") return false;
  if (/deepseek/i.test(model)) return false;
  return true;
}

/** Safely extract a JSON substring from raw text or markdown fences, stripping reasoning blocks. */
export function extractJsonFromText(text: string): string {
  let cleaned = text.trim();

  // Strip reasoning / thinking tags (e.g. DeepSeek <think>...</think> or <reasoning>...</reasoning>)
  cleaned = cleaned.replace(/<(?:think|reasoning)>[\s\S]*?<\/(?:think|reasoning)>/gi, "").trim();
  // Strip unclosed <think> or <reasoning> tags (happens if output was cut off or mid-stream)
  cleaned = cleaned.replace(/<(?:think|reasoning)>[\s\S]*$/gi, "").trim();

  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  const fenceMatches = Array.from(cleaned.matchAll(fenceRegex));
  if (fenceMatches.length > 0) {
    // Check from last to first for valid JSON block
    for (let i = fenceMatches.length - 1; i >= 0; i--) {
      const candidate = fenceMatches[i][1].trim();
      if (
        (candidate.startsWith("{") && candidate.endsWith("}")) ||
        (candidate.startsWith("[") && candidate.endsWith("]"))
      ) {
        return candidate;
      }
    }
    return fenceMatches[0][1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    if (lastBrace > firstBrace) return cleaned.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket > firstBracket) {
    return cleaned.slice(firstBracket, lastBracket + 1);
  }
  return cleaned;
}

/** Safely repair and parse a JSON string, handling trailing commas, smart quotes, etc. */
export function safeParseJson(raw: string): unknown {
  const extracted = extractJsonFromText(raw);
  try {
    return JSON.parse(extracted);
  } catch (err1) {
    // Attempt common LLM JSON repairs:
    const repaired = extracted
      // Replace smart quotes
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      // Remove trailing commas before closing braces/brackets
      .replace(/,\s*([}\]])/g, "$1")
      // Remove trailing ellipsis or incomplete markers
      .replace(/\.\.\.\s*$/, "");

    try {
      return JSON.parse(repaired);
    } catch {
      throw new SyntaxError(
        `The output was not valid JSON: ${err1 instanceof Error ? err1.message : String(err1)}`
      );
    }
  }
}

/**
 * Validates parsed JSON against the target schema, with resilience for models that
 * wrap valid responses inside common wrapper keys like "result", "data", "response", etc.
 */
export function parseWithSchema<T>(schema: z.ZodType<T>, rawJson: unknown): T {
  const directResult = schema.safeParse(rawJson);
  if (directResult.success) {
    return directResult.data;
  }

  // If rawJson is an object, check if the expected payload is wrapped inside a container key
  if (rawJson && typeof rawJson === "object" && !Array.isArray(rawJson)) {
    const obj = rawJson as Record<string, unknown>;
    const wrapperKeys = ["result", "data", "response", "output", "challenge", "evaluation", "report", "payload"];

    for (const key of wrapperKeys) {
      if (key in obj && obj[key] !== undefined) {
        const unwrapped = schema.safeParse(obj[key]);
        if (unwrapped.success) {
          return unwrapped.data;
        }
      }
    }

    // Single-key wrapper check
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      const singleUnwrapped = schema.safeParse(obj[keys[0]]);
      if (singleUnwrapped.success) {
        return singleUnwrapped.data;
      }
    }
  }

  // If unwrapping didn't resolve it, throw the original direct error
  throw directResult.error;
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

export function redactSecrets(str: string): string {
  if (!str) return str;
  let result = str;
  const keys = [
    process.env.OPENAI_API_KEY,
    process.env.DEEPSEEK_API_KEY,
    process.env.CUSTOM_AI_API_KEY,
    process.env.EMBEDDING_API_KEY,
  ].filter(Boolean) as string[];

  for (const k of keys) {
    if (k.length > 3) {
      result = result.split(k).join("[REDACTED_SECRET]");
    }
  }
  result = result.replace(/sk-[a-zA-Z0-9_\-\.]{6,}/g, "[REDACTED_API_KEY]");
  result = result.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{6,}/gi, "Bearer [REDACTED_TOKEN]");
  return result;
}

let customClient: OpenAI | null = null;
let cachedClient: OpenAI | null = null;
let cachedKey: string | null = null;
let cachedBaseURL: string | null = null;

function getClient(providerConfig: ProviderConfig): OpenAI {
  if (customClient) return customClient;
  if (cachedClient && cachedKey === providerConfig.apiKey && cachedBaseURL === (providerConfig.baseUrl || null)) {
    return cachedClient;
  }
  cachedKey = providerConfig.apiKey;
  cachedBaseURL = providerConfig.baseUrl || null;
  cachedClient = new OpenAI({
    apiKey: providerConfig.apiKey,
    ...(providerConfig.baseUrl ? { baseURL: providerConfig.baseUrl } : {}),
  });
  return cachedClient;
}

/** Test seam: inject a fake client. Pass null to reset. */
export function setAiClientForTests(fake: OpenAI | null) {
  customClient = fake;
  cachedClient = null;
  cachedKey = null;
  cachedBaseURL = null;
}

/** Turn SDK errors into messages that are safe to show a user. Most specific first. */
export function toAiError(err: unknown, attempts?: AttemptMetric[]): AiError {
  if (err instanceof AiError) {
    err.message = redactSecrets(err.message);
    if (attempts && !err.attempts) err.attempts = attempts;
    return err;
  }
  if (
    (err as any)?.code === "missing_deepseek_key" ||
    (err as any)?.code === "missing_openai_key" ||
    (err as any)?.code === "missing_custom_key"
  ) {
    const code = (err as any).code;
    const provider = code.replace("missing_", "").replace("_key", "");
    return new MissingApiKeyError(provider, code);
  }
  if (err instanceof OpenAI.AuthenticationError) {
    const isDeepSeek = aiProvider() === "deepseek";
    const keyName = isDeepSeek ? "DEEPSEEK_API_KEY" : "OPENAI_API_KEY";
    return new AiUnavailableError(`The AI API key was rejected. Check ${keyName}.`, "auth", attempts);
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new AiUnavailableError("The AI service is rate-limiting requests (or the account is out of quota). Wait a moment and retry.", "rate_limit", attempts);
  }
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return new AiUnavailableError("The AI request timed out.", "timeout", attempts);
  }
  if (err instanceof OpenAI.BadRequestError) {
    return new AiUnavailableError(`The AI service rejected the request: ${redactSecrets(err.message)}`, "bad_request", attempts);
  }
  if (err instanceof OpenAI.InternalServerError || (err instanceof OpenAI.APIError && err.status && err.status >= 500)) {
    return new AiUnavailableError(`The AI service returned an upstream error (HTTP ${err.status ?? 500}).`, "upstream_5xx", attempts);
  }
  if (err instanceof OpenAI.APIError) {
    return new AiUnavailableError(`The AI service returned an error (HTTP ${err.status ?? "?"}).`, "api", attempts);
  }
  const msg = err instanceof Error ? err.message : "Unknown AI error.";
  return new AiUnavailableError(redactSecrets(msg), (err as any)?.code || "unknown", attempts);
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
    `Return the complete response again, fixing exactly those problems. Output raw JSON only with no markdown wrapping or trailing commas, and do not wrap in an outer container like "result" or "data".]`;
  const copy = messages.slice();
  const last = copy[copy.length - 1];
  if (last?.role === "user") copy[copy.length - 1] = { ...last, content: last.content + note };
  else copy.push({ role: "user", content: note.trim() });
  return copy;
}

export async function generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
  if (isDemoMode()) throw new DemoModeError(req.stage);

  let providerConfig: ProviderConfig;
  try {
    providerConfig = resolveProviderConfig(req.stage);
  } catch (err) {
    if (customClient) {
      providerConfig = {
        provider: aiProvider(),
        model: modelFor(req.stage),
        apiKey: "mock-key",
        baseUrl: aiBaseUrl(),
      };
    } else {
      throw toAiError(err);
    }
  }

  const rawClient = getClient(providerConfig);
  const openai = observeOpenAiClient(rawClient, {
    traceName: `ai_stage:${req.stage}`,
    sessionId: req.traceContext?.sessionId,
    userId: req.traceContext?.userId,
    tags: [req.stage, ...(req.traceContext?.tags ?? [])],
    metadata: {
      stage: req.stage,
      effort: req.effort,
      maxTokens: req.maxTokens,
      provider: providerConfig.provider,
      ...req.traceContext?.metadata,
    },
  });
  const model = providerConfig.model;

  let responseFormatMode: "json_schema" | "json_object" | "none" = isJsonSchemaSupported(model)
    ? "json_schema"
    : "json_object";

  let messages = req.messages;
  let lastIssue = "";
  const maxAttempts = req.maxRetries != null ? Math.max(1, req.maxRetries + 1) : 2;

  const attempts: AttemptMetric[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const attemptNum = attempt + 1;
      const attemptStart = Date.now();
      let currentAttemptUsage = { inputTokens: 0, outputTokens: 0 };
      try {
        let parsedData: T;
        let completionModel = model;
        let usage = { inputTokens: 0, outputTokens: 0 };

        const wantsStream = Boolean(req.onToken || req.onReasoning);

        if (responseFormatMode === "json_schema" && !wantsStream) {
          const completion = await openai.chat.completions.create({
            model,
            max_completion_tokens: req.maxTokens,
            messages: [{ role: "system", content: req.system }, ...messages],
            response_format: zodResponseFormat(req.schema, `${req.stage}_output`),
            ...(supportsReasoningEffort(model) ? { reasoning_effort: toReasoningEffort(req.effort) } : {}),
          });

          currentAttemptUsage = {
            inputTokens: completion.usage?.prompt_tokens ?? 0,
            outputTokens: completion.usage?.completion_tokens ?? 0,
          };

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
            jsonParsed = safeParseJson(rawContent);
          } catch (e) {
            throw new SyntaxError(`The output was not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
          }

          parsedData = parseWithSchema(req.schema, jsonParsed);
          completionModel = completion.model;
          usage = currentAttemptUsage;
        } else {
          const isReasoning = supportsReasoningEffort(model);
          const isDeepSeek = providerConfig.provider === "deepseek" || /deepseek/i.test(model);
          const deepSeekThinking = isDeepSeek ? isDeepSeekThinkingEnabled(req.stage, model) : false;
          // Row A04 & Packet M09: remove hidden 64k token budget expansion
          const effectiveMaxTokens = req.maxTokens;

          const schemaJson = getJsonSchemaPrompt(req.schema, `${req.stage}_output`);
          const schemaInstruction = schemaJson
            ? `\n\nCRITICAL: Respond ONLY with a valid JSON object strictly matching this schema:\n${schemaJson}`
            : `\n\nCRITICAL: Respond ONLY with a valid JSON object.`;

          const commonPayload: Record<string, unknown> = {
            model,
            messages: [{ role: "system", content: `${req.system}${schemaInstruction}` }, ...messages],
            ...(responseFormatMode === "json_object" ? { response_format: { type: "json_object" } } : {}),
            ...(isReasoning
              ? { max_completion_tokens: effectiveMaxTokens, reasoning_effort: toReasoningEffort(req.effort) }
              : { max_tokens: effectiveMaxTokens }),
            ...(isDeepSeek ? { thinking: { type: deepSeekThinking ? "enabled" : "disabled" } } : {}),
          };

          if (wantsStream) {
            const stream = (await openai.chat.completions.create({
              ...commonPayload,
              stream: true,
              stream_options: { include_usage: true },
            } as any)) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

            let rawContent = "";
            let streamFinishReason: string | null = null;
            let streamUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;
            for await (const chunk of stream) {
              if ((chunk as any)?.usage) {
                streamUsage = (chunk as any).usage;
              }
              const choice = chunk.choices?.[0];
              if (choice?.finish_reason) {
                streamFinishReason = choice.finish_reason;
              }
              const delta = choice?.delta;
              const content = delta?.content || "";
              const reasoning = (delta as any)?.reasoning_content || "";
              if (reasoning && req.onReasoning) {
                req.onReasoning(reasoning);
              }
              if (content) {
                rawContent += content;
                if (req.onToken) {
                  req.onToken(content);
                }
              }
            }

            if (streamFinishReason === "length") {
              throw new TruncatedOutputError(
                `The AI's answer was cut off at ${effectiveMaxTokens} tokens (stage: ${req.stage}). ${
                  rawContent
                    ? "Partial output was received."
                    : "The model exhausted its token limit during thinking before generating output. Disable thinking mode or increase token limit."
                }`,
                "truncated"
              );
            }

            if (!rawContent || !rawContent.trim()) {
              throw new InvalidOutputError(`The AI returned no structured output (stage: ${req.stage}).`, "no_output");
            }

            let jsonParsed: unknown;
            try {
              jsonParsed = safeParseJson(rawContent);
            } catch (e) {
              throw new SyntaxError(`The output was not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
            }

            parsedData = parseWithSchema(req.schema, jsonParsed);
            completionModel = model;
            const estimatedPromptTokens = Math.ceil(
              (req.system.length + messages.reduce((acc, m) => acc + (m.content?.length || 0), 0)) / 4
            );
            usage = {
              inputTokens: streamUsage?.prompt_tokens ?? estimatedPromptTokens,
              outputTokens: streamUsage?.completion_tokens ?? Math.ceil(rawContent.length / 4),
            };
            currentAttemptUsage = usage;
          } else {
            const completion = await openai.chat.completions.create(commonPayload as any);
            currentAttemptUsage = {
              inputTokens: completion.usage?.prompt_tokens ?? 0,
              outputTokens: completion.usage?.completion_tokens ?? 0,
            };

            const choice = completion.choices[0];
            if (!choice) throw new InvalidOutputError(`The AI returned no answer (stage: ${req.stage}).`, "no_output");
            if (choice.message.refusal || choice.finish_reason === "content_filter") {
              throw new ModelRefusalError("The AI declined this request. Try rewording the input, or reduce sensitive content.", "refusal");
            }
            if (choice.finish_reason === "length") {
              throw new TruncatedOutputError(`The AI's answer was cut off at ${effectiveMaxTokens} tokens (stage: ${req.stage}).`, "truncated");
            }

            const rawContent = choice.message.content;
            if (!rawContent || !rawContent.trim()) {
              throw new InvalidOutputError(`The AI returned no structured output (stage: ${req.stage}).`, "no_output");
            }

            let jsonParsed: unknown;
            try {
              jsonParsed = safeParseJson(rawContent);
            } catch (e) {
              throw new SyntaxError(`The output was not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
            }

            parsedData = parseWithSchema(req.schema, jsonParsed);
            completionModel = completion.model;
            usage = {
              inputTokens: completion.usage?.prompt_tokens ?? 0,
              outputTokens: completion.usage?.completion_tokens ?? 0,
            };
            currentAttemptUsage = usage;
          }
        }

        totalInputTokens += usage.inputTokens;
        totalOutputTokens += usage.outputTokens;
        attempts.push({
          attempt: attemptNum,
          success: true,
          model: completionModel,
          usage,
          durationMs: Date.now() - attemptStart,
        });

        const cumulativeUsage = {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        };
        const cost = calculateCost(completionModel, cumulativeUsage);
        return {
          data: parsedData,
          model: completionModel,
          usage: cumulativeUsage,
          cost,
          attempts,
          totalAttempts: attempts.length,
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

        totalInputTokens += currentAttemptUsage.inputTokens;
        totalOutputTokens += currentAttemptUsage.outputTokens;

        const issue = validationIssue(err);
        const attemptErrCode = err instanceof AiError ? err.code : issue ? "validation_error" : (err as any)?.code || "error";
        attempts.push({
          attempt: attemptNum,
          success: false,
          model,
          usage: currentAttemptUsage,
          errorCode: attemptErrCode,
          durationMs: Date.now() - attemptStart,
        });

        // The SDK throws these itself when the model runs out of tokens or is filtered.
        if (err instanceof LengthFinishReasonError) {
          throw new TruncatedOutputError(`The AI's answer was cut off at ${req.maxTokens} tokens (stage: ${req.stage}).`, "truncated", attempts);
        }
        if (err instanceof ContentFilterFinishReasonError) {
          throw new ModelRefusalError("The AI declined this request. Try rewording the input, or reduce sensitive content.", "refusal", attempts);
        }
        if (issue && attempt < maxAttempts - 1) {
          lastIssue = issue;
          messages = withFeedback(req.messages, issue);
          continue;
        }
        if (issue) {
          throw new InvalidOutputError(
            `The AI's answer did not match the expected structure after ${attempt === 1 ? "a retry" : `${attempt} retries`} (stage: ${req.stage}). ${lastIssue}`,
            "invalid_output",
            attempts
          );
        }
        throw toAiError(err, attempts);
      }
    }
    // Unreachable: the loop either returns or throws.
    throw new InvalidOutputError(`Structured generation failed (stage: ${req.stage}).`, "invalid_output", attempts);
  } finally {
    await flushLangfuse().catch(() => {});
  }
}
