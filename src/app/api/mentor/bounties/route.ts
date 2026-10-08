import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBountyRequirements, getMentorBountyStats } from "@/lib/engine/requirement-bounty";

export const dynamic = "force-dynamic";

/**
 * GET /api/mentor/bounties
 * Fetches requirement bounties with filtering and mentor stats.
 */
export async function GET(request: Request) {
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
    console.error("[GET /api/mentor/bounties] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch requirement bounties", details: err?.message },
      { status: 500 }
    );
  }
}
