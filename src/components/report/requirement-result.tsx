import { Flag } from "lucide-react";
import { RubricDetails } from "@/components/challenge/rubric";
import { CategoryBadge, WeightPips } from "@/components/common/category";
import { ConfidenceMeter, ScoreBar } from "@/components/common/score";
import { EvidenceChip } from "@/components/evidence/evidence-chip";
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
    <div id={`req-${req.id}`} className={cn("scroll-mt-24 rounded-2xl p-4 sm:p-5", scored ? "bg-surface-container-low ring-1 ring-border" : "border border-dashed border-foreground/20 bg-muted/40")}>
      <div className="space-y-3.5">
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

        <p className="text-[15px] leading-snug font-medium text-pretty">{req.statement}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{result.rationale}</p>

        {result.evidence.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Evidence</div>
            <ul className="space-y-2">
              {result.evidence.map((e, i) => (
                <li key={`${e.type}-${e.ref}-${i}`} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
                  <EvidenceChip evidence={e} className="shrink-0 self-start" />
                  <blockquote className="min-w-0 border-l-2 border-signal/40 pl-3 text-[13px] leading-relaxed text-foreground/80">&ldquo;{e.quote}&rdquo;</blockquote>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!scored && (
          <div className="flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
            <Flag className="size-4 shrink-0" aria-hidden />
            No evidence, sent to mentor
          </div>
        )}
        {result.note && scored && <p className="text-xs text-warn">{result.note}</p>}

        <RubricDetails requirement={req} label="Rubric" />
      </div>
    </div>
  );
}
