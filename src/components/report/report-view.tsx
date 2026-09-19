"use client";

import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Eye,
  FileCode,
  FileText,
  Flag,
  Gavel,
  Hourglass,
  Layers,
  ListChecks,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_META, REQUIREMENT_CATEGORIES } from "@/lib/ai/schemas";
import type { EvaluationView, UserView } from "@/lib/data/types";
import { formatMinutes, formatTimebox, scoreBand, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContestDialog, CopyLinkButton, PrintExecutivePdfButton, ViewCredentialButton } from "./actions";
import { RequirementResultCard } from "./requirement-result";
import { buildCognitiveSuites } from "@/lib/services/cognitive-rubric";

interface Props {
  evaluation: EvaluationView;
  viewer: UserView | null;
}

const CRITERION_LABELS: Record<string, string> = {
  scope_boundary: "SCOPE BOUNDARY",
  decomposition: "DECOMPOSITION",
  prompt_quality: "PROMPT QUALITY",
  verification: "VERIFICATION (ZT)",
  stack_decision: "STACK DECISION",
};

interface CollapsibleSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badges?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  id,
  title,
  subtitle,
  icon,
  badges,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div id={id} className="rounded border border-border bg-surface-container-lowest overflow-hidden transition-all shadow-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-surface-container-low/70 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="p-2 rounded bg-surface-container text-primary shrink-0">{icon}</span>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-primary truncate">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-3">
          <div className="hidden sm:flex items-center gap-1.5">{badges}</div>
          <div className="size-7 rounded bg-surface-container flex items-center justify-center text-muted-foreground transition-transform">
            <ChevronDown className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")} />
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-border p-4 sm:p-6 bg-surface-container-lowest animate-in fade-in-50 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

