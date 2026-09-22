"use client";

import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronsUpDown,
  CircleCheck,
  CircleX,
  Clock,
  FileCode,
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
import { useState, type CSSProperties, type ReactNode } from "react";
import { TONE } from "@/components/common/score";
import { ScoreRing } from "@/components/common/score";
import { EvidenceExplorer } from "@/components/evidence/explorer";
import { EvidenceProvider } from "@/components/evidence/evidence-context";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_META, REQUIREMENT_CATEGORIES } from "@/lib/ai/schemas";
import type { AuditFlags, EvaluationView, UserView } from "@/lib/data/types";
import { formatMinutes, scoreBand } from "@/lib/format";
import { buildCognitiveSuites } from "@/lib/services/cognitive-rubric";
import { cn } from "@/lib/utils";
import { ContestDialog, CopyLinkButton, PrintExecutivePdfButton, ViewCredentialButton } from "./actions";
import { RequirementResultCard } from "./requirement-result";
import { ChallengeTierBadge } from "@/components/challenge/tier-badge";

interface Props {
  evaluation: EvaluationView;
  viewer: UserView | null;
}

type SectionKey = "summary" | "rubric" | "signals" | "citations" | "transcript";

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
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 sm:px-5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-signal-soft text-signal-ink">{icon}</span>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2>
        <span className="hidden items-center gap-1.5 sm:flex">{meta}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-[var(--ease)]", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={`${id}-body`} className="slide-in border-t border-border p-4 sm:p-6">
          {children}
        </div>
      )}
    </section>
  );
}

const Count = ({ children }: { children: ReactNode }) => (
  <span className="tabular rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{children}</span>
);

