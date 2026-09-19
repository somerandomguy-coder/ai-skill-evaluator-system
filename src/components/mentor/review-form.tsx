"use client";

import { CircleCheckBig, LoaderCircle, Sliders, Hash, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Verdict = "CONFIRM" | "OVERRIDE";

export interface ReviewCategory {
  category: string;
  label: string;
  weight: number;
  score: number;
  items: {
    id: string;
    statement: string;
    weight: number;
    score: number;
  }[];
}

interface ReviewFormProps {
  evaluationId: string;
  aiScore: number;
  hasAiScores: boolean;
  reviewedBefore: boolean;
  categories?: ReviewCategory[];
}

/** The mentor's decision: confirm the AI's score, or override it by section or overall score. */
export function ReviewForm({
  evaluationId,
  aiScore,
  hasAiScores,
  reviewedBefore,
  categories = [],
}: ReviewFormProps) {
  const router = useRouter();
  const [verdict, setVerdict] = useState<Verdict>(hasAiScores ? "CONFIRM" : "OVERRIDE");
  const [scoringMode, setScoringMode] = useState<"sections" | "overall">(categories.length > 0 ? "sections" : "overall");

  // Per-category scores map (category -> score 0-100)
  const [categoryScores, setCategoryScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const c of categories) {
      map[c.category] = c.score;
    }
    return map;
  });

  // Calculate weighted overall score from category scores
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

  // Update overall score when section scores change
  useEffect(() => {
    if (scoringMode === "sections") {
      setScore(String(calculatedSectionScore));
    }
  }, [scoringMode, calculatedSectionScore]);

  const scoreNum = scoringMode === "sections" ? calculatedSectionScore : Number(score);
  const scoreOk = Number.isFinite(scoreNum) && scoreNum >= 0 && scoreNum <= 100;
  const valid = comments.trim().length >= 10 && (verdict === "CONFIRM" || scoreOk);

  function handleCategoryScoreChange(cat: string, val: number) {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    setCategoryScores((prev) => ({ ...prev, [cat]: clamped }));
  }

  function handleAutoFillBreakdown() {
    const lines = categories.map((c) => {
      const s = categoryScores[c.category] ?? c.score;
      return `• ${c.label}: ${s}%`;
    });
    const prefix = `Assessed by section:\n${lines.join("\n")}\n\nMentor notes: `;
    if (!comments.includes("Assessed by section:")) {
      setComments(prefix + comments);
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
                  Review the evidence and adjust by individual section or overall score.
                </span>
              </span>
            </label>
          </RadioGroup>

          {verdict === "OVERRIDE" && (
            <div className="space-y-4 pt-1">
              {categories.length > 0 && (
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <span className="text-xs font-mono text-muted-foreground uppercase">Scoring method:</span>
                  <div className="flex gap-1.5">
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
                      <span>By Section ({categories.length})</span>
                    </button>
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
              )}

              {scoringMode === "sections" && categories.length > 0 ? (
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
                        <div key={cat.category} className="space-y-1.5 rounded border border-border bg-surface-container-lowest p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground truncate max-w-[180px]">
                              {cat.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground">wt: {cat.weight}</span>
                              <div className="flex items-center gap-1 font-mono text-xs">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={currentVal}
                                  onChange={(e) => handleCategoryScoreChange(cat.category, Number(e.target.value))}
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
                            onChange={(e) => handleCategoryScoreChange(cat.category, Number(e.target.value))}
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
              ) : (
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
              placeholder="Explain your decision and which sections you adjusted. Judge the reasoning, not the phrasing."
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
