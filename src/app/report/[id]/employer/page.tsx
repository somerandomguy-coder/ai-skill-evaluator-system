import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { EmployerDeck } from "@/components/report/employer-deck";

export const metadata: Metadata = {
  title: "Candidate Decision Dossier · For Hiring Managers",
};

export default async function EmployerReportPage({
  params,
}: PageProps<"/report/[id]/employer">) {
  const { id } = await params;
  const ev = await data.getEvaluation(id);
  if (!ev) notFound();

  const isStrong = ev.overallScore >= 80;
  const candidateName =
    ev.candidateName ?? (isStrong ? "Alex Vance" : "Candidate #" + id.slice(0, 8));

  return (
    <main className="w-full min-h-screen bg-surface flex flex-col justify-center">
      <EmployerDeck evaluation={ev} candidateName={candidateName} />
    </main>
  );
}
