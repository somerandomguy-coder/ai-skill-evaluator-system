"use client";

import { ArrowUp, Bot, ChevronRight, FileCode, LoaderCircle, RotateCcw, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TurnView } from "@/lib/data/types";
import { useNowSeconds } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";

const MAX_CHARS = 8000;

export interface ChatError {
  message: string;
  /** True when the message was recorded and only the assistant's reply failed, so retrying is safe. */
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
    <div className="flex items-center gap-2.5 text-sm text-muted-foreground" role="status">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      Writing code
      <span className="tabular text-xs">{seconds}s</span>
    </div>
  );
}

function AssistantMessage({ turn, notes, onOpenFile }: { turn: TurnView; notes?: string[]; onOpenFile: (path: string) => void }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden>
        <Bot className="size-4" />
      </span>
      <div className="min-w-0 max-w-[94%] space-y-2">
        <div className="rounded-2xl rounded-tl-md bg-muted px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">{turn.content}</div>
        {turn.filesWritten.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pl-1">
            <span className="text-xs text-muted-foreground">wrote</span>
            {turn.filesWritten.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => onOpenFile(f.path)}
                className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[0.7rem] text-violet-800 ring-1 ring-violet-200 ring-inset hover:bg-violet-100"
              >
                <FileCode className="size-3" aria-hidden />
                {f.path}
              </button>
            ))}
          </div>
        )}
        {notes && notes.length > 0 && (
          <ul className="space-y-0.5 pl-1 text-xs text-amber-700">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        {turn.reasoning && (
          <details className="group pl-1">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-3 transition-transform group-open:rotate-90" aria-hidden />
              Assistant&apos;s reasoning
            </summary>
            <p className="mt-1.5 rounded-md border bg-background p-2.5 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{turn.reasoning}</p>
          </details>
        )}
      </div>
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

  async function submit() {
    if (!canSend) return;
    const text = draft;
    setDraft("");
    const accepted = await onSend(text);
    if (!accepted) setDraft(text); // nothing was recorded: give the message back
  }

  return (
    <section className={cn("flex min-h-0 flex-col bg-background", className)} aria-label="Chat with the assistant">
      <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {turns.length === 0 && !pending ? (
          <div className="mx-auto flex h-full max-w-sm flex-col justify-center gap-3 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="size-5" aria-hidden />
            </span>
            <h2 className="text-base font-semibold">Tell the assistant what to build</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              It writes the code and the preview updates as files change. Everything you type here is recorded, and your reasoning is what gets scored.
            </p>
            <button type="button" onClick={onOpenBrief} className="mx-auto text-sm font-medium text-primary underline underline-offset-2">
              Open the brief and rubric
            </button>
          </div>
        ) : (
          turns.map((t) =>
            t.role === "USER" ? (
              <div key={t.seq} className="flex justify-end">
                <div className="max-w-[92%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground">{t.content}</div>
              </div>
            ) : (
              <AssistantMessage key={t.seq} turn={t} notes={notes[t.seq]} onOpenFile={onOpenFile} />
            )
          )
        )}
        {pending && (
          <div className="flex gap-2.5">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden>
              <Bot className="size-4" />
            </span>
            <div className="rounded-2xl rounded-tl-md bg-muted px-3.5 py-2.5">
              <Waiting since={pendingSince} />
            </div>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertDescription className="space-y-2">
              <p>{error.message}</p>
              <div className="flex items-center gap-2">
                {error.retryable && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry}>
                    <RotateCcw className="size-3.5" aria-hidden />
                    Retry
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="gap-1" onClick={onDismissError}>
                  <X className="size-3.5" aria-hidden />
                  Dismiss
                </Button>
              </div>
              {error.retryable && <p className="text-xs">Your message was saved. Retrying does not send it twice.</p>}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <form
        className="border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="relative">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Message the assistant…"
            aria-label="Message the assistant"
            disabled={blocked}
            className="max-h-56 min-h-20 resize-none pr-12 text-sm leading-relaxed"
          />
          <Button type="submit" size="icon" className="absolute right-2 bottom-2 rounded-full" disabled={!canSend} aria-label="Send">
            <ArrowUp aria-hidden />
          </Button>
        </div>
        <div className="mt-1.5 flex justify-between text-[0.7rem] text-muted-foreground">
          <span>
            <kbd className="rounded border bg-muted px-1 font-sans">⌘</kbd>/<kbd className="rounded border bg-muted px-1 font-sans">Ctrl</kbd> + <kbd className="rounded border bg-muted px-1 font-sans">Enter</kbd> to send
          </span>
          {draft.length > MAX_CHARS * 0.8 && <span className={cn("tabular", draft.length > MAX_CHARS && "text-destructive")}>{draft.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>}
        </div>
      </form>
    </section>
  );
}
