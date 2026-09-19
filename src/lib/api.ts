/**
 * Shared plumbing for route handlers: JSON responses, role checks, size-capped
 * body parsing, and one consistent mapping from errors to safe messages.
 */
import type { z } from "zod";
import { AiError } from "./ai/client";
import { getCurrentUser } from "./auth";
import { data } from "./data";
import type { Role, UserView } from "./data/types";
import { RetryableError, ServiceError } from "./services/errors";

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

const MAX_BODY_BYTES = 200_000;

/** The API needs the database; the fixture preview (DATA_SOURCE=mock) is read-only. */
export function fixtureModeResponse(): Response | null {
  return data.kind === "db" ? null : json({ error: "This is the read-only fixture preview (DATA_SOURCE=mock). Run against the database to do this." }, 503);
}

export async function requireApiUser(role?: Role): Promise<{ user: UserView } | { response: Response }> {
  const user = await getCurrentUser();
  if (!user) return { response: json({ error: "Please sign in first." }, 401) };
  if (role && user.role !== role) return { response: json({ error: `This needs a ${role.toLowerCase()} account.` }, 403) };
  return { user };
}

/** Parse and validate a JSON body, refusing anything oversized. */
export async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<{ body: T } | { response: Response }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return { response: json({ error: "That request is too large." }, 413) };
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return { response: json({ error: "That request is too large." }, 413) };
    raw = text ? JSON.parse(text) : {};
  } catch {
    return { response: json({ error: "The request body was not valid JSON." }, 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { response: json({ error: `Invalid request: ${first?.path.join(".") || "body"} ${first?.message ?? ""}`.trim() }, 400) };
  }
  return { body: parsed.data };
}

/** Map anything a service can throw to a response that is safe to show. Unknown errors are logged, never leaked. */
export function errorResponse(err: unknown): Response {
  if (err instanceof ServiceError) return json({ error: err.message, retryable: err.retryable }, err.status);
  if (err instanceof RetryableError) {
    const message = err.original instanceof AiError ? err.original.message : "The assistant hit a problem.";
    if (!(err.original instanceof AiError)) console.error("[api] after message saved:", err.original);
    return json({ error: `${message} Your message was saved.`, retryable: true }, 502);
  }
  if (err instanceof AiError) return json({ error: err.message }, 502);
  console.error("[api]", err);
  return json({ error: "Something went wrong on our side. Please try again." }, 500);
}
