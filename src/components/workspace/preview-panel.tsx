"use client";

import { ExternalLink, MonitorOff, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { restartDevServer, startRuntime } from "@/lib/runtime/webcontainer";
import type { FileMap } from "@/lib/files";
import { RuntimeProgress, useRuntime } from "./runtime-status";

/** The live preview: warm-up progress, the running app, or an honest explanation when it can't run. */
export function PreviewPanel({ initialFiles }: { initialFiles: FileMap }) {
  const rt = useRuntime();
  const [reloads, setReloads] = useState(0);

  if (rt.status === "unsupported") {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-4 p-6">
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
          <MonitorOff className="size-5" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold">The live preview can&apos;t run in this browser</h3>
          <p className="text-sm text-muted-foreground">{rt.unsupportedReason}</p>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>Open this page in Chrome, Edge or Brave to get the live preview.</li>
          <li>You can keep working: the assistant still writes your files (see the Files tab), and your transcript is what we assess.</li>
        </ul>
      </div>
    );
  }

  if (rt.status === "error") {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertTitle>The preview hit a problem</AlertTitle>
          <AlertDescription>{rt.error}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void restartDevServer()}>
            <RotateCcw className="size-3.5" aria-hidden />
            Restart the dev server
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void startRuntime(initialFiles)}>
            Start over
          </Button>
        </div>
        {rt.logs.length > 0 && <pre className="min-h-0 flex-1 overflow-auto rounded-lg bg-neutral-950 p-3 font-mono text-[0.7rem] leading-relaxed text-neutral-300">{rt.logs.slice(-40).join("\n")}</pre>}
      </div>
    );
  }

  if (rt.status !== "ready" || !rt.previewUrl) return <RuntimeProgress />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
        <span className="truncate font-mono text-xs text-muted-foreground">{rt.previewUrl.replace(/^https?:\/\//, "")}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setReloads((n) => n + 1)} title="Reload the preview" aria-label="Reload the preview">
            <RefreshCw aria-hidden />
          </Button>
          <a href={rt.previewUrl} target="_blank" rel="noreferrer noopener" title="Open the preview in a new tab" aria-label="Open the preview in a new tab" className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>
      <iframe key={reloads} src={rt.previewUrl} title="Live preview of your project" className="min-h-0 w-full flex-1 border-0 bg-white" />
    </div>
  );
}
