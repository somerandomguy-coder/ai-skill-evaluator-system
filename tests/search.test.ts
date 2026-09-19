import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { createSearch, normalizeQuery, queryHash, type CachedSearch, type SearchResult, type SearchStore } from "@/lib/search";

const R: SearchResult[] = [{ title: "Acme", url: "https://acme.example", snippet: "Acme makes anvils." }];

function memoryStore(seed: Record<string, CachedSearch> = {}) {
  const map = new Map(Object.entries(seed));
  const store: SearchStore = {
    get: async (h) => map.get(h) ?? null,
    put: async ({ hash, results, failed, retryAfter }) => void map.set(hash, { results, failed, retryAfter }),
  };
  return { store, map };
}

const base = { minLiveGapMs: 0, now: () => new Date("2026-09-19T00:00:00Z") };

describe("query normalisation", () => {
  it("ignores case and whitespace, so trivially different queries share one cache entry", () => {
    expect(normalizeQuery("  Acme   Corp\nOverview ")).toBe("acme corp overview");
    expect(queryHash("Acme Corp")).toBe(queryHash("  acme   corp "));
    expect(queryHash("Acme Corp")).not.toBe(queryHash("Acme Inc"));
  });
});

describe("search()", () => {
  it("never re-queries a cached result", async () => {
    const { store } = memoryStore();
    const backend = vi.fn().mockResolvedValue(R);
    const search = createSearch({ ...base, store, backend, demo: () => false });

    expect(await search("Acme overview")).toEqual(R);
    expect(await search("acme   OVERVIEW")).toEqual(R);
    expect(backend).toHaveBeenCalledTimes(1);
  });

  it("caches an empty result as a real result (nothing found is an answer, not a retry)", async () => {
    const { store } = memoryStore();
    const backend = vi.fn().mockResolvedValue([]);
    const search = createSearch({ ...base, store, backend, demo: () => false });
    await search("obscure co");
    await search("obscure co");
    expect(backend).toHaveBeenCalledTimes(1);
  });

  it("in DEMO_MODE serves the cache only: a miss is [] and the scraper is never touched", async () => {
    const { store } = memoryStore({ [queryHash("Acme overview")]: { results: R, failed: false, retryAfter: null } });
    const backend = vi.fn().mockRejectedValue(new Error("must not be called"));
    const search = createSearch({ ...base, store, backend, demo: () => true });

    expect(await search("Acme overview")).toEqual(R);
    expect(await search("something uncached")).toEqual([]);
    expect(backend).not.toHaveBeenCalled();
  });

  it("degrades gracefully: a failing scraper resolves to [] and is cooled down, not hammered", async () => {
    const { store, map } = memoryStore();
    const backend = vi.fn().mockRejectedValue(new Error("DDG detected an anomaly in the request"));
    const search = createSearch({ ...base, store, backend, demo: () => false });

    expect(await search("Acme overview")).toEqual([]);
    expect(map.get(queryHash("Acme overview"))).toMatchObject({ failed: true, results: [] });
    expect(await search("Acme overview")).toEqual([]); // still cooling down
    expect(backend).toHaveBeenCalledTimes(1);
  });

  it("retries a failed query once its cool-down has passed", async () => {
    let now = new Date("2026-09-19T00:00:00Z");
    const { store } = memoryStore();
    const backend = vi.fn().mockRejectedValueOnce(new Error("rate limited")).mockResolvedValue(R);
    const search = createSearch({ ...base, now: () => now, store, backend, demo: () => false });

    expect(await search("Acme overview")).toEqual([]);
    now = new Date("2026-09-19T00:11:00Z"); // > 10 minutes later
    expect(await search("Acme overview")).toEqual(R);
    expect(backend).toHaveBeenCalledTimes(2);
  });

  it("survives a broken cache store", async () => {
    const store: SearchStore = { get: async () => { throw new Error("db down"); }, put: async () => { throw new Error("db down"); } };
    const backend = vi.fn().mockResolvedValue(R);
    const search = createSearch({ ...base, store, backend, demo: () => false });
    expect(await search("Acme overview")).toEqual(R);
  });

  it("returns [] for an empty query without calling anything", async () => {
    const { store } = memoryStore();
    const backend = vi.fn();
    expect(await createSearch({ ...base, store, backend, demo: () => false })("   ")).toEqual([]);
    expect(backend).not.toHaveBeenCalled();
  });
});
