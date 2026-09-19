"use client";

import { ArrowRight, CircleAlert, Link2, Sparkles, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { runPipeline } from "@/lib/client/api";
import type { PipelineEvent } from "@/lib/pipeline-events";
import { PIPELINE_STEPS, PipelineProgress, type ProgressStep } from "./pipeline-progress";

const MIN_CHARS = 80;
const MAX_CHARS = 20_000;

type Mode = "text" | "url";
type Run = { status: "idle" } | { status: "running" | "error"; steps: ProgressStep[]; message?: string };

function initialSteps(mode: Mode): ProgressStep[] {
  return PIPELINE_STEPS.filter((s) => mode === "url" || s.id !== "read").map((s) => ({ ...s, state: "pending" as const }));
}

function applyEvent(steps: ProgressStep[], e: Extract<PipelineEvent, { type: "step" }>): ProgressStep[] {
  return steps.map((s) => (s.id === e.step ? { ...s, state: e.status === "start" ? "active" : "done", detail: e.detail ?? s.detail } : s));
}

export function JdIntake({ signedIn, isCandidate, demoMode }: { signedIn: boolean; isCandidate: boolean; demoMode: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [run, setRun] = useState<Run>({ status: "idle" });
  const steps = useRef<ProgressStep[]>([]);

  const valid = mode === "text" ? text.trim().length >= MIN_CHARS && text.length <= MAX_CHARS : /^https?:\/\/\S+$/i.test(url.trim());
  const busy = run.status === "running";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) return router.push("/login?next=/");
    if (!valid || busy) return;

    steps.current = initialSteps(mode);
    setRun({ status: "running", steps: steps.current });
    let done: Extract<PipelineEvent, { type: "done" }> | null = null;
    try {
      await runPipeline(mode === "text" ? { rawJd: text } : { sourceUrl: url.trim() }, (ev) => {
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
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Build my challenge</CardTitle>
        <CardDescription>
          Paste the job you want. We keep requirements that filter people (like local experience) out of your rubric.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {run.status === "running" || run.status === "error" ? (
          <div className="space-y-5">
            <PipelineProgress steps={run.steps} />
            {run.status === "error" && (
              <>
                <Alert variant="destructive">
                  <CircleAlert aria-hidden />
                  <AlertTitle>We couldn&apos;t build your challenge</AlertTitle>
                  <AlertDescription>{run.message}</AlertDescription>
                </Alert>
                <Button variant="outline" onClick={() => setRun({ status: "idle" })}>
                  Back to the form
                </Button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="w-full">
                <TabsTrigger value="text" className="gap-1.5">
                  <FileText aria-hidden /> Paste the text
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-1.5">
                  <Link2 aria-hidden /> From a link
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "text" ? (
              <div className="space-y-1.5">
                <Label htmlFor="jd">Job description</Label>
                <Textarea
                  id="jd"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the full job ad: responsibilities, requirements, everything."
                  className="min-h-56 resize-y text-sm leading-relaxed"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{text.trim().length > 0 && text.trim().length < MIN_CHARS ? `A little more, please (${MIN_CHARS} characters minimum).` : "Plain text is fine."}</span>
                  <span className="tabular">
                    {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="jd-url">Link to the posting</Label>
                <Input id="jd-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://company.com/careers/senior-engineer" inputMode="url" />
                <p className="text-xs text-muted-foreground">Public pages only. If the page needs JavaScript to show the job, paste the text instead.</p>
              </div>
            )}

            {demoMode && (
              <Alert>
                <Sparkles aria-hidden />
                <AlertTitle>Demo mode</AlertTitle>
                <AlertDescription>Responses are cached, so any input opens the seeded example. Nothing is generated live.</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" className="w-full gap-2" disabled={signedIn && (!valid || !isCandidate)}>
              {signedIn ? "Build my challenge" : "Sign in to build my challenge"}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            {signedIn && !isCandidate && <p className="text-center text-xs text-muted-foreground">Mentor accounts review submissions. Switch to a candidate account to build a challenge.</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
