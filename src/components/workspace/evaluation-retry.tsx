"use client";

import { CircleAlert, LoaderCircle, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/common/layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  async function retry() {
    setPending(true);
    setError(null);
    try {
      const { evaluationId } = await submitBuild(sessionId);
      router.push(`/report/${evaluationId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <PageShell width="4xl">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Your work is saved, but it hasn&apos;t been evaluated yet</CardTitle>
          <CardDescription>The evaluation didn&apos;t finish last time. Nothing was lost: your transcript and files were captured when you submitted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={retry} disabled={pending} className="gap-2">
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <RotateCw className="size-4" aria-hidden />}
            {pending ? "Evaluating…" : "Evaluate my work now"}
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}
