import { describe, expect, it, vi } from "vitest";
import {
  formatSourceJdForPrompt,
  runAgenticGenerationPipeline,
  REQUIRED_RUBRIC_CATEGORIES,
  BASELINE_RUBRIC_WEIGHTS,
} from "@/lib/engine/pipeline";
import { buildRoleStarterTemplate } from "@/lib/engine/starter-template";
import { PathError } from "@/lib/files";
import { resolveChallenge } from "@/lib/engine/resolver";
import * as envModule from "@/lib/env";

describe("Packet B1 — Generation contracts, dynamic truncation, and honest provenance", () => {
  describe("formatSourceJdForPrompt dynamic scaling (F11)", () => {
    it("dynamically respects non-default maxLen=1200 without negative omitted count", () => {
      const longText = "START_CHUNK_" + "x".repeat(3000) + "_END_CHUNK";
      const result = formatSourceJdForPrompt(longText, 1200);

      expect(result.sourceTruncated).toBe(true);
      // Budget: 70% opening (840) and 30% tail (360)
      const openingExpectedLen = Math.floor(1200 * 0.7); // 840
      const tailExpectedLen = 1200 - openingExpectedLen; // 360

      expect(result.omittedChars).toBe(longText.length - 1200);
      expect(result.omittedChars).toBeGreaterThan(0);
      expect(result.promptText).toContain("START_CHUNK_");
      expect(result.promptText).toContain("_END_CHUNK");
      expect(result.promptText).toContain(`[...OMITTED ${result.omittedChars} CHARACTERS OF MIDDLE TEXT...]`);
    });

    it("handles short maxLen=100 cleanly and bounds the opening/tail slices", () => {
      const text = "A".repeat(80) + "MIDDLE_SECRET" + "Z".repeat(80);
      const result = formatSourceJdForPrompt(text, 100);

      expect(result.sourceTruncated).toBe(true);
      expect(result.omittedChars).toBe(text.length - 100);
      expect(result.omittedChars).toBeGreaterThan(0);
      expect(result.promptText.startsWith("A".repeat(70))).toBe(true);
      expect(result.promptText.endsWith("Z".repeat(30))).toBe(true);
      expect(result.promptText).toContain(`[...OMITTED ${result.omittedChars} CHARACTERS OF MIDDLE TEXT...]`);
    });

    it("handles edge cases maxLen <= 0 safely", () => {
      const text = "Some sample job description text";
      const resultZero = formatSourceJdForPrompt(text, 0);
      expect(resultZero.sourceTruncated).toBe(true);
      expect(resultZero.omittedChars).toBe(text.length);
      expect(resultZero.promptText).toBe("");

      const resultNegative = formatSourceJdForPrompt(text, -10);
      expect(resultNegative.sourceTruncated).toBe(true);
      expect(resultNegative.omittedChars).toBe(text.length);
      expect(resultNegative.promptText).toBe("");
    });

    it("returns untruncated result when JD length is within maxLen", () => {
      const text = "Short concise JD for frontend engineer.";
      const result = formatSourceJdForPrompt(text, 5000);
      expect(result.sourceTruncated).toBe(false);
      expect(result.omittedChars).toBe(0);
      expect(result.promptText).toBe(text);
    });

    it("preserves decisive opening and tail facts while surfacing omitted middle facts", () => {
      const opening = "CRITICAL_FACT_1: Senior Backend Engineer at Canva Australia.";
      const middleDecisive = "DECISIVE_MIDDLE_REQUIREMENT: Must implement distributed saga pattern with outbox.";
      const tail = "CRITICAL_FACT_2: Strictly compliant with AU CDR Privacy Safeguard 12.";
      const paddedMiddle = "padding ".repeat(700);

      const fullJd = `${opening}\n${middleDecisive}\n${paddedMiddle}\n${tail}`;
      const result = formatSourceJdForPrompt(fullJd, 2000);

      expect(result.sourceTruncated).toBe(true);
      expect(result.promptText).toContain(opening);
      expect(result.promptText).toContain(tail);
      expect(result.omittedChars).toBeGreaterThan(0);
      expect(result.promptText).toContain(`[...OMITTED ${result.omittedChars} CHARACTERS OF MIDDLE TEXT...]`);
    });
  });

  describe("Honest provenance and serializable metadata contracts", () => {
    it("carries explicit serializable provenance and framework calibration fields in pipeline output", async () => {
      vi.spyOn(envModule, "aiApiKey").mockReturnValue(undefined);
      vi.spyOn(envModule, "isDemoMode").mockReturnValue(true);

      const rawJd = `Role: Senior Distributed Systems Engineer\nCompany: Atlassian\nResponsibilities: Build high-concurrency event-driven services with CQRS.`;
      const challenge = await runAgenticGenerationPipeline(rawJd, "Atlassian", undefined, {
        maxSourceJdLength: 3000,
      });

      // Verification and Tier
      expect(challenge.verification.status).toBe("PENDING");
      expect(challenge.tier).toBe("TIER_3_GENERATED");

      // Honest Provenance
      expect(challenge.provenance).toBeDefined();
      expect(challenge.provenance?.origin).toBe("deterministic_fallback");
      expect(challenge.provenance?.resolutionReason).toBe("GENERATED");
      expect(challenge.provenance?.configVersion).toBe("ecd-v2.1");
      expect(challenge.provenance?.generatedAt).toBeDefined();

      // Serialisable Metadata
      expect(challenge.metadata).toBeDefined();
      expect(challenge.metadata.promptVersion).toBe("ecd-v2.1");
      expect(challenge.metadata.generationConfigVersion).toBe("ecd-v2.1");
      expect(challenge.metadata.rubricVersion).toBe("sfia-9-ecd-v2.1");
      expect(challenge.metadata.calibrationFramework).toBe("SFIA 9 (Levels 2-3 subset)");
      expect(typeof challenge.metadata.sourceTruncated).toBe("boolean");
      expect(typeof challenge.metadata.omittedChars).toBe("number");
      expect(Array.isArray(challenge.metadata.stages)).toBe(true);
      expect(challenge.metadata.stages?.length).toBe(3);

      vi.restoreAllMocks();
    });

    it("preserves fallback provenance origin in resolver output", async () => {
      vi.spyOn(envModule, "aiApiKey").mockReturnValue(undefined);
      vi.spyOn(envModule, "isDemoMode").mockReturnValue(true);

      const unknownJd = `Role: Quantum Cryptography Specialist\nCompany: QuantumSec Sydney\nResponsibilities: Post-quantum lattice encryption.`;
      const resolution = await resolveChallenge(unknownJd, "QuantumSec Sydney");

      expect(resolution.tierResolved).toBe("TIER_3_GENERATED");
      expect(resolution.challenge.provenance?.origin).toBe("deterministic_fallback");
      expect(resolution.challenge.provenance?.resolutionReason).toBe("GENERATED");
      expect(resolution.challenge.verification.status).toBe("PENDING");

      vi.restoreAllMocks();
    });
  });

  describe("Rubric contract & 7-category completeness", () => {
    it("enforces all 7 required rubric categories and baseline weights totaling 100", () => {
      expect(REQUIRED_RUBRIC_CATEGORIES).toHaveLength(7);
      const expectedCategories = [
        "PROBLEM_FRAMING",
        "TECHNICAL_APPROACH",
        "AI_DIRECTION",
        "CRITICAL_JUDGMENT",
        "TRADEOFF_AWARENESS",
        "DOMAIN_FIT",
        "COMMUNICATION",
      ];
      expect(REQUIRED_RUBRIC_CATEGORIES).toEqual(expectedCategories);

      const sumWeights = Object.values(BASELINE_RUBRIC_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sumWeights).toBe(100);
    });
  });

  describe("Safe starter path validation in buildRoleStarterTemplate", () => {
    it("rejects path traversal attempts in starterSchemas", () => {
      expect(() => {
        buildRoleStarterTemplate({
          title: "Malicious Challenge",
          brief: "Test brief",
          starterSchemas: {
            "../etc/passwd": "root:x:0:0:root:/root:/bin/bash",
          },
        });
      }).toThrow(PathError);
    });

    it("rejects absolute and drive paths in starterSchemas", () => {
      expect(() => {
        buildRoleStarterTemplate({
          title: "Absolute Path Challenge",
          brief: "Test brief",
          starterSchemas: {
            "/var/log/syslog": "malicious content",
          },
        });
      }).toThrow(PathError);

      expect(() => {
        buildRoleStarterTemplate({
          title: "Windows Drive Path Challenge",
          brief: "Test brief",
          starterSchemas: {
            "C:\\boot.ini": "[boot loader]",
          },
        });
      }).toThrow(PathError);
    });

    it("rejects prototype pollution / reserved keys in starterSchemas", () => {
      expect(() => {
        buildRoleStarterTemplate({
          title: "Prototype Pollution Challenge",
          brief: "Test brief",
          starterSchemas: JSON.parse('{"__proto__": "polluted"}'),
        });
      }).toThrow(PathError);

      expect(() => {
        buildRoleStarterTemplate({
          title: "Constructor Key Challenge",
          brief: "Test brief",
          starterSchemas: {
            constructor: "polluted",
          },
        });
      }).toThrow(PathError);
    });

    it("accepts valid starter filenames and places them cleanly under src/", () => {
      const files = buildRoleStarterTemplate({
        title: "Clean Challenge",
        brief: "Build clean service",
        starterSchemas: {
          "domain-types.ts": "export interface User { id: string; }",
          "service.ts": "export class UserService {}",
        },
      });

      expect(files["README.md"]).toBeDefined();
      expect(files["src/domain-types.ts"]).toBe("export interface User { id: string; }");
      expect(files["src/service.ts"]).toBe("export class UserService {}");
    });
  });
});
