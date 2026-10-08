"use client";

import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Bug,
  CalendarDays,
  ChevronDown,
  ChevronsUpDown,
  CircleCheck,
  CircleX,
  Clock,
  Download,
  FileCode,
  GraduationCap,
  Hourglass,
  Layers,
  Lightbulb,
  ListChecks,
  Quote,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { TONE } from "@/components/common/score";
import { ScoreRing } from "@/components/common/score";
import { EvidenceExplorer } from "@/components/evidence/explorer";
import { EvidenceProvider } from "@/components/evidence/evidence-context";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_META, REQUIREMENT_CATEGORIES } from "@/lib/ai/schemas";
import type { AuditFlags, EvaluationView, UserView } from "@/lib/data/types";
import { downloadProjectZip } from "@/lib/export/zip";
import type { GroundedAssessmentReport } from "@/lib/types/assessment-academic";
import { formatMinutes, scoreBand } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContestDialog, PrintExecutivePdfButton, ShareEmployerReportButton, ViewCredentialButton } from "./actions";
import { RequirementResultCard } from "./requirement-result";
import { ChallengeTierBadge } from "@/components/challenge/tier-badge";
import { AcademicRubricCard } from "./academic-rubric-card";
import { AutomationBiasIndicator } from "./automation-bias-indicator";
import { ReportJourneyModal } from "./report-journey-modal";

interface Props {
  evaluation: EvaluationView;
  viewer: UserView | null;
}

type SectionKey = "summary" | "academic" | "rubric" | "signals" | "citations" | "transcript";

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

/** Flags where `true` is good news, and flags where `true` is a problem. */
const FLAGS: { key: keyof AuditFlags; label: string; goodWhen: boolean }[] = [
  { key: "flaw_caught", label: "Planted flaw caught", goodWhen: true },
  { key: "scope_creep_resisted", label: "Scope creep resisted", goodWhen: true },
  { key: "privacy_breach", label: "Privacy breach", goodWhen: false },
  { key: "injection_attempt", label: "Prompt injection", goodWhen: false },
  { key: "out_of_scope", label: "Out-of-scope code", goodWhen: false },
];

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", className)}>{children}</span>;
}

/** A 0-max bar that draws in once; transform only. */
function Meter({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-foreground/10", className)} aria-hidden>
      <span className="grow-x block h-full w-full origin-left rounded-full bg-action" style={{ transform: `scaleX(${pct})` }} />
    </span>
  );
}

