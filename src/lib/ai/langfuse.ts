/**
 * Langfuse Observability & Tracking Integration. Server-side only.
 *
 * Provides:
 *  - Automatic tracing of OpenAI model calls (completions, reasoning, tokens, latency) via observeOpenAI.
 *  - User turn tracking (recording what the candidate typed in the workspace chat).
 *  - Platform lifecycle tracking (JD submitted, build session submitted, evaluations, mentor reviews).
 *  - Safe non-blocking execution: if LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY are unset or network
 *    is unavailable, everything degrades gracefully to no-ops with zero console spam.
 */
import { Langfuse, observeOpenAI } from "langfuse";
import { isLangfuseEnabled, langfuseBaseUrl, langfusePublicKey, langfuseSecretKey } from "../env";

let langfuseInstance: Langfuse | null = null;

/** Returns singleton Langfuse client if configured; null otherwise. */
export function getLangfuse(): Langfuse | null {
  if (!isLangfuseEnabled()) return null;
  if (!langfuseInstance) {
    const publicKey = langfusePublicKey()!;
    const secretKey = langfuseSecretKey()!;
    const baseUrl = langfuseBaseUrl();

    langfuseInstance = new Langfuse({
      publicKey,
      secretKey,
      baseUrl,
      flushInterval: 1000,
      flushAt: 1,
    });
  }
  return langfuseInstance;
}

/** Seam for unit testing */
export function setLangfuseForTests(instance: Langfuse | null) {
  langfuseInstance = instance;
}

export interface TraceOptions {
  traceName?: string;
  sessionId?: string;
  userId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export function isTelemetryRawContentAllowed(): boolean {
  return process.env.TELEMETRY_RAW_CONTENT_CONSENT === "true";
}

export function sanitizeTelemetryValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") {
    let cleaned = val
      .replace(/sk-[a-zA-Z0-9_\-\.]{6,}/g, "[REDACTED_API_KEY]")
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{6,}/gi, "Bearer [REDACTED_TOKEN]")
      .replace(/ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]*/g, "[REDACTED_JWT]")
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");

    if (!isTelemetryRawContentAllowed() && cleaned.length > 200) {
      return `[REDACTED_CONTENT: length=${cleaned.length}]`;
    }
    return cleaned;
  }
  if (Array.isArray(val)) {
    if (!isTelemetryRawContentAllowed() && val.length > 5) {
      return `[REDACTED_ARRAY: count=${val.length}]`;
    }
    return val.map(sanitizeTelemetryValue);
  }
  if (typeof val === "object") {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (/password|secret|key|token|credential|rawjd|transcript|prompt|filetree/i.test(k)) {
        if (!isTelemetryRawContentAllowed()) {
          res[k] = "[REDACTED_SENSITIVE_FIELD]";
          continue;
        }
      }
      res[k] = sanitizeTelemetryValue(v);
    }
    return res;
  }
  return val;
}

/**
 * Wraps an OpenAI client with Langfuse tracing if Langfuse is configured.
 * If not configured, returns the original client untouched.
 */
export function observeOpenAiClient<T extends object>(client: T, options?: TraceOptions): T {
  if (!isLangfuseEnabled()) return client;
  try {
    const rawAllowed = isTelemetryRawContentAllowed();
    const config = {
      traceName: options?.traceName,
      sessionId: options?.sessionId,
      userId: sanitizeTelemetryValue(options?.userId) as string,
      tags: options?.tags,
      metadata: sanitizeTelemetryValue(options?.metadata) as Record<string, unknown>,
      ...(rawAllowed ? {} : { maskInputs: true, maskOutputs: true }),
    };
    return observeOpenAI(client as any, config as any) as unknown as T;
  } catch (err) {
    // If wrapping fails for any reason, return the unwrapped client so model calls never fail
    return client;
  }
}

/**
 * Safe async flush helper for serverless runtimes (Vercel).
 * Flushes pending events with a timeout guard so serverless handlers never hang.
 */
export async function flushLangfuse(timeoutMs = 1500): Promise<void> {
  const lf = getLangfuse();
  if (!lf) return;

  try {
    await Promise.race([
      lf.flushAsync(),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    // Observability telemetry errors must never throw or disrupt user flows
  }
}

/**
 * Explicitly records candidate turns, adhering to metadata-only privacy defaults.
 */
export function trackUserTurn(data: {
  sessionId: string;
  userId: string;
  message: string;
  challengeTitle?: string;
  metadata?: Record<string, unknown>;
}): void {
  const lf = getLangfuse();
  if (!lf) return;

  try {
    const rawAllowed = isTelemetryRawContentAllowed();
    const safeInput = rawAllowed
      ? { message: sanitizeTelemetryValue(data.message) }
      : { messageLength: data.message?.length ?? 0, redacted: true };

    const trace = lf.trace({
      name: "candidate_turn",
      sessionId: data.sessionId,
      userId: sanitizeTelemetryValue(data.userId) as string,
      tags: ["candidate_prompt", "workspace_chat"],
      input: safeInput,
      metadata: {
        challengeTitle: data.challengeTitle,
        charCount: data.message?.length ?? 0,
        ...((sanitizeTelemetryValue(data.metadata) as Record<string, unknown>) ?? {}),
      },
    });

    trace.event({
      name: "user_message_received",
      input: safeInput,
      metadata: { challengeTitle: data.challengeTitle },
    });
  } catch {
    // Graceful no-op
  }
}

/**
 * Records key platform milestones in Langfuse with privacy sanitization.
 */
export function trackEvent(
  name: string,
  data: {
    sessionId?: string;
    userId?: string;
    input?: unknown;
    output?: unknown;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }
): void {
  const lf = getLangfuse();
  if (!lf) return;

  try {
    const rawAllowed = isTelemetryRawContentAllowed();
    const safeInput = rawAllowed
      ? sanitizeTelemetryValue(data.input)
      : data.input != null
        ? { summary: "input_metadata_only", count: typeof data.input === "object" ? Object.keys(data.input as object).length : 1 }
        : undefined;

    const safeOutput = rawAllowed
      ? sanitizeTelemetryValue(data.output)
      : data.output != null
        ? { summary: "output_metadata_only", count: typeof data.output === "object" ? Object.keys(data.output as object).length : 1 }
        : undefined;

    const trace = lf.trace({
      name,
      sessionId: data.sessionId,
      userId: sanitizeTelemetryValue(data.userId) as string,
      tags: data.tags ?? [name],
      input: safeInput,
      output: safeOutput,
      metadata: sanitizeTelemetryValue(data.metadata) as Record<string, unknown>,
    });

    trace.event({
      name: `${name}_event`,
      input: safeInput,
      output: safeOutput,
    });
  } catch {
    // Graceful no-op
  }
}
