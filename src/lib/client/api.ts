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
export async function runPipeline(
  input: { rawJd?: string; sourceUrl?: string; fast?: boolean },
  onEvent: (e: PipelineEvent) => void
): Promise<void> {
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

export interface JdInspectionClientResult {
  type: "good job ad" | "too vague" | "not a job ad";
  howSure: string;
  reason: string;
  cheatingAttempt: "yes" | "no";
  formatted: string;
}

/** Pre-inspects a job description for validity, vagueness, and prompt injections */
export async function inspectJobAd(rawJd: string): Promise<JdInspectionClientResult> {
  const res = await post("/api/jd/inspect", { rawJd });
  const data = await readJson<{ success: boolean; inspection: JdInspectionClientResult }>(res);
  return data.inspection;
}

export interface ChatResponse {
  turns: TurnView[];
  writes: FileWrite[];
  notes: string[];
}

export type ChatStreamEvent =
  | { type: "token"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "status"; message: string }
  | { type: "done"; result: ChatResponse }
  | { type: "error"; message: string; retryable?: boolean };

export async function sendChat(sessionId: string, body: { message: string; retry?: boolean }): Promise<ChatResponse> {
  return readJson<ChatResponse>(await post(`/api/build/${sessionId}/chat`, body));
}

export async function sendChatStream(
  sessionId: string,
  body: { message: string; retry?: boolean },
  onEvent: (event: ChatStreamEvent) => void
): Promise<ChatResponse> {
  const res = await fetch(`/api/build/${sessionId}/chat?stream=true`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "text/event-stream",
    },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as { error?: string; retryable?: boolean } | null;
    throw new ApiError(errorBody?.error ?? `Something went wrong (HTTP ${res.status}).`, res.status, !!errorBody?.retryable);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    const data = (await res.json()) as ChatResponse;
    onEvent({ type: "done", result: data });
    return data;
  }

  if (!res.body) {
    throw new ApiError("No response stream received from the assistant.", 500, true);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let finalResult: ChatResponse | null = null;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;

      let pos: number;
      while ((pos = buffer.indexOf("\n\n")) >= 0) {
        const rawMessage = buffer.slice(0, pos).trim();
        buffer = buffer.slice(pos + 2);

        if (!rawMessage) continue;

        const lines = rawMessage.split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const dataStr = line.slice(5).trim();
            if (!dataStr) continue;
            try {
              const event = JSON.parse(dataStr) as ChatStreamEvent;
              if (event.type === "error") {
                throw new ApiError(event.message, 400, event.retryable);
              }
              if (event.type === "done") {
                finalResult = event.result;
              }
              onEvent(event);
            } catch (err) {
              if (err instanceof ApiError) throw err;
              console.warn("[sendChatStream] Failed to parse SSE event:", dataStr, err);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalResult) {
    throw new ApiError("Assistant response ended before completion was received.", 500, true);
  }

  return finalResult;
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
