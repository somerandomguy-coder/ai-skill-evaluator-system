"use client";

import { Check, CircleAlert, LoaderCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PHASES = [
  "Taking a snapshot of your files",
  "Scoring each requirement against the transcript and files",
  "Checking that every citation is really in your session",
  "Deciding whether a mentor should look too",
];

/**
 * Submit: confirms, then narrates the evaluation. The work happens in one server
 * request, so the steps advance on a timer; the order is the real order.
 */
export function SubmitDialog({
  turnCount,
  fileCount,
  disabled,
  onSubmit,
}: {
  turnCount: number;
  fileCount: number;
  disabled: boolean;
  onSubmit: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"confirm" | "running" | "error">("confirm");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, PHASES.length - 1)), 6000);
    return () => clearInterval(id);
  }, [phase]);

  async function go() {
    setPhase("running");
    setStep(0);
    setError(null);
    try {
      await onSubmit(); // navigates to the report on success
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while submitting.");
      setPhase("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (phase === "running") return; // don't dismiss mid-evaluation
        setOpen(next);
        if (!next) setPhase("confirm");
      }}
    >
      <DialogTrigger render={<Button size="sm" className="gap-1.5" disabled={disabled} />}>
        <Send className="size-3.5" aria-hidden />
        Submit
      </DialogTrigger>
      <DialogContent showCloseButton={phase !== "running"}>
        {phase === "running" ? (
          <>
            <DialogHeader>
              <DialogTitle>Evaluating your work</DialogTitle>
              <DialogDescription>This usually takes under a minute. Please keep this tab open.</DialogDescription>
            </DialogHeader>
            <ol className="space-y-3 py-1" aria-live="polite">
              {PHASES.map((label, i) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  {i < step ? (
                    <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  ) : i === step ? (
                    <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden />
                  ) : (
                    <span className="size-5 rounded-full border-2 border-dashed border-foreground/20" aria-hidden />
                  )}
                  <span className={cn(i > step && "text-muted-foreground")}>{label}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Submit your work?</DialogTitle>
              <DialogDescription>
                We&apos;ll snapshot your files and score your session against the rubric you saw at the start. You can&apos;t keep building after this.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-sm">
              <li className="flex justify-between gap-4">
                <span className="text-muted-foreground">Messages you sent</span>
                <span className="tabular font-medium">{turnCount}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="text-muted-foreground">Files in your project</span>
                <span className="tabular font-medium">{fileCount}</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Scores cite the exact turn or file they&apos;re based on. If the AI isn&apos;t confident, a human mentor checks the result.
            </p>
            {phase === "error" && error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{error} Your work is safe. You can try again.</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Keep building</DialogClose>
              <Button onClick={go} className="gap-1.5">
                <Send className="size-4" aria-hidden />
                {phase === "error" ? "Try again" : "Submit and get my report"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
