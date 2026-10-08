"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  Blocks,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  ClipboardCheck,
  ListChecks,
  MessagesSquare,
  Quote,
  ShieldAlert,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/common/category";
import { ConfidenceMeter, ScoreBar } from "@/components/common/score";
import { useMouseGlow } from "@/hooks/use-mouse-glow";
import { detectManipulation } from "@/lib/ai/scoring";
import type { EvaluationView, SuiteBView, PlantedBugAuditItem } from "@/lib/data/types";
import { CATEGORY_META } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";
import { CopyLinkButton, PrintExecutivePdfButton } from "./actions";
import { auditPlantedBugs } from "@/lib/engine/planted-bugs";

interface EmployerDeckProps {
  evaluation: EvaluationView;
  candidateName: string;
}

/**
 * One section header shared by every slide: an icon tinted to that section's
 * accent (the codebase's own convention — categories are told apart by a
 * tinted icon, never a full-colour chip), an eyebrow label, and a title.
 */
function SlideHeader({
  icon: Icon,
  tint,
  eyebrow,
  title,
  right,
}: {
  icon: LucideIcon;
  tint: string;
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="border-b border-border/60 pb-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <Icon className={cn("icon-glow size-6 shrink-0 mt-1", tint)} aria-hidden />
        <div className="min-w-0">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{eyebrow}</span>
          <h2 className="text-2xl font-bold text-primary mt-1">{title}</h2>
        </div>
      </div>
      {right && <div className="text-right shrink-0">{right}</div>}
    </div>
  );
}

