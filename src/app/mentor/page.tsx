import { ArrowRight, CircleCheckBig, EyeOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/common/layout";
import { ReasonChip } from "@/components/mentor/reason-chips";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/data";
import type { QueueItemView } from "@/lib/data/types";
import { scoreBand, shortId, timeAgo, TONE_TEXT } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Review queue" };

function ScoreSummary({ item }: { item: QueueItemView }) {
  if (item.coverage === 0) {
    return (
      <div className="text-right">
        <div className="text-lg font-semibold text-muted-foreground">Not scored</div>
        <div className="text-xs text-muted-foreground">needs a human score</div>
      </div>
    );
  }
  const band = scoreBand(item.overallScore);
  return (
    <div className="text-right">
      <div className={cn("tabular text-2xl font-semibold tracking-tight", TONE_TEXT[band.tone])}>{Math.round(item.overallScore)}%</div>
      <div className="text-xs text-muted-foreground">
        {Math.round(item.coverage * 100)}% scored · confidence {item.confidence.toFixed(2)}
      </div>
    </div>
  );
}

export default async function MentorQueuePage() {
  await requireUser("/mentor", "MENTOR");
  const [queue, reviewed] = await Promise.all([data.getQueue(), data.countReviewed()]);

  return (
    <PageShell width="5xl" className="space-y-8">
      <header className="space-y-3">
        <div className="text-xs font-medium tracking-wider text-primary/80 uppercase">Mentor</div>
        <h1 className="text-3xl font-semibold tracking-tight">Review queue</h1>
        <p className="max-w-2xl text-muted-foreground">
          Submissions the AI wasn&apos;t sure about, or that a candidate contested. Confirm the score or override it, with a note the candidate will see.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="secondary" className="tabular">
            {queue.length} waiting
          </Badge>
          <Badge variant="outline" className="tabular">
            {reviewed} reviewed
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <EyeOff className="size-3.5" aria-hidden />
            Reviews are blind: you see transcripts and files, never names.
          </span>
        </div>
      </header>

      {queue.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CircleCheckBig className="size-8 text-emerald-600" aria-hidden />
            <h2 className="font-semibold">The queue is empty</h2>
            <p className="max-w-sm text-sm text-muted-foreground">Nothing needs a human right now. New submissions the AI isn&apos;t sure about, and any contested scores, will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {queue.map((item) => {
            const reasons = item.contested ? [{ code: "CONTESTED" as const, message: "The candidate contested this score." }, ...item.escalation] : item.escalation;
            return (
              <li key={item.id}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-mono text-xs font-medium tracking-wide">#{shortId(item.id)}</span>
                          <span className="text-muted-foreground">submitted {timeAgo(item.createdAt)}</span>
                          {item.source !== "ai" && <Badge variant="outline">{item.source === "demo-offline" ? "demo · no AI" : "demo data"}</Badge>}
                        </div>
                        <h2 className="text-lg leading-snug font-semibold">{item.challengeTitle}</h2>
                        <p className="text-sm text-muted-foreground">{item.roleTitle}</p>
                      </div>
                      <ScoreSummary item={item} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {reasons.map((r, i) => (
                        <ReasonChip key={`${r.code}-${i}`} reason={r} />
                      ))}
                    </div>
                    {reasons[0] && <p className="text-sm leading-relaxed text-muted-foreground">{reasons[0].message}</p>}
                    <div className="flex justify-end">
                      <Link href={`/mentor/${item.id}`} className={buttonVariants({ size: "sm", className: "gap-1.5" })}>
                        Review
                        <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
