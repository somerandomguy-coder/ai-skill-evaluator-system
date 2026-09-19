/**
 * Company-research search, behind one function: `search(query)`.
 *
 * Constraints this module exists to honour (there is no official DuckDuckGo API;
 * duck-duck-scrape hits an HTML endpoint that rate-limits aggressively — it
 * rejected the very first query when this project was built):
 *
 *  - Every result is cached in Postgres keyed by a hash of the normalised query.
 *    A cached query is never re-run.
 *  - A transient failure is cached briefly, so a rate-limit is not hammered.
 *  - In DEMO_MODE only the cache is read. A live scrape never decides whether a
 *    demo works.
 *  - Search must never block or break the pipeline: it always resolves, to `[]`
 *    at worst, and the caller degrades to a JD-only challenge.
 *  - Swapping in a paid API means replacing `duckDuckGoBackend` — nothing else.
 */
import { prisma } from "./db";
import { isDemoMode } from "./env";
import { sha256Hex } from "./hash";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export type SearchBackend = (query: string) => Promise<SearchResult[]>;

export interface CachedSearch {
  results: SearchResult[];
  failed: boolean;
  retryAfter: Date | null;
}

export interface SearchStore {
  get(hash: string): Promise<CachedSearch | null>;
  put(entry: { hash: string; query: string } & CachedSearch): Promise<void>;
}

export function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}

export function queryHash(query: string): string {
  return sha256Hex(normalizeQuery(query));
}

const MAX_RESULTS = 6;
const LIVE_TIMEOUT_MS = 8_000;
/** Minimum gap between live scrapes in one process. */
const MIN_LIVE_GAP_MS = 2_500;
/** How long a failed query is left alone before it may be retried. */
const FAILURE_COOLDOWN_MS = 10 * 60 * 1_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`search timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();

/** The only place that knows about duck-duck-scrape. */
export const duckDuckGoBackend: SearchBackend = async (query) => {
  const { search: ddg, SafeSearchType } = await import("duck-duck-scrape");
  const res = await ddg(query, { safeSearch: SafeSearchType.STRICT });
  if (res.noResults) return [];
  return res.results.slice(0, MAX_RESULTS).map((r) => ({
    title: stripTags(r.title),
    url: r.url,
    snippet: stripTags(r.description ?? ""),
  }));
};

export const prismaSearchStore: SearchStore = {
  async get(hash) {
    const row = await prisma.searchCache.findUnique({ where: { queryHash: hash } });
    if (!row) return null;
    return { results: row.results as unknown as SearchResult[], failed: row.failed, retryAfter: row.retryAfter };
  },
  async put({ hash, query, results, failed, retryAfter }) {
    await prisma.searchCache.upsert({
      where: { queryHash: hash },
      create: { queryHash: hash, query, results: results as never, failed, retryAfter },
      update: { results: results as never, failed, retryAfter },
    });
  },
};

export interface SearchDeps {
  store: SearchStore;
  backend: SearchBackend;
  /** Read at call time so tests (and DEMO_MODE toggles) take effect without re-creating. */
  demo: () => boolean;
  now: () => Date;
  minLiveGapMs: number;
}

export function createSearch(overrides: Partial<SearchDeps> = {}) {
  const deps: SearchDeps = {
    store: prismaSearchStore,
    backend: duckDuckGoBackend,
    demo: isDemoMode,
    now: () => new Date(),
    minLiveGapMs: MIN_LIVE_GAP_MS,
    ...overrides,
  };
  let lastLiveAt = 0;

  return async function search(query: string): Promise<SearchResult[]> {
    const normalized = normalizeQuery(query);
    if (!normalized) return [];
    const hash = queryHash(normalized);

    let cached: CachedSearch | null = null;
    try {
      cached = await deps.store.get(hash);
    } catch {
      // A broken cache must not break research; fall through as a miss.
    }

    if (cached) {
      if (!cached.failed) return cached.results;
      // Failed earlier: leave it alone until the cool-down passes (never in demo).
      if (deps.demo() || (cached.retryAfter && cached.retryAfter > deps.now())) return cached.results;
    }

    // DEMO_MODE: cache only. A miss is an empty result, never a live scrape.
    if (deps.demo()) return [];

    const wait = lastLiveAt + deps.minLiveGapMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastLiveAt = Date.now();

    try {
      const results = (await withTimeout(deps.backend(normalized), LIVE_TIMEOUT_MS)).slice(0, MAX_RESULTS);
      await deps.store.put({ hash, query: normalized, results, failed: false, retryAfter: null }).catch(() => undefined);
      return results;
    } catch {
      const retryAfter = new Date(deps.now().getTime() + FAILURE_COOLDOWN_MS);
      await deps.store
        .put({ hash, query: normalized, results: [], failed: true, retryAfter })
        .catch(() => undefined);
      return [];
    }
  };
}

/** Default instance used by the pipeline. */
export const search = createSearch();