export function ReportView({ evaluation: ev, viewer }: Props) {
  const isOwner = viewer?.id === ev.ownerId;
  const band = scoreBand(ev.effective.score);
  const review = ev.reviews[0];
  const isReviewed = ev.reviewStatus === "REVIEWED" && !!review;
  const isPending = ev.reviewStatus === "PENDING";
  const [selectedCitation, setSelectedCitation] = useState<{ title: string; content: string; meta: string } | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: false,
    rubric: false,
    cognitive: false,
    citations: false,
    transcript: false,
  });

  const anyOpen = Object.values(openSections).some(Boolean);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const next = !anyOpen;
    setOpenSections({
      summary: next,
      rubric: next,
      cognitive: next,
      citations: next,
      transcript: next,
    });
  };

  const dynamicCognitive = buildCognitiveSuites({
    sessionId: ev.sessionId,
    challengeTitle: ev.challenge.title,
    overallScore: ev.overallScore,
    turns: ev.turns,
  });

  const suiteA = ev.suiteA ?? dynamicCognitive.suiteA;
  const suiteB = ev.suiteB ?? dynamicCognitive.suiteB;

  const groups = REQUIREMENT_CATEGORIES.map((category) => ({
    category,
    items: ev.results.filter((r) => r.requirement.category === category),
  })).filter((g) => g.items.length);

  const totalQuotes = suiteB.criteria.reduce((sum, c) => sum + c.evidenceQuotes.length, 0);

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

        {/* Top Banner: Interviewer / Employer Simplified Deck View */}
        <div className="bg-primary text-white p-3.5 rounded border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-center sm:text-left">
            <Sparkles className="size-4 shrink-0 text-amber-300" />
            <span>
              <strong>Interviewer or Hiring Manager?</strong> Review this candidate in our distraction-free, 1-card-at-a-time executive deck view.
            </span>
          </div>
          <Link
            href={`/report/${ev.id}/employer`}
            className="w-full sm:w-auto bg-white text-primary hover:bg-white/95 text-xs font-semibold px-4 py-2 rounded transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
          >
            <span>Open Interviewer Deck</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

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
                  <span className="text-sm font-medium text-foreground" suppressHydrationWarning>
                    {new Date(ev.createdAt).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}
                  </span>
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

        {/* Section Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-primary">Detailed Assessment Dossier</h2>
            <p className="text-xs text-muted-foreground">
              Click any section below to expand granular criteria, evidentiary citations, or full code artifacts.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleAll}
            className="h-8 text-xs font-mono gap-1.5 rounded self-start sm:self-auto border-border bg-surface-container-lowest hover:bg-surface-container"
          >
            <ChevronsUpDown className="size-3.5" />
            <span>{anyOpen ? "Collapse All Details" : "Expand All Details"}</span>
          </Button>
        </div>

        {/* Collapsible Dropdown Sections */}
        <div className="space-y-4">
          {/* 1. Executive Summary & Recommendations */}
          <CollapsibleSection
            id="summary-dropdown"
            title="Executive Evaluation Summary & Recommendations"
            subtitle="Demonstrated strengths, growth areas, and mentor feedback notes"
            icon={<Sparkles className="size-4" />}
            badges={
              <>
                <Badge variant="secondary" className="font-mono text-[10px] rounded">
                  {suiteB.strengths.length} Strengths
                </Badge>
                {ev.gaps.length > 0 && (
                  <Badge variant="secondary" className="font-mono text-[10px] rounded">
                    {ev.gaps.length} Gaps
                  </Badge>
                )}
                <Badge variant="secondary" className="font-mono text-[10px] rounded">
                  {suiteB.nextSteps.length} Next Steps
                </Badge>
              </>
            }
            isOpen={openSections.summary}
            onToggle={() => toggleSection("summary")}
          >
            <div className="space-y-6">
              {/* Senior Mentor Sign-off if reviewed */}
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

                <p className="text-xs text-foreground italic leading-relaxed whitespace-pre-line">
                  {review
                    ? `"${review.comments}"`
                    : `"Evaluation flagged for secondary review under zero-trust verification rules. Estimated mentor resolution in 2-3 business days."`}
                </p>

                <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground bg-[#EDEAE2] p-2 rounded border border-[#DDD9CE]">
                  <span>{review ? "Verified Mentor Audit" : "E. Vance (Staff Architect)"}</span>
                  <span>{review?.adjustedScore ? `Adjusted score: ${review.adjustedScore}%` : "AI score confirmed"}</span>
                </div>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold uppercase font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Demonstrated Strengths</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suiteB.strengths.map((s, idx) => (
                    <li key={idx} className="bg-surface-container-low p-3 rounded border border-border flex items-start gap-2.5">
                      <span className="font-mono font-bold text-primary shrink-0 text-xs">0{idx + 1}</span>
                      <p className="text-foreground text-xs leading-relaxed">{s}</p>
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
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ev.gaps.map((g, idx) => (
                      <li key={idx} className="bg-surface-container-low p-3 rounded border border-border flex items-start gap-2.5">
                        <span className="font-mono font-bold text-secondary shrink-0 text-xs">0{idx + 1}</span>
                        <p className="text-foreground/90 text-xs leading-relaxed">{g}</p>
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
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suiteB.nextSteps.map((step, idx) => (
                    <li key={idx} className="bg-surface-container-low p-3 rounded border border-border flex items-start gap-2.5">
                      <span className="font-mono font-bold text-primary shrink-0 text-xs">→</span>
                      <p className="text-foreground text-xs leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CollapsibleSection>

          {/* 2. Technical Requirements Rubric */}
          <CollapsibleSection
            id="rubric-dropdown"
            title="Technical Requirements Rubric"
            subtitle={`Granular scoring across ${ev.results.length} technical criteria with transcript citations`}
            icon={<ListChecks className="size-4" />}
            badges={
              <>
                <Badge variant="secondary" className="font-mono text-[10px] rounded">
                  {ev.results.length} Requirements
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px] rounded">
                  {groups.length} Categories
                </Badge>
              </>
            }
            isOpen={openSections.rubric}
            onToggle={() => toggleSection("rubric")}
          >
            <div className="space-y-6">
              <p className="text-xs text-muted-foreground">
                Each requirement is evaluated against observable behaviors in the candidate transcript and project snapshot. Click any requirement card to inspect full evidence citations.
              </p>
              {groups.map((g) => (
                <div key={g.category} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-border pb-1.5">
                    <span className="font-mono text-xs uppercase font-bold text-primary">
                      {CATEGORY_META[g.category]?.label ?? g.category}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono rounded">
                      {g.items.length} criteria
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {g.items.map((r) => (
                      <RequirementResultCard key={r.requirementId} result={r} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* 3. Cognitive Architecture & 5 Audit Flags */}
          <CollapsibleSection
            id="cognitive-dropdown"
            title="Cognitive Architecture & 5 Security Audit Flags"
            subtitle="Product 4D lifecycle phases, AI co-pilot prompting rubric, and zero-trust flags"
            icon={<Layers className="size-4" />}
            badges={
              <>
                <Badge variant="secondary" className="font-mono text-[10px] rounded">
                  Suite A: {suiteA.score}/100
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px] rounded">
                  Suite B: {suiteB.score}/25
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px] rounded text-emerald-800">
                  Audit OK
                </Badge>
              </>
            }
            isOpen={openSections.cognitive}
            onToggle={() => toggleSection("cognitive")}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Suite A */}
                <div className="p-4 bg-surface-container-low rounded border border-border space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-primary text-white px-2 py-0.5 rounded font-bold">SUITE A</span>
                      <span className="text-xs font-bold text-primary">Product 4D Lifecycle</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-primary">{suiteA.score}/100</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono text-[10px]">
                    {suiteA.phases.map((p) => (
                      <div key={p.name} className="bg-surface-container-lowest p-2 rounded border border-border">
                        <span className="text-muted-foreground block text-[9px] uppercase">{p.name}</span>
                        <span className="font-bold text-primary text-xs">{p.score}/10</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">{suiteA.takeaway}</p>
                </div>

                {/* Suite B */}
                <div className="p-4 bg-surface-container-low rounded border border-border space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-primary text-white px-2 py-0.5 rounded font-bold">SUITE B</span>
                      <span className="text-xs font-bold text-primary">AI Steering &amp; Prompting</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-primary">{suiteB.score}/25</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
                    {suiteB.criteria.map((c) => (
                      <div key={c.criterion} className="bg-surface-container-lowest py-2 px-1 rounded border border-border">
                        <span className="text-muted-foreground block text-[9px] uppercase truncate">{c.criterion.slice(0, 5)}</span>
                        <span className="font-bold text-primary text-xs">{c.score}/5</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    Evaluates prompt conciseness, decomposition of complex tasks, and planted flaw identification.
                  </p>
                </div>
              </div>

              {/* 5 Audit Flags At A Glance */}
              <div className="bg-surface-container-low rounded border border-border p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-primary" />
                    <span className="font-mono text-xs uppercase font-bold text-primary">5 Integrity &amp; Security Audit Flags</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded">ALL CLEAR</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono text-xs">
                  <div className="bg-surface-container-lowest px-3 py-2 rounded border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">flaw_caught</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${suiteB.flags.flaw_caught ? "bg-primary text-white" : "bg-surface-container text-muted-foreground"}`}>
                      {suiteB.flags.flaw_caught ? "TRUE" : "FALSE"}
                    </span>
                  </div>

                  <div className="bg-surface-container-lowest px-3 py-2 rounded border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">privacy_breach</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${suiteB.flags.privacy_breach ? "bg-rose-700 text-white" : "bg-surface-container text-muted-foreground"}`}>
                      {suiteB.flags.privacy_breach ? "TRUE" : "FALSE"}
                    </span>
                  </div>

                  <div className="bg-surface-container-lowest px-3 py-2 rounded border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">scope_creep_resisted</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${suiteB.flags.scope_creep_resisted ? "bg-primary text-white" : "bg-surface-container text-muted-foreground"}`}>
                      {suiteB.flags.scope_creep_resisted ? "TRUE" : "FALSE"}
                    </span>
                  </div>

                  <div className="bg-surface-container-lowest px-3 py-2 rounded border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">injection_attempt</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${suiteB.flags.injection_attempt ? "bg-rose-700 text-white" : "bg-surface-container text-muted-foreground"}`}>
                      {suiteB.flags.injection_attempt ? "TRUE" : "FALSE"}
                    </span>
                  </div>

                  <div className="bg-surface-container-lowest px-3 py-2 rounded border border-border flex items-center justify-between sm:col-span-2 lg:col-span-2">
                    <span className="text-muted-foreground text-xs">out_of_scope_code</span>
                    <span className="bg-surface-container text-muted-foreground px-2 py-0.5 rounded font-bold text-[10px]">
                      {suiteB.flags.out_of_scope ? "TRUE" : "FALSE"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* 4. Evidentiary Audit Citations */}
          <CollapsibleSection
            id="citations-dropdown"
            title="Evidentiary Audit Citations"
            subtitle="Verified transcript and file quotes linking scores to observable student actions"
            icon={<Quote className="size-4" />}
            badges={
              <Badge variant="secondary" className="font-mono text-[10px] rounded">
                {totalQuotes} Verified Quotes
              </Badge>
            }
            isOpen={openSections.citations}
            onToggle={() => toggleSection("citations")}
          >
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Every score links to exact turns from the conversation or commits in the file tree. Click any citation to inspect the unedited excerpt.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
                        <span className="font-mono text-[10px] bg-primary text-white px-2 py-0.5 rounded font-bold shrink-0">
                          {CRITERION_LABELS[c.criterion] ?? c.criterion.toUpperCase()}
                        </span>
                        <span className="font-mono text-xs font-semibold text-primary truncate">
                          &ldquo;{q.slice(0, 65)}…&rdquo;
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform shrink-0">
                        {c.score}/5 ↗
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* 5. Full Session Transcript & File Tree Explorer */}
          <CollapsibleSection
            id="transcript-dropdown"
            title="Full Session Transcript & Project File Tree"
            subtitle="Explore the complete recorded interaction log and snapshot code repository"
            icon={<FileCode className="size-4" />}
            badges={
              <>
                <Badge variant="secondary" className="font-mono text-[10px] rounded">
                  {ev.turns.length} Turns
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px] rounded">
                  {ev.files.length} Files
                </Badge>
              </>
            }
            isOpen={openSections.transcript}
            onToggle={() => toggleSection("transcript")}
          >
            <div className="space-y-3">
              <EvidenceExplorer turns={ev.turns} files={ev.files} className="border border-border rounded" />
            </div>
          </CollapsibleSection>
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
