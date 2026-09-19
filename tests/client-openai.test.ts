/**
 * generateStructured against a local fake of OpenAI's /chat/completions, so the
 * real SDK code path runs (request building, strict json_schema, parsing) with no
 * network and no key. The OpenAI SDK reads OPENAI_BASE_URL at client construction.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type Effort,
  AiUnavailableError,
  InvalidOutputError,
  ModelRefusalError,
  TruncatedOutputError,
  generateStructured,
  setAiClientForTests,
} from "@/lib/ai/client";
import { AssistantTurnSchema } from "@/lib/ai/schemas";

interface Canned {
  status?: number;
  content?: string | null;
  refusal?: string | null;
  finish?: string;
}

let server: http.Server;
let queue: Canned[] = [];
let requests: Record<string, unknown>[] = [];

const VALID = JSON.stringify({ message: "Done.", files: [{ path: "src/a.js", contents: "x" }], reasoning: "simple" });
const INVALID = JSON.stringify({ message: "Done." }); // files + reasoning missing

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      requests.push(JSON.parse(body || "{}"));
      const c = queue.shift() ?? { content: VALID };
      if (c.status && c.status >= 400) {
        res.writeHead(c.status, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "nope", type: "invalid_request_error" } }));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 0,
          model: "gpt-test",
          choices: [{ index: 0, finish_reason: c.finish ?? "stop", message: { role: "assistant", content: c.content ?? null, refusal: c.refusal ?? null } }],
          usage: { prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 },
        })
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.DEMO_MODE = "false";
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
});

beforeEach(() => {
  queue = [];
  requests = [];
  delete process.env.OPENAI_MODEL;
  setAiClientForTests(null); // build a fresh client that picks up the env above
});

const req = (over: { effort?: Effort } = {}) =>
  generateStructured({
    stage: "assistant",
    system: "You are helpful.",
    messages: [{ role: "user", content: "hi" }],
    schema: AssistantTurnSchema,
    maxTokens: 500,
    effort: "medium",
    ...over,
  });

describe("generateStructured (OpenAI)", () => {
  it("sends a strict json_schema request and returns the validated, parsed data", async () => {
    queue = [{ content: VALID }];
    const out = await req();

    expect(out.data).toEqual({ message: "Done.", files: [{ path: "src/a.js", contents: "x" }], reasoning: "simple" });
    expect(out.usage).toEqual({ inputTokens: 11, outputTokens: 22 });

    const sent = requests[0] as {
      model: string;
      max_completion_tokens: number;
      reasoning_effort?: string;
      messages: { role: string; content: string }[];
      response_format: { type: string; json_schema: { name: string; strict: boolean; schema: { additionalProperties: boolean } } };
    };
    expect(sent.model).toBe("gpt-5.5");
    expect(sent.max_completion_tokens).toBe(500);
    expect(sent.reasoning_effort).toBe("medium");
    expect(sent.messages[0]).toEqual({ role: "system", content: "You are helpful." });
    expect(sent.messages[1]).toEqual({ role: "user", content: "hi" });
    expect(sent.response_format.type).toBe("json_schema");
    expect(sent.response_format.json_schema).toMatchObject({ name: "assistant_output", strict: true });
    expect(sent.response_format.json_schema.schema.additionalProperties).toBe(false);
  });

  it("omits reasoning_effort for a non-reasoning model, and honours the per-stage model override", async () => {
    process.env.OPENAI_MODEL = "gpt-4.1";
    await req();
    const sent = requests[0] as { model: string; reasoning_effort?: string };
    expect(sent.model).toBe("gpt-4.1");
    expect(sent).not.toHaveProperty("reasoning_effort");
  });

  it("maps the top effort tiers to 'high', the value every reasoning model accepts", async () => {
    await req({ effort: "max" });
    expect((requests[0] as { reasoning_effort: string }).reasoning_effort).toBe("high");
  });

  it("retries once when the answer fails validation, telling the model what was wrong", async () => {
    queue = [{ content: INVALID }, { content: VALID }];
    const out = await req();
    expect(out.data.reasoning).toBe("simple");
    expect(requests).toHaveLength(2);
    const retryUser = (requests[1] as { messages: { role: string; content: string }[] }).messages.at(-1)!;
    expect(retryUser.role).toBe("user");
    expect(retryUser.content).toMatch(/failed schema validation/);
    expect(retryUser.content).toMatch(/files|reasoning/);
  });

  it("gives up with a clear error after a second invalid answer", async () => {
    queue = [{ content: INVALID }, { content: INVALID }];
    await expect(req()).rejects.toBeInstanceOf(InvalidOutputError);
    expect(requests).toHaveLength(2);
  });

  it("surfaces a model refusal instead of parsing it", async () => {
    queue = [{ content: null, refusal: "I can't help with that." }];
    await expect(req()).rejects.toBeInstanceOf(ModelRefusalError);
  });

  it("reports a truncated answer (the token limit was hit) rather than returning half a JSON", async () => {
    queue = [{ content: '{"message":"Do', finish: "length" }];
    await expect(req()).rejects.toBeInstanceOf(TruncatedOutputError);
  });

  it("turns a rejected key into a message that names OPENAI_API_KEY", async () => {
    queue = [{ status: 401 }];
    const err = await req().catch((e) => e);
    expect(err).toBeInstanceOf(AiUnavailableError);
    expect(err.message).toMatch(/OPENAI_API_KEY/);
  });
});
