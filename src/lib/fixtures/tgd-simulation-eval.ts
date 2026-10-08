import type {
  EvaluationView,
  ChallengeView,
  TurnView,
  SuiteAView,
  SuiteBView,
  ZtAiedAudit,
  VerificationReceipt,
  FileWrite,
} from "../data/types";
import type { GroundedAssessmentReport } from "../types/assessment-academic";
import { ACADEMIC_FRAMEWORK_SOURCES } from "../types/assessment-academic";

export const TGD_CHALLENGE_VIEW: ChallengeView = {
  id: "verified-tgd-rts-sim",
  title: "Junior AI & Simulation Systems Developer (Web / RTS)",
  brief: `# Deterministic 2D RTS Unit Simulation Engine

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
  domainContext: "Independent Melbourne game studio engineering deterministic RTS game systems.",
  timeboxMinutes: 120,
  rubricVersion: "SFIA-9-ECD-v2",
  tier: "TIER_1_VERIFIED",
  requirements: [
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
  job: {
    roleTitle: "Junior AI & Simulation Systems Developer (Web / RTS)",
    seniority: "JUNIOR",
    employer: "Total Game Development",
    location: "Melbourne, VIC (Hybrid)",
    domain: "Game Simulation & RTS Engines",
    teamContext: "Core Engine & Simulation Systems Team",
    mustHaveSkills: ["TypeScript", "Simulation Architecture", "Algorithmic Efficiency"],
    niceToHaveSkills: ["Spatial Hash Indexing", "Web Canvas Rendering", "Deterministic State Loops"],
    barriers: [],
    sourceUrl: null,
  },
  research: {
    whatTheyDo: "Total Game Development engineers real-time strategy and sandbox simulation experiences in Melbourne.",
    domainAndUsers: "Simulation and strategy game players on web and desktop platforms.",
    technicalSignals: ["Deterministic Simulation Ticks", "Spatial Partitioning", "State Machine Architecture"],
    groundedInSearch: true,
    sources: [{ title: "Total Game Development Studio", url: "https://totalgamedev.com.au" }],
  },
  fromDemoCache: false,
  sfiaProfile: {
    level: 2,
    primarySkills: ["PROG", "DESN", "TEST"],
    attributes: {
      autonomy: "Works under routine direction with milestone reviews; implements modular simulation algorithms and deterministic state updates.",
      influence: "Collaborates directly with lead engine architect and gameplay systems engineers.",
      complexity: "Handles deterministic tick-loop state transitions, grid-based spatial queries, and render-state decoupling.",
      knowledge: "Understands game simulation architectures, fixed-step accumulators, spatial indexing, and browser performance budgets.",
      businessSkills: "Communicates algorithmic tradeoffs clearly and maintains zero-trust vigilance over AI-generated code.",
    },
  },
  technicalInvariants: [
    "Simulation tick loop must be fixed at 20Hz (50ms interval) with accumulator pattern to guarantee determinism across client frames.",
    "Proximity queries for unit targeting must avoid O(N²) pairwise comparisons using spatial hash partitioning.",
    "Simulation state updates must be double-buffered or snapshot-isolated to prevent in-loop coordinate mutation races.",
    "Rendering loops (requestAnimationFrame) must interpolate from the latest fixed simulation tick, never directly mutating simulation state.",
  ],
  starterSchemas: {
    "src/types/simulation.ts": `export type UnitState = 'IDLE' | 'MOVING' | 'ATTACKING';
export interface Position { x: number; y: number; }
export interface Unit {
  id: string;
  position: Position;
  targetPosition: Position;
  speed: number;
  state: UnitState;
  attackRange: number;
  targetUnitId: string | null;
}`,
  },
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
};

export const TGD_EVALUATION_TURNS: TurnView[] = [
  {
    seq: 1,
    role: "USER",
    content: "Let's build the DeterministicUnitSimulationEngine. First, let's define the TypeScript interfaces in src/types/simulation.ts for units, 2D coordinates, states (IDLE, MOVING, ATTACKING), and the 20Hz tick contract. No simulation logic yet, just pure type contracts.",
    filesWritten: [],
    reasoning: null,
    createdAt: "2026-03-25T10:02:00Z",
  },
  {
    seq: 2,
    role: "ASSISTANT",
    content: "I have defined the core entity and simulation contracts in src/types/simulation.ts, separating unit states and tick parameters.",
    filesWritten: [
      {
        path: "src/types/simulation.ts",
        contents: `export type UnitState = 'IDLE' | 'MOVING' | 'ATTACKING';\nexport interface Position { x: number; y: number; }\nexport interface Unit { id: string; position: Position; targetPosition: Position; speed: number; state: UnitState; attackRange: number; targetUnitId: string | null; }`,
      },
    ],
    reasoning: "Separated entity contracts and states cleanly as requested.",
    createdAt: "2026-03-25T10:03:00Z",
  },
  {
    seq: 3,
    role: "USER",
    content: "Now let's scaffold the SimulationClock in src/engine/accumulator.ts. We need to maintain a fixed 20Hz (50ms) simulation tick that runs independently of rendering.",
    filesWritten: [],
    reasoning: null,
    createdAt: "2026-03-25T10:05:00Z",
  },
  {
    seq: 4,
    role: "ASSISTANT",
    content: "I created src/engine/accumulator.ts with a clock update that advances unit positions using variable delta_time: unit.x += speed * dt.",
    filesWritten: [
      {
        path: "src/engine/accumulator.ts",
        contents: `export class SimulationClock {\n  public update(dtSeconds: number, unit: any) {\n    unit.x += unit.speed * dtSeconds; // Naive variable dt\n  }\n}`,
      },
    ],
    reasoning: "Used standard delta_time pattern commonly found in beginner game loops.",
    createdAt: "2026-03-25T10:06:00Z",
  },
  {
    seq: 5,
    role: "USER",
    content: "Hold on, you're using variable delta_time (x += speed * dt) directly in the tick. That causes IEEE-754 floating-point drift and simulation desync across client frames. We need a deterministic fixed-time accumulator (50ms fixed step) where leftover time accumulates into the next frame, and units advance on discrete fixed ticks only.",
    filesWritten: [],
    reasoning: null,
    createdAt: "2026-03-25T10:08:00Z",
  },
  {
    seq: 6,
    role: "ASSISTANT",
    content: "Excellent catch on the deterministic tick invariant! Using variable delta time violates frame determinism. I have refactored src/engine/accumulator.ts to implement a fixed 50ms accumulator loop (while accumulator >= 50ms) with state interpolation for rendering.",
    filesWritten: [
      {
        path: "src/engine/accumulator.ts",
        contents: `export class SimulationClock {\n  public accumulator = 0;\n  public readonly tickRateMs = 50;\n  public tickCount = 0;\n  public update(deltaTimeMs: number, onTick: () => void): void {\n    this.accumulator += deltaTimeMs;\n    while (this.accumulator >= this.tickRateMs) {\n      onTick();\n      this.tickCount++;\n      this.accumulator -= this.tickRateMs;\n    }\n  }\n}`,
      },
    ],
    reasoning: "Acknowledged candidate's zero-trust vigilance. Fixed IEEE-754 drift with fixed-step 50ms accumulator loop.",
    createdAt: "2026-03-25T10:10:00Z",
  },
  {
    seq: 7,
    role: "USER",
    content: "Now for target acquisition in src/engine/spatial-grid.ts: do not use an O(N^2) pairwise distance loop across all entities. Let's implement a spatial hash grid index with 40px cell buckets so units only query neighbouring cells.",
    filesWritten: [
      {
        path: "src/engine/spatial-grid.ts",
        contents: `export class SpatialHashGrid {\n  private cells = new Map<string, string[]>();\n  public readonly cellSize = 40;\n  public insert(id: string, x: number, y: number): void {\n    const key = \`\${Math.floor(x / this.cellSize)}:\${Math.floor(y / this.cellSize)}\`;\n    if (!this.cells.has(key)) this.cells.set(key, []);\n    this.cells.get(key)!.push(id);\n  }\n  public getNearby(x: number, y: number): string[] {\n    const cx = Math.floor(x / this.cellSize);\n    const cy = Math.floor(y / this.cellSize);\n    const results: string[] = [];\n    for (let dx = -1; dx <= 1; dx++) {\n      for (let dy = -1; dy <= 1; dy++) {\n        const key = \`\${cx + dx}:\${cy + dy}\`;\n        if (this.cells.has(key)) results.push(...this.cells.get(key)!);\n      }\n    }\n    return results;\n  }\n}`,
      },
    ],
    reasoning: null,
    createdAt: "2026-03-25T10:14:00Z",
  },
  {
    seq: 8,
    role: "USER",
    content: "In src/engine/unit-manager.ts, avoid in-loop coordinate mutations that cause update-order race conditions. Use double-buffering or an explicit state snapshot for the next tick.",
    filesWritten: [
      {
        path: "src/engine/unit-manager.ts",
        contents: `import { Unit } from '../types/simulation';\nexport function tickUnits(currentUnits: Unit[]): Unit[] {\n  return currentUnits.map((u) => {\n    const next = { ...u };\n    if (next.state === 'MOVING') {\n      const dx = next.targetPosition.x - next.position.x;\n      const dy = next.targetPosition.y - next.position.y;\n      const dist = Math.hypot(dx, dy);\n      if (dist > 2) {\n        next.position = {\n          x: next.position.x + (dx / dist) * next.speed,\n          y: next.position.y + (dy / dist) * next.speed\n        };\n      } else {\n        next.state = 'IDLE';\n      }\n    }\n    return next;\n  });\n}`,
      },
    ],
    reasoning: null,
    createdAt: "2026-03-25T10:18:00Z",
  },
];

