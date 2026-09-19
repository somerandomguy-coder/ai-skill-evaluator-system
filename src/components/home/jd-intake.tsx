"use client";

import { ArrowRight, CircleAlert, Sparkles, FileText, CheckCircle2, Upload, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { runPipeline } from "@/lib/client/api";
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

export function JdIntake({ signedIn, isCandidate, demoMode }: { signedIn: boolean; isCandidate: boolean; demoMode: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(PRESETS[0].text);
  const [activePreset, setActivePreset] = useState<string | null>("resume-screener");
  const [run, setRun] = useState<Run>({ status: "idle" });
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) return router.push("/login?next=/");
    if (!valid || busy) return;

    steps.current = initialSteps();
    setRun({ status: "running", steps: steps.current });
    let done: Extract<PipelineEvent, { type: "done" }> | null = null;
    try {
      await runPipeline({ rawJd: text }, (ev) => {
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
      setRun({ status: "error", steps: steps.current, message: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.text"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main Intake Box */}
      <Card className="border border-border bg-surface-container-lowest rounded overflow-hidden">
        {/* Top Control Strip */}
        <div className="bg-surface-container-low/60 border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Try sample role:
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                  activePreset === p.id
                    ? "bg-primary text-white border-primary font-semibold"
                    : "bg-surface-container-lowest text-foreground/80 border-border hover:bg-surface-container hover:text-primary"
                }`}
              >
                {p.name}
              </button>
            ))}
            {text.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-surface-container transition-colors cursor-pointer flex items-center gap-1 font-mono"
                title="Clear text"
              >
                <Trash2 className="size-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 gap-1.5 rounded text-xs font-mono border-border bg-surface-container-lowest hover:bg-surface-container"
            >
              <Upload className="size-3.5" />
              <span>Upload JD file</span>
            </Button>
            <div className="text-xs font-mono text-muted-foreground">
              <span className={text.trim().length >= MIN_CHARS ? "text-primary font-semibold" : "text-amber-600"}>
                {text.length.toLocaleString()}
              </span>
              <span> / {MAX_CHARS.toLocaleString()} chars</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <CardContent className="p-4 sm:p-6">
          {run.status === "running" || run.status === "error" ? (
            <div className="space-y-5 py-4">
              <PipelineProgress steps={run.steps} />
              {run.status === "error" && (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <CircleAlert aria-hidden />
                    <AlertTitle>Could not build challenge</AlertTitle>
                    <AlertDescription>{run.message}</AlertDescription>
                  </Alert>
                  <Button variant="outline" onClick={() => setRun({ status: "idle" })} className="rounded">
                    Back to edit job description
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="relative">
                <Textarea
                  id="jd"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setActivePreset(null);
                  }}
                  placeholder="Paste any job description here (responsibilities, required tech stack, engineering scope)... or choose a sample above."
                  className="min-h-[260px] sm:min-h-[300px] resize-y font-mono text-xs sm:text-sm leading-relaxed p-4 bg-surface-container-lowest border-border rounded focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              {demoMode && (
                <div className="p-3 rounded bg-surface-container-low border border-border text-xs flex items-center gap-2">
                  <Sparkles className="size-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-primary font-semibold">Demo Mode:</strong> Instant challenge generation using pre-cached benchmarks.
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono order-2 sm:order-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>{valid ? "Ready to generate customized challenge & rubric" : `Please enter at least ${MIN_CHARS} characters`}</span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto px-8 bg-primary text-white hover:bg-primary/90 font-semibold tracking-wide rounded cursor-pointer transition-all flex items-center justify-center gap-2 py-6 text-sm sm:text-base order-1 sm:order-2"
                  disabled={signedIn && (!valid || !isCandidate)}
                >
                  <span>{signedIn ? "Generate Assessment Challenge" : "Sign in to Generate Challenge"}</span>
                  <ArrowRight className="size-4.5" aria-hidden />
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
