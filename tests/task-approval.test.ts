/**
 * Tests for B03 — Durable, Version-Specific Task Approval (Rows P07–P09).
 *
 * Verifies:
 *  - P07: Unknown challenge audit returns 404 with no orphan audit record;
 *         Non-mentor rejected;
 *         Content edit creates a new PENDING version (version 2) with no approved badge.
 *  - P08: Failed re-audit of formerly approved task revokes badge/eligibility;
 *         Historical audit remains in audit log;
 *         Two separate repository instances observe the identical revoked state.
 *  - P09: Pinning old session to its starting challenge version;
 *         Editing challenge to a new version preserves older version's rubric & requirement IDs.
 */
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import {
  TaskApprovalRepository,
  computeChallengeContentDigest,
  type MentorAuditRecord,
} from "@/lib/data/task-approval";
import type { ChallengeV2 } from "@/lib/types/assessment-v2";

const TEST_STORE_PATH = path.join(process.cwd(), ".cache", "test-task-approval.json");

function makeTestChallenge(id = "test-challenge-stp2"): ChallengeV2 {
  return {
    id,
    tier: "TIER_3_GENERATED",
    companyName: "Employment Hero",
    roleTitle: "Staff Payroll Engineer",
    sfiaProfile: {
      level: 3,
      primarySkills: ["PROG"],
      attributes: {
        autonomy: "High",
        influence: "Squad",
        complexity: "Complex",
        knowledge: "Expert",
        businessSkills: "Leadership",
      },
    },
    briefMarkdown: "# STP Phase 2 Payroll Disaggregation Engine\nBuild statutory engine.",
    technicalInvariants: ["Statutory wage rounding in integer cents", "STP Phase 2 pay-run event schema"],
    starterSchemas: { "src/payroll.ts": "export function calculatePay() {}" },
    rubric: [
      {
        id: "req-stp2-1",
        category: "TECHNICAL_APPROACH",
        weight: 3,
        sfiaLevel: 3,
        statement: "Implement statutory rounding in integer cents",
        successSignals: ["Uses integer arithmetic"],
        failureModes: ["Floating point rounding errors"],
      },
      {
        id: "req-stp2-2",
        category: "CRITICAL_JUDGMENT",
        weight: 3,
        sfiaLevel: 3,
        statement: "Handle backdated statutory adjustments correctly",
        successSignals: ["Tracks adjustment pay-periods"],
        failureModes: ["Silently overwrites current pay run"],
      },
    ],
    verification: {
      status: "PENDING",
      badge: undefined,
    },
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
    },
  };
}

