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

/**
 * Wraps an OpenAI client with Langfuse tracing if Langfuse is configured.
 * If not configured, returns the original client untouched.
 */
export function observeOpenAiClient<T extends object>(client: T, options?: TraceOptions): T {
  if (!isLangfuseEnabled()) return client;
  try {
    const config = {
      traceName: options?.traceName,
      sessionId: options?.sessionId,
      userId: options?.userId,
      tags: options?.tags,
      metadata: options?.metadata,
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
 * Explicitly records what the candidate said in the workspace chat.
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
    const trace = lf.trace({
      name: "candidate_turn",
      sessionId: data.sessionId,
      userId: data.userId,
      tags: ["candidate_prompt", "workspace_chat"],
      input: { message: data.message },
      metadata: {
        challengeTitle: data.challengeTitle,
        charCount: data.message.length,
        ...data.metadata,
      },
    });

    trace.event({
      name: "user_message_received",
      input: { message: data.message },
      metadata: { challengeTitle: data.challengeTitle },
    });
  } catch {
    // Graceful no-op
  }
}

/**
 * Records key platform milestones in Langfuse.
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
    const trace = lf.trace({
      name,
      sessionId: data.sessionId,
      userId: data.userId,
      tags: data.tags ?? [name],
      input: data.input,
      output: data.output,
      metadata: data.metadata,
    });

    trace.event({
      name: `${name}_event`,
      input: data.input,
      output: data.output,
    });
  } catch {
    // Graceful no-op
  }
}
