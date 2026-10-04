"use client";

import { ArrowUp, BookOpenText, ChevronRight, Code2, FileCode, ImageIcon, MessageSquare, RotateCcw, Sparkles, TriangleAlert, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AiMessageMarkdown } from "@/components/common/ai-message-markdown";
import type { TurnView } from "@/lib/data/types";
import { useNowSeconds } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";
import {
  routeMessageTier,
  resolveEffectiveTier,
  countTurnsByTier,
  MAX_ASK_MESSAGES,
  MAX_CODE_MESSAGES,
  type MessageTier,
} from "@/lib/ai/message-router";

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
  streamingMessage?: string | null;
  streamingReasoning?: string | null;
  streamingStatus?: string | null;
  error: ChatError | null;
  onSend: (text: string, mode?: "ASK" | "CODE") => Promise<boolean>;
  onRetry: () => void;
  onDismissError: () => void;
  onOpenFile: (path: string) => void;
  onOpenBrief: () => void;
  className?: string;
  id?: string;
}

function Waiting({ since, status }: { since: number | null; status?: string | null }) {
  const now = useNowSeconds();
  const seconds = since && now > 0 ? Math.max(0, now - Math.floor(since / 1000)) : 0;
  return (
    <div className="slide-in flex items-center gap-3" role="status">
      <AssistantAvatar busy />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md bg-surface-container px-3.5 py-2.5 text-[13px] text-muted-foreground">
          <span className="typing flex items-center gap-1 text-signal" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          {status || "Writing code"}
          <span className="tabular font-mono text-xs">{seconds}s</span>
        </div>
      </div>
    </div>
  );
}

