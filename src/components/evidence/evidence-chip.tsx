"use client";

import { BadgeCheck, FileCode, MessageSquare } from "lucide-react";
import type { VerifiedEvidence } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";
import { useEvidence } from "./evidence-context";

/** A citation: click to see the exact turn or file, with the quoted text highlighted. */
export function EvidenceChip({ evidence, className }: { evidence: Pick<VerifiedEvidence, "type" | "ref" | "quote" | "verified">; className?: string }) {
  const { jump } = useEvidence();
  const isTurn = evidence.type === "turn";
  const Icon = isTurn ? MessageSquare : FileCode;
  return (
    <button
      type="button"
      onClick={() => jump(evidence.type, evidence.ref, evidence.quote)}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
        isTurn ? "bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100" : "bg-violet-50 text-violet-800 ring-violet-200 hover:bg-violet-100",
        className
      )}
      title={`Show ${isTurn ? `turn ${evidence.ref}` : evidence.ref} in the evidence`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className={cn("truncate", !isTurn && "font-mono")}>{isTurn ? `Turn ${evidence.ref}` : evidence.ref}</span>
      {evidence.verified && <BadgeCheck className="size-3 shrink-0 text-emerald-600" aria-label="verified against the transcript" />}
    </button>
  );
}
