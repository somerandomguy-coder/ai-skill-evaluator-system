/** Progress events streamed while a challenge is built from a job description. Shared by server and client. */
export type PipelineStep = "read" | "classify" | "parse" | "research" | "challenge" | "rubric" | "save";

/**
 * The JD-quality gate's verdict on the pasted text. Emitted once, right after
 * the "classify" step, whether the text proceeds or gets rejected. This is
 * the fixed contract the frontend reads to render a quality/injection badge:
 *   type: "too_vague", confidence: 0.86, reason: "...", cheatingAttempt: false
 */
export type JdQualityVerdict = {
  type: "good" | "too_vague" | "not_job_ad";
  /** 0 to 1. Render as a percentage (Math.round(confidence * 100)), not a pre-formatted string. */
  confidence: number;
  reason: string;
  cheatingAttempt: boolean;
  cheatingEvidence: string | null;
};

export type PipelineEvent =
  | { type: "step"; step: PipelineStep; status: "start" | "done"; detail?: string }
  | { type: "jd_quality"; verdict: JdQualityVerdict }
  | { type: "done"; challengeId: string; demo: boolean; notice?: string }
  | { type: "error"; message: string };
