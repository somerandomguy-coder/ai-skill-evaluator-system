import {
  ArrowRight,
  ClipboardPaste,
  Clock,
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
import type { CSSProperties } from "react";
import { PageShell } from "@/components/common/layout";
import { JdIntake } from "@/components/home/jd-intake";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: ClipboardPaste, title: "Paste a job" },
  { icon: ListChecks, title: "Read the brief" },
  { icon: MessagesSquare, title: "Build with AI" },
  { icon: FileCheck2, title: "Get your report" },
];

const FAIRNESS = [
  { icon: Eye, title: "Rubric shown first" },
  { icon: Quote, title: "Evidence-cited scores" },
  { icon: Languages, title: "Language never scored" },
  { icon: UserRoundCheck, title: "Mentor review" },
  { icon: Gavel, title: "Contest any score" },
  { icon: EyeOff, title: "Blind to identity" },
];

const HERO_FACTS = [
  { icon: Clock, label: "2–4 hour project" },
  { icon: Eye, label: "Rubric up front" },
  { icon: Quote, label: "Cited scoring" },
];

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user?.role === "MENTOR") redirect("/mentor");
  const home = await data.getHome(user?.id ?? null);

  return (
    <PageShell width="7xl" className="space-y-20 pt-10 pb-16 sm:pt-16 lg:space-y-24">
      {/* Hero: the headline on the left, the real first action on the right. */}
      <section className="relative isolate grid grid-cols-1 items-start gap-10 overflow-x-clip lg:grid-cols-12 lg:gap-12">
        <div className="ambient -top-40 -left-40 size-[34rem]" aria-hidden />
        <div className="ambient -top-24 -right-32 size-[40rem] [animation-delay:-4s]" aria-hidden />
        <div className="min-w-0 space-y-7 lg:col-span-6 lg:pt-4">
          <p
            className="rise inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-[13px] font-medium backdrop-blur-md"
            style={stagger(0)}
          >
            <span className="live-dot size-1.5 text-ok" aria-hidden />
            Live AI pair-programming
          </p>
          <h1 className="rise font-display text-[2.75rem] sm:text-6xl lg:text-[3.4rem] xl:text-[4.25rem]" style={stagger(1)}>
            <span className="block">Paste a job.</span>
            Build the proof.
            <span className="caret ml-1 inline-block h-[0.82em] w-[0.09em] translate-y-[0.08em] rounded-[1px] bg-signal align-baseline" aria-hidden />
          </h1>
          <ul className="rise flex flex-wrap gap-2" style={stagger(3)}>
            {HERO_FACTS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[13px] font-medium">
                <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="rise min-w-0 lg:col-span-6" style={stagger(2)}>
          <JdIntake signedIn={!!user} isCandidate={user?.role === "CANDIDATE"} />
        </div>
      </section>

      {/* Your work */}
      {home.mySessions.length > 0 && (
        <section className="space-y-4" aria-labelledby="your-work">
          <h2 id="your-work" className="font-title text-lg">
            Your assessments
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {home.mySessions.map((s) => {
              const active = s.status === "ACTIVE";
              const status = active ? "In progress" : s.evaluationId ? "Submitted" : "Awaiting evaluation";
              return (
                <li key={s.sessionId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-sm font-semibold">{s.challengeTitle}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{s.roleTitle}</span>
                      <span className="tabular">started {timeAgo(s.startedAt)}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
                          active ? "bg-signal-soft text-signal-ink" : s.evaluationId ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full bg-current", active && "live-dot")} aria-hidden />
                        {status}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={s.evaluationId ? `/report/${s.evaluationId}` : `/build/${s.sessionId}`}
                    className={buttonVariants({ variant: active ? "default" : "outline", size: "default", className: "shrink-0 gap-1.5 self-start sm:self-auto" })}
                  >
                    {active ? "Continue building" : s.evaluationId ? "View report" : "Finish evaluation"}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* How it works: a real sequence, so it is numbered and joined by the same trace as the header. */}
      <section aria-labelledby="how" className="space-y-8">
        <h2 id="how" className="font-title text-2xl sm:text-3xl">
          How it works
        </h2>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map(({ icon: Icon, title }, i) => (
            <li key={title} className="relative space-y-3">
              <div className="flex items-center gap-3">
                <span className="lift-lg grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-signal">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-border lg:block" aria-hidden />}
              </div>
              <h3 className="flex items-baseline gap-2 font-semibold">
                <span className="tabular font-mono text-xs text-muted-foreground">{i + 1}</span>
                {title}
              </h3>
            </li>
          ))}
        </ol>
      </section>

      {/* Fairness: short, scannable guarantees. */}
      <section aria-labelledby="fair" className="space-y-8">
        <h2 id="fair" className="font-title text-2xl sm:text-3xl">
          Fair by design
        </h2>
        <ul className="grid overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 1 }}>
          {FAIRNESS.map(({ icon: Icon, title }) => (
            <li key={title} className="flex items-center gap-3.5 bg-card p-5 transition-colors hover:bg-signal-soft/40">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-signal-soft text-signal-ink">
                <Icon className="size-4" aria-hidden />
              </span>
              <h3 className="text-sm font-semibold">{title}</h3>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
