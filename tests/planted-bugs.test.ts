import { describe, expect, it } from "vitest";
import { buildRoleStarterTemplate } from "@/lib/engine/starter-template";
import { auditPlantedBugs, PLANTED_BUGS_SPECS } from "@/lib/engine/planted-bugs";
import { buildCognitiveSuites } from "@/lib/services/cognitive-rubric";
import type { TurnView } from "@/lib/data/types";

describe("Planted 3-Bug Starter Template Specifications", () => {
  it("defines exactly 3 deliberate subtle domain bugs in specs", () => {
    expect(PLANTED_BUGS_SPECS).toHaveLength(3);
    const ids = PLANTED_BUGS_SPECS.map((b) => b.id);
    expect(ids).toContain("currency");
    expect(ids).toContain("privacy");
    expect(ids).toContain("boundary");
  });

  it("injects all 3 planted bug utilities into every starter workspace", () => {
    const template = buildRoleStarterTemplate({
      title: "CDR Gateway & Statutory Payroll",
      brief: "Build an enterprise Australian payroll and data consent service.",
    });

    // 1. Currency Float Bug
    expect(template["src/utils/currency.ts"]).toBeDefined();
    expect(template["src/utils/currency.ts"]).toContain("unitPriceCents / 100");
    expect(template["src/utils/currency.ts"]).toContain('currency = "USD"');

    // 2. Data Privacy Bug
    expect(template["src/utils/audit.ts"]).toBeDefined();
    expect(template["src/utils/audit.ts"]).toContain("userId: context.userId");
    expect(template["src/utils/audit.ts"]).toContain("sanitizedEmail");

    // 3. Boundary & Capacity Underflow Bug
    expect(template["src/utils/capacity.ts"]).toBeDefined();
    expect(template["src/utils/capacity.ts"]).toContain("limit.current < limit.maximum");
    expect(template["src/utils/capacity.ts"]).not.toContain(">= 0");
  });
});