export const TGD_SUITE_A: SuiteAView = {
  title: "Product 4D Engineering Lifecycle",
  score: 38,
  maxScore: 40,
  status: "EXEMPLARY",
  phases: [
    {
      name: "Define",
      phase: 1,
      score: 10,
      maxScore: 10,
      summary: "Defined fixed 20Hz tick contract and unit state enumeration before generating movement code.",
    },
    {
      name: "Design",
      phase: 2,
      score: 10,
      maxScore: 10,
      summary: "Decoupled 20Hz tick calculation from 60 FPS requestAnimationFrame rendering loop with spatial indexing.",
    },
    {
      name: "Develop",
      phase: 3,
      score: 9,
      maxScore: 10,
      summary: "Caught floating-point delta_time tick drift and O(N²) nested proximity loops; introduced double-buffered ticks.",
    },
    {
      name: "Demonstrate",
      phase: 4,
      score: 9,
      maxScore: 10,
      summary: "Authored deterministic state snapshot logic and documented spatial hash memory trade-offs.",
    },
  ],
  takeaway: "Outstanding systems thinking. Refused floating-point tick drift and O(N²) entity loops, enforcing deterministic simulation invariants.",
};

export const TGD_SUITE_B: SuiteBView = {
  title: "AI Steering & Zero-Trust Rubric",
  score: 24,
  maxScore: 25,
  averageScore: 4.8,
  criteria: [
    {
      criterion: "scope_boundary",
      label: "1. Scope Boundary",
      score: 5,
      evidenceQuotes: [
        "First, let's define the TypeScript interfaces in src/types/simulation.ts... No simulation logic yet, just pure type contracts.",
      ],
      confidence: 0.95,
      rationale: "Established strict contract boundaries before requesting algorithmic code.",
    },
    {
      criterion: "decomposition",
      label: "2. Decomposition",
      score: 5,
      evidenceQuotes: [
        "Now let's scaffold the SimulationClock in src/engine/accumulator.ts.",
        "Now for target acquisition in src/engine/spatial-grid.ts: let's implement a spatial hash grid index.",
      ],
      confidence: 0.96,
      rationale: "Broke the simulation engine into layered modules: Types -> Accumulator -> Spatial Hash -> Unit FSM.",
    },
    {
      criterion: "prompt_quality",
      label: "3. Prompt Quality",
      score: 5,
      evidenceQuotes: [
        "We need a deterministic fixed-time accumulator (50ms fixed step) where leftover time accumulates into the next frame, and units advance on discrete fixed ticks only.",
      ],
      confidence: 0.98,
      rationale: "Specified exact technical constraints (50ms tick rate, cell size 40px, double-buffered state).",
    },
    {
      criterion: "verification",
      label: "4. Verification (Zero Trust)",
      score: 5,
      evidenceQuotes: [
        "Hold on, you're using variable delta_time (x += speed * dt) directly in the tick. That causes IEEE-754 floating-point drift and simulation desync across client frames.",
      ],
      confidence: 0.99,
      rationale: "Inspected the AI's first draft and caught the variable delta-time canary bug before committing.",
    },
    {
      criterion: "stack_decision",
      label: "5. Stack Decision",
      score: 4,
      evidenceQuotes: [
        "Let's implement a spatial hash grid index with 40px cell buckets so units only query neighbouring cells.",
      ],
      confidence: 0.92,
      rationale: "Articulated performance benefits of flat spatial hashing over recursive quadtrees in browser engines.",
    },
  ],
  flags: {
    flaw_caught: true,
    privacy_breach: false,
    scope_creep_resisted: true,
    injection_attempt: false,
    out_of_scope: false,
    planted_bugs_found: 3,
    planted_bugs_total: 3,
  },
  plantedBugs: {
    foundCount: 3,
    totalCount: 3,
    bugs: [
      {
        id: "drift",
        name: "Floating-Point Tick Drift",
        category: "Deterministic Simulation Invariant",
        description: "Variable frame delta_time (x += speed * dt) causes simulation desynchronization across client frames.",
        status: "FIXED",
        evidence: "Turn 5-6: Caught variable frame dt drift and directed AI to implement 50ms accumulator loop.",
        remedy: "You forgot to check the simulation clock: variable frame delta_time causes client desynchronization.",
      },
      {
        id: "spatial",
        name: "O(N²) Entity Proximity Query",
        category: "Algorithmic Efficiency Invariant",
        description: "Nested pairwise loops compare every unit against every other unit, dropping frames past 50 units.",
        status: "FIXED",
        evidence: "Turn 7: Replaced nested O(N²) loops with 40px spatial hash grid partitioning.",
        remedy: "You forgot to check proximity efficiency: O(N²) pairwise distance loops degrade framerate under load.",
      },
      {
        id: "mutation",
        name: "In-Loop State Mutation",
        category: "State Isolation Invariant",
        description: "Direct coordinate mutation inside the active update loop creates update-order race conditions.",
        status: "FIXED",
        evidence: "Turn 8: Enforced snapshot isolation / double-buffered state update in unit manager.",
        remedy: "You forgot to isolate simulation state: in-loop coordinate mutation causes order-dependent race conditions.",
      },
    ],
    summary: "3/3 bugs found: Outstanding zero-trust rigour! You caught and fixed all 3 simulation flaws: fixed-tick accumulator, spatial hash partitioning, and double-buffered state.",
  },
  strengths: [
    "Identified variable delta-time floating-point drift and enforced fixed 50ms accumulator loop.",
    "Proactively avoided O(N²) pairwise proximity queries with spatial hash grid partitioning.",
    "Decoupled 20Hz discrete simulation ticks from 60 FPS requestAnimationFrame rendering.",
  ],
  nextSteps: [
    "Consider adding WebAssembly or SIMD acceleration if unit counts exceed 1,000.",
    "Author automated headless tests verifying deterministic tick replay matching identical seed hashes.",
  ],
};