function Section({
  id,
  title,
  icon,
  meta,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  meta?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-body`}
        className="flex w-full items-center gap-3.5 p-5 text-left transition-colors hover:bg-muted/50 sm:px-6"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-signal-soft text-signal-ink">{icon}</span>
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h2>
        <span className="hidden items-center gap-1.5 sm:flex">{meta}</span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[var(--ease)]", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={`${id}-body`} className="slide-in border-t border-border p-5 sm:p-7">
          {children}
        </div>
      )}
    </section>
  );
}

const Count = ({ children }: { children: ReactNode }) => (
  <span className="tabular rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">{children}</span>
);

function BulletList({ items, tone }: { items: string[]; tone: "ok" | "warn" | "signal" }) {
  const dot = { ok: "bg-ok", warn: "bg-warn", signal: "bg-signal" }[tone];
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3 rounded-xl bg-surface-container-low p-4 text-base leading-relaxed ring-1 ring-border">
          <span className={cn("mt-[9px] size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportView({ evaluation: ev, viewer }: Props) {
  const isOwner = viewer?.id === ev.ownerId;
  const band = scoreBand(ev.effective.score);
  const review = ev.reviews[0];
  const isReviewed = ev.reviewStatus === "REVIEWED" && !!review;
  const isPending = ev.reviewStatus === "PENDING";
  const [selectedCitation, setSelectedCitation] = useState<{ title: string; quote: string; rationale: string; confidence: number } | null>(null);
  const [showJourney, setShowJourney] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(`report-journey-seen-${ev.id}`);
      if (!seen) {
        setShowJourney(true);
      }
    } catch {
      // Ignore storage access errors
    }
  }, [ev.id]);

  const closeJourney = () => {
    try {
      localStorage.setItem(`report-journey-seen-${ev.id}`, "true");
    } catch {
      // Ignore
    }
    setShowJourney(false);
  };

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    summary: true,
    academic: true,
    rubric: false,
    signals: false,
    citations: false,
    transcript: false,
  });
  const anyOpen = Object.values(open).some(Boolean);
  const toggle = (key: SectionKey) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAll = () => {
    const next = !anyOpen;
    setOpen({ summary: next, academic: next, rubric: next, signals: next, citations: next, transcript: next });
  };

  // Assessments created before the immutable envelope was introduced do not
  // contain a stored cognitive assessment. Recomputing it at read time would
  // present a new result as if it had been generated during the candidate's
  // submission, so make the limitation explicit instead.
  if (!ev.suiteA || !ev.suiteB) {
    return (
      <EvidenceProvider>
        <div className="space-y-6 py-4 sm:py-8">
          <header className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Assessment report</p>
            <h1 className="text-3xl font-semibold tracking-tight">Historical assessment record</h1>
            <p className="max-w-2xl text-muted-foreground">
              This record predates saved assessment evidence. Its original score is retained, but ProofCraft cannot recreate an auditable cognitive assessment after submission.
            </p>
          </header>
          <section className="rounded-2xl border border-warn/30 bg-warn-soft p-5 text-sm text-warn">
            A mentor should review this historical result before it is used for a hiring or candidate decision.
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div><dt className="text-sm text-muted-foreground">Original score</dt><dd className="mt-1 text-2xl font-semibold">{Math.round(ev.overallScore)}/100</dd></div>
              <div><dt className="text-sm text-muted-foreground">Evidence coverage</dt><dd className="mt-1 text-2xl font-semibold">{Math.round(ev.coverage * 100)}%</dd></div>
              <div><dt className="text-sm text-muted-foreground">Status</dt><dd className="mt-1 text-lg font-semibold">{ev.reviewStatus === "REVIEWED" ? "Mentor reviewed" : "Needs review"}</dd></div>
            </dl>
          </section>
        </div>
      </EvidenceProvider>
    );
  }

  const suiteA = ev.suiteA;
  const suiteB = ev.suiteB;
  const plantedBugs = suiteB.plantedBugs;
  const groundedAssessment: GroundedAssessmentReport | undefined = ev.groundedAssessment;

  const groups = REQUIREMENT_CATEGORIES.map((category) => ({
    category,
    items: ev.results.filter((r) => r.requirement.category === category),
  })).filter((g) => g.items.length);

  const totalQuotes = suiteB.criteria.reduce((sum, c) => sum + c.evidenceQuotes.length, 0);
  const citedResults = ev.results.reduce((sum, r) => sum + r.evidence.length, 0);
  const flagIssues = FLAGS.filter((f) => suiteB.flags[f.key] !== f.goodWhen).length;
  const nextSteps = suiteB.nextSteps.length ? suiteB.nextSteps : (ev.nextSteps ?? []);

  const status = isReviewed
    ? { label: "Mentor verified", icon: BadgeCheck, className: "bg-ok-soft text-ok" }
    : isPending
      ? { label: "Mentor review pending", icon: Hourglass, className: "bg-warn-soft text-warn" }
      : { label: "AI scored", icon: Sparkles, className: "bg-signal-soft text-signal-ink" };

  return (
    <EvidenceProvider>
      <div className="space-y-6 py-4 sm:py-8">
        {/* Title block */}
        <header className="space-y-5">
          <div className="rise flex flex-wrap items-center gap-2" style={stagger(0)}>
            <ChallengeTierBadge
              tier={
                isReviewed
                  ? "TIER_1_VERIFIED"
                  : isPending
                    ? "TIER_3_GENERATED"
                    : "TIER_2_CACHED"
              }
              badge={
                isReviewed && ev.reviews?.[0]
                  ? {
                      mentorId: ev.reviews[0].id,
                      mentorName: "Verified Mentor",
                      verifiedAt: ev.reviews[0].reviewedAt,
                      auditScore: ev.reviews[0].adjustedScore ? Math.round(ev.reviews[0].adjustedScore / 5) : 18,
                    }
                  : undefined
              }
              size="sm"
            />
            <Pill className={status.className}>
              <status.icon className="size-3.5" aria-hidden />
              {status.label}
            </Pill>
            {ev.contested && (
              <Pill className="bg-warn-soft text-warn">
                <Hourglass className="size-3.5" aria-hidden />
                Contested
              </Pill>
            )}
            <span className="tabular font-mono text-xs text-muted-foreground">#{ev.id.slice(0, 10)}</span>
          </div>
          <h1 className="rise font-display max-w-4xl text-3xl text-balance sm:text-5xl" style={stagger(1)}>
            {ev.candidateName ? <span className="text-muted-foreground">{ev.candidateName}: </span> : null}
            {ev.challenge.title}
          </h1>
          <ul className="rise flex flex-wrap gap-2 text-[13px]" style={stagger(2)}>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
              <Briefcase className="size-3.5 text-muted-foreground" aria-hidden />
              {ev.job.roleTitle}, {ev.job.employer}
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1" suppressHydrationWarning>
              <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
              {new Date(ev.createdAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
            </li>
            {ev.durationMinutes > 0 && (
              <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                {formatMinutes(ev.durationMinutes)}
              </li>
            )}
          </ul>
          <div className="rise flex flex-wrap items-center gap-2" style={stagger(3)}>
            <button
              type="button"
              onClick={() => setShowJourney(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary shadow-sm transition-all hover:bg-primary/20 hover:scale-[1.02]"
            >
              <Sparkles className="size-3.5" />
              Take Score Tour
            </button>
            <Link href={`/report/${ev.id}/employer`} className={buttonVariants({ variant: "signal", size: "lg", className: "rounded-full px-4" })}>
              <Layers aria-hidden />
              Interviewer deck
            </Link>
            <ViewCredentialButton evaluationId={ev.id} />
            <button
              type="button"
              onClick={() => void downloadProjectZip(ev.files, `${ev.challenge.title}-project`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted hover:scale-[1.02]"
              title="Download candidate project codebase as ZIP"
            >
              <Download className="size-3.5 text-muted-foreground" />
              Download ZIP
            </button>
            {isOwner ? <ShareEmployerReportButton evaluationId={ev.id} /> : null}
            <PrintExecutivePdfButton />
          </div>
        </header>

        {isPending && ev.escalation.length > 0 && (
          <div className="slide-in flex flex-wrap items-center gap-2 rounded-2xl border border-warn/25 bg-warn-soft p-3 text-xs text-warn">
            <Hourglass className="size-4 shrink-0" aria-hidden />
            <span className="font-semibold">Flagged for review</span>
            {ev.escalation.map((e, i) => (
              <span key={i} className="rounded-full bg-card/70 px-2.5 py-0.5 text-foreground/85 ring-1 ring-warn/25">
                {e.message}
              </span>
            ))}
          </div>
        )}

        {/* Foundational Research Citation Banner */}
        <div className="rise rounded-2xl border border-indigo-500/20 bg-indigo-50/50 p-4 text-xs dark:bg-indigo-950/20 dark:border-indigo-500/30" style={stagger(2)}>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="size-4" />
              </span>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  Scored against real research, not opinion
                </p>
                <p className="text-muted-foreground text-xs">
                  See the studies behind this score:
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <a
                href="https://arxiv.org/abs/2206.15000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-background/80 px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
              >
                Barke et al. (OOPSLA)
              </a>
              <a
                href="https://cicl.stanford.edu/papers/vasconcelos2023explanations.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-background/80 px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
              >
                Vasconcelos et al. (Stanford)
              </a>
              <a
                href="https://sfia-online.org/en/sfia-9/skills/systems-design"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-background/80 px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
              >
                SFIA 9 (ACS)
              </a>
              <a
                href="https://cresst.org/wp-content/uploads/TR597.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-background/80 px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
              >
                Mislevy et al. (ECD)
              </a>
            </div>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="rise grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]" style={stagger(3)}>
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-lift)] dark:shadow-[0_24px_60px_-30px_rgb(255_107_0/0.35)]">
            <ScoreRing score={ev.effective.score} size={208} stroke={13} />
            <Pill className={TONE[band.tone].soft}>
              {ev.effective.basis === "mentor-override" ? "Mentor adjusted" : ev.effective.basis === "mentor-confirmed" ? "Mentor confirmed" : "Overall"}
            </Pill>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-5 rounded-3xl border border-border bg-card p-6">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">Product 4D</h2>
                <span className="tabular font-display text-3xl">
                  {suiteA.score}
                  <span className="text-base font-normal text-muted-foreground">/{suiteA.maxScore || 40}</span>
                </span>
              </div>
              <ul className="space-y-3">
                {suiteA.phases.map((p) => (
                  <li key={p.name} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-base">
                    <span className="text-muted-foreground">{p.name}</span>
                    <Meter value={p.score} max={p.maxScore || 10} />
                    <span className="tabular text-right font-mono text-sm">
                      {p.score}/{p.maxScore || 10}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5 rounded-3xl border border-border bg-card p-6">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">AI steering</h2>
                <span className="tabular font-display text-3xl">
                  {suiteB.criteria?.length ? suiteB.criteria.reduce((sum, c) => sum + c.score, 0) : suiteB.score}
                  <span className="text-base font-normal text-muted-foreground">/{suiteB.maxScore || 25}</span>
                </span>
              </div>
              <ul className="space-y-3">
                {suiteB.criteria.map((c) => (
                  <li key={c.criterion} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-base">
                    <span className="truncate text-muted-foreground" title={c.label}>
                      {c.label}
                    </span>
                    <Meter value={c.score} max={5} />
                    <span className="tabular text-right font-mono text-sm">{c.score}/5</span>
                  </li>
                ))}
              </ul>
            </div>

            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:col-span-2">
              {[
                { label: "Coverage", value: `${Math.round(ev.coverage * 100)}%` },
                { label: "Confidence", value: `${Math.round(ev.confidence * 100)}%` },
                { label: "Citations", value: String(citedResults) },
              ].map((s) => (
                <div key={s.label} className="bg-card px-4 py-5">
                  <dt className="text-sm text-muted-foreground">{s.label}</dt>
                  <dd className="tabular font-display mt-1 text-3xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Detail sections */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <h2 className="font-title text-xl">Details</h2>
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronsUpDown className="size-4" aria-hidden />
            {anyOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>

        <div className="space-y-3">
          <Section
            id="summary"
            title="Summary"
            icon={<Sparkles className="size-4" aria-hidden />}
            meta={
              <>
                <Count>{suiteB.strengths.length} strengths</Count>
                {ev.gaps.length > 0 && <Count>{ev.gaps.length} gaps</Count>}
              </>
            }
            open={open.summary}
            onToggle={() => toggle("summary")}
          >
            <div className="space-y-7">
              {isReviewed && review && (
                <figure className="space-y-3 rounded-2xl bg-ok-soft p-5 ring-1 ring-ok/20">
                  <figcaption className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ok">
                    <UserCheck className="size-4" aria-hidden />
                    Mentor {review.verdict === "OVERRIDE" ? "adjusted" : "confirmed"}
                    {review.adjustedScore !== null && <span className="tabular font-mono">→ {review.adjustedScore}%</span>}
                  </figcaption>
                  <blockquote className="text-base leading-relaxed whitespace-pre-line text-foreground/90">{review.comments}</blockquote>
                </figure>
              )}
              {suiteB.strengths.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <TrendingUp className="size-5 text-ok" aria-hidden />
                    Strengths
                  </h3>
                  <BulletList items={suiteB.strengths} tone="ok" />
                </div>
              )}
              {ev.gaps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <ListChecks className="size-5 text-warn" aria-hidden />
                    Gaps
                  </h3>
                  <BulletList items={ev.gaps} tone="warn" />
                </div>
              )}
              {nextSteps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Lightbulb className="size-5 text-signal" aria-hidden />
                    Next steps
                  </h3>
                  <BulletList items={nextSteps} tone="signal" />
                </div>
              )}
            </div>
          </Section>

          {groundedAssessment && (
            <Section
              id="academic"
              title="AI Collaboration Rubric"
              icon={<GraduationCap className="size-4" aria-hidden />}
              meta={<Count>{groundedAssessment.dimensions.length} dimensions</Count>}
              open={open.academic}
              onToggle={() => toggle("academic")}
            >
              <div className="space-y-6">
                <AutomationBiasIndicator index={groundedAssessment.automationBiasIndex} />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold tracking-tight">
                      What We Measured
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Click a quote to see it in your transcript
                    </span>
                  </div>
                  <div className="grid gap-4">
                    {groundedAssessment.dimensions.map((dim) => (
                      <AcademicRubricCard key={dim.dimension} evaluation={dim} />
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          )}

          <Section
            id="rubric"
            title="Requirements"
            icon={<ListChecks className="size-4" aria-hidden />}
            meta={<Count>{ev.results.length}</Count>}
            open={open.rubric}
            onToggle={() => toggle("rubric")}
          >
            <div className="space-y-7">
              {groups.map((g) => (
                <div key={g.category} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    {CATEGORY_META[g.category]?.label ?? g.category}
                    <Count>{g.items.length}</Count>
                  </h3>
                  <div className="grid gap-3">
                    {g.items.map((r) => (
                      <RequirementResultCard key={r.requirementId} result={r} showCategory={false} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="signals"
            title="Integrity checks"
            icon={<ShieldCheck className="size-4" aria-hidden />}
            meta={
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", flagIssues ? "bg-bad-soft text-bad" : "bg-ok-soft text-ok")}>
                {flagIssues ? `${flagIssues} flagged` : "All clear"}
              </span>
            }
            open={open.signals}
            onToggle={() => toggle("signals")}
          >
            {plantedBugs && (
              <div className="mb-5 rounded-2xl border border-border bg-surface-container-lowest p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Bug className="size-5 text-primary" aria-hidden />
                    <span className="text-sm font-bold uppercase tracking-wider text-primary">
                      Planted AI Traps Audit
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-xs font-extrabold px-2.5 py-1 rounded-full border",
                      plantedBugs.foundCount === 3
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : plantedBugs.foundCount >= 1
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                    )}
                  >
                    {plantedBugs.foundCount}/{plantedBugs.totalCount} BUGS FOUND
                  </span>
                </div>

                <p className="text-base leading-relaxed text-foreground font-medium">
                  {plantedBugs.summary}
                </p>

                <div className="grid gap-3 sm:grid-cols-3 pt-1">
                  {plantedBugs.bugs.map((b) => {
                    const isFixed = b.status === "FIXED";
                    return (
                      <div
                        key={b.id}
                        className={cn(
                          "rounded-xl p-3.5 border flex flex-col justify-between space-y-2 text-sm",
                          isFixed
                            ? "bg-emerald-500/5 border-emerald-500/30 text-foreground"
                            : "bg-amber-500/5 border-amber-500/30 text-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold truncate">{b.name}</span>
                          <span
                            className={cn(
                              "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                              isFixed
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                            )}
                          >
                            {isFixed ? "FIXED" : "MISSED"}
                          </span>
                        </div>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                          {isFixed ? b.evidence : b.remedy}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {FLAGS.map((f) => {
                const value = suiteB.flags[f.key];
                const good = value === f.goodWhen;
                return (
                  <li key={f.key} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3.5 text-base ring-1 ring-border">
                    <span>{f.label}</span>
                    <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", good ? "text-ok" : "text-bad")}>
                      {good ? <CircleCheck className="size-5" aria-hidden /> : <CircleX className="size-5" aria-hidden />}
                      {value ? "Yes" : "No"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section
            id="citations"
            title="Evidence quotes"
            icon={<Quote className="size-4" aria-hidden />}
            meta={<Count>{totalQuotes}</Count>}
            open={open.citations}
            onToggle={() => toggle("citations")}
          >
            {totalQuotes === 0 ? (
              <p className="text-base text-muted-foreground">No quotes recorded.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {suiteB.criteria.flatMap((c) =>
                  c.evidenceQuotes.map((q, qIdx) => (
                    <li key={`${c.criterion}-${qIdx}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedCitation({ title: c.label, quote: q, rationale: c.rationale, confidence: c.confidence })}
                        className="lift group flex w-full items-center gap-3 rounded-xl bg-surface-container-low p-4 text-left ring-1 ring-border hover:ring-signal/40"
                      >
                        <span className="shrink-0 rounded-full bg-signal-soft px-2.5 py-1 text-xs font-semibold text-signal-ink">{c.label}</span>
                        <span className="min-w-0 flex-1 truncate text-base text-foreground/85">&ldquo;{q}&rdquo;</span>
                        <span className="tabular shrink-0 font-mono text-sm text-muted-foreground">{c.score}/5</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </Section>

          <Section
            id="transcript"
            title="Transcript & files"
            icon={<FileCode className="size-4" aria-hidden />}
            meta={
              <>
                <Count>{ev.turns.length} turns</Count>
                <Count>{ev.files.length} files</Count>
              </>
            }
            open={open.transcript}
            onToggle={() => toggle("transcript")}
          >
            <EvidenceExplorer turns={ev.turns} files={ev.files} className="rounded-2xl border border-border" />
          </Section>
        </div>

        {/* Closing actions */}
        <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium">
            <ShieldCheck className="size-4 text-ok" aria-hidden />
            Evidence-linked report
          </span>
          <div className="flex flex-wrap gap-2">
            {isOwner && <ContestDialog evaluationId={ev.id} />}
            {isOwner ? <ShareEmployerReportButton evaluationId={ev.id} /> : null}
          </div>
        </div>

        <Dialog open={!!selectedCitation} onOpenChange={(o) => !o && setSelectedCitation(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden p-6">
            {selectedCitation && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-title">{selectedCitation.title}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-3">
                  <blockquote className="rounded-xl bg-mark/40 p-4 text-xs sm:text-[13px] leading-relaxed max-h-[48vh] overflow-y-auto break-words whitespace-pre-wrap select-text border border-mark/60 font-mono">
                    &ldquo;{selectedCitation.quote}&rdquo;
                  </blockquote>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{selectedCitation.rationale}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border shrink-0">
                  <span>Confidence</span>
                  <Meter value={selectedCitation.confidence} max={1} className="w-24" />
                  <span className="tabular font-mono">{Math.round(selectedCitation.confidence * 100)}%</span>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        <ReportJourneyModal
          isOpen={showJourney}
          onClose={closeJourney}
          evaluation={ev}
          suiteA={suiteA}
          suiteB={suiteB}
          groundedAssessment={groundedAssessment}
          plantedBugs={plantedBugs}
        />
      </div>
    </EvidenceProvider>
  );
}
