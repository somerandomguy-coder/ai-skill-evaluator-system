import { z } from "zod";
import { generateStructured } from "../ai/client";
import { isDemoMode, openaiApiKey } from "../env";
import type {
  ChallengeV2,
  RubricRequirement,
  SfiaLevel,
  SfiaProfile,
  SfiaSkillCode,
} from "../types/assessment-v2";

// --- Agent 1: SFIA 8 Profile Schema ---

export const SfiaSkillCodeSchema = z.enum(["PROG", "DESN", "TEST", "DBDS", "ITOP"]);

export const SfiaProfileSchema = z.object({
  level: z.union([z.literal(2), z.literal(3)]).describe("2 for Assist/Junior, 3 for Apply/Mid-level"),
  primarySkills: z.array(SfiaSkillCodeSchema).min(1).max(4),
  attributes: z.object({
    autonomy: z.string(),
    influence: z.string(),
    complexity: z.string(),
    knowledge: z.string(),
    businessSkills: z.string(),
  }),
});

// --- Agent 2: ECD Task Model Schema ---

export const EcdTaskModelSchema = z.object({
  title: z.string(),
  companyName: z.string(),
  briefMarkdown: z.string(),
  technicalInvariants: z.array(z.string()).min(2),
  starterSchemas: z.record(z.string(), z.string()),
});

export type EcdTaskModel = z.infer<typeof EcdTaskModelSchema>;

// --- Agent 3: 7-Category Interaction Rubric Schema ---

export const RubricRequirementSchema = z.object({
  id: z.string(),
  category: z.enum([
    "PROBLEM_FRAMING",
    "TECHNICAL_APPROACH",
    "AI_DIRECTION",
    "CRITICAL_JUDGMENT",
    "TRADEOFF_AWARENESS",
    "DOMAIN_FIT",
    "COMMUNICATION",
  ]),
  weight: z.number().int().min(5).max(30),
  sfiaLevel: z.union([z.literal(2), z.literal(3)]),
  statement: z.string(),
  injectedTrap: z.string().optional(),
  successSignals: z.array(z.string()).min(1),
  failureModes: z.array(z.string()).min(1),
});

export const RubricSchema = z.object({
  requirements: z.array(RubricRequirementSchema).min(5).max(10),
});

// --- Prompts ---

const AGENT_1_SYSTEM = `You are an accredited Australian Computer Society (ACS) skills assessor and SFIA 8 specialist.
Analyze the provided Australian Job Description (JD) and company background.

Classify the role strictly into:
- SFIA Level 2 (Assist / Junior Engineer): Works under routine direction, uses limited discretion, structured tasks, pair-programming expectations.
- SFIA Level 3 (Apply / Mid-Level Engineer): Works under general guidance with milestone reviews, resolves non-routine edge cases, owns component design.

Extract the core SFIA Professional Skill codes (e.g., PROG, DESN, TEST, DBDS, ITOP).
Output valid JSON conforming to the SfiaProfile schema.`;

const AGENT_2_SYSTEM = `You are a Principal Software Architect designing a realistic, company-authentic work-sample assessment brief.
Use the extracted SFIA profile, target company domain, and Australian statutory context.

Rules:
1. DO NOT invent generic CRUD apps, to-do lists, or algorithmic puzzles.
2. Embed real Australian regulatory/industry constraints relevant to the domain (e.g., Single Touch Payroll Phase 2 disaggregation, Privacy Act 1988 data masking, CDR/Open Banking standards, or AEST/AWST timezone reconciliations).
3. Deliberately inject 2-3 "AI Traps"—scenarios where unguided LLMs generate incorrect, naive, or insecure patterns (e.g., floating-point arithmetic for currency, aggregate gross calculation instead of statutory breakdowns, or unmasked sensitive identity fields in logs).
4. Define strict Definition of Done and TypeScript interfaces.

Output valid JSON containing: title, companyName, briefMarkdown, technicalInvariants, and starterSchemas.`;

