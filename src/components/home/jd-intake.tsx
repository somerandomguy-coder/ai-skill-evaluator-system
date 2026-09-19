"use client";

import { ArrowRight, CircleAlert, Link2, Sparkles, FileText, CheckCircle2, Terminal, Shield, Zap } from "lucide-react";
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

const PRESETS = [
  {
    id: "cultureamp",
    name: "Culture Amp (Seeded)",
    url: "https://www.cultureamp.com/careers/senior-fullstack-people-intelligence",
    text: `Role: Senior Full-Stack Engineer — People Intelligence
Company: Culture Amp (Melbourne, VIC / Sydney, NSW)
Team: Survey Analytics, Privacy & Confidentiality Engine

Primary Architectural Scope:
- Build decision-support tools and audit workflows for sensitive employee feedback and survey reporting.
- Enforce strict k-anonymity confidentiality thresholds to prevent demographic subtraction leaks across hierarchical department trees.
- Design auditable human-in-the-loop review interfaces for generative AI survey summaries and comment clustering.
- Implement robust unit, integration, and property-based tests verifying zero data leakage under all partition combinations.`,
  },
  {
    id: "atlassian",
    name: "Atlassian SRE",
    url: "https://careers.atlassian.com/jobs/cloud-resiliency-syd",
    text: `Role: Senior Distributed Systems Engineer — Cloud Infrastructure & Resiliency
Company: Atlassian (Sydney, NSW — Hybrid / George St Hub)
Group: Core Platform Reliability & Multi-Region Topology (Confluence Cloud Infrastructure)

Primary Architectural Scope:
- Design, scale, and insulate distributed state machines powering low-latency multi-region synchronization.
- Implement partitioned consensus layers and failover controls with strict p99.9 latency SLA under 120ms during cross-regional packet blackholes.
- Mitigate split-brain risk in asynchronous replication topologies using verifiable state machines and custom rate-shedding ring buffers.
- Author zero-downtime database schema migration protocols and regional ring deployments with automated rollback trigger gates.

Minimum Qualifications & Experience:
- 5+ years building and operating large-scale distributed systems in Go, Rust, or modern TypeScript/Node.
- Proven experience with consensus engine edge cases under network partition fault states.
- Deep comprehension of Linux kernel network namespaces, TCP window scaling, and eBPF observability probes.`,
  },
  {
    id: "canva",
    name: "Canva Infra",
    url: "https://www.canva.com/careers/jobs/realtime-render-fabric-lead",
    text: `Role: Senior Infrastructure Engineer — Realtime Render Fabric
Company: Canva (Surry Hills, NSW / Remote AU)
Team: Media Processing & Global Edge Compute Pipeline

Primary Architectural Scope:
- Build high-throughput media ingestion and distributed canvas rasterization engines across edge nodes.
- Maintain multi-region Kubernetes clusters handling 50k+ concurrent real-time collaboration sessions with sub-50ms canvas delta updates.
- Profile memory allocations, GC pauses, and CPU cache misses in high-concurrency node runtimes.
- Design fail-safe cache invalidation architectures across distributed Redis clusters and Cloudflare Workers.`,
  },
];

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
  const [text, setText] = useState(PRESETS[0].text);
  const [url, setUrl] = useState(PRESETS[0].url);
  const [activePreset, setActivePreset] = useState("cultureamp");
  const [run, setRun] = useState<Run>({ status: "idle" });
  const steps = useRef<ProgressStep[]>([]);

  const valid = mode === "text" ? text.trim().length >= MIN_CHARS && text.length <= MAX_CHARS : /^https?:\/\/\S+$/i.test(url.trim());
  const busy = run.status === "running";

  function handlePreset(p: typeof PRESETS[number]) {
    setActivePreset(p.id);
    setText(p.text);
    setUrl(p.url);
  }

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
    <div className="w-full space-y-4">
      {/* Preset Switcher Bar */}
      <div className="w-full bg-surface-container-low border border-border rounded p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
          <span className="font-mono uppercase font-semibold text-primary">Prototype Presets:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePreset(p)}
              className={`px-2.5 py-1 rounded font-mono text-[11px] transition-all flex items-center gap-1.5 cursor-pointer border ${
                activePreset === p.id
                  ? "bg-primary text-white border-primary font-semibold"
                  : "bg-surface-container-lowest text-muted-foreground border-border hover:text-primary hover:bg-surface-container"
              }`}
            >
              {activePreset === p.id && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Intake Form */}
      <Card className="border border-border bg-surface-container-lowest rounded">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold tracking-tight text-primary">
                  Target Role & Engineering Mandate
                </CardTitle>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <CardDescription className="text-xs mt-0.5">
                Every project brief and evaluation rubric is synthesized directly from real company constraints.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
              <span className="font-semibold text-primary">{text.length.toLocaleString()} chars</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">Optimal calibration density</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {run.status === "running" || run.status === "error" ? (
            <div className="space-y-5 py-2">
              <PipelineProgress steps={run.steps} />
              {run.status === "error" && (
                <>
                  <Alert variant="destructive">
                    <CircleAlert aria-hidden />
                    <AlertTitle>We couldn&apos;t build your challenge</AlertTitle>
                    <AlertDescription>{run.message}</AlertDescription>
                  </Alert>
                  <Button variant="outline" onClick={() => setRun({ status: "idle" })} className="rounded">
                    Back to the form
                  </Button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="w-full bg-surface-container-low border border-border p-0.5 rounded">
                  <TabsTrigger value="text" className="gap-1.5 text-xs rounded data-[state=active]:bg-surface-container-lowest data-[state=active]:text-primary">
                    <FileText className="size-3.5" aria-hidden /> Paste Job Ad Text
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-1.5 text-xs rounded data-[state=active]:bg-surface-container-lowest data-[state=active]:text-primary">
                    <Link2 className="size-3.5" aria-hidden /> Fetch from URL
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {mode === "text" ? (
                <div className="space-y-1.5">
                  <Textarea
                    id="jd"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste the full job description: responsibilities, requirements, architectural scope..."
                    className="min-h-60 resize-y font-mono text-xs leading-relaxed p-3 bg-surface-container-lowest border-border rounded focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                    <span>{text.trim().length > 0 && text.trim().length < MIN_CHARS ? `Minimum ${MIN_CHARS} characters required.` : "Plain text with requirements."}</span>
                    <span>
                      {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    id="jd-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://careers.company.com/job/distributed-systems-lead"
                    className="font-mono text-xs border-border rounded"
                    inputMode="url"
                  />
                  <p className="text-[11px] text-muted-foreground">Public posting URLs only. If the page is behind a login wall, paste the text directly.</p>
                </div>
              )}

              {demoMode && (
                <div className="p-2.5 rounded bg-surface-container-low border border-border text-xs flex items-center gap-2">
                  <Sparkles className="size-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-primary font-semibold">Live Prototype Mode:</strong> Cached responses provide instant challenge synthesis without wait.
                  </span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary text-white hover:bg-primary/90 font-semibold tracking-wide rounded cursor-pointer transition-all flex items-center justify-center gap-2 py-5"
                disabled={signedIn && (!valid || !isCandidate)}
              >
                <span>{signedIn ? "Generate My Project Brief & Rubric" : "Sign in to Generate Challenge"}</span>
                <ArrowRight className="size-4" aria-hidden />
              </Button>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>Takes ~45s to calibrate 2-tier evaluation rubric and provision isolated sandbox.</span>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
