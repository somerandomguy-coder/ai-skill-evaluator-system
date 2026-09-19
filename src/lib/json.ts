/**
 * Typed access to Prisma `Json` columns. Everything stored in them is written by
 * this app, but they are read back through Zod so schema drift or a bad manual
 * edit degrades to an empty value instead of crashing a page.
 */
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { FileMap, FileWrite } from "./files";
import { EvidenceSchema, type RequirementResult } from "./ai/schemas";

export const toJson = (v: unknown) => v as Prisma.InputJsonValue;

const FileListSchema = z.array(z.object({ path: z.string(), contents: z.string() }));
const FileMapSchema = z.record(z.string(), z.string());

export function parseFileList(v: unknown): FileWrite[] {
  const r = FileListSchema.safeParse(v);
  return r.success ? r.data : [];
}

export function parseFileMap(v: unknown): FileMap {
  const r = FileMapSchema.safeParse(v);
  return r.success ? r.data : {};
}

const RequirementResultSchema = z.object({
  requirementId: z.string(),
  score: z.number().nullable(),
  confidence: z.number(),
  evidence: z.array(EvidenceSchema.extend({ verified: z.boolean() })),
  rationale: z.string(),
  note: z.string().optional(),
});

export function parseRequirementResults(v: unknown): RequirementResult[] {
  const r = z.array(RequirementResultSchema).safeParse(v);
  return r.success ? r.data : [];
}

const MetaSchema = z.object({
  validApproaches: z.array(z.string()).default([]),
  ambiguities: z.array(z.string()).default([]),
  source: z.string().default("ai"),
});

export function parseChallengeMeta(v: unknown) {
  const r = MetaSchema.safeParse(v ?? {});
  return r.success ? r.data : { validApproaches: [], ambiguities: [], source: "ai" };
}
