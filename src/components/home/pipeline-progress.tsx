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

/** Narrates the pipeline while it runs: live generation takes about a minute. */
export function PipelineProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol className="space-y-0" aria-live="polite" aria-label="Building your challenge">
      {steps.map((s, i) => (
        <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && (
            <span className={cn("absolute top-6 left-[0.6875rem] h-[calc(100%-1.25rem)] w-px", s.state === "done" ? "bg-emerald-300" : "bg-border")} aria-hidden />
          )}
          <span className="relative mt-0.5 grid size-[1.375rem] shrink-0 place-items-center">
            {s.state === "done" ? (
              <span className="grid size-[1.375rem] place-items-center rounded-full bg-emerald-500 text-white">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
            ) : s.state === "active" ? (
              <LoaderCircle className="size-[1.375rem] animate-spin text-primary" aria-hidden />
            ) : (
              <span className="size-[1.375rem] rounded-full border-2 border-dashed border-foreground/20" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <div className={cn("text-sm font-medium", s.state === "pending" && "text-muted-foreground")}>
              {s.label}
              {s.detail && <span className="ml-2 font-normal text-muted-foreground">{s.detail}</span>}
            </div>
            {s.state === "active" && <p className="text-xs text-muted-foreground">{s.hint}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