function BulletList({ items, tone }: { items: string[]; tone: "ok" | "warn" | "signal" }) {
  const dot = { ok: "bg-ok", warn: "bg-warn", signal: "bg-signal" }[tone];
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2.5 rounded-xl bg-surface-container-low p-3 text-[13px] leading-relaxed ring-1 ring-border">
          <span className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
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

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    summary: true,
    rubric: false,
    signals: false,
    citations: false,
    transcript: false,
  });
  const anyOpen = Object.values(open).some(Boolean);
  const toggle = (key: SectionKey) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAll = () => {
    const next = !anyOpen;
    setOpen({ summary: next, rubric: next, signals: next, citations: next, transcript: next });
  };

  const dynamicCognitive = buildCognitiveSuites({
    sessionId: ev.sessionId,
    challengeTitle: ev.challenge.title,
    overallScore: ev.overallScore,
    turns: ev.turns,
  });
  const suiteA = ev.suiteA ?? dynamicCognitive.suiteA;
  const suiteB = ev.suiteB ?? dynamicCognitive.suiteB;

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
            <Link href={`/report/${ev.id}/employer`} className={buttonVariants({ variant: "signal", size: "lg", className: "rounded-full px-4" })}>
              <Layers aria-hidden />
              Interviewer deck
            </Link>
            <ViewCredentialButton evaluationId={ev.id} />
            <CopyLinkButton />
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

        {/* Scoreboard */}
        <div className="rise grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]" style={stagger(3)}>
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-lift)] dark:shadow-[0_24px_60px_-30px_rgb(255_107_0/0.35)]">
            <ScoreRing score={ev.effective.score} size={184} stroke={12} />
            <Pill className={TONE[band.tone].soft}>
              {ev.effective.basis === "mentor-override" ? "Mentor adjusted" : ev.effective.basis === "mentor-confirmed" ? "Mentor confirmed" : "Overall"}
            </Pill>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">Product 4D</h2>
                <span className="tabular font-display text-2xl">
                  {suiteA.score}
                  <span className="text-sm font-normal text-muted-foreground">/{suiteA.maxScore || 100}</span>
                </span>
              </div>
              <ul className="space-y-2.5">
                {suiteA.phases.map((p) => (
                  <li key={p.name} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-[13px]">
                    <span className="text-muted-foreground">{p.name}</span>
                    <Meter value={p.score} max={p.maxScore || 10} />
                    <span className="tabular text-right font-mono text-xs">
                      {p.score}/{p.maxScore || 10}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">AI steering</h2>
                <span className="tabular font-display text-2xl">
                  {suiteB.score}
                  <span className="text-sm font-normal text-muted-foreground">/{suiteB.maxScore || 25}</span>
                </span>
              </div>
              <ul className="space-y-2.5">
                {suiteB.criteria.map((c) => (
                  <li key={c.criterion} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-[13px]">
                    <span className="truncate text-muted-foreground" title={c.label}>
                      {c.label}
                    </span>
                    <Meter value={c.score} max={5} />
                    <span className="tabular text-right font-mono text-xs">{c.score}/5</span>
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
                <div key={s.label} className="bg-card px-4 py-3.5">
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="tabular font-display mt-1 text-2xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Detail sections */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <h2 className="font-title text-lg">Details</h2>
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronsUpDown className="size-3.5" aria-hidden />
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
            <div className="space-y-6">
              {isReviewed && review && (
                <figure className="space-y-3 rounded-2xl bg-ok-soft p-4 ring-1 ring-ok/20">
                  <figcaption className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ok">
                    <UserCheck className="size-4" aria-hidden />
                    Mentor {review.verdict === "OVERRIDE" ? "adjusted" : "confirmed"}
                    {review.adjustedScore !== null && <span className="tabular font-mono">→ {review.adjustedScore}%</span>}
                  </figcaption>
                  <blockquote className="text-[13px] leading-relaxed whitespace-pre-line text-foreground/90">{review.comments}</blockquote>
                </figure>
              )}
              {suiteB.strengths.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                    <TrendingUp className="size-4 text-ok" aria-hidden />
                    Strengths
                  </h3>
                  <BulletList items={suiteB.strengths} tone="ok" />
                </div>
              )}
              {ev.gaps.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                    <ListChecks className="size-4 text-warn" aria-hidden />
                    Gaps
                  </h3>
                  <BulletList items={ev.gaps} tone="warn" />
                </div>
              )}
              {nextSteps.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                    <Lightbulb className="size-4 text-signal" aria-hidden />
                    Next steps
                  </h3>
                  <BulletList items={nextSteps} tone="signal" />
                </div>
              )}
            </div>
          </Section>

          <Section
            id="rubric"
            title="Requirements"
            icon={<ListChecks className="size-4" aria-hidden />}
            meta={<Count>{ev.results.length}</Count>}
            open={open.rubric}
            onToggle={() => toggle("rubric")}
          >
            <div className="space-y-6">
              {groups.map((g) => (
                <div key={g.category} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold">
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
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FLAGS.map((f) => {
                const value = suiteB.flags[f.key];
                const good = value === f.goodWhen;
                return (
                  <li key={f.key} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3.5 py-3 text-[13px] ring-1 ring-border">
                    <span>{f.label}</span>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", good ? "text-ok" : "text-bad")}>
                      {good ? <CircleCheck className="size-4" aria-hidden /> : <CircleX className="size-4" aria-hidden />}
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
              <p className="text-[13px] text-muted-foreground">No quotes recorded.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {suiteB.criteria.flatMap((c) =>
                  c.evidenceQuotes.map((q, qIdx) => (
                    <li key={`${c.criterion}-${qIdx}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedCitation({ title: c.label, quote: q, rationale: c.rationale, confidence: c.confidence })}
                        className="lift group flex w-full items-center gap-3 rounded-xl bg-surface-container-low p-3 text-left ring-1 ring-border hover:ring-signal/40"
                      >
                        <span className="shrink-0 rounded-full bg-signal-soft px-2 py-0.5 text-[11px] font-semibold text-signal-ink">{c.label}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/85">&ldquo;{q}&rdquo;</span>
                        <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">{c.score}/5</span>
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
            <Link href={`/report/${ev.id}/employer`} className={buttonVariants({ variant: "signal", size: "lg", className: "rounded-full px-4" })}>
              Share with employer
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>

        <Dialog open={!!selectedCitation} onOpenChange={(o) => !o && setSelectedCitation(null)}>
          <DialogContent className="max-w-lg rounded-2xl">
            {selectedCitation && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-title">{selectedCitation.title}</DialogTitle>
                </DialogHeader>
                <blockquote className="rounded-xl bg-mark/40 p-4 text-sm leading-relaxed">&ldquo;{selectedCitation.quote}&rdquo;</blockquote>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{selectedCitation.rationale}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Confidence</span>
                  <Meter value={selectedCitation.confidence} max={1} className="w-24" />
                  <span className="tabular font-mono">{Math.round(selectedCitation.confidence * 100)}%</span>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </EvidenceProvider>
  );
}
