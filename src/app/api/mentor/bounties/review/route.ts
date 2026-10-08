import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { submitRequirementReview } from "@/lib/engine/requirement-bounty";

export const dynamic = "force-dynamic";

const ReviewBodySchema = z.object({
  requirementId: z.string().min(1),
  action: z.enum(["VERIFY", "FLAG_DUPLICATE", "FLAG_BAD"]),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  duplicateOfId: z.string().max(100).optional(),
});

/**
 * POST /api/mentor/bounties/review
 * Mentors review and verify requirements, claim bounties, or flag bad/duplicates.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (user.role !== "MENTOR") {
      return NextResponse.json({ error: "Forbidden: Mentor access required" }, { status: 403 });
    }

    // B01 / P02: Disable bounty endpoints until the full policy is enforced
    return NextResponse.json(
      { error: "Bounty endpoints are disabled pending policy enforcement" },
      { status: 403 }
    );
  } catch (err: any) {
    console.error("[POST /api/mentor/bounties/review] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit review", details: err?.message },
      { status: 500 }
    );
  }
}
