import { Briefcase, Clock, ExternalLink, Info, ListChecks, Tag } from "lucide-react";
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
    <PageShell>
      {sp.from === "demo-fallback" && (
        <Alert className="mb-8">
          <Info aria-hidden />
          <AlertTitle>You are seeing the seeded example</AlertTitle>
          <AlertDescription>
            Demo mode serves cached responses only, so it could not build a challenge from the text you pasted. Turn demo mode off (and add an OpenAI API key) to generate one live.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <article className="min-w-0 space-y-12">
          <header className="space-y-4">
            <div className="text-xs font-medium uppercase tracking-wider text-primary/80">Your challenge</div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{challenge.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="size-4" aria-hidden />
                {job.roleTitle} at {job.employer}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                {formatTimebox(challenge.timeboxMinutes)}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="size-4" aria-hidden />
                {challenge.requirements.length} requirements
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5" title="Every score is stored against the rubric version it was assessed with.">
                <Tag className="size-4" aria-hidden />
                {challenge.rubricVersion}
              </span>
              {challenge.fromDemoCache && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  Cached demo challenge
                </Badge>
              )}
            </div>
          </header>

          <section id="context" className="space-y-4">
            <SectionTitle eyebrow="Context" title={`About ${job.employer}`} />
            <p className="max-w-3xl leading-relaxed text-foreground/85">{challenge.domainContext}</p>
            <Card size="sm">
              <CardContent className="space-y-3 text-sm">
                <p className="leading-relaxed text-foreground/80">{research.whatTheyDo}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {research.groundedInSearch ? (
                    <>
                      <span className="font-medium">Sources:</span>
                      {research.sources.map((s) => (
                        <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                          {s.title.replace(/\s+[—-]\s+Culture Amp.*$/i, "")}
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ))}
                    </>
                  ) : (
                    <span>No web results were available, so this context comes from the job description alone.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="brief" className="space-y-4">
            <SectionTitle eyebrow="The brief" title="What you'll build" />
            <Card>
              <CardContent className="pt-2">
                <Markdown>{challenge.brief}</Markdown>
              </CardContent>
            </Card>
          </section>

          <section id="rubric" className="space-y-6">
            <SectionTitle
              eyebrow="Nothing hidden"
              title="The rubric you'll be scored against"
              description="After you submit, every score is shown next to these same requirements, with the exact turns and files it is based on. Reasoning and decisions are scored, not typing."
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
