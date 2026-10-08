import { NextResponse } from "next/server";
import { z } from "zod";
import { inspectJobDescription } from "@/lib/ai/inspect-jd";

export const dynamic = "force-dynamic";

const Body = z.object({
  rawJd: z.string().max(30_000).default(""),
});

/**
 * POST /api/jd/inspect
 * Inspects a pasted job ad and returns:
 *   type: "good job ad" | "too vague" | "not a job ad"
 *   howSure: "86%"
 *   reason: "under 40 words and no skills listed"
 *   cheatingAttempt: "no" | "yes"
 */
export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 64 * 1024) {
      return NextResponse.json({ error: "Payload too large (max 64KB)" }, { status: 413 });
    }

    const json = await request.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid inspection request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const inspection = await inspectJobDescription(parsed.data.rawJd);
    return NextResponse.json({
      success: true,
      inspection,
      type: inspection.type,
      "how sure": inspection.howSure,
      howSure: inspection.howSure,
      reason: inspection.reason,
      "cheating attempt": inspection.cheatingAttempt,
      cheatingAttempt: inspection.cheatingAttempt,
      formatted: inspection.formatted,
    });
  } catch (err: any) {
    console.error("[POST /api/jd/inspect] Error:", err);
    return NextResponse.json(
      { error: "Failed to inspect job description" },
      { status: 500 }
    );
  }
}
