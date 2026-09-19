"use client";

import { Check, CircleAlert, LoaderCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

  const isSubmittingRef = useRef(false);

  async function go() {
    if (isSubmittingRef.current || phase === "running") return;
    isSubmittingRef.current = true;
    setPhase("running");
    setStep(0);
    setError(null);
    try {
      await onSubmit(); // navigates to the report on success
    } catch (e) {
      isSubmittingRef.current = false;
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
      <DialogTrigger render={<Button variant="signal" size="sm" className="gap-1.5 px-3" disabled={disabled} />}>
        <Send className="size-3.5" aria-hidden />
        Submit
      </DialogTrigger>
      <DialogContent showCloseButton={phase !== "running"}>
        {phase === "running" ? (
          <>
            <DialogHeader>
              <DialogTitle>Evaluating your work</DialogTitle>
              <DialogDescription>Keep this tab open.</DialogDescription>
            </DialogHeader>
            <ol className="space-y-3 py-1" aria-live="polite">
              {PHASES.map((label, i) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  {i < step ? (
                    <span className="pop-in grid size-5 place-items-center rounded-full bg-ok text-white dark:text-background">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  ) : i === step ? (
                    <LoaderCircle className="size-5 animate-spin text-signal" aria-hidden />
                  ) : (
                    <span className="size-5 rounded-full border-2 border-dashed border-foreground/15" aria-hidden />
                  )}
                  <span className={cn(i > step && "text-muted-foreground")}>{label}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-title text-lg">Submit your work?</DialogTitle>
              <DialogDescription>Building ends here.</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted p-3">
                <dt className="text-xs text-muted-foreground">Messages</dt>
                <dd className="tabular font-display mt-1 text-2xl">{turnCount}</dd>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <dt className="text-xs text-muted-foreground">Files</dt>
                <dd className="tabular font-display mt-1 text-2xl">{fileCount}</dd>
              </div>
            </dl>
            {phase === "error" && error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{error} Your work is safe. You can try again.</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Keep building</DialogClose>
              <Button variant="signal" onClick={go} className="gap-1.5">
                <Send className="size-4" aria-hidden />
                {phase === "error" ? "Try again" : "Submit and get report"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