function StreamingAssistantMessage({
  message,
  reasoning,
  status,
  since,
}: {
  message?: string | null;
  reasoning?: string | null;
  status?: string | null;
  since: number | null;
}) {
  const now = useNowSeconds();
  const seconds = since && now > 0 ? Math.max(0, now - Math.floor(since / 1000)) : 0;

  return (
    <div className="slide-in flex gap-3" role="status">
      <AssistantAvatar busy />
      <div className="min-w-0 flex-1 space-y-2.5">
        {reasoning && (
          <div className="rounded-xl border border-border/70 bg-surface-container-low p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1.5">
              <span className="live-dot size-1.5 rounded-full bg-signal" />
              Thinking process
            </div>
            <p className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground/90 max-h-48 overflow-y-auto">
              {reasoning}
              <span className="inline-block w-1.5 h-3 ml-0.5 bg-signal/60 animate-pulse align-middle" />
            </p>
          </div>
        )}

        {message && message.trim().length > 0 ? (
          <div className="rounded-2xl rounded-tl-md bg-surface-container px-3.5 py-2.5 text-[13.5px] leading-relaxed">
            <AiMessageMarkdown content={message} isStreaming />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md bg-surface-container px-3.5 py-2.5 text-[13px] text-muted-foreground">
            <span className="typing flex items-center gap-1 text-signal" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            {reasoning ? "Synthesizing answer..." : "Thinking & planning..."}
            <span className="tabular font-mono text-xs">{seconds}s</span>
          </div>
        )}

        {status && (
          <div className="flex items-center gap-2 text-xs text-signal font-medium">
            <span className="live-dot size-1.5 rounded-full bg-signal" />
            {status}
          </div>
        )}
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
          <AiMessageMarkdown content={turn.content} />
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

export function ChatPanel({
  turns,
  notes,
  pending,
  pendingSince,
  streamingMessage,
  streamingReasoning,
  streamingStatus,
  error,
  onSend,
  onRetry,
  onDismissError,
  onOpenFile,
  onOpenBrief,
  className,
  id,
}: Props) {
  const [draft, setDraft] = useState("");
  const [attachedImage, setAttachedImage] = useState<{ name: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Instant scroll during token streaming
  useEffect(() => {
    if (scroller.current && (streamingMessage || streamingReasoning)) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [streamingMessage, streamingReasoning]);

  // Smooth scroll on turn completions, pending state changes, and errors
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, pending, error]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setAttachedImage({ name: file.name, url: event.target.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const [userMode, setUserMode] = useState<"ASK" | "CODE">("ASK");

  const { askCount, codeCount, isAskCapReached, isCodeCapReached } = useMemo(
    () => countTurnsByTier(turns),
    [turns]
  );

  const { effectiveTier, reason: routingReason, autoDemoted } = useMemo(
    () => resolveEffectiveTier(draft, userMode),
    [draft, userMode]
  );

  const detectedRawTier = useMemo(
    () => (draft.trim() ? routeMessageTier(draft) : "ASK"),
    [draft]
  );

  const isCurrentTierCapReached =
    effectiveTier === "ASK" ? isAskCapReached : isCodeCapReached;

  const blocked = pending || (error?.retryable ?? false) || isCurrentTierCapReached;
  const canSend = !isCurrentTierCapReached && (draft.trim().length > 0 || attachedImage !== null) && draft.length <= MAX_CHARS && !blocked;

  const isSendingRef = useRef(false);

  async function submit() {
    if (!canSend || isSendingRef.current) return;
    isSendingRef.current = true;
    const text = attachedImage
      ? `${draft.trim()}\n\n[Attached Design Reference: ${attachedImage.name}]`
      : draft.trim();
    setDraft("");
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      const accepted = await onSend(text, userMode);
      if (!accepted) setDraft(draft);
    } finally {
      setTimeout(() => {
        isSendingRef.current = false;
      }, 400);
    }
  }

  const showStreamingBubble = pending && (Boolean(streamingMessage && streamingMessage.trim().length > 0) || Boolean(streamingReasoning));

  return (
    <section id={id} className={cn("flex min-h-0 flex-col bg-card", className)} aria-label="Chat with the assistant">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span className={cn("size-1.5 rounded-full", pending ? "live-dot text-signal" : "bg-ok")} aria-hidden />
          AI assistant
        </div>
        <div className="flex items-center gap-2">
          {/* Ask Tier Pill (30 max) */}
          <span
            className={cn(
              "tabular font-mono text-[10.5px] font-medium px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1",
              isAskCapReached
                ? "bg-bad-soft text-bad border-bad/30"
                : askCount >= 25
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  : "bg-muted text-muted-foreground border-border"
            )}
            title="Questions & Conceptual Clarification Quota (concise answers, 30 max)"
          >
            <span>💬 Ask:</span>
            <span className="font-bold">{askCount}</span>/{MAX_ASK_MESSAGES}
          </span>

          {/* Code Tier Pill (20 max) */}
          <span
            className={cn(
              "tabular font-mono text-[10.5px] font-medium px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1",
              isCodeCapReached
                ? "bg-bad-soft text-bad border-bad/30"
                : codeCount >= 15
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  : "bg-muted text-muted-foreground border-border"
            )}
            title="Coding Implementation & File Modification Quota (20 max)"
          >
            <span>⚡ Code:</span>
            <span className="font-bold">{codeCount}</span>/{MAX_CODE_MESSAGES}
          </span>
        </div>
      </div>

      {/* Dual message budget progress bar */}
      <div className="grid grid-cols-2 h-1 w-full bg-muted/80 overflow-hidden shrink-0 gap-px">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            isAskCapReached ? "bg-bad" : askCount >= 25 ? "bg-amber-500" : "bg-sky-500"
          )}
          style={{ width: `${Math.min(100, (askCount / MAX_ASK_MESSAGES) * 100)}%` }}
          title={`Ask budget: ${askCount}/${MAX_ASK_MESSAGES}`}
        />
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            isCodeCapReached ? "bg-bad" : codeCount >= 15 ? "bg-amber-500" : "bg-signal"
          )}
          style={{ width: `${Math.min(100, (codeCount / MAX_CODE_MESSAGES) * 100)}%` }}
          title={`Code budget: ${codeCount}/${MAX_CODE_MESSAGES}`}
        />
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

        {showStreamingBubble ? (
          <StreamingAssistantMessage
            message={streamingMessage}
            reasoning={streamingReasoning}
            status={streamingStatus}
            since={pendingSince}
          />
        ) : (
          pending && <Waiting since={pendingSince} status={streamingStatus} />
        )}

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

      <div className="shrink-0 space-y-2.5 border-t border-border p-3">
        {/* Cap warning banner if quotas reached */}
        {isAskCapReached && isCodeCapReached ? (
          <div className="flex items-center gap-2 rounded-xl border border-bad/30 bg-bad-soft px-3 py-2 text-xs text-bad">
            <TriangleAlert className="size-4 shrink-0" />
            <span>
              <strong>All message quotas reached ({MAX_ASK_MESSAGES} Qs, {MAX_CODE_MESSAGES} Code):</strong> You have used all available assistant messages. Review your codebase in Preview / Files and submit your project when ready.
            </span>
          </div>
        ) : isCurrentTierCapReached ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <TriangleAlert className="size-4 shrink-0" />
            <span>
              <strong>{effectiveTier === "ASK" ? `Questions limit reached (${MAX_ASK_MESSAGES}/${MAX_ASK_MESSAGES})` : `Coding limit reached (${MAX_CODE_MESSAGES}/${MAX_CODE_MESSAGES})`}:</strong> Switch to {effectiveTier === "ASK" ? `coding tasks (${MAX_CODE_MESSAGES - codeCount} left)` : `clarification questions (${MAX_ASK_MESSAGES - askCount} left)`}.
            </span>
          </div>
        ) : null}

        {/* Peak Cool Interactive Mode Toggle: ASK vs BUILD (CODE) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="inline-flex items-center p-0.5 rounded-xl border border-border/80 bg-surface-container-low shadow-xs">
            <button
              type="button"
              onClick={() => setUserMode("ASK")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none cursor-pointer",
                userMode === "ASK"
                  ? "bg-card text-sky-600 dark:text-sky-400 shadow-sm border border-border/70 font-semibold ring-1 ring-sky-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title="Ask Mode: Conceptual inquiries, explanations, clarifications. No file writes (30 max)."
            >
              <MessageSquare className="size-3.5 text-sky-500" />
              <span>Ask Mode</span>
              <span className={cn(
                "tabular font-mono text-[10.5px] px-1.5 py-0.5 rounded-full",
                userMode === "ASK" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold" : "bg-muted text-muted-foreground"
              )}>
                {Math.max(0, MAX_ASK_MESSAGES - askCount)} left
              </span>
            </button>

            <button
              type="button"
              onClick={() => setUserMode("CODE")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none cursor-pointer",
                userMode === "CODE"
                  ? "bg-signal text-white shadow-sm font-semibold ring-1 ring-signal/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title="Build Mode: Directly writes and modifies files in your codebase (20 max)."
            >
              <Code2 className="size-3.5 text-white" />
              <span>Build Mode</span>
              <span className={cn(
                "tabular font-mono text-[10.5px] px-1.5 py-0.5 rounded-full",
                userMode === "CODE" ? "bg-white/20 text-white font-bold" : "bg-muted text-muted-foreground"
              )}>
                {Math.max(0, MAX_CODE_MESSAGES - codeCount)} left
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {userMode === "ASK" ? (
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-500" />
                Safe Q&amp;A · Files protected
              </span>
            ) : (
              <span className="text-[11px] font-mono text-signal hidden sm:flex items-center gap-1.5 font-medium">
                <span className="size-1.5 rounded-full bg-signal animate-pulse" />
                Live Code Writes Active
              </span>
            )}
          </div>
        </div>

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
          className={cn(
            "group/composer rounded-2xl border bg-background transition-[border-color,box-shadow]",
            isCurrentTierCapReached
              ? "border-amber-500/30 bg-muted/30 opacity-80"
              : userMode === "CODE"
                ? "border-signal/30 focus-within:border-signal focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_18%,transparent)]"
                : "border-input focus-within:border-sky-500/60 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,rgb(14_165_233)_18%,transparent)]"
          )}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
            aria-label="Upload design reference image"
            disabled={blocked}
          />

          {attachedImage && (
            <div className="flex items-center gap-2 px-3 pt-2.5">
              <div className="relative flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-1.5 pr-2.5 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachedImage.url}
                  alt="Design reference"
                  className="size-8 rounded-lg object-cover border border-border/70"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-semibold uppercase text-signal">Design Mock</span>
                  <span className="max-w-[12rem] truncate font-medium text-foreground">{attachedImage.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Remove design reference"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          )}

          {draft.trim().length > 0 && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-3.5 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground/80">Mode:</span>
                {userMode === "CODE" && autoDemoted ? (
                  <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-[10.5px]">
                    <Sparkles className="size-3 text-sky-400" />
                    Inquiry detected in Build mode · Auto-routed to <strong>Ask Mode</strong> (preserves your Build quota · {Math.max(0, MAX_ASK_MESSAGES - askCount)} Qs left)
                  </span>
                ) : userMode === "ASK" && detectedRawTier === "CODE" ? (
                  <button
                    type="button"
                    onClick={() => setUserMode("CODE")}
                    className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 text-[10.5px] transition-colors cursor-pointer"
                  >
                    <Zap className="size-3 text-amber-500" />
                    Coding intent detected · In Ask mode files are safe. <strong>Click to switch to ⚡ Build Mode</strong>
                  </button>
                ) : effectiveTier === "ASK" ? (
                  <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 text-[10.5px]">
                    💬 Clarification / Q&amp;A (concise answer · {Math.max(0, MAX_ASK_MESSAGES - askCount)} left)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-signal font-semibold bg-signal-soft px-1.5 py-0.5 rounded border border-signal/20 text-[10.5px]">
                    ⚡ Coding &amp; Implementation (modifies files · {Math.max(0, MAX_CODE_MESSAGES - codeCount)} left)
                  </span>
                )}
              </div>
            </div>
          )}

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
            placeholder={
              isCurrentTierCapReached
                ? `Limit reached for ${effectiveTier === "ASK" ? "questions (30/30)" : "coding (20/20)"} — switch to ${effectiveTier === "ASK" ? "coding tasks" : "questions"} or submit.`
                : userMode === "CODE"
                  ? "Describe what to code, fix, or build (AI will write and modify files)…"
                  : "Ask a question, clarify brief requirements, or explore design trade-offs…"
            }
            aria-label="Message the assistant"
            disabled={blocked}
            rows={2}
            className="block max-h-48 min-h-14 w-full resize-none bg-transparent px-3.5 pt-3 text-[13.5px] leading-relaxed outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={blocked}
                className="inline-flex items-center gap-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Attach design screenshot / UI mockup"
                aria-label="Attach design mockup"
              >
                <ImageIcon className="size-4" />
              </button>
              <span className="hidden items-center gap-1 pl-1 text-[11px] text-muted-foreground sm:inline-flex">
                <kbd className="rounded border border-border px-1 font-mono">↵</kbd> send
                <kbd className="ml-1.5 rounded border border-border px-1 font-mono">⇧↵</kbd> new line
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("tabular font-mono text-[11px]", draft.length > MAX_CHARS ? "text-bad" : "text-muted-foreground", draft.length < MAX_CHARS * 0.8 && "invisible")}>
                {draft.length}/{MAX_CHARS}
              </span>
              <Button
                type="submit"
                variant={effectiveTier === "CODE" ? "signal" : "outline"}
                size="sm"
                disabled={!canSend}
                className={cn(
                  "rounded-lg gap-1.5 text-xs font-semibold px-3 transition-all",
                  effectiveTier === "ASK" && "text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                )}
                aria-label={effectiveTier === "CODE" ? "Build code" : "Send question"}
                title={effectiveTier === "CODE" ? "Execute build (modifies files)" : "Ask question (files safe)"}
              >
                <span>{effectiveTier === "CODE" ? "Build" : "Ask"}</span>
                <ArrowUp className="size-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
