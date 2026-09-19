import {
  Blocks,
  Building2,
  CircleHelp,
  MessageSquareText,
  Scale,
  ShieldCheck,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { CATEGORY_META, type RequirementCategory } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

/**
 * Categories are told apart by icon and a single tinted glyph, never by
 * full-colour chips: colour on this platform is reserved for status.
 */
export const CATEGORY_STYLE: Record<RequirementCategory, { icon: LucideIcon; tint: string; accent: string }> = {
  PROBLEM_FRAMING: { icon: CircleHelp, tint: "text-violet-600", accent: "before:bg-violet-500" },
  TECHNICAL_APPROACH: { icon: Blocks, tint: "text-sky-600", accent: "before:bg-sky-500" },
  AI_DIRECTION: { icon: WandSparkles, tint: "text-indigo-600", accent: "before:bg-indigo-500" },
  CRITICAL_JUDGMENT: { icon: ShieldCheck, tint: "text-rose-600", accent: "before:bg-rose-500" },
  TRADEOFF_AWARENESS: { icon: Scale, tint: "text-amber-600", accent: "before:bg-amber-500" },
  DOMAIN_FIT: { icon: Building2, tint: "text-emerald-600", accent: "before:bg-emerald-500" },
  COMMUNICATION: { icon: MessageSquareText, tint: "text-teal-600", accent: "before:bg-teal-500" },
};

export function CategoryBadge({ category, className }: { category: RequirementCategory; className?: string }) {
  const { icon: Icon, tint } = CATEGORY_STYLE[category];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground", className)}>
      <Icon className={cn("size-3.5", tint)} aria-hidden />
      {CATEGORY_META[category].label}
    </span>
  );
}

/** Five pips for a 1-5 weight. */
export function WeightPips({ weight }: { weight: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground" title={`Weight ${weight} of 5`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn("h-2.5 w-1 rounded-full", i <= weight ? "bg-foreground/75" : "bg-foreground/12")} />
        ))}
      </span>
      <span className="sr-only">Weight {weight} of 5</span>
      <span className="tabular font-mono" aria-hidden>
        ×{weight}
      </span>
    </span>
  );
}
