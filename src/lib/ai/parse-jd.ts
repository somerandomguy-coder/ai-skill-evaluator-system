/**
 * parseJobDescription(raw)
 *
 * Extracts role, seniority, employer, must-have / nice-to-have skills, domain
 * and team context, and flags barrier requirements. Barriers are removed from
 * the skill lists and (see generate-requirements.ts) can never enter the rubric.
 */
import { isDemoMode } from "../env";
import { finalizeParsedJd } from "./barriers";
import { generateStructured } from "./client";
import { DemoFixtureMissingError, demoParsedJd } from "./demo";
import { PARSE_JD_SYSTEM } from "./prompts/generation";
import { ParsedJdSchema, type ParsedJd } from "./schemas";

export const MAX_JD_CHARS = 20_000;
export const MIN_JD_CHARS = 80;

export class InvalidJdError extends Error {}

export function validateJdText(raw: string): string {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (text.length < MIN_JD_CHARS) {
    throw new InvalidJdError("That is too short to be a job description. Paste the full text of the ad.");
  }
  if (text.length > MAX_JD_CHARS) {
    // Refuse rather than silently truncate: dropping the end of an ad changes what it asks for.
    throw new InvalidJdError(`That job description is longer than ${MAX_JD_CHARS.toLocaleString()} characters. Paste just the role's description.`);
  }
  return text;
}

export async function parseJobDescription(raw: string): Promise<ParsedJd> {
  const text = validateJdText(raw);

  if (isDemoMode()) {
    const cached = demoParsedJd(text);
    if (!cached) throw new DemoFixtureMissingError("parse");
    return cached;
  }

  const { data } = await generateStructured({
    stage: "parse",
    system: PARSE_JD_SYSTEM,
    messages: [{ role: "user", content: `<job_description>\n${text}\n</job_description>` }],
    schema: ParsedJdSchema,
    maxTokens: 8_000,
    effort: "low",
  });
  return finalizeParsedJd(data, text);
}
