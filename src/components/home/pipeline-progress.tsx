import { Check, LoaderCircle } from "lucide-react";
import type { PipelineStep } from "@/lib/pipeline-events";
import { cn } from "@/lib/utils";

export type StepState = "pending" | "active" | "done";

export interface ProgressStep {
  id: PipelineStep;
  label: string;
  hint: string;
  state: StepState;
  detail?: string;
}

export const PIPELINE_STEPS: Omit<ProgressStep, "state" | "detail">[] = [
  { id: "read", label: "Read the posting", hint: "Fetching the page and pulling out the job text" },
  { id: "parse", label: "Understand the role", hint: "Skills and seniority, and requirements that filter people rather than measure ability" },
  { id: "research", label: "Research the company", hint: "Cached web search, falling back to the job description alone" },
  { id: "challenge", label: "Design your project", hint: "2 to 4 hours, rooted in the company's real domain" },
  { id: "rubric", label: "Write the rubric", hint: "Generated with the brief so the two stay consistent" },
  { id: "save", label: "Save", hint: "Ready for you to read before you start" },
];

/** Narrates the pipeline while it runs, as a build log: live generation takes about a minute. */
export function PipelineProgress({ steps }: { steps: ProgressStep[] }) {
  const done = steps.filter((s) => s.state === "done").length;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-title text-base">Building your challenge</p>
        <span className="tabular font-mono text-xs text-muted-foreground">
          {done}/{steps.length}
        </span>
      </div>
      <ol className="space-y-0" aria-live="polite" aria-label="Building your challenge">
        {steps.map((s, i) => (
          <li key={s.id} className="relative flex gap-3.5 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span className="absolute top-7 bottom-1 left-[0.6875rem] w-px bg-border" aria-hidden>
                {s.state === "done" && <span className="grow-y absolute inset-0 bg-ok" />}
              </span>
            )}
            <span className="relative mt-0.5 grid size-[1.375rem] shrink-0 place-items-center">
              {s.state === "done" ? (
                <span className="pop-in grid size-[1.375rem] place-items-center rounded-full bg-ok text-white dark:text-background">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
              ) : s.state === "active" ? (
                <LoaderCircle className="size-[1.375rem] animate-spin text-signal" aria-hidden />
              ) : (
                <span className="size-[1.375rem] rounded-full border-2 border-dashed border-foreground/15" aria-hidden />
              )}
            </span>
            <div className="min-w-0 pt-px">
              <div className={cn("text-sm font-medium transition-colors", s.state === "pending" && "text-muted-foreground")}>
                {s.label}
                {s.detail && <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{s.detail}</span>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full origin-left rounded-full bg-signal transition-transform duration-700 ease-[var(--ease)]"
          style={{ transform: `scaleX(${Math.max(0.04, done / steps.length)})` }}
        />
      </div>
    </div>
  );
}