const AGENT_3_SYSTEM = `You are an assessment designer operating under Mislevy's Evidence-Centered Design (ECD).
Construct a 7-category evaluation rubric that evaluates human-AI collaborative development ("vibe-coding") based on candidate chat transcripts and code diffs.

Categories and baseline weights:
1. PROBLEM_FRAMING (15%): Clarifying invariants/schemas before code generation.
2. TECHNICAL_APPROACH (15%): Modularity, separation of concerns, strict typing.
3. AI_DIRECTION (15%): Modular, phased prompts vs. destructive one-shot prompts.
4. CRITICAL_JUDGMENT (20%): Catching and correcting injected AI traps and hallucinations.
5. TRADEOFF_AWARENESS (10%): Documenting performance vs. simplicity engineering tradeoffs.
6. DOMAIN_FIT (15%): Strict compliance with Australian domain logic.
7. COMMUNICATION (10%): Clean commit hygiene, absence of lazy AI comments.

For each requirement, provide:
- requirement statement aligned with the target SFIA Level
- explicit injectedTrap reference
- observable successSignals (specific actions/quotes seen in chat turns)
- observable failureModes (uncritical vibe-coding traps)

Output valid JSON matching RubricRequirement[].`;

// --- Agent Executions ---

export async function runAgent1SfiaDeconstructor(
  rawJd: string,
  companyName: string
): Promise<SfiaProfile> {
  const isJunior = /junior|grad|graduate|intern|entry|associate/i.test(rawJd);
  const fallbackLevel: SfiaLevel = isJunior ? 2 : 3;

  if (!openaiApiKey() || isDemoMode()) {
    return generateGroundedSfiaProfile(rawJd, fallbackLevel);
  }

  try {
    const result = await generateStructured<SfiaProfile>({
      stage: "parse",
      system: AGENT_1_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Company: ${companyName}\n\nJob Description:\n${rawJd.slice(0, 5000)}`,
        },
      ],
      schema: SfiaProfileSchema,
      maxTokens: 1500,
    });
    return result.data;
  } catch (err) {
    console.warn("[Agent 1 SFIA] Falling back to deterministic SFIA profile:", err);
    return generateGroundedSfiaProfile(rawJd, fallbackLevel);
  }
}

export async function runAgent2EcdTaskSynthesizer(
  sfiaProfile: SfiaProfile,
  rawJd: string,
  companyName: string
): Promise<EcdTaskModel> {
  if (!openaiApiKey() || isDemoMode()) {
    return generateGroundedEcdTaskModel(sfiaProfile, rawJd, companyName);
  }

  try {
    const result = await generateStructured<EcdTaskModel>({
      stage: "challenge",
      system: AGENT_2_SYSTEM,
      messages: [
        {
          role: "user",
          content: `SFIA Profile:\n${JSON.stringify(sfiaProfile, null, 2)}\n\nCompany: ${companyName}\n\nJob Description:\n${rawJd.slice(0, 5000)}`,
        },
      ],
      schema: EcdTaskModelSchema,
      maxTokens: 3000,
    });
    return result.data;
  } catch (err) {
    console.warn("[Agent 2 ECD] Falling back to grounded task model:", err);
    return generateGroundedEcdTaskModel(sfiaProfile, rawJd, companyName);
  }
}

export async function runAgent3RubricGenerator(
  sfiaProfile: SfiaProfile,
  taskModel: EcdTaskModel
): Promise<RubricRequirement[]> {
  if (!openaiApiKey() || isDemoMode()) {
    return generateGroundedRubric(sfiaProfile, taskModel);
  }

  try {
    const result = await generateStructured<{ requirements: RubricRequirement[] }>({
      stage: "challenge",
      system: AGENT_3_SYSTEM,
      messages: [
        {
          role: "user",
          content: `SFIA Profile:\n${JSON.stringify(sfiaProfile, null, 2)}\n\nTask Model:\n${JSON.stringify(taskModel, null, 2)}`,
        },
      ],
      schema: RubricSchema,
      maxTokens: 3500,
    });
    return result.data.requirements;
  } catch (err) {
    console.warn("[Agent 3 Rubric] Falling back to grounded rubric:", err);
    return generateGroundedRubric(sfiaProfile, taskModel);
  }
}

/**
 * End-to-end Tier 3 agentic generation pipeline executing Agent 1, Agent 2, and Agent 3.
 */
export async function runAgenticGenerationPipeline(
  rawJd: string,
  companyName: string,
  jdEmbedding?: number[]
): Promise<ChallengeV2> {
  const sfiaProfile = await runAgent1SfiaDeconstructor(rawJd, companyName);
  const taskModel = await runAgent2EcdTaskSynthesizer(sfiaProfile, rawJd, companyName);
  const rubric = await runAgent3RubricGenerator(sfiaProfile, taskModel);

  const challengeId = `gen-v2-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const challenge: ChallengeV2 = {
    id: challengeId,
    tier: "TIER_3_GENERATED",
    companyName: taskModel.companyName || companyName,
    roleTitle: taskModel.title,
    embeddingVector: jdEmbedding,
    sfiaProfile,
    briefMarkdown: taskModel.briefMarkdown,
    technicalInvariants: taskModel.technicalInvariants,
    starterSchemas: taskModel.starterSchemas,
    rubric,
    verification: {
      status: "PENDING",
    },
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 1,
    },
  };

  return challenge;
}

// --- Grounded Psychometric Fallback Generators ---

function generateGroundedSfiaProfile(rawJd: string, level: SfiaLevel): SfiaProfile {
  const isLevel2 = level === 2;
  const skills: SfiaSkillCode[] = ["PROG", "TEST"];
  if (/database|sql|postgres|data/i.test(rawJd)) skills.push("DBDS");
  if (/design|architect|system|distributed/i.test(rawJd)) skills.push("DESN");
  if (/devops|cloud|aws|docker|kubernetes/i.test(rawJd)) skills.push("ITOP");

  return {
    level,
    primarySkills: skills.slice(0, 4),
    attributes: {
      autonomy: isLevel2
        ? "Works under routine direction with milestone check-ins; uses discretion to resolve standard issues."
        : "Works under general guidance; acts on own initiative within agreed boundaries; owns technical decisions.",
      influence: isLevel2
        ? "Interacts immediately with team members and mentor; contributes to code reviews."
        : "Influences component architecture; negotiates technical interfaces with external stakeholders.",
      complexity: isLevel2
        ? "Performs structured software development tasks requiring routine analytical thinking."
        : "Resolves non-routine technical complexity and balances architectural trade-offs.",
      knowledge: isLevel2
        ? "Applies practical technical knowledge of modern languages, frameworks, and testing tools."
        : "Maintains deep knowledge of statutory standards, data modeling, and performance characteristics.",
      businessSkills: isLevel2
        ? "Communicates clearly in technical pairs; demonstrates attention to detail and anti-bias principles."
        : "Analyzes business needs against Australian compliance requirements; defends engineering choices.",
    },
  };
}

function generateGroundedEcdTaskModel(
  sfiaProfile: SfiaProfile,
  rawJd: string,
  companyName: string
): EcdTaskModel {
  const isFinance = /payroll|tax|payment|finance|superannuation|accounting|bank/i.test(rawJd);
  const isCdr = /banking|cdr|open banking|account|security|oauth/i.test(rawJd);

  const effectiveCompany = companyName || "Australian Technology Services";

  if (isFinance) {
    return {
      title: `${effectiveCompany} — Australian Statutory Wage & Tax Calculation Service`,
      companyName: effectiveCompany,
      briefMarkdown: `# Australian Statutory Wage & Tax Disaggregation Engine

## Context & Objectives
You are tasked with engineering a core calculation module for **${effectiveCompany}**. The platform must adhere to Australian Taxation Office (ATO) statutory reporting guidelines, separating ordinary earnings from overtime, superannuation contributions, and withholding taxes.

## Australian Statutory Constraints
1. **Integer Precision**: All money must be processed in integer cents. Floating-point division and arithmetic are prohibited for currency.
2. **Privacy Act 1988 Compliance**: Tax File Numbers (TFN) and superannuation member identifiers must be masked in application output.
3. **AEST Timezone Invariant**: Pay periods must be resolved according to Australian Eastern Standard Time (AEST/AEDT).

## Definition of Done
- Complete calculation function passing sample pay runs.
- Unit tests validating cent-rounding edge cases.
- Safe error sanitization preventing identity leaks.`,
      technicalInvariants: [
        "Monetary values must be stored and manipulated as integer cents (100 cents = $1.00).",
        "TFNs must be masked as '***-***-XXX' in all serialized responses.",
        "Overtime rates must explicitly apply 1.5x and 2.0x multipliers without float drift.",
      ],
      starterSchemas: {
        "statutory-types.ts": `export interface PayRunItem {
  id: string;
  ordinaryHours: number;
  hourlyRateCents: number;
  overtimeHours: number;
  superRatePct: number; // e.g. 11.5
}

export interface StatutoryBreakdown {
  grossCents: number;
  taxWithheldCents: number;
  superContributionCents: number;
  netPayCents: number;
}`,
      },
    };
  }

  return {
    title: `${effectiveCompany} — Resilient API Gateway with Australian Privacy Masking`,
    companyName: effectiveCompany,
    briefMarkdown: `# Enterprise Workflow & Data Sanitization Component

## Context & Objectives
Build a production-grade service module for **${effectiveCompany}** that handles workflow events, enforces strict data scoping, and guarantees compliance with the Australian Privacy Act 1988.

## Constraints
1. **PII Masking**: Ensure phone numbers, national IDs, and email addresses are masked prior to persistence.
2. **Deterministic Validation**: Validate all inputs using strict schema boundaries.
3. **Observable Verification**: Provide clear error reasons when input fails domain invariants.`,
    technicalInvariants: [
      "No plain text PII in system logs or external error responses.",
      "Input schemas must be verified with explicit type checks.",
      "Time calculations must be anchored to explicit timezone offsets.",
    ],
    starterSchemas: {
      "service-types.ts": `export interface WorkflowInput {
  requestId: string;
  userToken: string;
  payload: Record<string, unknown>;
  timestampIso: string;
}

export interface WorkflowResult {
  success: boolean;
  sanitizedSummary: string;
  auditHash: string;
}`,
    },
  };
}

function generateGroundedRubric(
  sfiaProfile: SfiaProfile,
  taskModel: EcdTaskModel
): RubricRequirement[] {
  const level = sfiaProfile.level;

  return [
    {
      id: "rubric-1",
      category: "PROBLEM_FRAMING",
      weight: 15,
      sfiaLevel: level,
      statement: "Interrogates domain invariants and schema constraints before invoking code generation.",
      successSignals: [
        "Candidate asks AI assistant to confirm rounding rules and statutory limits before writing logic.",
        "Candidate inspects data structures and non-goals before code synthesis.",
      ],
      failureModes: [
        "Jumps straight into generating full application without scoping requirements.",
        "Accepts ambiguous requirements without verification.",
      ],
    },
    {
      id: "rubric-2",
      category: "TECHNICAL_APPROACH",
      weight: 15,
      sfiaLevel: level,
      statement: "Designs modular architecture with clear separation of business logic from I/O.",
      successSignals: [
        "Writes pure functions for core domain calculations.",
        "Uses strict TypeScript contracts without defaulting to 'any'.",
      ],
      failureModes: [
        "Writes monolithic files mixing UI, network calls, and business logic.",
        "Lacks clear type definitions.",
      ],
    },
    {
      id: "rubric-3",
      category: "AI_DIRECTION",
      weight: 15,
      sfiaLevel: level,
      statement: "Directs the AI assistant through structured, phased prompts rather than destructive one-shot generation.",
      successSignals: [
        "Guides AI step-by-step: interfaces, test fixtures, core logic, and UI bindings.",
        "Corrects erroneous AI assumptions immediately.",
      ],
      failureModes: [
        "Submits vague prompts like 'fix everything' or 'build the app'.",
        "Blindly copies code blocks without reading.",
      ],
    },
    {
      id: "rubric-4",
      category: "CRITICAL_JUDGMENT",
      weight: 20,
      sfiaLevel: level,
      statement: "Identifies and refactors injected AI traps, hallucinations, and security flaws.",
      injectedTrap: "AI generates floating-point math for financial values or logs raw sensitive identifiers in error handlers.",
      successSignals: [
        "Catches floating point calculation bugs and converts to integer arithmetic.",
        "Replaces unmasked credential/identity logs with redacting helpers.",
      ],
      failureModes: [
        "Leaves floating-point rounding bugs in production code.",
        "Permits unmasked personal identifiers in log statements.",
      ],
    },
    {
      id: "rubric-5",
      category: "TRADEOFF_AWARENESS",
      weight: 10,
      sfiaLevel: level,
      statement: "Documents and defends performance, simplicity, and architectural trade-offs.",
      successSignals: [
        "Explains trade-offs between external dependencies and native implementations.",
        "Discusses edge cases and potential scaling bottlenecks.",
      ],
      failureModes: [
        "Claims implementation has zero trade-offs.",
      ],
    },
    {
      id: "rubric-6",
      category: "DOMAIN_FIT",
      weight: 15,
      sfiaLevel: level,
      statement: "Adheres strictly to target company context and Australian compliance regulations.",
      successSignals: [
        "Complies with Australian privacy and taxation conventions.",
        "Uses domain-specific terminology accurately.",
      ],
      failureModes: [
        "Uses irrelevant foreign terminology (e.g. US 401k, SSN).",
      ],
    },
    {
      id: "rubric-7",
      category: "COMMUNICATION",
      weight: 10,
      sfiaLevel: level,
      statement: "Maintains professional git commit history and removes placeholder AI comments.",
      successSignals: [
        "Writes clear commit messages explaining the 'why' behind changes.",
        "Cleans up commented-out scaffolding code.",
      ],
      failureModes: [
        "Submits commits labeled 'update' with messy formatting and dead code.",
      ],
    },
  ];
}
