"use client";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Info,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { DimensionEvaluation } from "@/lib/types/assessment-academic";
import { cn } from "@/lib/utils";
import { useEvidence } from "@/components/evidence/evidence-context";

interface AcademicRubricCardProps {
  evaluation: DimensionEvaluation;
  className?: string;
}

export function AcademicRubricCard({ evaluation, className }: AcademicRubricCardProps) {
  const { jump } = useEvidence();
  const { paperMeta, qualitativeBand, score, rationale, evidenceTraces } = evaluation;

  const isLowScore = score !== null && score <= 3;
  const isAtRisk = qualitativeBand === "AT_RISK" || qualitativeBand === "DEVELOPING";

  const bandStyles: Record<
    typeof qualitativeBand,
    { badge: string; border: string; bg: string; dot: string }
  > = {
    EXEMPLARY: {
      badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/5",
      dot: "bg-emerald-500",
    },
    PROFICIENT: {
      badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
      border: "border-blue-500/20",
      bg: "bg-blue-500/5",
      dot: "bg-blue-500",
    },
    DEVELOPING: {
      badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      dot: "bg-amber-500",
    },
    AT_RISK: {
      badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
      border: "border-rose-500/20",
      bg: "bg-rose-500/5",
      dot: "bg-rose-500",
    },
  };

  const style = bandStyles[qualitativeBand];

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5 transition-shadow hover:shadow-sm bg-card",
        style.border,
        className
      )}
    >
      <div className="space-y-3.5">
        {/* Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                <BookOpen className="size-3 text-primary" aria-hidden />
                {paperMeta.citationKey}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
                  style.badge
                )}
              >
                <span className={cn("size-1.5 rounded-full", style.dot)} />
                {qualitativeBand}
              </span>
            </div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {evaluation.name}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="tabular font-display text-2xl font-bold">
              {score !== null ? `${score}/5` : "Unscored"}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {Math.round(evaluation.confidence * 100)}% confidence
            </span>
          </div>
        </div>

        {/* Core Rationale */}
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {rationale}
        </p>

        {/* Observable Evidential Traces */}
        {evidenceTraces.length > 0 && (
          <div className="space-y-2 rounded-xl bg-muted/40 p-3">
            <div className="text-xs font-semibold text-muted-foreground">
              Observable Behavioral Evidence
            </div>
            <ul className="space-y-2">
              {evidenceTraces.map((trace, idx) => (
                <li key={`${trace.turnId}-${idx}`} className="space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const turnNum = trace.turnId.replace(/\D/g, "");
                        jump("turn", turnNum, trace.excerpt);
                      }}
                      className="lift inline-flex items-center gap-1.5 rounded-full bg-signal-soft px-2.5 py-0.5 font-medium text-signal-ink ring-1 ring-signal/20 hover:ring-signal/40"
                      title="Click to view turn in transcript"
                    >
                      <MessageSquare className="size-3" aria-hidden />
                      <span>{trace.turnId}</span>
                    </button>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                        trace.observedBehavior === "SUCCESS_SIGNAL"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      )}
                    >
                      {trace.observedBehavior === "SUCCESS_SIGNAL" ? (
                        <>
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          <span>Demonstrated Competency</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="size-3 text-rose-600" />
                          <span>Automation Bias Trap</span>
                        </>
                      )}
                    </span>
                  </div>
                  <blockquote className="border-l-2 border-primary/30 pl-2.5 text-[12px] italic text-foreground/80 line-clamp-2">
                    &ldquo;{trace.excerpt}&rdquo;
                  </blockquote>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Research Paper Recommendation Link */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
          <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[280px] sm:max-w-md">
            <span className="font-medium text-foreground">{paperMeta.title}</span> ({paperMeta.venue} {paperMeta.year})
          </div>

          <a
            href={paperMeta.openAccessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              isLowScore
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <BookOpen className="size-3.5" aria-hidden />
            <span>{isLowScore ? "Read Research Paper (Recommended)" : "View Source Study"}</span>
            <ExternalLink className="size-3 opacity-70" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
