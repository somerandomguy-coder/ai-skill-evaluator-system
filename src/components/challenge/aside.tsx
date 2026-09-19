import { AppWindow, ArrowRight, Clock, ExternalLink, EyeOff, Lock, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { ChallengeView, UserView } from "@/lib/data/types";
import { formatTimebox } from "@/lib/format";

import { StartBuildButton } from "./start-button";

const panel = "rounded-2xl border border-border bg-card p-5";

export function StartCard({ challenge, user }: { challenge: ChallengeView; user: UserView | null }) {
  const facts = [
    { icon: Clock, text: `~${formatTimebox(challenge.timeboxMinutes)}` },
    { icon: MessageSquareText, text: "Chat is evidence" },
    { icon: AppWindow, text: "Chrome / Edge" },
  ];
  return (
    <div className={`${panel} space-y-4 shadow-[var(--shadow-lift)] dark:shadow-none`}>
      <h2 className="font-title text-base">Workspace</h2>
      {user?.role === "CANDIDATE" ? (
        <StartBuildButton challengeId={challenge.id} />
      ) : user ? (
        <div className="flex items-center gap-2 rounded-xl bg-muted p-3 text-[13px] text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden />
          Candidates only
        </div>
      ) : (
        <Link href={`/login?next=${encodeURIComponent(`/challenge/${challenge.id}`)}`} className={buttonVariants({ variant: "signal", size: "xl", className: "w-full" })}>
          Sign in to start
          <ArrowRight aria-hidden />
        </Link>
      )}
      <ul className="flex flex-wrap gap-1.5 text-xs">
        {facts.map(({ icon: Icon, text }) => (
          <li key={text} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
            <Icon className="size-3.5" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function JobCard({ challenge }: { challenge: ChallengeView }) {
  const { job } = challenge;
  const shown = job.mustHaveSkills.slice(0, 6);
  const more = job.mustHaveSkills.length - shown.length;
  return (
    <div className={`${panel} space-y-3`}>
      <div>
        <h2 className="text-sm font-semibold">Role skills</h2>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {shown.map((s, idx) => (
          <li key={`${s}-${idx}`} className="rounded-md bg-muted px-2 py-1 text-xs leading-snug">
            {s}
          </li>
        ))}
        {more > 0 && <li className="px-1 py-1 text-xs text-muted-foreground">+{more} more</li>}
      </ul>
      {job.sourceUrl && (
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-signal-ink underline-offset-2 hover:underline"
        >
          Original posting
          <ExternalLink className="size-3" aria-hidden />
        </a>
      )}
    </div>
  );
}

export function NotAssessedCard({ challenge }: { challenge: ChallengeView }) {
  const barriers = challenge.job.barriers;
  return (
    <div className={`${panel} space-y-3`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <EyeOff className="size-4 text-muted-foreground" aria-hidden />
        Never scored
      </h2>
      <ul className="flex flex-wrap gap-1.5 text-xs">
        {["Grammar & fluency", "Writing style", "Name & CV", "Nationality"].map((t) => (
          <li key={t} className="rounded-full border border-border px-2.5 py-1 text-muted-foreground line-through decoration-foreground/30">
            {t}
          </li>
        ))}
      </ul>
      {barriers.length > 0 && (
        <details className="group/barriers border-t border-border pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] [&::-webkit-details-marker]:hidden">
            <span className="font-medium">Filtered from posting</span>
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">{barriers.length}</span>
          </summary>
          <ul className="slide-in mt-3 space-y-2">
            {barriers.map((b, idx) => (
              <li key={`${b.text}-${idx}`} className="rounded-lg bg-muted/70 p-2.5 text-[13px]">
                <p className="line-clamp-2 text-foreground/85">&ldquo;{b.text}&rdquo;</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
