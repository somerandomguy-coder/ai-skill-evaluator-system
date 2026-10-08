import { describe, expect, it, beforeEach } from "vitest";
import {
  createShareCapability,
  resolveShareCapability,
  revokeShareCapability,
  resetShareStore,
  hashShareToken,
} from "@/lib/data/shares";
import {
  toEmployerReportDto,
  assertPrivateReportAuthorized,
} from "@/lib/data/employer-dto";
import type { EvaluationView, UserView } from "@/lib/data/types";

const MOCK_EVALUATION: EvaluationView = {
  id: "eval-private-001",
  sessionId: "session-001",
  ownerId: "candidate-owner",
  candidateName: "Alice Candidate",
  createdAt: "2026-10-08T00:00:00.000Z",
  challenge: {
    id: "chal-001",
    title: "CDR Consent Gateway",
    timeboxMinutes: 90,
    rubricVersion: "SFIA-9-v2",
  },
  job: {
    roleTitle: "Backend Engineer",
    employer: "Biza.io",
  },
  source: "ai",
  overallScore: 84,
  confidence: 0.9,
  coverage: 1.0,
  effective: {
    score: 84,
    basis: "ai",
  },
  results: [
    {
      requirementId: "req-1",
      category: "PROBLEM_FRAMING",
      statement: "Clarifies scope before coding",
      weight: 20,
      score: 5,
      confidence: 0.95,
      rationale: "Good questions",
      evidence: [
        {
          type: "turn",
          ref: "1",
          quote: "Do we handle AEST offset transitions?",
          verified: true,
          speaker: "USER",
        },
      ],
    },
  ],
  strengths: ["Strong evidence on: Clarifies scope before coding"],
  gaps: [],
  needsHumanReview: false,
  // Sensitive private fields:
  turns: [
    { seq: 1, role: "USER", content: "Do we handle AEST offset transitions? My phone is 0412345678." },
    { seq: 2, role: "ASSISTANT", content: "Yes.", reasoning: "Internal prompt secret reasoning" },
  ],
  files: {
    "src/secret.ts": "// private proprietary code implementation\nexport const internalKey = 'priv-99';",
  },
  contestReason: "Private candidate objection: I believe my turn 1 was graded harshly.",
} as unknown as EvaluationView;

describe("B02 — Private Reports & Minimal Share Boundary (Rows P04–P06)", () => {
  beforeEach(() => {
    resetShareStore();
  });

  // P04: Another candidate or anonymous visitor opens private report/credential
  describe("P04: Private Report Access Authorization", () => {
    it("denies anonymous visitor attempting to view private report without share token", () => {
      expect(() => {
        assertPrivateReportAuthorized(null, "candidate-owner");
      }).toThrowError(/Authentication required/);
    });

    it("denies another candidate attempting to view private report knowing only the ID", () => {
      const otherCandidate: UserView = {
        id: "candidate-other",
        email: "bob@example.com",
        name: "Bob",
        role: "CANDIDATE",
      };

      expect(() => {
        assertPrivateReportAuthorized(otherCandidate, "candidate-owner");
      }).toThrowError(/Forbidden: Cross-owner access/);
    });

    it("allows the owner and authorized mentors to access the private report", () => {
      const owner: UserView = {
        id: "candidate-owner",
        email: "alice@example.com",
        name: "Alice",
        role: "CANDIDATE",
      };
      const mentor: UserView = {
        id: "mentor-sarah",
        email: "sarah@example.com",
        name: "Sarah Chen",
        role: "MENTOR",
      };

      expect(() => assertPrivateReportAuthorized(owner, "candidate-owner")).not.toThrow();
      expect(() => assertPrivateReportAuthorized(mentor, "candidate-owner")).not.toThrow();
    });
  });

  // P05: Valid share token, revoked/expired token, cached repeat
  describe("P05: Explicit Share Capabilities & Minimal Employer DTO", () => {
    it("creates an opaque share token with stored SHA-256 hash", async () => {
      const { token, capability } = await createShareCapability("eval-private-001", "candidate-owner");

      expect(token).toMatch(/^share_[a-f0-9]{48}$/);
      expect(capability.tokenHash).toBe(hashShareToken(token));
      expect(capability.scope).toBe("EMPLOYER_VIEW");
      expect(capability.revokedAt).toBeNull();
    });

    it("constructs minimal authorized employer DTO excluding private data", async () => {
      const { capability } = await createShareCapability("eval-private-001", "candidate-owner");
      const dto = toEmployerReportDto(MOCK_EVALUATION, capability);

      // Public fields present
      expect(dto.evaluationId).toBe("eval-private-001");
      expect(dto.roleTitle).toBe("Backend Engineer");
      expect(dto.employer).toBe("Biza.io");
      expect(dto.candidateName).toBe("Alice Candidate");
      expect(dto.overallScore).toBe(84);
      expect(dto.publicEvidence).toHaveLength(1);
      // A share link is not proof that a candidate consented to publish a
      // particular transcript quotation. The public view carries rubric
      // coverage only until quote-level consent is modelled explicitly.
      expect(dto.publicEvidence[0].publicExcerpt).toBeUndefined();

      // SENSITIVE PRIVATE FIELDS EXCLUDED
      const serializedDto = dto as unknown as Record<string, unknown>;
      expect(serializedDto.turns).toBeUndefined();
      expect(serializedDto.files).toBeUndefined();
      expect(serializedDto.contestReason).toBeUndefined();
      expect(serializedDto.reasoning).toBeUndefined();
      expect(serializedDto.rawModelProse).toBeUndefined();
      expect(serializedDto.shareTokenHash).toBeUndefined();
    });

    it("respects token revocation and expiration", async () => {
      const { token, capability } = await createShareCapability("eval-private-001", "candidate-owner", {
        expiresInDays: 7,
      });

      // 1. Valid before revocation
      const validRes = await resolveShareCapability(token);
      expect(validRes.status).toBe("VALID");

      // 2. Revoked by owner
      const revoked = await revokeShareCapability(capability.id, "candidate-owner");
      expect(revoked).toBe(true);

      const revokedRes = await resolveShareCapability(token);
      expect(revokedRes.status).toBe("REVOKED");

      // 3. Expired token
      const expiredCap = await createShareCapability("eval-private-001", "candidate-owner", {
        expiresInDays: -1, // already expired
      });
      const expiredRes = await resolveShareCapability(expiredCap.token);
      expect(expiredRes.status).toBe("EXPIRED");
    });
  });

  // P06: Full report sent to a client component
  describe("P06: Server-Side DTO Construction Boundary", () => {
    it("ensures public visitor receives only server-constructed minimal DTO", async () => {
      const { token } = await createShareCapability("eval-private-001", "candidate-owner");
      const resolved = await resolveShareCapability(token);
      expect(resolved.status).toBe("VALID");

      if (resolved.status === "VALID") {
        const publicDto = toEmployerReportDto(MOCK_EVALUATION, resolved.capability);
        const serialized = JSON.stringify(publicDto);

        // Verification of serialization payload:
        // Must NOT contain candidate phone number or proprietary file content or assistant reasoning
        expect(serialized).not.toContain("0412345678");
        expect(serialized).not.toContain("private proprietary code implementation");
        expect(serialized).not.toContain("Internal prompt secret reasoning");
        expect(serialized).not.toContain("Private candidate objection");
        expect(serialized).not.toContain("Do we handle AEST offset transitions?");

        // Must contain certified public evidence statement and score
        expect(serialized).toContain("Clarifies scope before coding");
        expect(serialized).toContain("84");
      }
    });
  });
});
