"use client";

import { FileCode, MessagesSquare } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TurnView } from "@/lib/data/types";
import type { FileWrite } from "@/lib/files";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEvidence } from "./evidence-context";
import { FileBrowser } from "./file-browser";
import { Transcript } from "./transcript";

export interface ExtraTab {
  value: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

const cleanPath = (p: string) => p.trim().replace(/\\/g, "/").replace(/^\.?\/+/, "");

/** Scroll to an element that may not be mounted yet (a tab that has just switched). */
function scrollToWhenMounted(id: string, attempts = 12) {
  const el = document.getElementById(id);
  if (el) return void el.scrollIntoView({ block: "center", behavior: "smooth" });
  if (attempts > 0) requestAnimationFrame(() => scrollToWhenMounted(id, attempts - 1));
}

/**
 * The evidence behind a score: the full transcript and the final files, in one
 * panel. It listens to citation clicks anywhere on the page and follows them.
 * `extraTabs` lets the mentor screen put the AI evaluation in the same panel.
 */
export function EvidenceExplorer({
  turns,
  files,
  extraTabs = [],
  className,
  bodyClassName = "h-[34rem]",
}: {
  turns: TurnView[];
  files: FileWrite[];
  extraTabs?: ExtraTab[];
  className?: string;
  bodyClassName?: string;
}) {
  const { target } = useEvidence();
  const [tab, setTab] = useState<string>(extraTabs[0]?.value ?? "transcript");
  const [file, setFile] = useState<string | null>(null);
  const [handled, setHandled] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  // A new citation click switches the tab / file. Derived during render (not in an
  // effect) so the right panel is already mounted when we scroll to it.
  if (target && target.nonce !== handled) {
    setHandled(target.nonce);
    if (target.type === "turn") {
      setTab("transcript");
    } else {
      setTab("files");
      const path = cleanPath(target.ref);
      if (files.some((f) => f.path === path)) setFile(path);
    }
  }

  useEffect(() => {
    if (!target) return;
    if (target.type === "turn") scrollToWhenMounted(`turn-${Number.parseInt(target.ref, 10)}`);
    else root.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [target]);

  return (
    <div ref={root} className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <div className="border-b bg-muted/40 px-3 py-2">
          <TabsList>
            {extraTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                {t.icon}
                {t.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="transcript" className="gap-1.5">
              <MessagesSquare aria-hidden /> Transcript <span className="tabular text-xs text-muted-foreground">{turns.length}</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5">
              <FileCode aria-hidden /> Files <span className="tabular text-xs text-muted-foreground">{files.filter((f) => f.path !== "package-lock.json").length}</span>
            </TabsTrigger>
          </TabsList>
        </div>
        {extraTabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className={cn("overflow-auto p-4", bodyClassName)}>
            {t.content}
          </TabsContent>
        ))}
        <TabsContent value="transcript" className={cn("overflow-auto p-4", bodyClassName)}>
          <Transcript turns={turns} />
        </TabsContent>
        <TabsContent value="files" className={cn("flex", bodyClassName)}>
          <FileBrowser
            files={files}
            selected={file}
            onSelect={setFile}
            highlightQuote={target?.type === "file" && file && cleanPath(target.ref) === file ? target.quote : undefined}
            className="h-full w-full"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
