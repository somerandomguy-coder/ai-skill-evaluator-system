"use client";

import { BookOpenText, FolderTree, MessageSquare, MonitorPlay, SquareTerminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileBrowser } from "@/components/evidence/file-browser";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, sendChat, submitBuild } from "@/lib/client/api";
import type { TurnView, WorkspaceView } from "@/lib/data/types";
import { applyWrites, toFileList, type FileMap } from "@/lib/files";
import { applyRuntimeWrites, startRuntime, stopRuntime } from "@/lib/runtime/webcontainer";
import { cn } from "@/lib/utils";
import { BriefSheet } from "./brief-sheet";
import { ChatPanel, type ChatError } from "./chat-panel";
import { PreviewPanel } from "./preview-panel";
import { RuntimePill, useRuntime } from "./runtime-status";
import { SubmitDialog } from "./submit-dialog";
import { SessionTimer } from "./timer";

type Tab = "preview" | "files" | "console";

function lastWrites(turns: TurnView[]): ReadonlySet<string> {
  const lastAssistant = [...turns].reverse().find((t) => t.role === "ASSISTANT" && t.filesWritten.length);
  return new Set(lastAssistant?.filesWritten.map((f) => f.path) ?? []);
}

function ConsoleView() {
  const rt = useRuntime();
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [rt.logs.length]);
  return (
    <pre ref={ref} className="h-full overflow-auto bg-code p-4 font-mono text-[12px] leading-relaxed text-code-foreground">
      {rt.logs.length ? rt.logs.join("\n") : <span className="text-code-foreground/50">Install and dev-server output appears here.</span>}
    </pre>
  );
}

