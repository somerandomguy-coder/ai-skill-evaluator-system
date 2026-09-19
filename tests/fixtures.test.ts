/**
 * The seed/demo data is held to the same standard as live output: it passes the
 * same schemas, lints and evidence verification, and it tells the story the demo
 * needs (strong scores high and is left alone; weak scores low and is flagged).
 */
import { describe, expect, it } from "vitest";
import { ChallengeCallSchema } from "@/lib/ai/assemble-challenge";
import { finalizeParsedJd, detectBarriers } from "@/lib/ai/barriers";
import { shouldEscalate } from "@/lib/ai/escalation";
import { bankSchemaFor, bankStructureIssues, lintRequirements } from "@/lib/ai/generate-requirements";
import { CompanyResearchSchema, ParsedJdSchema, REQUIREMENT_CATEGORIES } from "@/lib/ai/schemas";
import { seedRefs, sessionTurns } from "./seed-helpers";
import { PASS_BOUNDARY, SESSION_LENGTH } from "@/lib/constants";
import { DEMO_ASSISTANT_SCRIPT } from "@/lib/fixtures/demo-assistant";
import { SEED_CHALLENGE, SEED_CHALLENGE_LLM } from "@/lib/fixtures/seed-challenge";
import { buildSeedEvaluation, STRONG_EVALUATION, WEAK_EVALUATION } from "@/lib/fixtures/seed-evaluations";
import { SEED_JD_SOURCE_URL, SEED_JD_TEXT } from "@/lib/fixtures/seed-jd";
import { SEED_PARSED_JD } from "@/lib/fixtures/seed-parsed";
import { SEED_REQUIREMENTS } from "@/lib/fixtures/seed-requirements";
import { SEED_RESEARCH, seedSearchCache } from "@/lib/fixtures/seed-research";
import { STRONG_SESSION, WEAK_SESSION, finalFilesOf } from "@/lib/fixtures/seed-sessions";
import { BASE_STARTER, PROTECTED_STARTER_PATHS } from "@/lib/starter";
import { buildResearchQueries } from "@/lib/ai/research-company";
import { queryHash } from "@/lib/search";
import { isSeedJd, demoParsedJd, demoResearch } from "@/lib/ai/demo";

describe("seed job description and parse", () => {
  it("is a real posting with a source URL, under the parser's length limit", () => {
    expect(SEED_JD_SOURCE_URL).toMatch(/^https:\/\/job-boards\.greenhouse\.io\/cultureamp\/jobs\/\d+$/);
    expect(SEED_JD_TEXT.length).toBeGreaterThan(80);
    expect(SEED_JD_TEXT.length).toBeLessThan(20_000);
  });

  it("the cached parse matches the schema, and its barriers are quoted verbatim from the posting", () => {
    expect(ParsedJdSchema.safeParse(SEED_PARSED_JD).success).toBe(true);
    for (const b of SEED_PARSED_JD.barriers) expect(SEED_JD_TEXT).toContain(b.text);
  });

  it("the deterministic barrier detector independently finds the same three requirements", () => {
    const found = detectBarriers(SEED_JD_TEXT).map((b) => b.kind).sort();
    expect(found).toEqual(["CREDENTIAL_GATE", "CULTURE_FIT_PROXY", "PEDIGREE_PROXY"]);
  });

  it("finalising the parse changes nothing (no barrier survives as a skill, none is missed)", () => {
    const again = finalizeParsedJd(SEED_PARSED_JD, SEED_JD_TEXT);
    expect(again.barriers.length).toBe(SEED_PARSED_JD.barriers.length);
    expect(again.mustHaveSkills).toEqual(SEED_PARSED_JD.mustHaveSkills);
    const skillText = [...again.mustHaveSkills, ...again.niceToHaveSkills].join(" ").toLowerCase();
    expect(skillText).not.toMatch(/postgraduate|phd|masters|startup|values alignment/);
  });

  it("is recognised as the seed JD despite whitespace differences", () => {
    expect(isSeedJd("  " + SEED_JD_TEXT.replace(/\n/g, "\r\n") + "  ")).toBe(true);
    expect(isSeedJd("some other job ad")).toBe(false);
    expect(demoParsedJd("some other job ad")).toBeNull();
    expect(demoResearch("Culture  Amp")).not.toBeNull();
    expect(demoResearch("Another Co")).toBeNull();
  });
});

