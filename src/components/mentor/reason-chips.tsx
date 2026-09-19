import { Bot, Gauge, Gavel, MessagesSquare, Scale, Search, ShieldAlert, Timer, type LucideIcon } from "lucide-react";
import type { EscalationCode, EscalationReason } from "@/lib/ai/escalation";
import { cn } from "@/lib/utils";

const AMBER = "bg-amber-50 text-amber-800 ring-amber-200";
const SKY = "bg-sky-50 text-sky-800 ring-sky-200";
const ROSE = "bg-rose-50 text-rose-800 ring-rose-200";
const VIOLET = "bg-violet-50 text-violet-800 ring-violet-200";

export const REASON_META: Record<EscalationCode, { label: string; icon: LucideIcon; tone: string }> = {
  LOW_CONFIDENCE: { label: "Low confidence", icon: Gauge, tone: AMBER },
  NO_EVIDENCE: { label: "No evidence", icon: Search, tone: AMBER },
  BORDERLINE_SCORE: { label: "Borderline score", icon: Scale, tone: AMBER },
  UNADJUDICATED_DISAGREEMENT: { label: "Disagreement unresolved", icon: MessagesSquare, tone: AMBER },
  SESSION_TOO_SHORT: { label: "Very short session", icon: Timer, tone: SKY },
  SESSION_TOO_LONG: { label: "Very long session", icon: Timer, tone: SKY },
  INTEGRITY_FLAG: { label: "Integrity flag", icon: ShieldAlert, tone: ROSE },
  NO_AI_EVALUATION: { label: "No AI evaluation", icon: Bot, tone: VIOLET },
  CONTESTED: { label: "Contested by candidate", icon: Gavel, tone: VIOLET },
};

export function ReasonChip({ reason, className }: { reason: Pick<EscalationReason, "code" | "message">; className?: string }) {
  const meta = REASON_META[reason.code];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", meta.tone, className)} title={reason.message}>
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  );
}
