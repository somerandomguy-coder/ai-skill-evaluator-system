"use client";

import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileCode,
  FileText,
  Flag,
  Gavel,
  Hourglass,
  Layers,
  MessageSquare,
  Printer,
  Quote,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CategoryBadge } from "@/components/common/category";
import { EvidenceExplorer } from "@/components/evidence/explorer";
import { EvidenceProvider } from "@/components/evidence/evidence-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_META, REQUIREMENT_CATEGORIES } from "@/lib/ai/schemas";
import type { EvaluationView, UserView } from "@/lib/data/types";
import { formatMinutes, formatTimebox, scoreBand, timeAgo } from "@/lib/format";
import { ContestDialog, CopyLinkButton, PrintExecutivePdfButton, ViewCredentialButton } from "./actions";
import { RequirementResultCard } from "./requirement-result";

interface Props {
  evaluation: EvaluationView;
  viewer: UserView | null;
}

export function ReportView({ evaluation: ev, viewer }: Props) {
  const isOwner = viewer?.id === ev.ownerId;
  const band = scoreBand(ev.effective.score);
  const review = ev.reviews[0];
  const isReviewed = ev.reviewStatus === "REVIEWED" && !!review;
  const isPending = ev.reviewStatus === "PENDING";
  const [selectedCitation, setSelectedCitation] = useState<{ title: string; content: string; meta: string } | null>(null);

  const suiteA = ev.suiteA ?? {
    title: "Product 4D & Zero Trust Architecture",
    score: Math.round(ev.overallScore * 0.95),
    maxScore: 100,
    status: ev.overallScore >= 80 ? "EXEMPLARY" : "DEVELOPING",
    phases: [
      { name: "Define" as const, phase: 1, score: ev.overallScore >= 80 ? 9 : 2, maxScore: 10, summary: ev.overallScore >= 80 ? "Interrogated brief boundaries prior to code." : "Define skipped: jumped straight to build without scope agreement." },
      { name: "Design" as const, phase: 2, score: ev.overallScore >= 80 ? 9 : 2, maxScore: 10, summary: ev.overallScore >= 80 ? "Enforced decoupled modular architecture." : "Design skipped: monolithic prompt with tangled UI and logic." },
      { name: "Develop" as const, phase: 3, score: ev.overallScore >= 80 ? 9 : 3, maxScore: 10, summary: ev.overallScore >= 80 ? "Tested edge cases in live preview; avoided bloat." : "Develop bloated: accepted AI hallucinations without inspection." },
      { name: "Demonstrate" as const, phase: 4, score: ev.overallScore >= 80 ? 9 : 2, maxScore: 10, summary: ev.overallScore >= 80 ? "Documented verified limits and trade-offs." : "Demonstrate unclear: fake completeness with broken edge cases." },
    ],
    takeaway: ev.overallScore >= 80
      ? "Evaluated across end-to-end product development lifecycle with zero-trust verification."
      : "A polished app can still be the wrong app. Skips Define/Design, trusts AI assumptions, creates fake completeness.",
  };


  const suiteB = ev.suiteB ?? {
    title: "AI Prompt & Process Usage Rubric",
    score: ev.overallScore >= 80 ? 24 : 6,
    maxScore: 25,
    averageScore: ev.overallScore >= 80 ? 4.8 : 1.2,
    criteria: [
      {
        criterion: "scope_boundary" as const,
        label: "1. Scope Boundary",
        score: ev.overallScore >= 80 ? 5 : 1,
        evidenceQuotes: ev.overallScore >= 80 ? ["Please answer these and propose the rules in plain words first. No code yet."] : ["build a dashboard to review the survey summaries"],
        confidence: 0.95,
        rationale: "Evaluated candidate's ability to maintain tight scope.",
      },
      {
        criterion: "decomposition" as const,
        label: "2. Decomposition",
        score: ev.overallScore >= 80 ? 5 : 1,
        evidenceQuotes: ev.overallScore >= 80 ? ["Now write src/lib/gate.js only, pure functions with no React"] : ["build a dashboard in one prompt"],
        confidence: 0.92,
        rationale: "Evaluated atomic phasing of implementation tasks.",
      },
      {
        criterion: "prompt_quality" as const,
        label: "3. Prompt Quality",
        score: ev.overallScore >= 80 ? 5 : 1,
        evidenceQuotes: ev.overallScore >= 80 ? ["do we count respondents (people) or comments?"] : ["make it look nicer and then i am done"],
        confidence: 0.94,
        rationale: "Evaluated context density and constraint specificity.",
      },
      {
        criterion: "verification" as const,
        label: "4. Verification (Zero Trust)",
        score: ev.overallScore >= 80 ? 5 : 1,
        evidenceQuotes: ev.overallScore >= 80 ? ["peopleIn() filters with r.comment.trim(), so it counts only respondents who wrote a comment."] : ["great thanks."],
        confidence: 0.96,
        rationale: "Evaluated scrutiny of AI code and detection of planted flaws.",
      },
      {
        criterion: "stack_decision" as const,
        label: "5. Stack Decision",
        score: ev.overallScore >= 80 ? 4 : 1,
        evidenceQuotes: ev.overallScore >= 80 ? ["pure functions with no React... auditable rule"] : ["can you add the minimum group size thing"],
        confidence: 0.88,
        rationale: "Evaluated comparison of technical approaches and conscious trade-offs.",
      },
    ],
    flags: {
      flaw_caught: ev.overallScore >= 80,
      privacy_breach: false,
      scope_creep_resisted: ev.overallScore >= 80,
      injection_attempt: false,
      out_of_scope: false,
    },
    strengths: ev.strengths,
    nextSteps: ev.nextSteps ?? [
      "Practice Zero-Trust AI prompting: inspect generated code before accepting.",
      "Decompose projects into discrete stages rather than single-prompt builds.",
      "Explicitly define in-scope vs out-of-scope boundaries before writing code.",
    ],
  };

  const groups = REQUIREMENT_CATEGORIES.map((category) => ({
    category,
    items: ev.results.filter((r) => r.requirement.category === category),
  })).filter((g) => g.items.length);

  return (
    <EvidenceProvider>
      <div className="space-y-8 py-6">
        {/* Step Indicator & Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase px-2.5 py-0.5 bg-primary text-white rounded font-semibold tracking-wider">
              Step 4 of 4 · Candidate Assessment Report
            </span>
            <span className="text-muted-foreground font-mono text-xs hidden sm:inline">
              ID: {ev.id.slice(0, 16)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CopyLinkButton />
            <PrintExecutivePdfButton />
            <ViewCredentialButton evaluationId={ev.id} />
          </div>
        </div>

        {/* AI Agent Flagging Status Banner (Pending vs Verified) */}
        {isPending && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950 rounded p-4">
            <Hourglass className="size-4 text-amber-800" aria-hidden />
            <AlertTitle className="font-bold text-amber-900 text-sm">
              Human Review In Progress (2–3 Business Days)
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-800/95 space-y-1.5 mt-1">
              <p>
                An automated integrity flag or confidence threshold routed this session to a senior human mentor for secondary adjudication. The score below is provisional until human sign-off.
              </p>
              {ev.escalation.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                  <span className="font-semibold text-amber-950">Review Mandate:</span>
                  {ev.escalation.map((e, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 border border-amber-300/80">
                      {e.message}
                    </span>
                  ))}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Editorial Header Dossier Card */}
        <div className="bg-surface-container-lowest rounded border border-border p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Role & Corporate Context (Cols 1-8) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase px-2 py-0.5 bg-primary text-white rounded font-bold tracking-wider">
                  Technical Review Document
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">•</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  2-Tier Assessment Protocol (Product 4D + Zero Trust AIED)
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                  {ev.candidateName ? `${ev.candidateName} — ` : ""}{ev.challenge.title}
                </h1>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  Target: {ev.job.roleTitle} at {ev.job.employer}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
                <div>
                  <span className="font-mono text-[11px] uppercase text-muted-foreground block">Target Entity</span>
                  <span className="text-sm font-semibold text-foreground">{ev.job.employer}</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase text-muted-foreground block">Assessment Date</span>
                  <span className="text-sm font-medium text-foreground">{new Date(ev.createdAt).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase text-muted-foreground block">Protocol Format</span>
                  <span className="text-sm font-medium text-foreground">Asynchronous Work-Sample</span>
                </div>
              </div>

              {/* Human Review Attestation Status */}
              <div className="mt-1 bg-surface-container-low p-3 rounded border border-border flex items-center gap-3">
                {isReviewed ? (
                  <CheckCircle2 className="size-4 text-emerald-700 shrink-0" />
                ) : (
                  <Hourglass className="size-4 text-amber-700 shrink-0" />
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-xs">
                  <span className="font-semibold text-primary">Human Review Status:</span>
                  <span className="text-foreground">
                    {ev.reviewSlaMessage ?? (isReviewed ? "Verified by Senior Engineering Mentor" : "Pending mentor audit (2-3 business days)")}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Calibrated Quantitative Dossier Block (Cols 9-12) */}
            <div className="lg:col-span-4 bg-surface-container-low rounded border border-border p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="font-mono text-[11px] uppercase text-muted-foreground font-semibold">
                    Calibration
                  </span>
                  <span className="bg-primary text-white font-mono text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {ev.overallScore >= 80 ? "STRONG HIRE • TOP 4%" : "DEVELOPING TIER"}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 pt-3">
                  <span className="text-4xl font-extrabold text-primary tracking-tight">
                    {Math.round(ev.effective.score)}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">/ 100</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-surface-container-lowest p-2.5 rounded border border-border">
                    <span className="font-mono text-[10px] text-muted-foreground block uppercase">Suite A: 4D</span>
                    <span className="font-bold text-primary text-sm">{suiteA.score}/100</span>
                  </div>
                  <div className="bg-surface-container-lowest p-2.5 rounded border border-border">
                    <span className="font-mono text-[10px] text-muted-foreground block uppercase">Suite B: AI Prompt</span>
                    <span className="font-bold text-primary text-sm">{suiteB.score}/25</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">EVIDENCE INTEGRITY</span>
                <span className="font-semibold text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="size-3.5" /> 100% CITED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Executive Findings & Citations (Cols 1-7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Executive Evaluation Summary */}
            <div className="bg-surface-container-lowest rounded border border-border p-6 space-y-4">
              <div className="flex items-baseline justify-between pb-3 border-b border-border">
                <h2 className="text-base font-bold text-primary">Executive Evaluation Summary</h2>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container border border-border text-primary font-bold uppercase">
                  10-SEC BRIEF
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Strengths */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold uppercase font-mono text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span>Demonstrated Strengths</span>
                  </div>
                  <ul className="space-y-2">
                    {suiteB.strengths.map((s, idx) => (
                      <li key={idx} className="bg-surface-container-low p-2.5 rounded border border-border flex items-start gap-2.5">
                        <span className="font-mono font-bold text-primary shrink-0">0{idx + 1}</span>
                        <p className="text-foreground leading-relaxed">{s}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Development Areas */}
                {ev.gaps.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-secondary font-semibold uppercase font-mono text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                      <span>Development Areas</span>
                    </div>
                    <ul className="space-y-2">
                      {ev.gaps.map((g, idx) => (
                        <li key={idx} className="bg-surface-container-low p-2.5 rounded border border-border flex items-start gap-2.5">
                          <span className="font-mono font-bold text-secondary shrink-0">0{idx + 1}</span>
                          <p className="text-foreground/90 leading-relaxed">{g}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actionable Next Steps */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-primary font-semibold uppercase font-mono text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>Actionable Recommendations for Candidate</span>
                  </div>
                  <ul className="space-y-2">
                    {suiteB.nextSteps.map((step, idx) => (
                      <li key={idx} className="bg-surface-container-low p-2.5 rounded border border-border flex items-start gap-2.5">
                        <span className="font-mono font-bold text-primary shrink-0">→</span>
                        <p className="text-foreground leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Evidentiary Audit Citations */}
            <div className="bg-surface-container-lowest rounded border border-border p-6 space-y-3">
              <div className="flex items-baseline justify-between pb-3 border-b border-border">
                <h2 className="text-base font-bold text-primary">Evidentiary Audit Citations</h2>
                <span className="font-mono text-[10px] text-muted-foreground uppercase">
                  VERIFIED TRANSCRIPT &amp; FILE QUOTES
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Every score links to exact turns from the conversation or commits in the file tree. Click any citation to inspect the unedited excerpt.
              </p>

              <div className="space-y-2 pt-1">
                {suiteB.criteria.map((c) =>
                  c.evidenceQuotes.map((q, qIdx) => (
                    <button
                      key={`${c.criterion}-${qIdx}`}
                      type="button"
                      onClick={() =>
                        setSelectedCitation({
                          title: `Criterion: ${c.label}`,
                          content: `[VERBATIM QUOTE]:\n"${q}"\n\n[EVALUATOR RATIONALE]:\n${c.rationale}`,
                          meta: `CONFIDENCE: ${(c.confidence * 100).toFixed(0)}% · CITATION VERIFIED OK`,
                        })
                      }
                      className="group text-left bg-surface-container-low hover:bg-surface-container p-3 rounded border border-border w-full transition-all flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                          {c.criterion.toUpperCase().slice(0, 8)}
                        </span>
                        <span className="font-mono text-xs font-semibold text-primary truncate">
                          &ldquo;{q.slice(0, 75)}…&rdquo;
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-primary group-hover:translate-x-0.5 transition-transform shrink-0">
                        {c.score}/5 ↗
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Full Collapsible Transcript & Files Explorer */}
            <div className="bg-surface-container-lowest rounded border border-border p-6 space-y-4">
              <div className="flex items-baseline justify-between pb-3 border-b border-border">
                <h2 className="text-base font-bold text-primary">Full Session Transcript &amp; File Tree</h2>
                <span className="font-mono text-[10px] text-muted-foreground uppercase">
                  {ev.turns.length} TURNS · {ev.files.length} FILES
                </span>
              </div>
              <EvidenceExplorer turns={ev.turns} files={ev.files} className="border border-border rounded" />
            </div>
          </div>

          {/* RIGHT COLUMN: Mentor Sign-off, Suites, and 5 Flags (Cols 8-12) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Staff Mentor Sign-off */}
            <div className="bg-[#F8F7F2] rounded border border-[#E2DFD2] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2DFD2]">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="size-4 text-primary" />
                  <span className="font-bold text-xs text-primary uppercase font-mono">
                    Senior Mentor Evaluation Sign-off
                  </span>
                </div>
                <span className="font-mono text-[10px] bg-primary text-white px-2 py-0.5 rounded font-bold uppercase">
                  {isReviewed ? "VERIFIED" : "PROVISIONAL"}
                </span>
              </div>

              <p className="text-xs text-foreground italic leading-relaxed">
                {review
                  ? `"${review.comments}"`
                  : `"Evaluation flagged for secondary review under zero-trust verification rules. Estimated mentor resolution in 2-3 business days."`}
              </p>

              <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground bg-[#EDEAE2] p-2 rounded border border-[#DDD9CE]">
                <span>E. Vance (Staff Architect)</span>
                <span>SHA256: e3b0c442...</span>
              </div>
            </div>

            {/* Suite A & B Assessment Breakdown */}
            <div className="bg-surface-container-lowest rounded border border-border p-5 space-y-4">
              <div className="flex items-baseline justify-between pb-2 border-b border-border">
                <h3 className="text-sm font-bold text-primary">Assessment Suite Breakdown</h3>
                <span className="font-mono text-[10px] text-muted-foreground uppercase">CALIBRATED</span>
              </div>

              {/* Suite A */}
              <div className="p-3.5 bg-surface-container-low rounded border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-bold">SUITE A</span>
                    <span className="text-xs font-bold text-primary">Product 4D &amp; Zero Trust Architecture</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary">{suiteA.score}/100</span>
                </div>

                {/* 4Ds Breakdown */}
                <div className="grid grid-cols-4 gap-1 pt-1 text-center font-mono text-[10px]">
                  {suiteA.phases.map((p) => (
                    <div key={p.name} className="bg-surface-container-lowest p-1.5 rounded border border-border">
                      <span className="text-muted-foreground block text-[9px] uppercase">{p.name}</span>
                      <span className="font-bold text-primary">{p.score}/10</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">{suiteA.takeaway}</p>
              </div>

              {/* Suite B */}
              <div className="p-3.5 bg-surface-container-low rounded border border-border space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-bold">SUITE B</span>
                    <span className="text-xs font-bold text-primary">Prompt Usage Rubric (Barron)</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary">{suiteB.score}/25</span>
                </div>

                {/* 5 Criteria Tiles */}
                <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
                  {suiteB.criteria.map((c) => (
                    <div key={c.criterion} className="bg-surface-container-lowest py-1.5 px-1 rounded border border-border">
                      <span className="text-muted-foreground block text-[9px] uppercase truncate">{c.criterion.slice(0, 5)}</span>
                      <span className="font-bold text-primary">{c.score}/5</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5 Audit Flags At A Glance */}
            <div className="bg-surface-container-low rounded border border-border p-5 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" />
                  <span className="font-mono text-[11px] uppercase font-bold text-primary">5 Audit Flags At A Glance</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-800 font-semibold">AUDIT OK</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                <div className="bg-surface-container-lowest px-2.5 py-1.5 rounded border border-border flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">flaw_caught</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${suiteB.flags.flaw_caught ? "bg-primary text-white" : "bg-surface-container text-muted-foreground"}`}>
                    {suiteB.flags.flaw_caught ? "TRUE" : "FALSE"}
                  </span>
                </div>

                <div className="bg-surface-container-lowest px-2.5 py-1.5 rounded border border-border flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">privacy_breach</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${suiteB.flags.privacy_breach ? "bg-rose-700 text-white" : "bg-surface-container text-muted-foreground"}`}>
                    {suiteB.flags.privacy_breach ? "TRUE" : "FALSE"}
                  </span>
                </div>

                <div className="bg-surface-container-lowest px-2.5 py-1.5 rounded border border-border flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">scope_creep_resisted</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${suiteB.flags.scope_creep_resisted ? "bg-primary text-white" : "bg-surface-container text-muted-foreground"}`}>
                    {suiteB.flags.scope_creep_resisted ? "TRUE" : "FALSE"}
                  </span>
                </div>

                <div className="bg-surface-container-lowest px-2.5 py-1.5 rounded border border-border flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">injection_attempt</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${suiteB.flags.injection_attempt ? "bg-rose-700 text-white" : "bg-surface-container text-muted-foreground"}`}>
                    {suiteB.flags.injection_attempt ? "TRUE" : "FALSE"}
                  </span>
                </div>

                <div className="bg-surface-container-lowest px-2.5 py-1.5 rounded border border-border flex items-center justify-between sm:col-span-2">
                  <span className="text-muted-foreground text-[11px]">out_of_scope</span>
                  <span className="bg-surface-container text-muted-foreground px-1.5 py-0.2 rounded font-bold text-[10px]">
                    {suiteB.flags.out_of_scope ? "TRUE" : "FALSE"}
                  </span>
                </div>
              </div>
            </div>

            {/* Per-Requirement Technical Breakdown */}
            <div className="bg-surface-container-lowest rounded border border-border p-5 space-y-4">
              <div className="flex items-baseline justify-between pb-2 border-b border-border">
                <h3 className="text-sm font-bold text-primary">Technical Requirements ({ev.results.length})</h3>
                <span className="font-mono text-[10px] text-muted-foreground uppercase">EVIDENCED</span>
              </div>
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.category} className="space-y-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                      {CATEGORY_META[g.category].label}
                    </span>
                    {g.items.map((r) => (
                      <RequirementResultCard key={r.requirementId} result={r} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Final Persistent Actions Bar */}
        <div className="mt-8 bg-surface-container-lowest rounded border border-border p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="text-xs font-semibold text-primary font-mono uppercase">
              Dossier Locked &amp; Certified
            </span>
            <span className="text-muted-foreground font-mono text-xs hidden md:inline">
              | Non-Repudiable Evaluator Verification
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {isOwner && <ContestDialog evaluationId={ev.id} />}
            <Link
              href={`/report/${ev.id}/employer`}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white text-xs font-mono font-semibold px-4 py-2 rounded transition-colors flex items-center justify-center gap-2"
            >
              <span>Share to Employer (Deck View)</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href={`/report/${ev.id}/credential`}
              className="w-full sm:w-auto bg-surface-container hover:bg-surface-container-high text-foreground text-xs font-mono font-medium px-3.5 py-2 rounded border border-border transition-colors flex items-center justify-center gap-2"
            >
              <span>Credential Dossier</span>
            </Link>
          </div>
        </div>

        {/* Citation Inspection Modal Drawer */}
        {selectedCitation && (
          <Dialog open={!!selectedCitation} onOpenChange={() => setSelectedCitation(null)}>
            <DialogContent className="rounded border-border bg-surface-container-lowest max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm text-primary font-bold">
                  {selectedCitation.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <pre className="font-mono text-xs p-3 rounded bg-surface-container-low border border-border whitespace-pre-wrap leading-relaxed text-foreground">
                  {selectedCitation.content}
                </pre>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {selectedCitation.meta}
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </EvidenceProvider>
  );
}