describe("seed research and its search cache", () => {
  it("matches the schema and only cites sources that are in the cache", () => {
    expect(CompanyResearchSchema.safeParse(SEED_RESEARCH).success).toBe(true);
    expect(SEED_RESEARCH.realisticProblems).toHaveLength(3);
    const cached = new Set(seedSearchCache().flatMap((c) => c.results.map((r) => r.url)));
    for (const s of SEED_RESEARCH.sources) expect(cached.has(s.url)).toBe(true);
  });

  it("caches exactly the queries the pipeline issues, under distinct hashes", () => {
    const issued = buildResearchQueries("Culture Amp");
    const seeded = seedSearchCache().map((c) => c.query);
    expect(seeded).toEqual(issued);
    expect(new Set(issued.map(queryHash)).size).toBe(issued.length);
  });
});

describe("seed challenge", () => {
  it("passes the same schema and semantic rules the live generator is held to", () => {
    const parsed = ChallengeCallSchema.safeParse(SEED_CHALLENGE_LLM);
    expect(parsed.error?.issues).toBeUndefined();
    expect(SEED_CHALLENGE.timeboxMinutes).toBeGreaterThanOrEqual(120);
    expect(SEED_CHALLENGE.timeboxMinutes).toBeLessThanOrEqual(240);
  });

  it("renders a brief with the five required sections and hides the internal notes", () => {
    for (const h of ["## The problem", "## Who it's for", "## Constraints", "## Out of scope", '## What "done" means']) {
      expect(SEED_CHALLENGE.brief).toContain(h);
    }
    for (const note of [...SEED_CHALLENGE.meta.validApproaches, ...SEED_CHALLENGE.meta.ambiguities]) {
      expect(SEED_CHALLENGE.brief).not.toContain(note);
    }
    expect(SEED_CHALLENGE.meta.validApproaches.length).toBeGreaterThanOrEqual(2);
  });

  it("layers challenge files over the base starter without touching protected files", () => {
    for (const p of PROTECTED_STARTER_PATHS) expect(SEED_CHALLENGE.starterTemplate[p]).toBe(BASE_STARTER[p]);
    expect(Object.keys(SEED_CHALLENGE.starterTemplate)).toEqual(
      expect.arrayContaining(["src/data/teams.json", "src/data/responses.json", "src/data/summaries.json", "README.md"])
    );
    for (const p of Object.keys(SEED_CHALLENGE.starterTemplate).filter((k) => k.endsWith(".json") && k !== "package-lock.json")) {
      expect(() => JSON.parse(SEED_CHALLENGE.starterTemplate[p])).not.toThrow();
    }
  });

  it("has the shape the challenge depends on: a 5-person team with 3 comments, and a 3-person team inside Engineering", () => {
    const responses = JSON.parse(SEED_CHALLENGE.starterTemplate["src/data/responses.json"]) as { teamId: string; comment: string }[];
    const of = (t: string) => responses.filter((r) => r.teamId === t);
    expect(of("onboarding")).toHaveLength(5);
    expect(of("onboarding").filter((r) => r.comment).length).toBe(3);
    expect(of("mobile")).toHaveLength(3);
    expect(of("payments").length + of("platform").length + of("mobile").length).toBe(20);
  });
});

