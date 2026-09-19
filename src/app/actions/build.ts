"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/data";

/** "Start building": open (or resume) a workspace session on a challenge. */
export async function startBuild(challengeId: string) {
  const user = await requireUser(`/challenge/${challengeId}`, "CANDIDATE");
  const sessionId = await data.startSession(challengeId, user.id);
  redirect(`/build/${sessionId}`);
}
