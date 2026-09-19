import { errorResponse, fixtureModeResponse, json, requireApiUser } from "@/lib/api";
import { submitSession } from "@/lib/services/sessions";

// Snapshot, then a full evaluation against the rubric.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * POST -> { evaluationId }. Idempotent: a session whose evaluation failed is
 * evaluated again on retry, and a finished one returns its existing evaluation.
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/build/[sessionId]/submit">) {
  const fixture = fixtureModeResponse();
  if (fixture) return fixture;
  const auth = await requireApiUser("CANDIDATE");
  if ("response" in auth) return auth.response;
  const { sessionId } = await ctx.params;

  try {
    return json({ evaluationId: await submitSession(sessionId, auth.user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}
