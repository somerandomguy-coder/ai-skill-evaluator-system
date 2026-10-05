import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { data } from "@/lib/data";
import { EmployerDeck } from "@/components/report/employer-deck";

export const metadata: Metadata = {
  title: "Candidate Decision Dossier · For Hiring Managers",
};

export default async function EmployerReportPage({
  params,
}: PageProps<"/report/[id]/employer">) {
  const { id } = await params;
  if (id.startsWith("seed-")) {
    redirect("/");
  }
  const ev = await data.getEvaluation(id);
  if (!ev) notFound();

  const candidateName = ev.candidateName ?? "Candidate";

  return (
    <main className="w-full min-h-screen bg-surface flex flex-col justify-center">
      <EmployerDeck evaluation={ev} candidateName={candidateName} />
    </main>
  );
}