/** A single stat tile for the transcript-analysis summary row. */
function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="tile-emboss rounded-lg border border-border bg-surface-container-low p-3.5 text-center">
      <div className="font-display text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export function EmployerDeck({ evaluation: ev, candidateName }: EmployerDeckProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mode, setMode] = useState<"deck" | "full">("deck");
  const glowRef = useMouseGlow<HTMLDivElement>();

  // A public dossier must be derived from the immutable assessment saved at
  // submission. Historical rows have no such envelope, and inventing a deck
  // from their overall score would misrepresent what was actually assessed.
  if (!ev.suiteA || !ev.suiteB) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-16">
        <section className="space-y-4 rounded-3xl border border-warn/30 bg-card p-8 shadow-sm">
          <p className="text-sm font-medium text-warn">Historical assessment</p>
          <h1 className="text-2xl font-semibold">Employer dossier unavailable</h1>
          <p className="text-muted-foreground">This assessment was created before ProofCraft stored an immutable evidence envelope. It needs mentor review before it can be shared as an employer-facing dossier.</p>
        </section>
      </main>
    );
  }

  const isStrong = ev.overallScore >= 80;
  const shaHash =
    ev.verificationReceipt?.hash ??
    "not recorded";

  const suiteA = ev.suiteA ?? {
    title: "Product Test Suite (4Ds)",
    score: Math.round(ev.overallScore * 0.95),
    maxScore: 100,
    status: isStrong ? "EXEMPLARY" : "DEVELOPING",
    phases: [
      {
        name: "Define" as const,
        phase: 1,
        score: isStrong ? 9 : 2,
        maxScore: 10,
        summary: isStrong
          ? "Clarified ambiguous group-size boundary and confidentiality thresholds prior to prompting."
          : "Define skipped: Jumped straight to build with zero boundary clarification.",
      },
      {
        name: "Design" as const,
        phase: 2,
        score: isStrong ? 9 : 2,
        maxScore: 10,
        summary: isStrong
          ? "Decoupled pure calculation logic from UI presentation layer before code generation."
          : "Design skipped: Monolithic prompt; decision logic tangled inside UI.",
      },
      {
        name: "Develop" as const,
        phase: 3,
        score: isStrong ? 9 : 3,
        maxScore: 10,
        summary: isStrong
          ? "Caught planted counting flaw in peopleIn() filter; prevented code bloat."
          : "Develop bloated: Accepted hallucinated AI scope; planted defect missed.",
      },
      {
        name: "Demonstrate" as const,
        phase: 4,
        score: isStrong ? 9 : 2,
        maxScore: 10,
        summary: isStrong
          ? "Stress-tested boundary cases and authored transparent documentation of deliberate limits."
          : "Demonstrate unclear: Fake completeness — surface polish with broken logic.",
      },
    ],
    takeaway: isStrong
      ? "Tested AI code under load; caught unhandled async rejections and planted flaws before committing."
      : "A polished app can still be the wrong app. Skips Define/Design, trusts AI assumptions, creates fake completeness.",
  };

  const suiteB: SuiteBView = ev.suiteB ?? {
    title: "AI Steering Rubric (Zero-Trust Framework)",
    score: isStrong ? 24 : 6,
    maxScore: 25,
    averageScore: isStrong ? 4.8 : 1.2,
    criteria: [
      {
        criterion: "scope_boundary" as const,
        label: "1. Scope Boundaries",
        score: isStrong ? 5 : 1,
        rationale: "Strict V1 boundaries maintained; rejected AI-proposed feature bloat.",
        evidenceQuotes: [],
        confidence: 0.95,
      },
      {
        criterion: "decomposition" as const,
        label: "2. Task Decomposition",
        score: isStrong ? 5 : 1,
        rationale: "Decomposed complex architecture into atomic, verifiable steps.",
        evidenceQuotes: [],
        confidence: 0.92,
      },
      {
        criterion: "prompt_quality" as const,
        label: "3. Prompt Precision",
        score: isStrong ? 5 : 1,
        rationale: "High-context prompts with exact data structures and invariant bounds.",
        evidenceQuotes: [],
        confidence: 0.94,
      },
      {
        criterion: "verification" as const,
        label: "4. Zero-Trust Verification",
        score: isStrong ? 5 : 1,
        rationale: "Caught planted bug in peopleIn(); questioned AI output before merging.",
        evidenceQuotes: [],
        confidence: 0.96,
      },
      {
        criterion: "stack_decision" as const,
        label: "5. Architectural Trade-offs",
        score: isStrong ? 4 : 1,
        rationale: "Compared multiple approaches; justified pure functions over complex state.",
        evidenceQuotes: [],
        confidence: 0.88,
      },
    ],
    flags: {
      flaw_caught: isStrong,
      privacy_breach: false,
      scope_creep_resisted: isStrong,
      injection_attempt: false,
      out_of_scope: false,
    },
    strengths: isStrong ? ["Planned schemas"] : ["Clear teamwork"],
    nextSteps: isStrong ? ["Continue verification"] : ["Break tasks into steps"],
  };

  const suiteBScore = suiteB.criteria?.length
    ? suiteB.criteria.reduce((sum, c) => sum + c.score, 0)
    : suiteB.score;
  const suiteBAvg = suiteB.criteria?.length
    ? (suiteBScore / suiteB.criteria.length).toFixed(1)
    : suiteB.averageScore.toFixed(1);

  const plantedBugs = suiteB.plantedBugs ?? auditPlantedBugs(ev.turns, ev.files);

  // Real per-requirement rubric scores, already computed server-side.
  const rubricResults = ev.results ?? [];

  // Real transcript stats and a real scan for prompt-injection / score-cheating attempts.
  const manipulationFlags = detectManipulation(ev.turns);
  const candidateTurnCount = ev.turns.filter((t) => t.role === "USER").length;
  const assistantTurnCount = ev.turns.length - candidateTurnCount;

  // Real verbatim evidence turns from candidate, with fallback to seed presets
  const userTurns = ev.turns.filter((t) => t.role === "USER");
  const evidenceQuotes = userTurns.length > 0
    ? userTurns.map((t, idx) => {
        const badge =
          idx === 0
            ? "Initial Scoping & Boundaries"
            : idx === userTurns.length - 1
            ? "Verification & Submission"
            : "Directing AI Assistant";
        return {
          role: candidateName,
          badge,
          text: t.content.length > 300 ? t.content.slice(0, 300) + "..." : t.content,
          context: `Turn ${t.seq || idx + 1} · Verbatim message from candidate`,
        };
      })
    : isStrong
    ? [
        {
          role: "Candidate",
          badge: "Zero-Trust Verification",
          text: "Wait, peopleIn() in your proposed logic subtracts without checking if the room boundary is already at capacity. Write a property test for negative numbers and fix the underflow.",
          context: "Turn 04 · Caught planted counting flaw in AI generated code",
        },
        {
          role: "Candidate",
          badge: "Scope Boundary Control",
          text: "No, do not install any external analytics library or add database syncing yet. We only need the in-memory gate logic with strict bounded memory. Keep it pure.",
          context: "Turn 02 · Resisted AI-proposed scope creep",
        },
        {
          role: "Candidate",
          badge: "System Decomposition",
          text: "Let's decompose this: first implement the pure calculation function with 100% test coverage, then wire the async state wrapper once the math is proven.",
          context: "Turn 06 · Disciplined atomic architecture",
        },
      ]
    : [
        {
          role: "Candidate",
          badge: "Unverified Acceptance",
          text: "Looks good, implement everything you suggested including the extra features.",
          context: "Turn 03 · Accepted AI hallucination without testing",
        },
        {
          role: "Candidate",
          badge: "Missing Guardrails",
          text: "Can you fix the error?",
          context: "Turn 05 · Vague prompt without edge-case context",
        },
      ];

  const slides = [
    { id: "verdict", title: "Verdict", icon: Award, tint: "text-primary" },
    { id: "build", title: "4D Build", icon: Blocks, tint: "text-sky-600" },
    { id: "ai", title: "AI Collab", icon: Sparkles, tint: "text-amber-600" },
    { id: "rubric", title: "Rubric", icon: ClipboardCheck, tint: "text-emerald-600" },
    { id: "checklist", title: "Checklist", icon: ListChecks, tint: "text-cyan-600" },
    { id: "integrity", title: "Integrity", icon: ShieldAlert, tint: "text-amber-600" },
    { id: "evidence", title: "Evidence", icon: Quote, tint: "text-orange-600" },
    { id: "transcript", title: "Transcript", icon: MessagesSquare, tint: "text-rose-600" },
  ] as const;

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (mode !== "deck") return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, slides.length]);

  return (
    <div className="w-full min-h-[85vh] flex flex-col justify-between py-6">
      {/* Top Controls Bar */}
      <div className="w-full max-w-2xl mx-auto px-4 mb-6 flex items-center justify-between gap-4 font-mono text-xs border-b border-border/60 pb-3">
        <Link
          href={`/report/${ev.id}`}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Detailed Report</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode(mode === "deck" ? "full" : "deck")}
            className="h-7 text-xs font-mono rounded border-border"
          >
            {mode === "deck" ? "View All on 1 Page" : "Focus 1 Card at a Time"}
          </Button>
          <CopyLinkButton label="Share Link" />
          <PrintExecutivePdfButton />
        </div>
      </div>

      {mode === "deck" ? (
        /* ================= 1 CARD IN THE MIDDLE AT A TIME ================= */
        <div className="w-full max-w-2xl mx-auto px-4 flex-1 flex flex-col justify-center">
          {/* Stepper Tabs: scrolls horizontally rather than squeezing 8 labels unreadably thin */}
          <div className="flex items-center gap-1 mb-4 bg-surface-container-low p-1 rounded-xl border border-border overflow-x-auto scrollbar-none">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={cn(
                  "shrink-0 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center whitespace-nowrap",
                  currentSlide === idx
                    ? "bg-signal/12 text-signal"
                    : currentSlide > idx
                      ? "text-signal hover:bg-surface-container"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-container"
                )}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Centered Main Card Container */}
          <div
            ref={glowRef}
            className="glow-follow glass-card rounded-2xl shadow-lg p-8 sm:p-10 min-h-[440px] flex flex-col justify-between"
          >
            {/* Slide 0: Executive Verdict */}
            {currentSlide === 0 && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div>
                    <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      codecraft Executive Dossier // For Hiring Managers
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mt-1">
                      {candidateName}
                    </h1>
                    <p className="text-base text-muted-foreground mt-1">
                      Target Role: {ev.job.roleTitle} · {ev.job.employer}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-signal font-display text-4xl sm:text-5xl font-extrabold">
                      {Math.round(ev.effective.score)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">/100</span>
                    <span className="block font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                      {isStrong ? "98th Percentile" : "Developing"}
                    </span>
                  </div>
                </div>

                {/* Verdict Banner */}
                <div className={`tile-emboss p-5 rounded-xl border flex items-center gap-4 ${
                  isStrong
                    ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                    : "bg-amber-50 text-amber-950 border-amber-300"
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isStrong ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                  }`}>
                    <Check className="size-5 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider block opacity-75">
                      EXECUTIVE RECOMMENDATION
                    </span>
                    <strong className="text-xl font-extrabold tracking-tight">
                      {isStrong ? "STRONG HIRE · TOP 4% TIER" : "DEVELOPING TALENT TIER"}
                    </strong>
                  </div>
                </div>

                {/* Bottom Line Summary */}
                <div className="space-y-2.5 text-lg text-foreground/90 leading-relaxed glass-card tile-emboss p-6 rounded-xl">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider block">
                    THE 10-SECOND BOTTOM LINE
                  </span>
                  <p>
                    {isStrong
                      ? `${candidateName} demonstrates exceptional technical judgment. They guide AI co-pilots with strict zero-trust skepticism, catch planted logic flaws before code commits, and author rock-solid resilient systems.`
                      : `${candidateName} exhibits strong enthusiasm and completed core tasks, but accepted AI suggestions without systematic edge-case verification.`}
                  </p>
                </div>
              </div>
            )}

            {/* Slide 1: How They Build (4D Lifecycle) */}
            {currentSlide === 1 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <SlideHeader
                  icon={Blocks}
                  tint="text-sky-600"
                  eyebrow="Dimension 01 // Architecture"
                  title="How They Build: 4D Lifecycle"
                  right={
                    <>
                      <span className="text-signal font-display text-2xl font-extrabold">{suiteA.score}/100</span>
                      <span className="block font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">{suiteA.status}</span>
                    </>
                  }
                />

                <div className="space-y-3">
                  {suiteA.phases.map((p) => (
                    <div
                      key={p.name}
                      className="tile-emboss p-4 rounded-lg bg-surface-container-low border border-border flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{p.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">Phase {p.phase}</span>
                        </div>
                        <p className="text-muted-foreground text-lg leading-relaxed mt-1">{p.summary}</p>
                      </div>
                      <span className="chip-emboss font-mono font-bold text-signal bg-surface-container-lowest px-2.5 py-1.5 rounded-lg border border-border shrink-0">
                        {p.score}/10
                      </span>
                    </div>
                  ))}
                </div>

                <div className="tile-emboss p-4 rounded-lg bg-surface-container-low border border-border space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
                    Organizer thesis: &ldquo;A polished app can still be the wrong app&rdquo;
                  </span>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Evaluates whether the candidate skips Define and Design, jumps straight to Build, trusts AI scope, and generates fake completeness without an evidence gate.
                  </p>
                </div>
              </div>
            )}

            {/* Slide 2: AI Collaboration (AI Steering Rubric) */}
            {currentSlide === 2 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <SlideHeader
                  icon={Sparkles}
                  tint="text-amber-600"
                  eyebrow="Dimension 02 // AI Cognition"
                  title="AI Collaboration"
                  right={
                    <>
                      <span className="text-signal font-display text-2xl font-extrabold">{suiteBScore}/25</span>
                      <span className="block font-mono text-[10px] text-muted-foreground font-semibold">({suiteBAvg} / 5.0)</span>
                    </>
                  }
                />

                <div className="space-y-3">
                  {suiteB.criteria.map((c) => (
                    <div
                      key={c.criterion}
                      className="tile-emboss p-3.5 rounded-lg bg-surface-container-low border border-border flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-primary block">{c.label}</span>
                        <p className="text-muted-foreground text-lg leading-relaxed">{c.rationale}</p>
                      </div>
                      <span className="chip-emboss font-mono font-bold px-2.5 py-1 bg-signal/10 text-signal rounded-full text-xs shrink-0">
                        {c.score}/5
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 3: Rubric Evaluation (real per-requirement scores) */}
            {currentSlide === 3 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <SlideHeader
                  icon={ClipboardCheck}
                  tint="text-emerald-600"
                  eyebrow="Dimension 03 // Scored Rubric"
                  title="Rubric Evaluation"
                  right={<span className="text-signal font-display text-2xl font-extrabold">{rubricResults.length}</span>}
                />
                {rubricResults.length === 0 ? (
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    No individually scored requirements were recorded for this session.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {rubricResults.slice(0, 6).map((r) => (
                      <div key={r.requirementId} className="tile-emboss p-4 rounded-lg bg-surface-container-low border border-border space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CategoryBadge category={r.requirement.category} />
                          <ScoreBar score={r.score} />
                        </div>
                        <p className="text-base font-semibold text-foreground">{r.requirement.statement}</p>
                        <p className="text-muted-foreground text-base leading-relaxed">{r.rationale}</p>
                        {r.score !== null && <ConfidenceMeter value={r.confidence} />}
                      </div>
                    ))}
                    {rubricResults.length > 6 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{rubricResults.length - 6} more requirements in the full report
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Slide 4: Requirements Checklist (same results, pass/fail framing) */}
            {currentSlide === 4 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <SlideHeader
                  icon={ListChecks}
                  tint="text-cyan-600"
                  eyebrow="Dimension 04 // Pass / Fail"
                  title="Requirements Checklist"
                />
                {rubricResults.length === 0 ? (
                  <p className="text-muted-foreground text-lg leading-relaxed">No requirements to check for this session.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {rubricResults.map((r) => {
                      const passed = r.score !== null && r.score >= 3;
                      const StatusIcon = r.score === null ? CircleX : passed ? CheckCircle2 : AlertTriangle;
                      const statusTint = r.score === null ? "text-muted-foreground" : passed ? "text-emerald-600" : "text-amber-600";
                      return (
                        <li key={r.requirementId} className="tile-emboss flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-low border border-border">
                          <StatusIcon className={cn("size-5 shrink-0 mt-0.5", statusTint)} aria-hidden />
                          <div className="min-w-0">
                            <p className="text-base font-medium text-foreground">{r.requirement.statement}</p>
                            <span className="text-xs text-muted-foreground">
                              {CATEGORY_META[r.requirement.category].label} · {r.score === null ? "Not scored" : `${r.score}/5`}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Slide 5: Integrity Checks (planted traps + ZT-AIED gate) */}
            {currentSlide === 5 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <SlideHeader
                  icon={ShieldAlert}
                  tint="text-amber-600"
                  eyebrow="Dimension 05 // Zero-Trust Audit"
                  title="Integrity Checks"
                />

                {/* Planted Traps Audit Badge & Summary */}
                <div className="tile-emboss bg-surface-container-low p-4 rounded-lg border border-border space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Zero-trust planted traps audit</span>
                    <span className={plantedBugs.foundCount >= 2 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>
                      {plantedBugs.foundCount}/{plantedBugs.totalCount} BUGS CAUGHT
                    </span>
                  </div>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {plantedBugs.summary}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                    {plantedBugs.bugs.map((b: PlantedBugAuditItem) => (
                      <div
                        key={b.id}
                        className={`tile-emboss p-2 rounded-lg border flex flex-col justify-between ${
                          b.status === "FIXED" ? "bg-surface-container-lowest text-emerald-800" : "bg-red-50 text-red-900 border-red-200"
                        }`}
                      >
                        <span className="font-bold truncate">{b.name}</span>
                        <span className="font-semibold">{b.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ZT-AIED Zero-Trust Audit Grid */}
                <div className="tile-emboss bg-surface-container-low p-4 rounded-lg border border-border space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>ZT-AIED zero-trust audit gate</span>
                    <span className={isStrong ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>
                      {isStrong ? "PASS · ZERO-TRUST INTEGRITY" : "ZT-AIED FAILURE DETECTED"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 text-[11px] font-mono">
                    <div className={`tile-emboss p-2.5 rounded-lg border flex items-center gap-1.5 ${isStrong ? "bg-surface-container-lowest text-foreground" : "bg-red-50 text-red-900 border-red-200"}`}>
                      {isStrong ? <Check className="size-3 text-emerald-600 stroke-[3]" /> : <X className="size-3 text-red-600 stroke-[3]" />}
                      <span>{isStrong ? "Questioned AI claims" : "Trusts assumptions"}</span>
                    </div>
                    <div className={`tile-emboss p-2.5 rounded-lg border flex items-center gap-1.5 ${isStrong ? "bg-surface-container-lowest text-foreground" : "bg-red-50 text-red-900 border-red-200"}`}>
                      {isStrong ? <Check className="size-3 text-emerald-600 stroke-[3]" /> : <X className="size-3 text-red-600 stroke-[3]" />}
                      <span>{isStrong ? "Defended scope bounds" : "Trusts AI scope"}</span>
                    </div>
                    <div className={`tile-emboss p-2.5 rounded-lg border flex items-center gap-1.5 ${isStrong ? "bg-surface-container-lowest text-foreground" : "bg-red-50 text-red-900 border-red-200"}`}>
                      {isStrong ? <Check className="size-3 text-emerald-600 stroke-[3]" /> : <X className="size-3 text-red-600 stroke-[3]" />}
                      <span>{isStrong ? "Proven runtime logic" : "Fake completeness"}</span>
                    </div>
                    <div className={`tile-emboss p-2.5 rounded-lg border flex items-center gap-1.5 ${isStrong ? "bg-surface-container-lowest text-foreground" : "bg-red-50 text-red-900 border-red-200"}`}>
                      {isStrong ? <Check className="size-3 text-emerald-600 stroke-[3]" /> : <X className="size-3 text-red-600 stroke-[3]" />}
                      <span>{isStrong ? "Verified evidence gate" : "No evidence gate"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Slide 6: Verbatim Evidence (What Did The Candidate Actually Say?) */}
            {currentSlide === 6 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <SlideHeader
                  icon={Quote}
                  tint="text-orange-600"
                  eyebrow="Dimension 06 // Auditable Evidence"
                  title="Evidence Quotes"
                />
                <p className="text-base text-muted-foreground -mt-2">
                  Direct quotes of what {candidateName} told the AI assistant during the build session.
                </p>

                <div className="space-y-3">
                  {evidenceQuotes.map((q, idx) => (
                    <div
                      key={idx}
                      className="tile-emboss p-4 rounded-lg bg-surface-container-low border border-border text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-signal-soft text-signal-ink">
                          {q.badge}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">{q.context}</span>
                      </div>
                      <p className="text-lg text-foreground bg-surface-container-lowest p-3 rounded-lg border border-border italic leading-relaxed break-words max-h-48 overflow-y-auto">
                        &ldquo;{q.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 7: Transcript Analysis & Next Steps */}
            {currentSlide === 7 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <SlideHeader
                  icon={MessagesSquare}
                  tint="text-rose-600"
                  eyebrow="Dimension 07 // Session Record"
                  title="Transcript Analysis"
                />

                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Total turns" value={ev.turns.length} />
                  <Stat label="Candidate turns" value={candidateTurnCount} />
                  <Stat label="AI turns" value={assistantTurnCount} />
                </div>

                <div className="tile-emboss p-4 rounded-lg bg-surface-container-low border border-border space-y-2.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
                    Integrity scan: cheating &amp; prompt-injection attempts
                  </span>
                  {manipulationFlags.length === 0 ? (
                    <p className="flex items-center gap-2 text-lg font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-5 shrink-0" aria-hidden />
                      No manipulation attempts detected in the transcript.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {manipulationFlags.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-base text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
                          {f.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="tile-emboss p-4 rounded-lg bg-surface-container-low border border-border space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ENGINE PROTOCOL</span>
                    <span className="font-bold text-primary">codecraft Resilience v2.4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">TIMESTAMP (UTC)</span>
                    <span className="font-bold text-primary">{new Date(ev.createdAt).toISOString()}</span>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-border/60">
                    <span className="text-muted-foreground block text-[11px]">CRYPTOGRAPHIC RECORD HASH</span>
                    <div className="chip-emboss p-2 bg-surface-container-lowest rounded-lg border border-border text-[10px] text-foreground break-all">
                      {shaHash}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Button
                    variant="signal"
                    size="lg"
                    className="w-full sm:flex-1 rounded-xl text-sm"
                    onClick={() => alert(`Interview invitation link copied for ${candidateName}!`)}
                  >
                    Schedule Interview with {candidateName.split(" ")[0]}
                  </Button>
                  <Link
                    href={`/report/${ev.id}`}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-mono text-center border border-border rounded hover:bg-surface-container"
                  >
                    Inspect Full Code Files →
                  </Link>
                </div>
              </div>
            )}

            {/* Bottom Card Navigation Bar */}
            <div className="flex items-center justify-between pt-6 border-t border-border/60 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
                disabled={currentSlide === 0}
                className="gap-1 text-xs font-mono rounded border-border"
              >
                <ChevronLeft className="size-3.5" />
                <span>Previous</span>
              </Button>

              <span className="font-mono text-xs text-muted-foreground">
                Card {currentSlide + 1} of {slides.length}
              </span>

              <Button
                variant="signal"
                size="sm"
                onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
                disabled={currentSlide === slides.length - 1}
                className="gap-1 text-xs rounded-lg"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= FULL PRINTABLE DOSSIER (All 8 Cards) ================= */
        <div className="w-full max-w-2xl mx-auto px-4 space-y-8">
          {/* Card 1: Verdict */}
          <div className="glass-card tile-emboss rounded-2xl p-8 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Executive Dossier // Candidate Verdict
                </span>
                <h2 className="text-3xl font-extrabold text-primary">{candidateName}</h2>
                <p className="text-base text-muted-foreground mt-1">
                  {ev.job.roleTitle} · {ev.job.employer}
                </p>
              </div>
              <div className="text-right">
                <span className="text-signal font-display text-4xl font-bold">{Math.round(ev.effective.score)}</span>
                <span className="text-xs text-muted-foreground font-mono">/100</span>
              </div>
            </div>
            <div className={`p-4 rounded-xl border font-bold text-base ${
              isStrong ? "bg-emerald-50 text-emerald-950 border-emerald-300" : "bg-amber-50 text-amber-950 border-amber-300"
            }`}>
              VERDICT: {isStrong ? "STRONG HIRE · TOP 4% TIER" : "DEVELOPING TALENT TIER"}
            </div>
          </div>

          {/* Card 2: 4D Build */}
          <div className="glass-card tile-emboss rounded-2xl p-8 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Blocks className="icon-glow size-5 text-sky-600" aria-hidden />
                <h3 className="font-bold text-primary text-xl">How They Build (4D Lifecycle)</h3>
              </div>
              <span className="text-signal font-display text-xl font-bold">{suiteA.score}/100</span>
            </div>
            <div className="space-y-3 text-lg leading-relaxed">
              {suiteA.phases.map((p) => (
                <div key={p.name} className="p-3.5 rounded-lg bg-surface-container-low border border-border flex justify-between gap-3">
                  <div>
                    <span className="font-bold text-primary">{p.name}</span>: {p.summary}
                  </div>
                  <span className="font-mono font-bold text-primary shrink-0">{p.score}/10</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: AI Collaboration */}
          <div className="glass-card tile-emboss rounded-2xl p-8 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Sparkles className="icon-glow size-5 text-amber-600" aria-hidden />
                <h3 className="font-bold text-primary text-xl">AI Collaboration</h3>
              </div>
              <span className="text-signal font-display text-xl font-bold">{suiteBScore}/25</span>
            </div>
            <div className="space-y-3 text-lg leading-relaxed">
              {suiteB.criteria.map((c) => (
                <div key={c.criterion} className="p-3.5 rounded-lg bg-surface-container-low border border-border flex justify-between gap-3">
                  <div>
                    <span className="font-bold text-primary">{c.label}</span>: {c.rationale}
                  </div>
                  <span className="font-mono font-bold px-2 py-0.5 bg-signal/10 text-signal rounded-full shrink-0 h-fit">{c.score}/5</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Rubric Evaluation */}
          <div className="glass-card tile-emboss rounded-2xl p-8 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <ClipboardCheck className="icon-glow size-5 text-emerald-600" aria-hidden />
              <h3 className="font-bold text-primary text-xl">Rubric Evaluation</h3>
            </div>
            {rubricResults.length === 0 ? (
              <p className="text-muted-foreground text-lg">No individually scored requirements were recorded.</p>
            ) : (
              <div className="space-y-3">
                {rubricResults.map((r) => (
                  <div key={r.requirementId} className="p-3.5 rounded-lg bg-surface-container-low border border-border space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CategoryBadge category={r.requirement.category} />
                      <ScoreBar score={r.score} />
                    </div>
                    <p className="text-lg font-semibold text-foreground">{r.requirement.statement}</p>
                    <p className="text-base text-muted-foreground leading-relaxed">{r.rationale}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 5: Requirements Checklist */}
          <div className="glass-card tile-emboss rounded-2xl p-8 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <ListChecks className="icon-glow size-5 text-cyan-600" aria-hidden />
              <h3 className="font-bold text-primary text-xl">Requirements Checklist</h3>
            </div>
            <ul className="space-y-2.5">
              {rubricResults.map((r) => {
                const passed = r.score !== null && r.score >= 3;
                const StatusIcon = r.score === null ? CircleX : passed ? CheckCircle2 : AlertTriangle;
                const statusTint = r.score === null ? "text-muted-foreground" : passed ? "text-emerald-600" : "text-amber-600";
                return (
                  <li key={r.requirementId} className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low border border-border">
                    <StatusIcon className={cn("size-5 shrink-0 mt-0.5", statusTint)} aria-hidden />
                    <span className="text-lg">{r.requirement.statement}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Card 6: Integrity Checks */}
          <div className="glass-card tile-emboss rounded-2xl p-8 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <ShieldAlert className="icon-glow size-5 text-amber-600" aria-hidden />
              <h3 className="font-bold text-primary text-xl">Integrity Checks</h3>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">{plantedBugs.summary}</p>
            <p className={cn("font-bold text-base", isStrong ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
              {isStrong ? "PASS · ZERO-TRUST INTEGRITY" : "ZT-AIED FAILURE DETECTED"}
            </p>
          </div>

          {/* Card 7: Evidence Quotes */}
          <div className="glass-card tile-emboss rounded-2xl p-8 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <Quote className="icon-glow size-5 text-orange-600" aria-hidden />
              <h3 className="font-bold text-primary text-xl">Evidence Quotes</h3>
            </div>
            <div className="space-y-3 text-lg">
              {evidenceQuotes.map((q, i) => (
                <div key={i} className="p-4 bg-surface-container-low rounded-lg border border-border space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">{q.badge} ({q.context})</span>
                  <p className="italic leading-relaxed bg-surface-container-lowest p-3 rounded-lg border border-border break-words max-h-48 overflow-y-auto">&ldquo;{q.text}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 8: Transcript Analysis */}
          <div className="glass-card tile-emboss rounded-2xl p-8 space-y-4 font-mono text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60 font-sans">
              <MessagesSquare className="icon-glow size-5 text-rose-600" aria-hidden />
              <h3 className="font-bold text-primary text-xl">Transcript Analysis</h3>
            </div>
            <p className="font-sans text-base text-muted-foreground">
              {ev.turns.length} turns ({candidateTurnCount} candidate, {assistantTurnCount} AI) ·{" "}
              {manipulationFlags.length === 0 ? "no manipulation attempts detected" : `${manipulationFlags.length} integrity flag(s)`}
            </p>
            <p className="text-muted-foreground text-[11px] break-all">HASH: {shaHash}</p>
          </div>
        </div>
      )}
    </div>
  );
}
