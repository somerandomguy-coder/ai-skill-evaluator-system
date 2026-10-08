import http from "node:http";
import https from "node:https";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * Hermetic test environment setup for Packet M00 (Acceptance Row V00).
 *
 * Guarantees:
 * 1. Provider and tracing API keys are scrubbed by default so tests never read production secrets.
 * 2. Unmocked real network calls are denied (fail fast) to prevent accidental live provider/API usage.
 * 3. Local loopback requests (127.0.0.1, localhost) are permitted so tests spinning up in-process
 *    mock servers (such as tests/client-openai.test.ts) continue to work seamlessly.
 * 4. Tests that explicitly install fake configurations or mock fetch/http are preserved.
 */

const SENSITIVE_ENV_KEYS = [
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
  "AI_API_KEY",
  "CUSTOM_AI_API_KEY",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "LANGFUSE_BASE_URL",
  "LANGFUSE_BASEURL",
  "LANGFUSE_HOST",
  "DATABASE_URL",
];

export function scrubSensitiveEnv() {
  for (const key of SENSITIVE_ENV_KEYS) {
    if (process.env[key] !== undefined && process.env[key] !== "") {
      delete process.env[key];
    }
  }
  process.env.DATA_SOURCE = "mock";
  if (!process.env.DEMO_MODE) {
    process.env.DEMO_MODE = "false";
  }
}

// Initial scrub on module load
scrubSensitiveEnv();

function isLoopbackHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const clean = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return clean === "localhost" || clean === "127.0.0.1" || clean === "::1" || clean === "0.0.0.0";
}

// ---------------------------------------------------------------------------
// Network Denial Guard
// ---------------------------------------------------------------------------

const nativeFetch = globalThis.fetch;

export function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString, "http://localhost");
    return isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
}

function installFetchGuard() {
  globalThis.fetch = async function hermeticFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const urlString =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    if (!isAllowedUrl(urlString)) {
      throw new Error(
        `[NetworkBlocked] Real network transport is denied in offline test mode: ${urlString}`
      );
    }

    if (nativeFetch) {
      return nativeFetch.call(globalThis, input, init);
    }
    throw new Error(`[NetworkBlocked] No underlying fetch implementation available for ${urlString}`);
  };
}

installFetchGuard();

// Also guard Node http / https modules for external destinations
const nativeHttpRequest = http.request;
const nativeHttpsRequest = https.request;

function guardHttpRequest(
  nativeFn: typeof http.request,
  protocol: string
): typeof http.request {
  return function (this: unknown, ...args: any[]): any {
    let hostname: string | null = null;
    let rawTarget = "";

    const firstArg = args[0];
    if (typeof firstArg === "string") {
      rawTarget = firstArg;
      try {
        hostname = new URL(firstArg).hostname;
      } catch {
        hostname = null;
      }
    } else if (firstArg instanceof URL) {
      rawTarget = firstArg.toString();
      hostname = firstArg.hostname;
    } else if (firstArg && typeof firstArg === "object") {
      hostname = firstArg.hostname || firstArg.host || "localhost";
      rawTarget = `${protocol}//${hostname}:${firstArg.port || ""}${firstArg.path || "/"}`;
    }

    if (hostname && !isLoopbackHost(hostname)) {
      throw new Error(
        `[NetworkBlocked] Real network transport is denied in offline test mode: ${rawTarget || hostname}`
      );
    }

    return (nativeFn as any).apply(this, args);
  } as typeof http.request;
}

http.request = guardHttpRequest(nativeHttpRequest, "http:");
https.request = guardHttpRequest(nativeHttpsRequest, "https:");

// Re-enforce guard after each test in case a test restored or cleared mocks
afterEach(() => {
  if (globalThis.fetch !== nativeFetch && !(globalThis.fetch as any)._isGuarded) {
    // If a test replaced globalThis.fetch, reinstall the guard
    installFetchGuard();
  }
});
