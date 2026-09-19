/**
 * The score that stands for a submission: the latest mentor review wins over the
 * AI's. Pure (no database), so both data sources and the UI can share it.
 */
export interface EffectiveScore {
  score: number;
  basis: "ai" | "mentor-confirmed" | "mentor-override";
}

export function effectiveScore(
  ev: { overallScore: number },
  reviews: { verdict: "CONFIRM" | "OVERRIDE"; adjustedScore: number | null; reviewedAt: Date | string }[]
): EffectiveScore {
  const time = (d: Date | string) => new Date(d).getTime();
  const latest = [...reviews].sort((a, b) => time(b.reviewedAt) - time(a.reviewedAt))[0];
  if (!latest) return { score: ev.overallScore, basis: "ai" };
  if (latest.verdict === "OVERRIDE" && latest.adjustedScore !== null) {
    return { score: latest.adjustedScore, basis: "mentor-override" };
  }
  return { score: ev.overallScore, basis: "mentor-confirmed" };
}
