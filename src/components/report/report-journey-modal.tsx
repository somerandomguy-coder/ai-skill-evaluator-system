"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Layers,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { EvaluationView, SuiteAView, SuiteBView } from "@/lib/data/types";
import type { GroundedAssessmentReport } from "@/lib/types/assessment-academic";
import { cn } from "@/lib/utils";

interface ReportJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: EvaluationView;
  suiteA: SuiteAView;
  suiteB: SuiteBView;
  groundedAssessment?: GroundedAssessmentReport;
}

/**
 * Animated counter hook that smoothly interpolates from 0 to target.
 * Uses requestAnimationFrame with cubic ease-out.
 */
function useAnimatedCounter(target: number, durationMs = 700, active = true): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrent(target);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, durationMs, active]);

  return current;
}

export function ReportJourneyModal({
  isOpen,
  onClose,
  evaluation: ev,
  suiteA,
  suiteB,
  groundedAssessment,
}: ReportJourneyModalProps) {
  const [step, setStep] = useState(0);
  const totalSteps = 5;

  const biasIndex = groundedAssessment?.automationBiasIndex ?? 0.35;
  const biasPct = Math.round(biasIndex * 100);

  // Animated values for active step
  const animOverall = useAnimatedCounter(ev.effective.score, 600, isOpen && step === 0);
  const animSuiteA = useAnimatedCounter(suiteA.score, 600, isOpen && step === 1);
  const suiteBScore = suiteB.criteria?.length ? suiteB.criteria.reduce((sum, c) => sum + c.score, 0) : suiteB.score;
  const animSuiteB = useAnimatedCounter(suiteBScore, 600, isOpen && step === 2);
  const animBias = useAnimatedCounter(biasPct, 600, isOpen && step === 3);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (step < totalSteps - 1) {
          setStep((s) => s + 1);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft") {
        if (step > 0) setStep((s) => s - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, step, totalSteps, onClose]);

  if (!isOpen) return null;

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-2xl transition-all sm:p-8">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4">
          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === step
                    ? "w-7 bg-primary"
                    : idx < step
                    ? "w-2.5 bg-primary/40"
                    : "w-2.5 bg-muted"
                )}
              />
            ))}
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              {step + 1} of {totalSteps}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Skip tour
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Step Content */}
        <div className="py-6 sm:py-8 min-h-[310px] flex flex-col justify-center">
          {/* Step 0: Overall Score */}
          {step === 0 && (
            <div className="space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-7" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Your Assessment Verdict
                </span>
                <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-balance">
                  {ev.challenge.title}
                </h3>
              </div>

              <div className="py-2">
                <div className="font-display text-6xl font-extrabold tracking-tight text-primary sm:text-7xl">
                  {animOverall}%
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  {ev.effective.basis === "mentor-override"
                    ? "Mentor Adjusted"
                    : ev.effective.basis === "mentor-confirmed"
                    ? "Mentor Confirmed"
                    : "AI Evaluated"}
                </div>
              </div>

              <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                Evaluated against real Australian statutory requirements and SFIA 9 industry standards.
              </p>
            </div>
          )}

          {/* Step 1: Product 4D Lifecycle */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Layers className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Dimension 1</span>
                  <h3 className="text-lg font-bold">Product Quality & 4D Lifecycle</h3>
                </div>
                <div className="ml-auto text-right">
                  <span className="font-display text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {animSuiteA}
                  </span>
                  <span className="text-xs text-muted-foreground">/{suiteA.maxScore || 40}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Measures how well the final code meets user requirements across the software lifecycle.
              </p>

              <div className="grid gap-2.5 rounded-2xl border border-border/60 bg-muted/20 p-4">
                {suiteA.phases.map((phase) => (
                  <div key={phase.name} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground/90">{phase.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:w-36">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${(phase.score / (phase.maxScore || 10)) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {phase.score}/{phase.maxScore || 10}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: AI Steering & Collaboration */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Compass className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Dimension 2</span>
                  <h3 className="text-lg font-bold">How You Steered the AI</h3>
                </div>
                <div className="ml-auto text-right">
                  <span className="font-display text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {animSuiteB}
                  </span>
                  <span className="text-xs text-muted-foreground">/25</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Grounded in Barke et al. (OOPSLA &apos;23). Tracks whether you actively designed before coding, or asked for monolithic one-shot generations.
              </p>

              <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="font-medium">Exploration vs Speed:</span>
                  <span className="text-muted-foreground">
                    {suiteBScore >= 18 ? "Planned design before coding" : "Jumped to coding quickly"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-medium">Problem Breakdown:</span>
                  <span className="text-muted-foreground">
                    {ev.turns.length >= 3 ? "Guided AI step-by-step" : "Broad monolithic requests"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Cognitive Verification & Automation Bias */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl",
                    biasIndex < 0.36
                      ? "bg-emerald-500/10 text-emerald-600"
                      : biasIndex < 0.65
                      ? "bg-blue-500/10 text-blue-600"
                      : "bg-amber-500/10 text-amber-600"
                  )}
                >
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Dimension 3</span>
                  <h3 className="text-lg font-bold">Code Verification & AI Trust</h3>
                </div>
                <div className="ml-auto text-right">
                  <span
                    className={cn(
                      "font-display text-2xl font-bold",
                      biasIndex < 0.36
                        ? "text-emerald-600"
                        : biasIndex < 0.65
                        ? "text-blue-600"
                        : "text-amber-600"
                    )}
                  >
                    {animBias}%
                  </span>
                  <span className="text-xs text-muted-foreground block">overreliance</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      biasIndex < 0.36
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : biasIndex < 0.65
                        ? "bg-gradient-to-r from-blue-500 to-cyan-400"
                        : "bg-gradient-to-r from-amber-500 to-rose-500"
                    )}
                    style={{ width: `${Math.max(5, animBias)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Careful Testing (0%)</span>
                  <span>Blind Trust (100%)</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
                {biasIndex < 0.36 ? (
                  <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                    Excellent verification! You treated AI code as drafts, tested calculations, and checked edge cases.
                  </p>
                ) : (
                  <p className="text-amber-700 dark:text-amber-300 font-medium">
                    You accepted generated code without reviewing it. Top engineers inspect and test AI code before saving.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Strengths & Next Steps */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Summary Takeaways
                </span>
                <h3 className="text-xl font-bold tracking-tight">Key Strengths & Next Steps</h3>
              </div>

              {suiteB.strengths.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="size-3.5" />
                    <span>What You Did Well</span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {suiteB.strengths.slice(0, 2).map((s, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 rounded-xl bg-emerald-500/5 p-2.5 text-foreground/90 border border-emerald-500/20"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {suiteB.nextSteps.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Lightbulb className="size-3.5" />
                    <span>Actionable Next Step</span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {suiteB.nextSteps.slice(0, 2).map((stepItem, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 rounded-xl bg-primary/5 p-2.5 text-foreground/90 border border-primary/20"
                      >
                        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{stepItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:scale-[1.02]"
          >
            <span>{step === totalSteps - 1 ? "View Full Report" : "Next"}</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
