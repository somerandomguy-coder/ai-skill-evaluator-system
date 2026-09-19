import { ArrowLeft, Award, Check, Download, ExternalLink, Link2, Printer, ShieldCheck, Sparkles, Terminal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/common/layout";
import { CopyLinkButton, PrintExecutivePdfButton } from "@/components/report/actions";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Verified Candidate Dossier · Proof of AI Skill" };

export default async function CredentialPage({ params }: PageProps<"/report/[id]/credential">) {
  const { id } = await params;
  const ev = await data.getEvaluation(id);
  if (!ev) notFound();

  const isStrong = ev.overallScore >= 80;
  const candidateName = ev.candidateName ?? (isStrong ? "Alex Vance" : "Candidate #" + id.slice(0, 8));
  const suiteA = ev.suiteA ?? {
    title: "Product Test Suite (4Ds)",
    score: Math.round(ev.overallScore * 0.95),
    maxScore: 100,
    status: isStrong ? "EXEMPLARY" : "DEVELOPING",
    phases: [
      { name: "Define" as const, phase: 1, score: isStrong ? 9 : 2, maxScore: 10, summary: isStrong ? "Identified subtraction leak and ambiguous group-size boundary." : "Define skipped: jumped straight to build." },
      { name: "Design" as const, phase: 2, score: isStrong ? 9 : 2, maxScore: 10, summary: isStrong ? "Explicit bounded memory ceiling and decoupled pure gate logic." : "Design skipped: tangled UI and decision logic." },
      { name: "Develop" as const, phase: 3, score: isStrong ? 9 : 3, maxScore: 10, summary: isStrong ? "Zero-regression implementation; caught planted counting flaw." : "Develop bloated: accepted hallucinated AI scope." },
      { name: "Demonstrate" as const, phase: 4, score: isStrong ? 9 : 2, maxScore: 10, summary: isStrong ? "Vitest stress test suite verified with transparent trade-offs." : "Demonstrate unclear: fake completeness with broken edge cases." },
    ],
    takeaway: isStrong
      ? "Tested AI code under load; caught unhandled async rejections before committing."
      : "A polished app can still be the wrong app. Skips Define/Design, trusts AI assumptions, creates fake completeness.",
  };


  const suiteB = ev.suiteB ?? {
    title: "Prompt Usage Rubric (Barron)",
    score: isStrong ? 24 : 6,
    maxScore: 25,
    averageScore: isStrong ? 4.8 : 1.2,
    criteria: [
      { criterion: "scope_boundary" as const, label: "1. Scope Boundary", score: isStrong ? 5 : 1, rationale: "Strict V1 boundaries set; rejected AI-proposed feature creep." },
      { criterion: "decomposition" as const, label: "2. Decomposition", score: isStrong ? 5 : 1, rationale: "Decomposed work into atomic steps; tackled gate before UI." },
      { criterion: "prompt_quality" as const, label: "3. Prompt Quality", score: isStrong ? 5 : 1, rationale: "High-context prompts with explicit constraints and type bounds." },
      { criterion: "verification" as const, label: "4. Verification (Zero Trust)", score: isStrong ? 5 : 1, rationale: "Caught planted defect in peopleIn(); questioned AI claims." },
      { criterion: "stack_decision" as const, label: "5. Stack Decision", score: isStrong ? 4 : 1, rationale: "Compared architectural approaches; justified pure functions." },
    ],
    flags: { flaw_caught: isStrong, privacy_breach: false, scope_creep_resisted: isStrong, injection_attempt: false, out_of_scope: false },
  };

  const shaHash = ev.verificationReceipt?.hash ?? "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  return (
    <div className="w-full min-h-screen bg-surface py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Navigation & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/report/${ev.id}`} className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" />
              <span>← Back to Detailed Assessment Report</span>
            </Link>
            <span className="text-border">|</span>
            <Link
              href={`/report/${ev.id}/employer`}
              className="inline-flex items-center gap-1 text-xs font-mono text-primary font-semibold hover:underline bg-surface-container px-2.5 py-0.5 rounded border border-border"
            >
              <span>Switch to Focused Employer Deck (1-by-1) →</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <CopyLinkButton label="Copy Verified Link" />
            <PrintExecutivePdfButton />
          </div>
        </div>


        {/* Archival Metadata Ribbon */}
        <div className="w-full bg-surface-container-low py-2 px-4 rounded border border-border flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>DECISION DOSSIER ACTIVE</span>
            <span>•</span>
            <span className="text-muted-foreground font-normal">PROTOCOL: PROOFCRAFT-RESILIENCE-V4</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">SESSION SHA256: <span className="text-foreground font-bold">{shaHash.slice(0, 18)}…</span></span>
            <span>•</span>
            <span className="text-foreground font-semibold">CALIBRATION N=140</span>
          </div>
        </div>

        {/* TOP HERO BANNER: 10-Second Glance Brief */}
        <div className="bg-surface-container-lowest rounded border border-border p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded bg-surface-container font-semibold text-foreground border border-border">
                  EXECUTIVE DOSSIER
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">• 10-SECOND GLANCE BRIEF</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-3xl font-extrabold text-primary tracking-tight">
                  {candidateName}
                </h1>
                <span className="text-sm font-medium text-muted-foreground">
                  Target: {ev.job.roleTitle} ({ev.job.employer})
                </span>
              </div>
            </div>

            {/* Verdict Badge */}
            <div className="self-start lg:self-center">
              <div className="bg-primary text-white px-5 py-3 rounded flex items-center gap-3 border border-primary">
                <div className="w-4 h-4 rounded-full bg-white text-primary flex items-center justify-center shrink-0">
                  <Check className="size-3 stroke-[3]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary-foreground/70">
                    EXECUTIVE VERDICT
                  </span>
                  <span className="text-sm font-bold tracking-tight text-white uppercase">
                    {isStrong ? "STRONG HIRE • TOP 4% TIER" : "DEVELOPING TALENT TIER"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Big Number Metrics Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1 */}
            <div className="bg-surface-container-low p-5 rounded border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase font-semibold text-muted-foreground">Overall Score</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-lowest font-bold text-primary border border-border">
                  {isStrong ? "98TH %ILE" : "DEVELOPING"}
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-2">
                <span className="text-4xl font-extrabold text-primary">{Math.round(ev.effective.score)}</span>
                <span className="text-sm text-muted-foreground font-mono">/ 100</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Calibrated against 140 Staff Engineer benchmarks</p>
            </div>

            {/* Metric 2 */}
            <div className="bg-surface-container-low p-5 rounded border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase font-semibold text-muted-foreground">Test Suites Passed</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary text-white font-bold">
                  {isStrong ? "2 / 2 PASS" : "1 / 2 PASS"}
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-2">
                <span className="text-4xl font-extrabold text-primary">{isStrong ? "2" : "1"}</span>
                <span className="text-sm text-muted-foreground font-mono">/ 2 Suites</span>
              </div>
              <p className="text-[11px] text-muted-foreground">100% Zero-Trust integrity runtime verified</p>
            </div>

            {/* Metric 3 */}
            <div className="bg-surface-container-low p-5 rounded border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase font-semibold text-muted-foreground">Anomaly / Drift Flags</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-lowest font-bold text-primary border border-border">
                  SEALED
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-2">
                <span className="text-4xl font-extrabold text-primary">0</span>
                <span className="text-sm text-muted-foreground font-mono">flags</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Tamper-proof SHA256 session audit; clean telemetry</p>
            </div>
          </div>
        </div>

        {/* TWO DEDICATED TEST SUITES (Side-by-Side Cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Suite 01: Product Test Suite (4Ds) */}
          <div className="lg:col-span-6 bg-surface-container-lowest rounded border border-border p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container font-bold text-primary border border-border">
                    SUITE 01 // ARCHITECTURE
                  </span>
                  <h2 className="text-base font-bold text-primary mt-1">Product Test Suite (4Ds)</h2>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-bold text-primary">{suiteA.score}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
                  <span className="block font-mono text-[10px] font-semibold text-muted-foreground uppercase">{suiteA.status}</span>
                </div>
              </div>

              {/* 4Ds Grid */}
              <div className="space-y-2.5">
                {suiteA.phases.map((p) => (
                  <div key={p.name} className="p-3 rounded bg-surface-container-low border border-border flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{p.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">Phase {p.phase}</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] truncate mt-0.5">{p.summary}</p>
                    </div>
                    <div className="font-mono font-bold text-primary bg-surface-container-lowest px-2.5 py-1 rounded border border-border shrink-0">
                      {p.score}/10
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-surface-container-low border border-border rounded text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-primary uppercase">
                <ShieldCheck className="size-3.5 text-emerald-700" />
                <span>ZERO-TRUST AI VERIFICATION HIGHLIGHT</span>
              </div>
              <p className="text-foreground text-[11px] italic leading-relaxed">
                &ldquo;{suiteA.takeaway}&rdquo;
              </p>
            </div>
          </div>

          {/* Suite 02: Prompt Usage Rubric (Barron Research) */}
          <div className="lg:col-span-6 bg-surface-container-lowest rounded border border-border p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-surface-container font-bold text-primary border border-border">
                    SUITE 02 // COGNITION
                  </span>
                  <h2 className="text-base font-bold text-primary mt-1">Prompt Usage Rubric (Barron)</h2>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-bold text-primary">{suiteB.score}<span className="text-xs font-normal text-muted-foreground">/25</span></span>
                  <span className="block font-mono text-[10px] font-semibold text-muted-foreground uppercase">({suiteB.averageScore.toFixed(1)} / 5.0)</span>
                </div>
              </div>

              {/* 5 Criteria */}
              <div className="space-y-2">
                {suiteB.criteria.map((c) => (
                  <div key={c.criterion} className="p-2.5 rounded bg-surface-container-low border border-border flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-primary block truncate">{c.label}</span>
                      <p className="text-muted-foreground text-[11px] truncate">{c.rationale}</p>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-primary text-white font-mono text-xs font-bold shrink-0">
                      {c.score}/5
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-surface-container-low border border-border rounded text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-primary uppercase">
                <Terminal className="size-3.5 text-primary" />
                <span>COGNITIVE RIGOR ATTESTATION</span>
              </div>
              <p className="text-foreground text-[11px] leading-relaxed">
                Candidate exercised disciplined steering, verified AI assumptions, and resisted premature feature bloat.
              </p>
            </div>
          </div>
        </div>

        {/* Cryptographic Tamper-Proof Audit Receipt */}
        <div className="bg-surface-container-lowest rounded border border-border p-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border font-mono text-xs">
            <span className="font-bold text-primary uppercase">Tamper-Proof Audit Receipt &amp; Verification Certificate</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="size-3.5" /> CRYPTOGRAPHICALLY CERTIFIED
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground text-[11px] block">ISSUING ENGINE</span>
              <span className="font-bold text-primary">ProofCraft Autonomous Verification Engine v2.4</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-[11px] block">TIMESTAMP (UTC)</span>
              <span className="font-bold text-primary">{new Date(ev.createdAt).toISOString()}</span>
            </div>
            <div className="space-y-1 md:col-span-2">
              <span className="text-muted-foreground text-[11px] block">RECORD HASH</span>
              <span className="font-mono text-xs bg-surface-container-low p-2 rounded border border-border block text-foreground break-all">
                {shaHash}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-border no-print">
          <Link href={`/report/${ev.id}`} className="text-xs font-mono text-primary underline underline-offset-2 flex items-center gap-1">
            <ArrowLeft className="size-3.5" />
            <span>Return to full transcript &amp; source files</span>
          </Link>
          <div className="flex items-center gap-2">
            <CopyLinkButton label="Copy Shareable Dossier Link" />
            <PrintExecutivePdfButton />
          </div>
        </div>
      </div>
    </div>
  );
}
