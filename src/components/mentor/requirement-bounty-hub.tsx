"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  Bug,
  Coins,
  Briefcase,
  Layers,
  TrendingUp,
  X,
  ChevronRight,
  Star,
  ThumbsDown,
  RotateCcw,
  Check,
  ExternalLink,
  Info,
  BookOpen,
  ListChecks,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BountyRequirement, MentorBountyStats } from "@/lib/engine/requirement-bounty";

function formatWeight(weight: number): string {
  if (weight > 5) {
    return `${weight}% Rubric Allocation`;
  }
  return `${weight}/5 Priority Weight`;
}

interface RequirementBountyHubProps {
  initialMentorId?: string;
  initialMentorName?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  PROBLEM_FRAMING: { label: "Problem Framing", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  TECHNICAL_APPROACH: { label: "Technical Approach", color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
  AI_DIRECTION: { label: "AI Steering", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  CRITICAL_JUDGMENT: { label: "Critical Judgment", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  TRADEOFF_AWARENESS: { label: "Trade-off Awareness", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  DOMAIN_FIT: { label: "Domain Fit", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  COMMUNICATION: { label: "Communication", color: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
};

export function RequirementBountyHub({
  initialMentorId = "mentor_current",
  initialMentorName = "Accredited Mentor",
}: RequirementBountyHubProps) {
  const [items, setItems] = useState<BountyRequirement[]>([]);
  const [stats, setStats] = useState<MentorBountyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<BountyRequirement | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [employerFilter, setEmployerFilter] = useState("ALL");
  const [sfiaFilter, setSfiaFilter] = useState<number | "ALL">("ALL");

  // Review action modal state
  const [modalView, setModalView] = useState<"SPEC" | "BRIEF" | "RUBRIC">("SPEC");
  const [actionTab, setActionTab] = useState<"VERIFY" | "FLAG_DUPLICATE" | "FLAG_BAD">("VERIFY");
  const [mentorNotes, setMentorNotes] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState("");
  const [flagBadReason, setFlagBadReason] = useState("Unrealistic statutory / domain constraint");
  const [submitting, setSubmitting] = useState(false);
  const [celebrationToast, setCelebrationToast] = useState<{
    show: boolean;
    title: string;
    credits: number;
    badge: string;
  } | null>(null);

  // Load bounties from API
  useEffect(() => {
    async function fetchBounties() {
      try {
        setLoading(true);
        const res = await fetch("/api/mentor/bounties");
        const json = await res.json();
        if (json.success) {
          setItems(json.items || []);
          setStats(json.stats || null);
        }
      } catch (err) {
        console.error("Failed to load bounties:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBounties();
  }, []);

  // Filtered requirements
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (employerFilter !== "ALL" && item.employer !== employerFilter) return false;
      if (sfiaFilter !== "ALL" && item.sfiaLevel !== sfiaFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.statement.toLowerCase().includes(q) ||
          item.employer.toLowerCase().includes(q) ||
          item.roleTitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.injectedTrap && item.injectedTrap.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [items, categoryFilter, statusFilter, employerFilter, sfiaFilter, searchQuery]);

  // Distinct employers for dropdown
  const employers = useMemo(() => {
    const set = new Set(items.map((i) => i.employer));
    return Array.from(set).sort();
  }, [items]);

  // Submit review
  const handleReviewSubmit = async () => {
    if (!selectedReq) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/mentor/bounties/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementId: selectedReq.id,
          action: actionTab,
          notes: mentorNotes.trim() || undefined,
          duplicateOfId: actionTab === "FLAG_DUPLICATE" ? duplicateTarget.trim() : undefined,
          reason: actionTab === "FLAG_BAD" ? flagBadReason : undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        // Update local item
        setItems((prev) =>
          prev.map((i) => (i.id === json.item.id ? json.item : i))
        );
        setSelectedReq(json.item);
        if (json.updatedStats) {
          setStats(json.updatedStats);
        }

        // Trigger celebration toast
        setCelebrationToast({
          show: true,
          title:
            actionTab === "VERIFY"
              ? "Requirement Verified & Stamped!"
              : actionTab === "FLAG_DUPLICATE"
              ? "Duplicate Lodged & Triaged!"
              : "Defective Requirement Flagged!",
          credits: json.reward.credits,
          badge: json.reward.badge,
        });

        setTimeout(() => {
          setCelebrationToast(null);
        }, 4000);
      }
    } catch (err) {
      console.error("Review submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Celebration Notification Toast */}
      {celebrationToast?.show && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/90 p-4 text-emerald-100 shadow-2xl backdrop-blur-md">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Bounty Claimed! +{celebrationToast.credits} Credits
              </div>
              <div className="text-sm font-semibold">{celebrationToast.title}</div>
              <div className="text-xs text-emerald-200/80">{celebrationToast.badge}</div>
            </div>
            <button
              onClick={() => setCelebrationToast(null)}
              className="ml-2 text-emerald-300/60 hover:text-emerald-100"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mentor Bounty Dashboard Header & Reputation Stats */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary">
                <Coins className="size-3.5" />
                Community Bounty Hub
              </span>
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                SFIA 9 Quality Assurance
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-balance">
              Requirement Audit &amp; Verification Bounties
            </h2>
            <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Review AI-synthesized rubric requirements from real Australian tech job descriptions. Verify authentic domain invariants, flag duplicates, or weed out defective criteria to earn accreditation bounties.
            </p>
          </div>

          {/* Mentor Live Bounty Ledger */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:items-center">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-center min-w-[110px]">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Credits
              </div>
              <div className="font-mono text-2xl font-black text-primary">
                {stats?.totalCredits ?? 250}
              </div>
              <div className="text-[10px] text-muted-foreground">
                ${stats?.totalUsd ?? 125} AUD value
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-center min-w-[110px]">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Verified
              </div>
              <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats?.verifiedCount ?? 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Tier 1 Stamped</div>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3.5 text-center min-w-[110px]">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Duplicates
              </div>
              <div className="font-mono text-2xl font-black text-purple-600 dark:text-purple-400">
                {stats?.duplicatesFlagged ?? 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Triaged</div>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-center min-w-[110px]">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Screened
              </div>
              <div className="font-mono text-2xl font-black text-rose-600 dark:text-rose-400">
                {stats?.badFlagged ?? 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Defects Weed Out</div>
            </div>
          </div>
        </div>

        {/* Curator Ranking & Progress */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-primary" />
            <span className="font-medium text-foreground">
              Your Accreditation Level:{" "}
              <strong className="text-primary font-semibold">{stats?.curatorRank ?? "Accredited MentorME Reviewer"}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Next Rank: {stats?.nextRankThreshold ?? 800} Credits</span>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${Math.min(100, (((stats?.totalCredits ?? 250) % 500) / 500) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by requirement statement, company (e.g. Total Game, Canva), or planted trap..."
              className="pl-9 h-10 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector */}
            <div className="flex rounded-xl border border-border bg-muted/40 p-1">
              {(["ALL", "PENDING", "VERIFIED", "FLAGGED_BAD"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                    statusFilter === st
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {st === "ALL"
                    ? "All"
                    : st === "PENDING"
                    ? "Pending Audit"
                    : st === "VERIFIED"
                    ? "Verified"
                    : "Flagged"}
                </button>
              ))}
            </div>

            {/* SFIA Level Selector */}
            <select
              value={sfiaFilter}
              onChange={(e) =>
                setSfiaFilter(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value, 10))
              }
              className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="ALL">All SFIA Levels</option>
              <option value="2">SFIA Level 2 (Assist / Junior)</option>
              <option value="3">SFIA Level 3 (Apply / Mid)</option>
            </select>

            {/* Employer Selector */}
            <select
              value={employerFilter}
              onChange={(e) => setEmployerFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:outline-none max-w-[160px]"
            >
              <option value="ALL">All Employers ({employers.length})</option>
              {employers.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={cn(
              "rounded-lg px-3 py-1 font-semibold whitespace-nowrap transition-all border",
              categoryFilter === "ALL"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            All Categories ({items.length})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([catKey, catMeta]) => {
            const count = items.filter((i) => i.category === catKey).length;
            const isSelected = categoryFilter === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setCategoryFilter(catKey)}
                className={cn(
                  "rounded-lg px-3 py-1 font-medium whitespace-nowrap transition-all border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : cn(catMeta.color, "hover:opacity-90")
                )}
              >
                {catMeta.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Requirement Bounty Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>
            Showing {filteredItems.length} of {items.length} requirements available for audit
          </span>
          {employerFilter !== "ALL" && <span>Filtered by: {employerFilter}</span>}
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-48 animate-pulse rounded-2xl border border-border/50 bg-muted/20" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-dashed py-12 text-center">
            <CardContent className="space-y-2">
              <CheckCircle2 className="mx-auto size-8 text-muted-foreground" />
              <div className="font-semibold text-foreground">No matching requirements found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try loosening your search query or reset your category and status filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("ALL");
                  setStatusFilter("ALL");
                  setEmployerFilter("ALL");
                  setSfiaFilter("ALL");
                }}
                className="mt-2 text-xs"
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((req) => {
              const catMeta = CATEGORY_LABELS[req.category] || {
                label: req.category,
                color: "bg-muted text-foreground border-border",
              };

              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedReq(req)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/50 cursor-pointer bg-card",
                    req.status === "VERIFIED"
                      ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                      : req.status === "FLAGGED_DUPLICATE"
                      ? "border-purple-500/30 bg-purple-500/[0.02]"
                      : req.status === "FLAGGED_BAD"
                      ? "border-rose-500/30 bg-rose-500/[0.02]"
                      : "border-border/80"
                  )}
                >
                  <div className="space-y-3">
                    {/* Top Row: Employer & Bounty Reward Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Briefcase className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-semibold text-xs text-foreground/90">
                          {req.employer}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary shrink-0">
                        <Coins className="size-3" />
                        +{req.bountyCredits} pts (${req.bountyUsd})
                      </span>
                    </div>

                    {/* Category & SFIA Level */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", catMeta.color)}>
                        {catMeta.label}
                      </span>
                      <span className="rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        SFIA L{req.sfiaLevel}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        {req.weight > 5 ? (
                          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            {req.weight}% Weight
                          </span>
                        ) : (
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: Math.min(5, req.weight) }).map((_, w) => (
                              <Star key={w} className="size-3 fill-amber-500 text-amber-500" />
                            ))}
                            <span className="text-[10px] text-muted-foreground ml-1">{req.weight}/5</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Statement */}
                    <p className="text-xs sm:text-[13px] leading-relaxed text-foreground font-medium line-clamp-3 group-hover:text-primary transition-colors">
                      {req.statement}
                    </p>

                    {/* Injected Trap Indicator */}
                    {req.injectedTrap && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                        <Bug className="size-3.5 shrink-0" />
                        <span className="truncate font-mono">
                          Trap: {req.injectedTrap.split("(")[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Status & Action */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
                    <div>
                      {req.status === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="size-3.5" />
                          Verified
                        </span>
                      ) : req.status === "FLAGGED_DUPLICATE" ? (
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold text-[11px]">
                          <Copy className="size-3.5" />
                          Duplicate
                        </span>
                      ) : req.status === "FLAGGED_BAD" ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                          <AlertTriangle className="size-3.5" />
                          Defective
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">
                          Needs Audit
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 font-semibold text-primary text-[11px] group-hover:translate-x-0.5 transition-transform">
                      <span>Inspect</span>
                      <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DETAILED REQUIREMENT AUDIT & BOUNTY CLAIM MODAL                          */}
      {/* ========================================================================= */}
      {selectedReq && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl transition-all sm:p-8 my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 shrink-0">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary uppercase">
                    {selectedReq.employer} · {selectedReq.roleTitle}
                  </span>
                  <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    ID: {selectedReq.requirementId.slice(0, 10)}
                  </span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                    +{selectedReq.bountyCredits} Credits (${selectedReq.bountyUsd} AUD)
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {selectedReq.challengeTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="grid size-8 place-items-center rounded-full border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Navigation Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-border/60 py-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalView("SPEC")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  modalView === "SPEC"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <ListChecks className="size-3.5" />
                <span>Observable Specification</span>
              </button>

              <button
                type="button"
                onClick={() => setModalView("BRIEF")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  modalView === "BRIEF"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <BookOpen className="size-3.5" />
                <span>Challenge Brief &amp; Invariants</span>
              </button>

              <button
                type="button"
                onClick={() => setModalView("RUBRIC")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  modalView === "RUBRIC"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Layers className="size-3.5" />
                <span>All Challenge Criteria ({selectedReq.allChallengeRequirements?.length || 1})</span>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="py-4 space-y-5 overflow-y-auto flex-1 pr-1">
              {modalView === "SPEC" && (
                <div className="space-y-4">
                  {/* Statement Banner */}
                  <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Observable Requirement Statement
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                        <Star className="size-3.5 fill-amber-500" />
                        <span className="font-bold">{formatWeight(selectedReq.weight)}</span>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                      &ldquo;{selectedReq.statement}&rdquo;
                    </p>
                  </div>

                  {/* Injected Trap Details */}
                  {selectedReq.injectedTrap && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                        <Bug className="size-4" />
                        <span>Injected AI Trap (Zero-Trust Vigilance Test)</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-xs">
                        {selectedReq.injectedTrap}
                      </p>
                    </div>
                  )}

                  {/* Observable Signals & Failure Modes */}
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-4" />
                        <span>Observable Success Signals</span>
                      </div>
                      <ul className="space-y-1.5 text-muted-foreground">
                        {selectedReq.successSignals.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="mt-1 size-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="size-4" />
                        <span>Observable Failure Modes</span>
                      </div>
                      <ul className="space-y-1.5 text-muted-foreground">
                        {selectedReq.failureModes.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="mt-1 size-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Current Verification Status */}
                  {selectedReq.verifiedBy && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-semibold text-emerald-950 dark:text-emerald-200">
                            Verified by {selectedReq.verifiedBy.mentorName} on {new Date(selectedReq.verifiedBy.verifiedAt).toLocaleDateString()}
                          </div>
                          {selectedReq.verifiedBy.notes && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              &ldquo;{selectedReq.verifiedBy.notes}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] bg-emerald-500/20 px-2.5 py-1 rounded-md font-bold text-emerald-700 dark:text-emerald-300 shrink-0 self-start sm:self-auto">
                        TIER 1 ACCREDITED
                      </span>
                    </div>
                  )}
                </div>
              )}

              {modalView === "BRIEF" && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-primary" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        Challenge Brief &amp; Problem Framing
                      </span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedReq.briefMarkdown || "No markdown brief provided for this challenge."}
                    </div>
                  </div>

                  {/* Technical Invariants */}
                  {selectedReq.technicalInvariants && selectedReq.technicalInvariants.length > 0 && (
                    <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
                      <div className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="size-4 text-indigo-500" />
                        <span>Statutory &amp; Technical Invariants</span>
                      </div>
                      <ul className="space-y-1.5 text-muted-foreground">
                        {selectedReq.technicalInvariants.map((inv, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 font-mono text-[11px]">
                            <span className="mt-1 size-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span>{inv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {modalView === "RUBRIC" && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">
                      Full rubric specifications ({selectedReq.allChallengeRequirements?.length || 1} criteria) for this challenge. Click any criterion to audit it:
                    </p>
                  </div>
                  <div className="space-y-2">
                    {selectedReq.allChallengeRequirements?.map((cr, idx) => {
                      const isCurrent = cr.id === selectedReq.id || cr.id === selectedReq.requirementId;
                      return (
                        <div
                          key={cr.id || idx}
                          onClick={() => {
                            const sibling = items.find((i) => i.id === cr.id || i.requirementId === cr.id);
                            if (sibling) {
                              setSelectedReq(sibling);
                              setModalView("SPEC");
                            }
                          }}
                          className={cn(
                            "rounded-xl border p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer",
                            isCurrent
                              ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                              : "border-border/70 bg-card hover:border-primary/50 hover:bg-muted/30"
                          )}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-muted-foreground">
                                Criterion {idx + 1}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-semibold py-0">
                                {cr.category}
                              </Badge>
                              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                {formatWeight(cr.weight)}
                              </span>
                              {isCurrent && (
                                <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] py-0">
                                  Currently Inspecting
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-medium text-foreground">
                              {cr.statement}
                            </p>
                          </div>
                          {!isCurrent && (
                            <span className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 shrink-0">
                              <span>Audit</span>
                              <ChevronRight className="size-3.5" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Mentor Action Decision Tabs */}
            <div className="border-t border-border/60 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Lodge Mentor Audit Decision
                </span>
                <span className="font-mono text-xs font-bold text-primary">
                  Bounty Reward: +{selectedReq.bountyCredits} Credits
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActionTab("VERIFY")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all",
                    actionTab === "VERIFY"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500"
                      : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <ShieldCheck className="size-5 mb-1 text-emerald-600" />
                  <span>Verify &amp; Stamp</span>
                  <span className="text-[10px] opacity-75">+{selectedReq.bountyCredits} pts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionTab("FLAG_DUPLICATE")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all",
                    actionTab === "FLAG_DUPLICATE"
                      ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-xs ring-1 ring-purple-500"
                      : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Copy className="size-5 mb-1 text-purple-600" />
                  <span>Lodge Duplicate</span>
                  <span className="text-[10px] opacity-75">+25 pts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionTab("FLAG_BAD")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all",
                    actionTab === "FLAG_BAD"
                      ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-xs ring-1 ring-rose-500"
                      : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <ThumbsDown className="size-5 mb-1 text-rose-600" />
                  <span>Flag Defect</span>
                  <span className="text-[10px] opacity-75">+35 pts</span>
                </button>
              </div>

              {/* Action Form Inputs */}
              {actionTab === "VERIFY" && (
                <div className="space-y-2 text-xs">
                  <label className="font-medium text-foreground">
                    Optional Mentor Validation Note (Visible to Studios):
                  </label>
                  <Input
                    value={mentorNotes}
                    onChange={(e) => setMentorNotes(e.target.value)}
                    placeholder="e.g. Verified for Melbourne indie simulation standards; observable in transcript."
                    className="text-xs h-9 rounded-xl"
                  />
                </div>
              )}

              {actionTab === "FLAG_DUPLICATE" && (
                <div className="space-y-2 text-xs">
                  <label className="font-medium text-foreground">
                    Reference Duplicate Requirement ID or Standard:
                  </label>
                  <Input
                    value={duplicateTarget}
                    onChange={(e) => setDuplicateTarget(e.target.value)}
                    placeholder="e.g. Duplicate of req-spatial-grid-01 or general boundary check"
                    className="text-xs h-9 rounded-xl"
                  />
                </div>
              )}

              {actionTab === "FLAG_BAD" && (
                <div className="space-y-2 text-xs">
                  <label className="font-medium text-foreground">Reason for Flagging:</label>
                  <select
                    value={flagBadReason}
                    onChange={(e) => setFlagBadReason(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
                  >
                    <option value="Unrealistic statutory / domain constraint">
                      Unrealistic statutory / domain constraint
                    </option>
                    <option value="Too vague / unobservable in chat transcript and code">
                      Too vague / unobservable in chat transcript and code
                    </option>
                    <option value="Contains hidden bias or demographic barrier proxy">
                      Contains hidden bias or demographic barrier proxy
                    </option>
                    <option value="Trivial boilerplate / low assessment signal">
                      Trivial boilerplate / low assessment signal
                    </option>
                  </select>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReq(null)}
                  disabled={submitting}
                  className="rounded-xl text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReviewSubmit}
                  disabled={submitting}
                  className={cn(
                    "rounded-xl text-xs h-9 font-semibold text-white",
                    actionTab === "VERIFY"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : actionTab === "FLAG_DUPLICATE"
                      ? "bg-purple-600 hover:bg-purple-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  )}
                >
                  {submitting ? (
                    "Recording..."
                  ) : actionTab === "VERIFY" ? (
                    `Verify & Stamp (+${selectedReq.bountyCredits} Credits)`
                  ) : actionTab === "FLAG_DUPLICATE" ? (
                    "Lodge Duplicate (+25 Credits)"
                  ) : (
                    "Flag Defect (+35 Credits)"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
