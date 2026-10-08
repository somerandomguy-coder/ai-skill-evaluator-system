import type { ChallengeV2, RubricRequirement, SfiaProfile } from "../types/assessment-v2";

/**
 * M04 Draft Fixture 1: Real-Time Collaborative Document CRDT Vector Clock Engine
 * Addresses human-rejected generic queue templates by providing a rigorous, bounded
 * two-client collaborative editing assessment draft with PENDING status.
 */
export const COLLABORATIVE_EDITING_DRAFT_FIXTURE: ChallengeV2 = {
  id: "draft-collab-crdt-01",
  tier: "TIER_3_GENERATED",
  companyName: "Atlassian",
  roleTitle: "Staff Software Engineer — Collaborative Editing & Real-Time Sync",
  sfiaProfile: {
    level: 3,
    primarySkills: ["PROG", "DESN", "TEST"],
    attributes: {
      autonomy: "Works under general guidance; acts on own initiative; owns real-time concurrency architecture.",
      influence: "Influences document platform squads; negotiates WebSocket and synchronization contracts.",
      complexity: "Resolves non-trivial distributed race conditions, packet reordering, and eventual convergence.",
      knowledge: "Deep knowledge of CRDTs, Operational Transformation, vector clocks, and asynchronous state machines.",
      businessSkills: "Communicates synchronization trade-offs; defends causal invariant guarantees under packet loss.",
    },
  },
  briefMarkdown: `# Atlassian Confluence — Real-Time Collaborative Document CRDT Engine

## Context & Objectives
You are engineering a real-time collaborative document synchronization engine for **Atlassian**. The platform supports simultaneous multi-user document authoring where clients produce concurrent character insertions and deletions over an asynchronous WebSocket transport.

## Core Technical Constraints
1. **Causal Ordering & Vector Clocks**: Operations must carry causal vector clocks to determine concurrent vs. causally preceding edits. Operations must never be sorted by local wall-clock time.
2. **Deterministic Convergence**: Two clients receiving the same set of operations in different network delivery orders must converge to the exact same document state.
3. **Idempotency & Reordering Guard**: Network packet duplicates and out-of-order deliveries must be handled safely without duplicate character insertion.
4. **Disconnection & Reconnection Recovery**: Reconnecting clients must synchronize missing operations using a delta protocol without full document wipes.

## Exercise Assumptions & Scope Boundaries
- **Timebox**: 60-90 minutes focused work-sample.
- **Transport**: Synthetic WebSocket event emitter adapter supplied; no live external server required.
- **Scope**: Bounded two-client character-level document convergence.

## Definition of Done
- Complete CRDT engine passing concurrent edit test cases.
- Out-of-order and duplicated message resistance verified by unit tests.
- Reconnection state reconciliation verified.`,
  technicalInvariants: [
    "Operations must be ordered by causal vector clocks; client wall-clock time is untrusted.",
    "Duplicate operation IDs must be ignored idempotently without mutating document state.",
    "Clients applying operations in reverse or interleaved arrival order must converge to identical string state.",
    "Tombstones or character identifiers must be uniquely composed of (client_id, sequence_number).",
  ],
  starterSchemas: {
    "crdt-types.ts": `export type ClientId = string;

export interface VectorClock {
  [clientId: string]: number;
}

export interface DocumentOperation {
  opId: string;
  clientId: ClientId;
  type: "INSERT" | "DELETE";
  position: number;
  character: string;
  clock: VectorClock;
  timestampMs: number;
}

export interface SyncMessage {
  type: "OP" | "SYNC_REQUEST" | "SYNC_RESPONSE";
  payload: DocumentOperation | DocumentOperation[];
}

export interface ClientDocumentState {
  clientId: ClientId;
  content: string;
  vectorClock: VectorClock;
}

export interface CrdtEngine {
  applyLocalInsert(char: string, pos: number): DocumentOperation;
  applyLocalDelete(pos: number): DocumentOperation;
  applyRemoteOperation(op: DocumentOperation): boolean;
  getText(): string;
  getVectorClock(): VectorClock;
}`,
    "engine.ts": `import type { ClientId, CrdtEngine, DocumentOperation, VectorClock } from "./crdt-types";

export class SimpleCrdtEngine implements CrdtEngine {
  private clientId: ClientId;
  private text: string = "";
  private clock: VectorClock = {};
  private seenOpIds = new Set<string>();

  constructor(clientId: ClientId) {
    this.clientId = clientId;
    this.clock[clientId] = 0;
  }

  applyLocalInsert(char: string, pos: number): DocumentOperation {
    this.clock[this.clientId] = (this.clock[this.clientId] || 0) + 1;
    this.text = this.text.slice(0, pos) + char + this.text.slice(pos);
    const op: DocumentOperation = {
      opId: \`\${this.clientId}-\${this.clock[this.clientId]}-\${Date.now()}\`,
      clientId: this.clientId,
      type: "INSERT",
      position: pos,
      character: char,
      clock: { ...this.clock },
      timestampMs: Date.now(),
    };
    this.seenOpIds.add(op.opId);
    return op;
  }

  applyLocalDelete(pos: number): DocumentOperation {
    this.clock[this.clientId] = (this.clock[this.clientId] || 0) + 1;
    const char = this.text[pos] || "";
    this.text = this.text.slice(0, pos) + this.text.slice(pos + 1);
    const op: DocumentOperation = {
      opId: \`\${this.clientId}-\${this.clock[this.clientId]}-\${Date.now()}\`,
      clientId: this.clientId,
      type: "DELETE",
      position: pos,
      character: char,
      clock: { ...this.clock },
      timestampMs: Date.now(),
    };
    this.seenOpIds.add(op.opId);
    return op;
  }

  applyRemoteOperation(op: DocumentOperation): boolean {
    if (this.seenOpIds.has(op.opId)) {
      return false; // Idempotent ignore
    }
    this.seenOpIds.add(op.opId);

    // DELIBERATE BUG / INJECTED TRAP:
    // Naively uses op.position without adjusting for concurrent remote insertions or vector clock causality!
    if (op.type === "INSERT") {
      this.text = this.text.slice(0, op.position) + op.character + this.text.slice(op.position);
    } else if (op.type === "DELETE") {
      this.text = this.text.slice(0, op.position) + this.text.slice(op.position + 1);
    }

    // Update vector clock
    this.clock[op.clientId] = Math.max(this.clock[op.clientId] || 0, op.clock[op.clientId] || 0);
    return true;
  }

  getText(): string {
    return this.text;
  }

  getVectorClock(): VectorClock {
    return { ...this.clock };
  }
}`,
  },
  rubric: [
    {
      id: "rubric-collab-req-1",
      category: "PROBLEM_FRAMING",
      sfiaLevel: 3,
      statement: "Clarifies causal vector clock semantics, idempotency guarantees, and concurrent tie-breaking criteria before implementation.",
      weight: 15,
      successSignals: [
        "Candidate asks about concurrent conflict resolution policy (e.g. client ID tie-breaking).",
        "Clarifies expected behavior when network packets arrive out of order.",
      ],
      failureModes: [
        "Jumps straight into naive string splicing without discussing concurrency models.",
      ],
    },
    {
      id: "rubric-collab-req-2",
      category: "TECHNICAL_APPROACH",
      sfiaLevel: 3,
      statement: "Architects clear separation between local editor state, CRDT synchronization logic, and transport adapters.",
      weight: 15,
      successSignals: [
        "Separates pure CRDT transformation logic from side effects.",
        "Implements clean vector clock comparison helper functions.",
      ],
      failureModes: [
        "Tightly couples WebSocket event handlers directly into raw string mutation logic.",
      ],
    },
    {
      id: "rubric-collab-req-3",
      category: "AI_DIRECTION",
      sfiaLevel: 3,
      statement: "Guides AI in staged phases: message schemas -> causal vector clock comparisons -> convergence testing -> reconnect handling.",
      weight: 15,
      successSignals: [
        "Prompts AI with structured incremental requirements rather than asking for full CRDT at once.",
        "Requires AI to write deterministic unit tests for concurrent edits.",
      ],
      failureModes: [
        "Asks AI to 'build a collaborative editor' in a single unconstrained prompt.",
      ],
    },
    {
      id: "rubric-collab-req-4",
      category: "CRITICAL_JUDGMENT",
      sfiaLevel: 3,
      statement: "Catches and refactors the planted trap: AI orders CRDT operations by local position or wall clock rather than causal vector clocks, causing divergence.",
      weight: 20,
      injectedTrap: "AI orders CRDT character insertions by local index rather than causal vector clock comparisons, causing divergence under concurrent typing.",
      successSignals: [
        "Identifies that applying remote operations at raw op.position breaks when concurrent inserts occur.",
        "Refactors engine to use relative position identifiers or positional transformation.",
      ],
      failureModes: [
        "Accepts the naive position-splicing code uncritically, allowing tests to fail on concurrent edits.",
      ],
    },
    {
      id: "rubric-collab-req-5",
      category: "TRADEOFF_AWARENESS",
      sfiaLevel: 3,
      statement: "Evaluates trade-offs between character-level CRDTs (e.g., LSEQ/Logoot) vs Operational Transformation (OT) complexity vs memory overhead.",
      weight: 10,
      successSignals: [
        "Discusses tombstone memory growth and garbage collection strategies.",
        "Compares state-based vs operation-based synchronization trade-offs.",
      ],
      failureModes: [
        "Claims CRDTs have zero memory overhead or ignores tombstone accumulation.",
      ],
    },
    {
      id: "rubric-collab-req-6",
      category: "DOMAIN_FIT",
      sfiaLevel: 3,
      statement: "Adheres to collaborative editing domain practices: idempotent message processing and deterministic convergence.",
      weight: 15,
      successSignals: [
        "Guarantees that re-delivering already seen message IDs has zero effect on document text.",
        "Verifies that commutative operations produce identical outputs across all permutations.",
      ],
      failureModes: [
        "Violates idempotency, causing double characters on retransmitted WebSocket messages.",
      ],
    },
    {
      id: "rubric-collab-req-7",
      category: "COMMUNICATION",
      sfiaLevel: 3,
      statement: "Documents vector clock comparison invariants, message wire contracts, and concurrency edge cases cleanly.",
      weight: 10,
      successSignals: [
        "Clear comments explaining the causal order invariant.",
        "Concise documentation of message types and reconnection reconciliation sequence.",
      ],
      failureModes: [
        "Leaves complex concurrent state mutation undocumented.",
      ],
    },
  ],
  provenance: {
    origin: "deterministic_fallback",
    resolutionReason: "GENERATED",
  },
  verification: {
    status: "PENDING",
  },
  metadata: {
    createdAt: "2026-10-08T00:00:00.000Z",
    usageCount: 1,
    promptVersion: "ecd-v2.1",
  },
};