describe("seed requirement bank", () => {
  it("is 8-15 weighted requirements covering all seven categories", () => {
    expect(bankStructureIssues(SEED_REQUIREMENTS)).toEqual([]);
    expect(new Set(SEED_REQUIREMENTS.map((r) => r.category))).toEqual(new Set(REQUIREMENT_CATEGORIES));
  });

  it("passes the fairness and barrier lints, with the parsed JD's barriers excluded", () => {
    expect(lintRequirements(SEED_REQUIREMENTS, SEED_PARSED_JD.barriers)).toEqual([]);
    expect(bankSchemaFor(SEED_PARSED_JD.barriers).safeParse({ requirements: SEED_REQUIREMENTS }).success).toBe(true);
  });
});

describe("seed sessions", () => {
  it("are complete, alternating, and the strong one really contains the bug the candidate catches", () => {
    for (const s of [STRONG_SESSION, WEAK_SESSION]) {
      s.turns.forEach((t, i) => {
        expect(t.seq).toBe(i + 1);
        expect(t.role).toBe(i % 2 === 0 ? "USER" : "ASSISTANT");
      });
    }
    const v1 = STRONG_SESSION.turns[3].files![0].contents;
    expect(v1).toContain("people <= minGroup");
    expect(v1).toContain("r.comment.trim()");
  });

  it("the demo script is the weak session's assistant replies, each marked as cached", () => {
    expect(DEMO_ASSISTANT_SCRIPT).toHaveLength(3);
    for (const t of DEMO_ASSISTANT_SCRIPT) expect(t.message).toMatch(/^\[Demo mode:/);
  });
});

describe("seeded evaluations run through the live finalisation path", () => {
  const refs = seedRefs();

  function evaluate(session: typeof STRONG_SESSION, seed: typeof STRONG_EVALUATION) {
    return buildSeedEvaluation(seed, refs, sessionTurns(session), finalFilesOf(session));
  }

  it("every citation is verified against the real transcript / files — none were discarded", () => {
    for (const [session, seed] of [[STRONG_SESSION, STRONG_EVALUATION], [WEAK_SESSION, WEAK_EVALUATION]] as const) {
      const result = evaluate(session, seed);
      result.perRequirement.forEach((r, i) => {
        const authored = seed.scores[i];
        expect(r.evidence, `${session.key} requirement ${i}`).toHaveLength(authored.evidence.length);
        if (authored.score !== null) {
          expect(r.note, `${session.key} requirement ${i}`).toBeUndefined();
          expect(r.score).toBe(authored.score);
          expect(r.evidence.length).toBeGreaterThan(0);
        } else {
          expect(r.score).toBeNull();
        }
      });
    }
  });

  it("strong: scores high with high confidence and is not routed to a mentor", () => {
    const e = evaluate(STRONG_SESSION, STRONG_EVALUATION);
    expect(e.overallScore).toBeGreaterThan(PASS_BOUNDARY + 20);
    expect(e.confidence).toBeGreaterThan(0.8);
    expect(e.coverage).toBe(1);
    const d = shouldEscalate({
      evaluation: e,
      requirements: refs,
      session: { durationMinutes: STRONG_SESSION.durationMinutes, timeboxMinutes: SEED_CHALLENGE.timeboxMinutes },
    });
    expect(d.escalate).toBe(false);
  });

  it("weak: scores low, and is escalated for the right reasons", () => {
    const e = evaluate(WEAK_SESSION, WEAK_EVALUATION);
    expect(e.overallScore).toBeLessThan(25);
    const d = shouldEscalate({
      evaluation: e,
      requirements: refs,
      session: { durationMinutes: WEAK_SESSION.durationMinutes, timeboxMinutes: SEED_CHALLENGE.timeboxMinutes },
    });
    expect(d.escalate).toBe(true);
    expect(d.reasons.map((r) => r.code).sort()).toEqual(["LOW_CONFIDENCE", "NO_EVIDENCE", "SESSION_TOO_SHORT"]);
    expect(WEAK_SESSION.durationMinutes).toBeLessThan(SEED_CHALLENGE.timeboxMinutes * SESSION_LENGTH.tooShortFraction);
  });
});
