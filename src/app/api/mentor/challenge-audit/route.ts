import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { taskApprovalRepo } from "@/lib/data/task-approval";
import {
  getChallengeFromRepository,
  registerChallengeInRepository,
} from "@/lib/engine/resolver";

export const dynamic = "force-dynamic";

const AuditBodySchema = z.object({
  challengeId: z.string(),
  version: z.number().int().positive().optional(),
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
 * Durably persists audit records and updates challenge version/eligibility.
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

    const { challengeId, version, scores, notes } = parsed.data;

    // Check challenge existence first (Row P07: unknown challenge returns 404 without recording audit)
    const existing = taskApprovalRepo.getChallenge(challengeId, version) ?? getChallengeFromRepository(challengeId);
    if (!existing) {
      return NextResponse.json({ error: `Challenge "${challengeId}" not found in repository` }, { status: 404 });
    }

    // Ensure challenge is registered in taskApprovalRepo
    taskApprovalRepo.registerChallenge(existing);

    const result = taskApprovalRepo.auditChallenge({
      challengeId,
      version,
      mentorId: user.id,
      mentorName: user.name,
      scores,
      notes,
      actorRole: user.role,
    });

    // Sync in-memory resolver repository
    registerChallengeInRepository(result.challenge);

    return NextResponse.json({
      evaluation: result.evaluation,
      auditRecord: result.auditRecord,
      challenge: result.challenge,
    });
  } catch (err: any) {
    console.error("[POST /api/mentor/challenge-audit] Error:", err);
    const statusCode = err?.statusCode || 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record audit" },
      { status: statusCode }
    );
  }
}
