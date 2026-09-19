/**
 * researchCompany(employerName, parsedJd)
 *
 * Search (cached; see lib/search.ts) then synthesise: what the company does, its
 * domain and users, public technical signals and 2-3 realistic problems someone
 * in the role would face.
 *
 * It degrades, it never blocks: no employer name, no search results, or a failed
 * synthesis all fall through to a JD-only result with `groundedInSearch: false`.
 * Sources are attached by code from the real search results — the model is never
 * asked to cite, so it cannot invent a source.
 */
import { isDemoMode } from "../env";
import { search, type SearchResult } from "../search";
import { AiError, DemoModeError, MissingApiKeyError, generateStructured } from "./client";
import { DemoFixtureMissingError, demoResearch } from "./demo";
import { RESEARCH_SYSTEM } from "./prompts/generation";
import { CompanyResearchLlmSchema, type CompanyResearch, type ParsedJd } from "./schemas";

/** Fixed, employer-only queries: stable cache keys, and only three scrapes per company, ever. */
export function buildResearchQueries(employer: string): string[] {
  return [
    `${employer} company overview`,
    `${employer} engineering technology stack`,
    `${employer} product customers`,
  ];
}

async function gather(employer: string): Promise<SearchResult[]> {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const q of buildResearchQueries(employer)) {
    for (const r of await search(q)) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      out.push(r);
    }
  }
  return out.slice(0, 10);
}

/** What we can say with no help from the web: the JD's own words. */
export function jdOnlyResearch(parsed: ParsedJd): CompanyResearch {
  return {
    whatTheyDo: parsed.teamContext || `${parsed.employer} — ${parsed.domain}.`,
    domainAndUsers: parsed.domain,
    technicalSignals: parsed.mustHaveSkills.slice(0, 6),
    realisticProblems: [],
    groundedInSearch: false,
    sources: [],
  };
}

export async function researchCompany(employerName: string, parsedJd: ParsedJd): Promise<CompanyResearch> {
  const employer = employerName.trim();
  const usable = employer && employer.toLowerCase() !== "unknown";

  if (isDemoMode()) {
    const cached = demoResearch(employer);
    if (cached) return cached;
    // No fixture for this employer: whatever the (cache-only) search holds, then JD-only.
    const results = usable ? await gather(employer) : [];
    if (!results.length) return jdOnlyResearch(parsedJd);
    throw new DemoFixtureMissingError("research");
  }

  const results = usable ? await gather(employer) : [];

  const sourcesBlock = results.length
    ? results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`).join("\n\n")
    : "(no search results are available — rely on the job description alone)";
  const user = [
    `<employer>${employer || "Unknown"}</employer>`,
    `<job_summary>\nRole: ${parsedJd.roleTitle} (${parsedJd.seniority})\nDomain: ${parsedJd.domain}\nTeam: ${parsedJd.teamContext}\nMust-have skills: ${parsedJd.mustHaveSkills.join("; ")}\n</job_summary>`,
    `<search_results>\n${sourcesBlock}\n</search_results>`,
  ].join("\n\n");

  try {
    const { data } = await generateStructured({
      stage: "research",
      system: RESEARCH_SYSTEM,
      messages: [{ role: "user", content: user }],
      schema: CompanyResearchLlmSchema,
      maxTokens: 8_000,
      effort: "medium",
    });
    return { ...data, groundedInSearch: results.length > 0, sources: results };
  } catch (err) {
    // A missing key / demo guard is a configuration problem the caller must see.
    if (err instanceof MissingApiKeyError || err instanceof DemoModeError) throw err;
    if (err instanceof AiError) return jdOnlyResearch(parsedJd);
    throw err;
  }
}
