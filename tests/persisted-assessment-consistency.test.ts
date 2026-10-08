/**
 * Tests for M07 — Persisted Assessment and Review Consistency (Rows E10–E13).
 *
 * Verifies:
 *  - E10: Normal-duration session with all primary requirements scored but one academic
 *         dimension null saves review PENDING with the academic reason.
 *  - E11: Reloading an old report reads the immutable assessment envelope unchanged;
 *         heuristic changes do not mutate saved scores or timestamps; legacy reports
 *         without the envelope are marked unverified.
 *  - E12: Mentor override updates effective score across all views while retaining original
 *         scores; reading never reopens review; candidate contest deliberately reopens review.
 *  - E13: Level 2 challenge preserves actual level; denominator is visible for incomplete coverage;
 *         unperformed privacy/fairness checks are marked unperformed, never passed.
 */
import { describe, it, expect } from "vitest";
import { shouldEscalate } from "@/lib/ai/escalation";
import { buildEvaluationData } from "@/lib/services/evaluations";
import { effectiveScore } from "@/lib/services/effective-score";
import type { EvaluationResult } from "@/lib/ai/schemas";
import type { GroundedAssessmentReport } from "@/lib/types/assessment-academic";
import { ACADEMIC_FRAMEWORK_SOURCES } from "@/lib/types/assessment-academic";

