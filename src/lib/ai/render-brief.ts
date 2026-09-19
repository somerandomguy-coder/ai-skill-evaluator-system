import type { ChallengeLlm } from "./schemas";

const bullets = (items: string[]) => items.map((i) => `- ${i.trim()}`).join("\n");

/**
 * The brief is rendered from structured fields rather than asked for as free
 * text, so every brief has the same sections a candidate (and the rubric) can
 * rely on: problem, audience, constraints, out of scope, and what "done" means.
 * The internal fields (valid approaches, deliberate ambiguities) are never
 * rendered — they are for mentors.
 */
export function renderBrief(
  c: Pick<ChallengeLlm, "problem" | "audience" | "constraints" | "outOfScope" | "doneCriteria">
): string {
  return [
    "## The problem",
    c.problem.trim(),
    "",
    "## Who it's for",
    c.audience.trim(),
    "",
    "## Constraints",
    bullets(c.constraints),
    "",
    "## Out of scope",
    bullets(c.outOfScope),
    "",
    '## What "done" means',
    bullets(c.doneCriteria),
    "",
  ].join("\n");
}
