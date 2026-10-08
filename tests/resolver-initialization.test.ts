import { beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({ embedding: vi.fn(), bank: [] as any[] }));
vi.mock("@/lib/engine/embedding", () => ({ generateEmbedding: fixtures.embedding, cosineSimilarity: () => 1 }));
vi.mock("@/lib/engine/pipeline", () => ({ runAgenticGenerationPipeline: vi.fn() }));
vi.mock("@/lib/engine/verified-bank", () => ({ VERIFIED_CHALLENGE_BANK: fixtures.bank }));

beforeEach(() => {
  vi.resetModules();
  fixtures.embedding.mockReset();
  fixtures.bank.splice(0, fixtures.bank.length, ...["first", "second"].map((id) => ({
    id,
    roleTitle: "Engineer",
    companyName: "Example",
    briefMarkdown: "Build the specified service.",
    verification: { status: "APPROVED" },
    metadata: { usageCount: 0 },
  })));
});

describe("repository initialization", () => {
  it("holds concurrent searches until every seeded bank is loaded", async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    fixtures.embedding.mockResolvedValueOnce([1, 0]).mockImplementationOnce(async () => {
      await blocked;
      return [0, 1];
    });
    const repository = await import("@/lib/engine/resolver");
    const initialLoad = repository.initializeRepository();
    await vi.waitFor(() => expect(fixtures.embedding).toHaveBeenCalledTimes(2));
    let finished = false;
    const query = repository.queryVectorStore({ vector: [1, 0], threshold: 0.88 }).then((result) => {
      finished = true;
      return result;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(finished).toBe(false);
    release();
    await initialLoad;
    expect(await query).not.toBeNull();
    expect(repository.listRepositoryChallenges()).toHaveLength(2);
    expect(fixtures.embedding).toHaveBeenCalledTimes(2);
  });

  it("retries an interrupted load without re-embedding successful entries", async () => {
    fixtures.embedding
      .mockResolvedValueOnce([1, 0])
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce([0, 1]);
    const repository = await import("@/lib/engine/resolver");
    await expect(repository.initializeRepository()).rejects.toThrow("temporary failure");
    expect(repository.listRepositoryChallenges()).toHaveLength(1);
    await repository.initializeRepository();
    expect(repository.listRepositoryChallenges()).toHaveLength(2);
    await repository.initializeRepository();
    expect(fixtures.embedding).toHaveBeenCalledTimes(3);
  });
});
