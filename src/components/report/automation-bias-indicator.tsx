import { AlertTriangle, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomationBiasIndicatorProps {
  index: number; // 0.0 - 1.0
  className?: string;
}

export function AutomationBiasIndicator({ index, className }: AutomationBiasIndicatorProps) {
  const percentage = Math.round(index * 100);
  const isHighBias = index >= 0.65;
  const isModerateBias = index >= 0.36 && index < 0.65;
  const isRigorous = index < 0.36;

  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Automation Bias Index</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              Vasconcelos et al. (CHI/CSCW)
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Quantifies cognitive verification rigour vs uncritical code rubber-stamping.
          </p>
        </div>

        <div className="flex items-baseline gap-1 text-right">
          <span
            className={cn(
              "tabular font-display text-2xl font-bold",
              isRigorous && "text-emerald-600 dark:text-emerald-400",
              isModerateBias && "text-blue-600 dark:text-blue-400",
              isHighBias && "text-amber-600 dark:text-amber-400"
            )}
          >
            {percentage}%
          </span>
          <span className="text-xs text-muted-foreground">overreliance risk</span>
        </div>
      </div>

      {/* Visual meter bar */}
      <div className="space-y-1.5">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isRigorous && "bg-gradient-to-r from-emerald-500 to-teal-400",
              isModerateBias && "bg-gradient-to-r from-blue-500 to-cyan-400",
              isHighBias && "bg-gradient-to-r from-amber-500 to-rose-500"
            )}
            style={{ width: `${Math.max(5, Math.min(100, percentage))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>0% (High Verification Rigour)</span>
          <span>100% (Blind Acceptance)</span>
        </div>
      </div>

      {/* Status banner */}
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-2xl p-3 text-xs",
          isRigorous && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20",
          isModerateBias && "bg-blue-500/10 text-blue-800 dark:text-blue-200 border border-blue-500/20",
          isHighBias && "bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20"
        )}
      >
        {isRigorous ? (
          <ShieldCheck className="size-4 shrink-0 text-emerald-600 mt-0.5" aria-hidden />
        ) : (
          <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" aria-hidden />
        )}
        <div className="space-y-1 min-w-0 flex-1">
          <p className="font-semibold">
            {isRigorous && "Zero-Trust Verification: Active Cognitive Auditing"}
            {isModerateBias && "Balanced Verification: Verified Primary Pathways"}
            {isHighBias && "Automation Bias Trap: Passive Code Acceptance Detected"}
          </p>
          <p className="text-[11px] leading-relaxed opacity-90">
            {isRigorous &&
              "Candidate rigorously questioned the AI assistant, isolated calculations into pure functions, and scrutinized boundary assumptions."}
            {isModerateBias &&
              "Candidate reviewed generated logic on key turns but occasionally accepted complex outputs without exhaustive boundary checks."}
            {isHighBias &&
              "Candidate accepted multi-line generated files without inspection turns. Per Vasconcelos et al., high-performing engineers treat AI output as unverified drafts."}
          </p>
        </div>
      </div>

      {/* Paper link footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
        <span className="text-muted-foreground">Theory: Cost of Verification Model</span>
        <a
          href="https://cicl.stanford.edu/papers/vasconcelos2023explanations.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <BookOpen className="size-3" />
          <span>Read Stanford/Microsoft Research Paper</span>
          <ExternalLink className="size-2.5 opacity-70" />
        </a>
      </div>
    </div>
  );
}
