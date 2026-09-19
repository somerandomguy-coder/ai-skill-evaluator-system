"use client";

import { ArrowRight, CircleAlert, FileText, LoaderCircle, Upload, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { runPipeline } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { PipelineEvent } from "@/lib/pipeline-events";
import { PIPELINE_STEPS, PipelineProgress, type ProgressStep } from "./pipeline-progress";

const MIN_CHARS = 80;
const MAX_CHARS = 25_000;

const PRESETS = [
  {
    id: "resume-screener",
    name: "AI Resume Screener",
    role: "Full-Stack Engineer — AI Resume Screener",
    company: "TalentAI",
    text: `Role: Full-Stack Engineer — AI Resume Screener
Company: TalentAI (Sydney / Remote)
Team: Fair Hiring & Applicant Review Systems

What you will build:
- Build a simple, clean review dashboard to screen job candidate resumes with an AI helper.
- Check AI claims against real resume text to catch fake skills and AI hallucinations.
- Filter candidates by required skills (e.g. Python, React) and minimum passing match score.
- Let human recruiters easily approve or reject applicants with clear reasons and evidence.
- Ensure fairness: ignore biased details like school prestige, age, or candidate location.`,
  },
  {
    id: "task-tracker",
    name: "Team Task Tracker",
    role: "Frontend Engineer — Student & Team Task Tracker",
    company: "Atlassian",
    text: `Role: Frontend Engineer — Student & Team Task Tracker
Company: Atlassian (Sydney / Remote)
Team: Collaboration & Project Management

What you will build:
- Build an interactive project board to track tasks, homework, and bug tickets.
- Support simple task states: To Do, In Progress, and Completed.
- Add quick search, category filters, and priority tags so students can organize work easily.
- Catch AI bugs and ensure task updates save properly without losing data.`,
  },
  {
    id: "card-creator",
    name: "Portfolio Card Creator",
    role: "Web Developer — Simple Portfolio Card Creator",
    company: "Canva",
    text: `Role: Web Developer — Simple Portfolio Card Creator
Company: Canva (Surry Hills / Remote)
Team: Creative Tools & Student Templates

What you will build:
- Build a drag-and-drop card preview tool for students to showcase projects.
- Let users customize colors, edit titles, and preview their cards in real time.
- Validate inputs so cards look great and display cleanly on mobile and desktop.
- Add a one-click button to export or share the completed card.`,
  },
];

type Run = { status: "idle" } | { status: "running" | "error"; steps: ProgressStep[]; message?: string };

function initialSteps(): ProgressStep[] {
  return PIPELINE_STEPS.filter((s) => s.id !== "read").map((s) => ({ ...s, state: "pending" as const }));
}

function applyEvent(steps: ProgressStep[], e: Extract<PipelineEvent, { type: "step" }>): ProgressStep[] {
  return steps.map((s) => (s.id === e.step ? { ...s, state: e.status === "start" ? "active" : "done", detail: e.detail ?? s.detail } : s));
}

export function JdIntake({ signedIn, isCandidate }: { signedIn: boolean; isCandidate: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(PRESETS[0].text);
  const [activePreset, setActivePreset] = useState<string | null>("resume-screener");
  const [run, setRun] = useState<Run>({ status: "idle" });
  const [fastMode, setFastMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const steps = useRef<ProgressStep[]>([]);

  const valid = text.trim().length >= MIN_CHARS && text.length <= MAX_CHARS;
  const busy = run.status === "running";

  function handlePreset(p: typeof PRESETS[number]) {
    setActivePreset(p.id);
    setText(p.text);
  }

  function handleClear() {
    setActivePreset(null);
    setText("");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setText(content);
        setActivePreset(null);
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

      {/* An editor frame: presets are open files, the status bar carries state and the one action. */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-lift)] dark:shadow-[0_24px_60px_-30px_rgb(255_107_0/0.35)]">
        <div className="flex items-center gap-1 border-b border-border bg-surface-container-low pr-2">
          <div className="scrollbar-none flex min-w-0 flex-1 overflow-x-auto" role="group" aria-label="Sample job descriptions">
            {PRESETS.map((p) => {
              const active = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  disabled={busy}
                  onClick={() => handlePreset(p)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2 border-r border-border px-3.5 py-2.5 text-[13px] transition-colors disabled:opacity-60",
                    active ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {active && <span className="slide-in absolute inset-x-0 top-0 h-0.5 bg-signal" aria-hidden />}
                  <FileText className={cn("size-3.5", active ? "text-signal" : "text-muted-foreground")} aria-hidden />
                  {p.name}
                </button>
              );
            })}
          </div>
          {text.length > 0 && !busy && (
            <button
              type="button"
              onClick={handleClear}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear the job description"
              title="Clear"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            <Upload className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Upload</span>
          </button>
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
              onChange={(e) => {
                setText(e.target.value);
                setActivePreset(null);
              }}
              placeholder="Paste a job description: the role, the stack, what the team builds."
              spellCheck={false}
              className="block min-h-60 w-full resize-y sm:min-h-[19rem] bg-transparent px-5 py-4 font-mono text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground sm:px-6"
            />

            <div className="flex flex-col gap-3 border-t border-border bg-surface-container-low px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:pl-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5" aria-live="polite">
                  <span className={cn("size-1.5 rounded-full", valid ? "bg-ok" : "bg-warn")} aria-hidden />
                  {valid ? "Ready" : needed > 0 ? `${needed} more characters` : "Too long"}
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
                variant="signal"
                size="xl"
                className="w-full sm:w-auto"
                disabled={busy || (signedIn && (!valid || !isCandidate))}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="animate-spin" aria-hidden />
                    Generating…
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
