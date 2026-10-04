"use client";

import { ArrowRight, CircleAlert, ClipboardPaste, FileText, LoaderCircle, ShieldAlert, ShieldCheck, TriangleAlert, Upload, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { runPipeline, inspectJobAd, type JdInspectionClientResult } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { PipelineEvent } from "@/lib/pipeline-events";
import { PIPELINE_STEPS, PipelineProgress, type ProgressStep } from "./pipeline-progress";

const MIN_CHARS = 80;
const MAX_CHARS = 25_000;

type Run = { status: "idle" } | { status: "running" | "error"; steps: ProgressStep[]; message?: string };

function initialSteps(): ProgressStep[] {
  return PIPELINE_STEPS.filter((s) => s.id !== "read").map((s) => ({ ...s, state: "pending" as const }));
}

function applyEvent(steps: ProgressStep[], e: Extract<PipelineEvent, { type: "step" }>): ProgressStep[] {
  return steps.map((s) => (s.id === e.step ? { ...s, state: e.status === "start" ? "active" : "done", detail: e.detail ?? s.detail } : s));
}

export function JdIntake({ signedIn, isCandidate }: { signedIn: boolean; isCandidate: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [run, setRun] = useState<Run>({ status: "idle" });
  const [fastMode, setFastMode] = useState(false);
  const [inspection, setInspection] = useState<JdInspectionClientResult | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const steps = useRef<ProgressStep[]>([]);

  const isBlockedBySecurity = inspection?.cheatingAttempt === "yes" || inspection?.type === "not a job ad";
  const valid = text.trim().length >= MIN_CHARS && text.length <= MAX_CHARS && !isBlockedBySecurity;
  const busy = run.status === "running";

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < 25) {
      setInspection(null);
      setInspecting(false);
      return;
    }

    setInspecting(true);
    const timer = setTimeout(async () => {
      try {
        const res = await inspectJobAd(trimmed);
        setInspection(res);
      } catch (err) {
        console.warn("Failed to inspect job ad:", err);
      } finally {
        setInspecting(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [text]);

  function handleClear() {
    setText("");
    setInspection(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const isSubmittingRef = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current || busy) return;
    if (!signedIn) return router.push("/login?next=/");
    if (!valid || !isCandidate) return;

    isSubmittingRef.current = true;
    steps.current = initialSteps();
    setRun({ status: "running", steps: steps.current });
    let done: Extract<PipelineEvent, { type: "done" }> | null = null;
    try {
      await runPipeline({ rawJd: text, fast: fastMode }, (ev) => {
        if (ev.type === "step") {
          steps.current = applyEvent(steps.current, ev);
          setRun({ status: "running", steps: steps.current });
        } else if (ev.type === "done") {
          done = ev;
        } else {
          throw new Error(ev.message);
        }
      });
      const target = done as Extract<PipelineEvent, { type: "done" }> | null;
      if (!target) throw new Error("The challenge builder finished without a result. Please try again.");
      router.push(`/challenge/${target.challengeId}${target.notice ? "?from=demo-fallback" : ""}`);
    } catch (err) {
      isSubmittingRef.current = false;
      setRun({ status: "error", steps: steps.current, message: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    }
  }

  const count = text.trim().length;
  const needed = Math.max(0, MIN_CHARS - count);

  return (
    <div className="w-full space-y-3">
      <input ref={fileInputRef} type="file" accept=".txt,.md,.text" onChange={handleFileUpload} className="hidden" />

      {/* Editor container with clean header and blank textarea */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-lift)] dark:shadow-[0_24px_60px_-30px_rgb(255_107_0/0.35)]">
        <div className="flex items-center justify-between border-b border-border bg-surface-container-low px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="size-4 text-signal" aria-hidden />
            <span className="text-[13px] font-semibold text-foreground">Job Description</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">— Copy & paste any real tech role</span>
          </div>
          <div className="flex items-center gap-2">
            {text.length > 0 && !busy && (
              <button
                type="button"
                onClick={handleClear}
                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Clear the job description"
                title="Clear text"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
            >
              <Upload className="size-3.5" aria-hidden />
              <span>Upload file</span>
            </button>
          </div>
        </div>

        {run.status === "running" || run.status === "error" ? (
          <div className="min-h-[19rem] space-y-5 p-5 sm:p-6">
            <PipelineProgress steps={run.steps} />
            {run.status === "error" && (
              <div className="slide-in space-y-3">
                <Alert variant="destructive" className="border-bad/30 bg-bad-soft">
                  <CircleAlert aria-hidden />
                  <AlertTitle>Couldn&apos;t build the challenge</AlertTitle>
                  <AlertDescription>{run.message}</AlertDescription>
                </Alert>
                <Button variant="outline" onClick={() => setRun({ status: "idle" })}>
                  Edit job description
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="jd" className="sr-only">
              Job description
            </label>
            <textarea
              id="jd"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Paste any real Job Description here (from LinkedIn, Seek, Indeed, or careers pages)...

Tips:
• Include the role title, technology stack, and what the team builds.
• Minimum 80 characters.
• We extract required SFIA 9 skills, calibrate difficulty, and build your custom 3-hour evaluation challenge.`}
              spellCheck={false}
              className="block min-h-60 w-full resize-y sm:min-h-[19rem] bg-transparent px-5 py-4 font-mono text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/70 sm:px-6"
            />

            {/* AI Security & Quality Inspection Readout */}
            {(inspecting || inspection) && (
              <div
                data-testid="jd-inspection-readout"
                className={cn(
                  "border-t px-5 py-3 transition-all text-xs font-mono select-text",
                  inspection?.cheatingAttempt === "yes"
                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                    : inspection?.type === "not a job ad"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : inspection?.type === "too vague"
                    ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {inspecting ? (
                      <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
                    ) : inspection?.cheatingAttempt === "yes" ? (
                      <ShieldAlert className="size-4 text-red-500" />
                    ) : inspection?.type === "good job ad" ? (
                      <ShieldCheck className="size-4 text-emerald-400" />
                    ) : (
                      <TriangleAlert className="size-4 text-amber-400" />
                    )}

                    <span className="font-semibold uppercase tracking-wider text-[11px]">
                      {inspecting
                        ? "Auditing JD Quality & Security..."
                        : inspection?.cheatingAttempt === "yes"
                        ? "Security Alert · Prompt Injection / Cheating Detected"
                        : inspection?.type === "good job ad"
                        ? "Verified Job Description"
                        : inspection?.type === "too vague"
                        ? "Quality Notice · Too Vague"
                        : "Invalid Submission · Not A Job Ad"}
                    </span>
                  </div>

                  {inspection && !inspecting && (
                    <div
                      data-testid="jd-inspection-fixed-format"
                      className="rounded bg-background/70 px-2 py-0.5 text-[11px] font-mono text-muted-foreground border border-border/50"
                      title="Fixed format inspection result"
                    >
                      {inspection.formatted}
                    </div>
                  )}
                </div>

                {inspection && !inspecting && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-[11px]">
                    <div className="rounded bg-background/50 border border-border/40 p-2">
                      <span className="block text-muted-foreground text-[10px] uppercase font-sans">type</span>
                      <span className="font-semibold text-foreground">{inspection.type}</span>
                    </div>
                    <div className="rounded bg-background/50 border border-border/40 p-2">
                      <span className="block text-muted-foreground text-[10px] uppercase font-sans">how sure</span>
                      <span className="font-semibold text-foreground">{inspection.howSure}</span>
                    </div>
                    <div className="rounded bg-background/50 border border-border/40 p-2">
                      <span className="block text-muted-foreground text-[10px] uppercase font-sans">cheating attempt</span>
                      <span className={cn("font-semibold", inspection.cheatingAttempt === "yes" ? "text-red-400 font-bold" : "text-emerald-400")}>
                        {inspection.cheatingAttempt}
                      </span>
                    </div>
                    <div className="rounded bg-background/50 border border-border/40 p-2 col-span-2 sm:col-span-1">
                      <span className="block text-muted-foreground text-[10px] uppercase font-sans">reason</span>
                      <span className="truncate block text-foreground" title={inspection.reason}>
                        {inspection.reason}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border bg-surface-container-low px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:pl-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5" aria-live="polite">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isBlockedBySecurity
                        ? "bg-bad"
                        : valid
                        ? "bg-ok"
                        : text.length === 0
                        ? "bg-muted-foreground/40"
                        : "bg-warn"
                    )}
                    aria-hidden
                  />
                  {isBlockedBySecurity
                    ? inspection?.cheatingAttempt === "yes"
                      ? "Prompt injection detected — submission blocked"
                      : "Please provide a valid tech job description"
                    : valid
                    ? "Ready to generate"
                    : text.length === 0
                    ? "Paste a job description to get started"
                    : needed > 0
                    ? `${needed} more characters (min ${MIN_CHARS})`
                    : "Too long"}
                </span>
                <span className="tabular font-mono">
                  {text.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
                </span>
                <label className="inline-flex cursor-pointer items-center gap-2 select-none">
                  <input type="checkbox" role="switch" checked={fastMode} onChange={(e) => setFastMode(e.target.checked)} className="peer sr-only" />
                  <span
                    className="relative h-4 w-7 rounded-full bg-foreground/15 transition-colors peer-checked:bg-signal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring after:absolute after:top-0.5 after:left-0.5 after:size-3 after:rounded-full after:bg-card after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-3"
                    aria-hidden
                  />
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Zap className="size-3" aria-hidden />
                    Fast simulation
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                variant={isBlockedBySecurity ? "destructive" : "signal"}
                size="xl"
                className="w-full sm:w-auto"
                disabled={busy || !valid || (signedIn && !isCandidate)}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="animate-spin" aria-hidden />
                    Generating…
                  </>
                ) : isBlockedBySecurity ? (
                  <>
                    <ShieldAlert className="size-4" aria-hidden />
                    {inspection?.cheatingAttempt === "yes" ? "Security Blocked" : "Invalid Job Ad"}
                  </>
                ) : (
                  <>
                    {signedIn ? "Generate challenge" : "Sign in to generate"}
                    <ArrowRight className="transition-transform duration-200 group-hover/button:translate-x-0.5" aria-hidden />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