/**
 * M04 Draft Fixture 2: Offline-First Mobile Inspection State Synchronizer
 * Addresses human-rejected generic payroll/CRUD fallbacks by providing a realistic
 * offline SQLite mutation queue (outbox) and bidirectional delta sync draft.
 */
export const OFFLINE_SYNC_DRAFT_FIXTURE: ChallengeV2 = {
  id: "draft-offline-sync-02",
  tier: "TIER_3_GENERATED",
  companyName: "SafetyCulture",
  roleTitle: "Senior Mobile Distributed Systems Engineer — Offline-First Sync",
  sfiaProfile: {
    level: 3,
    primarySkills: ["PROG", "DBDS", "TEST"],
    attributes: {
      autonomy: "Works under general guidance; acts on own initiative; owns mobile offline persistence architecture.",
      influence: "Guides mobile platform squads on reliable synchronization and conflict management.",
      complexity: "Solves edge cases in desynchronized client clocks, partial network drops, and binary caching.",
      knowledge: "Mastery of SQLite transactional queues, outbox pattern, and delta sync protocols.",
      businessSkills: "Defends inspection audit data integrity under harsh connectivity environments.",
    },
  },
  briefMarkdown: `# SafetyCulture — Offline-First Mobile Inspection State Synchronizer

## Context & Objectives
You are designing an offline-first mobile synchronization engine for **SafetyCulture** field inspectors. Technicians perform safety audits in remote areas without cellular connectivity. The system must persist all inspection mutations locally in SQLite, manage a durable outbox queue, and synchronize bi-directionally with the central server upon network reconnection.

## Core Technical Constraints
1. **Local SQLite Outbox Pattern**: All inspections and checklist responses must be committed to the local SQLite database and queued in an \`outbox_mutations\` table before any network dispatch is attempted.
2. **Untrusted Client Wall Clocks**: Mobile devices frequently have inaccurate or drifting clocks. Conflict resolution must NOT use client device wall-clock timestamps for Last-Write-Wins (LWW). Instead, monotonic revision sequences or server-assigned version vectors must govern conflict resolution.
3. **Resilient Delta Sync**: Synchronization must exchange incremental mutation deltas since the last acknowledged checkpoint. If a sync cycle is interrupted mid-flight, unacknowledged mutations remain safely in the outbox.
4. **Binary Photo Cache Consistency**: Photos attached to inspection items must be tracked with SHA-256 hashes and cached locally. An inspection record must not reference missing or orphaned binary blobs.

## Exercise Assumptions & Scope Boundaries
- **Timebox**: 60-90 minutes focused work-sample.
- **Database**: In-memory SQLite or SQLite file adapter.
- **Scope**: Outbox queue state machine, delta sync protocol, and clock-independent conflict resolution.

## Definition of Done
- Complete mutation queue with atomic enqueue and dequeue operations.
- Clock-drift conflict resolution tests proving outdated client clocks cannot overwrite fresh server data.
- Resilient resume after simulated network drop.`,
  technicalInvariants: [
    "Mutations must be durably recorded in SQLite outbox before any network request.",
    "Conflict resolution must never trust client device wall clocks; monotonic revisions or server timestamps govern.",
    "Sync failures must preserve the local queue with exponential backoff retry metadata.",
    "Binary attachments must verify local SHA-256 hash before marking sync as complete.",
  ],
  starterSchemas: {
    "schema.sql": `-- SQLite schema for offline mobile inspection engine
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft', 'completed', 'synced')),
  updated_at_revision INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_mutations (
  mutation_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  mutation_type TEXT NOT NULL CHECK(mutation_type IN ('CREATE', 'UPDATE', 'DELETE')),
  revision INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_flight', 'acknowledged', 'failed')),
  retry_count INTEGER DEFAULT 0,
  created_at_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photo_cache (
  photo_id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  local_path TEXT NOT NULL,
  is_uploaded INTEGER DEFAULT 0,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id)
);`,
    "sync-types.ts": `export interface OutboxMutation {
  mutationId: string;
  entityId: string;
  mutationType: "CREATE" | "UPDATE" | "DELETE";
  clientRevision: number;
  payload: Record<string, unknown>;
  status: "pending" | "in_flight" | "acknowledged" | "failed";
  retryCount: number;
  createdAtUtc: string;
}

export interface SyncDeltaRequest {
  clientId: string;
  lastServerRevision: number;
  mutations: OutboxMutation[];
}

export interface SyncDeltaResponse {
  serverRevision: number;
  acknowledgedMutationIds: string[];
  serverDeltas: Array<{
    entityId: string;
    serverRevision: number;
    payload: Record<string, unknown>;
  }>;
}

export interface ConflictResolutionPolicy {
  resolveConflict(
    localMutation: OutboxMutation,
    serverState: { entityId: string; serverRevision: number; payload: Record<string, unknown> }
  ): "APPLY_SERVER" | "RETRY_LOCAL" | "MANUAL_MERGE";
}`,
    "sync-processor.ts": `import type { ConflictResolutionPolicy, OutboxMutation, SyncDeltaRequest, SyncDeltaResponse } from "./sync-types";

export class OfflineSyncProcessor {
  private clientId: string;
  private lastServerRevision: number = 0;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  buildSyncRequest(pendingMutations: OutboxMutation[]): SyncDeltaRequest {
    return {
      clientId: this.clientId,
      lastServerRevision: this.lastServerRevision,
      mutations: pendingMutations,
    };
  }

  // DELIBERATE BUG / INJECTED TRAP:
  // Uses client wall-clock timestamp (Date.parse(m.createdAtUtc)) to decide who wins,
  // allowing a mobile device with an inaccurate clock set in 2020 or 2030 to corrupt server state!
  resolveConflictNaive(
    local: OutboxMutation,
    serverTimestampMs: number
  ): "APPLY_LOCAL" | "APPLY_SERVER" {
    const localTime = Date.parse(local.createdAtUtc);
    return localTime > serverTimestampMs ? "APPLY_LOCAL" : "APPLY_SERVER";
  }
}`,
  },
  rubric: [
    {
      id: "rubric-offline-req-1",
      category: "PROBLEM_FRAMING",
      sfiaLevel: 3,
      statement: "Establishes SQLite outbox queue invariants, monotonic revisions, and offline audit isolation before writing code.",
      weight: 15,
      successSignals: [
        "Inquires about transactional boundaries between local UI mutations and outbox records.",
        "Clarifies how server acknowledges batches vs single items.",
      ],
      failureModes: [
        "Attempts to send direct network HTTP requests without checking or writing to local SQLite.",
      ],
    },
    {
      id: "rubric-offline-req-2",
      category: "TECHNICAL_APPROACH",
      sfiaLevel: 3,
      statement: "Cleanly decouples persistent SQLite outbox storage, synchronization worker, and transport layer.",
      weight: 15,
      successSignals: [
        "Implements transactional outbox queue with atomic state transitions (pending -> in_flight -> acknowledged).",
        "Uses clean async abstractions for SQLite queries.",
      ],
      failureModes: [
        "Updates UI state while silently dropping failed outbox writes.",
      ],
    },
    {
      id: "rubric-offline-req-3",
      category: "AI_DIRECTION",
      sfiaLevel: 3,
      statement: "Directs AI in phased increments: SQLite schema -> transactional outbox enqueue -> bidirectional delta sync -> conflict handling.",
      weight: 15,
      successSignals: [
        "Prompts AI to write database transactions with rollback on failure.",
        "Directs AI to write unit tests for disconnected network simulations.",
      ],
      failureModes: [
        "Lets AI generate untyped in-memory arrays pretending to be durable persistence.",
      ],
    },
    {
      id: "rubric-offline-req-4",
      category: "CRITICAL_JUDGMENT",
      sfiaLevel: 3,
      statement: "Catches and refactors the planted trap: AI resolves conflicts using client device wall-clock timestamps rather than monotonic revisions, allowing desynchronized phones to overwrite valid server data.",
      weight: 20,
      injectedTrap: "AI uses client device clock timestamps for Last-Write-Wins conflict resolution, allowing offline phones with incorrect clocks to overwrite fresh inspection data.",
      successSignals: [
        "Identifies that client device clocks are untrusted and susceptible to drift/spoofing.",
        "Refactors conflict resolution to use server monotonic revisions or logical version vectors.",
      ],
      failureModes: [
        "Accepts client timestamp comparison uncritically.",
      ],
    },
    {
      id: "rubric-offline-req-5",
      category: "TRADEOFF_AWARENESS",
      sfiaLevel: 3,
      statement: "Evaluates trade-offs between full payload synchronization vs field-level JSON deltas vs binary photo multipart uploading.",
      weight: 10,
      successSignals: [
        "Discusses bandwidth consumption over slow mobile networks (3G/satellite).",
        "Evaluates when to upload large photos (immediate vs on Wi-Fi).",
      ],
      failureModes: [
        "Claims uploading entire SQLite database on every change is acceptable.",
      ],
    },
    {
      id: "rubric-offline-req-6",
      category: "DOMAIN_FIT",
      sfiaLevel: 3,
      statement: "Respects offline-first mobile domain patterns: SQLite durability, SHA-256 binary validation, and retry with backoff.",
      weight: 15,
      successSignals: [
        "Ensures photo references verify local SHA-256 checksums before completing sync.",
        "Increments retryCount and uses exponential backoff on network failures.",
      ],
      failureModes: [
        "Deletes failed outbox items immediately on network drop, losing candidate inspection data.",
      ],
    },
    {
      id: "rubric-offline-req-7",
      category: "COMMUNICATION",
      sfiaLevel: 3,
      statement: "Documents SQLite outbox schema, sync retry state machine, and conflict resolution rules with precision.",
      weight: 10,
      successSignals: [
        "Clearly documents schema migration and transaction semantics.",
        "Provides lucid diagrams or steps for interrupted network recovery.",
      ],
      failureModes: [
        "Leaves critical sync error states and retry loops undocumented.",
      ],
    },
  ],
  provenance: {
    origin: "deterministic_fallback",
    resolutionReason: "GENERATED",
  },
  verification: {
    status: "PENDING",
  },
  metadata: {
    createdAt: "2026-10-08T00:00:00.000Z",
    usageCount: 1,
    promptVersion: "ecd-v2.1",
  },
};
