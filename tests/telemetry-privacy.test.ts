import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  trackUserTurn,
  trackEvent,
  sanitizeTelemetryValue,
  setLangfuseForTests,
} from "@/lib/ai/langfuse";

describe("B05 — Telemetry Privacy and Non-disruptive Monitoring (P10–P11)", () => {
  let capturedTraces: any[] = [];
  let capturedEvents: any[] = [];

  const mockLangfuse = {
    trace: vi.fn((traceData: any) => {
      capturedTraces.push(traceData);
      return {
        event: vi.fn((eventData: any) => {
          capturedEvents.push(eventData);
        }),
      };
    }),
    flushAsync: vi.fn(async () => {}),
  } as any;

  beforeEach(() => {
    capturedTraces = [];
    capturedEvents = [];
    delete process.env.TELEMETRY_RAW_CONTENT_CONSENT;
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
    setLangfuseForTests(mockLangfuse);
  });

  // Row P10: Synthetic private identifiers and fake credential markers in source/chat/error
  it("P10: metadata-only traces redact secrets, candidate text, and credentials by default", () => {
    const rawCandidateMessage = "Here is my secret AWS key sk-supersecret-api-key-12345678 and my email candidate@proofcraft.dev";

    trackUserTurn({
      sessionId: "sess-p10",
      userId: "user-123",
      message: rawCandidateMessage,
      challengeTitle: "Engineering Challenge",
    });

    expect(capturedTraces.length).toBe(1);
    const trace = capturedTraces[0];

    // Outbound trace input must NOT contain the raw candidate message or secrets
    expect(trace.input).not.toHaveProperty("message", rawCandidateMessage);
    expect(trace.input).toEqual({ messageLength: rawCandidateMessage.length, redacted: true });

    // Track platform event with nested sensitive credentials
    trackEvent("test_pipeline_event", {
      sessionId: "sess-p10",
      userId: "cand-123",
      input: {
        rawJd: "Full company JD with sk-leaked-key-9999999",
        password: "supersecretpassword",
        candidateEmail: "alice@company.com",
      },
    });

    expect(capturedTraces.length).toBe(2);
    const eventTrace = capturedTraces[1];

    // In metadata-only mode, sensitive payload bodies are replaced with summaries
    expect(JSON.stringify(eventTrace.input)).not.toContain("sk-leaked-key-9999999");
    expect(JSON.stringify(eventTrace.input)).not.toContain("supersecretpassword");
  });

  it("P10: sanitizeTelemetryValue redacts credentials and emails", () => {
    const raw = "Contact test@example.com with key sk-abcdef123456 and Bearer mytoken123456";
    const sanitized = sanitizeTelemetryValue(raw) as string;

    expect(sanitized).not.toContain("test@example.com");
    expect(sanitized).not.toContain("sk-abcdef123456");
    expect(sanitized).toContain("[REDACTED_EMAIL]");
    expect(sanitized).toContain("[REDACTED_API_KEY]");
  });

  // Row P11: Telemetry outage does not fail an assessment
  it("P11: telemetry outage or network exception does not crash or interrupt application execution", () => {
    const explodingLangfuse = {
      trace: vi.fn(() => {
        throw new Error("Langfuse server connection refused (503 Service Unavailable)");
      }),
      flushAsync: vi.fn(async () => {
        throw new Error("Network timeout");
      }),
    } as any;

    setLangfuseForTests(explodingLangfuse);

    // Calling tracking functions during an outage must not throw
    expect(() => {
      trackUserTurn({
        sessionId: "sess-outage",
        userId: "user-outage",
        message: "Hello world",
      });
    }).not.toThrow();

    expect(() => {
      trackEvent("critical_assessment_submitted", {
        sessionId: "sess-outage",
        userId: "user-outage",
      });
    }).not.toThrow();
  });
});
