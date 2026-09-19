/**
 * Zod schemas for every stage of the AI pipeline.
 *
 * Each pipeline function returns structured output validated against one of
 * these. Nothing downstream parses free text. The `*Llm*` schemas are what the
 * model is asked to produce; the plain schemas are what the rest of the app
 * stores and renders once deterministic code has finished the job (e.g. filled
 * in search sources that the model must not be trusted to cite).
 */
import { z } from "zod";

// --- shared ----------------------------------------------------------------

export const REQUIREMENT_CATEGORIES = [
  "PROBLEM_FRAMING",
  "TECHNICAL_APPROACH",
  "AI_DIRECTION",
  "CRITICAL_JUDGMENT",
  "TRADEOFF_AWARENESS",
  "DOMAIN_FIT",
  "COMMUNICATION",
] as const;

export const CategorySchema = z.enum(REQUIREMENT_CATEGORIES);
export type RequirementCategory = z.infer<typeof CategorySchema>;

export const CATEGORY_META: Record<RequirementCategory, { label: string; question: string }> = {
  PROBLEM_FRAMING: { label: "Problem framing", question: "Did they interrogate the brief before building?" },
  TECHNICAL_APPROACH: { label: "Technical approach", question: "Are the architectural choices defensible?" },
  AI_DIRECTION: {
    label: "AI direction",
    question: "Prompting quality: specificity, iteration, course-correction.",
  },
  CRITICAL_JUDGMENT: {
    label: "Critical judgment",
    question: "Did they catch AI errors, push back and verify claims?",
  },
  TRADEOFF_AWARENESS: {
    label: "Trade-off awareness",
    question: "Do they know what they gave up, and why?",
  },
  DOMAIN_FIT: { label: "Domain fit", question: "Does the solution reflect the company's actual context?" },
  COMMUNICATION: {
    label: "Communication",
    question: "Is the reasoning legible to a reviewer? (Clarity of intent — never grammar or fluency.)",
  },
};

// --- 1. parseJobDescription ------------------------------------------------

export const SENIORITY_LEVELS = ["INTERN", "JUNIOR", "MID", "SENIOR", "STAFF_PLUS", "UNSPECIFIED"] as const;

export const BARRIER_KINDS = [
  "LOCAL_EXPERIENCE",
  "WORK_RIGHTS_OR_RESIDENCY",
  "CREDENTIAL_GATE",
  "PEDIGREE_PROXY",
  "CULTURE_FIT_PROXY",
  "NATIVE_LANGUAGE",
  "YEARS_OF_EXPERIENCE",
  "OTHER",
] as const;

export const BarrierSchema = z.object({
  text: z.string().describe("The requirement, quoted verbatim from the job description."),
  kind: z.enum(BARRIER_KINDS),
  reason: z
    .string()
    .describe("One sentence: why this filters people rather than measuring the ability to do the job."),
});
export type Barrier = z.infer<typeof BarrierSchema>;

export const ParsedJdSchema = z.object({
  roleTitle: z.string(),
  seniority: z.enum(SENIORITY_LEVELS),
  employer: z.string().describe('The hiring company. Use "Unknown" if the description does not say.'),
  location: z.string().nullable(),
  domain: z.string().describe("The business/product domain the role works in, in one short phrase."),
  teamContext: z.string().describe("What the team does and who the role works with. One or two sentences."),
  mustHaveSkills: z
    .array(z.string())
    .describe("Concrete, demonstrable skills the role genuinely needs. Never barriers."),
  niceToHaveSkills: z.array(z.string()),
  barriers: z
    .array(BarrierSchema)
    .describe(
      "Requirements that look like barriers rather than genuine needs (local experience, residency, degree/pedigree gates, culture-fit proxies, native-speaker requirements, years-served proxies). They are excluded from the rubric."
    ),
});
export type ParsedJd = z.infer<typeof ParsedJdSchema>;

// --- 2. researchCompany ----------------------------------------------------

export const CompanyResearchLlmSchema = z.object({
  whatTheyDo: z.string(),
  domainAndUsers: z.string().describe("The domain and who uses the product."),
  technicalSignals: z
    .array(z.string())
    .describe("Public technical signals (stack, practices, scale). Only what the sources or JD support."),
  realisticProblems: z
    .array(z.object({ title: z.string(), whyItIsHard: z.string() }))
    .describe("2-3 realistic problems someone in this role would face."),
});
export type CompanyResearchLlm = z.infer<typeof CompanyResearchLlmSchema>;

export const SearchSourceSchema = z.object({ title: z.string(), url: z.string(), snippet: z.string() });

/** Stored form: the model's synthesis plus provenance filled in by code. */
export const CompanyResearchSchema = CompanyResearchLlmSchema.extend({
  /** True only when at least one real search result informed the synthesis. */
  groundedInSearch: z.boolean(),
  /** The search results actually used — supplied by code, never by the model. */
  sources: z.array(SearchSourceSchema),
});
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;

// --- 3. generateChallenge --------------------------------------------------

export const StarterFileSchema = z.object({ path: z.string(), contents: z.string() });

