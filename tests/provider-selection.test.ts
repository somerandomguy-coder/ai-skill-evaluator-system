import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  generateStructured,
  setAiClientForTests,
  AiUnavailableError,
  TruncatedOutputError,
  InvalidOutputError,
  MissingApiKeyError,
} from "@/lib/ai/client";
import { resolveProviderConfig, currentEmbeddingSpace, embeddingProvider } from "@/lib/env";
import { evaluateAcademicInteraction } from "@/lib/engine/evaluator";
import { generateEmbedding } from "@/lib/engine/embedding";
import { z } from "zod";

const TestSchema = z.object({
  greeting: z.string(),
  count: z.number(),
});

describe("M09 — Provider Identity and Bounded Fallback (A01–A05)", () => {
  let server: http.Server;
  let serverPort: number;
  let cannedStatus = 200;
  let cannedBody: any = {};
  let receivedRequests: any[] = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          receivedRequests.push({
            url: req.url,
            headers: req.headers,
            body: body ? JSON.parse(body) : null,
          });
        } catch {
          receivedRequests.push({ url: req.url, headers: req.headers, rawBody: body });
        }
        res.writeHead(cannedStatus, { "Content-Type": "application/json" });
        res.end(JSON.stringify(cannedBody));
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        serverPort = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    cannedStatus = 200;
    cannedBody = {
      choices: [
        {
          message: {
            content: JSON.stringify({ greeting: "hello", count: 42 }),
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    };
    receivedRequests = [];
    setAiClientForTests(null);
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.CUSTOM_AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.DEEPSEEK_BASE_URL;
    delete process.env.EMBEDDING_PROVIDER;
    delete process.env.EMBEDDING_API_KEY;
    delete process.env.EMBEDDING_MODEL;
    delete process.env.DEMO_MODE;
  });

  // Row A01: DeepSeek selected, only OpenAI key set; reverse case
  it("A01: enforces provider key boundary and forbids cross-vendor key substitution", async () => {
    process.env.AI_PROVIDER = "deepseek";
    process.env.OPENAI_API_KEY = "sk-openai-secret-key";
    delete process.env.DEEPSEEK_API_KEY;

    expect(() => resolveProviderConfig("assistant")).toThrowError(
      /DEEPSEEK_API_KEY is not configured\. Cross-vendor key fallback is prohibited/
    );

    // Verify reverse case: OpenAI selected, only DeepSeek key set
    process.env.AI_PROVIDER = "openai";
    process.env.DEEPSEEK_API_KEY = "sk-deepseek-secret-key";
    delete process.env.OPENAI_API_KEY;

    expect(() => resolveProviderConfig("assistant")).toThrowError(
      /OPENAI_API_KEY is not configured\. Cross-vendor key fallback is prohibited/
    );
  });

  // Row A02: DeepSeek-only valid configuration, academic evaluator invoked
  it("A02: recognizes active-provider configuration in academic evaluator without requiring OpenAI key", async () => {
    process.env.AI_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "sk-valid-deepseek-key";
    delete process.env.OPENAI_API_KEY;
    process.env.DEMO_MODE = "false";
    process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${serverPort}`;

    cannedBody = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              sfiaLevel: 3,
              academicDimensions: {
                EXPLORATION_VS_ACCELERATION: { band: "PROFICIENT", score: 80, rationale: "Good", evidence: [] },
                COGNITIVE_VERIFICATION: { band: "PROFICIENT", score: 80, rationale: "Good", evidence: [] },
                CONSTRAINT_SPECIFICATION: { band: "PROFICIENT", score: 80, rationale: "Good", evidence: [] },
                HIERARCHICAL_DECOMPOSITION: { band: "PROFICIENT", score: 80, rationale: "Good", evidence: [] },
                ARCHITECTURAL_SENSEMAKING: { band: "PROFICIENT", score: 80, rationale: "Good", evidence: [] },
              },
              overallAcademicSummary: "Sound performance.",
              synthesisStrengths: ["Verified code"],
              synthesisGaps: ["Could test more"],
            }),
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 30, completion_tokens: 40 },
    };

    const report = await evaluateAcademicInteraction({
      sessionId: "sess-a02",
      challengeTitle: "DeepSeek Evaluator Test",
      turns: [{
        seq: 1,
        role: "USER",
        content: "I analyzed the requirements and designed an API.",
        filesWritten: [],
        reasoning: null,
        createdAt: new Date().toISOString(),
      }],
    });

    expect(report).toBeDefined();
    expect(report.sfiaLevel).toBe(3);
    // Verified that it called our mock server using the DeepSeek configuration, not deterministic fallback
    expect(receivedRequests.length).toBeGreaterThan(0);
    expect(receivedRequests[0].headers.authorization).toContain("sk-valid-deepseek-key");
  });

  // Row A03: Custom endpoint and independently configured embedding provider
  it("A03: keeps custom endpoint and embedding configuration independently coherent", async () => {
    process.env.AI_PROVIDER = "custom";
    process.env.CUSTOM_AI_API_KEY = "sk-custom-secret";
    process.env.AI_BASE_URL = `http://127.0.0.1:${serverPort}/custom-v1`;

    // Embeddings independently configured
    process.env.EMBEDDING_PROVIDER = "openai";
    process.env.EMBEDDING_API_KEY = "sk-embed-secret";
    process.env.EMBEDDING_MODEL = "text-embedding-3-large";

    const customConfig = resolveProviderConfig("challenge");
    expect(customConfig.provider).toBe("custom");
    expect(customConfig.apiKey).toBe("sk-custom-secret");
    expect(customConfig.baseUrl).toBe(`http://127.0.0.1:${serverPort}/custom-v1`);

    expect(embeddingProvider()).toBe("openai");
    expect(currentEmbeddingSpace()).toBe("openai/text-embedding-3-large");

    // Deterministic embedding fallback when set
    process.env.EMBEDDING_PROVIDER = "deterministic";
    expect(currentEmbeddingSpace()).toBe("deterministic-128");
    const vec = await generateEmbedding("hello world");
    expect(vec.length).toBe(128);
  });

  // Row A04: Bounded attempts, no hidden 64k token expansion, actionable safe error codes
  it("A04: respects strict maxTokens without 64k expansion, surfaces safe error codes without leaking secrets", async () => {
    process.env.AI_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "sk-deepseek-supersecret";
    process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${serverPort}`;
    process.env.DEMO_MODE = "false";
    process.env.DEEPSEEK_THINKING = "true";

    cannedBody = {
      choices: [
        {
          message: { content: '{"greeting": "truncated...' },
          finish_reason: "length",
        },
      ],
    };

    // maxTokens is set to 256; must NOT be inflated to 64,000!
    const promise = generateStructured({
      stage: "evaluator",
      system: "Evaluate",
      messages: [{ role: "user", content: "Prompt" }],
      schema: TestSchema,
      maxTokens: 256,
      maxRetries: 0,
    });

    await expect(promise).rejects.toBeInstanceOf(TruncatedOutputError);

    // Inspect request sent to mock server
    expect(receivedRequests.length).toBe(1);
    const sentBody = receivedRequests[0].body;
    expect(sentBody.max_tokens).toBe(256); // STRICTLY 256, NOT 64000!

    // Rate limit 429 error safe code verification
    cannedStatus = 429;
    cannedBody = { error: { message: "Rate limit exceeded for key sk-deepseek-supersecret" } };

    try {
      await generateStructured({
        stage: "evaluator",
        system: "Evaluate",
        messages: [{ role: "user", content: "Prompt" }],
        schema: TestSchema,
        maxTokens: 100,
        maxRetries: 0,
      });
      expect.fail("Should have thrown rate limit error");
    } catch (err: any) {
      expect(err).toBeInstanceOf(AiUnavailableError);
      expect(err.code).toBe("rate_limit");
      // Must NOT leak secret key in error message
      expect(err.message).not.toContain("sk-deepseek-supersecret");
    }
  });

  // Row A05: Failed attempt then fallback/success retains per-attempt outcomes and cumulative usage
  it("A05: preserves attempt metrics and cumulative usage across retry", async () => {
    process.env.AI_PROVIDER = "custom";
    process.env.CUSTOM_AI_API_KEY = "sk-custom-attempt-test";
    process.env.AI_BASE_URL = `http://127.0.0.1:${serverPort}`;
    process.env.DEMO_MODE = "false";

    // First attempt returns invalid JSON; second attempt returns valid
    let callCount = 0;
    server.removeAllListeners("request");
    server.on("request", (req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        callCount++;
        res.writeHead(200, { "Content-Type": "application/json" });
        if (callCount === 1) {
          // Schema mismatch: missing 'count'
          res.end(
            JSON.stringify({
              choices: [{ message: { content: JSON.stringify({ greeting: "first attempt missing count" }) }, finish_reason: "stop" }],
              usage: { prompt_tokens: 50, completion_tokens: 15 },
            })
          );
        } else {
          res.end(
            JSON.stringify({
              choices: [{ message: { content: JSON.stringify({ greeting: "success on second", count: 99 }) }, finish_reason: "stop" }],
              usage: { prompt_tokens: 70, completion_tokens: 25 },
            })
          );
        }
      });
    });

    const result = await generateStructured({
      stage: "assistant",
      system: "Assist",
      messages: [{ role: "user", content: "Go" }],
      schema: TestSchema,
      maxTokens: 500,
      maxRetries: 1,
    });

    expect(result.data).toEqual({ greeting: "success on second", count: 99 });
    expect(result.totalAttempts).toBe(2);
    expect(result.attempts).toBeDefined();
    expect(result.attempts?.length).toBe(2);
    expect(result.attempts?.[0].success).toBe(false);
    expect(result.attempts?.[1].success).toBe(true);

    // Cumulative usage across both attempts: 50 + 70 = 120 input, 15 + 25 = 40 output
    expect(result.usage.inputTokens).toBe(120);
    expect(result.usage.outputTokens).toBe(40);
  });
});
