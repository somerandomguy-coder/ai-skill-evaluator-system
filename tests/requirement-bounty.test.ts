import { describe, expect, it } from "vitest";
import {
  getBountyRequirements,
  getBountyRequirementById,
  submitRequirementReview,
  getMentorBountyStats,
} from "@/lib/engine/requirement-bounty";

describe("Mentor Requirement Bounty System", () => {
  it("loads requirements and allows filtering by category and query", () => {
    const all = getBountyRequirements();
    expect(all.totalCount).toBeGreaterThan(0);
    expect(all.categories.length).toBeGreaterThan(0);
    expect(all.employers.length).toBeGreaterThan(0);

    // Search query test
    const search = getBountyRequirements({ query: "simulation" });
    expect(search.items.length).toBeGreaterThan(0);
    for (const item of search.items) {
      const match =
        item.statement.toLowerCase().includes("simulation") ||
        item.challengeTitle.toLowerCase().includes("simulation") ||
        item.employer.toLowerCase().includes("simulation") ||
        item.category.toLowerCase().includes("simulation") ||
        (item.injectedTrap && item.injectedTrap.toLowerCase().includes("simulation"));
      expect(match).toBe(true);
    }
  });

  it("submits a verification review and claims bounty credits", () => {
    const all = getBountyRequirements();
    const candidateReq = all.items[0];
    expect(candidateReq).toBeDefined();

    const mentorId = "test_mentor_qa";
    const initialStats = getMentorBountyStats(mentorId);

    const result = submitRequirementReview({
      requirementId: candidateReq.id,
      mentorId,
      mentorName: "Test Mentor Architect",
      action: "VERIFY",
      notes: "Validated against Australian statutory and SFIA 9 standards.",
    });

    expect(result.item.status).toBe("VERIFIED");
    expect(result.item.verifiedBy?.mentorName).toBe("Test Mentor Architect");
    expect(result.reward.credits).toBe(candidateReq.bountyCredits);
    expect(result.updatedStats.totalCredits).toBe(initialStats.totalCredits + candidateReq.bountyCredits);
    expect(result.updatedStats.verifiedCount).toBe(initialStats.verifiedCount + 1);

    // Verify lookup by ID reflects changes
    const fetched = getBountyRequirementById(candidateReq.id);
    expect(fetched?.status).toBe("VERIFIED");
  });

  it("lodges a duplicate requirement with deduplication bounty", () => {
    const all = getBountyRequirements();
    const candidateReq = all.items[1];
    expect(candidateReq).toBeDefined();

    const mentorId = "test_mentor_qa_2";
    const result = submitRequirementReview({
      requirementId: candidateReq.id,
      mentorId,
      mentorName: "Deduplication Specialist",
      action: "FLAG_DUPLICATE",
      duplicateOfId: "req-standard-01",
      notes: "Duplicate of baseline standard.",
    });

    expect(result.item.status).toBe("FLAGGED_DUPLICATE");
    expect(result.reward.credits).toBe(25);
    expect(result.reward.badge).toBe("Deduplication Bounty");
  });

  it("flags a defective requirement with defect screening bounty", () => {
    const all = getBountyRequirements();
    const candidateReq = all.items[2];
    expect(candidateReq).toBeDefined();

    const mentorId = "test_mentor_qa_3";
    const result = submitRequirementReview({
      requirementId: candidateReq.id,
      mentorId,
      mentorName: "Fairness Auditor",
      action: "FLAG_BAD",
      reason: "Contains hidden bias or demographic barrier proxy",
      notes: "Requires local knowledge not specified in brief.",
    });

    expect(result.item.status).toBe("FLAGGED_BAD");
    expect(result.reward.credits).toBe(35);
    expect(result.reward.badge).toBe("Quality Vigilance Award");
  });

  it("strictly rejects duplicate verification attempts and prevents farming credits", () => {
    const all = getBountyRequirements();
    const candidateReq = all.items[3] || all.items[0];

    const mentorId = "single_claim_mentor";
    submitRequirementReview({
      requirementId: candidateReq.id,
      mentorId,
      mentorName: "One Time Mentor",
      action: "VERIFY",
    });

    // Second attempt by same mentor must throw
    expect(() => {
      submitRequirementReview({
        requirementId: candidateReq.id,
        mentorId,
        mentorName: "One Time Mentor",
        action: "VERIFY",
      });
    }).toThrow(/already submitted an audit/);

    // Second attempt by another mentor after verification must throw
    expect(() => {
      submitRequirementReview({
        requirementId: candidateReq.id,
        mentorId: "second_mentor",
        mentorName: "Second Mentor",
        action: "VERIFY",
      });
    }).toThrow(/already been verified/);
  });
});
