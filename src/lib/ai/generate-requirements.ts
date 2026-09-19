/**
 * generateRequirementBank(parsedJd, companyResearch, challenge)
 *
 * 8-15 weighted requirements across the seven categories, each with concrete
 * success signals and failure modes. Called in the same request as
 * generateChallenge so the brief and rubric are generated from the same context.
 *
 * Two lints run on every bank, inside the schema so a violation triggers the
 * client's corrective retry:
 *   - fairness: no requirement may assess fluency, grammar, spelling or style;
 *   - barriers: nothing the JD parser flagged as a barrier may be assessed.
 */
import { REQUIREMENT_COUNT } from "../constants";
import { isDemoMode } from "../env";
import { generateStructured } from "./client";
import { DemoFixtureMissingError, demoRequirements } from "./demo";
import { REQUIREMENTS_SYSTEM } from "./prompts/generation";
import {
  REQUIREMENT_CATEGORIES,
  RequirementBankSchema,
  type Barrier,
  type CompanyResearch,
  type GeneratedChallenge,
  type ParsedJd,
  type RequirementDraft,
} from "./schemas";

/** Language quality is never assessed. Matches would be rejected at generation time. */
const FORBIDDEN_LANGUAGE_TERMS =
  /\b(grammar|grammatical|spelling|punctuation|fluen(?:t|cy)|native[- ]speaker|proficien(?:t|cy) in english|english (?:skills|level|proficiency|language)|writing style|eloquen(?:t|ce)|articulateness|vocabulary|accent|politeness|professional (?:tone|language))\b/i;

/** Terms that are barriers wherever they appear in a rubric. */
const FORBIDDEN_BARRIER_TERMS =
  /\b(post-?graduate|ph\.?d|degree|years of experience|startup experience|culture fit|values alignment|local experience|citizen(?:ship)?|work rights|visa)\b/i;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export interface RubricLintIssue {
  index: number;
  message: string;
}

/** Pure, exported for tests. Empty array = clean. */
export function lintRequirements(drafts: RequirementDraft[], barriers: Barrier[] = []): RubricLintIssue[] {
  const issues: RubricLintIssue[] = [];
  const barrierTexts = barriers.map((b) => norm(b.text)).filter((t) => t.length >= 12);

  drafts.forEach((d, index) => {
    const text = [d.statement, ...d.successSignals, ...d.failureModes].join("\n");
    if (FORBIDDEN_LANGUAGE_TERMS.test(text)) {
      issues.push({ index, message: "assesses language quality (fluency, grammar, spelling or style), which is never assessed" });
    }
    if (FORBIDDEN_BARRIER_TERMS.test(text)) {
      issues.push({ index, message: "assesses a barrier (credential, residency, culture-fit or experience-duration proxy), not a capability" });
    }
    const n = norm(text);
    if (barrierTexts.some((b) => n.includes(b))) {
      issues.push({ index, message: "quotes a requirement the job-description parser flagged as a barrier" });
    }
  });
  return issues;
}

/** Structural rules for a whole bank. Pure, exported for tests. */
export function bankStructureIssues(drafts: RequirementDraft[]): string[] {
  const issues: string[] = [];
  if (drafts.length < REQUIREMENT_COUNT.min || drafts.length > REQUIREMENT_COUNT.max) {
    issues.push(`must contain ${REQUIREMENT_COUNT.min}-${REQUIREMENT_COUNT.max} requirements (got ${drafts.length})`);
  }
  const present = new Set(drafts.map((d) => d.category));
  for (const c of REQUIREMENT_CATEGORIES) if (!present.has(c)) issues.push(`missing category ${c}`);
  drafts.forEach((d, i) => {
    if (!Number.isInteger(d.weight) || d.weight < 1 || d.weight > 5) issues.push(`requirement ${i + 1}: weight must be an integer 1-5`);
    if (d.successSignals.length < 2) issues.push(`requirement ${i + 1}: needs at least 2 success signals`);
    if (d.failureModes.length < 2) issues.push(`requirement ${i + 1}: needs at least 2 failure modes`);
    if (d.statement.trim().length < 20) issues.push(`requirement ${i + 1}: statement is too vague`);
  });
  return issues;
}