export const ChallengeLlmSchema = z.object({
  title: z.string(),
  domainContext: z.string().describe("Two or three sentences of real company/domain context for the candidate."),
  timeboxMinutes: z.number().int().describe("Between 120 and 240."),
  problem: z.string().describe("The problem to solve, in the company's own domain terms."),
  audience: z.string().describe("Who the solution is for, and what they are trying to do."),
  constraints: z.array(z.string()).describe("Explicit constraints the solution must respect."),
  outOfScope: z.array(z.string()).describe("What the candidate should not build."),
  doneCriteria: z.array(z.string()).describe('What "done" means, as observable outcomes.'),
  validApproaches: z
    .array(z.string())
    .describe("INTERNAL. 2-4 genuinely different, defensible ways to solve it. Never shown to the candidate."),
  deliberateAmbiguities: z
    .array(z.string())
    .describe(
      "INTERNAL. 2-3 places the brief is deliberately underspecified, so a candidate who interrogates the brief can be told apart from one who does not. Never shown to the candidate."
    ),
  starterFiles: z
    .array(StarterFileSchema)
    .describe(
      "Challenge-specific files layered over the base Vite+React starter: sample data, stub modules, a README. Do NOT include package.json, vite.config.js, index.html or src/main.jsx."
    ),
});
export type ChallengeLlm = z.infer<typeof ChallengeLlmSchema>;

export interface GeneratedChallenge {
  title: string;
  brief: string; // markdown, rendered from the structured fields
  domainContext: string;
  timeboxMinutes: number;
  /** Base starter merged with the generated files. */
  starterTemplate: Record<string, string>;
  meta: { validApproaches: string[]; ambiguities: string[]; source: "ai" | "demo-cache" };
}

// --- 4. generateRequirementBank -------------------------------------------

export const RequirementDraftSchema = z.object({
  category: CategorySchema,
  statement: z
    .string()
    .describe("What the candidate must demonstrate, phrased as an observable behaviour or decision."),
  weight: z.number().int().describe("Importance from 1 (minor) to 5 (critical)."),
  successSignals: z
    .array(z.string())
    .describe("Concrete things visible in the chat transcript or file tree that show this was met."),
  failureModes: z
    .array(z.string())
    .describe("Concrete things visible in the transcript or file tree that show it was not."),
});
export type RequirementDraft = z.infer<typeof RequirementDraftSchema>;

export const RequirementBankSchema = z.object({ requirements: z.array(RequirementDraftSchema) });
export type RequirementBank = z.infer<typeof RequirementBankSchema>;

// --- 5. buildAssistant -----------------------------------------------------

export const AssistantTurnSchema = z.object({
  message: z.string().describe("What you tell the candidate: what you did, what you assumed, what to check."),
  files: z
    .array(StarterFileSchema)
    .describe("Complete new contents of every file you create or change. Whole files only — never diffs."),
  reasoning: z
    .string()
    .describe("Your own brief reasoning for this turn: interpretation, key decisions and any open doubts."),
});
export type AssistantTurn = z.infer<typeof AssistantTurnSchema>;

// --- 6. evaluateSubmission -------------------------------------------------

export const EvidenceSchema = z.object({
  type: z.enum(["turn", "file"]),
  ref: z.string().describe('For a turn: its number as a string, e.g. "7". For a file: its exact path.'),
  quote: z.string().describe("A short excerpt copied VERBATIM from that turn or file. Do not paraphrase."),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const RequirementScoreSchema = z.object({
  requirementId: z.string(),
  score: z
    .number()
    .int()
    .nullable()
    .describe("0-5, or null when the transcript and files contain no evidence for this requirement."),
  confidence: z.number().describe("0 to 1: how sure you are of this score given the evidence available."),
  evidence: z.array(EvidenceSchema),
  rationale: z.string().describe("Two or three sentences on why this score, in terms of decisions and reasoning."),
});
export type RequirementScoreLlm = z.infer<typeof RequirementScoreSchema>;

export const EvaluatorOutputSchema = z.object({
  perRequirement: z.array(RequirementScoreSchema),
  strengths: z.array(z.string()).describe("Exactly three."),
  gaps: z.array(z.string()).describe("Exactly three."),
  unadjudicatedDisagreement: z.object({
    present: z
      .boolean()
      .describe(
        "True if the candidate disagreed with or corrected the assistant and you could not tell who was right."
      ),
    turns: z.array(z.number().int()),
    note: z.string(),
  }),
});
export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;

// --- stored evaluation shapes ---------------------------------------------

export interface VerifiedEvidence extends Evidence {
  /** True when the reference exists and the quote really appears in it. */
  verified: boolean;
}

export interface RequirementResult {
  requirementId: string;
  /** 0-5 integer, or null when it could not be scored honestly. */
  score: number | null;
  /** 0-1. Always 0 when score is null. */
  confidence: number;
  evidence: VerifiedEvidence[];
  rationale: string;
  /** Why a score was withheld or altered by the deterministic checks. */
  note?: string;
}

export interface EvaluationResult {
  /** 0-100, weighted over the requirements that could be scored. */
  overallScore: number;
  /** 0-1, weighted over ALL requirements; unscorable ones count as 0. */
  confidence: number;
  /** Fraction (0-1) of total requirement weight that could be scored. */
  coverage: number;
  perRequirement: RequirementResult[];
  strengths: string[];
  gaps: string[];
  unadjudicatedDisagreement: EvaluatorOutput["unadjudicatedDisagreement"];
}
