/**
 * Deterministic evaluation post-processing.
 *
 * The evaluator model proposes scores; this module decides what is allowed to
 * stand. It is the reason "every score cites evidence" is a guarantee and not a
 * hope:
 *
 *  - Every citation is checked against the real transcript / file tree. The turn
 *    or file must exist and the quoted text must genuinely appear in it.
 *    Citations that fail are discarded — a fabricated quote never reaches a report.
 *  - A score with no verifiable evidence is replaced by `null` ("could not be
 *    scored"). That null is what drives escalation to a human.
 *  - If the model fabricated some citations for a requirement, its confidence in
 *    that requirement is capped below the escalation threshold: an evaluator that
 *    invents evidence is not to be trusted on it unsupervised.
 *  - The overall score and confidence are computed here from the per-requirement
 *    results and the rubric weights. The model never states them.
 *
 * Nothing in here looks at language quality — matching is on meaning-bearing
 * text only, and quote comparison is tolerant of case, whitespace and typography
 * so that a candidate's spelling mistakes are never a reason to lose credit.
 */
import type { FileMap, FileWrite } from "../files";
import type {
  EvaluationResult,
  Evidence,
  EvaluatorOutput,
  RequirementCategory,
  RequirementResult,
  VerifiedEvidence,
} from "./schemas";

export interface TranscriptTurn {
  seq: number;
  role: "USER" | "ASSISTANT";
  content: string;
  filesWritten?: FileWrite[] | null;
  reasoning?: string | null;
}

export interface RequirementRef {
  id: string;
  category: RequirementCategory;
  statement: string;
  weight: number;
  successSignals: string[];
  failureModes: string[];
}

export interface EvidenceContext {
  turns: TranscriptTurn[];
  files: FileMap;
}

/** Confidence ceiling applied when a requirement contained fabricated citations. */
export const FABRICATED_CITATION_CONFIDENCE_CAP = 0.5;
const MIN_QUOTE_CHARS = 8;

// --- text matching ---------------------------------------------------------

/** Case-, whitespace- and typography-insensitive form used only for quote matching. */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * True when `quote` really appears in `haystack`. An ellipsis ("..." or "…") in
 * the quote means "text elided here": each fragment must appear, in order.
 */
export function quoteAppearsIn(quote: string, haystack: string): boolean {
  const q = normalizeForMatch(quote);
  const h = normalizeForMatch(haystack);
  const fragments = q
    .split(/\s*(?:\.\.\.|…)\s*/)
    .map((f) => f.trim())
    .filter(Boolean);
  if (!fragments.length) return false;
  const total = fragments.reduce((n, f) => n + f.length, 0);
  // A very short quote proves nothing — unless it is the whole of a short source.
  if (total < MIN_QUOTE_CHARS && h !== q) return false;

  let from = 0;
  for (const f of fragments) {
    const i = h.indexOf(f, from);
    if (i < 0) return false;
    from = i + f.length;
  }
  return true;
}

const normalizeFilePath = (p: string) => p.trim().replace(/\\/g, "/").replace(/^\.?\/+/, "");

export function verifyEvidence(e: Evidence, ctx: EvidenceContext): VerifiedEvidence {
  if (e.type === "turn") {
    const n = Number.parseInt(/\d+/.exec(e.ref)?.[0] ?? "", 10);
    const turn = Number.isFinite(n) ? ctx.turns.find((t) => t.seq === n) : undefined;
    if (!turn) return { ...e, verified: false };
    const haystack = [turn.content, turn.reasoning ?? "", ...(turn.filesWritten ?? []).map((f) => f.path)].join("\n");
    return { type: "turn", ref: String(n), quote: e.quote, verified: quoteAppearsIn(e.quote, haystack) };
  }
  const path = normalizeFilePath(e.ref);
  const contents = ctx.files[path];
  return { type: "file", ref: path, quote: e.quote, verified: contents !== undefined && quoteAppearsIn(e.quote, contents) };
}

// --- per-requirement + overall --------------------------------------------

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

function withheld(requirementId: string, rationale: string, note: string, evidence: VerifiedEvidence[] = []): RequirementResult {
  return { requirementId, score: null, confidence: 0, evidence, rationale, note };
}

