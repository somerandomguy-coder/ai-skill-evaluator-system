import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth";
import * as env from "@/lib/env";
import { GET as getBounties } from "@/app/api/mentor/bounties/route";
import { POST as postBountyReview } from "@/app/api/mentor/bounties/review/route";
import { POST as postChallengeAudit } from "@/app/api/mentor/challenge-audit/route";
import {
  POST as postGenerate,
  resetGenerationQuotas,
} from "@/app/api/challenge/generate/route";
import * as authMod from "@/lib/auth";
import type { UserView } from "@/lib/data/types";

describe("B01 — Real Identity & Boundary Enforcement (Rows P01–P03)", () => {
  beforeEach(() => {
    resetGenerationQuotas();
    vi.restoreAllMocks();
  });

  // P01: Forged user-ID cookie, expired token, user-set mentor role
  describe("P01: Identity Verification & Anti-Impersonation", () => {
    it("rejects forged and tampered session tokens", () => {
      // Unsigned raw user id
      expect(verifySessionToken("mentor-sarah")).toBeNull();

      // Tampered payload with bad signature
      const validToken = signSessionToken("candidate-1");
      const parts = validToken.split(":");
      const tamperedToken = `${parts[0]}:${parts[1]}:bad_signature_here`;
      expect(verifySessionToken(tamperedToken)).toBeNull();
    });

    it("rejects expired session tokens", () => {
      // Token created with negative ttl (already expired)
      const expiredToken = signSessionToken("candidate-1", -1000);
      expect(verifySessionToken(expiredToken)).toBeNull();
    });

    it("verifies valid signed session tokens within expiry window", () => {
      const token = signSessionToken("candidate-1", 60 * 1000);
      const verified = verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe("candidate-1");
    });

    it("prevents demo role switching for arbitrary users when not in demo mode", async () => {
      vi.spyOn(env, "isDemoMode").mockReturnValue(false);
      const { switchUser } = await import("@/app/actions/auth");

      // In production mode, arbitrary user switchUser must redirect with demo_disabled
      try {
        await switchUser("mentor-sarah");
      } catch (err: any) {
        expect(err?.message).toContain("NEXT_REDIRECT");
        expect(err?.digest).toContain("demo_disabled");
      }
    });

    it("allows seeded demo accounts to log in even when not in demo mode", async () => {
      vi.spyOn(env, "isDemoMode").mockReturnValue(false);
      vi.spyOn(authMod, "setUserCookie").mockResolvedValue(undefined as any);
      const { switchUser } = await import("@/app/actions/auth");

      // Seeded demo user candidate-1 successfully sets cookie and redirects without error
      try {
        await switchUser("candidate-1");
      } catch (err: any) {
        expect(err?.message).toContain("NEXT_REDIRECT");
        expect(err?.digest).not.toContain("demo_disabled");
      }
    });
  });

  // P02: Anonymous/candidate bounty GET/review or mentor audit
  describe("P02: Boundary Authorization & Bounty Disablement", () => {
    it("returns 401 for anonymous access to bounty endpoints", async () => {
      vi.spyOn(authMod, "getCurrentUser").mockResolvedValue(null);

      const reqGet = new Request("http://localhost:3000/api/mentor/bounties");
      const resGet = await getBounties(reqGet);
      expect(resGet.status).toBe(401);

      const reqReview = new Request("http://localhost:3000/api/mentor/bounties/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requirementId: "req-1", action: "VERIFY" }),
      });
      const resReview = await postBountyReview(reqReview);
      expect(resReview.status).toBe(401);
    });

    it("returns 403 for candidate attempting mentor bounty or challenge audit", async () => {
      const candidateUser: UserView = {
        id: "cand-1",
        email: "cand@example.com",
        name: "Test Candidate",
        role: "CANDIDATE",
      };
      vi.spyOn(authMod, "getCurrentUser").mockResolvedValue(candidateUser);

      const reqGet = new Request("http://localhost:3000/api/mentor/bounties");
      const resGet = await getBounties(reqGet);
      expect(resGet.status).toBe(403);

      const reqAudit = new Request("http://localhost:3000/api/mentor/challenge-audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengeId: "test-challenge",
          scores: { realism: 4, sfiaCalibration: 4, trapEfficacy: 4, observability: 4, fairness: 4 },
        }),
      });
      const resAudit = await postChallengeAudit(reqAudit);
      expect(resAudit.status).toBe(403);
    });

    it("disables bounty endpoints even for mentors pending policy enforcement", async () => {
      const mentorUser: UserView = {
        id: "mentor-1",
        email: "mentor@example.com",
        name: "Test Mentor",
        role: "MENTOR",
      };
      vi.spyOn(authMod, "getCurrentUser").mockResolvedValue(mentorUser);

      const reqGet = new Request("http://localhost:3000/api/mentor/bounties");
      const resGet = await getBounties(reqGet);
      expect(resGet.status).toBe(403);
      const dataGet = await resGet.json();
      expect(dataGet.error).toContain("disabled pending policy enforcement");
    });
  });

  // P03: Anonymous/overquota/oversized generation request
  describe("P03: Generation Boundary & Candidate Safe DTO", () => {
    it("rejects anonymous generation in non-demo mode before paid call", async () => {
      vi.spyOn(env, "isDemoMode").mockReturnValue(false);
      vi.spyOn(authMod, "getCurrentUser").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/challenge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawJd: "Role: Software Engineer\nCompany: Australian Tech\nBuild banking microservice with tests.",
        }),
      });

      const res = await postGenerate(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Authentication required");
    });

    it("rejects oversized generation request (> 64KB) with 413", async () => {
      const giantText = "A".repeat(70 * 1024);
      const req = new Request("http://localhost:3000/api/challenge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawJd: giantText }),
      });

      const res = await postGenerate(req);
      expect(res.status).toBe(413);
    });

    it("enforces bounded per-user operation quota (429)", async () => {
      const user: UserView = { id: "quota-user", email: "q@example.com", name: "Q", role: "CANDIDATE" };
      vi.spyOn(authMod, "getCurrentUser").mockResolvedValue(user);
      vi.spyOn(env, "isDemoMode").mockReturnValue(true);

      const reqBody = JSON.stringify({
        rawJd: "Role: Software Engineer — Payroll Systems\nCompany: Employment Hero\nBuild our STP Phase 2 disaggregation engine with statutory wage and integer cents precision.",
        companyName: "Employment Hero",
      });

      // Submit 5 requests to consume quota
      for (let i = 0; i < 5; i++) {
        const req = new Request("http://localhost:3000/api/challenge/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reqBody,
        });
        const res = await postGenerate(req);
        expect(res.status).toBe(200);
      }

      // 6th request should hit 429 quota limit
      const reqOver = new Request("http://localhost:3000/api/challenge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: reqBody,
      });
      const resOver = await postGenerate(reqOver);
      expect(resOver.status).toBe(429);
      const data = await resOver.json();
      expect(data.error).toContain("quota exceeded");
    });

    it("returns candidate-safe DTO excluding hidden traps, failure modes, and embedding vectors", async () => {
      const user: UserView = { id: "cand-safe-user", email: "c@example.com", name: "C", role: "CANDIDATE" };
      vi.spyOn(authMod, "getCurrentUser").mockResolvedValue(user);
      vi.spyOn(env, "isDemoMode").mockReturnValue(true);

      const req = new Request("http://localhost:3000/api/challenge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawJd: "Role: Software Engineer — Payroll Systems\nCompany: Employment Hero\nBuild our STP Phase 2 disaggregation engine with statutory wage and integer cents precision.",
          companyName: "Employment Hero",
        }),
      });

      const res = await postGenerate(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Ensure challenge object does NOT expose internal traps or vectors to candidate
      expect(data.challenge.embeddingVector).toBeUndefined();
      for (const reqItem of data.challenge.rubric) {
        expect(reqItem.injectedTrap).toBeUndefined();
        expect(reqItem.failureModes).toBeUndefined();
      }
    });
  });
});
