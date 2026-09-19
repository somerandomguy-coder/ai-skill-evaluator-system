"use client";

import { ArrowUp, BookOpenText, ChevronRight, FileCode, RotateCcw, Sparkles, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { TurnView } from "@/lib/data/types";
import { useNowSeconds } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";

const MAX_CHARS = 8000;

const PROMPT_SUGGESTIONS = [
  "Check edge case: respondents without comment text",
  "Separate pure gate logic from React presentation",
  "Enforce strict 64MB memory ceiling before eviction",
];

export interface ChatError {
  message: string;
  retryable: boolean;
}

interface Props {
  turns: TurnView[];
  notes: Record<number, string[]>;
  pending: boolean;
  pendingSince: number | null;
  error: ChatError | null;
  onSend: (text: string) => Promise<boolean>;
  onRetry: () => void;
  onDismissError: () => void;
  onOpenFile: (path: string) => void;
  onOpenBrief: () => void;
  className?: string;
}

function Waiting({ since }: { since: number | null }) {
  const now = useNowSeconds();
  const seconds = since && now > 0 ? Math.max(0, now - Math.floor(since / 1000)) : 0;
  return (
    <div className="slide-in flex items-center gap-3" role="status">
      <AssistantAvatar busy />
      <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md bg-surface-container px-3.5 py-2.5 text-[13px] text-muted-foreground">
        <span className="typing flex items-center gap-1 text-signal" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        Writing code
        <span className="tabular font-mono text-xs">{seconds}s</span>
      </div>
    </div>
  );
}

function AssistantAvatar({ busy = false }: { busy?: boolean }) {
  return (
    <span className="relative grid size-7 shrink-0 place-items-center rounded-lg bg-signal-soft text-signal-ink" aria-hidden>
      <Sparkles className="size-3.5" />
      {busy && <span className="live-dot absolute -top-0.5 -right-0.5 size-2 text-signal ring-2 ring-card" />}
    </span>
  );
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function AssistantMessage({ turn, notes, onOpenFile }: { turn: TurnView; notes?: string[]; onOpenFile: (path: string) => void }) {
  return (
    <div className="slide-in flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="rounded-2xl rounded-tl-md bg-surface-container px-3.5 py-2.5 text-[13.5px] leading-relaxed">
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{turn.content}</p>
        </div>

        {turn.filesWritten.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Wrote</span>
            {turn.filesWritten.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => onOpenFile(f.path)}
                className="lift inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] hover:border-signal/50"
              >
                <FileCode className="size-3 shrink-0 text-signal" aria-hidden />
                <span className="truncate">{f.path}</span>
              </button>
            ))}
          </div>
        )}

        {notes && notes.length > 0 && (
          <ul className="space-y-0.5 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="tabular font-mono" suppressHydrationWarning>
            {clock(turn.createdAt)}
          </span>
          {turn.reasoning && (
            <details className="group/reason min-w-0 flex-1">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-3 transition-transform duration-200 group-open/reason:rotate-90" aria-hidden />
                Reasoning
              </summary>
              <p className="slide-in mt-1.5 rounded-lg border border-border bg-surface-container-low p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                {turn.reasoning}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ turn }: { turn: TurnView }) {
  return (
    <div className="slide-in flex flex-col items-end gap-1 pl-10">
      <div className="max-w-full rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-primary-foreground [overflow-wrap:anywhere]">
        {turn.content}
      </div>
      <span className="tabular pr-1 font-mono text-[11px] text-muted-foreground" suppressHydrationWarning>
        {clock(turn.createdAt)}
      </span>
    </div>
  );
}

export function ChatPanel({ turns, notes, pending, pendingSince, error, onSend, onRetry, onDismissError, onOpenFile, onOpenBrief, className }: Props) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, pending, error]);

  const blocked = pending || (error?.retryable ?? false);
  const canSend = draft.trim().length > 0 && draft.length <= MAX_CHARS && !blocked;

  const isSendingRef = useRef(false);

  async function submit() {
    if (!canSend || isSendingRef.current) return;
    isSendingRef.current = true;
    const text = draft;
    setDraft("");
    try {
      const accepted = await onSend(text);
      if (!accepted) setDraft(text);
    } finally {
      setTimeout(() => {
        isSendingRef.current = false;
      }, 400);
    }
  }

  const sent = turns.filter((t) => t.role === "USER").length;

  return (
    <section className={cn("flex min-h-0 flex-col bg-card", className)} aria-label="Chat with the assistant">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span className={cn("size-1.5 rounded-full", pending ? "live-dot text-signal" : "bg-ok")} aria-hidden />
          AI assistant
        </div>
        <span className="tabular font-mono text-[11px] text-muted-foreground">
          {sent} {sent === 1 ? "message" : "messages"}
        </span>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5" aria-live="polite">
        {turns.length === 0 && !pending ? (
          <div className="mx-auto flex h-full max-w-xs flex-col items-center justify-center gap-4 text-center">
            <span className="pop-in grid size-12 place-items-center rounded-2xl bg-signal-soft text-signal-ink">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <h2 className="font-title text-base">Direct the build</h2>
            <button
              type="button"
              onClick={onOpenBrief}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-muted"
            >
              <BookOpenText className="size-3.5" aria-hidden />
              Brief & rubric
            </button>
          </div>
        ) : (
          turns.map((t) => (t.role === "USER" ? <UserMessage key={t.seq} turn={t} /> : <AssistantMessage key={t.seq} turn={t} notes={notes[t.seq]} onOpenFile={onOpenFile} />))
        )}

        {pending && <Waiting since={pendingSince} />}

        {error && (
          <Alert variant="destructive" className="slide-in rounded-xl border-bad/30 bg-bad-soft text-[13px]">
            <TriangleAlert aria-hidden className="size-4" />
            <AlertDescription className="space-y-2.5 text-bad">
              <p>{error.message}</p>
              <div className="flex items-center gap-2">
                {error.retryable && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry}>
                    <RotateCcw className="size-3" aria-hidden /> Retry
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="gap-1" onClick={onDismissError}>
                  <X className="size-3" aria-hidden /> Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border p-3">
        <div className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3" role="group" aria-label="Prompt ideas">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setDraft(suggestion)}
              disabled={blocked}
              className="max-w-[16rem] shrink-0 truncate rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-signal/50 hover:text-foreground disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          className="group/composer rounded-2xl border border-input bg-background transition-[border-color,box-shadow] focus-within:border-signal focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_18%,transparent)]"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) {
                  void submit();
                }
              }
            }}
            placeholder="Ask for a plan, a check, an edge case…"
            aria-label="Message the assistant"
            disabled={blocked}
            rows={2}
            className="block max-h-48 min-h-14 w-full resize-none bg-transparent px-3.5 pt-3 text-[13.5px] leading-relaxed outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
            <span className="hidden items-center gap-1 pl-1 text-[11px] text-muted-foreground sm:inline-flex">
              <kbd className="rounded border border-border px-1 font-mono">↵</kbd> send
              <kbd className="ml-1.5 rounded border border-border px-1 font-mono">⇧↵</kbd> new line
            </span>
            <span className={cn("tabular ml-auto font-mono text-[11px]", draft.length > MAX_CHARS ? "text-bad" : "text-muted-foreground", draft.length < MAX_CHARS * 0.8 && "invisible")}>
              {draft.length}/{MAX_CHARS}
            </span>
            <Button type="submit" variant="signal" size="icon-sm" disabled={!canSend} className="rounded-lg" aria-label="Send message">
              <ArrowUp className="size-4" aria-hidden />
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
