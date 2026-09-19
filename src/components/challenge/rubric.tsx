import { Check, ChevronRight, FlaskConical, Hammer, Shapes, Target, X } from "lucide-react";
import { CategoryBadge, CATEGORY_STYLE, WeightPips } from "@/components/common/category";
import { REQUIREMENT_CATEGORIES } from "@/lib/ai/schemas";
import type { RequirementView } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function SignalLists({ requirement, className }: { requirement: Pick<RequirementView, "successSignals" | "failureModes">; className?: string }) {
  return (
    <div className={cn("grid gap-4 text-[13px] sm:grid-cols-2", className)}>
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ok">
          <span className="grid size-4 place-items-center rounded-full bg-ok-soft">
            <Check className="size-2.5" strokeWidth={3} aria-hidden />
          </span>
          Counts for you
        </div>
        <ul className="space-y-1.5">
          {requirement.successSignals.map((s, idx) => (
            <li key={`${s}-${idx}`} className="flex gap-2 text-foreground/85">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ok" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-bad">
          <span className="grid size-4 place-items-center rounded-full bg-bad-soft">
            <X className="size-2.5" strokeWidth={3} aria-hidden />
          </span>
          Counts against
        </div>
        <ul className="space-y-1.5">
          {requirement.failureModes.map((s, idx) => (
            <li key={`${s}-${idx}`} className="flex gap-2 text-foreground/85">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-bad" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function RubricDetails({ requirement, label = "What counts", className }: { requirement: RequirementView; label?: string; className?: string }) {
  return (
    <details className={cn("group/details", className)}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 transition-transform duration-200 group-open/details:rotate-90" aria-hidden />
        {label}
      </summary>
      <SignalLists requirement={requirement} className="slide-in mt-3 rounded-lg bg-surface-container-low p-3.5 ring-1 ring-border" />
    </details>
  );
}

export function RubricItem({ requirement }: { requirement: RequirementView }) {
  return (
    <div
      className={cn(
        "relative py-4 pr-4 pl-5 before:absolute before:top-4 before:bottom-4 before:left-0 before:w-0.5 before:rounded-full",
        CATEGORY_STYLE[requirement.category].accent
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm leading-relaxed font-medium text-pretty">{requirement.statement}</p>
        <WeightPips weight={requirement.weight} />
      </div>
      <RubricDetails requirement={requirement} className="mt-2" />
    </div>
  );
}

/** The four phases every build is read through. A true sequence, so it is numbered. */
const FOUR_D = [
  { phase: "Define", icon: Target, hint: "Scope and non-goals before code" },
  { phase: "Design", icon: Shapes, hint: "Data shapes and contracts first" },
  { phase: "Develop", icon: Hammer, hint: "A clean build that catches the AI's planted bug" },
  { phase: "Demonstrate", icon: FlaskConical, hint: "Proof it works: tests and trade-offs" },
];

export function Rubric({ requirements, compact = false }: { requirements: RequirementView[]; compact?: boolean }) {
  const groups = REQUIREMENT_CATEGORIES.map((category) => ({
    category,
    items: requirements.filter((r) => r.category === category),
  })).filter((g) => g.items.length);

  return (
    <div className="min-w-0 space-y-8">
      {/* How the build is read: four phases on one track. */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="font-title text-base">Four phases</h3>
        <ol className={cn("grid gap-px overflow-hidden rounded-xl bg-border", compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4")}>
          {FOUR_D.map((f, i) => (
            <li key={f.phase} title={f.hint} className="flex items-center gap-2.5 bg-surface-container-low p-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-signal-soft text-signal-ink">
                <f.icon className="size-4" aria-hidden />
              </span>
              <span className="text-sm font-semibold">
                <span className="tabular mr-1.5 font-mono text-xs font-normal text-muted-foreground">{i + 1}</span>
                {f.phase}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Every requirement, grouped by what it measures. */}
      <div className="space-y-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-title text-base">Requirements</h3>
          <span className="tabular font-mono text-xs text-muted-foreground">{requirements.length} scored</span>
        </div>
        {groups.map(({ category, items }) => (
          <section key={category} aria-labelledby={`cat-${category}`} className="space-y-2">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h4 id={`cat-${category}`}>
                <CategoryBadge category={category} />
              </h4>
            </header>
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {items.map((r) => (
                <RubricItem key={r.id} requirement={r} />
              ))}
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}
