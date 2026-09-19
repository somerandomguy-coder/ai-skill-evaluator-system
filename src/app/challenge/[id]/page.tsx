import { ArrowRight, Briefcase, Clock, ExternalLink, Info, ListChecks, Tag, Sparkles, Terminal, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JobCard, NotAssessedCard, StartCard } from "@/components/challenge/aside";
import { Rubric } from "@/components/challenge/rubric";
import { StartBuildButton } from "@/components/challenge/start-button";
import { PageShell, SectionTitle } from "@/components/common/layout";
import { Markdown } from "@/components/common/markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { prisma } from "@/lib/db";
import { formatTimebox } from "@/lib/format";

export const metadata: Metadata = { title: "Your challenge" };

export default async function ChallengePage({ params, searchParams }: PageProps<"/challenge/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [challenge, user] = await Promise.all([data.getChallenge(id), getCurrentUser()]);
  if (!challenge) notFound();

  // If candidate already started building this challenge, prevent going backwards:
  // immediately redirect them into their active workspace or submitted report.
  if (user?.id) {
    let targetRedirect: string | null = null;
    try {
      const existingSession = await prisma.buildSession.findFirst({
        where: { challengeId: challenge.id, userId: user.id },
        orderBy: { startedAt: "desc" },
        select: { id: true, status: true, evaluation: { select: { id: true } } },
      });
      if (existingSession) {
        if (existingSession.status === "ACTIVE") {
          targetRedirect = `/build/${existingSession.id}`;
        } else if (existingSession.evaluation?.id) {
          targetRedirect = `/report/${existingSession.evaluation.id}`;
        }
      }
    } catch (err) {
      console.warn("[ChallengePage] Session lookup warning:", err);
    }
    if (targetRedirect) {
      redirect(targetRedirect);
    }
  }

  const { job, research } = challenge;

  return (
    <PageShell width="7xl" className="py-8">
      {sp.from === "demo-fallback" && (
        <Alert className="mb-6 rounded border border-border bg-surface-container-low">
          <Info aria-hidden />
          <AlertTitle>Seeded Prototype Assessment Loaded</AlertTitle>
          <AlertDescription>
            Live AI calls are turned off in demo mode. You are viewing the fully verified Culture Amp People Intelligence benchmark challenge.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="min-w-0 space-y-10">
          <header className="space-y-3 pb-6 border-b border-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase px-2.5 py-0.5 bg-primary text-white rounded font-semibold tracking-wider">
                Step 2 of 4 · Challenge Brief & Requirements
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container border border-border text-muted-foreground">
                4D Product Lifecycle Architecture
              </span>
            </div>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-primary sm:text-4xl text-balance">
              {challenge.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono pt-1">
              <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                <Briefcase className="size-3.5" aria-hidden />
                {job.roleTitle} at {job.employer}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden />
                {formatTimebox(challenge.timeboxMinutes)}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="size-3.5" aria-hidden />
                {challenge.requirements.length} Technical Requirements
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <Shield className="size-3.5" aria-hidden />
                Transparent Rubric
              </span>
            </div>
          </header>

          <section id="context" className="space-y-3">
            <SectionTitle eyebrow="Context" title={`About ${job.employer}`} />
            <p className="max-w-3xl text-sm leading-relaxed text-foreground/90">{challenge.domainContext}</p>
            <Card className="rounded border border-border bg-surface-container-lowest">
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="leading-relaxed text-muted-foreground">{research.whatTheyDo}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground pt-1 border-t border-border">
                  {research.groundedInSearch ? (
                    <>
                      <span className="font-semibold text-primary">Sources:</span>
                      {research.sources.map((s) => (
                        <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                          {s.title.replace(/\s+[—-]\s+Culture Amp.*$/i, "")}
                          <ExternalLink className="size-2.5" aria-hidden />
                        </a>
                      ))}
                    </>
                  ) : (
                    <span>Source: Verified company posting mandate</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="brief" className="space-y-3">
            <SectionTitle eyebrow="The brief" title="Project Specification & Boundaries" />
            <Card className="rounded border border-border bg-surface-container-lowest">
              <CardContent className="p-6">
                <Markdown>{challenge.brief}</Markdown>
              </CardContent>
            </Card>
          </section>

          <section id="rubric" className="space-y-4">
            <SectionTitle
              eyebrow="Transparent evaluation"
              title="Project Requirements & Assessment Framework"
              description="Review the technical criteria and success signals. Everything you build and discuss with the AI is evaluated against this framework."
            />
            <Rubric requirements={challenge.requirements} />
          </section>

          {/* Bottom CTA for candidates who naturally scroll down to read the full rubric */}
          <section id="start-cta" className="rounded-xl border border-primary/25 bg-surface-container-low p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Ready to start building?</h2>
                <p className="text-sm text-muted-foreground">
                  Your workspace opens with an AI pair-programming assistant on the left and a live application preview on the right.
                </p>
              </div>
              <div className="w-full sm:w-auto shrink-0">
                {user?.role === "CANDIDATE" ? (
                  <StartBuildButton challengeId={challenge.id} className="w-full sm:w-auto gap-2 px-6" size="lg" />
                ) : user ? (
                  <div className="rounded-lg bg-muted px-4 py-2 text-xs text-muted-foreground">
                    Mentor accounts cannot start builds
                  </div>
                ) : (
                  <Link
                    href={`/login?next=${encodeURIComponent(`/challenge/${challenge.id}`)}`}
                    className={buttonVariants({ size: "lg", className: "w-full sm:w-auto gap-2 px-6" })}
                  >
                    <span>Sign in to start</span>
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )}
              </div>
            </div>
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <StartCard challenge={challenge} user={user} />
          <NotAssessedCard challenge={challenge} />
          <JobCard challenge={challenge} />
        </aside>
      </div>
    </PageShell>
  );
}
