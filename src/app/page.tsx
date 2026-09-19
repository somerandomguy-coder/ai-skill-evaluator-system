import {
  ArrowRight,
  BadgeCheck,
  ClipboardPaste,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  Gavel,
  Languages,
  ListChecks,
  MessagesSquare,
  Quote,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, SectionTitle } from "@/components/common/layout";
import { JdIntake } from "@/components/home/jd-intake";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { timeAgo } from "@/lib/format";

const HOW_IT_WORKS = [
  { icon: ClipboardPaste, title: "Paste a job description", body: "Any role, any company. We pull out what the job genuinely needs, and set aside requirements that only filter people." },
  { icon: ListChecks, title: "Read your project and rubric", body: "A 2 to 4 hour project rooted in the company's real domain, plus the exact rubric you'll be scored against. Nothing hidden." },
  { icon: MessagesSquare, title: "Build with an AI assistant", body: "Chat on the left, live preview on the right. What you ask for, question, and reject is the evidence." },
  { icon: FileCheck2, title: "Get a report you can share", body: "A score with the turn or file behind every judgment, plus strengths, gaps, and a link an employer can open." },
];

const FAIRNESS = [
  { icon: Eye, title: "The rubric is visible first", body: "You see every requirement, and what would count for or against it, before you write a word." },
  { icon: Quote, title: "Every score cites evidence", body: "Each judgment points to a turn or file with the exact words. If we can't cite it, we don't score it." },
  { icon: Languages, title: "Language is never scored", body: "Grammar, spelling and fluency are not assessed. Clear reasoning in any phrasing is what counts." },
  { icon: UserRoundCheck, title: "People check the hard cases", body: "Low confidence, missing evidence or a borderline score goes to a human mentor, with the reason attached." },
  { icon: Gavel, title: "You can contest a score", body: "Disagree? One click sends it straight to the mentor queue." },
  { icon: EyeOff, title: "Blind to who you are", body: "The evaluator sees your transcript and files only. Not your name, CV, nationality or visa status." },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user?.role === "MENTOR") redirect("/mentor");
  const home = await data.getHome(user?.id ?? null);
  const { example } = home;

  return (
    <PageShell width="7xl" className="space-y-20 sm:space-y-24">
      {/* Hero */}
      <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-14">
        <div className="space-y-6 lg:pt-6">
          <Badge variant="secondary" className="gap-1.5">
            <BadgeCheck className="size-3.5" aria-hidden />
            Work-sample assessment for CVs that are hard to read
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
            Show how you think, on the job you actually want.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Paste a job description. We turn it into a real project and a rubric you can read before you start. You build it with an AI assistant, and we assess your
            judgment: what you ask for, what you push back on, and what you knowingly trade off.
          </p>
          <ul className="space-y-2.5 text-[0.95rem]">
            {["Overseas employer, unfamiliar company, or a non-linear career? Your work speaks for itself.", "A human mentor reviews anything the AI isn't sure about.", "You get a shareable, read-only report, with every score explained."].map((t) => (
              <li key={t} className="flex gap-2.5 text-foreground/85">
                <BadgeCheck className="mt-0.5 size-4.5 shrink-0 text-emerald-600" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <JdIntake signedIn={!!user} isCandidate={user?.role === "CANDIDATE"} demoMode={isDemoMode()} />
      </section>

      {/* Your work */}
      {home.mySessions.length > 0 && (
        <section className="space-y-5">
          <SectionTitle eyebrow="Your work" title="Pick up where you left off" />
          <div className="grid gap-3 md:grid-cols-2">
            {home.mySessions.map((s) => (
              <Card key={s.sessionId} size="sm">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.challengeTitle}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{s.roleTitle}</span>
                      <span aria-hidden>·</span>
                      <span>started {timeAgo(s.startedAt)}</span>
                      <Badge variant={s.status === "ACTIVE" ? "secondary" : "outline"}>{s.status === "ACTIVE" ? "In progress" : s.evaluationId ? "Submitted" : "Not yet evaluated"}</Badge>
                    </div>
                  </div>
                  <Link
                    href={s.evaluationId ? `/report/${s.evaluationId}` : `/build/${s.sessionId}`}
                    className={buttonVariants({ variant: s.status === "ACTIVE" ? "default" : "outline", size: "sm", className: "shrink-0 gap-1.5" })}
                  >
                    {s.status === "ACTIVE" ? "Continue" : s.evaluationId ? "View report" : "Finish evaluation"}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Example */}
      {example && (
        <section className="space-y-5">
          <SectionTitle eyebrow="No job description handy?" title="Try a real posting" description="This is a genuine, public Australian job ad. Its challenge, rubric and two full example sessions are already prepared." />
          <Card className="overflow-hidden">
            <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Real posting</Badge>
                  <Badge variant="outline">Cached research</Badge>
                  <Badge variant="outline">{example.barrierCount} barriers flagged and excluded</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {example.roleTitle} <span className="font-normal text-muted-foreground">at {example.employer}</span>
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{example.domain}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {example.skills.map((s) => (
                    <span key={s} className="rounded-md bg-muted px-2 py-1 text-xs text-foreground/80">
                      {s.length > 64 ? `${s.slice(0, 62)}…` : s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <Link href={`/challenge/${example.challengeId}`} className={buttonVariants({ size: "lg", className: "gap-2" })}>
                  Use this example
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                {example.sourceUrl && (
                  <a href={example.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    View the original posting
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* How it works */}
      <section className="space-y-8">
        <SectionTitle eyebrow="How it works" title="From job ad to evidence in four steps" />
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Fairness */}
      <section className="space-y-8">
        <SectionTitle
          eyebrow="Fairness by design"
          title="An assessment you can check"
          description="The point of a work sample is that it doesn't depend on where you've worked or how you write. These guarantees are built in, not promised."
        />
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {FAIRNESS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3.5">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
