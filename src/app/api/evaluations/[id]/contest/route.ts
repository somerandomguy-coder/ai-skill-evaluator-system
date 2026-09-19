import { z } from "zod";
import { errorResponse, fixtureModeResponse, json, readBody, requireApiUser } from "@/lib/api";
import { contestEvaluation } from "@/lib/services/evaluations";

export const dynamic = "force-dynamic";

const Body = z.object({ reason: z.string().max(3_000) });

/** POST { reason }: the candidate contests a score; it goes straight to the mentor queue. */
export async function POST(request: Request, ctx: RouteContext<"/api/evaluations/[id]/contest">) {
  const fixture = fixtureModeResponse();
  if (fixture) return fixture;
  const auth = await requireApiUser("CANDIDATE");
  if ("response" in auth) return auth.response;
  const parsed = await readBody(request, Body);
  if ("response" in parsed) return parsed.response;
  const { id } = await ctx.params;

  try {
    await contestEvaluation(id, auth.user.id, parsed.body.reason);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
