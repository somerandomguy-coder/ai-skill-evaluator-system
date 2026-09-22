import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveChallenge } from "@/lib/engine/resolver";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const GenerateBodySchema = z.object({
  rawJd: z.string().min(20, "Job description must be at least 20 characters").max(30_000),
  companyName: z.string().max(100).optional().default("Australian Technology Enterprise"),
});

/**
 * POST /api/challenge/generate
 * Resolves an incoming Job Description through the 3-Tier Challenge Hierarchy.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsed = GenerateBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { rawJd, companyName } = parsed.data;
    const result = await resolveChallenge(rawJd, companyName);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("[POST /api/challenge/generate] Error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to resolve challenge",
      },
      { status: 500 }
    );
  }
}
