"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Job", match: (p: string) => p === "/" },
  { label: "Challenge", match: (p: string) => p.startsWith("/challenge") },
  { label: "Build", match: (p: string) => p.startsWith("/build") },
  { label: "Report", match: (p: string) => p.startsWith("/report") },
] as const;

function Node({ state, n }: { state: "done" | "current" | "todo"; n: number }) {
  if (state === "done") {
    return (
      <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-signal text-signal-foreground">
        <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="glow-ring grid size-[18px] shrink-0 place-items-center rounded-full bg-signal font-mono text-[10px] font-semibold text-signal-foreground">
        {n}
      </span>
    );
  }
  return (
    <span className="grid size-[18px] shrink-0 place-items-center rounded-full border border-input font-mono text-[10px] text-muted-foreground">
      {n}
    </span>
  );
}

/**
 * The four-step flow drawn as a single trace.
 * Step progress is strictly linear — candidates must complete the flow sequentially
 * without artificial demo shortcuts to seed states.
 */
export function StepperNav() {
  const pathname = usePathname();
  const current = STEPS.findIndex((s) => s.match(pathname));
  if (current === -1) return null;

  return (
    <>
      <nav aria-label="Assessment steps" className="hidden md:block">
        <ol className="flex items-center">
          {STEPS.map((s, i) => {
            const state = i < current ? "done" : i === current ? "current" : "todo";
            const isClickableHome = i === 0 && state === "done";

            return (
              <li key={s.label} className="flex items-center">
                {i > 0 && (
                  <span className="relative mx-1.5 h-px w-6 overflow-hidden bg-border lg:w-10" aria-hidden>
                    {i <= current && (
                      <span className="grow-x absolute inset-0 bg-signal" style={{ "--i": 1 } as CSSProperties} />
                    )}
                  </span>
                )}
                {isClickableHome ? (
                  <Link
                    href="/"
                    title="Return to Job Intake"
                    className="flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Node state={state} n={i + 1} />
                    {s.label}
                  </Link>
                ) : (
                  <span
                    aria-current={state === "current" ? "step" : undefined}
                    className={cn(
                      "flex cursor-default items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-[13px] select-none transition-colors",
                      state === "current" && "bg-signal-soft font-semibold text-signal-ink",
                      state === "done" && "font-medium text-foreground",
                      state === "todo" && "text-muted-foreground opacity-60"
                    )}
                  >
                    <Node state={state} n={i + 1} />
                    {s.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Phones: a compact label plus a hairline progress bar along the header's bottom edge. */}
      <span className="flex items-center gap-1.5 text-[13px] md:hidden">
        <span className="font-semibold">{STEPS[current].label}</span>
        <span className="tabular font-mono text-xs text-muted-foreground">
          {current + 1}/{STEPS.length}
        </span>
      </span>
      <span className="absolute inset-x-0 -bottom-px h-0.5 md:hidden" aria-hidden>
        <span
          className="block h-full origin-left bg-signal transition-transform duration-500 ease-[var(--ease)]"
          style={{ transform: `scaleX(${(current + 1) / STEPS.length})` }}
        />
      </span>
    </>
  );
}
