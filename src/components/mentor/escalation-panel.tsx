"use client";

import { MessageSquare, TriangleAlert } from "lucide-react";
import { useEvidence } from "@/components/evidence/evidence-context";
import type { EscalationReason } from "@/lib/ai/escalation";
import { ReasonChip } from "./reason-chips";

/**
 * Why this landed in the queue, and where to look. Reasons that point at
 * particular turns link straight to them in the transcript.
 */
export function EscalationPanel({ reasons, contestReason }: { reasons: EscalationReason[]; contestReason: string | null }) {
  const { jump } = useEvidence();
  const all: EscalationReason[] = contestReason ? [{ code: "CONTESTED", message: "The candidate contested this score." }, ...reasons] : reasons;
  if (!all.length) return null;

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950" aria-labelledby="why-flagged">
      <h2 id="why-flagged" className="flex items-center gap-2 text-sm font-semibold">
        <TriangleAlert className="size-4" aria-hidden />
        Why this is in your queue
      </h2>
      <ul className="mt-3 space-y-3">
        {all.map((r, i) => (
          <li key={`${r.code}-${i}`} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
            <ReasonChip reason={r} className="shrink-0 self-start" />
            <div className="min-w-0 space-y-1.5 text-sm">
              <p className="leading-relaxed">{r.message}</p>
              {r.turns && r.turns.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.turns.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => jump("turn", String(t))}
                      className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-sky-200 ring-inset hover:bg-white"
                    >
                      <MessageSquare className="size-3" aria-hidden />
                      Turn {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {contestReason && (
        <blockquote className="mt-4 border-l-2 border-amber-400 pl-3 text-sm text-amber-900 italic">
          Candidate&apos;s note: &ldquo;{contestReason}&rdquo;
        </blockquote>
      )}
    </section>
  );
}
