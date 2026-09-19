import { ArrowLeft, EyeOff, ListChecks, ShieldAlert, Sparkles, Terminal, CheckCircle2, Award } from "lucide-react";
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
  const suiteB = ev.suiteB;

  return (
    <PageShell width="7xl" className="space-y-6 py-6">
      <div className="flex items-center justify-between">
        <Link href="/mentor" className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          <span>← Back to Review Queue</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/report/${ev.id}/credential`}
            className="text-xs font-mono text-primary underline underline-offset-2 flex items-center gap-1 hover:text-primary/80"
          >
            <Award className="size-3.5" />
            <span>View Candidate Dossier</span>
          </Link>
        </div>
      </div>

      <header className="space-y-2 pb-4 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold tracking-wide text-primary">
            Submission #{shortId(ev.id)}
          </span>
          <Badge variant="outline" className="gap-1 font-mono text-[10px] rounded">
            <EyeOff className="size-3" aria-hidden />
            Blind Review: Identity Masked
          </Badge>
          {ev.reviewStatus === "REVIEWED" && (
            <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[10px] rounded">
              Status: Reviewed &amp; Attested
            </Badge>
          )}
          {ev.reviewStatus === "PENDING" && (
            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] rounded">
              Status: Escalated to Human Mentor (2–3 Day SLA)
            </Badge>
          )}
        </div>
        <h1 className="max-w-4xl text-2xl font-bold tracking-tight text-primary sm:text-3xl text-balance">
          {ev.challenge.title}
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          {ev.job.roleTitle} at {ev.job.employer} · submitted {timeAgo(ev.createdAt)} · session {formatMinutes(ev.durationMinutes)} of {formatTimebox(ev.challenge.timeboxMinutes)} · protocol {ev.challenge.rubricVersion}
        </p>
      </header>

      <EvidenceProvider>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          {/* Left: Escalation reasons + Student Work Explorer (Transcript + Files + 2-Tier AI Evaluation) */}
          <div className="min-w-0 space-y-6">
            <EscalationPanel reasons={ev.escalation} contestReason={ev.contested ? ev.contestReason : null} />

            <EvidenceExplorer
              turns={ev.turns}
              files={ev.files}
              bodyClassName="h-[46rem]"
              extraTabs={[
                {
                  value: "ai-prompt-rubric",
                  label: "Suite B: AI Usage (Barron)",
                  icon: <Terminal className="size-3.5" aria-hidden />,
                  content: (
                    <div className="space-y-4 p-4 text-xs">
                      <div className="p-3 bg-surface-container-low rounded border border-border flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[11px] font-bold text-primary uppercase block">
                            Process-Focused Prompt Rubric (Zero Trust AIED)
                          </span>
                          <p className="text-muted-foreground text-[11px] mt-0.5">
                            Assesses candidate&apos;s steering agency, planted flaw detection, and boundary maintenance.
                          </p>
                        </div>
                        <span className="font-mono text-sm font-bold text-primary">
                          {suiteB ? `${suiteB.score}/25` : `${Math.round((ev.overallScore / 100) * 25)}/25`}
                        </span>
                      </div>

                      {suiteB && (
                        <div className="space-y-3">
                          {suiteB.criteria.map((c) => (
                            <div key={c.criterion} className="bg-surface-container-lowest p-3 rounded border border-border space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-primary text-xs">{c.label}</span>
                                <span className="font-mono font-bold text-primary text-xs">{c.score}/5</span>
                              </div>
                              <p className="text-muted-foreground text-[11px]">{c.rationale}</p>
                              {c.evidenceQuotes.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-border">
                                  <span className="font-mono text-[10px] text-primary font-semibold uppercase">Cited Transcript Quote:</span>
                                  {c.evidenceQuotes.map((q, idx) => (
                                    <p key={idx} className="font-mono text-[11px] bg-surface-container-low p-1.5 rounded border border-border text-foreground">
                                      &ldquo;{q}&rdquo;
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  value: "evaluation",
                  label: "Suite A: Technical Requirements",
                  icon: <ListChecks className="size-3.5" aria-hidden />,
                  content: (
                    <div className="space-y-4 p-4 text-xs">
                      <p className="text-muted-foreground text-[11px]">
                        Every citation links to exact transcript turns or file trees. Unscorable items are flagged null for human adjudication.
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

          {/* Right: Mentor Decision Form & Summary Stats */}
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <ReviewForm
              evaluationId={ev.id}
              aiScore={ev.overallScore}
              hasAiScores={hasAiScores}
              reviewedBefore={ev.reviewStatus === "REVIEWED"}
            />

            <Card className="rounded border border-border bg-surface-container-lowest">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  {hasAiScores ? (
                    <ScoreRing score={ev.overallScore} size={88} stroke={8} caption="AI score" />
                  ) : (
                    <div className="grid size-22 shrink-0 place-items-center rounded-full border-[6px] border-dashed border-border text-center text-xs text-muted-foreground font-mono">
                      Not scored
                    </div>
                  )}
                  <dl className="space-y-1 text-xs font-mono flex-1">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Coverage</dt>
                      <dd className="font-bold text-primary">{Math.round(ev.coverage * 100)}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Confidence</dt>
                      <dd className="font-bold text-primary">{ev.confidence.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Turns Logged</dt>
                      <dd className="font-bold text-primary">{ev.turns.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Files Written</dt>
                      <dd className="font-bold text-primary">{ev.files.length}</dd>
                    </div>
                  </dl>
                </div>

                {suiteB && (
                  <div className="pt-3 border-t border-border space-y-1 text-xs">
                    <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground">Audit Flags</span>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                      <div className="flex justify-between bg-surface-container-low p-1.5 rounded border border-border">
                        <span className="text-muted-foreground">flaw_caught</span>
                        <span className="font-bold text-primary">{suiteB.flags.flaw_caught ? "TRUE" : "FALSE"}</span>
                      </div>
                      <div className="flex justify-between bg-surface-container-low p-1.5 rounded border border-border">
                        <span className="text-muted-foreground">scope_resisted</span>
                        <span className="font-bold text-primary">{suiteB.flags.scope_creep_resisted ? "TRUE" : "FALSE"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </EvidenceProvider>
    </PageShell>
  );
}
