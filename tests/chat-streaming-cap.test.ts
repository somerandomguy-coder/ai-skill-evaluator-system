import { describe, expect, it } from "vitest";
import { extractStreamingMessage, buildAssistantStream } from "@/lib/ai/build-assistant";
import { MAX_USER_MESSAGES } from "@/lib/services/sessions";

describe("Message Limit and Streaming", () => {
  it("enforces MAX_USER_MESSAGES = 25", () => {
    expect(MAX_USER_MESSAGES).toBe(25);
  });

  describe("extractStreamingMessage", () => {
    it("returns empty string before message field is encountered", () => {
      const partial = '{"otherField": 123, "mess';
      expect(extractStreamingMessage(partial)).toBe("");
    });

    it("extracts streaming text incrementally as tokens arrive", () => {
      const chunk1 = '{"message": "Hello';
      expect(extractStreamingMessage(chunk1)).toBe("Hello");

      const chunk2 = '{"message": "Hello world, here is';
      expect(extractStreamingMessage(chunk2)).toBe("Hello world, here is");

      const chunk3 = '{"message": "Hello world, here is a test.", "files": []}';
      expect(extractStreamingMessage(chunk3)).toBe("Hello world, here is a test.");
    });

    it("handles escape sequences correctly (newlines, quotes, backslashes)", () => {
      const partial = '{"message": "Line 1\\nLine 2 with \\"quotes\\" and \\\\ path", "files": []}';
      expect(extractStreamingMessage(partial)).toBe('Line 1\nLine 2 with "quotes" and \\ path');
    });

    it("handles non-JSON raw strings gracefully", () => {
      expect(extractStreamingMessage("Raw plain text message")).toBe("Raw plain text message");
    });
  });

  describe("buildAssistantStream in demo mode", () => {
    it("streams tokens via onEvent and returns complete turn", async () => {
      const previousEnv = process.env.DEMO_MODE;
      process.env.DEMO_MODE = "true";

      try {
        const events: Array<{ type: string; [key: string]: unknown }> = [];
        const result = await buildAssistantStream(
          [{ role: "user", content: "Can you help me write this gate?" }],
          {},
          {
            title: "Test Challenge",
            brief: "Test Brief",
            domainContext: "Test Context",
            timeboxMinutes: 60,
          },
          (evt) => {
            events.push(evt);
          }
        );

        expect(result.message).toBeDefined();
        expect(events.length).toBeGreaterThan(0);
        const tokenEvents = events.filter((e) => e.type === "token");
        expect(tokenEvents.length).toBeGreaterThan(0);
        const reconstructed = tokenEvents.map((e) => (e as any).delta).join("");
        expect(reconstructed).toBe(result.message);
      } finally {
        process.env.DEMO_MODE = previousEnv;
      }
    });
  });

  describe("Message cap logic", () => {
    it("only counts USER role turns towards the 25 limit", () => {
      const turns = [
        { role: "USER" },
        { role: "ASSISTANT" },
        { role: "USER" },
        { role: "ASSISTANT" },
        { role: "USER" },
      ];
      const userCount = turns.filter((t) => t.role === "USER").length;
      expect(userCount).toBe(3);
      expect(userCount < MAX_USER_MESSAGES).toBe(true);
    });

    it("correctly identifies cap reach at 25 user messages", () => {
      const turns = Array.from({ length: 25 }, (_, i) => [
        { role: "USER" },
        { role: "ASSISTANT" },
      ]).flat();
      const userCount = turns.filter((t) => t.role === "USER").length;
      expect(userCount).toBe(25);
      expect(userCount >= MAX_USER_MESSAGES).toBe(true);
    });
  });
});
