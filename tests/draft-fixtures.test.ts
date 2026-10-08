import { describe, expect, it, vi } from "vitest";
import {
  COLLABORATIVE_EDITING_DRAFT_FIXTURE,
  OFFLINE_SYNC_DRAFT_FIXTURE,
} from "@/lib/engine/draft-fixtures";
import { runAgenticGenerationPipeline } from "@/lib/engine/pipeline";
import * as envModule from "@/lib/env";

describe("M04 — Collaborative Editing & Offline-Sync Draft Fixtures (G08–G10)", () => {
  // G08: Collaborative-editing draft fixtures
  it("G08: provides complete collaborative editing draft fixture with CRDT convergence rubric and PENDING status", async () => {
    // 1. Inspect fixture structure
    expect(COLLABORATIVE_EDITING_DRAFT_FIXTURE.id).toBe("draft-collab-crdt-01");
    expect(COLLABORATIVE_EDITING_DRAFT_FIXTURE.verification.status).toBe("PENDING");
    expect(COLLABORATIVE_EDITING_DRAFT_FIXTURE.tier).toBe("TIER_3_GENERATED");
    expect(COLLABORATIVE_EDITING_DRAFT_FIXTURE.provenance?.origin).toBe("deterministic_fallback");

    // Brief covers concurrent edits, duplicate packets, and reconnect
    const brief = COLLABORATIVE_EDITING_DRAFT_FIXTURE.briefMarkdown;
    expect(brief).toMatch(/vector clock/i);
    expect(brief).toMatch(/convergence/i);
    expect(brief).toMatch(/idempotency/i);
    expect(brief).toMatch(/reconnection/i);

    // Rubric targets CRDT convergence and causality (no generic queue rubric substitution)
    const rubric = COLLABORATIVE_EDITING_DRAFT_FIXTURE.rubric;
    expect(rubric.length).toBe(7);
    const totalWeight = rubric.reduce((acc, r) => acc + r.weight, 0);
    expect(totalWeight).toBe(100);

    const critJudgment = rubric.find((r) => r.category === "CRITICAL_JUDGMENT");
    expect(critJudgment).toBeDefined();
    expect(critJudgment?.injectedTrap).toMatch(/vector clock|crdt/i);

    // 2. Test generation pipeline with collaborative editing JD
    vi.spyOn(envModule, "aiApiKey").mockReturnValue(undefined);
    vi.spyOn(envModule, "isDemoMode").mockReturnValue(true);

    const collabJd = `Role: Senior Distributed Systems Engineer\nCompany: Atlassian Sydney\nResponsibilities: Build real-time collaborative document editing protocols using CRDTs and vector clocks. Handle concurrent out-of-order WebSocket packets.`;

    const generated = await runAgenticGenerationPipeline(collabJd, "Atlassian");
    expect(generated.verification.status).toBe("PENDING");
    expect(generated.roleTitle).toMatch(/collaborative|crdt/i);
    expect(generated.briefMarkdown).toMatch(/vector clock/i);
    expect(generated.starterSchemas["crdt-types.ts"]).toBeDefined();

    // Verify rubric is specific to CRDT / collaborative editing, not generic payroll
    const genCritJudgment = generated.rubric.find((r) => r.category === "CRITICAL_JUDGMENT");
    expect(genCritJudgment?.statement).toMatch(/crdt|vector clock|convergence/i);
    expect(genCritJudgment?.statement).not.toMatch(/payroll|tax/i);

    vi.restoreAllMocks();
  });

  // G09: Offline-sync draft fixtures
  it("G09: provides complete offline sync draft fixture addressing SQLite outbox, inaccurate clocks, and delta sync", async () => {
    // 1. Inspect fixture structure
    expect(OFFLINE_SYNC_DRAFT_FIXTURE.id).toBe("draft-offline-sync-02");
    expect(OFFLINE_SYNC_DRAFT_FIXTURE.verification.status).toBe("PENDING");
    expect(OFFLINE_SYNC_DRAFT_FIXTURE.tier).toBe("TIER_3_GENERATED");

    // Brief covers SQLite outbox, delta sync, inaccurate clocks, binary cache
    const brief = OFFLINE_SYNC_DRAFT_FIXTURE.briefMarkdown;
    expect(brief).toMatch(/sqlite/i);
    expect(brief).toMatch(/outbox/i);
    expect(brief).toMatch(/delta sync/i);
    expect(brief).toMatch(/wall clock/i);
    expect(brief).toMatch(/photo/i);

    // Rubric targets SQLite outbox, clock untrustworthiness, and delta sync
    const rubric = OFFLINE_SYNC_DRAFT_FIXTURE.rubric;
    expect(rubric.length).toBe(7);
    const totalWeight = rubric.reduce((acc, r) => acc + r.weight, 0);
    expect(totalWeight).toBe(100);

    const critJudgment = rubric.find((r) => r.category === "CRITICAL_JUDGMENT");
    expect(critJudgment?.injectedTrap).toMatch(/clock timestamps|Last-Write-Wins/i);

    // Starter schemas include SQLite schema with outbox table and sync processor
    expect(OFFLINE_SYNC_DRAFT_FIXTURE.starterSchemas["schema.sql"]).toContain("outbox_mutations");
    expect(OFFLINE_SYNC_DRAFT_FIXTURE.starterSchemas["sync-processor.ts"]).toBeDefined();

    // 2. Test generation pipeline with offline sync JD
    vi.spyOn(envModule, "aiApiKey").mockReturnValue(undefined);
    vi.spyOn(envModule, "isDemoMode").mockReturnValue(true);

    const offlineJd = `Role: Senior Mobile Platform Architect\nCompany: SafetyCulture\nResponsibilities: Engineer offline-sync capabilities for field inspections using local SQLite and bidirectional mutation queues. Handle mobile network drops.`;

    const generated = await runAgenticGenerationPipeline(offlineJd, "SafetyCulture");
    expect(generated.verification.status).toBe("PENDING");
    expect(generated.roleTitle).toMatch(/offline/i);
    expect(generated.briefMarkdown).toMatch(/sqlite|outbox/i);
    expect(generated.starterSchemas["schema.sql"]).toContain("outbox_mutations");

    const genCritJudgment = generated.rubric.find((r) => r.category === "CRITICAL_JUDGMENT");
    expect(genCritJudgment?.statement).toMatch(/clock|outbox|sync/i);

    vi.restoreAllMocks();
  });

  // G10: Wrong-domain source/task pairing (Macquarie vulnerability role)
  it("G10: prevents wrong-domain pairing by generating cybersecurity vulnerability task instead of payroll/CDR for Macquarie", async () => {
    vi.spyOn(envModule, "aiApiKey").mockReturnValue(undefined);
    vi.spyOn(envModule, "isDemoMode").mockReturnValue(true);

    const macquarieSecurityJd = `Role: Senior Software Engineer — Cybersecurity & Detection Engineering
Company: Macquarie Group
Location: Sydney, Australia
Description: Macquarie is a global financial group. This engineering position operates strictly within Enterprise Cybersecurity.
Responsibilities:
- Build automated vulnerability detection and zero-trust policy enforcement gateways.
- Enforce canonical path validation preventing directory traversal attacks.
- Ensure strict fail-closed access control across internal proxy gateways.
Note: Consumer Data Right (CDR) and consumer banking features are explicitly out of scope for this role.`;

    const challenge = await runAgenticGenerationPipeline(macquarieSecurityJd, "Macquarie Group");

    // Status must be strictly pending (not auto-approved)
    expect(challenge.verification.status).toBe("PENDING");
    expect(challenge.verification.badge).toBeUndefined();

    // Must NOT be a payroll or CDR task
    expect(challenge.roleTitle).not.toMatch(/payroll|wage|tax/i);
    expect(challenge.roleTitle).not.toMatch(/consumer data right|cdr/i);
    expect(challenge.briefMarkdown).not.toMatch(/single touch payroll|ato/i);

    // Must correctly generate a cybersecurity vulnerability detection task
    expect(challenge.roleTitle).toMatch(/cybersecurity|vulnerability|detection/i);
    expect(challenge.briefMarkdown).toMatch(/zero-trust|traversal|vulnerability/i);
    expect(challenge.technicalInvariants.some((inv) => /traversal|fail closed|redacted/i.test(inv))).toBe(true);

    vi.restoreAllMocks();
  });
});