describe("B03 — Durable, Version-Specific Task Approval", () => {
  let repo: TaskApprovalRepository;

  beforeEach(() => {
    if (fs.existsSync(TEST_STORE_PATH)) {
      fs.unlinkSync(TEST_STORE_PATH);
    }
    repo = new TaskApprovalRepository(TEST_STORE_PATH);
  });

  describe("P07 — Audit unknown challenge, fake mentor, edited approved task", () => {
    it("returns 404 when auditing an unknown challenge without recording orphan audit", () => {
      expect(() =>
        repo.auditChallenge({
          challengeId: "non-existent-challenge-id",
          mentorId: "mentor-123",
          mentorName: "Alice Mentor",
          scores: {
            realism: 4,
            sfiaCalibration: 4,
            trapEfficacy: 4,
            observability: 4,
            fairness: 4,
          },
          actorRole: "MENTOR",
        })
      ).toThrowError(/not found in repository/i);

      // Verify no orphan audit record was stored
      expect(repo.getAudits("non-existent-challenge-id")).toEqual([]);
    });

    it("rejects unauthorized non-mentor audit attempt (403)", () => {
      const challenge = makeTestChallenge();
      repo.registerChallenge(challenge);

      expect(() =>
        repo.auditChallenge({
          challengeId: challenge.id,
          mentorId: "candidate-456",
          mentorName: "Bob Candidate",
          scores: {
            realism: 4,
            sfiaCalibration: 4,
            trapEfficacy: 4,
            observability: 4,
            fairness: 4,
          },
          actorRole: "CANDIDATE",
        })
      ).toThrowError(/Mentor access required/i);

      // Verify challenge remained PENDING
      const stored = repo.getChallenge(challenge.id);
      expect(stored?.verification.status).toBe("PENDING");
      expect(repo.getAudits(challenge.id)).toHaveLength(0);
    });

    it("creates a new PENDING version when an approved task's content is edited", () => {
      const challenge = makeTestChallenge();
      repo.registerChallenge(challenge);

      // Approve version 1
      const auditResult = repo.auditChallenge({
        challengeId: challenge.id,
        mentorId: "mentor-1",
        mentorName: "Dr. Mentor",
        scores: {
          realism: 4,
          sfiaCalibration: 4,
          trapEfficacy: 4,
          observability: 4,
          fairness: 4,
        },
        actorRole: "MENTOR",
      });

      expect(auditResult.evaluation.passed).toBe(true);
      expect(auditResult.challenge.verification.status).toBe("APPROVED");
      expect(auditResult.challenge.tier).toBe("TIER_1_VERIFIED");
      expect(auditResult.challenge.verification.badge).toBeDefined();

      // Verify v1 is approved
      const v1 = repo.getChallengeVersion(challenge.id, 1);
      expect(v1?.status).toBe("APPROVED");
      expect(v1?.badge).toBeDefined();

      // Edit the rubric / brief
      const newRubric = [
        ...challenge.rubric,
        {
          id: "req-stp2-3",
          category: "AI_DIRECTION" as const,
          weight: 2,
          sfiaLevel: 3 as const,
          statement: "Verify AI-suggested award penalty rates before calculation",
          successSignals: ["Flags unverified rates"],
          failureModes: ["Blindly adopts AI values"],
        },
      ];

      const updated = repo.updateChallengeContent(challenge.id, {
        rubric: newRubric,
      });

      // The new version must be version 2
      expect(updated.version).toBe(2);
      // Status on version 2 must be PENDING
      expect(updated.status).toBe("PENDING");
      expect(updated.tier).toBe("TIER_3_GENERATED");
      expect(updated.badge).toBeUndefined();

      // Active challenge read returns version 2 in PENDING state
      const active = repo.getChallenge(challenge.id);
      expect(active?.verification.status).toBe("PENDING");
      expect(active?.verification.badge).toBeUndefined();
      expect(active?.tier).toBe("TIER_3_GENERATED");

      // Original version 1 remains APPROVED in historical versions
      const historicalV1 = repo.getChallengeVersion(challenge.id, 1);
      expect(historicalV1?.status).toBe("APPROVED");
      expect(historicalV1?.badge).toBeDefined();
    });
  });

  describe("P08 — Failed re-audit and multi-instance revocation", () => {
    it("revokes approved badge and tier upon failed re-audit while retaining historical audit records", () => {
      const challenge = makeTestChallenge();
      repo.registerChallenge(challenge);

      // 1. Initial successful audit (Pass: 20/20)
      repo.auditChallenge({
        challengeId: challenge.id,
        mentorId: "mentor-1",
        mentorName: "Initial Mentor",
        scores: { realism: 4, sfiaCalibration: 4, trapEfficacy: 4, observability: 4, fairness: 4 },
        actorRole: "MENTOR",
      });

      expect(repo.isEligible(challenge.id)).toBe(true);
      expect(repo.getChallenge(challenge.id)?.verification.status).toBe("APPROVED");

      // 2. Subsequent re-audit fails (e.g., trap efficacy 1, total 10/20 -> REJECTED)
      const failedAudit = repo.auditChallenge({
        challengeId: challenge.id,
        mentorId: "mentor-2",
        mentorName: "Senior Auditor",
        scores: { realism: 2, sfiaCalibration: 2, trapEfficacy: 1, observability: 3, fairness: 2 },
        notes: "Trap efficacy degraded and realism inadequate",
        actorRole: "MENTOR",
      });

      expect(failedAudit.evaluation.passed).toBe(false);
      expect(failedAudit.evaluation.status).toBe("REJECTED");

      // Status and badge must be REVOKED
      const current = repo.getChallenge(challenge.id);
      expect(current?.verification.status).toBe("REJECTED");
      expect(current?.verification.badge).toBeUndefined();
      expect(current?.tier).toBe("TIER_3_GENERATED");
      expect(repo.isEligible(challenge.id)).toBe(false);

      // Historical audit records must retain BOTH audits
      const audits = repo.getAudits(challenge.id);
      expect(audits).toHaveLength(2);
      expect(audits[0].decision).toBe("APPROVED");
      expect(audits[0].mentorId).toBe("mentor-1");
      expect(audits[1].decision).toBe("REJECTED");
      expect(audits[1].mentorId).toBe("mentor-2");
      expect(audits[1].notes).toBe("Trap efficacy degraded and realism inadequate");
    });

    it("guarantees a second repository instance and process read observe the identical revoked state", () => {
      const challenge = makeTestChallenge();
      repo.registerChallenge(challenge);

      // Approve in instance 1
      repo.auditChallenge({
        challengeId: challenge.id,
        mentorId: "mentor-1",
        scores: { realism: 4, sfiaCalibration: 4, trapEfficacy: 4, observability: 4, fairness: 4 },
        actorRole: "MENTOR",
      });

      // Second instance reads state
      const repoInstance2 = new TaskApprovalRepository(TEST_STORE_PATH);
      expect(repoInstance2.isEligible(challenge.id)).toBe(true);

      // Instance 1 fails re-audit
      repo.auditChallenge({
        challengeId: challenge.id,
        mentorId: "mentor-auditor",
        scores: { realism: 1, sfiaCalibration: 1, trapEfficacy: 1, observability: 1, fairness: 1 },
        actorRole: "MENTOR",
      });

      // Instance 2 immediately reads store and observes revoked status
      const repoInstance2Fresh = new TaskApprovalRepository(TEST_STORE_PATH);
      const read2 = repoInstance2Fresh.getChallenge(challenge.id);
      expect(read2?.verification.status).toBe("REJECTED");
      expect(read2?.verification.badge).toBeUndefined();
      expect(read2?.tier).toBe("TIER_3_GENERATED");
      expect(repoInstance2Fresh.isEligible(challenge.id)).toBe(false);

      // Audits observed by instance 2 contain both records
      const auditsInstance2 = repoInstance2Fresh.getAudits(challenge.id);
      expect(auditsInstance2).toHaveLength(2);
    });
  });

  describe("P09 — Session pinning and rubric identity stability", () => {
    it("pins completed session to its starting challenge version when a new bank version is created", () => {
      const challenge = makeTestChallenge();
      repo.registerChallenge(challenge);

      // Session starts on Version 1
      const pinnedVersion = 1;
      const v1Snapshot = repo.getChallenge(challenge.id, pinnedVersion);
      expect(v1Snapshot).toBeDefined();
      expect(v1Snapshot?.rubric).toHaveLength(2);
      expect(v1Snapshot?.rubric.map((r) => r.id)).toEqual(["req-stp2-1", "req-stp2-2"]);

      // A candidate completes an evaluation against Version 1 requirements
      const sessionEvaluation = {
        sessionId: "sess-completed-1",
        challengeId: challenge.id,
        challengeVersion: pinnedVersion,
        scoredRequirements: [
          { requirementId: "req-stp2-1", score: 4 },
          { requirementId: "req-stp2-2", score: 5 },
        ],
      };

      // Later, the challenge rubric is revised: req-stp2-2 is removed and req-stp2-new is added
      repo.updateChallengeContent(challenge.id, {
        briefMarkdown: "Updated brief with new tax laws",
        rubric: [
          {
            id: "req-stp2-1",
            category: "TECHNICAL_APPROACH",
            weight: 3,
            sfiaLevel: 3,
            statement: "Implement statutory rounding in integer cents",
            successSignals: ["Uses integer arithmetic"],
            failureModes: ["Floating point rounding errors"],
          },
          {
            id: "req-stp2-new",
            category: "DOMAIN_FIT",
            weight: 4,
            sfiaLevel: 3,
            statement: "Comply with 2026 superannuation guarantee updates",
            successSignals: ["Validates 12% super rate"],
            failureModes: ["Uses legacy 11.5% rate"],
          },
        ],
      });

      // Active challenge is now Version 2 with new requirements
      const activeChallenge = repo.getChallenge(challenge.id);
      expect(activeChallenge?.rubric.map((r) => r.id)).toEqual(["req-stp2-1", "req-stp2-new"]);

      // The historical session pinned to Version 1 still resolves Version 1's rubric unchanged!
      const resolvedHistorical = repo.getChallenge(sessionEvaluation.challengeId, sessionEvaluation.challengeVersion);
      expect(resolvedHistorical).toBeDefined();
      expect(resolvedHistorical?.rubric.map((r) => r.id)).toEqual(["req-stp2-1", "req-stp2-2"]);

      // Verify that every requirement ID from the session evaluation exists in the pinned challenge version
      const historicalIds = new Set(resolvedHistorical?.rubric.map((r) => r.id));
      for (const scored of sessionEvaluation.scoredRequirements) {
        expect(historicalIds.has(scored.requirementId)).toBe(true);
      }
    });

    it("computes deterministic content digest and detects any rubric or invariant changes", () => {
      const challenge = makeTestChallenge();
      const digestA = computeChallengeContentDigest(challenge);

      // Same content produces identical digest
      const digestA2 = computeChallengeContentDigest(challenge);
      expect(digestA).toBe(digestA2);

      // Changing invariant changes digest
      const modifiedInvariants = {
        ...challenge,
        technicalInvariants: [...challenge.technicalInvariants, "New invariant"],
      };
      expect(computeChallengeContentDigest(modifiedInvariants)).not.toBe(digestA);

      // Changing rubric statement changes digest
      const modifiedRubric = {
        ...challenge,
        rubric: [
          {
            ...challenge.rubric[0],
            statement: "Modified requirement statement",
          },
          challenge.rubric[1],
        ],
      };
      expect(computeChallengeContentDigest(modifiedRubric)).not.toBe(digestA);
    });
  });
});
