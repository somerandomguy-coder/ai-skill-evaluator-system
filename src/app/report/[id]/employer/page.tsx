import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EmployerDeck } from "@/components/report/employer-deck";
import { EmployerShareView } from "@/components/report/employer-share-view";
import { getCurrentUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { toEmployerReportDto } from "@/lib/data/employer-dto";
import { resolveShareCapability } from "@/lib/data/shares";

export const metadata: Metadata = {
  title: "Candidate Decision Dossier · For Hiring Managers",
};

/**
 * Owners and mentors may inspect the private internal deck. An employer must
 * present a valid opaque capability and receives only the minimised DTO.
 */
export default async function EmployerReportPage({
  params,
  searchParams,
}: PageProps<"/report/[id]/employer">) {
  const { id } = await params;
  if (id.startsWith("seed-")) redirect("/");

  const [evaluation, viewer, query] = await Promise.all([
    data.getEvaluation(id),
    getCurrentUser(),
    searchParams,
  ]);
  if (!evaluation) notFound();

  if (viewer?.id === evaluation.ownerId || viewer?.role === "MENTOR") {
    return (
      <main className="w-full min-h-screen bg-surface flex flex-col justify-center">
        <EmployerDeck evaluation={evaluation} candidateName={evaluation.candidateName ?? "Candidate"} />
      </main>
    );
  }

  const rawShare = query.share;
  const share = Array.isArray(rawShare) ? rawShare[0] : rawShare;
  if (!share) notFound();
  const resolved = await resolveShareCapability(share);
  if (resolved.status !== "VALID" || resolved.capability.evaluationId !== evaluation.id) notFound();

  return <EmployerShareView report={toEmployerReportDto(evaluation, resolved.capability)} />;
}
