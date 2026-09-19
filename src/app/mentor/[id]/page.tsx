import { ArrowLeft, EyeOff, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreRing } from "@/components/common/score";
import { PageShell } from "@/components/common/layout";
import { EvidenceProvider } from "@/components/evidence/evidence-context";
import { EvidenceExplorer } from "@/components/evidence/explorer";
import { EscalationPanel } from "@/components/mentor/escalation-panel";
import { ReviewForm } from "@/components/mentor/review-form";
import { RequirementResultCard } from "@/components/report/requirement-result";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { formatMinutes, formatTimebox, shortId, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Review a submission" };

export default async function MentorReviewPage({ params }: PageProps<"/mentor/[id]">) {
  const { id } = await params;
  await requireUser(`/mentor/${id}`, "MENTOR");
  const ev = await data.getEvaluation(id);
  if (!ev) notFound();

  const hasAiScores = ev.results.some((r) => r.score !== null);

  return (
    <PageShell width="7xl" className="space-y-6">
      <Link href="/mentor" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Review queue
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium tracking-wide">Submission #{shortId(ev.id)}</span>
          <Badge variant="outline" className="gap-1">
            <EyeOff className="size-3" aria-hidden />
            Blind review
          </Badge>
          {ev.source !== "ai" && <Badge variant="outline">{ev.source === "demo-offline" ? "demo · no AI evaluation" : "demo data"}</Badge>}
          {ev.reviewStatus === "REVIEWED" && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Already reviewed</Badge>}
        </div>
        <h1 className="max-w-4xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{ev.challenge.title}</h1>
        <p className="text-sm text-muted-foreground">
          {ev.job.roleTitle} at {ev.job.employer} · submitted {timeAgo(ev.createdAt)} · session {formatMinutes(ev.durationMinutes)} of about {formatTimebox(ev.challenge.timeboxMinutes)} · rubric {ev.challenge.rubricVersion}
        </p>
      </header>

      <EvidenceProvider>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="min-w-0 space-y-6">
            <EscalationPanel reasons={ev.escalation} contestReason={ev.contested ? ev.contestReason : null} />
            <EvidenceExplorer
              turns={ev.turns}
              files={ev.files}
              bodyClassName="h-[44rem]"
              extraTabs={[
                {
                  value: "evaluation",
                  label: "AI evaluation",
                  icon: <ListChecks aria-hidden />,
                  content: (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Every citation is clickable and opens the exact turn or file. Requirements the AI could not score are shown as such: nothing was guessed.
                      </p>
                      {ev.results.map((r) => (
                        <RequirementResultCard key={r.requirementId} result={r} />
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </div>

          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <ReviewForm evaluationId={ev.id} aiScore={ev.overallScore} hasAiScores={hasAiScores} reviewedBefore={ev.reviewStatus === "REVIEWED"} />
            <Card size="sm">
              <CardContent className="flex items-center gap-4">
                {hasAiScores ? (
                  <ScoreRing score={ev.overallScore} size={96} stroke={9} caption="AI score" />
                ) : (
                  <div className="grid size-24 shrink-0 place-items-center rounded-full border-[9px] border-dashed border-muted text-center text-xs text-muted-foreground">Not scored</div>
                )}
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-6">
                    <dt className="text-muted-foreground">Coverage</dt>
                    <dd className="tabular font-medium">{Math.round(ev.coverage * 100)}%</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-muted-foreground">Confidence</dt>
                    <dd className="tabular font-medium">{ev.confidence.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-muted-foreground">Turns</dt>
                    <dd className="tabular font-medium">{ev.turns.length}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </aside>
        </div>
      </EvidenceProvider>
    </PageShell>
  );
}
