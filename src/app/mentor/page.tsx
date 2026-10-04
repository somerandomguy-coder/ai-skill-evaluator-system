import type { Metadata } from "next";
import { PageShell } from "@/components/common/layout";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { MentorConsoleTabs } from "@/components/mentor/mentor-console-tabs";

export const metadata: Metadata = { title: "Mentor Console" };

export default async function MentorQueuePage() {
  const user = await requireUser("/mentor", "MENTOR");
  const [queue, reviewed] = await Promise.all([data.getQueue(), data.countReviewed()]);

  return (
    <PageShell width="5xl" className="space-y-8 py-6">
      <header className="space-y-2">
        <div className="text-xs font-semibold tracking-wider text-primary/80 uppercase">
          Accredited Mentor Console
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Quality Assurance &amp; Review Hub</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Two primary responsibilities: audit and verify rubric criteria against Australian industry standards, or inspect and re-score AI evaluations for candidate submissions.
        </p>
      </header>

      <MentorConsoleTabs user={user} queue={queue} reviewed={reviewed} />
    </PageShell>
  );
}