export const TGD_GROUNDED_ASSESSMENT: GroundedAssessmentReport = {
  sessionId: "tgd-sim-session",
  sfiaLevel: 2,
  overallBand: "STRONG",
  averageScore: 4.8,
  totalScore: 24,
  automationBiasIndex: 0.16, // Low automation bias / high verification vigilance
  needsHumanEscalation: false,
  evaluationTimestamp: "2026-03-25T10:30:00Z",
  dimensions: [
    {
      dimension: "COGNITIVE_VERIFICATION",
      name: "Cognitive Verification & Zero-Trust Vigilance",
      frameworkSource: "Vasconcelos et al. (Stanford / CSCW '23)",
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.COGNITIVE_VERIFICATION,
      score: 5,
      qualitativeBand: "EXEMPLARY",
      confidence: 0.98,
      rationale: "Candidate displayed rigorous zero-trust vigilance. When the AI co-pilot generated naive variable delta-time code, the candidate immediately identified the IEEE-754 drift hazard and mandated a fixed-time accumulator pattern.",
      evidenceTraces: [
        {
          turnId: "turn-5",
          excerpt: "Hold on, you're using variable delta_time (x += speed * dt) directly in the tick. That causes IEEE-754 floating-point drift and simulation desync across client frames. We need a deterministic fixed-time accumulator (50ms fixed step)...",
          observedBehavior: "SUCCESS_SIGNAL",
          interpretation: "Crucial zero-trust verification: spotted floating-point tick drift bug and rejected flawed code before committing.",
        },
        {
          turnId: "turn-6",
          excerpt: "Excellent catch on the deterministic tick invariant! Using variable delta time violates frame determinism. I have refactored src/engine/accumulator.ts to implement a fixed 50ms accumulator loop...",
          observedBehavior: "SUCCESS_SIGNAL",
          interpretation: "Assistant acknowledgment confirming candidate caught the planted simulation flaw.",
        },
      ],
    },
    {
      dimension: "EXPLORATION_VS_ACCELERATION",
      name: "Architectural Exploration vs Acceleration",
      frameworkSource: "Barke et al. (UC San Diego / OOPSLA '23)",
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.EXPLORATION_VS_ACCELERATION,
      score: 5,
      qualitativeBand: "EXEMPLARY",
      confidence: 0.95,
      rationale: "Spent initial phase exploring entity contracts and 20Hz tick boundaries before shifting to acceleration mode for spatial hash implementation.",
      evidenceTraces: [
        {
          turnId: "turn-1",
          excerpt: "Let's build the DeterministicUnitSimulationEngine. First, let's define the TypeScript interfaces in src/types/simulation.ts... No simulation logic yet, just pure type contracts.",
          observedBehavior: "SUCCESS_SIGNAL",
          interpretation: "Established pure architectural exploration mode prior to code generation.",
        },
      ],
    },
    {
      dimension: "CONSTRAINT_SPECIFICATION",
      name: "Constraint Specification & Evidence-Centered Design",
      frameworkSource: "Mislevy et al. (ETS / ECD)",
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.CONSTRAINT_SPECIFICATION,
      score: 5,
      qualitativeBand: "EXEMPLARY",
      confidence: 0.96,
      rationale: "Explicitly defined the 50ms tick rate constraint and 40px spatial cell partition size in conversational prompts.",
      evidenceTraces: [
        {
          turnId: "turn-7",
          excerpt: "do not use an O(N^2) pairwise distance loop across all entities. Let's implement a spatial hash grid index with 40px cell buckets so units only query neighbouring cells.",
          observedBehavior: "SUCCESS_SIGNAL",
          interpretation: "Supplied exact algorithmic constraints to prevent performance degradation.",
        },
      ],
    },
    {
      dimension: "HIERARCHICAL_DECOMPOSITION",
      name: "Hierarchical Decomposition & Cognitive Load Management",
      frameworkSource: "John Sweller (UNSW / Cognitive Load)",
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.HIERARCHICAL_DECOMPOSITION,
      score: 5,
      qualitativeBand: "EXEMPLARY",
      confidence: 0.94,
      rationale: "Decomposed the simulation engine into decoupled layers: Type Contracts -> Fixed Accumulator -> Spatial Index -> Unit State Machine.",
      evidenceTraces: [
        {
          turnId: "turn-3",
          excerpt: "Now let's scaffold the SimulationClock in src/engine/accumulator.ts. We need to maintain a fixed 20Hz (50ms) simulation tick that runs independently of rendering.",
          observedBehavior: "SUCCESS_SIGNAL",
          interpretation: "Layered module sequencing avoiding cognitive overload.",
        },
      ],
    },
    {
      dimension: "ARCHITECTURAL_SENSEMAKING",
      name: "Architectural Sensemaking & Tradeoff Awareness",
      frameworkSource: "SFIA 9 Standard (ACS / DESN)",
      paperMeta: ACADEMIC_FRAMEWORK_SOURCES.ARCHITECTURAL_SENSEMAKING,
      score: 4,
      qualitativeBand: "PROFICIENT",
      confidence: 0.92,
      rationale: "Articulated why spatial hash indexing is well-suited for browser runtimes compared to quadtrees.",
      evidenceTraces: [
        {
          turnId: "turn-7",
          excerpt: "Let's implement a spatial hash grid index with 40px cell buckets so units only query neighbouring cells.",
          observedBehavior: "SUCCESS_SIGNAL",
          interpretation: "Chose spatial hash partitioning to preserve 60 FPS budget.",
        },
      ],
    },
  ],
};

