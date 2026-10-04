import { z } from "zod";
import { errorResponse, fixtureModeResponse, json, readBody, requireApiUser } from "@/lib/api";
import { sendMessage, sendMessageStream } from "@/lib/services/sessions";

// A whole-file rewrite from the model can take a while.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const Body = z.object({
  message: z.string().max(10_000).default(""),
  retry: z.boolean().optional(),
  stream: z.boolean().optional(),
  mode: z.enum(["ASK", "CODE"]).optional(),
});

/**
 * POST { message, retry?, stream?, mode? } -> { turns, writes, notes } or SSE stream.
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

  const wantsStream =
    parsed.body.stream ||
    request.headers.get("accept")?.includes("text/event-stream") ||
    new URL(request.url).searchParams.get("stream") === "true";

  if (wantsStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await sendMessageStream(
            { sessionId, userId: auth.user.id, message: parsed.body.message, retry: parsed.body.retry, mode: parsed.body.mode },
            (event) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
          );
          controller.close();
        } catch (err: any) {
          const message = err?.message || "An error occurred while answering.";
          const retryable = Boolean(err?.retryable);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message, retryable })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  }

  try {
    return json(await sendMessage({ sessionId, userId: auth.user.id, message: parsed.body.message, retry: parsed.body.retry, mode: parsed.body.mode }));
  } catch (err) {
    return errorResponse(err);
  }
}
