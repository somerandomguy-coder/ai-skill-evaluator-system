"use client";

import { Clock } from "lucide-react";
import { useNowSeconds } from "@/lib/hooks/use-now";
import { formatTimebox } from "@/lib/format";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/** Elapsed session time against the brief's timebox — a guide, not a hard stop. */
export function SessionTimer({ startedAt, timeboxMinutes }: { startedAt: string; timeboxMinutes: number }) {
  const now = useNowSeconds();
  const elapsed = now === 0 ? 0 : Math.max(0, now - Math.floor(new Date(startedAt).getTime() / 1000));
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const over = elapsed > timeboxMinutes * 60;
  const pct = Math.min(100, (elapsed / (timeboxMinutes * 60)) * 100);

  return (
    <div
      className={cn("hidden items-center gap-2 rounded-lg border px-2.5 py-1 text-xs sm:flex", over ? "border-amber-300 bg-amber-50 text-amber-800" : "bg-muted/40 text-muted-foreground")}
      title={over ? "Past the guide time. You can keep going; the timebox is a guide, not a hard stop." : "Time so far, against the guide time for this brief"}
    >
      <Clock className="size-3.5" aria-hidden />
      <span className="tabular font-medium text-foreground">
        {h}:{pad(m)}:{pad(s)}
      </span>
      <span className="text-muted-foreground">of ~{formatTimebox(timeboxMinutes)}</span>
      <span className="h-1 w-14 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
        <span className={cn("block h-full rounded-full", over ? "bg-amber-500" : "bg-primary/70")} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