export function Workspace({ workspace }: { workspace: WorkspaceView }) {
  const router = useRouter();
  const [turns, setTurns] = useState<TurnView[]>(workspace.turns);
  const [files, setFiles] = useState<FileMap>(workspace.files);
  const [changed, setChanged] = useState<ReadonlySet<string>>(() => lastWrites(workspace.turns));
  const [notes, setNotes] = useState<Record<number, string[]>>({});
  const [pending, setPending] = useState(false);
  const [pendingSince, setPendingSince] = useState<number | null>(null);
  const [error, setError] = useState<ChatError | null>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [file, setFile] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [mobile, setMobile] = useState<"chat" | "work">("chat");
  const turnsRef = useRef(turns);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  // Warm start: boot the environment as soon as the workspace opens, not on the first message.
  useEffect(() => {
    void startRuntime(workspace.files);
  }, [workspace.files]);

  // Guard against accidental browser back navigation (e.g. exiting active workspace to Step 2):
  useEffect(() => {
    window.history.pushState({ inWorkspace: true }, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState({ inWorkspace: true }, "", window.location.href);
      setBriefOpen(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const fileList = useMemo(() => toFileList(files), [files]);

  async function runChat(req: { message: string; retry?: boolean }, optimistic?: TurnView): Promise<boolean> {
    setPending(true);
    setPendingSince(Date.now());
    setError(null);
    try {
      const res = await sendChat(workspace.sessionId, req);
      // The persisted pair replaces the optimistic message.
      setTurns((prev) => [...prev.filter((t) => t.seq !== optimistic?.seq && !res.turns.some((r) => r.seq === t.seq)), ...res.turns]);
      if (res.writes.length) {
        setFiles((prev) => applyWrites(prev, res.writes));
        setChanged(new Set(res.writes.map((w) => w.path)));
        // Decouple runtime write syncing so chat response renders immediately without lag
        void applyRuntimeWrites(res.writes).catch((err) => {
          console.warn("[workspace] Background runtime write sync warning:", err);
        });
      }
      const reply = res.turns.find((t) => t.role === "ASSISTANT");
      if (reply && res.notes.length) setNotes((prev) => ({ ...prev, [reply.seq]: res.notes }));
      return true;
    } catch (e) {
      const api = e instanceof ApiError ? e : null;
      const retryable = api?.retryable ?? false;
      setError({ message: api?.message ?? "Couldn't reach the assistant. Check your connection and try again.", retryable });
      // If the message was never recorded, take it off the screen and give it back to the composer.
      if (!retryable && optimistic) setTurns((prev) => prev.filter((t) => t.seq !== optimistic.seq));
      return retryable;
    } finally {
      setPending(false);
      setPendingSince(null);
    }
  }

  const isSendingRef = useRef(false);
  const isSubmittingBuildRef = useRef(false);

  function send(text: string) {
    if (pending || isSendingRef.current) return Promise.resolve(false);
    isSendingRef.current = true;
    const last = turnsRef.current[turnsRef.current.length - 1];
    const optimistic: TurnView = { seq: (last?.seq ?? 0) + 1, role: "USER", content: text, filesWritten: [], reasoning: null, createdAt: new Date().toISOString() };
    setTurns((prev) => [...prev, optimistic]);
    return runChat({ message: text }, optimistic).finally(() => {
      setTimeout(() => {
        isSendingRef.current = false;
      }, 300);
    });
  }

  async function submit() {
    if (isSubmittingBuildRef.current) return;
    isSubmittingBuildRef.current = true;
    try {
      const { evaluationId } = await submitBuild(workspace.sessionId);
      await stopRuntime();
      router.push(`/report/${evaluationId}`);
    } catch (err) {
      isSubmittingBuildRef.current = false;
      throw err;
    }
  }

  const openFile = (path: string) => {
    setFile(path);
    setTab("files");
    setMobile("work");
  };

  const userTurns = turns.filter((t) => t.role === "USER").length;

  const visibleFiles = fileList.filter((f) => f.path !== "package-lock.json").length;
  const tabClass = "h-10 flex-none gap-1.5 rounded-none px-3 text-[13px] after:bg-signal data-active:text-foreground";

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4">
        <h1 className="min-w-0 flex-1 truncate text-[13px] font-semibold" title={workspace.challenge.title}>
          {workspace.challenge.title}
        </h1>
        <Button variant="ghost" size="sm" className="gap-1.5 text-[13px]" onClick={() => setBriefOpen(true)}>
          <BookOpenText className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Brief & rubric</span>
        </Button>
        <SessionTimer startedAt={workspace.startedAt} timeboxMinutes={workspace.challenge.timeboxMinutes} />
        <RuntimePill />
        <SubmitDialog turnCount={userTurns} fileCount={visibleFiles} disabled={userTurns === 0 || pending} onSubmit={submit} />
      </div>

      {/* Below lg the two panes become a segmented switch. */}
      <div className="border-b border-border bg-card p-1.5 lg:hidden">
        <div className="relative grid grid-cols-2 rounded-lg bg-muted p-0.5" role="tablist" aria-label="Workspace view">
          <span
            className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-card shadow-sm transition-transform duration-300 ease-[var(--ease)]"
            style={{ transform: mobile === "work" ? "translateX(100%)" : "none" }}
            aria-hidden
          />
          {(["chat", "work"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={mobile === v}
              onClick={() => setMobile(v)}
              className={cn("relative flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-medium transition-colors", mobile === v ? "text-foreground" : "text-muted-foreground")}
            >
              {v === "chat" ? <MessageSquare className="size-3.5" aria-hidden /> : <MonitorPlay className="size-3.5" aria-hidden />}
              {v === "chat" ? "Chat" : "Preview & files"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
        <ChatPanel
          className={cn("border-r border-border", mobile !== "chat" && "hidden lg:flex")}
          turns={turns}
          notes={notes}
          pending={pending}
          pendingSince={pendingSince}
          error={error}
          onSend={send}
          onRetry={() => void runChat({ message: "", retry: true })}
          onDismissError={() => setError(null)}
          onOpenFile={openFile}
          onOpenBrief={() => setBriefOpen(true)}
        />

        <div className={cn("flex min-h-0 min-w-0 flex-col bg-background", mobile !== "work" && "hidden lg:flex")}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="min-h-0 flex-1 gap-0">
            <div className="border-b border-border bg-card px-2">
              <TabsList variant="line" className="h-10 gap-0 p-0">
                <TabsTrigger value="preview" className={tabClass}>
                  <MonitorPlay aria-hidden /> Preview
                </TabsTrigger>
                <TabsTrigger value="files" className={tabClass}>
                  <FolderTree aria-hidden /> Files
                  <span className="tabular rounded bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">{visibleFiles}</span>
                  {changed.size > 0 && <span className="pop-in size-1.5 rounded-full bg-signal" aria-label="updated" />}
                </TabsTrigger>
                <TabsTrigger value="console" className={tabClass}>
                  <SquareTerminal aria-hidden /> Console
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="preview" className="fade-in min-h-0 overflow-hidden">
              <PreviewPanel initialFiles={workspace.files} />
            </TabsContent>
            <TabsContent value="files" className="fade-in flex min-h-0 overflow-hidden bg-card">
              <FileBrowser files={fileList} changed={changed} selected={file} onSelect={setFile} className="h-full w-full" />
            </TabsContent>
            <TabsContent value="console" className="fade-in min-h-0 overflow-hidden">
              <ConsoleView />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BriefSheet challenge={workspace.challenge} open={briefOpen} onOpenChange={setBriefOpen} />
    </div>
  );
}
