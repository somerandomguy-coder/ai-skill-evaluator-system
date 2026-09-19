"use client";

import { Check, Gavel, Link2, LoaderCircle, Printer, Award, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contestScore } from "@/lib/client/api";

export function CopyLinkButton({ url, label = "Share Report (Public Link)" }: { url?: string; label?: string }) {
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
    <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 font-mono text-xs rounded border-border hover:bg-surface-container">
      {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
      <span>{copied ? "Link copied to clipboard" : label}</span>
    </Button>
  );
}

export function PrintExecutivePdfButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="gap-1.5 font-mono text-xs rounded border-border hover:bg-surface-container no-print"
    >
      <Printer className="size-3.5" aria-hidden />
      <span>Print Executive PDF</span>
    </Button>
  );
}

export function ViewEmployerDeckButton({ evaluationId }: { evaluationId: string }) {
  return (
    <Link
      href={`/report/${evaluationId}/employer`}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary text-white hover:bg-primary/90 text-xs font-mono font-semibold transition-colors"
    >
      <Layers className="size-3.5" aria-hidden />
      <span>Share to Employer (Card Deck)</span>
      <ArrowRight className="size-3" aria-hidden />
    </Link>
  );
}

export function ViewCredentialButton({ evaluationId }: { evaluationId: string }) {
  return (
    <Link
      href={`/report/${evaluationId}/credential`}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-foreground text-xs font-mono font-medium border border-border transition-colors"
    >
      <Award className="size-3.5" aria-hidden />
      <span>Credential Dossier</span>
      <ArrowRight className="size-3" aria-hidden />
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
  const ok = reason.trim().length >= 10;

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await contestScore(evaluationId, reason);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5 font-mono text-xs rounded border-border hover:bg-surface-container text-foreground" />}>
        <Gavel className="size-3.5" aria-hidden />
        Contest Score / Secondary Audit
      </DialogTrigger>
      <DialogContent className="rounded border-border bg-surface-container-lowest">
        <DialogHeader>
          <DialogTitle className="font-bold text-primary">Contest this score</DialogTitle>
          <DialogDescription className="text-xs">
            This routes your submission straight to a senior human mentor with a 2-3 business day turnaround. The mentor inspects your full transcript, code files, and AI reasoning to confirm or adjust scores.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="contest-reason" className="text-xs font-semibold">What requirement or criterion was scored wrongly?</Label>
          <Textarea
            id="contest-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: in turn 5 I identified the counting defect in peopleIn(), but the verification criterion does not reflect this catch."
            className="min-h-28 text-xs font-mono rounded border-border"
          />
          <p className="text-[11px] text-muted-foreground">Any phrasing is fine. Only the substance and evidence citations are evaluated.</p>
        </div>
        {error && (
          <Alert variant="destructive" className="rounded text-xs">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="gap-2">
          <DialogClose render={<Button variant="ghost" size="sm" className="rounded text-xs" />}>Cancel</DialogClose>
          <Button onClick={submit} disabled={!ok || pending} size="sm" className="gap-1.5 rounded bg-primary text-white hover:bg-primary/90 text-xs">
            {pending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
            Submit for Mentor Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
