import { describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { aiApiKey, isDemoMode, openaiApiKey } from "@/lib/env";

describe("M00 Hermetic Runner & Offline Safeguards (Row V00)", () => {
  it("denies unmocked real external network requests via globalThis.fetch", async () => {
    await expect(
      globalThis.fetch("https://api.openai.com/v1/chat/completions")
    ).rejects.toThrow(/\[NetworkBlocked\] Real network transport is denied in offline test mode/);

    await expect(
      globalThis.fetch("https://cloud.langfuse.com/api/public/events")
    ).rejects.toThrow(/\[NetworkBlocked\] Real network transport is denied in offline test mode/);
  });

  it("denies unmocked real external network requests via node:https", () => {
    expect(() => {
      const https = require("node:https");
      https.request("https://api.openai.com/v1/models");
    }).toThrow(/\[NetworkBlocked\] Real network transport is denied in offline test mode/);
  });

  it("permits local loopback requests to support in-process mock servers", async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const res = await globalThis.fetch(`http://127.0.0.1:${port}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ status: "ok" });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("ensures provider API keys default to empty in offline test execution", () => {
    expect(openaiApiKey()).toBeUndefined();
    expect(aiApiKey()).toBeUndefined();
  });

  it("allows tests to explicitly configure fake in-memory keys without network leaks", async () => {
    const original = process.env.OPENAI_API_KEY;
    try {
      process.env.OPENAI_API_KEY = "sk-fake-test-key";
      expect(openaiApiKey()).toBe("sk-fake-test-key");

      // Even when key is set, real external transport remains denied
      await expect(
        globalThis.fetch("https://api.openai.com/v1/chat/completions", {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        })
      ).rejects.toThrow(/\[NetworkBlocked\]/);
    } finally {
      if (original) {
        process.env.OPENAI_API_KEY = original;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });
});
