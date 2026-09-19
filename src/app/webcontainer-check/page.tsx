"use client";

/**
 * Standalone WebContainer smoke test — build-order step 1.
 *
 * Boots the starter template, installs, starts Vite and shows the preview.
 * Nothing else in the product is involved, so if this page is green the
 * riskiest dependency (cross-origin isolation + WebContainer) is proven.
 * The data-* attributes exist so a headless browser can assert on it.
 */
import { useEffect, useSyncExternalStore } from "react";
import {
  getRuntimeSnapshot,
  getServerRuntimeSnapshot,
  startRuntime,
  subscribeRuntime,
} from "@/lib/runtime/webcontainer";
import { BASE_STARTER } from "@/lib/starter";

export default function WebContainerCheckPage() {
  const snap = useSyncExternalStore(subscribeRuntime, getRuntimeSnapshot, getServerRuntimeSnapshot);

  // `window` does not exist during SSR, so it is read through useSyncExternalStore:
  // null on the server and during hydration, the real value afterwards (no mismatch).
  const isolated = useSyncExternalStore(
    () => () => undefined,
    () => window.crossOriginIsolated,
    () => null
  );

  useEffect(() => {
    void startRuntime(BASE_STARTER);
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">WebContainer check</h1>
      <div
        data-testid="wc-status"
        data-status={snap.status}
        data-isolated={String(isolated)}
        className="rounded-lg border p-3 text-sm"
      >
        <div>
          <b>status:</b> {snap.status} — {snap.detail}
        </div>
        <div>
          <b>crossOriginIsolated:</b> {String(isolated)}
        </div>
        {snap.installSeconds !== null && (
          <div>
            <b>install took:</b> {snap.installSeconds}s
          </div>
        )}
        {snap.unsupportedReason && <div className="text-amber-600">{snap.unsupportedReason}</div>}
        {snap.error && <div className="text-red-600">{snap.error}</div>}
      </div>

      {snap.previewUrl ? (
        <iframe
          data-testid="wc-preview"
          src={snap.previewUrl}
          title="Preview"
          className="h-[420px] w-full rounded-lg border bg-white"
        />
      ) : null}

      <pre className="max-h-64 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-200">
        {snap.logs.slice(-60).join("\n") || "(no output yet)"}
      </pre>
    </main>
  );
}
