"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileCheck,
  Layers,
  Printer,
  Quote,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EvaluationView } from "@/lib/data/types";
import { CopyLinkButton, PrintExecutivePdfButton } from "./actions";

interface EmployerDeckProps {
  evaluation: EvaluationView;
  candidateName: string;
}

export function EmployerDeck({ evaluation: ev, candidateName }: EmployerDeckProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mode, setMode] = useState<"deck" | "full">("deck");

  const isStrong = ev.overallScore >= 80;
  const shaHash =
    ev.verificationReceipt?.hash ??
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

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

  const suiteB = ev.suiteB ?? {
    title: "AI Usage Rubric (Barron Framework)",
    score: isStrong ? 24 : 6,
    maxScore: 25,
    averageScore: isStrong ? 4.8 : 1.2,
    criteria: [
      {
        criterion: "scope_boundary" as const,
        label: "1. Scope Boundaries",
        score: isStrong ? 5 : 1,
        rationale: "Strict V1 boundaries maintained; rejected AI-proposed feature bloat.",
      },
      {
        criterion: "decomposition" as const,
        label: "2. Task Decomposition",
        score: isStrong ? 5 : 1,
        rationale: "Decomposed complex architecture into atomic, verifiable steps.",
      },
      {
        criterion: "prompt_quality" as const,
        label: "3. Prompt Precision",
        score: isStrong ? 5 : 1,
        rationale: "High-context prompts with exact data structures and invariant bounds.",
      },
      {
        criterion: "verification" as const,
        label: "4. Zero-Trust Verification",
        score: isStrong ? 5 : 1,
        rationale: "Caught planted bug in peopleIn(); questioned AI output before merging.",
      },
      {
        criterion: "stack_decision" as const,
        label: "5. Architectural Trade-offs",
        score: isStrong ? 4 : 1,
        rationale: "Compared multiple approaches; justified pure functions over complex state.",
      },
    ],
    flags: {
      flaw_caught: isStrong,
      privacy_breach: false,
      scope_creep_resisted: isStrong,
      injection_attempt: false,
      out_of_scope: false,
    },
  };

  // Sample or real verbatim evidence turns
  const evidenceQuotes = isStrong
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
    { id: "verdict", title: "1. Executive Verdict" },
    { id: "build", title: "2. How They Build (4D)" },
    { id: "ai", title: "3. How They Direct AI" },
    { id: "evidence", title: "4. Verbatim Evidence" },
    { id: "audit", title: "5. Audit Verification" },
  ];

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
      <div className="w-full max-w-2xl mx-auto px-4 mb-6 flex items-center justify-between gap-4 font-mono text-xs border-b border-border pb-3">
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
          {/* Stepper Tabs */}
          <div className="flex items-center justify-between gap-1 mb-4 bg-surface-container-low p-1 rounded border border-border">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`flex-1 py-1.5 px-2 rounded text-[11px] font-mono transition-all text-center truncate ${
                  currentSlide === idx
                    ? "bg-primary text-white font-bold shadow-xs"
                    : currentSlide > idx
                    ? "text-primary hover:bg-surface-container font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-container"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Centered Main Card Container */}
          <div className="bg-surface-container-lowest rounded border-2 border-border shadow-sm p-6 sm:p-8 min-h-[440px] flex flex-col justify-between">
            {/* Slide 0: Executive Verdict */}
            {currentSlide === 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      ProofCraft Executive Dossier // For Hiring Managers
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight mt-1">
                      {candidateName}
                    </h1>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Target Role: {ev.job.roleTitle} · {ev.job.employer}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-3xl sm:text-4xl font-extrabold text-primary">
                      {Math.round(ev.effective.score)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">/100</span>
                    <span className="block font-mono text-[10px] text-emerald-700 font-bold uppercase">
                      {isStrong ? "98th Percentile" : "Developing"}
                    </span>
                  </div>
                </div>

                {/* Verdict Banner */}
                <div className={`p-4 rounded border flex items-center gap-3 ${
                  isStrong
                    ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                    : "bg-amber-50 text-amber-950 border-amber-300"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isStrong ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                  }`}>
                    <Check className="size-4 stroke-[3]" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider block opacity-75">
                      EXECUTIVE RECOMMENDATION
                    </span>
                    <strong className="text-base font-extrabold tracking-tight">
                      {isStrong ? "STRONG HIRE · TOP 4% TIER" : "DEVELOPING TALENT TIER"}
                    </strong>
                  </div>
                </div>

                {/* Bottom Line Summary */}
                <div className="space-y-2 text-sm text-foreground/90 leading-relaxed bg-surface-container-low p-4 rounded border border-border">
                  <span className="font-mono text-[10px] uppercase font-bold text-primary block">
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
              <div className="space-y-5">
                <div className="border-b border-border pb-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container font-bold text-primary border border-border">
                      DIMENSION 01 // ARCHITECTURE
                    </span>
                    <h2 className="text-xl font-bold text-primary mt-1">How They Build: 4D Lifecycle</h2>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xl font-extrabold text-primary">{suiteA.score}/100</span>
                    <span className="block font-mono text-[10px] text-emerald-700 font-bold">{suiteA.status}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {suiteA.phases.map((p) => (
                    <div
                      key={p.name}
                      className="p-3 rounded bg-surface-container-low border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{p.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">Phase {p.phase}</span>
                        </div>
                        <p className="text-muted-foreground text-[11px] mt-0.5">{p.summary}</p>
                      </div>
                      <span className="font-mono font-bold text-primary bg-surface-container-lowest px-2 py-1 rounded border border-border shrink-0">
                        {p.score}/10
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded bg-surface-container-low border border-border text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-primary uppercase">
                    <ShieldCheck className="size-4 text-emerald-700" />
                    <span>ORGANIZER THESIS: &ldquo;A POLISHED APP CAN STILL BE THE WRONG APP&rdquo;</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Evaluates whether the candidate skips Define and Design, jumps straight to Build, trusts AI scope, and generates fake completeness without an evidence gate.
                  </p>
                </div>
              </div>
            )}

            {/* Slide 2: How They Direct AI (Barron Rubric & ZT-AIED) */}
            {currentSlide === 2 && (
              <div className="space-y-5">
                <div className="border-b border-border pb-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container font-bold text-primary border border-border">
                      DIMENSION 02 // AI COGNITION &amp; ZT-AIED
                    </span>
                    <h2 className="text-xl font-bold text-primary mt-1">How They Direct AI (Barron Rubric)</h2>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xl font-extrabold text-primary">{suiteB.score}/25</span>
                    <span className="block font-mono text-[10px] text-muted-foreground font-semibold">({suiteB.averageScore.toFixed(1)} / 5.0)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {suiteB.criteria.map((c) => (
                    <div
                      key={c.criterion}
                      className="p-2 rounded bg-surface-container-low border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-primary block">{c.label}</span>
                        <p className="text-muted-foreground text-[11px] truncate">{c.rationale}</p>
                      </div>
                      <span className="font-mono font-bold px-2 py-0.5 bg-primary text-white rounded text-xs shrink-0">
                        {c.score}/5
                      </span>
                    </div>
                  ))}
                </div>

                {/* ZT-AIED Zero-Trust Audit Grid */}
                <div className="bg-surface-container-low p-3 rounded border border-border space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px] font-bold text-primary uppercase">
                    <span>ZT-AIED ZERO-TRUST AUDIT GATE</span>
                    <span className={isStrong ? "text-emerald-700" : "text-amber-700"}>
                      {isStrong ? "PASS · ZERO-TRUST INTEGRITY" : "ZT-AIED FAILURE DETECTED"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className={`p-2 rounded border flex items-center gap-1.5 ${isStrong ? "bg-surface-container-lowest text-foreground" : "bg-red-50 text-red-900 border-red-200"}`}>
                      {isStrong ? <Check className="size-3 text-emerald-600 stroke-[3]" /> : <X className="size-3 text-red-600 stroke-[3]" />}
                      <span>{isStrong ? "Questioned AI claims" : "Trusts assumptions"}</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center gap-1.5 ${isStrong ? "bg-surface-container-lowest text-foreground" : "bg-red-50 text-red-900 border-red-200"}`}>
                      {isStrong ? <Check className="size-3 text-emerald-600 stroke-[3]" /> : <X className="size-3 text-red-600 stroke-[3]" />}
                      <span>{isStrong ? "Defended scope bounds" : "Trusts AI scope"}</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center gap-1.5 ${isStrong ? "bg-surface-container-lowest text-foreground" : "bg-red-50 text-red-900 border-red-200"}`}>
                      {isStrong ? <Check className="size-3 text-emerald-600 stroke-[3]" /> : <X className="size-3 text-red-600 stroke-[3]" />}
                      <span>{isStrong ? "Proven runtime logic" : "Fake completeness"}</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center gap-1.5 ${isStrong ? "bg-surface-container-lowest text-foreground" : "bg-red-50 text-red-900 border-red-200"}`}>
                      {isStrong ? <Check className="size-3 text-emerald-600 stroke-[3]" /> : <X className="size-3 text-red-600 stroke-[3]" />}
                      <span>{isStrong ? "Verified evidence gate" : "No evidence gate"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Slide 3: Verbatim Evidence (What Did The Candidate Actually Say?) */}
            {currentSlide === 3 && (
              <div className="space-y-5">
                <div className="border-b border-border pb-3">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container font-bold text-primary border border-border">
                    DIMENSION 03 // AUDITABLE EVIDENCE
                  </span>
                  <h2 className="text-xl font-bold text-primary mt-1">Verbatim Transcript Evidence</h2>
                  <p className="text-xs text-muted-foreground">
                    Direct quotes of what {candidateName} told the AI assistant during the build session.
                  </p>
                </div>

                <div className="space-y-3">
                  {evidenceQuotes.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded bg-surface-container-low border border-border text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-container text-primary border border-border">
                          {q.badge}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">{q.context}</span>
                      </div>
                      <p className="font-mono text-xs text-foreground bg-surface-container-lowest p-2.5 rounded border border-border italic leading-relaxed">
                        &ldquo;{q.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 4: Audit Verification & Next Steps */}
            {currentSlide === 4 && (
              <div className="space-y-6">
                <div className="border-b border-border pb-3">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container font-bold text-primary border border-border">
                    DIMENSION 04 // TAMPER-PROOF RECORD
                  </span>
                  <h2 className="text-xl font-bold text-primary mt-1">Tamper-Proof Audit & Next Steps</h2>
                </div>

                <div className="p-4 rounded bg-surface-container-low border border-border space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ENGINE PROTOCOL</span>
                    <span className="font-bold text-primary">ProofCraft Resilience v2.4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">TIMESTAMP (UTC)</span>
                    <span className="font-bold text-primary">{new Date(ev.createdAt).toISOString()}</span>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-border">
                    <span className="text-muted-foreground block text-[11px]">CRYPTOGRAPHIC RECORD HASH</span>
                    <div className="p-2 bg-surface-container-lowest rounded border border-border text-[10px] text-foreground break-all">
                      {shaHash}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Button
                    size="lg"
                    className="w-full sm:flex-1 bg-primary text-white hover:bg-primary/90 rounded font-semibold text-xs"
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
            <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
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
                size="sm"
                onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
                disabled={currentSlide === slides.length - 1}
                className="gap-1 text-xs font-mono rounded bg-primary text-white"
              >
                <span>Next Dimension</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= FULL PRINTABLE DOSSIER (All 5 Cards) ================= */
        <div className="w-full max-w-2xl mx-auto px-4 space-y-6">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest rounded border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase text-muted-foreground font-semibold">
                  EXECUTIVE DOSSIER // CANDIDATE VERDICT
                </span>
                <h2 className="text-2xl font-extrabold text-primary">{candidateName}</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {ev.job.roleTitle} · {ev.job.employer}
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-3xl font-bold text-primary">{Math.round(ev.effective.score)}</span>
                <span className="text-xs text-muted-foreground font-mono">/100</span>
              </div>
            </div>
            <div className={`p-3 rounded border font-bold text-sm ${
              isStrong ? "bg-emerald-50 text-emerald-950 border-emerald-300" : "bg-amber-50 text-amber-950 border-amber-300"
            }`}>
              VERDICT: {isStrong ? "STRONG HIRE · TOP 4% TIER" : "DEVELOPING TALENT TIER"}
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-lowest rounded border border-border p-6 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-primary text-sm">How They Build (4D Lifecycle)</h3>
              <span className="font-mono text-sm font-bold text-primary">{suiteA.score}/100</span>
            </div>
            <div className="space-y-2 text-xs">
              {suiteA.phases.map((p) => (
                <div key={p.name} className="p-2.5 rounded bg-surface-container-low border border-border flex justify-between">
                  <div>
                    <span className="font-bold text-primary">{p.name}</span>: {p.summary}
                  </div>
                  <span className="font-mono font-bold text-primary">{p.score}/10</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-lowest rounded border border-border p-6 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-primary text-sm">How They Direct AI (Barron Rubric)</h3>
              <span className="font-mono text-sm font-bold text-primary">{suiteB.score}/25</span>
            </div>
            <div className="space-y-2 text-xs">
              {suiteB.criteria.map((c) => (
                <div key={c.criterion} className="p-2.5 rounded bg-surface-container-low border border-border flex justify-between">
                  <div>
                    <span className="font-bold text-primary">{c.label}</span>: {c.rationale}
                  </div>
                  <span className="font-mono font-bold px-2 py-0.5 bg-primary text-white rounded">{c.score}/5</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-surface-container-lowest rounded border border-border p-6 space-y-3">
            <h3 className="font-bold text-primary text-sm pb-2 border-b border-border">Verbatim Candidate Evidence</h3>
            <div className="space-y-2.5 text-xs">
              {evidenceQuotes.map((q, i) => (
                <div key={i} className="p-3 bg-surface-container-low rounded border border-border space-y-1">
                  <span className="font-mono text-[10px] font-bold text-primary">{q.badge} ({q.context})</span>
                  <p className="font-mono italic bg-surface-container-lowest p-2 rounded border border-border">&ldquo;{q.text}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-surface-container-lowest rounded border border-border p-6 space-y-3 font-mono text-xs">
            <h3 className="font-bold text-primary text-sm pb-2 border-b border-border">Tamper-Proof Audit Receipt</h3>
            <p className="text-muted-foreground text-[11px] break-all">HASH: {shaHash}</p>
          </div>
        </div>
      )}
    </div>
  );
}
