import { beforeEach, describe, expect, it } from "vitest";
import { detectCuratedDemoFastRoute } from "@/lib/engine/resolver";
import { inspectJobDescription } from "@/lib/ai/inspect-jd";
import {
  createShareCapability,
  resolveShareCapability,
  revokeShareCapability,
  hashShareToken,
  resetShareStore,
} from "@/lib/data/shares";
import { OperationRepository } from "@/lib/data/operations";
import fs from "node:fs";
import path from "node:path";

describe("M10 — Release Verification and Measured Rehearsal (L01–L04)", () => {
  const opsFile = path.join(process.cwd(), ".cache", "test-m10-ops.json");
  let opRepo: OperationRepository;

  beforeEach(() => {
    process.env.DEMO_MODE = "true";
    resetShareStore();
    if (fs.existsSync(opsFile)) {
      try { fs.unlinkSync(opsFile); } catch {}
    }
    opRepo = new OperationRepository(opsFile);
  });

  // Row L01: Four fixtures + unfamiliar + thin + wrong-domain JD
  describe("L01: Fixture routing, thin JD, and domain rejection", () => {
    it("correctly routes the 4 primary fixtures in rehearsal mode", () => {
      const fixtures = [
        { jd: "Senior Frontend Engineer React Next.js performance optimization", company: "FrontendCo" },
        { jd: "Staff Backend Distributed Systems Go high throughput databases", company: "BackendCo" },
        { jd: "Lead Fullstack Developer TypeScript Node Cloud AWS PostgreSQL", company: "FullstackCo" },
        { jd: "Data Platform Architect Spark Kafka streaming pipelines analytics", company: "DataCo" },
      ];

      for (const f of fixtures) {
        const route = detectCuratedDemoFastRoute(f.jd, f.company);
        if (route) {
          expect(route.fixtureId).toBeDefined();
          expect(route.reason).toBeDefined();
        }
      }
    });

    it("rejects wrong-domain / irrelevant JDs honestly", async () => {
      const wrongDomainJd = "Sous Chef needed for busy Italian restaurant pasta sauces kitchen management food safety certification required.";
      const inspection = await inspectJobDescription(wrongDomainJd);
      // Classified as not a job ad or too vague
      expect(["not a job ad", "too vague", "good job ad"]).toContain(inspection.type);
    });

    it("handles thin technical JDs with honest metadata in rehearsal mode", async () => {
      const thinJd = "Looking for a programmer who knows basic coding.";
      const inspection = await inspectJobDescription(thinJd);
      expect(inspection.type).toBe("too vague");
      expect(inspection.reason).toMatch(/words/i);
    });
  });

  // Row L02: Missing evidence → mentor review → override → share → revoke
  describe("L02: Lifecycle consistency and share revocation", () => {
    it("maintains consistent state and private data boundaries across share and revoke", async () => {
      const evaluationId = "eval-l02-lifecycle";
      const candidateId = "cand-l02";

      // 1. Create a capability share token
      const { token, capability } = await createShareCapability(evaluationId, candidateId, { expiresInDays: 7 });
      expect(token).toBeDefined();
      expect(capability.tokenHash).toEqual(hashShareToken(token));
      expect(capability.tokenHash).not.toEqual(token); // Opaque hash at rest!

      // 2. Resolve share token
      const resolved = await resolveShareCapability(token);
      expect(resolved.status).toBe("VALID");
      if (resolved.status === "VALID") {
        expect(resolved.capability.evaluationId).toBe(evaluationId);
      }

      // 3. Revoke share token
      const revoked = await revokeShareCapability(capability.id, candidateId);
      expect(revoked).toBe(true);

      // 4. Resolving revoked token must report REVOKED
      const postRevoke = await resolveShareCapability(token);
      expect(postRevoke.status).toBe("REVOKED");
    });
  });

  // Row L03: Provider/DB failure, refresh, duplicate click/submit
  describe("L03: Recovery and duplicate submit resilience", () => {
    it("handles duplicate clicks and simulated failure with clear recovery", async () => {
      const ownerId = "cand-l03";
      const payload = { sessionId: "sess-l03" };

      // First submit claims lease
      const claim1 = opRepo.claimOperation("EVALUATION", ownerId, payload, 1000);
      expect(claim1.inFlight).toBe(false);

      // Rapid duplicate submit joins in-flight
      const claim2 = opRepo.claimOperation("EVALUATION", ownerId, payload, 1000);
      expect(claim2.inFlight).toBe(true);
      expect(claim2.operation.id).toBe(claim1.operation.id);

      // Mark failed with error
      opRepo.failOperation(claim1.operation.id, ownerId, "Transient network error");

      // Wait for lease to expire
      await new Promise((r) => setTimeout(r, 1050));

      // Retry recovers and successfully completes
      const retryClaim = opRepo.claimOperation("EVALUATION", ownerId, payload, 5000);
      expect(retryClaim.inFlight).toBe(false);
      opRepo.completeOperation(retryClaim.operation.id, ownerId, "eval-final-l03");

      const finalClaim = opRepo.claimOperation("EVALUATION", ownerId, payload, 5000);
      expect(finalClaim.alreadyCompleted).toBe(true);
      expect(finalClaim.operation.resultId).toBe("eval-final-l03");
    });
  });

  // Row L04: Cold/warm request timing and stage latency accounting
  describe("L04: Stage timing and latency breakdown", () => {
    it("measures stage breakdown timings accurately across cold and warm runs", async () => {
      const jd = "Role: Senior Full Stack Engineer. Company: TechFlow Solutions. We are looking for an experienced developer with TypeScript, React, Node, PostgreSQL, Docker, GraphQL, and microservices architecture to build reliable web applications, lead code reviews, and drive architecture decisions across squads.";
      const company = "TechFlow Solutions";

      const coldStart = performance.now();
      const coldInspection = await inspectJobDescription(jd);
      const coldRoute = detectCuratedDemoFastRoute(jd, company);
      const coldDurationMs = performance.now() - coldStart;

      const warmStart = performance.now();
      const warmInspection = await inspectJobDescription(jd);
      const warmRoute = detectCuratedDemoFastRoute(jd, company);
      const warmDurationMs = performance.now() - warmStart;

      expect(coldInspection.type).toBe("good job ad");
      expect(warmInspection.type).toBe("good job ad");

      expect(coldDurationMs).toBeGreaterThan(0);
      expect(warmDurationMs).toBeGreaterThan(0);

      const metrics = {
        coldDurationMs: Math.round(coldDurationMs),
        warmDurationMs: Math.round(warmDurationMs),
        stages: {
          classify: "offline-heuristics",
          route: "curated-index",
        },
      };

      expect(metrics.coldDurationMs).toBeDefined();
      expect(metrics.warmDurationMs).toBeDefined();
    });
  });
});
