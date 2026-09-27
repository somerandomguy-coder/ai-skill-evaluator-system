import { NextResponse } from "next/server";
import { queryChallengesBySfia, getSfiaBankStats, type ImportanceLevel } from "@/lib/services/sfia-query";

export const dynamic = "force-dynamic";

/**
 * GET /api/challenges/search
 * Queries the challenge and requirement bank by SFIA 9 skills, levels, company, and importance.
 *
 * Query Params:
 * - company: string (e.g. "Canva", "Stripe")
 * - role: string (e.g. "Frontend", "Backend", "Full-Stack")
 * - skill: string (e.g. "PROG", "DESN", "TEST", "DBDS", "ITOP", "DATA")
 * - level: number (2, 3, 4)
 * - importance: "CRITICAL" | "CORE" | "STANDARD" | "ALL"
 * - stats: boolean ("true" to return bank aggregate statistics)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    if (searchParams.get("stats") === "true") {
      const stats = await getSfiaBankStats();
      return NextResponse.json(stats, { status: 200 });
    }

    const company = searchParams.get("company") ?? undefined;
    const role = searchParams.get("role") ?? undefined;
    const skill = searchParams.get("skill") ?? undefined;
    const levelStr = searchParams.get("level");
    const level = levelStr ? parseInt(levelStr, 10) : undefined;
    const importance = (searchParams.get("importance") as ImportanceLevel) ?? undefined;
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 50;

    const challenges = await queryChallengesBySfia({
      company,
      role,
      skill,
      level,
      importance,
      limit,
    });

    return NextResponse.json(
      {
        count: challenges.length,
        filters: { company, role, skill, level, importance },
        challenges,
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[GET /api/challenges/search] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to query SFIA challenge bank" },
      { status: 500 }
    );
  }
}
