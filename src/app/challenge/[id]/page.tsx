import { Briefcase, Clock, ExternalLink, Info, ListChecks, Tag, Sparkles, Terminal, Shield } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobCard, NotAssessedCard, StartCard } from "@/components/challenge/aside";
import { Rubric } from "@/components/challenge/rubric";
import { PageShell, SectionTitle } from "@/components/common/layout";
import { Markdown } from "@/components/common/markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { formatTimebox } from "@/lib/format";

export const metadata: Metadata = { title: "Your challenge" };

export default async function ChallengePage({ params, searchParams }: PageProps<"/challenge/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [challenge, user] = await Promise.all([data.getChallenge(id), getCurrentUser()]);
  if (!challenge) notFound();
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
                Step 2 of 4 · Challenge Brief & Visible Rubric
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container border border-border text-muted-foreground">
                2-Tier Protocol: Product 4D + Zero Trust AIED
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
              <span className="inline-flex items-center gap-1.5">
                <Terminal className="size-3.5" aria-hidden />
                5 AI Usage Criteria (Barron)
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
              eyebrow="Zero secret criteria"
              title="The 2-tier rubric you'll be scored against"
              description="Review both Suite A (Product Technical Architecture) and Suite B (AI Prompt & Process Usage). Every score cites exact transcript turns."
            />
            <Rubric requirements={challenge.requirements} />
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
