/**
 * DEMO_MODE fixtures — the single place the pipeline reaches for cached
 * responses. In DEMO_MODE no function may call the API (client.ts enforces this
 * as a backstop), so every stage has a fixture-backed path that returns the same
 * structured types as the live one.
 */
import { DEMO_ASSISTANT_EXHAUSTED, DEMO_ASSISTANT_SCRIPT } from "../fixtures/demo-assistant";
import { SEED_CHALLENGE } from "../fixtures/seed-challenge";
import { SEED_JD_TEXT } from "../fixtures/seed-jd";
import { SEED_PARSED_JD } from "../fixtures/seed-parsed";
import { SEED_REQUIREMENTS } from "../fixtures/seed-requirements";
import { SEED_EMPLOYER, SEED_RESEARCH } from "../fixtures/seed-research";
import type { AssistantTurn, CompanyResearch, GeneratedChallenge, ParsedJd, RequirementDraft } from "./schemas";

/** Thrown when DEMO_MODE has no cached response for the input (e.g. a JD other than the seeded one). */
export class DemoFixtureMissingError extends Error {
  constructor(readonly stage: string) {
    super(`No cached demo response for stage "${stage}". Demo mode only serves the seeded example.`);
    this.name = "DemoFixtureMissingError";
  }
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** True when `text` is the seeded job description (whitespace/case-insensitive). */
export function isSeedJd(text: string): boolean {
  return squash(text) === squash(SEED_JD_TEXT);
}

export function demoParsedJd(text: string): ParsedJd | null {
  return isSeedJd(text) ? SEED_PARSED_JD : null;
}

export function demoResearch(employer: string): CompanyResearch | null {
  return squash(employer) === squash(SEED_EMPLOYER) ? SEED_RESEARCH : null;
}

export function demoChallenge(): GeneratedChallenge {
  return SEED_CHALLENGE;
}

export function demoRequirements(): RequirementDraft[] {
  return SEED_REQUIREMENTS;
}

/** The Nth assistant reply (0-based) of the demo script. */
export function demoAssistantTurn(priorAssistantTurns: number): AssistantTurn {
  return DEMO_ASSISTANT_SCRIPT[priorAssistantTurns] ?? DEMO_ASSISTANT_EXHAUSTED;
}
