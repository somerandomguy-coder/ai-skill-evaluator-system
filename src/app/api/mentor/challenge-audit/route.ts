import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  evaluateMentorAudit,
  applyAuditToChallenge,
} from "@/lib/engine/verification";
import {
  getChallengeFromRepository,
  registerChallengeInRepository,
} from "@/lib/engine/resolver";

export const dynamic = "force-dynamic";

const AuditBodySchema = z.object({
  challengeId: z.string(),
  scores: z.object({
    realism: z.number().int().min(1).max(4),
    sfiaCalibration: z.number().int().min(1).max(4),
    trapEfficacy: z.number().int().min(1).max(4),
    observability: z.number().int().min(1).max(4),
    fairness: z.number().int().min(1).max(4),
  }),
  notes: z.string().max(1000).optional(),
});

/**
 * POST /api/mentor/challenge-audit
 * Audits a pending Tier 3 challenge across the 5 quality dimensions.
 * Promotes to Tier 1 when total >= 16/20 and all dimensions >= 3.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "MENTOR") {
      return NextResponse.json({ error: "Unauthorized: Mentor access required" }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const parsed = AuditBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid audit payload", details: parsed.error.format() }, { status: 400 });
    }

    const { challengeId, scores, notes } = parsed.data;

    const evaluation = evaluateMentorAudit({
      challengeId,
      mentorId: user.id,
      mentorName: user.name,
      scores,
      notes,
    });

    const challenge = getChallengeFromRepository(challengeId);
    let updatedChallenge = null;
    if (challenge) {
      updatedChallenge = applyAuditToChallenge(challenge, evaluation);
      registerChallengeInRepository(updatedChallenge);
    }

    return NextResponse.json({
      evaluation,
      challenge: updatedChallenge,
    });
  } catch (err) {
    console.error("[POST /api/mentor/challenge-audit] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record audit" },
      { status: 500 }
    );
  }
}
