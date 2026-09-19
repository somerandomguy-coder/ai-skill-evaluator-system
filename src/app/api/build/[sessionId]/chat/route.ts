import { z } from "zod";
import { errorResponse, fixtureModeResponse, json, readBody, requireApiUser } from "@/lib/api";
import { sendMessage } from "@/lib/services/sessions";

// A whole-file rewrite from the model can take a while.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const Body = z.object({ message: z.string().max(10_000).default(""), retry: z.boolean().optional() });

/**
 * POST { message, retry? } -> { turns, writes, notes }.
 * The server owns history and files; the client sends only its new message. The
 * message is saved before the model is called, so `retry: true` re-runs the
 * assistant for an unanswered message without duplicating it.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/build/[sessionId]/chat">) {
  const fixture = fixtureModeResponse();
  if (fixture) return fixture;
  const auth = await requireApiUser("CANDIDATE");
  if ("response" in auth) return auth.response;
  const parsed = await readBody(request, Body);
  if ("response" in parsed) return parsed.response;
  const { sessionId } = await ctx.params;

  try {
    return json(await sendMessage({ sessionId, userId: auth.user.id, message: parsed.body.message, retry: parsed.body.retry }));
  } catch (err) {
    return errorResponse(err);
  }
}
