"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Scale,
  EyeOff,
  CircleCheckBig,
  ArrowRight,
  ShieldAlert,
  Clock,
  Briefcase,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReasonChip } from "@/components/mentor/reason-chips";
import { RequirementBountyHub } from "@/components/mentor/requirement-bounty-hub";
import { ChallengeAccreditationCard } from "@/components/mentor/challenge-accreditation-card";
import type { QueueItemView } from "@/lib/data/types";
import { scoreBand, shortId, timeAgo, TONE_TEXT } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MentorConsoleTabsProps {
  user: { id: string; name: string; email: string };
  queue: QueueItemView[];
  reviewed: number;
}

function ScoreSummary({ item }: { item: QueueItemView }) {
  if (item.coverage === 0) {
    return (
      <div className="text-right">
        <div className="text-lg font-semibold text-muted-foreground">Not scored</div>
        <div className="text-xs text-muted-foreground">Needs human score</div>
      </div>
    );
  }
  const band = scoreBand(item.overallScore);
  return (
    <div className="text-right">
      <div className={cn("tabular text-2xl font-bold tracking-tight", TONE_TEXT[band.tone])}>
        {Math.round(item.overallScore)}%
      </div>
      <div className="text-[11px] text-muted-foreground font-mono">
        {Math.round(item.coverage * 100)}% scored · conf {item.confidence.toFixed(2)}
      </div>
    </div>
  );
}

export function MentorConsoleTabs({ user, queue, reviewed }: MentorConsoleTabsProps) {
  const [activeTab, setActiveTab] = useState<"VERIFY_REQUIREMENTS" | "RE_EVALUATE_AI">(
    "VERIFY_REQUIREMENTS"
  );

  return (
    <div className="space-y-8">
      {/* Top Console Navigation Tabs */}
      <div className="rounded-2xl border border-border/80 bg-card p-2 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Tab 1: Verify Requirements */}
          <button
            type="button"
            onClick={() => setActiveTab("VERIFY_REQUIREMENTS")}
            className={cn(
              "flex items-start gap-3 rounded-xl p-3.5 text-left transition-all",
              activeTab === "VERIFY_REQUIREMENTS"
                ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/40"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg border",
                activeTab === "VERIFY_REQUIREMENTS"
                  ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                  : "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-85">
                Task 1: Rubric Audit
              </div>
              <div className="text-sm font-semibold">Verify Requirements &amp; Bounties</div>
              <div
                className={cn(
                  "text-[11px] mt-0.5 line-clamp-1",
                  activeTab === "VERIFY_REQUIREMENTS" ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                Check domain invariants, weed out biased criteria, earn credit bounties.
              </div>
            </div>
          </button>

          {/* Tab 2: Re-evaluate AI Assessments */}
          <button
            type="button"
            onClick={() => setActiveTab("RE_EVALUATE_AI")}
            className={cn(
              "flex items-start gap-3 rounded-xl p-3.5 text-left transition-all",
              activeTab === "RE_EVALUATE_AI"
                ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/40"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg border",
                activeTab === "RE_EVALUATE_AI"
                  ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                  : "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              <Scale className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider opacity-85">
                  Task 2: AI Adjudication
                </span>
                {queue.length > 0 && (
                  <span
                    className={cn(
                      "font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      activeTab === "RE_EVALUATE_AI"
                        ? "bg-primary-foreground text-primary"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {queue.length} Pending
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold">Re-evaluate AI Assessments</div>
              <div
                className={cn(
                  "text-[11px] mt-0.5 line-clamp-1",
                  activeTab === "RE_EVALUATE_AI" ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                Inspect student code &amp; AI chat, re-score criteria, and add justifications.
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VERIFY REQUIREMENTS & BOUNTIES                                     */}
      {/* ========================================================================= */}
      {activeTab === "VERIFY_REQUIREMENTS" && (
        <div className="space-y-10 animate-in fade-in duration-200">
          <section className="space-y-4">
            <RequirementBountyHub initialMentorId={user.id} initialMentorName={user.name} />
          </section>

          {/* Studio Challenge Accreditation Section */}
          <section className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Studio Challenge Accreditation
                </h2>
                <p className="text-xs text-muted-foreground">
                  5-Point quality gate promoting full challenges (e.g. Total Game Development) to Tier 1 Mentor Verified status.
                </p>
              </div>
            </div>
            <ChallengeAccreditationCard />
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RE-EVALUATE AI ASSESSMENTS & RE-SCORE                              */}
      {/* ========================================================================= */}
      {activeTab === "RE_EVALUATE_AI" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Re-evaluation Guidance Banner */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-card to-card p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Scale className="size-3.5" />
                Human-in-the-Loop Re-scoring
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <EyeOff className="size-3.5" />
                Candidate Identity Masked
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Candidate Submissions Queue &amp; AI Re-scoring
            </h2>
            <p className="max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              When AI evaluation confidence is low, when tests indicate possible manipulation, or when a candidate contests their score, submissions are routed here for senior mentor adjudication. You inspect candidate code diffs, verify AI chat steering, and <strong>override scores section-by-section with professional justification</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono text-muted-foreground border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                <span>2–3 Day SLA Target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileCheck className="size-3.5 text-emerald-600" />
                <span>{reviewed} evaluations finalized</span>
              </div>
            </div>
          </div>

          {/* Submissions Queue Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-2">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Submissions Awaiting Re-evaluation
              </h3>
              <span className="text-xs text-muted-foreground font-mono">{queue.length} in queue</span>
            </div>

            {queue.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <CircleCheckBig className="size-9 text-emerald-600" aria-hidden />
                  <div className="space-y-1">
                    <h4 className="font-semibold text-foreground">The re-evaluation queue is clear!</h4>
                    <p className="max-w-md text-xs text-muted-foreground">
                      No candidate submissions are currently pending human adjudication. You can inspect sample evaluations or audit rubric requirements.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/mentor/seed-session-1"
                      className={cn(buttonVariants({ variant: "outline" }), "text-xs gap-1.5 rounded-xl")}
                    >
                      <span>Re-evaluate Sample Submission (Seed Session)</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {queue.map((item) => (
                  <Card key={item.id} className="transition-all hover:border-primary/50 hover:shadow-sm">
                    <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                      <div className="min-w-0 space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">
                            #{shortId(item.id)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            submitted {timeAgo(item.createdAt)}
                          </span>
                          {item.contested && (
                            <Badge variant="destructive" className="font-mono text-[10px] rounded">
                              Contested by Candidate
                            </Badge>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-base text-foreground leading-snug">
                            {item.challengeTitle}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Briefcase className="size-3 shrink-0" />
                            <span>{item.roleTitle}</span>
                          </p>
                        </div>

                        {item.escalation.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.escalation.map((reason, idx) => (
                              <ReasonChip key={idx} reason={reason} />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                        <ScoreSummary item={item} />
                        <Link
                          href={`/mentor/${item.id}`}
                          className={cn(
                            buttonVariants({ variant: "default" }),
                            "text-xs gap-1.5 rounded-xl font-semibold shadow-xs"
                          )}
                        >
                          <span>Re-evaluate Assessment</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
