import { z } from "zod";
import { errorResponse, fixtureModeResponse, readBody, requireApiUser } from "@/lib/api";
import { runChallengePipeline } from "@/lib/services/challenge-pipeline";

// Live generation (parse, research, design, rubric) can take a minute or more.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const Body = z
  .object({
    rawJd: z.string().max(25_000).optional(),
    sourceUrl: z.string().max(2_000).optional(),
    fast: z.boolean().optional(),
  })
  .refine((b) => !!b.rawJd?.trim() || !!b.sourceUrl?.trim(), {
    message: "needs a job description or a link",
  });

/**
 * POST { rawJd? , sourceUrl? } -> NDJSON stream of pipeline progress events,
 * ending in { type: "done", challengeId } or { type: "error", message }.
 */
export async function POST(request: Request) {
  const fixture = fixtureModeResponse();
  if (fixture) return fixture;
  const auth = await requireApiUser("CANDIDATE");
  if ("response" in auth) return auth.response;
  const parsed = await readBody(request, Body);
  if ("response" in parsed) return parsed.response;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await runChallengePipeline({ userId: auth.user.id, ...parsed.body }, (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)));
      } catch (err) {
        // runChallengePipeline reports its own failures; this is the last-resort guard.
        const message = ((await errorResponse(err).json()) as { error: string }).error;
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", message })}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
