"use client";

import { Check, Gavel, Link2, LoaderCircle, Printer, Award, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contestScore } from "@/lib/client/api";

export function CopyLinkButton({ url, label = "Copy link", variant = "outline" }: { url?: string; label?: string; variant?: "outline" | "signal" }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const target = url ?? window.location.href;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", target);
    }
  }
  return (
    <Button variant={variant} size="lg" onClick={copy} className="gap-1.5 rounded-full px-3.5 text-[13px]" aria-live="polite">
      {copied ? <Check className="pop-in size-3.5 text-ok" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
      <span>{copied ? "Copied" : label}</span>
    </Button>
  );
}

export function PrintExecutivePdfButton({ label = "Print", variant = "outline" }: { label?: string; variant?: "outline" | "signal" } = {}) {
  return (
    <Button
      variant={variant}
      size="lg"
      onClick={() => window.print()}
      className="no-print gap-1.5 rounded-full px-3.5 text-[13px]"
    >
      <Printer className="size-3.5" aria-hidden />
      <span>{label}</span>
    </Button>
  );
}

export function ViewEmployerDeckButton({ evaluationId }: { evaluationId: string }) {
  return (
    <Link
      href={`/report/${evaluationId}/employer`}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-action px-3.5 text-[13px] font-semibold text-[var(--action-ink)] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_-3px_0_rgb(0_0_0/0.22)] transition-[box-shadow,transform] active:translate-y-[2px] hover:shadow-[0_0_20px_rgb(255_107_0/0.4)]"
    >
      <Layers className="size-3.5" aria-hidden />
      <span>Interviewer deck</span>
      <ArrowRight className="size-3" aria-hidden />
    </Link>
  );
}

export function ViewCredentialButton({ evaluationId }: { evaluationId: string }) {
  return (
    <Link
      href={`/report/${evaluationId}/credential`}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-muted"
    >
      <Award className="size-3.5 text-signal" aria-hidden />
      <span>Credential</span>
    </Link>
  );
}


/** Contesting sends the score straight to the mentor queue. */
export function ContestDialog({ evaluationId }: { evaluationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const ok = reason.trim().length >= 10;

  async function submit() {
    if (isSubmittingRef.current || pending || !ok) return;
    isSubmittingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await contestScore(evaluationId, reason);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      isSubmittingRef.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="lg" className="gap-1.5 rounded-full px-3.5 text-[13px]" />}>
        <Gavel className="size-3.5" aria-hidden />
        Contest score
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-title text-lg">Contest score</DialogTitle>
          <DialogDescription className="text-xs">Goes to a human mentor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="contest-reason" className="text-xs font-semibold">What was scored wrongly?</Label>
          <Textarea
            id="contest-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: in turn 5 I identified the counting defect in peopleIn(), but the verification criterion does not reflect this catch."
            className="min-h-28 rounded-xl text-[13px]"
          />
        </div>
        {error && (
          <Alert variant="destructive" className="rounded-xl border-bad/30 bg-bad-soft text-xs">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="gap-2">
          <DialogClose render={<Button variant="ghost" className="rounded-full" />}>Cancel</DialogClose>
          <Button variant="signal" onClick={submit} disabled={!ok || pending} className="gap-1.5 rounded-full px-4">
            {pending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
            Send to mentor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
