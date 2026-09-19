"use client";

import { ChevronDown, ChevronRight, FileCode, Folder, FolderOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildTreeEntries, type FileWrite, type TreeEntry } from "@/lib/files";
import { findLineRange } from "@/lib/quote";
import { cn } from "@/lib/utils";

interface Props {
  files: FileWrite[];
  /** Paths written in the latest assistant turn: marked as new/changed. */
  changed?: ReadonlySet<string>;
  /** Controlled selection. Omit `onSelect` to let the browser manage it. */
  selected?: string | null;
  onSelect?: (path: string) => void;
  /** Highlight the lines of the selected file that contain this quote. */
  highlightQuote?: string;
  className?: string;
}

/** Read-only file tree and viewer. There is deliberately no editor: the candidate prompts, the assistant writes. */
export function FileBrowser({ files, changed, selected, onSelect, highlightQuote, className }: Props) {
  // The lockfile is mechanical noise for anyone reviewing judgment.
  const visible = useMemo(() => files.filter((f) => f.path !== "package-lock.json"), [files]);
  const tree = useMemo(() => buildTreeEntries(visible.map((f) => f.path)), [visible]);
  const [internal, setInternal] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const requested = selected !== undefined ? selected : internal;
  const current =
    (requested && visible.find((f) => f.path === requested)) ||
    visible.find((f) => f.path === "src/App.jsx") ||
    visible.find((f) => f.path.startsWith("src/")) ||
    visible[0] ||
    null;

  const select = (path: string) => (onSelect ? onSelect(path) : setInternal(path));
  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const lines = useMemo(() => (current ? current.contents.split("\n") : []), [current]);
  const range = current ? findLineRange(current.contents, highlightQuote) : null;
  const codeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (range) codeRef.current?.querySelector('[data-hl="true"]')?.scrollIntoView({ block: "center" });
  }, [current?.path, range?.[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible.length) return <p className={cn("p-4 text-sm text-muted-foreground", className)}>No files yet. Ask the assistant to start the project.</p>;

  const renderNode = (node: TreeEntry, depth: number) => {
    const pad = { paddingLeft: `${depth * 12 + 8}px` };
    if (node.type === "dir") {
      const open = !collapsed.has(node.path);
      return (
        <li key={node.path}>
          <button type="button" onClick={() => toggle(node.path)} style={pad} className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            {open ? <ChevronDown className="size-3" aria-hidden /> : <ChevronRight className="size-3" aria-hidden />}
            {open ? <FolderOpen className="size-3.5" aria-hidden /> : <Folder className="size-3.5" aria-hidden />}
            <span className="truncate">{node.name}</span>
          </button>
          {open && <ul>{node.children?.map((c) => renderNode(c, depth + 1))}</ul>}
        </li>
      );
    }
    const isCurrent = current?.path === node.path;
    return (
      <li key={node.path}>
        <button
          type="button"
          onClick={() => select(node.path)}
          style={pad}
          aria-current={isCurrent ? "true" : undefined}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left font-mono text-xs transition-colors hover:bg-muted",
            isCurrent ? "bg-signal-soft font-medium text-signal-ink hover:bg-signal-soft" : "text-foreground/85"
          )}
        >
          <FileCode className={cn("ml-4 size-3.5 shrink-0", isCurrent ? "text-signal-ink" : "text-muted-foreground")} aria-hidden />
          <span className="truncate">{node.name}</span>
          {changed?.has(node.path) && <span className="pop-in ml-auto size-1.5 shrink-0 rounded-full bg-signal" title="Written in the latest turn" />}
        </button>
      </li>
    );
  };

  return (
    <div className={cn("grid min-h-0 grid-cols-[minmax(9rem,12.5rem)_minmax(0,1fr)] overflow-hidden", className)}>
      <ul className="min-h-0 overflow-auto border-r border-border bg-surface-container-low p-1.5" aria-label="Files">
        {tree.map((n) => renderNode(n, 0))}
      </ul>
      <div className="flex min-h-0 min-w-0 flex-col">
        {current && (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate font-mono text-foreground">{current.path}</span>
              <span className="tabular shrink-0 font-mono">{lines.length} lines</span>
            </div>
            <div ref={codeRef} key={current.path} className="fade-in min-h-0 flex-1 overflow-auto py-3 font-mono text-[12.5px] leading-[1.35rem]">
              {lines.map((line, i) => {
                const hl = !!range && i >= range[0] && i <= range[1];
                return (
                  <div key={i} data-hl={hl || undefined} className={cn("flex", hl && "bg-mark")}>
                    <span className="tabular w-12 shrink-0 pr-4 text-right text-muted-foreground/50 select-none">{i + 1}</span>
                    <span className="pr-4 whitespace-pre">{line || " "}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
