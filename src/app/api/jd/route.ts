import { z } from "zod";
import { errorResponse, fixtureModeResponse, readBody, requireApiUser } from "@/lib/api";
import { runChallengePipeline } from "@/lib/services/challenge-pipeline";
import { hasExceededGenerationQuota } from "@/app/api/challenge/generate/route";

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

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64 * 1024) {
    return new Response(JSON.stringify({ error: "Payload too large (max 64KB)" }), {
      status: 413,
      headers: { "content-type": "application/json" },
    });
  }

  const auth = await requireApiUser("CANDIDATE");
  if ("response" in auth) return auth.response;

  if (hasExceededGenerationQuota(auth.user.id)) {
    return new Response(
      JSON.stringify({ error: "Generation quota exceeded. Please wait before generating another challenge." }),
      { status: 429, headers: { "content-type": "application/json" } }
    );
  }

  const parsed = await readBody(request, Body);
  if ("response" in parsed) return parsed.response;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let isClosed = false;
      const safeEnqueue = (event: unknown) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          isClosed = true;
        }
      };

      try {
        await runChallengePipeline(
          { userId: auth.user.id, userName: auth.user.name, userEmail: auth.user.email, ...parsed.body },
          safeEnqueue
        );
      } catch (err) {
        // runChallengePipeline reports its own failures; this is the last-resort guard.
        if (!isClosed) {
          try {
            const message = ((await errorResponse(err).json()) as { error: string }).error;
            safeEnqueue({ type: "error", message });
          } catch {
            isClosed = true;
          }
        }
      } finally {
        if (!isClosed) {
          try {
            controller.close();
          } catch {
            isClosed = true;
          }
        }
      }
    },
    cancel() {
      // Stream aborted by client
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
