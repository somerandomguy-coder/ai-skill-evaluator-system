/**
 * Tunables that define how an assessment is scored and routed.
 *
 * RUBRIC_VERSION is stored on every Challenge and every Evaluation so a result
 * can always be traced to the exact framework it was scored against. Bump it
 * whenever the requirement categories, the evaluator prompt, or the scoring
 * rules change in a way that could move a score.
 */
export const RUBRIC_VERSION = "rubric-2026.09.1";

/** Overall score (0-100) at which an evaluation counts as meeting the bar. */
export const PASS_BOUNDARY = 60;

/** Scores within +/- this many points of PASS_BOUNDARY are borderline and go to a mentor. */
export const BORDERLINE_BAND = 10;

/** A requirement scored with confidence below this (0-1) is escalated. */
export const CONFIDENCE_THRESHOLD = 0.6;

/**
 * A session much shorter or longer than the brief's timebox is unusual enough
 * to warrant a human look (e.g. a 10-minute "build" or an all-nighter).
 */
export const SESSION_LENGTH = {
  tooShortFraction: 0.2,
  tooLongFraction: 1.75,
} as const;

/** The brief must be scoped to 2-4 hours. */
export const TIMEBOX = { minMinutes: 120, maxMinutes: 240 } as const;

/** Requirement bank size. */
export const REQUIREMENT_COUNT = { min: 8, max: 15 } as const;

/** Cookie holding the mocked session (just a user id — no credentials exist). */
export const USER_COOKIE = "userId";
