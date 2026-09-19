import { PASS_BOUNDARY } from "@/lib/constants";
import { scoreBand, TONE_STROKE } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Circular 0-100 score with a tick at the pass boundary. */
export function ScoreRing({
  score,
  size = 176,
  stroke = 12,
  caption,
  className,
}: {
  score: number;
  size?: number;
  stroke?: number;
  caption?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, score));
  const band = scoreBand(pct);
  const c = size / 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // The ring is drawn starting at 12 o'clock; the tick uses the same convention.
  const theta = (PASS_BOUNDARY / 100) * 2 * Math.PI;
  const inner = r - stroke / 2 - 3;
  const outer = r + stroke / 2 + 3;
  const tick = { x1: c + inner * Math.cos(theta), y1: c + inner * Math.sin(theta), x2: c + outer * Math.cos(theta), y2: c + outer * Math.sin(theta) };

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={`Score ${Math.round(pct)} percent, ${band.label}`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <g transform={`rotate(-90 ${c} ${c})`}>
          <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(circumference * pct) / 100} ${circumference}`}
            className={TONE_STROKE[band.tone]}
          />
          <line {...tick} strokeWidth={2} className="stroke-foreground/50" />
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="tabular text-4xl font-semibold tracking-tight">
            {Math.round(pct)}
            <span className="ml-0.5 text-lg font-medium text-muted-foreground">%</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{caption ?? band.label}</div>
        </div>
      </div>
    </div>
  );
}

const SEGMENT_TONE = ["bg-rose-500", "bg-rose-400", "bg-amber-400", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];

/** 0-5 in five segments; `null` renders as an honest "not scored". */
export function ScoreBar({ score, className }: { score: number | null; className?: string }) {
  if (score === null) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-2 w-5 rounded-full border border-dashed border-foreground/25" />
          ))}
        </div>
        <span className="text-xs font-medium text-muted-foreground">Not scored</span>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2", className)} role="img" aria-label={`Score ${score} out of 5`}>
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn("h-2 w-5 rounded-full", i <= score ? SEGMENT_TONE[score] : "bg-foreground/10")} />
        ))}
      </div>
      <span className="tabular text-sm font-semibold">
        {score}
        <span className="text-xs font-normal text-muted-foreground">/5</span>
      </span>
    </div>
  );
}

/** Thin 0-1 meter. */
export function ConfidenceMeter({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)} title={`Confidence ${pct}%`}>
      <span>Confidence</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
        <span className="block h-full rounded-full bg-foreground/60" style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular w-8">{value.toFixed(2)}</span>
    </div>
  );
}
