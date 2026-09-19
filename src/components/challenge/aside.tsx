import { ArrowRight, Clock, EyeOff, Info, Lock, Play } from "lucide-react";
import Link from "next/link";
import { startBuild } from "@/app/actions/build";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChallengeView, UserView } from "@/lib/data/types";
import { formatTimebox } from "@/lib/format";

import { StartBuildButton } from "./start-button";

export function StartCard({ challenge, user }: { challenge: ChallengeView; user: UserView | null }) {
  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Ready when you are</CardTitle>
        <CardDescription>Your workspace opens with a chat on the left and a live preview on the right.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user?.role === "CANDIDATE" ? (
          <form action={startBuild.bind(null, challenge.id)}>
            <StartBuildButton />
          </form>
        ) : user ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            Mentor accounts review submissions; they cannot start builds. Switch to a candidate account from the header.
          </div>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(`/challenge/${challenge.id}`)}`} className={buttonVariants({ size: "lg", className: "w-full gap-2" })}>
            Sign in to start
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              About <b className="font-medium text-foreground">{formatTimebox(challenge.timeboxMinutes)}</b>. A guide, not a hard stop.
            </span>
          </li>
          <li className="flex gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Everything you type is recorded. That transcript is what we score, so think out loud.</span>
          </li>
          <li className="flex gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Works best in Chrome or Edge.</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function JobCard({ challenge }: { challenge: ChallengeView }) {
  const { job } = challenge;
  const shown = job.mustHaveSkills.slice(0, 5);
  const more = job.mustHaveSkills.length - shown.length;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Built from this role</CardTitle>
        <CardDescription>
          {job.roleTitle} · {job.employer}
          {job.location ? ` · ${job.location}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1.5 text-sm text-foreground/80">
          {shown.map((s, idx) => (
            <li key={`${s}-${idx}`} className="leading-snug">
              {s}
            </li>
          ))}
          {more > 0 && <li className="text-muted-foreground">+ {more} more must-have skills</li>}
        </ul>
        {job.sourceUrl && (
          <a href={job.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex text-sm font-medium text-primary underline underline-offset-2">
            View the original posting
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export function NotAssessedCard({ challenge }: { challenge: ChallengeView }) {
  const barriers = challenge.job.barriers;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <EyeOff className="size-4 text-muted-foreground" aria-hidden />
          Not part of your score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ul className="space-y-1.5 text-foreground/80">
          <li>English fluency, grammar, spelling or writing style</li>
          <li>Your name, CV, nationality or background. The evaluator never sees them.</li>
        </ul>
        {barriers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">From the posting</span>
              <Badge variant="secondary">{barriers.length} excluded</Badge>
            </div>
            <p className="text-xs text-muted-foreground">These filter people rather than measure ability, so they are kept out of the rubric.</p>
            <ul className="space-y-2.5">
              {barriers.map((b, idx) => (
                <li key={`${b.text}-${idx}`} className="rounded-lg bg-muted/60 p-2.5">
                  <p className="text-foreground/80 line-clamp-2">&ldquo;{b.text}&rdquo;</p>
                  <p className="mt-1 text-xs text-muted-foreground">{b.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
