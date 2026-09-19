import { buildResearchQueries } from "../ai/research-company";
import type { CompanyResearch } from "../ai/schemas";
import type { SearchResult } from "../search";

/**
 * Cached company research for the seed JD.
 *
 * PROVENANCE — read this before trusting or replacing it:
 * DuckDuckGo rejected every query from the environment this project was built in
 * ("DDG detected an anomaly in the request"), so these are NOT literal DuckDuckGo
 * results. They were gathered on 2026-09-19 from public Culture Amp pages using a
 * web-search tool and page fetches; the snippets are short paraphrases of what
 * those pages state, and titles are descriptive labels. Nothing here goes beyond
 * what those pages (and the job posting itself) say. To replace them with live
 * results: set DEMO_MODE=false and run the pipeline once; every query is cached.
 */
const HOME: SearchResult = {
  title: "Culture Amp — employee experience platform (homepage)",
  url: "https://www.cultureamp.com/",
  snippet:
    "Products include Engage (employee surveys), Perform (continuous feedback, performance reviews, 1-on-1s, goals, 360 feedback) and AI Coach. Users are HR teams, managers, employees and leaders. Trusted by 6,000+ companies; describes itself as SOC II, ISO and GDPR compliant.",
};

const CONFIDENTIALITY_ARTICLE: SearchResult = {
  title: "Confidentiality Protections in Reporting — Culture Amp Support Guide",
  url: "https://support.cultureamp.com/en/articles/7048386-confidentiality-protections-in-reporting",
  snippet:
    "Surveys are confidential rather than anonymous: employees take part on the basis that individual responses cannot be identified. Confidentiality settings, including a reporting group minimum (usually 5, but it may vary), are how that promise is upheld.",
};

const CONFIDENTIALITY_COLLECTION: SearchResult = {
  title: "Confidentiality — Culture Amp Support Guide (collection)",
  url: "https://support.cultureamp.com/en/collections/8939524-confidentiality",
  snippet:
    "Support articles on confidentiality. A comments group minimum hides a group's comments until enough people in that group have responded; it counts people who took the survey, not the number of comments written.",
};

const JOB_POSTING: SearchResult = {
  title: "Culture Amp careers — Senior Applied AI Engineer (Sydney)",
  url: "https://job-boards.greenhouse.io/cultureamp/jobs/8184634",
  snippet:
    "Frontier team building agentic AI: LangGraph for stateful multi-turn agents, Python and React, PGVector, knowledge graphs (Neo4j, Neptune), production LLM evaluation and observability (Langfuse, LangSmith), guardrails, and bias testing.",
};

export const SEED_EMPLOYER = "Culture Amp";

/** The three fixed queries the pipeline issues for this employer -> their cached results. */
export function seedSearchCache(): { query: string; results: SearchResult[] }[] {
  const [overview, tech, product] = buildResearchQueries(SEED_EMPLOYER);
  return [
    { query: overview, results: [HOME, CONFIDENTIALITY_ARTICLE] },
    { query: tech, results: [JOB_POSTING] },
    { query: product, results: [HOME, CONFIDENTIALITY_COLLECTION] },
  ];
}

export const SEED_RESEARCH: CompanyResearch = {
  whatTheyDo:
    "Culture Amp is an employee experience platform. Its products cover engagement surveys (Engage), performance and development (Perform: continuous feedback, reviews, 1-on-1s, goals, 360 feedback) and an AI Coach. It says it is trusted by more than 6,000 companies.",
  domainAndUsers:
    "People analytics and HR tech. HR and people teams run the surveys, managers act on results and coach their teams, employees give feedback and own development goals, and leaders make data-informed decisions. Surveys are described as confidential rather than anonymous: reporting hides groups below a minimum size (usually 5, varying by company), and a group's comments stay hidden until enough people in it have responded.",
  technicalSignals: [
    "The Applied AI role names LangGraph for stateful multi-turn agents, Python and React, PGVector, and graph databases (Neo4j, Neptune).",
    "Production LLM evaluation and observability are expected: LLM-as-judge, eval datasets, human-in-the-loop labelling, threshold scoring, and tracing (Langfuse, LangSmith).",
    "The company states SOC II, ISO and GDPR compliance, and the role calls for bias testing and guardrails that meet enterprise expectations for transparency and fairness.",
  ],
  realisticProblems: [
    {
      title: "Summarising sensitive free-text feedback without exposing anyone",
      whyItIsHard:
        "A comment can identify its author even when the aggregate looks safe — through a small group, through overlapping groups that reveal a small one by subtraction, or through a distinctive detail an LLM helpfully repeats.",
    },
    {
      title: "Deciding how far to trust an AI-written summary",
      whyItIsHard:
        "A fluent summary can assert things no comment supports or generalise from a single voice. Someone in this role must decide how claims are grounded, how that is evaluated at scale, and when a human has to review.",
    },
    {
      title: "Knowing whether a change to a prompt or agent made things better",
      whyItIsHard:
        "Without labelled examples and thresholds you cannot tell whether a change improved behaviour or quietly regressed it — and the cost of a regression here is a broken confidentiality promise.",
    },
  ],
  groundedInSearch: true,
  sources: [HOME, CONFIDENTIALITY_ARTICLE, CONFIDENTIALITY_COLLECTION, JOB_POSTING],
};
