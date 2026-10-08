import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/common/layout";
import { ReportView } from "@/components/report/report-view";
import { getCurrentUser } from "@/lib/auth";
import { data } from "@/lib/data";

import { resolveShareCapability } from "@/lib/data/shares";

export const metadata: Metadata = { title: "Assessment report" };

/** Owner and mentor see private report; others require a valid share token. */
export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ share?: string }>;
}) {
  const { id } = await params;
  if (id.startsWith("seed-")) {
    redirect("/");
  }
  const [evaluation, viewer] = await Promise.all([data.getEvaluation(id), getCurrentUser()]);
  if (!evaluation) notFound();

  const isOwner = viewer && viewer.id === evaluation.ownerId;
  const isMentor = viewer && viewer.role === "MENTOR";

  if (isOwner || isMentor) {
    return (
      <PageShell width="5xl">
        <ReportView evaluation={evaluation} viewer={viewer} />
      </PageShell>
    );
  }

  const sp = searchParams ? await searchParams : {};
  const share = Array.isArray(sp.share) ? sp.share[0] : sp.share;
  if (share) {
    const res = await resolveShareCapability(share);
    if (res.status === "VALID" && res.capability.evaluationId === evaluation.id) {
      // A share grant is for the minimised employer dossier, never the private
      // report component that includes transcript and workspace evidence.
      redirect(`/report/${encodeURIComponent(evaluation.id)}/employer?share=${encodeURIComponent(share)}`);
    }
  }

  // Cross-owner or anonymous visitor without share token is denied
  redirect(`/login?error=forbidden&next=${encodeURIComponent(`/report/${id}`)}`);
}
