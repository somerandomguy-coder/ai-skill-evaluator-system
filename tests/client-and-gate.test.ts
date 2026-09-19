import { afterEach, describe, expect, it } from "vitest";
import { DemoModeError, MissingApiKeyError, generateStructured } from "@/lib/ai/client";
import { AssistantTurnSchema } from "@/lib/ai/schemas";
import { SEED_CHALLENGE } from "@/lib/fixtures/seed-challenge";
import { STRONG_GATE_V1, STRONG_GATE_V2, STRONG_GATE_V3 } from "@/lib/fixtures/seed-solutions";

const request = {
  stage: "assistant" as const,
  system: "s",
  messages: [{ role: "user" as const, content: "hi" }],
  schema: AssistantTurnSchema,
  maxTokens: 100,
};

const saved = { demo: process.env.DEMO_MODE, key: process.env.ANTHROPIC_API_KEY };
afterEach(() => {
  process.env.DEMO_MODE = saved.demo;
  process.env.ANTHROPIC_API_KEY = saved.key;
});

describe("generateStructured guards", () => {
  it("refuses to make a live call in DEMO_MODE — the backstop behind 'no live API calls'", async () => {
    process.env.DEMO_MODE = "true";
    process.env.ANTHROPIC_API_KEY = "sk-ant-should-not-be-used";
    await expect(generateStructured(request)).rejects.toBeInstanceOf(DemoModeError);
  });

  it("explains a missing API key instead of failing obscurely", async () => {
    process.env.DEMO_MODE = "false";
    process.env.ANTHROPIC_API_KEY = "";
    const err = await generateStructured(request).catch((e) => e);
    expect(err).toBeInstanceOf(MissingApiKeyError);
    expect(err.message).toMatch(/DEMO_MODE=true/);
  });
});

/** Run the assistant-written gate.js for real, against the seed dataset. */
async function loadGate(source: string) {
  return (await import(/* @vite-ignore */ "data:text/javascript;base64," + Buffer.from(source).toString("base64"))) as {
    assess: (a: { summary: unknown; teams: unknown; responses: unknown; minGroup: number }) => {
      status: string;
      people: number;
      reasons: string[];
      claims: { supported: boolean; singlesOut: boolean; sweeping: boolean; supportIds: string[] }[];
    };
  };
}

const data = SEED_CHALLENGE.starterTemplate;
const teams = JSON.parse(data["src/data/teams.json"]).teams;
const responses = JSON.parse(data["src/data/responses.json"]);
const summaries: { id: string }[] = JSON.parse(data["src/data/summaries.json"]);
const statusOf = async (source: string, id: string, minGroup = 5) => {
  const gate = await loadGate(source);
  return gate.assess({ summary: summaries.find((s) => s.id === id), teams, responses, minGroup });
};

describe("the strong session's code really contains the errors the candidate catches", () => {
  it("v1 (turn 4): counts commenters and is off by one — Onboarding, exactly 5 people, is wrongly held", async () => {
    const onboarding = await statusOf(STRONG_GATE_V1, "s-onboarding");
    expect(onboarding.people).toBe(3); // 3 comments, not 5 people
    expect(onboarding.status).toBe("hold");
    expect((await statusOf(STRONG_GATE_V1, "s-payments")).people).toBe(7); // 9 people, 7 comments
  });

  it("v2 (turn 6): both fixed — Onboarding is released at exactly the minimum, Engineering is held for containing Mobile", async () => {
    expect(await statusOf(STRONG_GATE_V2, "s-onboarding")).toMatchObject({ people: 5, status: "release" });
    const eng = await statusOf(STRONG_GATE_V2, "s-engineering");
    expect(eng).toMatchObject({ people: 20, status: "hold" });
    expect(eng.reasons.join(" ")).toMatch(/Mobile/);
  });

  it("the boundary flips as the minimum moves: 5 people pass a minimum of 5 but not 6", async () => {
    expect((await statusOf(STRONG_GATE_V3, "s-onboarding", 5)).status).toBe("release");
    expect((await statusOf(STRONG_GATE_V3, "s-onboarding", 6)).status).toBe("hold");
  });

  it("v3 (turn 10): flags single-voice claims, sweeping claims and single-out wording that v2 let through", async () => {
    const platformV2 = await statusOf(STRONG_GATE_V2, "s-platform");
    const platformV3 = await statusOf(STRONG_GATE_V3, "s-platform");
    expect(platformV3.claims.filter((c) => !c.supported).length).toBeGreaterThan(platformV2.claims.filter((c) => !c.supported).length);

    const payments = await statusOf(STRONG_GATE_V3, "s-payments");
    expect(payments.claims.some((c) => c.singlesOut)).toBe(true);
    expect(payments.claims.some((c) => c.sweeping && !c.supported)).toBe(true);
    expect((await statusOf(STRONG_GATE_V2, "s-payments")).claims.some((c) => c.singlesOut)).toBe(false);
  });

  it("small groups are held and never expose a claim or a comment", async () => {
    for (const id of ["s-mobile", "s-support"]) {
      const r = await statusOf(STRONG_GATE_V3, id);
      expect(r.status).toBe("hold");
      expect(r.claims).toEqual([]);
    }
  });
});
