"use client";

import {
  CircleCheckBig,
  LoaderCircle,
  Sliders,
  Hash,
  Sparkles,
  ListChecks,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/lib/client/api";
import type { SuiteBView } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type Verdict = "CONFIRM" | "OVERRIDE";

export interface ReviewRequirementItem {
  id: string;
  statement: string;
  weight: number;
  score: number; // 0 to 5
  aiScore?: number | null;
}

export interface ReviewCategory {
  category: string;
  label: string;
  weight: number;
  score: number;
  items: ReviewRequirementItem[];
}

interface ReviewFormProps {
  evaluationId: string;
  aiScore: number;
  hasAiScores: boolean;
  reviewedBefore: boolean;
  categories?: ReviewCategory[];
  suiteB?: SuiteBView | null;
}

/** The mentor's decision: confirm the AI's score, or override it by requirement, section, or overall score. */
export function ReviewForm({
  evaluationId,
  aiScore,
  hasAiScores,
  reviewedBefore,
  categories = [],
  suiteB,
}: ReviewFormProps) {
  const router = useRouter();
  const [verdict, setVerdict] = useState<Verdict>(hasAiScores ? "CONFIRM" : "OVERRIDE");
  
  // Default to individual requirement scoring if items are present
  const hasItems = categories.some((c) => c.items && c.items.length > 0);
  const [scoringMode, setScoringMode] = useState<"requirements" | "sections" | "overall">(
    hasItems ? "requirements" : categories.length > 0 ? "sections" : "overall"
  );

  // Per-requirement scores map (reqId -> score 0..5)
  const [reqScores, setReqScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const c of categories) {
      for (const item of c.items) {
        map[item.id] = Math.max(0, Math.min(5, item.score));
      }
    }
    return map;
  });

  // Per-category percentage scores map (category -> 0..100)
  const [categoryScores, setCategoryScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const c of categories) {
      map[c.category] = c.score;
    }
    return map;
  });

  // Calculate weighted overall score from individual requirement scores (0 to 5)
  const calculatedRequirementScore = (() => {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const c of categories) {
      for (const item of c.items) {
        const s = reqScores[item.id] ?? item.score;
        const w = item.weight || 1;
        totalWeight += w;
        weightedSum += w * (s / 5);
      }
    }
    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 1000) / 10 : Math.round(aiScore);
  })();

  // Calculate weighted overall score from category section scores (0 to 100%)
  const calculatedSectionScore = (() => {
    if (categories.length === 0) return Math.round(aiScore);
    let totalWeight = 0;
    let weightedSum = 0;
    for (const c of categories) {
      const score = categoryScores[c.category] ?? c.score;
      const weight = c.weight || 1;
      totalWeight += weight;
      weightedSum += score * weight;
    }
    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : Math.round(aiScore);
  })();

  const [score, setScore] = useState(hasAiScores ? String(Math.round(aiScore)) : "75");
  const [comments, setComments] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  // Sync overall score when in requirements or sections mode
  useEffect(() => {
    if (scoringMode === "requirements") {
      setScore(String(calculatedRequirementScore));
    } else if (scoringMode === "sections") {
      setScore(String(calculatedSectionScore));
    }
  }, [scoringMode, calculatedRequirementScore, calculatedSectionScore]);

  const scoreNum =
    scoringMode === "requirements"
      ? calculatedRequirementScore
      : scoringMode === "sections"
        ? calculatedSectionScore
        : Number(score);

  const scoreOk = Number.isFinite(scoreNum) && scoreNum >= 0 && scoreNum <= 100;
  const valid = comments.trim().length >= 10 && (verdict === "CONFIRM" || scoreOk);

  function handleReqScoreChange(reqId: string, val: number) {
    const clamped = Math.max(0, Math.min(5, val));
    setReqScores((prev) => ({ ...prev, [reqId]: clamped }));
  }

  function handleResetToAiScores() {
    const map: Record<string, number> = {};
    for (const c of categories) {
      for (const item of c.items) {
        map[item.id] = item.aiScore !== null && item.aiScore !== undefined ? item.aiScore : item.score;
      }
    }
    setReqScores(map);
  }

  function handleCategoryScoreChange(cat: string, val: number) {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    setCategoryScores((prev) => ({ ...prev, [cat]: clamped }));
  }

  function handleAutoFillBreakdown() {
    if (scoringMode === "requirements") {
      const lines: string[] = [];
      lines.push("Assessed by individual requirements:");
      for (const c of categories) {
        for (const item of c.items) {
          const current = reqScores[item.id] ?? item.score;
          const wasAi =
            item.aiScore !== null && item.aiScore !== undefined ? `${item.aiScore}/5` : "unscored";
          const changed = item.aiScore !== null && item.aiScore !== undefined && current !== item.aiScore;
          const note = changed ? ` (adjusted from AI ${wasAi})` : "";
          const shortStatement =
            item.statement.length > 60 ? `${item.statement.slice(0, 58)}...` : item.statement;
          lines.push(`• [${c.label}] ${shortStatement}: ${current}/5${note}`);
        }
      }
      lines.push(`\nRecalculated overall score: ${calculatedRequirementScore}%`);
      const prefix = `${lines.join("\n")}\n\nMentor notes: `;
      if (!comments.includes("Assessed by individual requirements:")) {
        setComments(prefix + comments);
      }
    } else {
      const lines = categories.map((c) => {
        const s = categoryScores[c.category] ?? c.score;
        return `• ${c.label}: ${s}%`;
      });
      const prefix = `Assessed by section:\n${lines.join("\n")}\n\nMentor notes: `;
      if (!comments.includes("Assessed by section:")) {
        setComments(prefix + comments);
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || pending || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await submitReview(evaluationId, {
        verdict,
        comments,
        adjustedScore: verdict === "OVERRIDE" ? scoreNum : null,
      });
      router.push("/mentor");
      router.refresh();
    } catch (err) {
      isSubmittingRef.current = false;
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  const option = (value: Verdict, disabled: boolean) =>
    cn(
      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
      verdict === value ? "border-primary bg-accent/50" : "hover:bg-muted/50",
      disabled && "cursor-not-allowed opacity-50"
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your decision</CardTitle>
        <CardDescription>
          {reviewedBefore
            ? "A mentor has already reviewed this. A new review replaces it."
            : "The candidate sees your note next to their score."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <RadioGroup value={verdict} onValueChange={(v) => setVerdict(v as Verdict)}>
            <label className={option("CONFIRM", !hasAiScores)}>
              <RadioGroupItem value="CONFIRM" disabled={!hasAiScores} className="mt-0.5" />
              <span className="space-y-0.5 text-sm">
                <span className="block font-medium">
                  Confirm the AI&apos;s score{hasAiScores ? ` (${Math.round(aiScore)}%)` : ""}
                </span>
                <span className="block text-muted-foreground text-xs">
                  {hasAiScores ? "The evidence supports it." : "There are no AI scores to confirm."}
                </span>
              </span>
            </label>
            <label className={option("OVERRIDE", false)}>
              <RadioGroupItem value="OVERRIDE" className="mt-0.5" />
              <span className="space-y-0.5 text-sm">
                <span className="block font-medium">Override with my own score</span>
                <span className="block text-muted-foreground text-xs">
                  Review the evidence and adjust individual requirement scores or overall score.
                </span>
              </span>
            </label>
          </RadioGroup>

          {verdict === "OVERRIDE" && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="text-[11px] font-mono text-muted-foreground uppercase">Mode:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {hasItems && (
                    <button
                      type="button"
                      onClick={() => setScoringMode("requirements")}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors border",
                        scoringMode === "requirements"
                          ? "bg-primary text-white border-primary font-semibold"
                          : "bg-surface-container-low text-foreground/80 border-border hover:bg-surface-container"
                      )}
                    >
                      <ListChecks className="size-3" />
                      <span>By Requirement</span>
                    </button>
                  )}
                  {categories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScoringMode("sections")}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors border",
                        scoringMode === "sections"
                          ? "bg-primary text-white border-primary font-semibold"
                          : "bg-surface-container-low text-foreground/80 border-border hover:bg-surface-container"
                      )}
                    >
                      <Sliders className="size-3" />
                      <span>By Section</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setScoringMode("overall")}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors border",
                      scoringMode === "overall"
                        ? "bg-primary text-white border-primary font-semibold"
                        : "bg-surface-container-low text-foreground/80 border-border hover:bg-surface-container"
                    )}
                  >
                    <Hash className="size-3" />
                    <span>Single Overall</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: Individual Requirement Scoring (0 to 5 buttons) */}
              {scoringMode === "requirements" && hasItems && (
                <div className="space-y-3 rounded-lg border border-border bg-surface-container-low p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-primary font-mono uppercase block">
                        Individual Requirements (0–5)
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Adjust actual scores. Weighted overall calculates automatically.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetToAiScores}
                        title="Reset all requirement scores to AI defaults"
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        <span>Reset</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoFillBreakdown}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-mono cursor-pointer font-medium"
                      >
                        <Sparkles className="size-3 text-amber-500" />
                        <span>Insert into note</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
                    {categories.map((cat) => (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground font-semibold px-1 pt-1 border-t border-border/50">
                          <span>{cat.label}</span>
                          <span>Category Weight: {cat.weight}%</span>
                        </div>
                        {cat.items.map((item) => {
                          const currentVal = reqScores[item.id] ?? item.score;
                          const wasAi =
                            item.aiScore !== null && item.aiScore !== undefined
                              ? item.aiScore
                              : null;
                          const isModified = wasAi !== null && currentVal !== wasAi;

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "rounded border p-2.5 space-y-2 transition-colors",
                                isModified
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-border bg-surface-container-lowest"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs text-foreground font-medium line-clamp-2">
                                  {item.statement}
                                </p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="outline" className="text-[10px] font-mono rounded">
                                    wt: {item.weight}%
                                  </Badge>
                                  {wasAi !== null ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-mono rounded bg-surface-container"
                                    >
                                      AI: {wasAi}/5
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-mono text-amber-600 border-amber-300 rounded"
                                    >
                                      AI: Unscored
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  Score:
                                </span>
                                <div className="flex items-center gap-1">
                                  {[0, 1, 2, 3, 4, 5].map((val) => {
                                    const active = currentVal === val;
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => handleReqScoreChange(item.id, val)}
                                        className={cn(
                                          "w-7 h-7 rounded text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center border",
                                          active
                                            ? "bg-primary text-white border-primary shadow-sm scale-105"
                                            : "bg-surface-container-low text-foreground border-border hover:bg-surface-container hover:border-border/80"
                                        )}
                                      >
                                        {val}
                                      </button>
                                    );
                                  })}
                                  <span className="text-xs font-mono font-bold text-primary ml-1.5">
                                    {currentVal}/5
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Calculated summary banner */}
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between font-mono text-xs">
                    <span className="text-muted-foreground">Weighted Overall Score:</span>
                    <div className="flex items-center gap-2">
                      {hasAiScores && (
                        <span className="text-[11px] text-muted-foreground">
                          ({calculatedRequirementScore >= aiScore ? "+" : ""}
                          {(calculatedRequirementScore - aiScore).toFixed(1)}% vs AI)
                        </span>
                      )}
                      <span className="font-bold text-sm text-primary">
                        {calculatedRequirementScore}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: Category Section Sliders */}
              {scoringMode === "sections" && categories.length > 0 && (
                <div className="space-y-3 rounded-lg border border-border bg-surface-container-low p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary font-mono uppercase">
                      Section-by-Section Scoring
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoFillBreakdown}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <Sparkles className="size-3 text-amber-500" />
                      <span>Insert into note</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {categories.map((cat) => {
                      const currentVal = categoryScores[cat.category] ?? cat.score;
                      return (
                        <div
                          key={cat.category}
                          className="space-y-1.5 rounded border border-border bg-surface-container-lowest p-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground truncate max-w-[180px]">
                              {cat.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                weight: {cat.weight}%
                              </span>
                              <div className="flex items-center gap-1 font-mono text-xs">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={currentVal}
                                  onChange={(e) =>
                                    handleCategoryScoreChange(cat.category, Number(e.target.value))
                                  }
                                  className="w-12 h-6 text-right px-1 border border-border rounded font-bold text-primary bg-surface-container-lowest tabular"
                                />
                                <span className="text-muted-foreground text-xs">%</span>
                              </div>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={currentVal}
                            onChange={(e) =>
                              handleCategoryScoreChange(cat.category, Number(e.target.value))
                            }
                            className="w-full accent-primary h-1.5 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Calculated summary banner */}
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between font-mono text-xs">
                    <span className="text-muted-foreground">Weighted Overall:</span>
                    <span className="font-bold text-sm text-primary">{calculatedSectionScore}%</span>
                  </div>
                </div>
              )}

              {/* MODE 3: Single Overall Input */}
              {scoringMode === "overall" && (
                <div className="space-y-1.5">
                  <Label htmlFor="adjusted">Overall score (0 to 100)</Label>
                  <Input
                    id="adjusted"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    inputMode="decimal"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder={hasAiScores ? `AI said ${Math.round(aiScore)}` : "e.g. 55"}
                    className="tabular"
                  />
                  {score.trim() !== "" && !scoreOk && (
                    <p className="text-xs text-destructive">Enter a number between 0 and 100.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="comments">Your note</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Explain your decision and which requirements or sections you adjusted. Judge the reasoning, not the phrasing."
              className="min-h-28 text-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {comments.trim().length > 0 && comments.trim().length < 10
                  ? "At least 10 characters required."
                  : "Written for the candidate."}
              </span>
              <span className="tabular">{comments.length}</span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full gap-2" size="lg" disabled={!valid || pending}>
            {pending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                <span>Submitting review...</span>
              </>
            ) : (
              <>
                <CircleCheckBig className="size-4" aria-hidden />
                <span>Submit review</span>
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
