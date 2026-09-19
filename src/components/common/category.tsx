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

export const CATEGORY_STYLE: Record<RequirementCategory, { icon: LucideIcon; chip: string; accent: string }> = {
  PROBLEM_FRAMING: { icon: CircleHelp, chip: "bg-violet-50 text-violet-700 ring-violet-200", accent: "border-violet-300" },
  TECHNICAL_APPROACH: { icon: Blocks, chip: "bg-sky-50 text-sky-700 ring-sky-200", accent: "border-sky-300" },
  AI_DIRECTION: { icon: WandSparkles, chip: "bg-indigo-50 text-indigo-700 ring-indigo-200", accent: "border-indigo-300" },
  CRITICAL_JUDGMENT: { icon: ShieldCheck, chip: "bg-rose-50 text-rose-700 ring-rose-200", accent: "border-rose-300" },
  TRADEOFF_AWARENESS: { icon: Scale, chip: "bg-amber-50 text-amber-700 ring-amber-200", accent: "border-amber-300" },
  DOMAIN_FIT: { icon: Building2, chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", accent: "border-emerald-300" },
  COMMUNICATION: { icon: MessageSquareText, chip: "bg-teal-50 text-teal-700 ring-teal-200", accent: "border-teal-300" },
};

export function CategoryBadge({ category, className }: { category: RequirementCategory; className?: string }) {
  const { icon: Icon, chip } = CATEGORY_STYLE[category];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", chip, className)}>
      <Icon className="size-3" aria-hidden />
      {CATEGORY_META[category].label}
    </span>
  );
}

/** Five pips for a 1-5 weight. */
export function WeightPips({ weight }: { weight: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground" title={`Weight ${weight} of 5`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn("size-1.5 rounded-full", i <= weight ? "bg-foreground/70" : "bg-foreground/15")} />
        ))}
      </span>
      <span className="sr-only">Weight {weight} of 5</span>
      <span aria-hidden>weight {weight}</span>
    </span>
  );
}
