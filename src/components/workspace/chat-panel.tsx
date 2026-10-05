"use client";

import { ArrowUp, BookOpenText, ChevronRight, Code2, FileCode, ImageIcon, MessageSquare, RotateCcw, Sparkles, Terminal, TriangleAlert, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AiMessageMarkdown } from "@/components/common/ai-message-markdown";
import type { TurnView } from "@/lib/data/types";
import { useNowSeconds } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";
import { useSkills } from "@/hooks/use-skills";
import { SkillRegisterModal } from "./skill-register-modal";
import {
  parseSkillCommands,
  getSlashAutocompleteQuery,
  formatPromptWithSkills,
} from "@/lib/skills/slash-parser";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Skill Register & Slash Command state
  const { skills, addSkill, removeSkill, resetToPresets } = useSkills();
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState<number | null>(null);

  // Parse draft for slash commands
  const { recognized: recognizedSkills, unrecognized: unrecognizedSkills } = useMemo(
    () => parseSkillCommands(draft, skills),
    [draft, skills]
  );

  // Autocomplete matching when user is typing /
  const autocomplete = useMemo(() => {
    if (cursorPos === null) return { isQuerying: false, suggestions: [], startIndex: -1 };
    const textBefore = draft.slice(0, cursorPos);
    const queryInfo = getSlashAutocompleteQuery(textBefore);
    if (!queryInfo.isQuerying) return { isQuerying: false, suggestions: [], startIndex: -1 };

    const q = queryInfo.query;
    const matches = skills.filter(
      (s) => s.id.startsWith(q) || s.name.toLowerCase().includes(q)
    );
    return {
      isQuerying: true,
      suggestions: matches,
      startIndex: queryInfo.startIndex,
    };
  }, [draft, cursorPos, skills]);

  const removeSkillFromDraft = (skillId: string) => {
    const regex = new RegExp(`(?:^|\\s)\\/${skillId}(?=\\s|$)`, "gi");
    setDraft((prev) => prev.replace(regex, " ").replace(/\s{2,}/g, " ").trim());
  };

  const insertSkillIntoDraft = (skillId: string) => {
    setDraft((prev) => {
      const clean = prev.trim();
      if (!clean) return `/${skillId} `;
      if (clean.includes(`/${skillId}`)) return clean;
      return `/${skillId} ${clean}`;
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const applyAutocomplete = (skillId: string) => {
    if (autocomplete.startIndex === -1) return;
    const before = draft.slice(0, autocomplete.startIndex);
    const after = draft.slice(cursorPos ?? draft.length);
    const updated = `${before}/${skillId} ${after}`;
    setDraft(updated);
    setCursorPos(before.length + skillId.length + 2);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

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
    const baseText = attachedImage
      ? `${draft.trim()}\n\n[Attached Design Reference: ${attachedImage.name}]`
      : draft.trim();

    // Format message with active skill steering instructions if invoked
    const text = formatPromptWithSkills(baseText, recognizedSkills);

    setDraft("");
    setAttachedImage(null);
    setCursorPos(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      const accepted = await onSend(text, effectiveTier);
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
              : "border-border/80 focus-within:border-foreground/30 focus-within:shadow-xs"
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

          {/* Active Skills Notification Banner */}
          {recognizedSkills.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-signal/10 border-b border-signal/20 text-xs text-signal animate-in fade-in">
              <Sparkles className="size-3.5 shrink-0" />
              <span className="font-semibold text-signal-ink">Active Skill:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {recognizedSkills.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 font-mono text-[11px] bg-background/90 px-2 py-0.5 rounded-md border border-signal/30 text-foreground shadow-2xs"
                  >
                    /{s.id}
                    <button
                      type="button"
                      onClick={() => removeSkillFromDraft(s.id)}
                      className="text-muted-foreground hover:text-bad ml-0.5 text-xs font-bold leading-none cursor-pointer"
                      title={`Remove /${s.id}`}
                      aria-label={`Remove /${s.id}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline truncate max-w-[200px]">
                {recognizedSkills[0]?.description}
              </span>
            </div>
          )}

          {/* Unrecognized Skills Notification Banner */}
          {unrecognizedSkills.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-500 animate-in fade-in">
              <TriangleAlert className="size-3.5 shrink-0" />
              <span>Unknown skill {unrecognizedSkills.join(", ")} (not registered).</span>
              <button
                type="button"
                onClick={() => setIsSkillsModalOpen(true)}
                className="underline hover:text-foreground font-semibold ml-1 cursor-pointer"
              >
                Click Skills to register it
              </button>
            </div>
          )}

          {/* Autocomplete Popup */}
          {autocomplete.isQuerying && autocomplete.suggestions.length > 0 && (
            <div className="absolute bottom-full mb-1 left-2 right-2 z-30 max-h-56 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-md p-1 shadow-xl animate-in fade-in slide-in-from-bottom-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between border-b border-border/50">
                <span>Slash Commands ({autocomplete.suggestions.length})</span>
                <span className="font-mono text-[9px] lowercase">tab or click to select</span>
              </div>
              <div className="py-1 space-y-0.5">
                {autocomplete.suggestions.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => applyAutocomplete(skill.id)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-signal px-1.5 py-0.5 rounded bg-signal-soft border border-signal/20 text-[11px]">
                        /{skill.id}
                      </span>
                      <span className="font-medium text-foreground truncate">{skill.name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[180px] hidden sm:inline">
                      {skill.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}
            onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart)}
            onClick={(e) => setCursorPos(e.currentTarget.selectionStart)}
            onKeyDown={(e) => {
              if (autocomplete.isQuerying && autocomplete.suggestions.length > 0) {
                if (e.key === "Tab") {
                  e.preventDefault();
                  applyAutocomplete(autocomplete.suggestions[0].id);
                  return;
                }
                if (e.key === "Escape") {
                  setCursorPos(null);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) {
                  void submit();
                }
              }
            }}
            placeholder={
              isCurrentTierCapReached
                ? `Limit reached for ${userMode === "ASK" ? "questions (30/30)" : "coding (20/20)"} — switch modes or submit.`
                : userMode === "CODE"
                  ? "Describe what to code, fix, or build (type / for skills like /grill-me, /prototype)…"
                  : "Ask a question, clarify brief requirements (type / for skills like /grill-me)…"
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
              {/* Skills Register Button */}
              <button
                type="button"
                onClick={() => setIsSkillsModalOpen(true)}
                disabled={blocked}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 text-[11.5px] font-medium transition-all select-none cursor-pointer"
                title="Skill Register: Browse or add slash command skills (/grill-me, /prototype, etc.)"
                aria-label="Open Skill Register"
              >
                <Sparkles className="size-3 text-signal" />
                <span className="hidden sm:inline">Skills</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-signal/15 text-signal font-semibold">
                  {skills.length}
                </span>
              </button>

              {/* Base44-style compact Plan/Build segmented pill toggle */}
              <div
                className="inline-flex items-center p-0.5 rounded-lg bg-muted/70 border border-border/50 text-[11.5px]"
                role="tablist"
                aria-label="Mode selector"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={userMode === "ASK"}
                  onClick={() => setUserMode("ASK")}
                  disabled={blocked}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all select-none cursor-pointer",
                    userMode === "ASK"
                      ? "bg-background text-foreground shadow-xs font-semibold border border-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                  title={`Ask Mode: Conceptual inquiries, explanations, clarifications. No file writes (${Math.max(0, MAX_ASK_MESSAGES - askCount)} left).`}
                >
                  <MessageSquare className="size-3 text-sky-500" />
                  <span>Ask</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={userMode === "CODE"}
                  onClick={() => setUserMode("CODE")}
                  disabled={blocked}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all select-none cursor-pointer",
                    userMode === "CODE"
                      ? "bg-background text-foreground shadow-xs font-semibold border border-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                  title={`Build Mode: Directly writes, updates, and implements code files in your workspace (${Math.max(0, MAX_CODE_MESSAGES - codeCount)} left).`}
                >
                  <Zap className={cn("size-3", userMode === "CODE" ? "text-amber-500 fill-amber-500/20" : "text-muted-foreground")} />
                  <span>Build</span>
                </button>
              </div>

              <span className={cn("tabular font-mono text-[11px]", draft.length > MAX_CHARS ? "text-bad" : "text-muted-foreground", draft.length < MAX_CHARS * 0.8 && "invisible")}>
                {draft.length}/{MAX_CHARS}
              </span>

              <Button
                type="submit"
                variant={userMode === "CODE" ? "signal" : "outline"}
                size="sm"
                disabled={!canSend}
                className={cn(
                  "rounded-lg gap-1.5 text-xs font-semibold px-3 h-8 shadow-xs transition-all",
                  userMode === "ASK" && "text-muted-foreground hover:text-foreground border-border hover:bg-muted/60"
                )}
                aria-label={userMode === "CODE" ? "Build code" : "Ask question"}
                title={userMode === "CODE" ? "Build mode: Writes and modifies files" : "Ask mode: Conceptual Q&A, files are safe"}
              >
                <span>{userMode === "CODE" ? "Build" : "Ask"}</span>
                <ArrowUp className="size-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Skill Register Dialog */}
      <SkillRegisterModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        skills={skills}
        onAddSkill={addSkill}
        onRemoveSkill={removeSkill}
        onResetPresets={resetToPresets}
        onSelectSkillToInsert={(id) => insertSkillIntoDraft(id)}
      />
    </section>
  );
}
