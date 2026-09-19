import { ArrowRight, Briefcase, ChevronRight, Clock, ExternalLink, Eye, FileText, Info, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JobCard, NotAssessedCard, StartCard } from "@/components/challenge/aside";
import { Rubric } from "@/components/challenge/rubric";
import { StartBuildButton } from "@/components/challenge/start-button";
import { PageShell } from "@/components/common/layout";
import { Markdown } from "@/components/common/markdown";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { prisma } from "@/lib/db";
import { formatTimebox } from "@/lib/format";
import type { CSSProperties } from "react";

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

/** Generated titles run long; show the leading clause and keep the full text in the tooltip. */
function shortTitle(title: string): string {
  const head = title.split(/[:–—]/)[0].trim();
  const words = (head || title).split(/\s+/);
  return words.length > 8 ? `${words.slice(0, 8).join(" ")}…` : head || title;
}

/** A short lead line; the full context sits behind a disclosure. */
const LEAD_WORDS = 20;
function splitContext(text: string): { lead: string; rest: string } {
  const sentence = text.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0].trim() ?? text;
  const words = sentence.split(/\s+/);
  if (words.length > LEAD_WORDS) return { lead: `${words.slice(0, LEAD_WORDS).join(" ")}…`, rest: text };
  const rest = text.slice(sentence.length).trim();
  return { lead: sentence, rest };
}

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
  const context = splitContext(challenge.domainContext);
  const facts = [
    { icon: Clock, label: formatTimebox(challenge.timeboxMinutes) },
    { icon: ListChecks, label: `${challenge.requirements.length} requirements` },
    { icon: Eye, label: "Rubric visible" },
  ];

  return (
    <PageShell width="7xl" className={user?.role === "CANDIDATE" ? "pt-8 pb-28 sm:pt-12 lg:pb-12" : "py-8 sm:py-12"}>
      {sp.from === "demo-fallback" && (
        <Alert className="mb-8 rounded-xl border-border bg-card">
          <Info aria-hidden />
          <AlertTitle>Cached benchmark challenge</AlertTitle>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12">
        <article className="min-w-0 space-y-12">
          <header className="space-y-5">
            <p className="rise flex items-center gap-2 text-[13px] font-medium text-muted-foreground" style={stagger(0)}>
              <Briefcase className="size-3.5" aria-hidden />
              {job.roleTitle} at {job.employer}
            </p>
            <h1 className="rise font-display max-w-3xl text-4xl text-balance sm:text-5xl" style={stagger(1)} title={challenge.title}>
              {shortTitle(challenge.title)}
            </h1>
            <ul className="rise flex flex-wrap gap-2" style={stagger(2)}>
              {facts.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[13px] font-medium">
                  <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                  {label}
                </li>
              ))}
              <li className="tabular inline-flex items-center rounded-full px-2 py-1 font-mono text-xs text-muted-foreground">{challenge.rubricVersion}</li>
            </ul>
          </header>

          <section id="context" aria-label={`Context for ${job.employer}`} className="space-y-3">
            <p className="max-w-[68ch] text-[15px] leading-relaxed text-pretty text-foreground/85">{context.lead}</p>
            {context.rest && (
              <details className="group/context max-w-[68ch]">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-3.5 transition-transform duration-200 group-open/context:rotate-90" aria-hidden />
                  More context
                </summary>
                <p className="slide-in mt-2 leading-relaxed text-pretty text-muted-foreground">{context.rest}</p>
              </details>
            )}
            <div className="max-w-[68ch]">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {research.groundedInSearch ? (
                  research.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex max-w-full items-center gap-1 rounded-md bg-card px-2 py-1 text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
                    >
                      <span className="truncate">{s.title.replace(/\s+[—-]\s+Culture Amp.*$/i, "")}</span>
                      <ExternalLink className="size-3 shrink-0" aria-hidden />
                    </a>
                  ))
                ) : (
                  <span className="text-muted-foreground">Source: the job posting</span>
                )}
              </div>
            </div>
          </section>

          <section id="brief" aria-labelledby="brief-h" className="space-y-4">
            <h2 id="brief-h" className="font-title text-xl">
              The brief
            </h2>
            {/* Framed like an open file: the brief is the spec you build against. */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border bg-surface-container-low px-4 py-2.5 font-mono text-xs text-muted-foreground">
                <FileText className="size-3.5 text-signal" aria-hidden />
                brief.md
              </div>
              <div className="p-5 sm:p-7">
                <Markdown className="max-w-[72ch]">{challenge.brief}</Markdown>
              </div>
            </div>
          </section>

          <section id="rubric" aria-labelledby="rubric-h" className="space-y-4">
            <h2 id="rubric-h" className="font-title text-xl">
              How you&apos;re scored
            </h2>
            <Rubric requirements={challenge.requirements} />
          </section>

          <section id="start-cta" className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-title text-lg">Ready to build?</h2>
            <div className="w-full shrink-0 sm:w-auto">
              {user?.role === "CANDIDATE" ? (
                <StartBuildButton challengeId={challenge.id} className="sm:w-auto" />
              ) : user ? (
                <div className="rounded-lg bg-muted px-4 py-2 text-[13px] text-muted-foreground">Candidates only</div>
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent(`/challenge/${challenge.id}`)}`}
                  className={buttonVariants({ variant: "signal", size: "xl", className: "w-full sm:w-auto" })}
                >
                  Sign in to start
                  <ArrowRight aria-hidden />
                </Link>
              )}
            </div>
          </section>
        </article>

        <aside className="rise space-y-4 lg:sticky lg:top-20 lg:self-start" style={stagger(2)}>
          <StartCard challenge={challenge} user={user} />
          <NotAssessedCard challenge={challenge} />
          <JobCard challenge={challenge} />
        </aside>
      </div>

      {/* Phones: the next step stays in reach while reading the brief. */}
      {user?.role === "CANDIDATE" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <StartBuildButton challengeId={challenge.id} />
        </div>
      )}
    </PageShell>
  );
}