describe("Planted Bugs Auditing Engine (auditPlantedBugs)", () => {
  const mockPassiveTurns: TurnView[] = [
    {
      seq: 1,
      role: "USER",
      content: "Just generate the whole app and make it look nice.",
      filesWritten: [],
      reasoning: null,
      createdAt: new Date().toISOString(),
    },
    {
      seq: 2,
      role: "USER",
      content: "Thanks, looks good to me.",
      filesWritten: [],
      reasoning: null,
      createdAt: new Date().toISOString(),
    },
  ];

  it("reports 0/3 bugs found when candidate passively accepts AI code without checking", () => {
    const result = auditPlantedBugs(mockPassiveTurns);

    expect(result.totalCount).toBe(3);
    expect(result.foundCount).toBe(0);
    expect(result.summary).toContain("0/3 bugs found");
    expect(result.summary).toContain("currency precision, data privacy, and boundary limits");

    const currencyBug = result.bugs.find((b) => b.id === "currency");
    const privacyBug = result.bugs.find((b) => b.id === "privacy");
    const boundaryBug = result.bugs.find((b) => b.id === "boundary");

    expect(currencyBug?.status).toBe("MISSED");
    expect(privacyBug?.status).toBe("MISSED");
    expect(boundaryBug?.status).toBe("MISSED");
  });

  it("reports 1/3 bugs found when candidate catches boundary underflow but misses currency and privacy", () => {
    const turnsWithBoundaryFix: TurnView[] = [
      {
        seq: 1,
        role: "USER",
        content: "Wait, the capacity check allows negative numbers and underflow (< 0). Please add a check that limit.current >= 0.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = auditPlantedBugs(turnsWithBoundaryFix);

    expect(result.foundCount).toBe(1);
    expect(result.summary).toContain("1/3 bugs found");
    expect(result.summary).toContain("Boundary & Capacity Guard");
    expect(result.summary).toContain("forgot to check currency & float precision and data privacy & identity leak");

    const boundaryBug = result.bugs.find((b) => b.id === "boundary");
    expect(boundaryBug?.status).toBe("FIXED");
    expect(boundaryBug?.evidence).toContain("boundary guards");
  });

  it("reports 2/3 bugs found when candidate fixes currency precision and privacy leaks", () => {
    const turnsWithTwoFixes: TurnView[] = [
      {
        seq: 1,
        role: "USER",
        content: "We must use integer cents and Australian AUD currency for payroll calculations to prevent floating point precision drift.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
      {
        seq: 2,
        role: "USER",
        content: "Check src/utils/audit.ts — the userId is leaking unmasked into logs. Please sanitize and mask the user id.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = auditPlantedBugs(turnsWithTwoFixes);

    expect(result.foundCount).toBe(2);
    expect(result.summary).toContain("2/3 bugs found");
    expect(result.summary).toContain("forgot to check boundary & capacity guard");
  });

  it("reports 3/3 bugs found when all three planted flaws are caught and resolved", () => {
    const turnsWithAllThree: TurnView[] = [
      {
        seq: 1,
        role: "USER",
        content: "Ensure all money uses integer cents and ATO Australian currency, avoiding float division.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
      {
        seq: 2,
        role: "USER",
        content: "Sanitize all PII in audit logs, including masking the userId.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
      {
        seq: 3,
        role: "USER",
        content: "Fix the capacity check to guard against negative numbers and underflow (< 0).",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = auditPlantedBugs(turnsWithAllThree);

    expect(result.foundCount).toBe(3);
    expect(result.summary).toContain("3/3 bugs found");
    expect(result.summary).toContain("Outstanding zero-trust rigour!");
    expect(result.bugs.every((b) => b.status === "FIXED")).toBe(true);
  });
});

describe("Integration: buildCognitiveSuites() with Planted Bugs", () => {
  it("attaches plantedBugs audit to suiteB and sets planted_bugs_found on flags", () => {
    const res = buildCognitiveSuites({
      sessionId: "session-planted-bugs-test",
      challengeTitle: "CDR Gateway",
      overallScore: 85,
      turns: [
        {
          seq: 1,
          role: "USER",
          content: "Audit src/utils/audit.ts: mask the userId so identity is not leaked in audit logs.",
          filesWritten: [],
          reasoning: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    expect(res.suiteB.plantedBugs).toBeDefined();
    expect(res.suiteB.plantedBugs?.foundCount).toBe(1);
    expect(res.suiteB.plantedBugs?.totalCount).toBe(3);
    expect(res.suiteB.flags.planted_bugs_found).toBe(1);
    expect(res.suiteB.flags.planted_bugs_total).toBe(3);
    expect(res.suiteB.flags.flaw_caught).toBe(true);
  });
});

describe("Domain-Aware Bug Archetypes", () => {
  it("audits marketplace & subscription billing flaws correctly", () => {
    const turns: TurnView[] = [
      {
        seq: 1,
        role: "USER",
        content: "We must ensure webhook idempotency with eventId deduplication so retries don't cause double-billing.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
      {
        seq: 2,
        role: "USER",
        content: "Calculate 10% Australian GST and proration in integer cents with Math.round to avoid float drift.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
      {
        seq: 3,
        role: "USER",
        content: "Return HTTP 500 on transient failures to trigger gateway retries, and emit traceId in SRE metrics.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = auditPlantedBugs(turns, {
      "src/reconciler.ts": "export class SubscriptionWebhookReconciler { processedEventIds = new Set(); traceId = 'tr_1'; }",
    });

    expect(result.foundCount).toBe(3);
    expect(result.summary).toContain("3/3 bugs found");
    expect(result.summary).toContain("webhook idempotency, integer cent GST, and SRE error status semantics");
  });

  it("audits zero trust agent security gate flaws correctly", () => {
    const turns: TurnView[] = [
      {
        seq: 1,
        role: "USER",
        content: "Enforce fail-closed default-deny: any unknown tool must throw SecurityPolicyViolationException.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
      {
        seq: 2,
        role: "USER",
        content: "Use path.resolve() to canonicalize the path and verify it stays inside the sandbox root jail to prevent traversal.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
      {
        seq: 3,
        role: "USER",
        content: "Build an append-only audit log with SHA-256 hash chain linking prevHash to entryHash.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = auditPlantedBugs(turns, {
      "src/security-gate.ts": "export class AgentSecurityExecutionGate { defaultAction = 'DENY'; prevHash = '0'; }",
    });

    expect(result.foundCount).toBe(3);
    expect(result.summary).toContain("3/3 bugs found");
    expect(result.summary).toContain("fail-closed default-deny, canonical root jail, and tamper-evident hash chaining");
  });

  it("audits frontend canvas & graphics flaws correctly", () => {
    const turns: TurnView[] = [
      {
        seq: 1,
        role: "USER",
        content: "Scale canvas dimensions with window.devicePixelRatio so Retina screens render crisp without blur.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
      {
        seq: 2,
        role: "USER",
        content: "Make sure to clean up the resize and mousemove listeners with removeEventListener in useEffect unmount.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
      {
        seq: 3,
        role: "USER",
        content: "Clamp dimensions with Math.max(0, width) to prevent bounding box underflow and NaN coordinates.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = auditPlantedBugs(turns, {
      "src/canvas.ts": "export class CanvasRenderer { devicePixelRatio = 2; }",
    });

    expect(result.foundCount).toBe(3);
    expect(result.summary).toContain("3/3 bugs found");
    expect(result.summary).toContain("Retina DPR scaling, listener cleanup, and bounding box underflow");
  });
});

