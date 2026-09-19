import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Workspace } from "@/components/workspace/workspace";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Build" };

export default async function BuildPage({ params }: PageProps<"/build/[sessionId]">) {
  const { sessionId } = await params;
  const user = await requireUser(`/build/${sessionId}`, "CANDIDATE");
  const workspace = await data.getWorkspace(sessionId);
  // Someone else's workspace looks the same as one that doesn't exist.
  if (!workspace || workspace.ownerId !== user.id) notFound();
  // Once submitted the workspace is closed; the report is what's left.
  if (workspace.status === "SUBMITTED") redirect(workspace.evaluationId ? `/report/${workspace.evaluationId}` : "/");

  return <Workspace workspace={workspace} />;
}
