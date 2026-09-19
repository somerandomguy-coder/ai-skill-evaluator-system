/**
 * Typed browser-side wrappers for the app's API routes. Every function throws an
 * Error whose message is safe to show a person.
 */
import type { TurnView } from "@/lib/data/types";
import type { FileWrite } from "@/lib/files";
import type { PipelineEvent } from "@/lib/pipeline-events";

/** Thrown by API calls; `retryable` tells the UI whether re-sending the same request makes sense. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as (T & { error?: string; retryable?: boolean }) | null;
  if (!res.ok) throw new ApiError(body?.error ?? `Something went wrong (HTTP ${res.status}).`, res.status, !!body?.retryable);
  return body as T;
}

const post = (url: string, body?: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });

/** Build a challenge from a job description; streams progress events as NDJSON. */
export async function runPipeline(input: { rawJd?: string; sourceUrl?: string }, onEvent: (e: PipelineEvent) => void): Promise<void> {
  const res = await post("/api/jd", input);
  if (!res.ok || !res.body) await readJson(res); // throws with the server's message
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as PipelineEvent);
    }
  }
}

export interface ChatResponse {
  turns: TurnView[];
  writes: FileWrite[];
  notes: string[];
}

export async function sendChat(sessionId: string, body: { message: string; retry?: boolean }): Promise<ChatResponse> {
  return readJson<ChatResponse>(await post(`/api/build/${sessionId}/chat`, body));
}

export async function submitBuild(sessionId: string): Promise<{ evaluationId: string }> {
  return readJson(await post(`/api/build/${sessionId}/submit`));
}

export async function contestScore(evaluationId: string, reason: string): Promise<void> {
  await readJson(await post(`/api/evaluations/${evaluationId}/contest`, { reason }));
}

export async function submitReview(
  evaluationId: string,
  body: { verdict: "CONFIRM" | "OVERRIDE"; comments: string; adjustedScore?: number | null }
): Promise<void> {
  await readJson(await post(`/api/mentor/${evaluationId}/review`, body));
}
