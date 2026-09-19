/**
 * Deterministic barrier detection.
 *
 * A "barrier" is a job-description requirement that filters people rather than
 * measures the ability to do the job: local experience, residency, degree or
 * pedigree gates, culture-fit proxies, native-speaker requirements, years-served
 * proxies. They must never enter the rubric.
 *
 * The model is asked to flag these, but fairness must not hinge on the model
 * noticing. This regex pass is the backstop: it runs on the raw text, and its
 * findings are merged with the model's. It errs toward flagging — a false flag
 * only means we decline to assess something a work sample could not assess
 * anyway.
 */
import type { Barrier, ParsedJd } from "./schemas";

interface Rule {
  kind: Barrier["kind"];
  patterns: RegExp[];
  reason: string;
}

const RULES: Rule[] = [
  {
    kind: "LOCAL_EXPERIENCE",
    patterns: [
      /\b(local|australian|domestic|regional)\s+(work\s+)?experience\b/i,
      /\bexperience\s+(working\s+)?(in|within)\s+(the\s+)?(australian|local)\s+(market|industry|context|environment)\b/i,
    ],
    reason: "Where someone has worked says nothing about whether they can do the work; a work sample measures the work.",
  },
  {
    kind: "WORK_RIGHTS_OR_RESIDENCY",
    patterns: [
      /\b(australian|nz|new zealand)\s+(citizen(ship)?|permanent\s+resident)\b/i,
      /\bwork(ing)?\s+rights\b/i,
      /\bright\s+to\s+work\b/i,
      /\bvisa\b/i,
      /\bsecurity\s+clearance\b/i,
      /\b(must|need\s+to|required\s+to)\s+(be\s+)?(based|located|reside|living)\b/i,
    ],
    reason: "Eligibility to be hired is a legal matter for the employer, not a capability a work sample can assess.",
  },
  {
    kind: "CREDENTIAL_GATE",
    patterns: [
      /\b(post-?graduate|master'?s|masters|ph\.?d|doctorate|bachelor'?s?)\b/i,
      /\bdegree\b/i,
      /\bqualifications?\b/i,
    ],
    reason: "A credential signals schooling, not the ability to do the job — which the work sample measures directly.",
  },
  {
    kind: "PEDIGREE_PROXY",
    patterns: [
      /\b(top[- ]tier|ivy[- ]league|group\s+of\s+eight|go8|prestigious|tier[- ]one)\b/i,
      /\bexperience\s+at\s+(a\s+)?(startups?|big\s+tech|faang)\b/i,
      /\bfounding\s+teams?\b/i,
    ],
    reason: "Employer type or institution is a proxy for capability that penalises non-linear careers.",
  },
  {
    kind: "CULTURE_FIT_PROXY",
    patterns: [/\b(culture|cultural)\s+fit\b/i, /\bvalues?\s+alignment\b/i, /\baligned?\s+with\s+our\s+values\b/i],
    reason: "'Fit' and 'alignment' are subjective and tend to reward similarity to existing staff; they cannot be assessed objectively.",
  },
  {
    kind: "NATIVE_LANGUAGE",
    patterns: [
      /\bnative(-level)?\s+(english\s+)?speaker\b/i,
      /\bnative[- ]level\s+english\b/i,
      /\bmother\s+tongue\b/i,
      /\b(fluent|fluency|proficien(t|cy))\s+(in\s+)?english\b/i,
    ],
    reason: "Language background is not assessed here: the work sample scores decisions and reasoning, never fluency.",
  },
  {
    kind: "YEARS_OF_EXPERIENCE",
    patterns: [/\b\d{1,2}\s*\+?\s*(-\s*\d{1,2}\s*)?years?\b[^.\n]{0,60}\b(experience|background)\b/i],
    reason: "Time served is a proxy for capability; demonstrated work is a more direct signal.",
  },
];

const MAX_TEXT = 300;

/** Split into candidate statements: lines, and sentences within long lines. */
function statements(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.replace(/^[\s\-*•·]+/, "").trim();
    if (!t) continue;
    if (t.length <= MAX_TEXT) {
      out.push(t);
    } else {
      for (const s of t.split(/(?<=[.!?])\s+/)) if (s.trim()) out.push(s.trim().slice(0, MAX_TEXT));
    }
  }
  return out;
}

export function detectBarriers(raw: string): Barrier[] {
  const found: Barrier[] = [];
  const seen = new Set<string>();
  for (const text of statements(raw)) {
    for (const rule of RULES) {
      if (rule.patterns.some((p) => p.test(text)) && !seen.has(text)) {
        seen.add(text);
        found.push({ text, kind: rule.kind, reason: rule.reason });
        break; // one flag per statement
      }
    }
  }
  return found;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const overlaps = (a: string, b: string) => {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return (x.length >= 10 && y.includes(x)) || (y.length >= 10 && x.includes(y));
};

/**
 * Merge the model's barriers with the regex pass, drop duplicates, and make sure
 * no barrier text survives as a "skill". This is what "keep them out of the
 * rubric" means concretely: the rubric is generated from `mustHaveSkills` /
 * `niceToHaveSkills` only, and those are scrubbed here.
 */
export function finalizeParsedJd(parsed: ParsedJd, raw: string): ParsedJd {
  const barriers: Barrier[] = [...parsed.barriers];
  for (const d of detectBarriers(raw)) {
    if (!barriers.some((b) => overlaps(b.text, d.text))) barriers.push(d);
  }

  const clean = (skills: string[]) =>
    Array.from(
      new Set(
        skills
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((s) => !barriers.some((b) => overlaps(s, b.text)))
      )
    );

  return {
    ...parsed,
    roleTitle: parsed.roleTitle.trim(),
    employer: parsed.employer.trim() || "Unknown",
    mustHaveSkills: clean(parsed.mustHaveSkills),
    niceToHaveSkills: clean(parsed.niceToHaveSkills).filter((s) => !parsed.mustHaveSkills.includes(s)),
    barriers,
  };
}