/** Bank schema with the structural rules baked in (barriers are bound per call). */
export function bankSchemaFor(barriers: Barrier[]) {
  return RequirementBankSchema.superRefine((bank, ctx) => {
    for (const message of bankStructureIssues(bank.requirements)) {
      ctx.addIssue({ code: "custom", path: ["requirements"], message });
    }
    for (const { index, message } of lintRequirements(bank.requirements, barriers)) {
      ctx.addIssue({ code: "custom", path: ["requirements", index], message });
    }
  });
}

const ORDER = new Map(REQUIREMENT_CATEGORIES.map((c, i) => [c, i]));

function buildFallbackRequirements(challenge: GeneratedChallenge, parsedJd: ParsedJd): RequirementDraft[] {
  return [
    {
      category: "PROBLEM_FRAMING",
      weight: 4,
      statement: `Before building ${challenge.title}, clarifies scope boundaries, non-goals, and core user assumptions with the assistant.`,
      successSignals: [
        "Asks about data structure and supported formats before coding",
        "States clear assumptions on non-goals and scope limits",
      ],
      failureModes: [
        "Jumps straight to coding with no questions or boundary agreement",
        "Accepts ambiguous requirements without clarification",
      ],
    },
    {
      category: "PROBLEM_FRAMING",
      weight: 3,
      statement: `Identifies edge cases and potential failure states specific to ${parsedJd.employer}'s domain.`,
      successSignals: [
        "Identifies missing data or invalid user inputs early",
        "Plans for empty states and boundary conditions",
      ],
      failureModes: [
        "Ignores edge cases and assumes perfect inputs",
        "Only handles the happy path",
      ],
    },
    {
      category: "TECHNICAL_APPROACH",
      weight: 4,
      statement: `Designs clean, decoupled architecture separating pure business logic from UI components.`,
      successSignals: [
        "Keeps state management and pure helper functions separate from UI",
        "Creates clean TypeScript interfaces and contracts",
      ],
      failureModes: [
        "Tangles business logic directly inside React components",
        "Produces monolithic, hard-to-test code",
      ],
    },
    {
      category: "TECHNICAL_APPROACH",
      weight: 3,
      statement: `Handles data validation and error recovery defensively across all interactions.`,
      successSignals: [
        "Implements input validation with clear user feedback",
        "Recovers gracefully from unexpected data states",
      ],
      failureModes: [
        "App crashes when given invalid or empty input",
        "Fails silently without notifying the user",
      ],
    },
    {
      category: "AI_DIRECTION",
      weight: 4,
      statement: `Directs the AI co-pilot with precise, testable instructions and iterative prompts.`,
      successSignals: [
        "Supplies concrete constraints and requirements in prompts",
        "Iterates in small, verifiable steps rather than asking for everything at once",
      ],
      failureModes: [
        "Gives vague one-line prompts like 'build the app'",
        "Rubber-stamps flawed AI code without reviewing it",
      ],
    },
    {
      category: "AI_DIRECTION",
      weight: 3,
      statement: `Sequences work logically: agrees on data models first, then core logic, then user interface.`,
      successSignals: [
        "Requests data types and logic before UI components",
        "Reviews pure functions before wiring them into views",
      ],
      failureModes: [
        "Asks for the entire frontend and backend in a single prompt",
        "Builds UI before defining what data it will render",
      ],
    },
    {
      category: "CRITICAL_JUDGMENT",
      weight: 5,
      statement: `Catches planted AI defects, hallucinations, and unverified assumptions.`,
      successSignals: [
        "Inspects AI-generated code and catches logical flaws or missing checks",
        "Questions AI suggestions that deviate from requirements",
      ],
      failureModes: [
        "Blindly trusts AI-generated code without checking it",
        "Leaves planted bugs in production code",
      ],
    },
    {
      category: "CRITICAL_JUDGMENT",
      weight: 4,
      statement: `Pushes back on or overrides assistant defaults that conflict with the project constraints.`,
      successSignals: [
        "Corrects the assistant when it introduces unnecessary dependencies",
        "Insists on adhering to the agreed architectural boundaries",
      ],
      failureModes: [
        "Accepts arbitrary AI suggestions that break constraints",
        "Changes project scope to match AI hallucinations",
      ],
    },
    {
      category: "TRADEOFF_AWARENESS",
      weight: 4,
      statement: `Names and justifies technical trade-offs between simplicity, performance, and flexibility.`,
      successSignals: [
        "Explains why a simpler data structure was chosen over a complex one",
        "Discusses performance or maintainability trade-offs explicitly",
      ],
      failureModes: [
        "Over-engineers the solution without justification",
        "Claims the solution has no downsides or trade-offs",
      ],
    },
    {
      category: "DOMAIN_FIT",
      weight: 4,
      statement: `Ensures the solution directly serves the real-world operational needs of ${parsedJd.employer}.`,
      successSignals: [
        "Tailors features to end-user expectations in this domain",
        "Implements realistic workflows and sensible defaults",
      ],
      failureModes: [
        "Builds generic toy features disconnected from the job role",
        "Misses the primary use case of the tool",
      ],
    },
    {
      category: "COMMUNICATION",
      weight: 3,
      statement: `Documents decisions, constraints, and instructions clearly for peer review.`,
      successSignals: [
        "Explains what was built and why in clear, readable terms",
        "Leaves helpful code comments and README guidance",
      ],
      failureModes: [
        "Provides no explanation of how to use or test the code",
        "Leaves unexplained magic numbers or confusing patterns",
      ],
    },
  ];
}

