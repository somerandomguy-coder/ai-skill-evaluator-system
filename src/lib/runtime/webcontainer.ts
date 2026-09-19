"use client";

/**
 * In-browser build environment, backed by @webcontainer/api.
 *
 * This is a module-level singleton on purpose:
 *  - WebContainer allows exactly one booted instance per page.
 *  - React Strict Mode mounts effects twice in dev; a singleton makes the second
 *    `startRuntime()` a no-op instead of a second boot.
 *  - The workspace can re-render freely and still read the same live state via
 *    `useSyncExternalStore(subscribeRuntime, getRuntimeSnapshot)`.
 *
 * Every mutation (mount, install, write, restart) goes through one promise
 * queue, so a candidate prompting mid-install cannot interleave with it.
 */
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { applyWrites, toFileSystemTree, type FileMap, type FileWrite } from "../files";
import { dependenciesChanged } from "../starter";

export type RuntimeStatus =
  | "idle"
  | "unsupported"
  | "booting"
  | "installing"
  | "starting"
  | "ready"
  | "error";

export interface RuntimeSnapshot {
  status: RuntimeStatus;
  /** Human-readable current step, safe to show as-is. */
  detail: string;
  previewUrl: string | null;
  /** Rolling tail of install + dev-server output. */
  logs: string[];
  error: string | null;
  /** Epoch ms when the current install began (drives the progress timer). */
  installStartedAt: number | null;
  /** Seconds the last completed install took. */
  installSeconds: number | null;
  /** Why the runtime is unavailable, when status === "unsupported". */
  unsupportedReason: string | null;
}

const MAX_LOG_LINES = 400;
const DEV_SERVER_TIMEOUT_MS = 120_000;

const IDLE: RuntimeSnapshot = {
  status: "idle",
  detail: "Not started",
  previewUrl: null,
  logs: [],
  error: null,
  installStartedAt: null,
  installSeconds: null,
  unsupportedReason: null,
};

let snapshot: RuntimeSnapshot = IDLE;
const listeners = new Set<() => void>();

function set(patch: Partial<RuntimeSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeRuntime(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRuntimeSnapshot(): RuntimeSnapshot {
  return snapshot;
}

export function getServerRuntimeSnapshot(): RuntimeSnapshot {
  return IDLE;
}

// --- module state ---------------------------------------------------------

let container: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;
let devProc: WebContainerProcess | null = null;
let devTimer: ReturnType<typeof setTimeout> | null = null;
let files: FileMap = {};
let installedPackageJson: string | undefined;
let startPromise: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** Serialise all container mutations. Errors are surfaced via `set`, never thrown into the chain. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;?]*[A-Za-z]/g;

function appendLog(chunk: string) {
  const lines = chunk
    .replace(ANSI, "")
    .split(/\r?\n|\r/)
    .map((l) => l.trimEnd())
    // npm redraws a one-character spinner (\ | / -) on every tick; it is noise in a log.
    .filter((l) => l && !/^[\\|/-]$/.test(l.trim()));
  if (!lines.length) return;
  const logs = [...snapshot.logs, ...lines];
  set({ logs: logs.length > MAX_LOG_LINES ? logs.slice(-MAX_LOG_LINES) : logs });
}

function pipeOutput(proc: WebContainerProcess) {
  proc.output
    .pipeTo(new WritableStream<string>({ write: (chunk) => appendLog(chunk) }))
    .catch(() => undefined);
}

function fail(message: string) {
  set({ status: "error", detail: "Something went wrong", error: message });
}

/** Cross-origin isolation + SharedArrayBuffer are the two things WebContainers cannot run without. */
export function checkSupport(): { supported: boolean; reason: string | null } {
  if (typeof window === "undefined") return { supported: false, reason: "Not running in a browser." };
  if (!window.crossOriginIsolated) {
    return {
      supported: false,
      reason:
        "This page is not cross-origin isolated (COOP/COEP headers missing or blocked), so the in-browser runtime cannot start.",
    };
  }
  if (typeof SharedArrayBuffer === "undefined") {
    return { supported: false, reason: "This browser does not expose SharedArrayBuffer. Use a Chromium browser." };
  }
  return { supported: true, reason: null };
}

async function boot(): Promise<WebContainer> {
  if (container) return container;
  if (!bootPromise) {
    bootPromise = (async () => {
      const wc = await import("@webcontainer/api");
      const key = process.env.NEXT_PUBLIC_WEBCONTAINER_API_KEY;
      if (key) wc.configureAPIKey(key);
      const instance = await wc.WebContainer.boot({
        // Must match the COEP header set in next.config.ts.
        coep: "credentialless",
        workdirName: "candidate-project",
        forwardPreviewErrors: "exceptions-only",
      });
      instance.on("server-ready", (_port, url) => {
        if (devTimer) clearTimeout(devTimer);
        set({ status: "ready", detail: "Preview is live", previewUrl: url, error: null });
      });
      instance.on("error", (err) => fail(err.message));
      container = instance;
      return instance;
    })().catch((err) => {
      bootPromise = null;
      throw err;
    });
  }
  return bootPromise;
}

async function runInstall(wc: WebContainer) {
  // Loop until the installed package.json matches the current one: the assistant
  // may have added a dependency while the previous install was still running.
  for (let pass = 0; pass < 3; pass++) {
    const target = files["package.json"];
    set({
      status: "installing",
      detail: pass === 0 ? "Installing dependencies" : "Installing new dependencies",
      installStartedAt: Date.now(),
    });
    const started = Date.now();
    const proc = await wc.spawn("npm", ["install", "--no-audit", "--no-fund"]);
    pipeOutput(proc);
    const code = await proc.exit;
    if (code !== 0) throw new Error(`npm install failed (exit code ${code}). See the log for details.`);
    installedPackageJson = target;
    set({ installSeconds: Math.round((Date.now() - started) / 1000), installStartedAt: null });
    if (!dependenciesChanged(installedPackageJson, files["package.json"])) return;
  }
}

async function runDevServer(wc: WebContainer) {
  await stopDevServer();
  set({ status: "starting", detail: "Starting the dev server", previewUrl: null, error: null });
  const proc = await wc.spawn("npm", ["run", "dev"]);
  devProc = proc;
  pipeOutput(proc);
  if (devTimer) clearTimeout(devTimer);
  devTimer = setTimeout(() => {
    if (snapshot.status === "starting") fail("The dev server did not report a preview URL within 2 minutes.");
  }, DEV_SERVER_TIMEOUT_MS);
  void proc.exit.then((code) => {
    // A deliberate restart replaces devProc first, so only a stale exit is ignored here.
    if (devProc !== proc) return;
    devProc = null;
    if (snapshot.status !== "idle") fail(`The dev server stopped unexpectedly (exit code ${code}).`);
  });
}

async function stopDevServer() {
  const proc = devProc;
  devProc = null;
  if (devTimer) clearTimeout(devTimer);
  if (proc) {
    proc.kill();
    await proc.exit.catch(() => undefined);
  }
}

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}

