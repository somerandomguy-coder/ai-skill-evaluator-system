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
  ShieldAlert,
  Terminal,
  Cpu,
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
  { icon: ListChecks, title: "Read your project and rubric", body: "A 2 to 4 hour project rooted in the company's real domain, plus the exact 2-tier rubric you'll be scored against. Nothing hidden." },
  { icon: MessagesSquare, title: "Build with an AI assistant", body: "Chat on the left, live preview on the right. What you ask for, question, and reject is the evidence." },
  { icon: FileCheck2, title: "Get a verified proof dossier", body: "A score with the turn or file behind every judgment, plus strengths, gaps, next steps, and a shareable proof certificate." },
];

const FAIRNESS = [
  { icon: Eye, title: "The rubric is visible first", body: "You see every requirement and prompt scoring criterion before you write a single line of code." },
  { icon: Quote, title: "Every score cites evidence", body: "Each judgment points to a turn or file with exact words. If we can't cite it, we don't score it." },
  { icon: Languages, title: "Language is never scored", body: "Grammar, spelling and fluency are not assessed. Clear reasoning in any phrasing is what counts." },
  { icon: UserRoundCheck, title: "People check the hard cases", body: "Low confidence, missing evidence, or contested criteria route to a senior human mentor with 2-3 day SLA." },
  { icon: Gavel, title: "You can contest a score", body: "Disagree? One click sends it straight to the mentor queue for secondary human review." },
  { icon: EyeOff, title: "Blind to who you are", body: "The evaluator sees your transcript and files only. Not your name, CV, nationality, or visa status." },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user?.role === "MENTOR") redirect("/mentor");
  const home = await data.getHome(user?.id ?? null);
  const { example } = home;

  return (
    <PageShell width="7xl" className="space-y-16 py-6">
      {/* Minimal, High-Impact Hero Banner */}
      <section className="space-y-6">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-3 pt-2">
          <span className="font-mono text-xs uppercase px-2.5 py-0.5 bg-surface-container-low text-primary rounded font-semibold tracking-wider border border-border inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            Work-Sample Assessment Platform
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-primary text-balance">
            Turn any job description into an AI skill test.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
            Paste a job ad. Build the project with an AI co-pilot. Get evaluated on your actual reasoning with cited evidence.
          </p>
        </div>

        {/* Giant Intake Workspace Form */}
        <JdIntake signedIn={!!user} isCandidate={user?.role === "CANDIDATE"} demoMode={isDemoMode()} />

        {/* 3 Clear Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <div className="bg-surface-container-lowest p-5 rounded border border-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-primary">01 // Intake</span>
              <FileCheck2 className="size-4 text-primary" />
            </div>
            <h3 className="font-semibold text-primary text-sm">Role-Tailored Challenge</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We extract the core technical mandate from the job description and create a 2–4 hour real-world engineering project with a transparent rubric visible upfront.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded border border-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-primary">02 // In-App Studio</span>
              <Terminal className="size-4 text-primary" />
            </div>
            <h3 className="font-semibold text-primary text-sm">Build with AI Co-Pilot</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Work inside our browser code editor and terminal with an AI assistant. We record your prompts, decomposition, and architectural choices in real time.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded border border-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-primary">03 // Verification</span>
              <BadgeCheck className="size-4 text-primary" />
            </div>
            <h3 className="font-semibold text-primary text-sm">Auditable Proof of Skill</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Receive an objective scorecard citing verbatim quotes from your session as evidence. Borderline scores route directly to human mentors for secondary review.
            </p>
          </div>
        </div>
      </section>

      {/* Your work */}
      {home.mySessions.length > 0 && (
        <section className="space-y-4">
          <SectionTitle eyebrow="Your work" title="Active & Completed Assessments" />
          <div className="grid gap-3 md:grid-cols-2">
            {home.mySessions.map((s) => (
              <Card key={s.sessionId} className="border border-border rounded">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-primary">{s.challengeTitle}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{s.roleTitle}</span>
                      <span aria-hidden>·</span>
                      <span>started {timeAgo(s.startedAt)}</span>
                      <Badge variant={s.status === "ACTIVE" ? "secondary" : "outline"} className="rounded text-[10px]">
                        {s.status === "ACTIVE" ? "In progress" : s.evaluationId ? "Submitted" : "Not yet evaluated"}
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href={s.evaluationId ? `/report/${s.evaluationId}` : `/build/${s.sessionId}`}
                    className={buttonVariants({ variant: s.status === "ACTIVE" ? "default" : "outline", size: "sm", className: "shrink-0 gap-1.5 rounded" })}
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

      {/* How it works */}
      <section className="space-y-6">
        <SectionTitle eyebrow="How it works" title="From job description to proof of skill in four steps" />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="bg-surface-container-lowest border border-border p-5 rounded space-y-3">
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded bg-surface-container border border-border text-primary">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <span className="font-mono text-[11px] text-muted-foreground font-semibold uppercase">Step 0{i + 1}</span>
              </div>
              <h3 className="font-semibold text-primary text-sm">{title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Fairness by design */}
      <section className="space-y-6">
        <SectionTitle
          eyebrow="Fairness by design"
          title="Authoritative evaluation you can inspect"
          description="The point of a work-sample is that it measures demonstrated capability, not pedigree or proxy metrics."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FAIRNESS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface-container-lowest border border-border p-4 rounded flex gap-3.5">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded bg-surface-container border border-border text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold text-primary text-xs uppercase tracking-wide">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
