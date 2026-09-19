import type { RequirementRef, TranscriptTurn } from "@/lib/ai/scoring";
import { SEED_REQUIREMENTS } from "@/lib/fixtures/seed-requirements";
import type { SeedSession } from "@/lib/fixtures/seed-sessions";

/** Seed requirements as the evaluator sees them, with stable ids req0..reqN. */
export function seedRefs(): RequirementRef[] {
  return SEED_REQUIREMENTS.map((r, i) => ({
    id: `req${i}`,
    category: r.category,
    statement: r.statement,
    weight: r.weight,
    successSignals: r.successSignals,
    failureModes: r.failureModes,
  }));
}

export function sessionTurns(s: SeedSession): TranscriptTurn[] {
  return s.turns.map((t) => ({
    seq: t.seq,
    role: t.role,
    content: t.content,
    filesWritten: t.files ?? null,
    reasoning: t.reasoning ?? null,
  }));
}
