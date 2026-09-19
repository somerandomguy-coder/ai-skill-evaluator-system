"use client";

import { Check, Gavel, Link2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contestScore } from "@/lib/client/api";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-1.5">
      {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
      {copied ? "Link copied" : "Copy shareable link"}
    </Button>
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
      <DialogTrigger render={<Button variant="outline" className="gap-1.5" />}>
        <Gavel className="size-4" aria-hidden />
        Contest this score
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contest this score</DialogTitle>
          <DialogDescription>
            This goes straight to a human mentor, who sees your transcript, your files and the AI&apos;s reasoning, and can confirm or change the score. You will see their decision on this page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="contest-reason">What do you think was scored wrongly?</Label>
          <Textarea
            id="contest-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: in turn 5 I caught the off-by-one error, but the critical-judgment requirement doesn't reflect it."
            className="min-h-28"
          />
          <p className="text-xs text-muted-foreground">Any phrasing is fine. Only the substance is read.</p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button onClick={submit} disabled={!ok || pending} className="gap-1.5">
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Send to a mentor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
