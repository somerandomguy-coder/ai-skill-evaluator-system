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
    <PageShell width="7xl" className="space-y-16 py-8">
      {/* Editorial Hero Banner */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase px-2.5 py-0.5 bg-surface-container-high text-primary rounded font-semibold tracking-wider border border-border">
                Step 1 of 4 · Role & Domain Intake
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span className="font-mono text-[11px] text-muted-foreground">SPECIFICATION SYNTHESIZER v2.4</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl text-balance">
              Generate a tailored work-sample assessment from any job description
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
              Every project brief and 2-tier evaluation rubric is synthesized directly from real company constraints and technical requirements.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded border border-border font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span className="text-primary font-semibold">Role Spec Generator</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">AU-EAST-SYD1</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">Isolated Verification Cluster</span>
          </div>
        </div>

        {/* Intake Workspace Form */}
        <JdIntake signedIn={!!user} isCandidate={user?.role === "CANDIDATE"} demoMode={isDemoMode()} />

        {/* 3 Dimension Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <div className="bg-surface-container-low p-5 rounded border border-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">Suite A // 01–03</span>
              <Cpu className="size-4 text-primary" />
            </div>
            <h3 className="font-semibold text-primary text-sm">System Integrity & 4D Lifecycle</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Evaluates Discover, Define, Develop, Deliver phases: boundary definition, memory constraints, and async state reconciliation.
            </p>
          </div>

          <div className="bg-surface-container-low p-5 rounded border border-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">Suite B // 04–05</span>
              <Terminal className="size-4 text-primary" />
            </div>
            <h3 className="font-semibold text-primary text-sm">AI Usage & Zero Trust (Barron Rubric)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Assesses how you guide AI: Scope Boundaries, Decomposition, Prompt Quality, Zero-Trust Verification, and Stack Decisions.
            </p>
          </div>

          <div className="bg-surface-container-low p-5 rounded border border-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">Governance // 06–07</span>
              <ShieldAlert className="size-4 text-primary" />
            </div>
            <h3 className="font-semibold text-primary text-sm">Auditable Evidence & Tamper Receipt</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every score cites exact transcript turns and code files. Sealed with non-repudiable SHA256 session audit verification.
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

      {/* Example posting */}
      {example && (
        <section className="space-y-4">
          <SectionTitle eyebrow="Pre-calibrated benchmark" title="Culture Amp People Intelligence Engineer" description="A real public Australian posting. The brief, 2-tier rubric and contrasting sample transcripts are pre-loaded." />
          <Card className="border border-border rounded overflow-hidden">
            <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center p-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-primary text-white font-semibold uppercase">Real Posting</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container border border-border text-muted-foreground">Cached Research</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container border border-border text-muted-foreground">{example.barrierCount} barriers excluded</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-primary">
                    {example.roleTitle} <span className="font-normal text-muted-foreground">at {example.employer}</span>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">{example.domain}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {example.skills.map((s) => (
                    <span key={s} className="rounded bg-surface-container-low border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
                      {s.length > 64 ? `${s.slice(0, 62)}…` : s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <Link href={`/challenge/${example.challengeId}`} className={buttonVariants({ size: "lg", className: "gap-2 rounded bg-primary text-white hover:bg-primary/90" })}>
                  Use this example
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                {example.sourceUrl && (
                  <a href={example.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    View original ad
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
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
