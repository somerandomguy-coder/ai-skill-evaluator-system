/**
 * Helpers for showing a cited quote in place. These are for display only —
 * whether a quote is genuine is decided by ai/scoring.ts, not here.
 */

export interface Segment {
  text: string;
  mark: boolean;
}

/** The fragments of a quote: "..." or an ellipsis means "text omitted here". */
export function quoteFragments(quote: string): string[] {
  return quote
    .split(/\s*(?:\.\.\.|…)\s*/)
    .map((f) => f.trim())
    .filter((f) => f.length >= 3);
}

/** Split `content` into plain and highlighted runs for each fragment found in it (case-insensitive, in order). */
export function highlightSegments(content: string, quote: string | undefined): Segment[] {
  if (!quote) return [{ text: content, mark: false }];
  const lower = content.toLowerCase();
  const ranges: [number, number][] = [];
  let from = 0;
  for (const f of quoteFragments(quote)) {
    const i = lower.indexOf(f.toLowerCase(), from);
    if (i < 0) continue;
    ranges.push([i, i + f.length]);
    from = i + f.length;
  }
  if (!ranges.length) return [{ text: content, mark: false }];

  const out: Segment[] = [];
  let cursor = 0;
  for (const [a, b] of ranges) {
    if (a > cursor) out.push({ text: content.slice(cursor, a), mark: false });
    out.push({ text: content.slice(a, b), mark: true });
    cursor = b;
  }
  if (cursor < content.length) out.push({ text: content.slice(cursor), mark: false });
  return out;
}

/** Zero-based inclusive line range of the first fragment of `quote` within `contents`, or null. */
export function findLineRange(contents: string, quote: string | undefined): [number, number] | null {
  if (!quote) return null;
  const first = quoteFragments(quote)[0];
  if (!first) return null;
  const idx = contents.toLowerCase().indexOf(first.toLowerCase());
  if (idx < 0) return null;
  const start = contents.slice(0, idx).split("\n").length - 1;
  const end = start + first.split("\n").length - 1;
  return [start, end];
}