export function computeOverall(results: RequirementResult[], reqs: RequirementRef[]) {
  const weight = new Map(reqs.map((r) => [r.id, Math.max(0, r.weight)]));
  let total = 0;
  let scoredWeight = 0;
  let weightedScore = 0;
  let weightedConfidence = 0;
  for (const r of results) {
    const w = weight.get(r.requirementId) ?? 0;
    total += w;
    weightedConfidence += w * r.confidence;
    if (r.score !== null) {
      scoredWeight += w;
      weightedScore += w * (r.score / 5);
    }
  }
  return {
    overallScore: scoredWeight > 0 ? round1((weightedScore / scoredWeight) * 100) : 0,
    confidence: total > 0 ? round2(weightedConfidence / total) : 0,
    coverage: total > 0 ? round2(scoredWeight / total) : 0,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function exactlyThree(list: string[], fallback: string[]): string[] {
  const out = list.map((s) => s.trim()).filter(Boolean).slice(0, 3);
  for (const f of fallback) {
    if (out.length >= 3) break;
    if (!out.includes(f)) out.push(f);
  }
  while (out.length < 3) out.push("Not enough evidence to name a further point.");
  return out;
}

/**
 * Turn the model's raw output into a trustworthy evaluation. Total: it never
 * throws on model mistakes (unknown ids, missing requirements, bad scores) —
 * those become withheld scores that escalate.
 */
export function finalizeEvaluation(
  out: EvaluatorOutput,
  ctx: EvidenceContext & { requirements: RequirementRef[] }
): EvaluationResult {
  const byId = new Map(ctx.requirements.map((r) => [r.id, r]));
  const done = new Map<string, RequirementResult>();

  for (const item of out.perRequirement) {
    const req = byId.get(item.requirementId);
    if (!req || done.has(req.id)) continue; // unknown or duplicate id: ignore

    const checked = item.evidence.map((e) => verifyEvidence(e, ctx));
    const good = checked.filter((e) => e.verified);
    const discarded = checked.length - good.length;
    const rationale = item.rationale.trim();

    const score = item.score;
    let confidence = clamp01(item.confidence);
    let note: string | undefined;

    if (score !== null && (!Number.isInteger(score) || score < 0 || score > 5)) {
      done.set(req.id, withheld(req.id, rationale, "The evaluator gave a score outside the 0-5 scale, so none was recorded.", good));
      continue;
    }
    if (score !== null && good.length === 0) {
      note = checked.length
        ? "None of the evaluator's citations could be verified against the transcript and files, so no score was recorded."
        : "The evaluator cited no evidence, so no score was recorded.";
      done.set(req.id, withheld(req.id, rationale, note));
      continue;
    }
    if (score === null) {
      done.set(req.id, withheld(req.id, rationale || "No evidence was found for this requirement.", "No supporting evidence was available for this requirement.", good));
      continue;
    }
    if (discarded > 0) {
      confidence = Math.min(confidence, FABRICATED_CITATION_CONFIDENCE_CAP);
      note = `${discarded} citation${discarded === 1 ? "" : "s"} could not be verified and ${discarded === 1 ? "was" : "were"} discarded.`;
    }
    done.set(req.id, { requirementId: req.id, score, confidence, evidence: good, rationale, ...(note ? { note } : {}) });
  }

  const perRequirement = ctx.requirements.map(
    (req) =>
      done.get(req.id) ??
      withheld(req.id, "The evaluator returned no judgment for this requirement.", "The evaluator did not address this requirement, so no score was recorded.")
  );

  const overall = computeOverall(perRequirement, ctx.requirements);

  // Fallback sentences come from the rubric itself, in decision terms.
  const scored = perRequirement
    .map((r) => ({ r, req: byId.get(r.requirementId)! }))
    .filter((x) => x.r.score !== null)
    .sort((a, b) => (b.r.score! - a.r.score!) || b.req.weight - a.req.weight);
  const weakest = perRequirement
    .map((r) => ({ r, req: byId.get(r.requirementId)! }))
    .sort((a, b) => (a.r.score ?? -1) - (b.r.score ?? -1) || b.req.weight - a.req.weight);

  const seqs = new Set(ctx.turns.map((t) => t.seq));
  const dis = out.unadjudicatedDisagreement;

  return {
    ...overall,
    perRequirement,
    strengths: exactlyThree(out.strengths, scored.map((x) => `Strong evidence on: ${x.req.statement}`)),
    gaps: exactlyThree(out.gaps, weakest.map((x) => `Little or no evidence on: ${x.req.statement}`)),
    unadjudicatedDisagreement: {
      present: dis.present,
      turns: dis.turns.filter((t) => seqs.has(t)),
      note: dis.note.trim(),
    },
  };
}

// --- integrity -------------------------------------------------------------

export interface IntegrityFlag {
  turn: number;
  reason: string;
}

const MANIPULATION_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b(ignore|disregard|forget)\b.{0,40}\b(previous|prior|above|all)\b.{0,30}\b(instructions?|prompts?|rules?)\b/i,
    reason: "asks the reader to ignore prior instructions",
  },
  {
    pattern: /\b(give|award|assign|grant)\b.{0,20}\b(me|us|this)\b.{0,30}\b(full marks|top score|perfect score|highest score|5\/5|100%|maximum)\b/i,
    reason: "asks to be awarded a score",
  },
];

/**
 * The transcript is untrusted text written by the candidate. If a candidate
 * addresses the evaluator directly to influence scoring, the result must not be
 * left to an automated judgment alone.
 */
export function detectManipulation(turns: TranscriptTurn[]): IntegrityFlag[] {
  const flags: IntegrityFlag[] = [];
  for (const t of turns) {
    if (t.role !== "USER") continue;
    for (const { pattern, reason } of MANIPULATION_PATTERNS) {
      if (pattern.test(t.content)) {
        flags.push({ turn: t.seq, reason: `Turn ${t.seq} ${reason}.` });
        break;
      }
    }
  }
  return flags;
}
