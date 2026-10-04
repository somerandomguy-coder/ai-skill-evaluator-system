import { describe, expect, it } from "vitest";
import {
  routeMessageTier,
  countTurnsByTier,
  MAX_ASK_MESSAGES,
  MAX_CODE_MESSAGES,
} from "@/lib/ai/message-router";

describe("Two-Tier Message Router & Quota System", () => {
  it("enforces 30 ask messages and 20 coding messages quotas", () => {
    expect(MAX_ASK_MESSAGES).toBe(30);
    expect(MAX_CODE_MESSAGES).toBe(20);
  });

  describe("routeMessageTier", () => {
    it("routes pure questions, clarification, and boundary inquiries to ASK", () => {
      expect(routeMessageTier("What is STP Phase 2 disaggregation?")).toBe("ASK");
      expect(routeMessageTier("Can you explain the trade-offs between floating point and integer cents?")).toBe("ASK");
      expect(routeMessageTier("Does this challenge require supporting allowances?")).toBe("ASK");
      expect(routeMessageTier("Why is the superannuation calculation capped at maximum contribution base?")).toBe("ASK");
      expect(routeMessageTier("What are the 5 ATO disaggregation categories?")).toBe("ASK");
      expect(routeMessageTier("Is there any boundary invariant we need to follow?")).toBe("ASK");
    });

    it("routes explicit implementation, file edits, and code generation to CODE", () => {
      expect(routeMessageTier("Can you write the stp calculation function in src/engine.ts?")).toBe("CODE");
      expect(routeMessageTier("Implement the disaggregation logic for allowances")).toBe("CODE");
      expect(routeMessageTier("Fix the bug in calculateSuperannuation method")).toBe("CODE");
      expect(routeMessageTier("Refactor the parser component to handle edge cases")).toBe("CODE");
      expect(routeMessageTier("Generate unit tests for zero income boundary")).toBe("CODE");
      expect(routeMessageTier("```typescript\nconst x = calculate();\n``` Please fix this error")).toBe("CODE");
    });

    it("defaults short conversational queries to ASK", () => {
      expect(routeMessageTier("Hello, what should we start with?")).toBe("ASK");
      expect(routeMessageTier("Got it, thanks!")).toBe("ASK");
    });
  });

  describe("countTurnsByTier", () => {
    it("correctly separates ask turns from coding turns based on assistant file writes", () => {
      const turns = [
        { role: "USER", content: "What is STP Phase 2?" },
        { role: "ASSISTANT", content: "STP Phase 2 is...", filesWritten: [] },
        { role: "USER", content: "Please implement the parser" },
        {
          role: "ASSISTANT",
          content: "Here is the code",
          filesWritten: JSON.stringify([{ path: "src/parser.ts", contents: "export const x = 1;" }]),
        },
        { role: "USER", content: "Can you explain why we used integer cents?" },
        { role: "ASSISTANT", content: "Integer cents prevent rounding error", filesWritten: [] },
      ];

      const counts = countTurnsByTier(turns);
      expect(counts.askCount).toBe(2);
      expect(counts.codeCount).toBe(1);
      expect(counts.isAskCapReached).toBe(false);
      expect(counts.isCodeCapReached).toBe(false);
    });

    it("detects when caps are reached", () => {
      const turns: Array<{ role: string; content: string; filesWritten?: unknown }> = [];
      for (let i = 0; i < 30; i++) {
        turns.push({ role: "USER", content: `Question ${i}?` });
        turns.push({ role: "ASSISTANT", content: `Answer ${i}`, filesWritten: [] });
      }

      const counts = countTurnsByTier(turns);
      expect(counts.askCount).toBe(30);
      expect(counts.isAskCapReached).toBe(true);
      expect(counts.isCodeCapReached).toBe(false);
    });
  });
});
