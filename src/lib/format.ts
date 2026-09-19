import { BORDERLINE_BAND, PASS_BOUNDARY } from "./constants";

export type Tone = "strong" | "mixed" | "limited";

/** How a 0-100 score reads. The borderline band mirrors the escalation rule, so what a reader sees matches what a mentor is asked to check. */
export function scoreBand(score: number): { label: string; tone: Tone; blurb: string } {
  if (score >= PASS_BOUNDARY + BORDERLINE_BAND) {
    return { label: "Strong evidence", tone: "strong", blurb: "Clearly above the bar for this role's work sample." };
  }
  if (score >= PASS_BOUNDARY - BORDERLINE_BAND) {
    return { label: "Mixed evidence", tone: "mixed", blurb: "Close to the bar; the evidence supports either reading." };
  }
  return { label: "Limited evidence", tone: "limited", blurb: "Below the bar on the evidence available." };
}

export const TONE_TEXT: Record<Tone, string> = {
  strong: "text-emerald-700",
  mixed: "text-amber-700",
  limited: "text-rose-700",
};

export const TONE_STROKE: Record<Tone, string> = {
  strong: "stroke-emerald-500",
  mixed: "stroke-amber-500",
  limited: "stroke-rose-500",
};

export const TONE_BG: Record<Tone, string> = {
  strong: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  mixed: "bg-amber-50 text-amber-800 ring-amber-200",
  limited: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** "3 hours" for timeboxes. */
export function formatTimebox(minutes: number): string {
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  return formatMinutes(minutes);
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
}

/** Short, stable label for an anonymous submission (mentors review blind). */
export function shortId(id: string): string {
  return id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
