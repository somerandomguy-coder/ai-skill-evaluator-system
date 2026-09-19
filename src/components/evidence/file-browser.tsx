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

  if (!visible.length) return <p className={cn("p-4 text-sm text-muted-foreground", className)}>No files yet.</p>;

  const renderNode = (node: TreeEntry, depth: number) => {
    const pad = { paddingLeft: `${depth * 12 + 8}px` };
    if (node.type === "dir") {
      const open = !collapsed.has(node.path);
      return (
        <li key={node.path}>
          <button type="button" onClick={() => toggle(node.path)} style={pad} className="flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-xs text-muted-foreground hover:bg-muted">
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
          className={cn("flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-xs hover:bg-muted", isCurrent && "bg-accent font-medium text-accent-foreground")}
        >
          <FileCode className="ml-4 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{node.name}</span>
          {changed?.has(node.path) && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-emerald-500" title="Written in the latest turn" />}
        </button>
      </li>
    );
  };

  return (
    <div className={cn("grid min-h-0 grid-cols-[12.5rem_minmax(0,1fr)] overflow-hidden", className)}>
      <ul className="min-h-0 overflow-auto border-r p-1.5" aria-label="Files">
        {tree.map((n) => renderNode(n, 0))}
      </ul>
      <div className="flex min-h-0 min-w-0 flex-col">
        {current && (
          <>
            <div className="flex items-center justify-between gap-3 border-b px-3 py-1.5 text-xs text-muted-foreground">
              <span className="truncate font-mono">{current.path}</span>
              <span className="tabular shrink-0">{lines.length} lines</span>
            </div>
            <div ref={codeRef} className="min-h-0 flex-1 overflow-auto py-2 font-mono text-xs leading-5">
              {lines.map((line, i) => {
                const hl = !!range && i >= range[0] && i <= range[1];
                return (
                  <div key={i} data-hl={hl || undefined} className={cn("flex", hl && "bg-amber-100")}>
                    <span className="tabular w-10 shrink-0 pr-3 text-right text-muted-foreground/60 select-none">{i + 1}</span>
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
