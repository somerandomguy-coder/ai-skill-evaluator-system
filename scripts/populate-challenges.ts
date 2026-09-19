/**
 * Automated Database Population Pipeline:
 * Seeds the database with production-grade challenges and comprehensive requirement banks
 * across major tech archetypes (Canva, Stripe, Culture Amp, Atlassian, Datadog),
 * and optionally ingests custom LinkedIn JDs from data/imported_jds.json.
 *
 * Usage:
 *   npx tsx scripts/populate-challenges.ts
 *   npm run db:populate
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { RUBRIC_VERSION } from "../src/lib/constants";
import { SEED_CHALLENGE } from "../src/lib/fixtures/seed-challenge";

const prisma = new PrismaClient();

interface CuratedChallengeData {
  id: string;
  roleTitle: string;
  employer: string;
  domain: string;
  sourceUrl: string;
  rawJd: string;
  brief: string;
  domainContext: string;
  timeboxMinutes: number;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  requirements: Array<{
    category: string;
    statement: string;
    weight: number;
    successSignals: string[];
    failureModes: string[];
  }>;
}

export const CURATED_ROLES: CuratedChallengeData[] = [
  {
    id: "challenge-canva-frontend",
    roleTitle: "Staff Frontend Engineer",
    employer: "Canva",
    domain: "Visual Design & Collaborative Canvas",
    sourceUrl: "https://www.linkedin.com/jobs/view/canva-staff-frontend-challenge",
    rawJd: `Role: Staff Frontend Engineer\nCompany: Canva\nLocation: Sydney, Australia (Hybrid)\n\nCanva's Core Canvas team builds the high-performance rendering and interactive editing engine used by 180M+ monthly active users worldwide.\n\nKey Responsibilities:\n- Architect high-performance, 60fps canvas rendering pipelines using WebGL, WebAssembly, and modern TypeScript.\n- Design modular UI components and collaborate with UX teams on precision interactions.\n- Drive frontend performance profiling, memory leak prevention, and state synchronization across distributed clients.`,
    brief: `# Canva Design Component & Interaction Engine

## The problem
Canva creators need high-precision geometric canvas manipulation (bounding box transforms, snapping guides, multi-selection bounding, and z-index ordering) that runs smoothly at 60fps without lag during rapid dragging.

## Technical Challenge
1. Implement a pure TypeScript geometric math module for affine transformations (rotation, scaling, translation, anchor math).
2. Build an interactive canvas component displaying multi-element selection with dynamic alignment snapping guidelines.
3. Isolate rendering loops from state mutations to guarantee zero memory leaks and sub-16ms frame times.

## What "done" means
- Transformations maintain strict geometric precision without floating-point accumulation drift.
- Snap guides activate accurately when distances are <= 4px from adjacent element bounds.
- Full 4D lifecycle demonstration with unit tests for edge-case coordinates (negative dimensions, 360-degree rotation wrap).`,
    domainContext: "High-performance browser graphics, reactive canvas math, and responsive interactive editing tools at Canva scale.",
    timeboxMinutes: 180,
    mustHaveSkills: ["TypeScript", "Canvas/WebGL", "Math & Transforms", "React", "Performance Profiling"],
    niceToHaveSkills: ["WebAssembly", "CRDTs", "Design Systems"],
    requirements: [
      {
        category: "PROBLEM_FRAMING",
        statement: "Defines coordinate system boundaries, canvas pixel ratio handling, and non-goals before generating code.",
        weight: 4,
        successSignals: [
          "Clarifies screen space vs world space coordinates early",
          "Distinguishes core transform math from DOM rendering concerns",
          "Explicitly limits initial scope to 2D bounding boxes before adding complex paths"
        ],
        failureModes: [
          "Starts drawing canvas pixels without establishing coordinate transformation contracts",
          "Allows AI to introduce complex vector path manipulation unrequested"
        ]
      },
      {
        category: "TECHNICAL_APPROACH",
        statement: "Implements decoupled, pure mathematical transformation functions separate from React rendering hooks.",
        weight: 5,
        successSignals: [
          "Transforms (rotate, scale, translate) implemented as pure functions with zero side effects",
          "Separates geometric calculation from canvas draw calls",
          "Handles high DPI Retina displays via window.devicePixelRatio cleanly"
        ],
        failureModes: [
          "Tangles state management, canvas context mutations, and math formulas into one giant hook",
          "Causes continuous canvas re-renders on mousemove without requestAnimationFrame batching"
        ]
      },
      {
        category: "CRITICAL_JUDGMENT",
        statement: "Identifies and fixes planted or subtle floating-point precision errors and boundary bugs in AI-generated math.",
        weight: 5,
        successSignals: [
          "Catches floating point drift during consecutive matrix multiplications",
          "Corrects unhandled divide-by-zero errors when scaling bounding box to zero width/height",
          "Inspects AI-suggested canvas optimizations for memory leaks (unreleased event listeners)"
        ],
        failureModes: [
          "Accepts AI transform formulas blindly without verifying rotation origins or sign conventions",
          "Misses bounding box inversion when dragging left past origin"
        ]
      },
      {
        category: "TRADEOFF_AWARENESS",
        statement: "Analyzes trade-offs between DOM overlays vs pure HTML5 Canvas vs WebGL for interactive transformation handles.",
        weight: 4,
        successSignals: [
          "Compares event listener overhead in HTML DOM vs unified hit-testing in 2D Canvas",
          "Articulates memory vs recalculation trade-offs for cached bounding boxes"
        ],
        failureModes: [
          "Selects heavy external animation dependencies without considering bundle impact",
          "Claims that re-rendering the entire canvas 60 times a second has zero battery impact"
        ]
      },
      {
        category: "DOMAIN_FIT",
        statement: "Demonstrates empathy for Canva creator ergonomics with snapping thresholds and subtle visual cues.",
        weight: 4,
        successSignals: [
          "Implements magnetic snapping guides with configurable threshold distances",
          "Provides clear cursor feedback for rotate vs resize vs drag modes"
        ],
        failureModes: [
          "Snapping jumps erratically without hysteresis damping",
          "Ignores user accessibility and touch/pointer device differences"
        ]
      },
      {
        category: "COMMUNICATION",
        statement: "Maintains clear architecture documentation and concise, context-rich steering prompts throughout.",
        weight: 3,
        successSignals: [
          "Prompts provide explicit constraints and expected type signatures",
          "Documents transformation matrix conventions in code comments"
        ],
        failureModes: [
          "Vague steering prompts ('make it work', 'fix the bug')",
          "No code comments explaining coordinate space mappings"
        ]
      }
    ]
  },
  {
    id: "challenge-stripe-payments",
    roleTitle: "Senior Backend Platform Engineer",
    employer: "Stripe",
    domain: "Fintech & Distributed Transactions",
    sourceUrl: "https://www.linkedin.com/jobs/view/stripe-backend-payments-challenge",
    rawJd: `Role: Senior Backend Platform Engineer\nCompany: Stripe\nLocation: Sydney / Remote Australia\n\nStripe's Payments Infrastructure powers financial transactions for millions of businesses worldwide.\n\nKey Responsibilities:\n- Build idempotent event ingestion pipelines handling millions of webhook notifications per minute.\n- Prevent double charging, race conditions, and out-of-order delivery with strict state machines.\n- Verify cryptographic HMAC-SHA256 signatures with constant-time equality checks.`,
    brief: `# Stripe Idempotent Payment Webhook Processor

## The problem
In distributed payment networks, webhooks and charge events are guaranteed to arrive at least once, frequently out of order, and occasionally duplicated concurrently across multiple gateway threads.

## Technical Challenge
1. Design an idempotent event processing state machine that rejects duplicates without double-crediting customer accounts.
2. Implement cryptographic HMAC-SHA256 signature verification with timing-safe comparison to prevent timing side-channel attacks.
3. Provide an exponential-backoff retry queue with dead-letter triage and distributed concurrency locking.

## What "done" means
- 100% deduplication reliability even when identical idempotency keys arrive simultaneously in concurrent threads.
- Constant-time signature verification prevents secret key recovery.
- Robust unit tests prove failure handling across network timeouts and database rollback states.`,
    domainContext: "Financial ledger correctness, distributed idempotency keys, and cryptographic webhook verification at Stripe reliability standards.",
    timeboxMinutes: 180,
    mustHaveSkills: ["TypeScript / Node.js", "Distributed Systems", "Idempotency", "Cryptography", "PostgreSQL / Transactions"],
    niceToHaveSkills: ["Redis", "OpenTelemetry", "Circuit Breakers"],
    requirements: [
      {
        category: "PROBLEM_FRAMING",
        statement: "Interrogates idempotency boundaries, delivery semantics (at-least-once), and non-goals before coding.",
        weight: 4,
        successSignals: [
          "Distinguishes between network retry idempotency and business-level duplicate charges",
          "Defines transaction isolation level assumptions upfront",
          "Identifies out-of-order event sequences as a critical architectural constraint"
        ],
        failureModes: [
          "Assumes webhooks will arrive sequentially in chronological order",
          "Starts writing handler logic without defining idempotency key storage and TTLs"
        ]
      },
      {
        category: "TECHNICAL_APPROACH",
        statement: "Implements atomic compare-and-swap or transactional locking for idempotency key verification.",
        weight: 5,
        successSignals: [
          "Uses atomic database transactions or mutex locks around balance mutations",
          "Separates signature verification middleware from business execution logic",
          "Maintains idempotent responses: replaying a processed event returns the original cached receipt"
        ],
        failureModes: [
          "Vulnerable to race conditions: checks key existence and updates balance in non-atomic steps",
          "Re-executes side-effects (e.g. sending customer receipt emails) on duplicate deliveries"
        ]
      },
      {
        category: "CRITICAL_JUDGMENT",
        statement: "Identifies timing attack vulnerabilities in signature verification and detects planted concurrency flaws.",
        weight: 5,
        successSignals: [
          "Uses crypto.timingSafeEqual instead of naive string === comparison for HMAC verification",
          "Catches planted flaws where failed transactions mark the idempotency key as permanently succeeded",
          "Inspects AI retry logic for stampeding herd / unjittered backoff vulnerabilities"
        ],
        failureModes: [
          "Accepts standard string equality for cryptographic tokens without questioning timing leakage",
          "Ignores uncaught promise rejections during asynchronous retry loops"
        ]
      },
      {
        category: "TRADEOFF_AWARENESS",
        statement: "Evaluates trade-offs between strong transactional consistency vs distributed eventual consistency.",
        weight: 4,
        successSignals: [
          "Explains the trade-offs of in-memory caching vs persistent Redis/Postgres locks",
          "Discusses idempotency retention window (e.g. 24h vs 30 days) and storage cost trade-offs"
        ],
        failureModes: [
          "Advocates for global distributed locks on every payment without throughput consideration",
          "Claims distributed consensus has zero latency overhead"
        ]
      },
      {
        category: "DOMAIN_FIT",
        statement: "Applies fintech-grade defensive standards: zero-loss accounting, audit logging, and payload integrity.",
        weight: 4,
        successSignals: [
          "Logs immutable audit entries with original request IDs, timestamps, and payload hashes",
          "Sanitizes logs to ensure no raw PAN or sensitive authorization tokens are printed"
        ],
        failureModes: [
          "Logs unmasked secret authorization keys or cardholder data to stdout",
          "Returns 200 OK before persisting the ledger entry, causing data loss on crashes"
        ]
      },
      {
        category: "COMMUNICATION",
        statement: "Articulates failure recovery procedures and provides clear, unambiguous prompts for error handling.",
        weight: 3,
        successSignals: [
          "Directs AI co-pilot with precise state transition tables and invariant rules",
          "Documents runbook procedures for dead-letter queue manual interventions"
        ],
        failureModes: [
          "Unstructured prompts that let AI choose arbitrary HTTP error codes (e.g. 200 for database failure)",
          "No documentation of webhook replay procedures"
        ]
      }
    ]
  },
  {
    id: "challenge-cultureamp-applied-ai",
    roleTitle: "Staff Applied AI Engineer",
    employer: "Culture Amp",
    domain: "People Analytics & LLM Governance",
    sourceUrl: "https://www.linkedin.com/jobs/view/culture-amp-applied-ai-challenge",
    rawJd: `Role: Staff Applied AI Engineer\nCompany: Culture Amp\nLocation: Melbourne / Sydney, Australia\n\nCulture Amp is the world's leading employee experience platform. Our AI team builds private, privacy-preserving feedback summarization for 25M+ employees.\n\nKey Responsibilities:\n- Implement zero-trust privacy filters preventing differential privacy leaks in small employee groups.\n- Build grounded LLM summarization pipelines with deterministic citation validation.\n- Detect hallucinated claims and bias in synthesized performance insights.`,
    brief: `# Culture Amp Confidential AI Feedback Summarizer

## The problem
Employee surveys contain candid qualitative feedback. When teams are small (e.g. < 5 respondents), LLM-generated summaries risk revealing individual respondent identities or fabricating claims not grounded in raw comments.

## Technical Challenge
1. Implement a privacy-gate rule engine that enforces k-anonymity (minimum group size threshold) and subtraction attack detection.
2. Build an automated hallucination detector verifying that every claim in the summary links directly to supporting survey quotes.
3. Provide an intuitive review dashboard highlighting flagged confidentiality risks and unsupported AI assertions.

## What "done" means
- Strictly blocks summary generation whenever respondent pool drops below threshold.
- Rejects or flags any summary sentence containing unverified statistics or fabricated feedback.
- Cleanly separates privacy validation logic from presentation views.`,
    domainContext: "Employee confidentiality, k-anonymity in NLP analytics, and hallucination verification for HR executives.",
    timeboxMinutes: 180,
    mustHaveSkills: ["TypeScript / Python", "LLM Evaluation", "Differential Privacy", "Groundedness Checking", "React"],
    niceToHaveSkills: ["Langfuse", "Semantic Search", "Vector Embeddings"],
    requirements: [
      {
        category: "PROBLEM_FRAMING",
        statement: "Interrogates group-size threshold definitions, confidentiality subtraction risks, and non-goals before coding.",
        weight: 4,
        successSignals: [
          "Asks whether minimum group threshold counts total respondents or active commenters",
          "Identifies that releasing department data alongside team data can reveal individuals by subtraction",
          "States explicit assumptions regarding role-based access for HR admins vs line managers"
        ],
        failureModes: [
          "Starts coding UI summaries without checking whether the group meets privacy thresholds",
          "Treats a simple count check as sufficient without considering small sub-demographics"
        ]
      },
      {
        category: "TECHNICAL_APPROACH",
        statement: "Constructs a deterministic verification pipeline comparing summary sentences against raw comment citations.",
        weight: 5,
        successSignals: [
          "Decouples privacy rule evaluation into a pure, testable gate function",
          "Requires explicit quote pointers or string spans for every generated insight",
          "Computes groundedness ratios and highlights unverified claims with visual warnings"
        ],
        failureModes: [
          "Trusts the LLM's own self-reported confidence score without independent string checking",
          "Mixes UI rendering with privacy policy enforcement logic"
        ]
      },
      {
        category: "CRITICAL_JUDGMENT",
        statement: "Detects planted AI hallucinations, PII leakage, and unsupported generalizations in generated reports.",
        weight: 5,
        successSignals: [
          "Catches planted hallucinated claims (e.g. mentions of a manager by name when no comment had names)",
          "Questions AI suggestions to relax privacy rules when test sample size is small",
          "Flags tone-bias and emotionally charged exaggerations inserted by generative models"
        ],
        failureModes: [
          "Accepts hallucinated summary outputs without checking back against source comments",
          "Allows PII or specific job titles to pass through into aggregated summaries"
        ]
      },
      {
        category: "TRADEOFF_AWARENESS",
        statement: "Analyzes trade-offs between utility (rich qualitative insight) vs privacy (strict anonymization thresholds).",
        weight: 4,
        successSignals: [
          "Explains how strict k-anonymity limits feedback visibility for underrepresented teams",
          "Discusses fuzzy text matching trade-offs vs exact quote attribution in NLP validation"
        ],
        failureModes: [
          "Claims that perfect privacy and 100% detail preservation can both be achieved simultaneously",
          "Ignores the risk of re-identification through unique writing styles or acronyms"
        ]
      },
      {
        category: "DOMAIN_FIT",
        statement: "Reflects Culture Amp values of psychological safety, non-punitive feedback, and executive trust.",
        weight: 4,
        successSignals: [
          "Designs review interfaces that protect employees from managerial retaliation",
          "Provides transparent explanations when a group summary is suppressed due to privacy"
        ],
        failureModes: [
          "Displays raw unredacted comments to unauthorized management tiers",
          "Treats privacy suppression as an application error rather than an intentional ethical safeguard"
        ]
      },
      {
        category: "COMMUNICATION",
        statement: "Communicates engineering invariants clearly and directs AI assistance with modular, focused prompts.",
        weight: 3,
        successSignals: [
          "Guides assistant with staged milestones: schema definition -> gate logic -> UI dashboard",
          "Clearly articulates why certain AI-proposed features violate privacy ethics"
        ],
        failureModes: [
          "Prompts AI with 'summarize this text' without specifying privacy invariants",
          "Leaves boundary logic undocumented"
        ]
      }
    ]
  },
  {
    id: "challenge-atlassian-fullstack",
    roleTitle: "Senior Full-Stack Engineer",
    employer: "Atlassian",
    domain: "Team Collaboration & Realtime Workflows",
    sourceUrl: "https://www.linkedin.com/jobs/view/atlassian-fullstack-challenge",
    rawJd: `Role: Senior Full-Stack Engineer\nCompany: Atlassian\nLocation: Sydney, Australia (Remote / Hybrid)\n\nAtlassian builds tools like Jira, Confluence, and Loom used by over 300,000 organisations.\n\nKey Responsibilities:\n- Build reactive collaborative project management boards with optimistic UI updates.\n- Design resilient client-server synchronization handling offline reconnects and conflict resolution.\n- Write maintainable, accessible React components backed by resilient Node.js microservices.`,
    brief: `# Atlassian Realtime Collaborative Issue Board

## The problem
Distributed development teams frequently update Jira issue status and swimlanes simultaneously. When two team members drag the same card or update dependencies at the same moment, race conditions and flickering states degrade trust.

## Technical Challenge
1. Implement an optimistic UI update layer with automatic rollback when server persistence fails.
2. Build a conflict resolution strategy (Last-Write-Wins with vector clocks or operational transformation) for concurrent card position changes.
3. Ensure keyboard accessibility (WCAG 2.1 AA) and drag-and-drop support across mobile and desktop.

## What "done" means
- UI updates instantaneously on user interaction and smoothly handles simulated 500ms network latency.
- Simulated server errors trigger graceful toast notifications with clean visual state reverts.
- Accessible keyboard navigation enables full card movement without requiring a mouse.`,
    domainContext: "High-concurrency collaborative tools, optimistic state rollback, and WCAG accessibility at Atlassian scale.",
    timeboxMinutes: 180,
    mustHaveSkills: ["TypeScript", "React", "State Synchronization", "Optimistic UI", "WCAG Accessibility"],
    niceToHaveSkills: ["WebSockets", "CRDTs", "Tailwind CSS"],
    requirements: [
      {
        category: "PROBLEM_FRAMING",
        statement: "Clarifies concurrency boundaries, optimistic rollback contracts, and accessibility targets upfront.",
        weight: 4,
        successSignals: [
          "Defines what happens when concurrent users reorder cards simultaneously",
          "Specifies rollback mechanics and error notification UX before building UI",
          "Accounts for keyboard navigation requirements from the start"
        ],
        failureModes: [
          "Starts building drag-and-drop with mouse events only, ignoring keyboard accessibility",
          "Assumes network requests never fail or arrive out of order"
        ]
      },
      {
        category: "TECHNICAL_APPROACH",
        statement: "Implements decoupled state management supporting optimistic mutations and predictable rollback snapshots.",
        weight: 5,
        successSignals: [
          "Captures previous state snapshots before optimistic mutations for instant rollback",
          "Debounces and batches rapid state synchronization events to reduce server pressure",
          "Maintains pure reducers for predictable card state transitions"
        ],
        failureModes: [
          "Mutates component state directly without rollback snapshots on failed API calls",
          "Locks the entire board UI while waiting for network confirmation"
        ]
      },
      {
        category: "CRITICAL_JUDGMENT",
        statement: "Catches AI-generated race conditions in asynchronous network callbacks and validates accessibility.",
        weight: 5,
        successSignals: [
          "Catches race conditions where late network responses overwrite newer user edits",
          "Validates that AI-generated drag handles have proper ARIA attributes (aria-grabbed, aria-dropeffect)",
          "Inspects AI code for unhandled promise rejections during simulated server failures"
        ],
        failureModes: [
          "Accepts AI code that discards server error responses silently",
          "Leaves cards inaccessible to screen reader navigation"
        ]
      },
      {
        category: "TRADEOFF_AWARENESS",
        statement: "Compares client-side optimistic rendering vs pessimistic loading states for collaborative enterprise tools.",
        weight: 4,
        successSignals: [
          "Articulates the balance between perceived responsiveness and potential rollback disorientation",
          "Discusses conflict resolution tradeoffs (e.g. LWW vs CRDTs vs operational locking)"
        ],
        failureModes: [
          "Claims that optimistic updates are simple and have no edge cases or failure modes",
          "Suggests heavyweight locking mechanisms that freeze collaboration for all users"
        ]
      },
      {
        category: "DOMAIN_FIT",
        statement: "Adheres to Atlassian Design System patterns and enterprise team collaboration expectations.",
        weight: 4,
        successSignals: [
          "Provides clear visual states for syncing, synced, and failed states",
          "Includes informative error toasts with actionable retry buttons"
        ],
        failureModes: [
          "Fails silently when an action cannot be saved to the database",
          "Clutters the interface with unstyled browser alerts"
        ]
      },
      {
        category: "COMMUNICATION",
        statement: "Maintains structured commit discipline and directs AI assistants with modular, component-level tasks.",
        weight: 3,
        successSignals: [
          "Prompts specify component props, state transitions, and error states cleanly",
          "Documents testing scenarios for multi-user conflict edge cases"
        ],
        failureModes: [
          "Asks AI to build the entire board in a single prompt without milestone verification",
          "Leaves state synchronization logic undocumented"
        ]
      }
    ]
  },
  {
    id: "challenge-datadog-cloud-telemetry",
    roleTitle: "Senior Cloud Systems Engineer",
    employer: "Datadog",
    domain: "Observability & Realtime Telemetry",
    sourceUrl: "https://www.linkedin.com/jobs/view/datadog-cloud-systems-challenge",
    rawJd: `Role: Senior Cloud Systems Engineer\nCompany: Datadog\nLocation: Sydney / Remote Australia\n\nDatadog is the monitoring and security platform for cloud applications. We process trillions of metric points and logs every single day.\n\nKey Responsibilities:\n- Design high-throughput metric aggregation pipelines filtering noisy logs under burst conditions.\n- Implement sliding-window rate limiters and anomaly detection algorithms with minimal CPU footprint.\n- Construct resilient streaming buffers that drop non-critical telemetry before memory limits are breached.`,
    brief: `# Datadog High-Throughput Telemetry Stream Filter

## The problem
During a distributed denial-of-service (DDoS) incident or production outage, telemetry volume can surge by 50x. Without intelligent shedding and streaming aggregation, logging infrastructure crashes precisely when operators need it most.

## Technical Challenge
1. Implement an in-memory streaming ring buffer and sliding-window rate limiter with O(1) space complexity.
2. Build priority-based load shedding: drop DEBUG/INFO logs during memory pressure while preserving ERROR traces.
3. Compute rolling statistical anomalies (p95 latency, error rate spikes) over sliding 60-second windows without unbounded memory allocation.

## What "done" means
- Sustains 10,000 synthetic log events/sec without exceeding a 32MB heap allocation constraint.
- Priority shedding cleanly discards lower-tier logs when buffer utilization exceeds 80%.
- Rolling p95 latency accurately triggers anomaly alerts with comprehensive unit test verification.`,
    domainContext: "Cloud observability, sliding-window algorithms, priority load shedding, and memory bounded systems at Datadog scale.",
    timeboxMinutes: 180,
    mustHaveSkills: ["TypeScript / Node.js", "Streaming Algorithms", "Ring Buffers", "Memory Profiling", "Systems Architecture"],
    niceToHaveSkills: ["OpenTelemetry", "StatsD", "eBPF"],
    requirements: [
      {
        category: "PROBLEM_FRAMING",
        statement: "Establishes memory bounds, drop priorities, and statistical calculation semantics before writing code.",
        weight: 4,
        successSignals: [
          "Defines explicit heap/buffer size limits and calculates memory budgets per log entry",
          "Clarifies sliding-window bucket precision vs memory consumption trade-offs",
          "Distinguishes between bursty log volume and sustained resource starvation"
        ],
        failureModes: [
          "Stores logs in unbounded JavaScript arrays without eviction policies",
          "Starts building charts before establishing the streaming aggregation engine"
        ]
      },
      {
        category: "TECHNICAL_APPROACH",
        statement: "Implements circular ring buffer data structures and sliding-window histogram aggregation.",
        weight: 5,
        successSignals: [
          "Uses fixed-size circular buffers or typed arrays with O(1) overwrite semantics",
          "Implements priority shedding: drops low-severity logs first when thresholds trigger",
          "Calculates percentiles (p50, p95, p99) using streaming t-digest or bucketed histograms"
        ],
        failureModes: [
          "Uses Array.prototype.sort() on entire raw history to compute p95 on every incoming log",
          "Allows memory consumption to grow linearly with the volume of processed events"
        ]
      },
      {
        category: "CRITICAL_JUDGMENT",
        statement: "Catches AI memory leaks, off-by-one window eviction errors, and synthetic benchmark flaws.",
        weight: 5,
        successSignals: [
          "Catches memory leak where closure references retain discarded telemetry objects",
          "Spots off-by-one errors in sliding window timestamp bucket rotation",
          "Questions AI claims about benchmark performance and profiles actual heap usage"
        ],
        failureModes: [
          "Accepts AI buffer implementation that leaks memory under sustained synthetic load",
          "Fails to verify that sliding window properly cleans up stale metrics"
        ]
      },
      {
        category: "TRADEOFF_AWARENESS",
        statement: "Evaluates trade-offs between exact percentile precision vs memory and CPU efficiency.",
        weight: 4,
        successSignals: [
          "Explains why approximate reservoir sampling or bucketed histograms are preferred over exact arrays",
          "Discusses the trade-offs of immediate disk flushing vs batched asynchronous writes"
        ],
        failureModes: [
          "Insists on exact mathematical precision for p99 across millions of events in real time",
          "Ignores CPU overhead of continuous garbage collection pauses"
        ]
      },
      {
        category: "DOMAIN_FIT",
        statement: "Reflects Datadog observability rigor: metric naming conventions, structured tags, and alert thresholds.",
        weight: 4,
        successSignals: [
          "Uses standard dimensional tags (service, env, status_code) in telemetry outputs",
          "Provides clear operational status indicators (buffer health, drop rate, throughput)"
        ],
        failureModes: [
          "Outputs unstructured plaintext logs that cannot be parsed by downstream metrics pipelines",
          "Fails to record how many logs were dropped during load shedding"
        ]
      },
      {
        category: "COMMUNICATION",
        statement: "Directs AI assistant with precise algorithmic constraints and documents buffer boundary invariants.",
        weight: 3,
        successSignals: [
          "Prompts assistant with explicit time and space complexity requirements (e.g. O(1) amortized)",
          "Includes ASCII architecture diagrams or state charts in technical documentation"
        ],
        failureModes: [
          "Vague prompts ('make a fast logger') that result in naive unbounded array implementations",
          "Leaves load shedding configuration values hardcoded without explanation"
        ]
      }
    ]
  }
];

async function populateCustomJds() {
  const customJdPath = path.join(process.cwd(), "data", "imported_jds.json");
  if (!fs.existsSync(customJdPath)) {
    console.log("  (No custom data/imported_jds.json found. Sourcing from curated production bank.)");
    return [];
  }

  try {
    const raw = fs.readFileSync(customJdPath, "utf-8");
    const parsed = JSON.parse(raw);
    console.log(`  Found custom imported JDs file with ${parsed.length} entries.`);
    return parsed;
  } catch (err) {
    console.warn(`  Warning: Could not parse data/imported_jds.json: ${err}`);
    return [];
  }
}

async function main() {
  console.log("=================================================");
  console.log("  AI Skill Evaluator: Challenge Population Pipeline");
  console.log("=================================================");

  // 1. Ensure demo candidate user exists
  const systemUser = await prisma.user.upsert({
    where: { email: "alex.morgan@example.com" },
    update: {},
    create: {
      email: "alex.morgan@example.com",
      name: "Alex Morgan",
      role: "CANDIDATE",
    },
  });

  console.log(`✓ Verified system user: ${systemUser.email} (${systemUser.id})`);

  // 2. Ingest custom JDs if available
  const customJds = await populateCustomJds();

  const allChallengesToSeed = [...CURATED_ROLES];

  for (const custom of customJds) {
    const customId = `challenge-custom-${custom.employer.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
    allChallengesToSeed.push({
      id: customId,
      roleTitle: custom.roleTitle,
      employer: custom.employer,
      domain: custom.domain || `${custom.employer} Platform`,
      sourceUrl: custom.sourceUrl || `https://linkedin.com/jobs/${customId}`,
      rawJd: custom.rawJd,
      brief: custom.brief || `# ${custom.roleTitle} at ${custom.employer}\n\n## The problem\nImplement production-grade architecture and core business logic for **${custom.roleTitle}**.\n\n## Constraints\n- Keep code clean, modular, and decoupled.\n- Catch planted AI flaws and verify boundary conditions.`,
      domainContext: custom.domainContext || `Real-world engineering challenge for ${custom.employer}.`,
      timeboxMinutes: custom.timeboxMinutes || 180,
      mustHaveSkills: custom.mustHaveSkills || ["TypeScript", "System Architecture", "Zero-Trust Verification"],
      niceToHaveSkills: custom.niceToHaveSkills || ["Testing", "Performance"],
      requirements: custom.requirements || [
        {
          category: "PROBLEM_FRAMING",
          statement: "Clarifies scope boundaries, non-goals, and edge cases before coding.",
          weight: 4,
          successSignals: ["Asks clarifying questions", "Defines clear boundaries"],
          failureModes: ["Jumps straight to code without boundary agreement"],
        },
        {
          category: "TECHNICAL_APPROACH",
          statement: "Designs decoupled architecture and pure logic prior to UI generation.",
          weight: 5,
          successSignals: ["Separates pure logic from UI", "Uses clean data contracts"],
          failureModes: ["Monolithic code with mixed concerns"],
        },
        {
          category: "CRITICAL_JUDGMENT",
          statement: "Catches planted AI defects and unverified assumptions.",
          weight: 5,
          successSignals: ["Questions AI hallucinations", "Verifies code logic independently"],
          failureModes: ["Blindly accepts AI suggestions without inspection"],
        },
        {
          category: "TRADEOFF_AWARENESS",
          statement: "Explains technical trade-offs and performance considerations.",
          weight: 4,
          successSignals: ["Discusses pros and cons of approach"],
          failureModes: ["Claims solution has zero trade-offs"],
        },
        {
          category: "DOMAIN_FIT",
          statement: "Tailors features to the actual real-world needs of the domain.",
          weight: 4,
          successSignals: ["Focuses on target user workflows"],
          failureModes: ["Generic boilerplate unrelated to role"],
        },
        {
          category: "COMMUNICATION",
          statement: "Directs AI assistant with clear, structured prompts and clear documentation.",
          weight: 3,
          successSignals: ["Clear prompts and code comments"],
          failureModes: ["Vague prompts with no guidance"],
        },
      ],
    });
  }

  console.log(`\nPopulating ${allChallengesToSeed.length} production challenges into PostgreSQL...`);

  let totalRequirementsInserted = 0;

  for (const challengeData of allChallengesToSeed) {
    // 1. Create or find JobSubmission
    let submission = await prisma.jobSubmission.findFirst({
      where: { sourceUrl: challengeData.sourceUrl },
    });

    const parsedJdPayload = {
      roleTitle: challengeData.roleTitle,
      seniority: "SENIOR",
      employer: challengeData.employer,
      location: "Sydney, Australia",
      domain: challengeData.domain,
      teamContext: `Core Engineering team at ${challengeData.employer}`,
      mustHaveSkills: challengeData.mustHaveSkills,
      niceToHaveSkills: challengeData.niceToHaveSkills,
      barriers: [],
      sourceUrl: challengeData.sourceUrl,
    };

    const companyResearchPayload = {
      whatTheyDo: `${challengeData.employer} is a market leader in ${challengeData.domain}.`,
      domainAndUsers: `Global engineers and enterprise customers utilizing ${challengeData.employer}'s technology.`,
      technicalSignals: challengeData.mustHaveSkills,
      groundedInSearch: true,
      sources: [{ title: `${challengeData.employer} Careers`, url: challengeData.sourceUrl }],
    };

    if (!submission) {
      submission = await prisma.jobSubmission.create({
        data: {
          userId: systemUser.id,
          rawJd: challengeData.rawJd,
          sourceUrl: challengeData.sourceUrl,
          parsedJd: parsedJdPayload as never,
          companyResearch: companyResearchPayload as never,
          fromDemoCache: true,
        },
      });
    }

    // 2. Upsert Challenge
    const existingChallenge = await prisma.challenge.findFirst({
      where: { jobSubmissionId: submission.id },
    });

    let challengeId = existingChallenge?.id;

    if (existingChallenge) {
      await prisma.challenge.update({
        where: { id: existingChallenge.id },
        data: {
          title: `${challengeData.employer}: ${challengeData.roleTitle}`,
          brief: challengeData.brief,
          domainContext: challengeData.domainContext,
          timeboxMinutes: challengeData.timeboxMinutes,
          rubricVersion: RUBRIC_VERSION,
        },
      });
      // Clear old requirements to refresh
      await prisma.requirement.deleteMany({
        where: { challengeId: existingChallenge.id },
      });
    } else {
      const createdChallenge = await prisma.challenge.create({
        data: {
          id: challengeData.id,
          jobSubmissionId: submission.id,
          title: `${challengeData.employer}: ${challengeData.roleTitle}`,
          brief: challengeData.brief,
          domainContext: challengeData.domainContext,
          timeboxMinutes: challengeData.timeboxMinutes,
          starterTemplate: SEED_CHALLENGE.starterTemplate as never,
          rubricVersion: RUBRIC_VERSION,
          meta: { validApproaches: [], ambiguities: [] } as never,
        },
      });
      challengeId = createdChallenge.id;
    }

    // 3. Insert requirements
    if (challengeId) {
      for (const req of challengeData.requirements) {
        await prisma.requirement.create({
          data: {
            challengeId,
            category: req.category,
            statement: req.statement,
            weight: req.weight,
            successSignals: req.successSignals,
            failureModes: req.failureModes,
          },
        });
        totalRequirementsInserted++;
      }
    }

    console.log(`  ✓ Populated: [${challengeData.employer}] ${challengeData.roleTitle} (${challengeData.requirements.length} requirements)`);
  }

  console.log("\n=================================================");
  console.log(`✅ Success! Database populated with:`);
  console.log(`   - ${allChallengesToSeed.length} production challenges`);
  console.log(`   - ${totalRequirementsInserted} 4D lifecycle requirements`);
  console.log(`   - Instant query lookup ready (zero LLM wait time)`);
  console.log("=================================================\n");
}

main()
  .catch((e) => {
    console.error("Population error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