// --- public API -----------------------------------------------------------

/**
 * Boot, mount the project, install, and start the dev server. Idempotent: a
 * second call while starting (or after success) returns the same promise.
 * The workspace calls this on mount — not on the first prompt — so install
 * time overlaps with the candidate reading the brief and writing their first message.
 */
export function startRuntime(initial: FileMap): Promise<void> {
  if (startPromise) return startPromise;

  const support = checkSupport();
  if (!support.supported) {
    set({ status: "unsupported", detail: "In-browser runtime unavailable", unsupportedReason: support.reason });
    return Promise.resolve();
  }

  files = { ...initial };
  set({ ...IDLE, status: "booting", detail: "Booting the in-browser environment" });

  startPromise = enqueue(async () => {
    try {
      const wc = await boot();
      set({ detail: "Mounting project files" });
      await wc.mount(toFileSystemTree(files));
      await runInstall(wc);
      await runDevServer(wc);
    } catch (err) {
      startPromise = null; // allow a retry
      fail(err instanceof Error ? err.message : String(err));
    }
  });
  return startPromise;
}

/**
 * Write files the assistant produced. Vite picks changes up by itself; the dev
 * server is only restarted (and dependencies reinstalled) when package.json's
 * dependency-relevant fields changed.
 */
export function applyRuntimeWrites(writes: readonly FileWrite[]): Promise<void> {
  if (!writes.length) return Promise.resolve();
  const before = files["package.json"];
  files = applyWrites(files, writes);

  return enqueue(async () => {
    const wc = container;
    if (!wc || !startPromise) return; // not booted: the writes ride along with the initial mount
    try {
      for (const w of writes) {
        const dir = dirname(w.path);
        if (dir) await wc.fs.mkdir(dir, { recursive: true });
        await wc.fs.writeFile(w.path, w.contents);
      }
      // Still installing/booting: runInstall() re-checks package.json itself.
      if (snapshot.status === "booting" || snapshot.status === "installing") return;

      const pkgWritten = writes.some((w) => w.path === "package.json");
      const configWritten = writes.some((w) => w.path === "vite.config.js");
      if (pkgWritten && dependenciesChanged(installedPackageJson ?? before, files["package.json"])) {
        await runInstall(wc);
        await runDevServer(wc);
      } else if (pkgWritten || configWritten) {
        await runDevServer(wc);
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  });
}

/** Restart the dev server without touching files (the "Reload preview" button). */
export function restartDevServer(): Promise<void> {
  return enqueue(async () => {
    if (!container) return;
    try {
      await runDevServer(container);
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  });
}

export function getRuntimeFiles(): FileMap {
  return { ...files };
}

/** Tear the container down (after submission) and reset all module state. */
export async function stopRuntime(): Promise<void> {
  await stopDevServer();
  container?.teardown();
  container = null;
  bootPromise = null;
  startPromise = null;
  installedPackageJson = undefined;
  files = {};
  snapshot = IDLE;
  listeners.forEach((l) => l());
}
