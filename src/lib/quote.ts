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

/**
 * Extracts a concise, readable sentence or substring from a potentially long prompt or turn.
 * Ensures the excerpt is a verbatim substring of `fullText` so highlighting and verification succeed.
 */
export function extractCleanExcerpt(
  fullText: string,
  options: { keyword?: string; maxLength?: number } = {}
): string {
  const { keyword, maxLength = 240 } = options;
  if (!fullText) return "";
  const trimmed = fullText.trim();
  if (trimmed.length <= maxLength) return trimmed;

  // Split into sentences / paragraphs
  const sentences = trimmed
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (keyword) {
    const kwLower = keyword.toLowerCase();
    const matching = sentences.find((s) => s.toLowerCase().includes(kwLower));
    if (matching) {
      if (matching.length <= maxLength) return matching;
      const sub = matching.slice(0, maxLength);
      const lastSpace = sub.lastIndexOf(" ");
      return (lastSpace > 40 ? sub.slice(0, lastSpace) : sub).trim() + "...";
    }
  }

  // Fallback: take the first sentence or clean prefix
  const firstSentence = sentences[0] || trimmed;
  if (firstSentence.length <= maxLength) {
    return firstSentence;
  }
  const slice = firstSentence.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim() + "...";
}

/**
 * Verifies whether a claimed citation/quote appears verbatim (normalized) in the source text.
 * Prevents LLM evaluators from fabricating or hallucinating citations.
 */
export function verifySubstringCitation(
  quote: string,
  source: string,
  minChars = 8
): { verified: boolean; cleanQuote: string } {
  if (!quote || !source) return { verified: false, cleanQuote: "" };
  const cleanQuote = quote.trim();
  const qNorm = cleanQuote
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .toLowerCase();
  const sNorm = source
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .toLowerCase();

  // If quote contains ellipsis ("..."), verify all fragments appear in order
  const fragments = qNorm
    .split(/\s*(?:\.\.\.|…)\s*/)
    .map((f) => f.trim())
    .filter((f) => f.length >= 3);

  if (fragments.length > 0) {
    let from = 0;
    let allFound = true;
    for (const f of fragments) {
      const idx = sNorm.indexOf(f, from);
      if (idx < 0) {
        allFound = false;
        break;
      }
      from = idx + f.length;
    }
    if (allFound) {
      return { verified: true, cleanQuote };
    }
  }

  const isExactSubstring = sNorm.includes(qNorm) && cleanQuote.length >= minChars;
  return {
    verified: isExactSubstring,
    cleanQuote: isExactSubstring ? cleanQuote : extractCleanExcerpt(source, { maxLength: 240 }),
  };
}

