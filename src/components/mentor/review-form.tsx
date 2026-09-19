"use client";

import { CircleCheckBig, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type Verdict = "CONFIRM" | "OVERRIDE";

/** The mentor's decision: confirm the AI's score, or override it, with a note the candidate will see. */
export function ReviewForm({ evaluationId, aiScore, hasAiScores, reviewedBefore }: { evaluationId: string; aiScore: number; hasAiScores: boolean; reviewedBefore: boolean }) {
  const router = useRouter();
  const [verdict, setVerdict] = useState<Verdict>(hasAiScores ? "CONFIRM" : "OVERRIDE");
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scoreNum = Number(score);
  const scoreOk = score.trim() !== "" && Number.isFinite(scoreNum) && scoreNum >= 0 && scoreNum <= 100;
  const valid = comments.trim().length >= 10 && (verdict === "CONFIRM" || scoreOk);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError(null);
    try {
      await submitReview(evaluationId, { verdict, comments, adjustedScore: verdict === "OVERRIDE" ? scoreNum : null });
      router.push("/mentor");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  const option = (value: Verdict, disabled: boolean) =>
    cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors", verdict === value ? "border-primary bg-accent/50" : "hover:bg-muted/50", disabled && "cursor-not-allowed opacity-50");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your decision</CardTitle>
        <CardDescription>
          {reviewedBefore ? "A mentor has already reviewed this. A new review replaces it." : "The candidate sees your note next to their score."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <RadioGroup value={verdict} onValueChange={(v) => setVerdict(v as Verdict)}>
            <label className={option("CONFIRM", !hasAiScores)}>
              <RadioGroupItem value="CONFIRM" disabled={!hasAiScores} className="mt-0.5" />
              <span className="space-y-0.5 text-sm">
                <span className="block font-medium">Confirm the AI&apos;s score{hasAiScores ? ` (${Math.round(aiScore)}%)` : ""}</span>
                <span className="block text-muted-foreground">{hasAiScores ? "The evidence supports it." : "There are no AI scores to confirm."}</span>
              </span>
            </label>
            <label className={option("OVERRIDE", false)}>
              <RadioGroupItem value="OVERRIDE" className="mt-0.5" />
              <span className="space-y-0.5 text-sm">
                <span className="block font-medium">Override with my own score</span>
                <span className="block text-muted-foreground">You&apos;ve reviewed the evidence and disagree, or it needs scoring by hand.</span>
              </span>
            </label>
          </RadioGroup>

          {verdict === "OVERRIDE" && (
            <div className="space-y-1.5">
              <Label htmlFor="adjusted">Overall score (0 to 100)</Label>
              <Input id="adjusted" type="number" min={0} max={100} step={0.5} inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} placeholder={hasAiScores ? `AI said ${Math.round(aiScore)}` : "e.g. 55"} className="tabular" />
              {score.trim() !== "" && !scoreOk && <p className="text-xs text-destructive">Enter a number between 0 and 100.</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="comments">Your note</Label>
            <Textarea id="comments" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="What did you check, and why does the score stand or change? Judge the reasoning, not the phrasing." className="min-h-28 text-sm" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{comments.trim().length > 0 && comments.trim().length < 10 ? "A sentence or two, please." : "Written for the candidate."}</span>
              <span className="tabular">{comments.length}</span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full gap-2" size="lg" disabled={!valid || pending}>
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <CircleCheckBig className="size-4" aria-hidden />}
            Submit review
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
