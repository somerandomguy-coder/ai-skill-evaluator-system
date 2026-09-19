/**
 * The only module that talks to the Anthropic API. Server-side only.
 *
 * Every pipeline function funnels through `generateStructured`, which:
 *  - refuses to run in DEMO_MODE (demo paths must be served from fixtures
 *    *before* reaching here — this is the backstop that guarantees zero live calls);
 *  - streams (long structured outputs would otherwise risk request timeouts)
 *    and returns the SDK-parsed, Zod-validated result;
 *  - retries once, telling the model what failed validation;
 *  - opts into server-side refusal fallbacks by default (see env.ts);
 *  - only sends `thinking`/`effort` to models that accept them, so overriding a
 *    stage to e.g. Haiku 4.5 cannot produce a 400.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { anthropicApiKey, isDemoMode, modelFor, refusalFallbacksEnabled, type AiStage } from "../env";

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
    super("ANTHROPIC_API_KEY is not set. Add it to .env, or set DEMO_MODE=true to use cached responses.", "no_api_key");
  }
}
export class ModelRefusalError extends AiError {}
export class TruncatedOutputError extends AiError {}
export class InvalidOutputError extends AiError {}
export class AiUnavailableError extends AiError {}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface StructuredRequest<T> {
  stage: AiStage;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: z.ZodType<T>;
  maxTokens: number;
  effort?: Effort;
}

export interface StructuredResult<T> {
  data: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

/** Models that accept `thinking: {type: "adaptive"}` and `output_config.effort`. */
export function supportsAdaptiveThinking(model: string): boolean {
  return /^claude-(opus-5|sonnet-5|fable-5|opus-4-[678]|sonnet-4-6)/.test(model);
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = anthropicApiKey();
  if (!apiKey) throw new MissingApiKeyError();
  client = new Anthropic({ apiKey });
  return client;
}

/** Test seam: inject a fake client. Pass null to reset. */
export function setAnthropicClientForTests(fake: Anthropic | null) {
  client = fake;
}

/** Turn SDK errors into messages that are safe to show a user. Most specific first. */
export function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new AiUnavailableError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", "auth");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AiUnavailableError("The AI service is rate-limiting requests. Wait a moment and retry.", "rate_limit");
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new AiUnavailableError(`The AI service rejected the request: ${err.message}`, "bad_request");
  }
  if (err instanceof Anthropic.APIError) {
    return new AiUnavailableError(`The AI service returned an error (HTTP ${err.status ?? "?"}).`, "api");
  }
  return new AiUnavailableError(err instanceof Error ? err.message : "Unknown AI error.", "unknown");
}

const isValidationFailure = (err: unknown) =>
  err instanceof Error &&
  !(err instanceof Anthropic.APIError) &&
  err.message.startsWith("Failed to parse structured output");

/** Append a note to the final user turn without mutating the caller's messages. */
function withFeedback(messages: Anthropic.Beta.BetaMessageParam[], issue: string): Anthropic.Beta.BetaMessageParam[] {
  const note =
    `\n\n[Your previous attempt failed schema validation:\n${issue}\n` +
    `Return the complete response again, fixing exactly those problems.]`;
  const copy = messages.slice();
  const last = copy[copy.length - 1];
  if (last?.role === "user") {
    const content = typeof last.content === "string" ? last.content + note : [...last.content, { type: "text" as const, text: note }];
    copy[copy.length - 1] = { ...last, content };
  } else {
    copy.push({ role: "user", content: note.trim() });
  }
  return copy;
}

export async function generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
  if (isDemoMode()) throw new DemoModeError(req.stage);

  const anthropic = getClient();
  const model = modelFor(req.stage);
  const adaptive = supportsAdaptiveThinking(model);
  const useFallbacks = refusalFallbacksEnabled();

  let messages = req.messages;
  let lastIssue = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const stream = anthropic.beta.messages.stream({
        model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages,
        ...(adaptive ? { thinking: { type: "adaptive" as const } } : {}),
        output_config: {
          ...(adaptive ? { effort: req.effort ?? "high" } : {}),
          format: betaZodOutputFormat(req.schema),
        },
        ...(useFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });
      const message = await stream.finalMessage();

      if (message.stop_reason === "refusal") {
        throw new ModelRefusalError(
          "The AI declined this request. Try rewording the input, or reduce sensitive content.",
          "refusal"
        );
      }
      if (message.stop_reason === "max_tokens") {
        throw new TruncatedOutputError(
          `The AI's answer was cut off at ${req.maxTokens} tokens (stage: ${req.stage}).`,
          "truncated"
        );
      }
      if (message.parsed_output == null) {
        throw new InvalidOutputError(`The AI returned no structured output (stage: ${req.stage}).`, "no_output");
      }
      return {
        data: message.parsed_output as T,
        model: message.model,
        usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
      };
    } catch (err) {
      if (attempt === 0 && isValidationFailure(err)) {
        lastIssue = (err as Error).message;
        messages = withFeedback(req.messages, lastIssue);
        continue;
      }
      if (isValidationFailure(err)) {
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
}
