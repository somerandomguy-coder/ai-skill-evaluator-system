"use server";

import { getCurrentUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { createShareCapability } from "@/lib/data/shares";

/** Create a revocable, employer-only link for an assessment owned by the caller. */
export async function createEmployerShare(evaluationId: string): Promise<string> {
  const viewer = await getCurrentUser();
  if (!viewer) throw new Error("Sign in to share an assessment.");

  const evaluation = await data.getEvaluation(evaluationId);
  if (!evaluation || evaluation.ownerId !== viewer.id) {
    throw new Error("Only the candidate who owns this assessment can share it.");
  }

  const { token } = await createShareCapability(evaluation.id, viewer.id, { expiresInDays: 30 });
  return `/report/${encodeURIComponent(evaluation.id)}/employer?share=${encodeURIComponent(token)}`;
}
