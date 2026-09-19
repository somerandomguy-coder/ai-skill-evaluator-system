import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EvaluationRetry } from "@/components/workspace/evaluation-retry";
import { Workspace } from "@/components/workspace/workspace";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Build" };

export default async function BuildPage({ params }: PageProps<"/build/[sessionId]">) {
  const { sessionId } = await params;
  const user = await requireUser(`/build/${sessionId}`, "CANDIDATE");
  const workspace = await data.getWorkspace(sessionId);
  if (!workspace) notFound();

  // In demo/prototype mode or for seeded sessions, permit candidate exploration:
  const isDemoSession = sessionId.startsWith("seed-") || sessionId.startsWith("mock-");
  if (workspace.ownerId !== user.id && !isDemoSession && data.kind === "db") {
    notFound();
  }
  if (workspace.ownerId !== user.id && isDemoSession) {
    workspace.ownerId = user.id;
  }

  // Once submitted the workspace is closed; the report is what's left. If the
  // evaluation never finished, offer to run it again rather than stranding the work.
  if (workspace.status === "SUBMITTED") {
    if (workspace.evaluationId) redirect(`/report/${workspace.evaluationId}`);
    return <EvaluationRetry sessionId={sessionId} />;
  }

  return <Workspace workspace={workspace} />;
}
