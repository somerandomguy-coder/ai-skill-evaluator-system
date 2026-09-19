/** Pure mappers from stored rows to view models. No database access, so services and the data source can both use them. */
import type { ChatTurn } from "@prisma/client";
import { REQUIREMENT_CATEGORIES } from "../ai/schemas";
import { parseFileList } from "../json";
import type { RequirementView, TurnView } from "./types";

export function toTurnView(t: ChatTurn): TurnView {
  return {
    seq: t.seq,
    role: t.role,
    content: t.content,
    filesWritten: parseFileList(t.filesWritten),
    reasoning: t.reasoning,
    createdAt: t.createdAt.toISOString(),
  };
}

/**
 * Requirements have no stored position (ids are random), so a rubric is shown in
 * a fixed, meaningful order: category order, then most important first.
 */
export function sortRequirements<T extends { category: string; weight: number; statement: string }>(list: T[]): T[] {
  const rank = (c: string) => {
    const i = (REQUIREMENT_CATEGORIES as readonly string[]).indexOf(c);
    return i < 0 ? REQUIREMENT_CATEGORIES.length : i;
  };
  return [...list].sort((a, b) => rank(a.category) - rank(b.category) || b.weight - a.weight || a.statement.localeCompare(b.statement));
}

export function toRequirementView(r: { id: string; category: string; statement: string; weight: number; successSignals: string[]; failureModes: string[] }): RequirementView {
  return {
    id: r.id,
    category: r.category as RequirementView["category"],
    statement: r.statement,
    weight: r.weight,
    successSignals: r.successSignals,
    failureModes: r.failureModes,
  };
}
