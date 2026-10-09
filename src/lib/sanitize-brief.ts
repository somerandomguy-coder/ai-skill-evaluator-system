/**
 * Brief sanitization utilities.
 * Ensures candidate-facing work sample briefs never disclose secret/planted AI traps,
 * internal grading guidelines, or adversarial test cases.
 */

export function sanitizeCandidateBriefMarkdown(text?: string | null): string {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove markdown header sections like:
  //    ## AI TRAPS...
  //    ### Planted Bug Archetype...
  //    ## Deliberately embedded traps we grade for...
  //    ## Planted Flaws...
  //    ## Injected Traps...
  // up to the next markdown header (#... ) or end of document
  cleaned = cleaned.replace(
    /(?:^|\n)#{1,4}\s*(?:AI\s*TRAPS?|PLANTED\s*(?:AI\s*)?(?:TRAPS?|BUGS?|FLAWS?)(?:\s*ARCHETYPE)?|DELIBERATELY\s*EMBEDDED\s*TRAPS?|INJECTED\s*(?:AI\s*)?TRAPS?)[^\n]*\n[\s\S]*?(?=(?:\n#{1,4}\s)|\s*$)/gi,
    "\n"
  );

  // 2. Remove bold/standalone trap banners like:
  //    **AI TRAPS — Read Carefully** ...
  cleaned = cleaned.replace(
    /(?:^|\n)\*{2}(?:AI\s*TRAPS?|PLANTED\s*(?:AI\s*)?(?:TRAPS?|BUGS?|FLAWS?))[^\n]*\*{2}[\s\S]*?(?=(?:\n#{1,4}\s)|\s*$)/gi,
    "\n"
  );

  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}
