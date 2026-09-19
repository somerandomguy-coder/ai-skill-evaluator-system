/**
 * Pure challenge assembly: schema rules and brief/starter construction.
 * Kept free of model and demo-fixture imports so both the live path and the
 * fixtures can use it without an import cycle.
 */
import { TIMEBOX } from "../constants";
import { fromFileList, sanitizeWrites } from "../files";
import { mergeStarter, PROTECTED_STARTER_PATHS } from "../starter";
import { renderBrief } from "./render-brief";
import { ChallengeLlmSchema, type ChallengeLlm, type GeneratedChallenge } from "./schemas";

const MIN_PROBLEM_CHARS = 200;

/** Schema + semantic rules; a violation triggers the client's corrective retry. */
export const ChallengeCallSchema = ChallengeLlmSchema.superRefine((c, ctx) => {
  const need = (ok: boolean, path: string, message: string) => {
    if (!ok) ctx.addIssue({ code: "custom", path: [path], message });
  };
  need(
    c.timeboxMinutes >= TIMEBOX.minMinutes && c.timeboxMinutes <= TIMEBOX.maxMinutes,
    "timeboxMinutes",
    `must be between ${TIMEBOX.minMinutes} and ${TIMEBOX.maxMinutes}`
  );
  need(c.problem.trim().length >= MIN_PROBLEM_CHARS, "problem", `must be at least ${MIN_PROBLEM_CHARS} characters`);
  need(c.constraints.length >= 2, "constraints", "needs at least 2 explicit constraints");
  need(c.outOfScope.length >= 1, "outOfScope", "needs at least 1 out-of-scope item");
  need(c.doneCriteria.length >= 2, "doneCriteria", "needs at least 2 observable done criteria");
  need(c.validApproaches.length >= 2, "validApproaches", "needs at least 2 distinct valid approaches");
  need(c.deliberateAmbiguities.length >= 2, "deliberateAmbiguities", "needs at least 2 deliberate ambiguities");
});

/** Deterministic assembly: render the brief, sanitise starter files, merge over the base template. */
export function assembleChallenge(c: ChallengeLlm, source: GeneratedChallenge["meta"]["source"]): GeneratedChallenge {
  const { valid } = sanitizeWrites(c.starterFiles.filter((f) => !PROTECTED_STARTER_PATHS.has(f.path)));
  return {
    title: c.title.trim(),
    brief: renderBrief(c),
    domainContext: c.domainContext.trim(),
    timeboxMinutes: c.timeboxMinutes,
    starterTemplate: mergeStarter(fromFileList(valid)),
    meta: { validApproaches: c.validApproaches, ambiguities: c.deliberateAmbiguities, source },
  };
}