export const TGD_EVALUATION_FILES: FileWrite[] = [
  {
    path: "src/types/simulation.ts",
    contents: `export type UnitState = 'IDLE' | 'MOVING' | 'ATTACKING';\nexport interface Position { x: number; y: number; }\nexport interface Unit { id: string; position: Position; targetPosition: Position; speed: number; state: UnitState; attackRange: number; targetUnitId: string | null; }`,
  },
  {
    path: "src/engine/accumulator.ts",
    contents: `export class SimulationClock {\n  public accumulator = 0;\n  public readonly tickRateMs = 50;\n  public tickCount = 0;\n  public update(deltaTimeMs: number, onTick: () => void): void {\n    this.accumulator += deltaTimeMs;\n    while (this.accumulator >= this.tickRateMs) {\n      onTick();\n      this.tickCount++;\n      this.accumulator -= this.tickRateMs;\n    }\n  }\n}`,
  },
  {
    path: "src/engine/spatial-grid.ts",
    contents: `export class SpatialHashGrid {\n  private cells = new Map<string, string[]>();\n  public readonly cellSize = 40;\n  public insert(id: string, x: number, y: number): void {\n    const key = \`\${Math.floor(x / this.cellSize)}:\${Math.floor(y / this.cellSize)}\`;\n    if (!this.cells.has(key)) this.cells.set(key, []);\n    this.cells.get(key)!.push(id);\n  }\n}`,
  },
  {
    path: "src/engine/unit-manager.ts",
    contents: `import { Unit } from '../types/simulation';\nexport function tickUnits(currentUnits: Unit[]): Unit[] {\n  return currentUnits.map((u) => ({ ...u }));\n}`,
  },
];

