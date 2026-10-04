import type { ChallengeV2 } from "../types/assessment-v2";

/**
 * Pre-seeded bank of certified, mentor-verified Tier 1 challenges.
 * Grounded in Australian statutory context and SFIA 9 standards.
 */
export const VERIFIED_CHALLENGE_BANK: ChallengeV2[] = [
  {
    id: "verified-stp2-engine",
    tier: "TIER_1_VERIFIED",
    companyName: "Employment Hero / Australian Payroll Systems",
    roleTitle: "Mid-Level Full-Stack Engineer — STP Phase 2 Disaggregation",
    sfiaProfile: {
      level: 3, // Apply
      primarySkills: ["PROG", "DESN", "DBDS", "TEST"],
      attributes: {
        autonomy: "Works under general guidance with milestone reviews; resolves non-routine compliance discrepancies.",
        influence: "Interacts with payroll domain experts and downstream ATO reporting components.",
        complexity: "Performs complex statutory wage disaggregations across variable award rates.",
        knowledge: "Comprehensive understanding of ATO Single Touch Payroll Phase 2 specifications and decimal arithmetic.",
        businessSkills: "Demonstrates high attention to detail in statutory calculations and user communication.",
      },
    },
    briefMarkdown: `# Single Touch Payroll (STP) Phase 2 Disaggregation Engine

## The Problem
Under Australian Taxation Office (ATO) Single Touch Payroll Phase 2 reporting, employers must disaggregate gross pay into discrete statutory components rather than reporting a single aggregate gross sum. You will build an STP Phase 2 pay-run processor that ingests employee timesheets, award penalty rates, and salary sacrifice arrangements, calculating itemised tax withholdings and disaggregated earnings.

## Australian Statutory Constraints
1. **Gross Disaggregation**: You must separately report:
   - Gross (Ordinary Hours)
   - Paid Leave (Annual, Personal, Long Service)
   - Overtime and Penalty Rates
   - Bonuses and Commissions
   - Salary Sacrifice (Superannuation and other exempt benefits)
2. **Precision & ATO Rounding**: Floating-point math is strictly forbidden. All monetary figures must be computed with integer cents or fixed-point decimal arithmetic.
3. **Privacy Act 1988 Compliance**: Tax File Numbers (TFN) must never be logged in plain text or exposed in debug errors.

## Definition of Done
- Disaggregation engine produces exact ATO-compliant JSON payloads for sample pay runs.
- Cent-rounding unit tests pass across fractional hourly pay calculations.
- Error payloads redact sensitive employee identifiers.`,
    technicalInvariants: [
      "Monetary calculations must use integer cents (e.g. 1050 cents = $10.50) or fixed decimal instances.",
      "Salary sacrifice components must disaggregate into either 'S' (superannuation) or 'O' (other).",
      "TFN fields must be masked (e.g., '***-***-123') in any public API response or log statement.",
      "AEST/AEDT timezone boundaries must be respected when attributing pay periods.",
    ],
    starterSchemas: {
      "stp2-types.ts": `export interface EmployeePayRunInput {
  employeeId: string;
  tfn: string;
  ordinaryHours: number;
  hourlyRateCents: number;
  overtimeHours: number;
  overtimeMultiplier: number;
  annualLeaveHours: number;
  salarySacrificeSuperCents: number;
}

export interface Stp2DisaggregatedOutput {
  employeeId: string;
  ordinaryGrossCents: number;
  overtimeCents: number;
  paidLeaveCents: number;
  salarySacrificeSuperCents: number;
  totalWithholdingTaxCents: number;
  netPayCents: number;
  generatedAtIso: string;
}`,
    },
    rubric: [
      {
        id: "stp2-req-1",
        category: "PROBLEM_FRAMING",
        weight: 15,
        sfiaLevel: 3,
        statement: "Interrogates the brief to clarify STP Phase 2 disaggregation boundaries and cents-precision invariants before generating code.",
        successSignals: [
          "Candidate asks AI assistant to verify whether floating point or integer cents will be used.",
          "Candidate explicitly lists the 5 required ATO disaggregation categories before asking for implementations.",
        ],
        failureModes: [
          "Accepts a generic naive payroll calculator without verifying ATO STP2 requirements.",
          "Generates unvalidated code in a single prompt.",
        ],
      },
      {
        id: "stp2-req-2",
        category: "TECHNICAL_APPROACH",
        weight: 15,
        sfiaLevel: 3,
        statement: "Designs modular, strongly typed calculation functions separating pure payroll math from UI and I/O handlers.",
        successSignals: [
          "Separates calculateDisaggregation() into a pure function with comprehensive unit tests.",
          "Uses strict TypeScript interfaces without 'any'.",
        ],
        failureModes: [
          "Couples database/API calls directly into calculation loops.",
          "Uses untyped dictionary objects.",
        ],
      },
      {
        id: "stp2-req-3",
        category: "AI_DIRECTION",
        weight: 15,
        sfiaLevel: 3,
        statement: "Directs the AI assistant with phased, iterative prompts rather than massive all-in-one generation prompts.",
        successSignals: [
          "Directs AI in small steps: (1) schema, (2) unit test cases, (3) calculation logic, (4) UI component.",
          "Provides constructive feedback when the AI omits overtime penalty multipliers.",
        ],
        failureModes: [
          "Submits single prompt asking AI to 'build whole payroll app' and blindly commits the result.",
        ],
      },
      {
        id: "stp2-req-4",
        category: "CRITICAL_JUDGMENT",
        weight: 20,
        sfiaLevel: 3,
        statement: "Detects and corrects deliberate AI traps including floating-point rounding errors and unmasked Tax File Numbers (TFN).",
        injectedTrap: "AI generates Number(0.1 + 0.2) float math for currency and console.log(employee.tfn) in error handlers.",
        successSignals: [
          "Catches the AI's use of floating-point arithmetic and refactors to integer cents.",
          "Replaces plain text TFN logging with a redaction mask like tfnMask().",
        ],
        failureModes: [
          "Permits IEEE-754 float math (e.g. 19.999999999997) to reach statutory reporting payloads.",
          "Leaves full 9-digit TFN visible in log statements or browser console.",
        ],
      },
      {
        id: "stp2-req-5",
        category: "TRADEOFF_AWARENESS",
        weight: 10,
        sfiaLevel: 3,
        statement: "Articulates performance and correctness trade-offs between big.js/decimal libraries versus integer cent representations.",
        successSignals: [
          "Documents why integer cents were chosen over external dependencies or floats.",
          "Discusses edge case handling for half-cent ATO rounding.",
        ],
        failureModes: [
          "Claims the calculation has no trade-offs or ignores decimal precision consequences.",
        ],
      },
      {
        id: "stp2-req-6",
        category: "DOMAIN_FIT",
        weight: 15,
        sfiaLevel: 3,
        statement: "Adheres strictly to Australian payroll terminology (Ordinary Time Earnings, PAYG withholding, Superannuation Guarantee).",
        successSignals: [
          "Uses Australian tax nomenclature (PAYG, Super Guarantee, OTE) rather than US concepts (401k, W-2, FICA).",
          "Calculates Superannuation at the correct statutory rate (currently 11.5% - 12%).",
        ],
        failureModes: [
          "Includes US tax terms like 'State Tax' or 'Social Security Number'.",
        ],
      },
      {
        id: "stp2-req-7",
        category: "COMMUNICATION",
        weight: 10,
        sfiaLevel: 3,
        statement: "Maintains clear commit history, precise variable naming, and eliminates placeholder AI comments.",
        successSignals: [
          "Writes descriptive commit messages outlining specific STP2 fixes.",
          "Cleans up generic comments like '// AI generated code here'.",
        ],
        failureModes: [
          "Commits messy code with dead boilerplate and empty TODO comments.",
        ],
      },
    ],
    verification: {
      status: "APPROVED",
      badge: {
        mentorId: "mentor-dr-vance",
        mentorName: "Dr. Alistair Vance, CPEng",
        verifiedAt: "2026-03-15T09:30:00Z",
        auditScore: 19,
        notes: "Exemplary fidelity to ATO Single Touch Payroll Phase 2 specifications. Injected floating-point and TFN traps are authentic and highly discriminative.",
      },
    },
    metadata: {
      createdAt: "2026-03-15T09:30:00Z",
      usageCount: 42,
    },
  },
  {
    id: "verified-cdr-gateway",
    tier: "TIER_1_VERIFIED",
    companyName: "Macquarie / Up Bank / Australian CDR Platform",
    roleTitle: "Mid-Level Backend Engineer — Consumer Data Right (CDR) Consent Gateway",
    sfiaProfile: {
      level: 3, // Apply
      primarySkills: ["PROG", "DESN", "ITOP", "TEST"],
      attributes: {
        autonomy: "Owns component design for ACCC-compliant CDR consumer consent management.",
        influence: "Collaborates with security architecture and external data recipient (ADR) systems.",
        complexity: "Handles cryptographic token signing, consent lifecycles, and Privacy Act PII masking.",
        knowledge: "Deep knowledge of CDR Consumer Experience (CX) guidelines and Open Banking standards.",
        businessSkills: "Rigorous adherence to regulatory compliance and audit trail provenance.",
      },
    },
    briefMarkdown: `# Consumer Data Right (CDR) Consent & Scoping Gateway

## The Problem
Under Australian Consumer Data Right (CDR) legislation, Accredited Data Recipients (ADRs) and Data Holders must manage fine-grained, time-bound customer consent for financial accounts. You will build a CDR Consent Gateway that validates incoming consent authorizations, scopes account data access, and automatically revokes access when consent expires or is withdrawn.

## Australian Statutory Constraints
1. **CDR Arrangement Rules**: Consents must expire after a maximum duration of 12 months, with automated hourly reconciliation against revocation registries.
2. **PII Masking (Privacy Act 1988)**: Australian BSB and Account numbers must be masked (e.g., '083-*** ... 1234') in telemetry and standard error traces.
3. **AEST Timezone Invariant**: Consent expiry calculations must be anchored to Australian Eastern Standard Time (AEST/AEDT) rather than browser-local timezones.

## Definition of Done
- Gateway grants access only to actively consented scopes (e.g. 'bank:accounts.basic:read').
- Withdrawn consents instantly reject subsequent data requests.
- Privacy-compliant error sanitization middleware strips sensitive identifiers.`,
    technicalInvariants: [
      "Consent duration must not exceed 365 days from creation.",
      "Account numbers and BSBs must be masked in log events.",
      "Revocation endpoints must be idempotent.",
      "All expiry dates must use ISO 8601 with explicit Australian timezone offsets (+10:00 / +11:00).",
    ],
    starterSchemas: {
      "cdr-types.ts": `export type CdrScope = 'bank:accounts.basic:read' | 'bank:accounts.detail:read' | 'bank:transactions:read';

export interface ConsentRecord {
  consentId: string;
  customerId: string;
  scopes: CdrScope[];
  status: 'AUTHORISED' | 'REVOKED' | 'EXPIRED';
  authorisedAtIso: string;
  expiresAtIso: string;
}

export interface CdrAccessRequest {
  consentId: string;
  requestedScope: CdrScope;
  timestampIso: string;
}`,
    },
    rubric: [
      {
        id: "cdr-req-1",
        category: "PROBLEM_FRAMING",
        weight: 15,
        sfiaLevel: 3,
        statement: "Interrogates CDR scope boundaries and AEST timezone expiry rules prior to writing code.",
        successSignals: [
          "Questions the assistant on whether daylight savings transitions affect consent expiration.",
        ],
        failureModes: [
          "Begins writing endpoints without scoping definitions.",
        ],
      },
      {
        id: "cdr-req-2",
        category: "TECHNICAL_APPROACH",
        weight: 15,
        sfiaLevel: 3,
        statement: "Implements clean middleware pattern for consent validation with explicit separation of authorization from data retrieval.",
        successSignals: [
          "Uses typed middleware that inspects consent before dispatching to controller.",
        ],
        failureModes: [
          "Embeds authorization checks randomly throughout business logic.",
        ],
      },
      {
        id: "cdr-req-3",
        category: "AI_DIRECTION",
        weight: 15,
        sfiaLevel: 3,
        statement: "Directs the AI to write unit tests for boundary conditions (e.g., consent expiring at 23:59:59 AEST).",
        successSignals: [
          "Prompts the assistant with specific edge cases: revoked consent, 1 second past expiry, invalid scope.",
        ],
        failureModes: [
          "Accepts code with zero automated boundary verification.",
        ],
      },
      {
        id: "cdr-req-4",
        category: "CRITICAL_JUDGMENT",
        weight: 20,
        sfiaLevel: 3,
        statement: "Identifies and fixes the AI's attempt to use browser-local Date.now() without AEST offset reconciliation.",
        injectedTrap: "AI implements new Date() comparison assuming UTC matches Sydney local time, creating 10-hour access leak.",
        successSignals: [
          "Catches the local timestamp comparison bug and refactors to explicit UTC/AEST instant comparison.",
        ],
        failureModes: [
          "Leaves raw unanchored Date.now() in production check.",
        ],
      },
      {
        id: "cdr-req-5",
        category: "TRADEOFF_AWARENESS",
        weight: 10,
        sfiaLevel: 3,
        statement: "Explains token revocation caching tradeoffs (Redis cache vs synchronous DB read for real-time revocation).",
        successSignals: [
          "Documents why synchronous revocation checks protect against unauthorized banking data leakage.",
        ],
        failureModes: [
          "Assumes cached consent tokens never need validation against revocation lists.",
        ],
      },
      {
        id: "cdr-req-6",
        category: "DOMAIN_FIT",
        weight: 15,
        sfiaLevel: 3,
        statement: "Conforms to ACCC Consumer Data Right standards, handling 403 Forbidden with standard CDR error codes.",
        successSignals: [
          "Returns standard CDR error envelope with 'urn:au-cds:error:cds-all:Authorisation/Revoked'.",
        ],
        failureModes: [
          "Returns generic 500 error or unstructured JSON string.",
        ],
      },
      {
        id: "cdr-req-7",
        category: "COMMUNICATION",
        weight: 10,
        sfiaLevel: 3,
        statement: "Documents security assumptions and error handling clearly for auditing mentors.",
        successSignals: [
          "Provides concise README section on CDR privacy and consent verification.",
        ],
        failureModes: [
          "Leaves no documentation on how consent tokens are signed or verified.",
        ],
      },
    ],
    verification: {
      status: "APPROVED",
      badge: {
        mentorId: "mentor-sarah-chen",
        mentorName: "Sarah Chen, Principal CDR Architect",
        verifiedAt: "2026-03-18T14:15:00Z",
        auditScore: 18,
        notes: "Meets Australian Open Banking CDR v1.23 specifications. Injected timezone leak and PII exposure traps test genuine engineering discernment.",
      },
    },
    metadata: {
      createdAt: "2026-03-18T14:15:00Z",
      usageCount: 38,
    },
  },
  {
    id: "verified-talentai-screener",
    tier: "TIER_1_VERIFIED",
    companyName: "TalentAI / Fair Hiring Systems",
    roleTitle: "Full-Stack Engineer — AI Resume Screener & Bias Filter",
    sfiaProfile: {
      level: 2, // Assist
      primarySkills: ["PROG", "TEST", "DESN"],
      attributes: {
        autonomy: "Works under routine direction with structured guidance; exercises limited discretion on user interface flows.",
        influence: "Interacts immediately with design mentors and technical leads.",
        complexity: "Performs structured web tasks with clear success criteria.",
        knowledge: "Understands fundamental web programming, React, and test automation.",
        businessSkills: "Follows team conventions, anti-discrimination guidelines, and pair-programming norms.",
      },
    },
    briefMarkdown: `# AI Resume Screener & Bias-Resistant Applicant Review

## The Problem
Recruitment teams review hundreds of technical resumes and increasingly rely on AI copilots. However, unguided AI screening can hallucinate non-existent candidate skills or propagate illegal demographic biases. You will build a review interface that parses candidate submissions, highlights verifiable skills, and flags AI hallucinations.

## Constraints & Requirements
1. **Bias Mitigation**: Automatically mask non-job-relevant demographic proxies (e.g. school name, graduation date, candidate photo) under Fair Work guidelines.
2. **Hallucination Verification**: Require human recruiters to verify that claimed skills actually appear in the raw resume excerpt before approving.
3. **Interactive Filter**: Filter candidates by must-have skills (React, TypeScript) and minimum verified score.`,
    technicalInvariants: [
      "Candidate personal details (name, email, school) must be masked in the blind review mode.",
      "A candidate cannot be approved if any unverified skill claim is flagged.",
      "All screening state must survive browser tab refresh (persisted in local storage or memory).",
    ],
    starterSchemas: {
      "candidate-types.ts": `export interface CandidateProfile {
  id: string;
  anonymisedId: string;
  extractedSkills: { skill: string; verifiedInText: boolean; excerpt: string }[];
  matchScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}`,
    },
    rubric: [
      {
        id: "talent-req-1",
        category: "PROBLEM_FRAMING",
        weight: 15,
        sfiaLevel: 2,
        statement: "Interrogates the brief to clarify which fields should be masked in blind review mode before writing code.",
        successSignals: [
          "Candidate confirms the list of demographic proxy fields that must be masked.",
        ],
        failureModes: [
          "Begins building UI without verifying masking requirements.",
        ],
      },
      {
        id: "talent-req-2",
        category: "TECHNICAL_APPROACH",
        weight: 15,
        sfiaLevel: 2,
        statement: "Constructs accessible, responsive React components with clean state management and no unnecessary rerenders.",
        successSignals: [
          "Uses useState/useMemo cleanly to handle candidate list filtering.",
        ],
        failureModes: [
          "Mutates state directly or causes infinite re-render loops.",
        ],
      },
      {
        id: "talent-req-3",
        category: "AI_DIRECTION",
        weight: 15,
        sfiaLevel: 2,
        statement: "Prompts the AI helper in focused increments, specifying exact UI props and mock candidate data structures.",
        successSignals: [
          "Asks AI for a single component at a time (e.g. FilterBar, CandidateCard).",
        ],
        failureModes: [
          "Submits single prompt asking for 'full resume screener' without guidance.",
        ],
      },
      {
        id: "talent-req-4",
        category: "CRITICAL_JUDGMENT",
        weight: 20,
        sfiaLevel: 2,
        statement: "Catches AI hallucinations where unmentioned skills are marked as verified, correcting the matching logic.",
        injectedTrap: "AI creates a mock candidate that marks 'Kubernetes' as verified even though the resume text contains no mention of it.",
        successSignals: [
          "Candidate checks the text excerpt and flags the missing citation.",
        ],
        failureModes: [
          "Approves candidates without verifying that excerpts substantiate the skill.",
        ],
      },
      {
        id: "talent-req-5",
        category: "TRADEOFF_AWARENESS",
        weight: 10,
        sfiaLevel: 2,
        statement: "Explains UI/UX trade-offs between instant client-side filtering versus server-side pagination.",
        successSignals: [
          "Mentions that client-side filtering is fast for 50 candidates but server-side would be needed at scale.",
        ],
        failureModes: [
          "Claims current solution scales indefinitely without modification.",
        ],
      },
      {
        id: "talent-req-6",
        category: "DOMAIN_FIT",
        weight: 15,
        sfiaLevel: 2,
        statement: "Respects Fair Work anti-bias principles by strictly separating job-relevant skills from personal data.",
        successSignals: [
          "Displays blind review toggle clearly and tests that school/age details remain hidden.",
        ],
        failureModes: [
          "Accidentally displays candidate age or graduation year in review cards.",
        ],
      },
      {
        id: "talent-req-7",
        category: "COMMUNICATION",
        weight: 10,
        sfiaLevel: 2,
        statement: "Maintains clear commit history, clean component names, and self-documenting code.",
        successSignals: [
          "Meaningful component names (CandidateCard, SkillBadge, ReviewModal).",
        ],
        failureModes: [
          "Uses names like Component1, Div2, or leaves commented out dead code.",
        ],
      },
    ],
    verification: {
      status: "APPROVED",
      badge: {
        mentorId: "mentor-marcus-brody",
        mentorName: "Marcus Brody, ACS Senior Member",
        verifiedAt: "2026-03-20T11:00:00Z",
        auditScore: 17,
        notes: "Grounded task perfectly calibrated for SFIA Level 2 (Assist). The hallucination trap directly measures candidate AI vigilance.",
      },
    },
    metadata: {
      createdAt: "2026-03-20T11:00:00Z",
      usageCount: 65,
    },
  },
  {
    id: "verified-tgd-rts-sim",
    tier: "TIER_1_VERIFIED",
    companyName: "Total Game Development",
    roleTitle: "Junior AI & Simulation Systems Developer (Web / RTS)",
    sfiaProfile: {
      level: 2, // Assist / Junior Developer
      primarySkills: ["PROG", "DESN", "TEST"],
      attributes: {
        autonomy: "Works under routine direction with milestone reviews; implements modular simulation algorithms and deterministic state updates.",
        influence: "Collaborates directly with lead engine architect and gameplay systems engineers.",
        complexity: "Handles deterministic tick-loop state transitions, grid-based spatial queries, and render-state decoupling.",
        knowledge: "Understands game simulation architectures, fixed-step accumulators, spatial indexing, and browser performance budgets.",
        businessSkills: "Communicates algorithmic tradeoffs clearly and maintains zero-trust vigilance over AI-generated code.",
      },
    },
    briefMarkdown: `# Deterministic 2D RTS Unit Simulation Engine

## The Problem
Total Game Development is an independent Melbourne studio engineering real-time strategy (RTS) and sandbox simulation experiences. In networked or deterministic simulations, variable frame delta times cause desynchronization across client frames. You will build the \`DeterministicUnitSimulationEngine\`—an entity manager that executes a fixed 20Hz (50ms) simulation tick, updates unit positions toward target coordinates on a 2D grid, manages basic state transitions (\`IDLE\`, \`MOVING\`, \`ATTACKING\`), and decouples state updates from rendering.

## Technical Invariants & Simulation Constraints
1. **Fixed 20Hz Tick Rate (50ms)**: Simulation state updates must execute inside a fixed-step accumulator. Floating-point variable frame delta time (\`x += speed * dt\`) is strictly forbidden for deterministic state progression.
2. **Spatial Partitioning Budget**: Proximity and attack range queries must not use O(N²) nested entity comparisons. Use a spatial hash grid or bucketed 2D index to maintain a 60 FPS rendering budget with 50+ active entities.
3. **Double-Buffering & State Isolation**: Direct in-loop coordinate mutations are prohibited. Unit updates must be snapshot-isolated or double-buffered to prevent update-order race conditions.
4. **Decoupled Rendering**: The animation render loop (\`requestAnimationFrame\`) must interpolate from the latest simulation tick snapshot, never directly mutating simulation state.

## Definition of Done
- 20Hz simulation tick loop executes with exact 50ms accumulator steps.
- Proximity queries efficiently retrieve neighbouring targets using spatial indexing.
- Interactive canvas renders smooth movement decoupled from simulation tick updates.
- Unit state transitions (\`IDLE\` -> \`MOVING\` -> \`ATTACKING\`) are covered by automated unit tests.`,
    technicalInvariants: [
      "Simulation tick loop must be fixed at 20Hz (50ms interval) with accumulator pattern to guarantee determinism across client frames.",
      "Proximity queries for unit targeting must avoid O(N²) pairwise comparisons using spatial hash partitioning.",
      "Simulation state updates must be double-buffered or snapshot-isolated to prevent in-loop coordinate mutation races.",
      "Rendering loops (requestAnimationFrame) must interpolate from the latest fixed simulation tick, never directly mutating simulation state.",
    ],
    starterSchemas: {
      "simulation-types.ts": `export type UnitState = 'IDLE' | 'MOVING' | 'ATTACKING';

export interface Position {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  position: Position;
  targetPosition: Position;
  speed: number;
  state: UnitState;
  attackRange: number;
  targetUnitId: string | null;
}

export interface SpatialGridConfig {
  cellSize: number;
  width: number;
  height: number;
}

export interface SimulationTickState {
  tick: number;
  timestampMs: number;
  units: Unit[];
}`,
    },
    rubric: [
      {
        id: "tgd-req-1",
        category: "PROBLEM_FRAMING",
        weight: 15,
        sfiaLevel: 2,
        statement: "Scopes entity interfaces, fixed 20Hz tick contracts, and render-loop decoupling prior to generating unit movement logic.",
        successSignals: [
          "Candidate confirms the 50ms accumulator pattern with the assistant before implementing movement.",
          "Candidate clarifies that rendering should interpolate from the tick state rather than running the sim.",
        ],
        failureModes: [
          "Begins generating animation loops without defining simulation contracts or tick boundaries.",
        ],
      },
      {
        id: "tgd-req-2",
        category: "TECHNICAL_APPROACH",
        weight: 15,
        sfiaLevel: 2,
        statement: "Designs modular, strongly typed simulation components cleanly separating pure tick calculation, spatial hashing, and canvas rendering.",
        successSignals: [
          "Separates tick updates into pure functions that ingest current state and return next state.",
          "Uses typed interfaces for spatial cells and unit states.",
        ],
        failureModes: [
          "Tangles canvas DOM rendering code directly inside unit position update loops.",
        ],
      },
      {
        id: "tgd-req-3",
        category: "AI_DIRECTION",
        weight: 15,
        sfiaLevel: 2,
        statement: "Directs the AI co-pilot in staged, iterative prompts (Types -> Spatial Grid -> Unit FSM -> Render Bridge) with explicit 50ms tick constraints.",
        successSignals: [
          "Prompts AI step-by-step with explicit constraints on tick rate (50ms) and cell dimensions.",
          "Rejects sprawling all-in-one generation prompts.",
        ],
        failureModes: [
          "Submits single prompt asking for 'entire RTS game' and blindly accepts the output.",
        ],
      },
      {
        id: "tgd-req-4",
        category: "CRITICAL_JUDGMENT",
        weight: 20,
        sfiaLevel: 2,
        statement: "Detects and rejects deliberate AI traps: floating-point variable dt drift, O(N²) pairwise proximity queries, and in-loop state mutations.",
        injectedTrap: "AI implements variable frame dt math (x += speed * dt), nested O(N²) distance comparisons, and direct in-loop position mutation.",
        successSignals: [
          "Catches floating-point delta_time math and directs AI to implement a fixed-time accumulator.",
          "Identifies O(N²) proximity loop and instructs AI to use spatial hash partitioning.",
          "Catches in-loop state mutation and enforces double-buffering or snapshot isolation.",
        ],
        failureModes: [
          "Permits variable delta_time and O(N²) nested loops to reach production simulation code.",
        ],
      },
      {
        id: "tgd-req-5",
        category: "TRADEOFF_AWARENESS",
        weight: 10,
        sfiaLevel: 2,
        statement: "Articulates algorithmic tradeoffs between spatial hash grids versus quadtrees for browser runtime memory and CPU overhead.",
        successSignals: [
          "Explains why flat spatial hash grids have lower allocation overhead in JavaScript engines than recursive quadtrees.",
        ],
        failureModes: [
          "Claims naive O(N²) loops are fast enough or ignores garbage collection pauses in browser runtimes.",
        ],
      },
      {
        id: "tgd-req-6",
        category: "DOMAIN_FIT",
        weight: 15,
        sfiaLevel: 2,
        statement: "Adheres strictly to real-time strategy (RTS) simulation conventions (deterministic ticks, target acquisition, unit state machines).",
        successSignals: [
          "Uses standard simulation state identifiers (IDLE, MOVING, ATTACKING) and discrete grid coordinates.",
        ],
        failureModes: [
          "Treats units as generic UI elements without game entity state machines.",
        ],
      },
      {
        id: "tgd-req-7",
        category: "COMMUNICATION",
        weight: 10,
        sfiaLevel: 2,
        statement: "Maintains clear commit history, clean component naming, and documents simulation architecture for peer review.",
        successSignals: [
          "Writes descriptive commit messages outlining specific fixed-tick accumulator and spatial partitioning fixes.",
          "Cleans up generic comments and boilerplate.",
        ],
        failureModes: [
          "Commits messy, undocumented code with unused variables and dead comments.",
        ],
      },
    ],
    verification: {
      status: "APPROVED",
      badge: {
        mentorId: "mentor-total-game-dev",
        mentorName: "Lead Simulation Architect, Total Game Development",
        verifiedAt: "2026-03-25T10:00:00Z",
        auditScore: 19,
        notes: "Exemplary RTS simulation architecture. Injected floating-point tick drift and O(N²) spatial canary traps measure authentic systems engineering discernment.",
      },
    },
    metadata: {
      createdAt: "2026-03-25T10:00:00Z",
      usageCount: 52,
    },
  },
  {
    id: "verified-aegis-lending-risk",
    tier: "TIER_1_VERIFIED",
    companyName: "Aegis Risk Analytics",
    roleTitle: "Junior Protocol Risk & Verifiable Telemetry Engineer",
    sfiaProfile: {
      level: 2, // Assist / Junior Developer
      primarySkills: ["PROG", "DESN", "TEST"],
      attributes: {
        autonomy: "Works under routine supervision with code review checkpoints; implements deterministic numerical calculation libraries and state hashing.",
        influence: "Collaborates with protocol risk researchers and smart contract integration leads.",
        complexity: "Handles fixed-point integer mathematics (Wad/Ray precision), liquidation boundary conditions, and cryptographic state hashing.",
        knowledge: "Understands collateralized debt mechanisms, oracle latency boundaries, basis-point math, and safe rollback semantics.",
        businessSkills: "Communicates precision risks rigorously and verifies AI-generated financial algorithms with zero automation bias.",
      },
    },
    briefMarkdown: `# P2P Lending Protocol Risk Engine & Telemetry Chain

## The Problem
Aegis Risk Analytics builds real-time monitoring infrastructure, simulation engines, and verifiable state proofs for decentralized peer-to-peer lending protocols. In volatile market events, naive liquidation engines fail catastrophically due to floating-point rounding errors, stale oracle prices, and partial state corruption during liquidation cascades. You will build the \`P2PLendingRiskEngine\`—a deterministic module that ingests oracle price ticks, calculates the real-time **Health Factor ($HF$)** for active loan positions, detects liquidation eligibility, executes atomic batch liquidations, and commits an updated state root hash to an audit log.

## Technical Invariants & Protocol Constraints
1. **Fixed-Point Arithmetic (Wad/Ray / BPS)**: All collateral ratios, debt accruals, and health factors must be calculated using 18-decimal fixed-point (\`WAD = 10^18\`) or integer basis points (\`1 BPS = 0.01%\`). Floating-point (\`number\`) division is strictly forbidden.
2. **Oracle Staleness & Grace-Period Guard**: Oracle feeds must be timestamp-checked. If \`currentTime - updatedAt > HEARTBEAT_THRESHOLD\`, the feed is stale; the engine must throw \`StalePriceFeedException\` and freeze liquidation execution.
3. **Atomic Liquidation Cascades**: In batch liquidations, account state mutations and protocol collateral reserves must follow transactional semantics (copy-on-write snapshot). If an intermediate liquidation fails or invalidates pool solvency, the entire batch must rollback.
4. **Verifiable Telemetry Hash Chain**: Every processed block/tick must emit a deterministic SHA-256 state commitment over all updated loan positions and reserves.

## Definition of Done
- Health factor calculations strictly use Wad/Ray fixed-point integer arithmetic.
- Stale price ticks (> heartbeat limit) throw \`StalePriceFeedException\` and halt liquidations.
- Batch liquidations execute atomically without leaving partial balances on error.
- Deterministic telemetry state hash is emitted and verifiable across sequential simulation steps.`,
    technicalInvariants: [
      "Health factors and collateral ratios must be calculated using integer Wad fixed-point arithmetic (10^18 precision) or basis points (BPS); native floating-point division is forbidden.",
      "Oracle price updates must validate timestamp freshness against HEARTBEAT_THRESHOLD, throwing StalePriceFeedException on stale feeds.",
      "Batch liquidation processing must be atomic with copy-on-write or rollback semantics, preventing corrupted protocol reserve balances.",
      "Every simulation tick must compute and append a deterministic SHA-256 state root hash to the telemetry audit log.",
    ],
    starterSchemas: {
      "risk-types.ts": `export const WAD = 10n ** 18n; // 18-decimal fixed point
export const LIQUIDATION_THRESHOLD_BPS = 8000n; // 80.00%
export const HEARTBEAT_THRESHOLD_SECONDS = 300; // 5 minutes

export interface PriceTick {
  asset: string;
  priceWad: bigint; // in USD Wad
  updatedAt: number; // unix timestamp seconds
}

export interface LoanPosition {
  borrowerId: string;
  collateralAsset: string;
  collateralAmountWad: bigint;
  debtAmountWad: bigint;
  healthFactorWad: bigint;
  isLiquidatable: boolean;
}

export interface ProtocolReserve {
  asset: string;
  totalCollateralWad: bigint;
  totalDebtWad: bigint;
}

export interface SimulationResult {
  tickNumber: number;
  timestamp: number;
  positions: LoanPosition[];
  liquidatedCount: number;
  stateRootHash: string;
}`,
    },
    rubric: [
      {
        id: "aegis-req-1",
        category: "PROBLEM_FRAMING",
        weight: 15,
        sfiaLevel: 2,
        statement: "Scopes fixed-point data types (Wad/Ray, BPS), oracle heartbeat limits, and liquidation invariants before requesting implementation code.",
        successSignals: [
          "Candidate confirms bigint / Wad 18-decimal representations for collateral and debt with the AI assistant.",
          "Candidate explicitly establishes the oracle staleness boundary condition before implementing pricing logic.",
        ],
        failureModes: [
          "Accepts standard JavaScript floating-point numbers without questioning financial rounding precision.",
        ],
      },
      {
        id: "aegis-req-2",
        category: "TECHNICAL_APPROACH",
        weight: 15,
        sfiaLevel: 2,
        statement: "Implements decoupled, modular fixed-point calculation utilities, stale oracle guards, and atomic liquidation handlers.",
        successSignals: [
          "Creates dedicated pure helper functions for Wad multiplication and division (mulWad, divWad).",
          "Separates oracle validation logic from account position state mutation.",
        ],
        failureModes: [
          "Blends pricing math, validation, and in-place array mutation into an untestable monolithic function.",
        ],
      },
      {
        id: "aegis-req-3",
        category: "AI_DIRECTION",
        weight: 15,
        sfiaLevel: 2,
        statement: "Directs the AI assistant in staged phases (Schema -> Fixed-Point Math Lib -> Oracle Freshness -> Liquidation Loop -> Hash Chain) with precise numerical constraints.",
        successSignals: [
          "Prompts the assistant with specific constraints on integer division order (multiply before divide) to prevent precision truncation.",
          "Instructs AI to handle edge cases like zero debt or zero collateral safely.",
        ],
        failureModes: [
          "Issues a generic prompt like 'build the DeFi lending risk engine' and commits uninspected output.",
        ],
      },
      {
        id: "aegis-req-4",
        category: "CRITICAL_JUDGMENT",
        weight: 20,
        sfiaLevel: 2,
        statement: "Catches and rejects planted AI traps: floating-point IEEE-754 division, unvalidated oracle staleness, and non-atomic cascade mutations.",
        injectedTrap: "AI implements health factor using (collateral * price) / debt floats, ignores updatedAt staleness, and mutates protocol reserves in-place during batch loops.",
        successSignals: [
          "Catches floating-point division and directs AI to use fixed-point BigInt Wad math.",
          "Catches missing staleness check and enforces StalePriceFeedException when elapsed time exceeds heartbeat.",
          "Catches in-place mutation and enforces atomic snapshot rollback if a liquidation fails.",
        ],
        failureModes: [
          "Allows floating-point rounding errors and unvalidated oracle feeds to reach production risk code.",
        ],
      },
      {
        id: "aegis-req-5",
        category: "TRADEOFF_AWARENESS",
        weight: 10,
        sfiaLevel: 2,
        statement: "Articulates computational tradeoffs of fixed-point integer math and gas/compute costs of cryptographic state verification.",
        successSignals: [
          "Explains why integer basis points prevent financial arbitrage and truncation vulnerabilities.",
          "Compares sequential SHA-256 hash chains versus sparse Merkle tree generation for telemetry logging.",
        ],
        failureModes: [
          "Dismisses floating point drift as negligible or claims precision loss does not affect protocol solvency.",
        ],
      },
      {
        id: "aegis-req-6",
        category: "DOMAIN_FIT",
        weight: 15,
        sfiaLevel: 2,
        statement: "Adheres to peer-to-peer lending and decentralized protocol risk conventions (Health Factor thresholds, oracle heartbeats, bad debt prevention).",
        successSignals: [
          "Properly defines liquidation criteria (HF < 1.0) and correctly applies liquidation discount bonuses.",
          "Guarantees that protocol reserves never drop below zero under cascade liquidations.",
        ],
        failureModes: [
          "Treats liquidations as simple balance deductions without calculating bad-debt socialisation or collateral ratios.",
        ],
      },
      {
        id: "aegis-req-7",
        category: "COMMUNICATION",
        weight: 10,
        sfiaLevel: 2,
        statement: "Documents risk parameters, arithmetic assumptions, and audit invariants clearly for protocol governance and peer review.",
        successSignals: [
          "Provides clear inline documentation of Wad scaling factors, basis point math, and liquidation threshold formulas.",
        ],
        failureModes: [
          "Leaves code undocumented with magic numbers and obscure arithmetic shifts.",
        ],
      },
    ],
    verification: {
      status: "APPROVED",
      badge: {
        mentorId: "mentor-aegis-risk",
        mentorName: "Lead Protocol Risk Architect, Aegis Risk Analytics",
        verifiedAt: "2026-03-28T10:00:00Z",
        auditScore: 20,
        notes: "Outstanding DeFi protocol risk screening benchmark. Tests mathematical precision invariants, oracle latency validation, and atomic state rollback.",
      },
    },
    metadata: {
      createdAt: "2026-03-28T10:00:00Z",
      usageCount: 41,
    },
  },
];
