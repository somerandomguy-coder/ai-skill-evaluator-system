import { z } from "zod";
import { errorResponse, fixtureModeResponse, json, readBody, requireApiUser } from "@/lib/api";
import { submitMentorReview } from "@/lib/services/evaluations";

export const dynamic = "force-dynamic";

const Body = z.object({
  verdict: z.enum(["CONFIRM", "OVERRIDE"]),
  comments: z.string().max(5_000),
  adjustedScore: z.number().nullable().optional(),
});

/** POST { verdict, comments, adjustedScore? }: a mentor confirms or overrides the AI's evaluation. */
export async function POST(request: Request, ctx: RouteContext<"/api/mentor/[id]/review">) {
  const fixture = fixtureModeResponse();
  if (fixture) return fixture;
  const auth = await requireApiUser("MENTOR");
  if ("response" in auth) return auth.response;
  const parsed = await readBody(request, Body);
  if ("response" in parsed) return parsed.response;
  const { id } = await ctx.params;

  try {
    await submitMentorReview({ evaluationId: id, mentorId: auth.user.id, ...parsed.body });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
