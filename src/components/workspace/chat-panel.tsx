"use client";

import { ArrowUp, Bot, CheckCircle, ChevronRight, FileCode, LoaderCircle, RotateCcw, Sparkles, Terminal, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="flex items-center gap-2.5 text-xs font-mono text-muted-foreground" role="status">
      <LoaderCircle className="size-3.5 animate-spin text-primary" aria-hidden />
      <span>Assistant synthesizing code...</span>
      <span className="tabular font-semibold text-primary">{seconds}s</span>
    </div>
  );
}

function AssistantMessage({ turn, notes, onOpenFile }: { turn: TurnView; notes?: string[]; onOpenFile: (path: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground px-1">
        <span className="font-semibold text-secondary flex items-center gap-1">
          <Terminal className="size-3" /> CO-PILOT
        </span>
        <span>{new Date(turn.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      </div>
      <div className="bg-surface-container p-3 rounded border border-border text-foreground text-xs leading-relaxed space-y-2.5">
        <p className="whitespace-pre-wrap">{turn.content}</p>
        
        {turn.filesWritten.length > 0 && (
          <div className="p-2.5 bg-surface-container-lowest rounded border border-border flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-primary uppercase">
              <CheckCircle className="size-3 text-emerald-600" />
              <span>Files Committed to Workspace</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {turn.filesWritten.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => onOpenFile(f.path)}
                  className="font-mono text-[11px] bg-surface-container-high hover:bg-primary-container hover:text-white text-primary px-2 py-0.5 rounded border border-border transition-colors flex items-center gap-1"
                >
                  <FileCode className="size-3 text-secondary" />
                  <span>{f.path}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {notes && notes.length > 0 && (
          <ul className="space-y-0.5 font-mono text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
            {notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        )}

        {turn.reasoning && (
          <details className="group pt-1 border-t border-border/60">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-3 transition-transform group-open:rotate-90" aria-hidden />
              <span>Audit Reasoning Log</span>
            </summary>
            <p className="mt-1.5 rounded bg-surface-container-low p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground border border-border">
              {turn.reasoning}
            </p>
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
    if (!accepted) setDraft(text);
  }

  return (
    <section className={cn("flex min-h-0 flex-col bg-surface border-r border-border", className)} aria-label="Chat with the assistant">
      {/* Top Co-pilot Header */}
      <div className="px-3.5 py-2.5 bg-surface-container-low border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center font-mono text-xs">
            <Terminal className="size-3.5" />
          </div>
          <div>
            <p className="font-semibold text-xs text-primary leading-tight">Assessment Co-pilot</p>
            <p className="font-mono text-[10px] text-muted-foreground">Zero-Trust Steer • Read/Write Sandbox</p>
          </div>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-highest text-foreground border border-border font-semibold">
          TURN {turns.length} OF 20
        </span>
      </div>

      {/* Dialogue Stream */}
      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 bg-surface-container-lowest">
        {turns.length === 0 && !pending ? (
          <div className="mx-auto flex h-full max-w-sm flex-col justify-center gap-3 text-center py-8">
            <span className="mx-auto grid size-10 place-items-center rounded bg-surface-container border border-border text-primary">
              <Bot className="size-5" aria-hidden />
            </span>
            <h2 className="text-sm font-bold text-primary">Direct the AI assistant to build your project</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Interrogate the brief, establish scope boundaries, question assumptions, and check generated code in the live preview.
            </p>
            <button type="button" onClick={onOpenBrief} className="mx-auto font-mono text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80">
              [Inspect 2-Tier Rubric & Brief]
            </button>
          </div>
        ) : (
          turns.map((t) =>
            t.role === "USER" ? (
              <div key={t.seq} className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground px-1">
                  <span className="font-semibold text-primary">CANDIDATE</span>
                  <span>{new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded border border-border text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                  {t.content}
                </div>
              </div>
            ) : (
              <AssistantMessage key={t.seq} turn={t} notes={notes[t.seq]} onOpenFile={onOpenFile} />
            )
          )
        )}

        {pending && (
          <div className="bg-surface-container p-3 rounded border border-border">
            <Waiting since={pendingSince} />
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="rounded text-xs">
            <TriangleAlert aria-hidden className="size-4" />
            <AlertDescription className="space-y-2">
              <p>{error.message}</p>
              <div className="flex items-center gap-2">
                {error.retryable && (
                  <Button size="sm" variant="outline" className="gap-1.5 rounded text-xs" onClick={onRetry}>
                    <RotateCcw className="size-3" aria-hidden /> Retry
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="gap-1 rounded text-xs" onClick={onDismissError}>
                  <X className="size-3" aria-hidden /> Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Suggested Prompts & Token Budget Footnote */}
      <div className="px-3 py-1.5 bg-surface-container-low border-t border-border flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>CO-PILOT REASONING: LOGGED & WATERMARKED</span>
        <span className="text-primary font-semibold">TOKEN BUDGET: 78%</span>
      </div>

      {/* Input Form */}
      <div className="p-3 bg-surface-container-low border-t border-border space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
          <span className="text-muted-foreground shrink-0">Prompts:</span>
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setDraft(suggestion)}
              className="bg-surface-container-lowest hover:bg-surface-container border border-border px-2 py-0.5 rounded text-muted-foreground hover:text-primary transition-colors shrink-0 truncate max-w-[240px]"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          className="flex flex-col gap-2"
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
              placeholder="Message AI assistant... (e.g. Ask for boundary conditions, edge cases, or test suite)"
              aria-label="Message the assistant"
              disabled={blocked}
              className="w-full font-sans text-xs bg-surface-container-lowest text-foreground p-3 rounded resize-none border border-border focus-visible:ring-1 focus-visible:ring-primary min-h-20"
              rows={3}
            />
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">⌘ + Enter</span>
              <Button
                type="submit"
                size="sm"
                disabled={!canSend}
                className="w-7 h-7 p-0 rounded bg-primary text-white hover:bg-primary/90 cursor-pointer"
              >
                <ArrowUp className="size-3.5" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
