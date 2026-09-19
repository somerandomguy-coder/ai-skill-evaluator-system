import { Flag } from "lucide-react";
import { RubricDetails } from "@/components/challenge/rubric";
import { CategoryBadge, WeightPips } from "@/components/common/category";
import { ConfidenceMeter, ScoreBar } from "@/components/common/score";
import { EvidenceChip } from "@/components/evidence/evidence-chip";
import { Card, CardContent } from "@/components/ui/card";
import type { ResultView } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/**
 * One requirement, its score, and everything behind the score: the rationale,
 * each cited turn or file (click to see it in place), and the rubric it was
 * scored against. A requirement that could not be scored says so, plainly.
 */
export function RequirementResultCard({ result, showCategory = true }: { result: ResultView; showCategory?: boolean }) {
  const req = result.requirement;
  const scored = result.score !== null;

  return (
    <Card id={`req-${req.id}`} className={cn("scroll-mt-24", !scored && "border-dashed bg-muted/30")}>
      <CardContent className="space-y-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {showCategory && <CategoryBadge category={req.category} />}
            <WeightPips weight={req.weight} />
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <ScoreBar score={result.score} />
            {scored && <ConfidenceMeter value={result.confidence} />}
          </div>
        </div>

        <p className="leading-snug font-medium">{req.statement}</p>
        <p className="text-sm leading-relaxed text-foreground/80">{result.rationale}</p>

        {result.evidence.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Evidence</div>
            <ul className="space-y-2">
              {result.evidence.map((e, i) => (
                <li key={`${e.type}-${e.ref}-${i}`} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
                  <EvidenceChip evidence={e} className="shrink-0 self-start" />
                  <blockquote className="min-w-0 border-l-2 pl-3 text-sm leading-relaxed text-foreground/70 italic">&ldquo;{e.quote}&rdquo;</blockquote>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!scored && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 ring-inset">
            <Flag className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              We don&apos;t score what we can&apos;t cite. With no verifiable evidence for this requirement, no judgment was made and it is sent to a human mentor.
            </span>
          </div>
        )}
        {result.note && scored && <p className="text-xs text-amber-700">{result.note}</p>}

        <RubricDetails requirement={req} label="Rubric for this requirement" />
      </CardContent>
    </Card>
  );
}