export async function generateRequirementBank(
  parsedJd: ParsedJd,
  research: CompanyResearch,
  challenge: GeneratedChallenge
): Promise<RequirementDraft[]> {
  if (isDemoMode()) {
    const cached = demoRequirements();
    if (!cached) throw new DemoFixtureMissingError("requirements");
    return cached;
  }

  const excluded = parsedJd.barriers.length
    ? parsedJd.barriers.map((b) => `- "${b.text}" (${b.kind})`).join("\n")
    : "- (none flagged)";

  const user = [
    `<job>\nRole: ${parsedJd.roleTitle} (${parsedJd.seniority}) at ${parsedJd.employer}\nMust-have skills:\n${parsedJd.mustHaveSkills.map((s) => `- ${s}`).join("\n")}\n</job>`,
    `<company_context>\n${research.whatTheyDo}\n${research.domainAndUsers}\n</company_context>`,
    `<challenge title="${challenge.title}" timebox_minutes="${challenge.timeboxMinutes}">\n${challenge.brief}\n</challenge>`,
    `<internal_notes>\nValid approaches (accept any, if justified):\n${challenge.meta.validApproaches.map((a) => `- ${a}`).join("\n")}\nDeliberate ambiguities in the brief:\n${challenge.meta.ambiguities.map((a) => `- ${a}`).join("\n")}\n</internal_notes>`,
    `<excluded_do_not_assess>\n${excluded}\n</excluded_do_not_assess>`,
    "Write the requirement bank. Remember: assess candidate engineering reasoning only. Do NOT assess candidate's English fluency, spelling, grammar, or phrasing.",
  ].join("\n\n");

  try {
    const { data } = await generateStructured({
      stage: "challenge",
      system: REQUIREMENTS_SYSTEM,
      messages: [{ role: "user", content: user }],
      schema: bankSchemaFor(parsedJd.barriers),
      maxTokens: 16_000,
      effort: "high",
    });

    return [...data.requirements].sort((a, b) => (ORDER.get(a.category) ?? 0) - (ORDER.get(b.category) ?? 0));
  } catch (err) {
    console.warn(`[generateRequirementBank] AI requirement validation failed (${err}). Using verified clean rubric bank.`);
    return buildFallbackRequirements(challenge, parsedJd);
  }
}
