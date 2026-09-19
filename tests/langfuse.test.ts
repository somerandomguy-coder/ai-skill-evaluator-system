import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isLangfuseEnabled, langfuseBaseUrl, langfusePublicKey, langfuseSecretKey } from "@/lib/env";
import {
  flushLangfuse,
  getLangfuse,
  observeOpenAiClient,
  setLangfuseForTests,
  trackEvent,
  trackUserTurn,
} from "@/lib/ai/langfuse";

describe("Langfuse Observability Integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    delete process.env.LANGFUSE_BASEURL;
    delete process.env.LANGFUSE_BASE_URL;
    delete process.env.LANGFUSE_HOST;
    setLangfuseForTests(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setLangfuseForTests(null);
  });

  it("reports disabled when public or secret key is missing", () => {
    expect(isLangfuseEnabled()).toBe(false);
    expect(langfusePublicKey()).toBeUndefined();
    expect(langfuseSecretKey()).toBeUndefined();
    expect(getLangfuse()).toBeNull();
  });

  it("reports enabled when both public and secret keys are present", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test-key";
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-test-key";
    expect(isLangfuseEnabled()).toBe(true);
    expect(langfusePublicKey()).toBe("pk-lf-test-key");
    expect(langfuseSecretKey()).toBe("sk-lf-test-key");
    expect(langfuseBaseUrl()).toBe("https://cloud.langfuse.com");
  });

  it("honors custom base URL if configured via LANGFUSE_BASEURL or LANGFUSE_BASE_URL", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test-key";
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-test-key";
    process.env.LANGFUSE_BASEURL = "https://us.cloud.langfuse.com";
    expect(langfuseBaseUrl()).toBe("https://us.cloud.langfuse.com");

    process.env.LANGFUSE_BASE_URL = "https://custom.langfuse.com";
    expect(langfuseBaseUrl()).toBe("https://custom.langfuse.com");
  });

  it("returns raw OpenAI client unmodified when disabled", () => {
    const rawFakeClient = { chat: { completions: {} } };
    const wrapped = observeOpenAiClient(rawFakeClient, { traceName: "test-stage" });
    expect(wrapped).toBe(rawFakeClient);
  });

  it("safely handles trackUserTurn and trackEvent without errors when disabled", () => {
    expect(() => {
      trackUserTurn({
        sessionId: "sess-test",
        userId: "user-test",
        message: "Can you help me implement the gate logic?",
        challengeTitle: "Test Challenge",
      });
    }).not.toThrow();

    expect(() => {
      trackEvent("test_event", {
        sessionId: "sess-test",
        userId: "user-test",
        input: { foo: "bar" },
      });
    }).not.toThrow();
  });

  it("flushes cleanly and resolves when disabled or on timeout", async () => {
    await expect(flushLangfuse(50)).resolves.toBeUndefined();
  });
});
