"use client";

import { BookOpen, FolderTree, MessageSquare, MonitorPlay, Terminal } from "lucide-react";
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
    <pre ref={ref} className="h-full overflow-auto bg-neutral-950 p-3 font-mono text-[0.72rem] leading-relaxed text-neutral-300">
      {rt.logs.length ? rt.logs.join("\n") : "Install and dev-server output appears here."}
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
        await applyRuntimeWrites(res.writes);
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

  function send(text: string) {
    const last = turnsRef.current[turnsRef.current.length - 1];
    const optimistic: TurnView = { seq: (last?.seq ?? 0) + 1, role: "USER", content: text, filesWritten: [], reasoning: null, createdAt: new Date().toISOString() };
    setTurns((prev) => [...prev, optimistic]);
    return runChat({ message: text }, optimistic);
  }

  async function submit() {
    const { evaluationId } = await submitBuild(workspace.sessionId);
    await stopRuntime();
    router.push(`/report/${evaluationId}`);
  }

  const openFile = (path: string) => {
    setFile(path);
    setTab("files");
    setMobile("work");
  };

  const userTurns = turns.filter((t) => t.role === "USER").length;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-container-low px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary text-white font-semibold uppercase shrink-0">
            Step 3 · Workspace
          </span>
          <div className="truncate text-xs font-bold text-primary">{workspace.challenge.title}</div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>AUTOSAVED {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} UTC</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 font-mono text-xs rounded border-border hover:bg-surface-container"
            onClick={() => setBriefOpen(true)}
          >
            <BookOpen className="size-3.5" aria-hidden />
            <span>Rubric Checklist</span>
          </Button>
          <SessionTimer startedAt={workspace.startedAt} timeboxMinutes={workspace.challenge.timeboxMinutes} />
          <RuntimePill />
          <SubmitDialog turnCount={userTurns} fileCount={fileList.filter((f) => f.path !== "package-lock.json").length} disabled={userTurns === 0 || pending} onSubmit={submit} />
        </div>
      </div>

      {/* Below lg the two panes become a switch */}
      <div className="grid grid-cols-2 gap-1 border-b bg-muted/40 p-1 lg:hidden" role="tablist" aria-label="Workspace view">
        {(["chat", "work"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={mobile === v}
            onClick={() => setMobile(v)}
            className={cn("flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium", mobile === v ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            {v === "chat" ? <MessageSquare className="size-4" aria-hidden /> : <MonitorPlay className="size-4" aria-hidden />}
            {v === "chat" ? "Chat" : "Preview & files"}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
        <ChatPanel
          className={cn("border-r", mobile !== "chat" && "hidden lg:flex")}
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

        <div className={cn("flex min-h-0 min-w-0 flex-col", mobile !== "work" && "hidden lg:flex")}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="min-h-0 flex-1 gap-0">
            <div className="border-b bg-muted/30 px-3 py-2">
              <TabsList>
                <TabsTrigger value="preview" className="gap-1.5">
                  <MonitorPlay aria-hidden /> Preview
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-1.5">
                  <FolderTree aria-hidden /> Files
                  <span className="tabular text-xs text-muted-foreground">{fileList.filter((f) => f.path !== "package-lock.json").length}</span>
                  {changed.size > 0 && <span className="size-1.5 rounded-full bg-emerald-500" aria-label="updated" />}
                </TabsTrigger>
                <TabsTrigger value="console" className="gap-1.5">
                  <Terminal aria-hidden /> Console
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="preview" className="min-h-0 overflow-hidden">
              <PreviewPanel initialFiles={workspace.files} />
            </TabsContent>
            <TabsContent value="files" className="flex min-h-0 overflow-hidden">
              <FileBrowser files={fileList} changed={changed} selected={file} onSelect={setFile} className="h-full w-full" />
            </TabsContent>
            <TabsContent value="console" className="min-h-0 overflow-hidden">
              <ConsoleView />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BriefSheet challenge={workspace.challenge} open={briefOpen} onOpenChange={setBriefOpen} />
    </div>
  );
}
