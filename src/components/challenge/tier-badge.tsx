import { Award, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import type { MentorBadge, TierLevel } from "@/lib/types/assessment-v2";
import { cn } from "@/lib/utils";

interface TierBadgeProps {
  tier?: TierLevel | string;
  badge?: MentorBadge;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ChallengeTierBadge({
  tier = "TIER_2_CACHED",
  badge,
  className,
  size = "md",
}: TierBadgeProps) {
  if (tier === "TIER_1_VERIFIED") {
    const mentorName = badge?.mentorName || "Accredited Mentor";
    const auditScore = badge?.auditScore ?? 18;

    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 px-3 py-1 font-sans text-amber-600 dark:border-amber-400/40 dark:from-amber-400/20 dark:via-yellow-400/10 dark:to-transparent dark:text-amber-300 shadow-[0_0_15px_-3px_rgba(245,158,11,0.25)]",
          size === "sm" && "px-2 py-0.5 text-xs",
          size === "lg" && "px-4 py-1.5 text-sm font-semibold",
          className
        )}
      >
        <div className="flex items-center gap-1.5">
          <Award className={cn("size-4 text-amber-500 shrink-0", size === "sm" && "size-3.5")} />
          <span className="font-semibold tracking-tight">MentorME Verified</span>
        </div>
        <span className="hidden sm:inline text-xs text-amber-700/80 dark:text-amber-300/80 border-l border-amber-500/30 pl-2">
          {mentorName} · {auditScore}/20
        </span>
      </div>
    );
  }

  if (tier === "TIER_3_GENERATED") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-transparent px-3 py-1 font-sans text-violet-700 dark:border-violet-400/40 dark:from-violet-400/20 dark:text-violet-300 shadow-[0_0_15px_-3px_rgba(139,92,246,0.2)]",
          size === "sm" && "px-2 py-0.5 text-xs",
          size === "lg" && "px-4 py-1.5 text-sm font-semibold",
          className
        )}
      >
        <Sparkles className={cn("size-4 text-violet-500 shrink-0", size === "sm" && "size-3.5")} />
        <span className="font-semibold tracking-tight">
          Tailored Track <span className="font-normal opacity-90">(AI Synthesized — Queued for Human Audit)</span>
        </span>
      </div>
    );
  }

  // Default: Tier 2 Cached
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-transparent px-3 py-1 font-sans text-blue-700 dark:border-blue-400/40 dark:from-blue-400/20 dark:text-blue-300",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "lg" && "px-4 py-1.5 text-sm font-semibold",
        className
      )}
    >
      <CheckCircle2 className={cn("size-4 text-blue-500 shrink-0", size === "sm" && "size-3.5")} />
      <span className="font-medium tracking-tight">Standard Track (Cached Assessment)</span>
    </div>
  );
}
