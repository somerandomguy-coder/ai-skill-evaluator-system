"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getRuntimeSnapshot, getServerRuntimeSnapshot, subscribeRuntime, type RuntimeSnapshot, type RuntimeStatus } from "@/lib/runtime/webcontainer";
import { useNowSeconds } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";

export const useRuntime = () => useSyncExternalStore(subscribeRuntime, getRuntimeSnapshot, getServerRuntimeSnapshot);

const PILL: Record<RuntimeStatus, { label: string; dot: string }> = {
  idle: { label: "Starting…", dot: "bg-slate-400" },
  booting: { label: "Booting…", dot: "bg-amber-500 animate-pulse" },
  installing: { label: "Installing…", dot: "bg-amber-500 animate-pulse" },
  starting: { label: "Starting…", dot: "bg-amber-500 animate-pulse" },
  ready: { label: "Preview live", dot: "bg-emerald-500" },
  error: { label: "Preview error", dot: "bg-rose-500" },
  unsupported: { label: "No live preview", dot: "bg-slate-400" },
};

export function RuntimePill() {
  const rt = useRuntime();
  const p = PILL[rt.status];
  return (
    <span className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground md:inline-flex" title={rt.detail}>
      <span className={cn("size-2 rounded-full", p.dot)} aria-hidden />
      {p.label}
    </span>
  );
}

const STEPS: { status: RuntimeStatus[]; label: string; hint: string }[] = [
  { status: ["idle", "booting"], label: "Booting the in-browser environment", hint: "A private Node.js sandbox running entirely in your browser tab" },
  { status: ["installing"], label: "Installing dependencies", hint: "The starter ships a lockfile and three packages, so this is quick" },
  { status: ["starting"], label: "Starting the dev server", hint: "Vite compiles your project and serves the preview" },
];

function stepState(rt: RuntimeSnapshot, index: number): "done" | "active" | "pending" {
  const current = STEPS.findIndex((s) => s.status.includes(rt.status));
  if (rt.status === "ready") return "done";
  if (current === -1) return "pending";
  return index < current ? "done" : index === current ? "active" : "pending";
}

/** Shown while the container warms up, so the wait never looks like a freeze. */
export function RuntimeProgress() {
  const rt = useRuntime();
  const now = useNowSeconds();
  const installing = rt.status === "installing" && rt.installStartedAt !== null && now > 0;
  const seconds = installing ? Math.max(0, now - Math.floor(rt.installStartedAt! / 1000)) : 0;
  const lastLog = rt.logs.length ? rt.logs[rt.logs.length - 1] : null;

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h3 className="text-base font-semibold">Getting your workspace ready</h3>
        <p className="mt-1 text-sm text-muted-foreground">You can start writing to the assistant now. The preview appears here as soon as it&apos;s live.</p>
      </div>
      <ol className="space-y-4" aria-live="polite">
        {STEPS.map((s, i) => {
          const state = stepState(rt, i);
          return (
            <li key={s.label} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center">
                {state === "done" ? (
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                ) : state === "active" ? (
                  <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden />
                ) : (
                  <span className="size-5 rounded-full border-2 border-dashed border-foreground/20" aria-hidden />
                )}
              </span>
              <div>
                <div className={cn("text-sm font-medium", state === "pending" && "text-muted-foreground")}>
                  {s.label}
                  {state === "active" && installing && <span className="tabular ml-2 font-normal text-muted-foreground">{seconds}s</span>}
                </div>
                {state === "active" && <p className="text-xs text-muted-foreground">{s.hint}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {lastLog && <p className="truncate rounded-md bg-muted px-2.5 py-1.5 font-mono text-[0.7rem] text-muted-foreground">{lastLog}</p>}
    </div>
  );
}
