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
    const mentorId = user.id;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const employer = searchParams.get("employer") || undefined;
    const sfiaLevelParam = searchParams.get("sfiaLevel");
    const sfiaLevel = sfiaLevelParam ? parseInt(sfiaLevelParam, 10) : undefined;

    const data = getBountyRequirements({
      query,
      category,
      status,
      employer,
      sfiaLevel,
    });

    const stats = getMentorBountyStats(mentorId);

    return NextResponse.json({
      success: true,
      items: data.items,
      totalCount: data.totalCount,
      categories: data.categories,
      employers: data.employers,
      stats,
    });
  } catch (err: any) {
    console.error("[GET /api/mentor/bounties] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch requirement bounties", details: err?.message },
      { status: 500 }
    );
  }
}
