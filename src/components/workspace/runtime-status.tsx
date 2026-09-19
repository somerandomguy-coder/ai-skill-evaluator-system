"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getRuntimeSnapshot, getServerRuntimeSnapshot, subscribeRuntime, type RuntimeSnapshot, type RuntimeStatus } from "@/lib/runtime/webcontainer";
import { useNowSeconds } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";

export const useRuntime = () => useSyncExternalStore(subscribeRuntime, getRuntimeSnapshot, getServerRuntimeSnapshot);

const PILL: Record<RuntimeStatus, { label: string; dot: string; live?: boolean }> = {
  idle: { label: "Starting", dot: "text-muted-foreground" },
  booting: { label: "Booting", dot: "text-warn", live: true },
  installing: { label: "Installing", dot: "text-warn", live: true },
  starting: { label: "Starting", dot: "text-warn", live: true },
  ready: { label: "Live", dot: "text-ok", live: true },
  error: { label: "Preview error", dot: "text-bad" },
  unsupported: { label: "No preview", dot: "text-muted-foreground" },
};

export function RuntimePill() {
  const rt = useRuntime();
  const p = PILL[rt.status];
  return (
    <span className="hidden items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium md:inline-flex" title={rt.detail} aria-live="polite">
      <span className={cn("size-1.5 rounded-full", p.dot, p.live ? "live-dot" : "bg-current")} aria-hidden />
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
    <div className="mx-auto flex h-full max-w-sm flex-col justify-center gap-6 p-6">
      <h3 className="font-title text-base">Preparing preview</h3>
      <ol className="space-y-4" aria-live="polite">
        {STEPS.map((s, i) => {
          const state = stepState(rt, i);
          return (
            <li key={s.label} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center">
                {state === "done" ? (
                  <span className="pop-in grid size-5 place-items-center rounded-full bg-ok text-white dark:text-background">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                ) : state === "active" ? (
                  <LoaderCircle className="size-5 animate-spin text-signal" aria-hidden />
                ) : (
                  <span className="size-5 rounded-full border-2 border-dashed border-foreground/15" aria-hidden />
                )}
              </span>
              <div>
                <div className={cn("text-sm font-medium", state === "pending" && "text-muted-foreground")}>
                  {s.label}
                  {state === "active" && installing && <span className="tabular ml-2 font-mono text-xs font-normal text-muted-foreground">{seconds}s</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {lastLog && <p className="truncate rounded-lg bg-code px-3 py-2 font-mono text-[11px] text-code-foreground/80">{lastLog}</p>}
    </div>
  );
}
