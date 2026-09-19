import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/common/layout";
import { ReportView } from "@/components/report/report-view";
import { getCurrentUser } from "@/lib/auth";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Assessment report" };

/** Public and read-only: the link is what an employer is sent. Only the candidate sees the contest control. */
export default async function ReportPage({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;
  const [evaluation, viewer] = await Promise.all([data.getEvaluation(id), getCurrentUser()]);
  if (!evaluation) notFound();

  return (
    <PageShell width="5xl">
      <ReportView evaluation={evaluation} viewer={viewer} />
    </PageShell>
  );
}
