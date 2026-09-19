import { ArrowRight, BadgeCheck, CircleAlert, CircleCheck, Eye, Hourglass, TriangleAlert } from "lucide-react";
import { CategoryBadge } from "@/components/common/category";
import { SectionTitle } from "@/components/common/layout";
import { ScoreRing } from "@/components/common/score";
import { EvidenceExplorer } from "@/components/evidence/explorer";
import { EvidenceProvider } from "@/components/evidence/evidence-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_META, REQUIREMENT_CATEGORIES } from "@/lib/ai/schemas";
import type { EvaluationSource, EvaluationView, UserView } from "@/lib/data/types";
import { formatMinutes, formatTimebox, scoreBand, timeAgo } from "@/lib/format";
import { PASS_BOUNDARY } from "@/lib/constants";
import { ContestDialog, CopyLinkButton } from "./actions";
import { RequirementResultCard } from "./requirement-result";

const SOURCE_LABEL: Record<EvaluationSource, string> = {
  ai: "Scored by the AI evaluator",
  "demo-cache": "Pre-computed demo evaluation",
  "demo-offline": "No AI evaluator ran (demo mode)",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className="tabular mt-1 text-xl font-semibold tracking-tight">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatusBanner({ ev, isOwner }: { ev: EvaluationView; isOwner: boolean }) {
  const review = ev.reviews[0];
  if (ev.reviewStatus === "PENDING") {
    return (
      <Alert className="border-amber-300 bg-amber-50 text-amber-950 *:data-[slot=alert-description]:text-amber-900/90">
        <Hourglass aria-hidden />
        <AlertTitle>{ev.contested ? "A mentor is reviewing your contest" : "A mentor will confirm this result"}</AlertTitle>
        <AlertDescription>
          <p>
            {ev.contested
              ? "The score below is provisional until a human decides."
              : "The AI wasn't sure enough to leave this score unchecked, so a human mentor reviews it first. The score below is provisional."}
          </p>
          {ev.escalation.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4">
              {ev.escalation.map((r, i) => (
                <li key={i}>{r.message}</li>
              ))}
            </ul>
          )}
          {isOwner && ev.contested && ev.contestReason && <p className="mt-2 italic">Your note: &ldquo;{ev.contestReason}&rdquo;</p>}
        </AlertDescription>
      </Alert>
    );
  }
  if (ev.reviewStatus === "REVIEWED" && review) {
    return (
      <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950 *:data-[slot=alert-description]:text-emerald-900/90">
        <BadgeCheck aria-hidden />
        <AlertTitle>Reviewed by a mentor</AlertTitle>
        <AlertDescription>
          {review.verdict === "OVERRIDE"
            ? `The mentor adjusted the score from ${Math.round(ev.overallScore)}% to ${Math.round(review.adjustedScore ?? ev.overallScore)}%. Their notes are below.`
            : "The mentor checked the evidence and confirmed the AI's score. Their notes are below."}
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

export function ReportView({ evaluation: ev, viewer }: { evaluation: EvaluationView; viewer: UserView | null }) {
  const isOwner = viewer?.id === ev.ownerId;
  const band = scoreBand(ev.effective.score);
  const unscored = ev.coverage === 0 && ev.effective.basis === "ai";
  const override = ev.effective.basis === "mentor-override";
  const groups = REQUIREMENT_CATEGORIES.map((category) => ({ category, items: ev.results.filter((r) => r.requirement.category === category) })).filter((g) => g.items.length);

  return (
    <EvidenceProvider>
      <div className="space-y-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <Eye className="size-3.5" aria-hidden />
                Read-only report
              </Badge>
              <Badge variant="outline" className={ev.source === "ai" ? "" : "border-amber-300 bg-amber-50 text-amber-800"}>
                {SOURCE_LABEL[ev.source]}
              </Badge>
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{ev.challenge.title}</h1>
            <p className="text-sm text-muted-foreground">
              {ev.job.roleTitle} at {ev.job.employer} · assessed {timeAgo(ev.createdAt)} · session {formatMinutes(ev.durationMinutes)} of about {formatTimebox(ev.challenge.timeboxMinutes)}
            </p>
          </div>
          <CopyLinkButton />
        </header>

        <StatusBanner ev={ev} isOwner={isOwner} />

        {ev.source === "demo-offline" && (
          <Alert>
            <CircleAlert aria-hidden />
            <AlertTitle>No AI evaluation in demo mode</AlertTitle>
            <AlertDescription>
              Demo mode makes no live AI calls, so nothing was scored automatically. Rather than invent a judgment, every requirement is left for a human mentor to score.
            </AlertDescription>
          </Alert>
        )}

        {/* Score */}
        <Card>
          <CardContent className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-12">
            {unscored ? (
              <div className="grid size-44 shrink-0 place-items-center rounded-full border-[12px] border-dashed border-muted text-center">
                <div>
                  <div className="text-lg font-semibold text-muted-foreground">Not scored</div>
                  <div className="text-xs text-muted-foreground">awaiting a mentor</div>
                </div>
              </div>
            ) : (
              <ScoreRing score={ev.effective.score} />
            )}
            <div className="space-y-6">
              <div>
                <div className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Overall</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{unscored ? "Waiting for a human decision" : band.label}</h2>
                <p className="mt-1 max-w-lg text-muted-foreground">
                  {unscored ? "There was nothing the automated evaluation could honestly score." : band.blurb}
                </p>
              </div>
              {override && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="text-muted-foreground">AI score</span>
                  <span className="tabular font-semibold">{Math.round(ev.overallScore)}%</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                  <span className="text-muted-foreground">Mentor-adjusted</span>
                  <span className="tabular font-semibold">{Math.round(ev.effective.score)}%</span>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Stat label="Coverage" value={`${Math.round(ev.coverage * 100)}%`} hint="of the rubric's weight was scored" />
                <Stat label="Confidence" value={ev.confidence.toFixed(2)} hint="weighted, 0 to 1" />
                <Stat label="Pass boundary" value={`${PASS_BOUNDARY}%`} hint="the tick on the ring" />
                <Stat label="Rubric" value={ev.challenge.rubricVersion.replace("rubric-", "")} hint="scores are auditable" />
              </dl>
            </div>
          </CardContent>
        </Card>

        {/* Strengths & gaps */}
        {(ev.strengths.length > 0 || ev.gaps.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CircleCheck className="size-4.5 text-emerald-600" aria-hidden />
                  What went well
                </CardTitle>
                <CardDescription>About decisions and reasoning, never style.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm leading-relaxed">
                  {ev.strengths.map((s) => (
                    <li key={s} className="flex gap-2.5">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TriangleAlert className="size-4.5 text-amber-600" aria-hidden />
                  Where the evidence is thin
                </CardTitle>
                <CardDescription>Room to grow, or things the session didn&apos;t show.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm leading-relaxed">
                  {ev.gaps.map((s) => (
                    <li key={s} className="flex gap-2.5">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Breakdown */}
        <section id="breakdown" className="space-y-6">
          <SectionTitle
            eyebrow="Requirement by requirement"
            title="Every score, with its evidence"
            description="Each score cites the turn or file it comes from, with the exact words quoted. Click a citation to see it in place. The rubric it was scored against sits under each one."
          />
          <div className="space-y-9">
            {groups.map(({ category, items }) => (
              <section key={category} className="space-y-3">
                <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <CategoryBadge category={category} className="text-sm" />
                  <span className="text-sm text-muted-foreground">{CATEGORY_META[category].question}</span>
                </header>
                {items.map((r) => (
                  <RequirementResultCard key={r.requirementId} result={r} showCategory={false} />
                ))}
              </section>
            ))}
          </div>
        </section>

        {/* Mentor notes */}
        {ev.reviews.length > 0 && (
          <section id="mentor-notes" className="space-y-4">
            <SectionTitle eyebrow="Human review" title="Mentor notes" />
            {ev.reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={r.verdict === "OVERRIDE" ? "default" : "secondary"}>{r.verdict === "OVERRIDE" ? "Adjusted the score" : "Confirmed the AI score"}</Badge>
                    {r.adjustedScore !== null && <span className="tabular font-medium">{Math.round(r.adjustedScore)}%</span>}
                    <span className="text-muted-foreground">· {timeAgo(r.reviewedAt)}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap text-foreground/85">{r.comments}</p>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* Contest */}
        {isOwner && (
          <Card className="border-dashed">
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-xl space-y-1">
                <h2 className="font-semibold">{ev.contested && ev.reviewStatus === "PENDING" ? "You've contested this score" : "Think this score is wrong?"}</h2>
                <p className="text-sm text-muted-foreground">
                  {ev.contested && ev.reviewStatus === "PENDING"
                    ? "A mentor will look at your transcript and files and decide. You'll see their decision here."
                    : "Send it to a human mentor. It goes straight to the queue and doesn't depend on the AI's confidence."}
                </p>
              </div>
              {!(ev.contested && ev.reviewStatus === "PENDING") && <ContestDialog evaluationId={ev.id} />}
            </CardContent>
          </Card>
        )}

        {/* Evidence */}
        <section id="evidence" className="space-y-4">
          <SectionTitle eyebrow="The evidence" title="The session, as captured" description="The full transcript and final files. Nothing is edited or summarised." />
          <EvidenceExplorer turns={ev.turns} files={ev.files} />
        </section>
      </div>
    </EvidenceProvider>
  );
}