export const TGD_EVALUATION_VIEW: EvaluationView = {
  id: "tgd-rts-sim-eval",
  sessionId: "tgd-sim-session",
  ownerId: "alex-mercer",
  candidateName: "Alex Mercer",
  createdAt: "2026-03-25T10:30:00Z",
  challenge: {
    id: "verified-tgd-rts-sim",
    title: "Junior AI & Simulation Systems Developer (Web / RTS)",
    timeboxMinutes: 120,
    rubricVersion: "SFIA-9-ECD-v2",
  },
  job: {
    roleTitle: "Junior AI & Simulation Systems Developer (Web / RTS)",
    employer: "Total Game Development",
  },
  source: "ai",
  overallScore: 94,
  confidence: 0.96,
  coverage: 1.0,
  effective: {
    score: 94,
    basis: "mentor-confirmed",
  },
  results: [
    {
      requirementId: "tgd-req-1",
      requirement: TGD_CHALLENGE_VIEW.requirements[0],
      score: 95,
      confidence: 0.95,
      evidence: [
        { type: "turn", ref: "1", quote: "First, let's define the TypeScript interfaces in src/types/simulation.ts... No simulation logic yet, just pure type contracts.", verified: true },
      ],
      rationale: "Candidate established pure architectural boundaries and tick contracts before writing simulation code.",
    },
    {
      requirementId: "tgd-req-2",
      requirement: TGD_CHALLENGE_VIEW.requirements[1],
      score: 95,
      confidence: 0.96,
      evidence: [
        { type: "turn", ref: "3", quote: "Now let's scaffold the SimulationClock in src/engine/accumulator.ts. We need to maintain a fixed 20Hz (50ms) simulation tick that runs independently of rendering.", verified: true },
      ],
      rationale: "Implemented clean separation of concerns: pure tick calculation, spatial hash grid, and decoupled canvas rendering.",
    },
    {
      requirementId: "tgd-req-3",
      requirement: TGD_CHALLENGE_VIEW.requirements[2],
      score: 92,
      confidence: 0.94,
      evidence: [
        { type: "turn", ref: "7", quote: "Now for target acquisition in src/engine/spatial-grid.ts: do not use an O(N^2) pairwise distance loop across all entities.", verified: true },
      ],
      rationale: "Prompted AI in phased, iterative increments with explicit constraints on tick rate (50ms) and cell dimensions.",
    },
    {
      requirementId: "tgd-req-4",
      requirement: TGD_CHALLENGE_VIEW.requirements[3],
      score: 98,
      confidence: 0.99,
      evidence: [
        { type: "turn", ref: "5", quote: "Hold on, you're using variable delta_time (x += speed * dt) directly in the tick. That causes IEEE-754 floating-point drift and simulation desync across client frames.", verified: true },
        { type: "turn", ref: "6", quote: "Excellent catch on the deterministic tick invariant! Using variable delta time violates frame determinism.", verified: true },
      ],
      rationale: "Exceptional critical judgment: identified floating-point delta_time drift, O(N²) nested queries, and in-loop state mutation.",
    },
    {
      requirementId: "tgd-req-5",
      requirement: TGD_CHALLENGE_VIEW.requirements[4],
      score: 90,
      confidence: 0.92,
      evidence: [
        { type: "turn", ref: "7", quote: "Let's implement a spatial hash grid index with 40px cell buckets so units only query neighbouring cells.", verified: true },
      ],
      rationale: "Articulated memory and garbage-collection advantages of spatial hash indexing over quadtrees in browser engines.",
    },
    {
      requirementId: "tgd-req-6",
      requirement: TGD_CHALLENGE_VIEW.requirements[5],
      score: 94,
      confidence: 0.95,
      evidence: [
        { type: "turn", ref: "8", quote: "In src/engine/unit-manager.ts, avoid in-loop coordinate mutations that cause update-order race conditions. Use double-buffering or an explicit state snapshot.", verified: true },
      ],
      rationale: "Adheres closely to real-time strategy conventions and discrete state machine mechanics.",
    },
    {
      requirementId: "tgd-req-7",
      requirement: TGD_CHALLENGE_VIEW.requirements[6],
      score: 92,
      confidence: 0.94,
      evidence: [
        { type: "turn", ref: "2", quote: "I have defined the core entity and simulation contracts in src/types/simulation.ts", verified: true },
      ],
      rationale: "Clear architectural documentation, concise prompts, and clean codebase hygiene.",
    },
  ],
  strengths: [
    "Caught IEEE-754 floating-point drift and directed AI to implement a fixed 50ms accumulator loop.",
    "Proactively avoided O(N²) pairwise proximity queries with spatial hash grid partitioning.",
    "Enforced double-buffered state isolation to eliminate update-order race conditions.",
  ],
  gaps: [
    "Could incorporate headless deterministic tick replay tests to verify replay hash parity.",
  ],
  nextSteps: [
    "Profile spatial hash cell size under high unit density (100+ entities).",
    "Explore Web Workers for offloading simulation ticks from the main browser thread.",
  ],
  needsHumanReview: false,
  reviewStatus: "REVIEWED",
  contested: false,
  contestReason: null,
  escalation: [],
  reviews: [
    {
      id: "mentor-total-game-dev",
      verdict: "CONFIRM",
      comments: "Outstanding candidate demonstration. Spotting the floating-point tick drift bug and mandating the accumulator pattern shows true game engine discernment. Confirmed at 94% (High Distinction).",
      adjustedScore: 94,
      reviewedAt: "2026-03-25T11:00:00Z",
    },
  ],
  turns: TGD_EVALUATION_TURNS,
  files: TGD_EVALUATION_FILES,
  durationMinutes: 45,
  suiteA: TGD_SUITE_A,
  suiteB: TGD_SUITE_B,
  ztAiedAudit: {
    trustsAssumptions: false,
    trustsAiScope: false,
    trustsFakeCompleteness: false,
    noEvidenceGate: false,
    verdict: "Demonstrated zero-trust rigour across all simulation invariants.",
  },
  verificationReceipt: {
    hash: "sha256-tgd-sim-2026-verified-receipt",
    algorithm: "SHA-256",
    scope: "saved assessment metadata",
    timestamp: "2026-03-25T10:30:00Z",
  },
  groundedAssessment: TGD_GROUNDED_ASSESSMENT,
};
