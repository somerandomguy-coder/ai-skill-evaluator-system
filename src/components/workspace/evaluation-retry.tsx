"use client";

import { CircleAlert, LoaderCircle, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PageShell } from "@/components/common/layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { submitBuild } from "@/lib/client/api";

/**
 * A session that was submitted but never evaluated (for example the AI service
 * was unavailable). The work is safe; this lets the candidate run the evaluation
 * again. The server-side submit is idempotent, so retrying is always safe.
 */
export function EvaluationRetry({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRetryingRef = useRef(false);

  async function retry() {
    if (isRetryingRef.current || pending) return;
    isRetryingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const { evaluationId } = await submitBuild(sessionId);
      router.push(`/report/${evaluationId}`);
    } catch (e) {
      isRetryingRef.current = false;
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <PageShell width="4xl" className="grid place-items-center py-16">
      <div className="slide-in w-full max-w-lg space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-2xl bg-warn-soft text-warn">
          <RotateCw className="size-5" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-title text-xl">Your work is saved, not yet scored</h1>
          <p className="text-sm text-muted-foreground">The last evaluation didn&apos;t finish. Your transcript and files are safe.</p>
        </div>
        {error && (
          <Alert variant="destructive" className="rounded-xl border-bad/30 bg-bad-soft">
            <CircleAlert aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button variant="signal" size="xl" onClick={retry} disabled={pending} className="w-full sm:w-auto">
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
          {pending ? "Evaluating…" : "Evaluate my work now"}
        </Button>
      </div>
    </PageShell>
  );
}
