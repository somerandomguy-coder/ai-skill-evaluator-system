"use client";

import { Bot, ChevronRight, FileCode, User } from "lucide-react";
import type { TurnView } from "@/lib/data/types";
import { formatMinutes } from "@/lib/format";
import { highlightSegments } from "@/lib/quote";
import { cn } from "@/lib/utils";
import { useEvidence } from "./evidence-context";

function Marked({ text, quote }: { text: string; quote?: string }) {
  return (
    <>
      {highlightSegments(text, quote).map((s, i) =>
        s.mark ? (
          <mark key={i} className="rounded bg-mark px-0.5 text-foreground">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  );
}

/**
 * The captured conversation, turn by turn. Turns carry anchors (`#turn-N`) and
 * the turn a citation points to is highlighted, with the cited words marked.
 */
export function Transcript({ turns, className }: { turns: TurnView[]; className?: string }) {
  const { target, jump } = useEvidence();
  const start = turns.length ? new Date(turns[0].createdAt).getTime() : 0;
  const activeSeq = target?.type === "turn" ? Number.parseInt(target.ref, 10) : null;

  if (!turns.length) return <p className={cn("p-4 text-sm text-muted-foreground", className)}>No messages were sent in this session.</p>;

  return (
    <ol className={cn("space-y-3", className)}>
      {turns.map((t) => {
        const isUser = t.role === "USER";
        const active = activeSeq === t.seq;
        const offset = Math.max(0, (new Date(t.createdAt).getTime() - start) / 60_000);
        return (
          <li
            key={t.seq}
            id={`turn-${t.seq}`}
            className={cn(
              "scroll-mt-24 rounded-2xl p-3.5 ring-1 transition-shadow",
              isUser ? "bg-card ring-border" : "bg-surface-container-low ring-border",
              active && "ring-2 ring-signal"
            )}
          >
            <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              {isUser ? <User className="size-3.5" aria-hidden /> : <Bot className="size-3.5" aria-hidden />}
              <span className="font-medium text-foreground/80">{isUser ? "Candidate" : "Assistant"}</span>
              <span className="tabular font-mono">#{t.seq}</span>
              <span className="tabular ml-auto font-mono">{offset < 1 ? "start" : `+${formatMinutes(offset)}`}</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              <Marked text={t.content} quote={active ? target?.quote : undefined} />
            </p>
            {t.filesWritten.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">wrote</span>
                {t.filesWritten.map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => jump("file", f.path)}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] ring-1 ring-border transition-colors ring-inset hover:bg-signal-soft"
                  >
                    <FileCode className="size-3" aria-hidden />
                    {f.path}
                  </button>
                ))}
              </div>
            )}
            {t.reasoning && (
              <details className="group mt-2.5">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-3 transition-transform group-open:rotate-90" aria-hidden />
                  Reasoning
                </summary>
                <p className="mt-1.5 rounded-md bg-background/70 p-2.5 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{t.reasoning}</p>
              </details>
            )}
          </li>
        );
      })}
    </ol>
  );
}
