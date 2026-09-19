import { Check, ChevronRight, X } from "lucide-react";
import { CategoryBadge, CATEGORY_STYLE, WeightPips } from "@/components/common/category";
import { CATEGORY_META, REQUIREMENT_CATEGORIES } from "@/lib/ai/schemas";
import type { RequirementView } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/** The two lists an evaluator matches against: what would show it was met, and what would show it was not. */
export function SignalLists({ requirement, className }: { requirement: Pick<RequirementView, "successSignals" | "failureModes">; className?: string }) {
  return (
    <div className={cn("grid gap-4 text-sm sm:grid-cols-2", className)}>
      <div>
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-emerald-700">What we look for</div>
        <ul className="space-y-1.5">
          {requirement.successSignals.map((s) => (
            <li key={s} className="flex gap-2 text-foreground/80">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-rose-700">What would count against</div>
        <ul className="space-y-1.5">
          {requirement.failureModes.map((s) => (
            <li key={s} className="flex gap-2 text-foreground/80">
              <X className="mt-0.5 size-3.5 shrink-0 text-rose-600" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Native <details>: no client JavaScript needed to expand a rubric item. */
export function RubricDetails({ requirement, label = "See what we look for", className }: { requirement: RequirementView; label?: string; className?: string }) {
  return (
    <details className={cn("group", className)}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
        {label}
      </summary>
      <SignalLists requirement={requirement} className="mt-3 rounded-lg bg-muted/50 p-3" />
    </details>
  );
}

export function RubricItem({ requirement }: { requirement: RequirementView }) {
  return (
    <div className={cn("rounded-xl border border-l-4 bg-card p-4", CATEGORY_STYLE[requirement.category].accent)}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-[0.95rem] leading-relaxed font-medium">{requirement.statement}</p>
        <WeightPips weight={requirement.weight} />
      </div>
      <RubricDetails requirement={requirement} className="mt-3" />
    </div>
  );
}

/** The full requirement bank, grouped by category in the canonical order. */
export function Rubric({ requirements }: { requirements: RequirementView[] }) {
  const groups = REQUIREMENT_CATEGORIES.map((category) => ({
    category,
    items: requirements.filter((r) => r.category === category),
  })).filter((g) => g.items.length);

  return (
    <div className="space-y-8">
      {groups.map(({ category, items }) => (
        <section key={category} aria-labelledby={`cat-${category}`}>
          <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 id={`cat-${category}`}>
              <CategoryBadge category={category} className="text-sm" />
            </h3>
            <span className="text-sm text-muted-foreground">{CATEGORY_META[category].question}</span>
          </header>
          <div className="space-y-3">
            {items.map((r) => (
              <RubricItem key={r.id} requirement={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