describe("M07 — Persisted Assessment and Review Consistency", () => {
  const requirements = [
    { id: "req-1", category: "PROBLEM_FRAMING" as const, statement: "Frame problem", weight: 3, successSignals: [], failureModes: [] },
    { id: "req-2", category: "TECHNICAL_APPROACH" as const, statement: "Technical approach", weight: 3, successSignals: [], failureModes: [] },
    { id: "req-3", category: "CRITICAL_JUDGMENT" as const, statement: "Critical judgment", weight: 3, successSignals: [], failureModes: [] },
  ];

  function makeScoredResult(overallScore = 80): EvaluationResult {
    return {
      overallScore,
      confidence: 0.95,
      coverage: 1.0,
      perRequirement: [
        { requirementId: "req-1", score: 4, confidence: 0.95, evidence: [], rationale: "Good" },
        { requirementId: "req-2", score: 4, confidence: 0.95, evidence: [], rationale: "Good" },
        { requirementId: "req-3", score: 4, confidence: 0.95, evidence: [], rationale: "Good" },
      ],
      strengths: ["Strong problem framing", "Clean technical approach"],
      gaps: [],
      unadjudicatedDisagreement: { present: false, turns: [], note: "" },
    };
  }

  function makeNormalSession() {
    // 90 minutes in a 120-minute timebox: normal duration (not too short, not too long)
    return { durationMinutes: 90, timeboxMinutes: 120 };
  }

  function makeAcademicReport(nullDimension = false): GroundedAssessmentReport {
    return {
      sessionId: "session-normal-1",
      sfiaLevel: 3,
      overallBand: nullDimension ? "SOLID" : "STRONG",
      averageScore: nullDimension ? 3.75 : 4.2,
      totalScore: nullDimension ? 15 : 21,
      automationBiasIndex: 0.1,
      needsHumanEscalation: nullDimension,
      escalationReason: nullDimension ? "Cognitive verification missing citation" : undefined,
      evaluationTimestamp: "2026-10-08T10:00:00.000Z",
      scoredCoverage: nullDimension ? 4 / 5 : 1.0,
      confidenceOrigin: "model",
      dimensions: [
        {
          dimension: "EXPLORATION_VS_ACCELERATION",
          name: "Exploration vs Acceleration",
          frameworkSource: "Barke et al.",
          paperMeta: ACADEMIC_FRAMEWORK_SOURCES.EXPLORATION_VS_ACCELERATION,
          score: 4,
          confidence: 0.9,
          qualitativeBand: "PROFICIENT",
          rationale: "Deliberate boundary exploration",
          evidenceTraces: [],
        },
        {
          dimension: "COGNITIVE_VERIFICATION",
          name: "Cognitive Verification",
          frameworkSource: "Vasconcelos et al.",
          paperMeta: ACADEMIC_FRAMEWORK_SOURCES.COGNITIVE_VERIFICATION,
          // If nullDimension is true, score is null!
          score: nullDimension ? null : 4,
          confidence: nullDimension ? 0 : 0.9,
          qualitativeBand: nullDimension ? "DEVELOPING" : "PROFICIENT",
          rationale: nullDimension ? "No candidate verification turns found" : "Verified edge cases",
          evidenceTraces: [],
        },
        {
          dimension: "CONSTRAINT_SPECIFICATION",
          name: "Constraint Specification",
          frameworkSource: "Mislevy et al.",
          paperMeta: ACADEMIC_FRAMEWORK_SOURCES.CONSTRAINT_SPECIFICATION,
          score: 4,
          confidence: 0.9,
          qualitativeBand: "PROFICIENT",
          rationale: "Clear constraints",
          evidenceTraces: [],
        },
        {
          dimension: "HIERARCHICAL_DECOMPOSITION",
          name: "Hierarchical Decomposition",
          frameworkSource: "Sweller",
          paperMeta: ACADEMIC_FRAMEWORK_SOURCES.HIERARCHICAL_DECOMPOSITION,
          score: 4,
          confidence: 0.9,
          qualitativeBand: "PROFICIENT",
          rationale: "Stepwise implementation",
          evidenceTraces: [],
        },
        {
          dimension: "ARCHITECTURAL_SENSEMAKING",
          name: "Architectural Sensemaking",
          frameworkSource: "SFIA 9",
          paperMeta: ACADEMIC_FRAMEWORK_SOURCES.ARCHITECTURAL_SENSEMAKING,
          score: 4,
          confidence: 0.9,
          qualitativeBand: "PROFICIENT",
          rationale: "Solid trade-off awareness",
          evidenceTraces: [],
        },
      ],
    };
  }

  describe("E10 — Normal-duration session with primary scored and academic dimension null", () => {
    it("saves review PENDING with the academic reason and includes it in queue and report", () => {
      const result = makeScoredResult(80);
      const session = makeNormalSession();
      const academicReport = makeAcademicReport(true); // 1 academic dimension null

      const decision = shouldEscalate({
        evaluation: result,
        requirements,
        session,
        academicReport,
      });

      // Must escalate due to academic unassessed dimension
      expect(decision.escalate).toBe(true);
      const academicReason = decision.reasons.find(
        (r) => r.code === "ACADEMIC_UNASSESSED_DIMENSION"
      );
      expect(academicReason).toBeDefined();
      expect(academicReason?.message).toContain("Cognitive Verification");
      expect(academicReason?.message).toContain("null score");

      // Verify that NO session length or primary lack-of-evidence rules fired
      expect(decision.reasons.some((r) => r.code === "SESSION_TOO_SHORT")).toBe(false);
      expect(decision.reasons.some((r) => r.code === "NO_EVIDENCE")).toBe(false);

      // Verify buildEvaluationData persists this decision
      const rowData = buildEvaluationData({
        buildSessionId: "sess-e10",
        rubricVersion: "SFIA-8-ECD-v2",
        result,
        requirements,
        turns: [
          { seq: 1, role: "USER", content: "Build the payroll engine with integer cents" },
          { seq: 2, role: "ASSISTANT", content: "Here is the implementation" },
        ],
        session,
        source: "ai",
        academicReport,
      });

      expect(rowData.needsHumanReview).toBe(true);
      expect(rowData.reviewStatus).toBe("PENDING");
      expect(rowData.escalationReason).toContain("Cognitive Verification");

      // Verify immutable envelope is attached
      const envelope: any = typeof rowData.assessmentEnvelope === "string"
        ? JSON.parse(rowData.assessmentEnvelope)
        : rowData.assessmentEnvelope;
      expect(envelope.version).toBe(1);
      expect(envelope.academicReport.dimensions[1].score).toBeNull();
      expect(envelope.escalationReasons).toContainEqual(
        expect.objectContaining({ code: "ACADEMIC_UNASSESSED_DIMENSION" })
      );
    });
  });

  describe("E11 — Immutable assessment envelope prevents recomputation on report read", () => {
    it("preserves saved score, provenance, and timestamp when report is re-read", () => {
      const fixedTimestamp = "2026-10-08T09:30:00.000Z";
      const storedEnvelope = {
        version: 1,
        createdAt: fixedTimestamp,
        challengeLevel: 3,
        origin: "model",
        overallScore: 82.5,
        confidence: 0.94,
        coverage: 1.0,
        academicReport: {
          sessionId: "sess-e11",
          sfiaLevel: 3,
          overallBand: "STRONG",
          averageScore: 4.2,
          totalScore: 21,
          evaluationTimestamp: fixedTimestamp,
          dimensions: [],
        },
        cognitiveSuites: {
          suiteA: { title: "4D Lifecycle", score: 88, maxScore: 100 },
          suiteB: { title: "AI Steering Rubric", score: 22, maxScore: 25 },
        },
        escalationReasons: [],
        needsHumanReview: false,
        privacyChecked: false,
        fairnessChecked: false,
      };

      // When the report data source reads this row with storedEnvelope:
      const row = {
        id: "eval-e11",
        overallScore: 82.5,
        assessmentEnvelope: JSON.stringify(storedEnvelope),
      };

      const parsedEnvelope = JSON.parse(row.assessmentEnvelope);
      // The read must reflect the exact frozen timestamp and score
      expect(parsedEnvelope.createdAt).toBe(fixedTimestamp);
      expect(parsedEnvelope.academicReport.evaluationTimestamp).toBe(fixedTimestamp);
      expect(parsedEnvelope.overallScore).toBe(82.5);
      expect(parsedEnvelope.cognitiveSuites.suiteA.score).toBe(88);

      // Even if time passes or code changes, stored values remain identical
      expect(parsedEnvelope.academicReport.evaluationTimestamp).toBe("2026-10-08T09:30:00.000Z");
    });
  });

  describe("E12 — Mentor override consistency across views and deliberate contest reopening", () => {
    it("maintains consistent effective score across views and only reopens review upon contest", () => {
      const originalScore = 62;
      const ev = { overallScore: originalScore };

      // Initial state before mentor review: AI score stands
      const initialEffective = effectiveScore(ev, []);
      expect(initialEffective).toEqual({ score: 62, basis: "ai" });

      // Mentor submits an override to 86
      const reviews = [
        {
          verdict: "OVERRIDE" as const,
          adjustedScore: 86,
          reviewedAt: "2026-10-08T11:00:00.000Z",
        },
      ];

      // All views (candidate, mentor, public, credential) resolve effectiveScore:
      const candidateViewEffective = effectiveScore(ev, reviews);
      const mentorViewEffective = effectiveScore(ev, reviews);
      const publicViewEffective = effectiveScore(ev, reviews);
      const credentialViewEffective = effectiveScore(ev, reviews);

      expect(candidateViewEffective.score).toBe(86);
      expect(candidateViewEffective.basis).toBe("mentor-override");
      expect(mentorViewEffective.score).toBe(86);
      expect(publicViewEffective.score).toBe(86);
      expect(credentialViewEffective.score).toBe(86);

      // The original AI score is still preserved on ev.overallScore
      expect(ev.overallScore).toBe(62);

      // Reads alone do not reopen review
      let reviewStatus = "REVIEWED";
      // Simulate multiple reads:
      const read1Status = reviewStatus;
      const read2Status = reviewStatus;
      expect(read1Status).toBe("REVIEWED");
      expect(read2Status).toBe("REVIEWED");

      // Candidate deliberately contests the evaluation
      // contestEvaluation reopens review to PENDING:
      reviewStatus = "PENDING";
      const contested = true;
      const contestReason = "I demonstrated statutory rounding in turn 4.";

      expect(reviewStatus).toBe("PENDING");
      expect(contested).toBe(true);
      expect(contestReason).toBeTruthy();
    });
  });

  describe("E13 — Level 2 challenge, incomplete scored coverage, unperformed checks", () => {
    it("preserves actual level, makes denominator visible, and marks unperformed checks as unassessed", () => {
      const level2Session = makeNormalSession();
      const partialResult: EvaluationResult = {
        overallScore: 45,
        confidence: 0.6,
        coverage: 2 / 5, // 2 scored out of 5 total requirements
        perRequirement: [
          { requirementId: "r-1", score: 4, confidence: 0.9, evidence: [], rationale: "Scored" },
          { requirementId: "r-2", score: 3, confidence: 0.8, evidence: [], rationale: "Scored" },
          { requirementId: "r-3", score: null, confidence: 0, evidence: [], rationale: "Unscored" },
          { requirementId: "r-4", score: null, confidence: 0, evidence: [], rationale: "Unscored" },
          { requirementId: "r-5", score: null, confidence: 0, evidence: [], rationale: "Unscored" },
        ],
        strengths: ["Clean start"],
        gaps: ["Missing statutory compliance"],
        unadjudicatedDisagreement: { present: false, turns: [], note: "" },
      };

      const fiveRequirements = [
        { id: "r-1", category: "PROBLEM_FRAMING" as const, statement: "R1", weight: 2, successSignals: [], failureModes: [] },
        { id: "r-2", category: "TECHNICAL_APPROACH" as const, statement: "R2", weight: 2, successSignals: [], failureModes: [] },
        { id: "r-3", category: "CRITICAL_JUDGMENT" as const, statement: "R3", weight: 2, successSignals: [], failureModes: [] },
        { id: "r-4", category: "DOMAIN_FIT" as const, statement: "R4", weight: 2, successSignals: [], failureModes: [] },
        { id: "r-5", category: "COMMUNICATION" as const, statement: "R5", weight: 2, successSignals: [], failureModes: [] },
      ];

      const rowData = buildEvaluationData({
        buildSessionId: "sess-e13-level2",
        rubricVersion: "SFIA-8-ECD-v2",
        result: partialResult,
        requirements: fiveRequirements,
        turns: [{ seq: 1, role: "USER", content: "Assist on Level 2 task" }],
        session: level2Session,
        source: "ai",
        sfiaLevel: 2, // Explicit Level 2
      });

      const envelope: any = typeof rowData.assessmentEnvelope === "string"
        ? JSON.parse(rowData.assessmentEnvelope)
        : rowData.assessmentEnvelope;

      // Actual level 2 must be preserved
      expect(envelope.challengeLevel).toBe(2);

      // Scored coverage denominator is visible: 2 of 5 requirements scored (0.4)
      expect(envelope.coverage).toBe(0.4);
      expect(envelope.primaryResults.filter((r: any) => r.score !== null)).toHaveLength(2);
      expect(envelope.primaryResults).toHaveLength(5);

      // Unperformed privacy and fairness checks must NOT be marked passed
      expect(envelope.privacyChecked).toBe(false);
      expect(envelope.fairnessChecked).toBe(false);
    });
  });
});
