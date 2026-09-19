/**
 * generateChallenge(parsedJd, companyResearch)
 *
 * A project brief scoped to 2-4 hours, rooted in the company's domain, solvable
 * several ways, with deliberate ambiguities so problem-framing can be observed.
 * Also emits the starter template.
 *
 * The model returns structured fields; code renders the markdown brief from them
 * (so every brief has the same sections) and layers the model's starter files
 * over the vetted base template. Protected files (package.json, vite.config.js,
 * index.html, src/main.jsx) can never be replaced by generated ones.
 */
import { isDemoMode } from "../env";
import { assembleChallenge, ChallengeCallSchema } from "./assemble-challenge";
import { generateStructured } from "./client";
import { DemoFixtureMissingError, demoChallenge } from "./demo";
import { CHALLENGE_SYSTEM } from "./prompts/generation";
import type { CompanyResearch, GeneratedChallenge, ParsedJd } from "./schemas";

export async function generateChallenge(parsedJd: ParsedJd, research: CompanyResearch): Promise<GeneratedChallenge> {
  if (isDemoMode()) {
    const cached = demoChallenge();
    if (!cached) throw new DemoFixtureMissingError("challenge");
    return cached;
  }

  const user = [
    `<job>\nRole: ${parsedJd.roleTitle} (${parsedJd.seniority})\nEmployer: ${parsedJd.employer}\nDomain: ${parsedJd.domain}\nTeam: ${parsedJd.teamContext}\nMust-have skills:\n${parsedJd.mustHaveSkills.map((s) => `- ${s}`).join("\n")}\nNice-to-have skills:\n${parsedJd.niceToHaveSkills.map((s) => `- ${s}`).join("\n")}\n</job>`,
    `<company_research grounded_in_search="${research.groundedInSearch}">\nWhat they do: ${research.whatTheyDo}\nDomain and users: ${research.domainAndUsers}\nTechnical signals:\n${research.technicalSignals.map((s) => `- ${s}`).join("\n")}\nRealistic problems in this role:\n${research.realisticProblems.map((p) => `- ${p.title}: ${p.whyItIsHard}`).join("\n") || "- (none available: work from the job description)"}\n</company_research>`,
    "Design the challenge.",
  ].join("\n\n");

  const { data } = await generateStructured({
    stage: "challenge",
    system: CHALLENGE_SYSTEM,
    messages: [{ role: "user", content: user }],
    schema: ChallengeCallSchema,
    maxTokens: 24_000,
    effort: "high",
  });
  return assembleChallenge(data, "ai");
}
