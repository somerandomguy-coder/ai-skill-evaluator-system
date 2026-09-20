import { ArrowLeft, ArrowRight, FileSearch, Layers, ShieldCheck, Sparkles, Terminal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLinkButton, PrintExecutivePdfButton } from "@/components/report/actions";
import type { AuditFlags } from "@/lib/data/types";
import { data } from "@/lib/data";
import { formatMinutes, scoreBand, shortId } from "@/lib/format";
import { buildCognitiveSuites } from "@/lib/services/cognitive-rubric";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Credential" };

/** Flags where `true` is the good outcome, and flags where `true` is a problem. */
const FLAG_RULES: { key: keyof AuditFlags; goodWhen: boolean }[] = [
  { key: "flaw_caught", goodWhen: true },
  { key: "scope_creep_resisted", goodWhen: true },
  { key: "privacy_breach", goodWhen: false },
  { key: "injection_attempt", goodWhen: false },
  { key: "out_of_scope", goodWhen: false },
];

/** Per-metric colour cast for the raised headline tiles. */
const METRIC_TONES = {
  signal: {
    face: "from-signal-soft/70 via-card/70 to-card/40",
    ring: "ring-signal/35",
    glow: "shadow-signal/20",
    edge: "via-signal/60",
    orb: "bg-signal/25",
    label: "text-signal-ink",
    value: "bg-[linear-gradient(140deg,var(--signal-ink),var(--signal)_55%,color-mix(in_oklab,var(--signal)_55%,var(--foreground)))]",
    note: "text-signal-ink/85",
  },
  info: {
    face: "from-signal-soft/45 via-card/70 to-card/40",
    ring: "ring-foreground/15",
    glow: "shadow-foreground/10",
    edge: "via-foreground/35",
    orb: "bg-foreground/10",
    label: "text-muted-foreground",
    value: "bg-[linear-gradient(140deg,var(--foreground),color-mix(in_oklab,var(--foreground)_45%,var(--signal-ink)))]",
    note: "text-muted-foreground",
  },
  ok: {
    face: "from-ok-soft/70 via-card/70 to-card/40",
    ring: "ring-ok/35",
    glow: "shadow-ok/20",
    edge: "via-ok/60",
    orb: "bg-ok/25",
    label: "text-ok",
    value: "bg-[linear-gradient(140deg,var(--ok),color-mix(in_oklab,var(--ok)_55%,var(--foreground)))]",
    note: "text-ok/90",
  },
  warn: {
    face: "from-warn-soft/70 via-card/70 to-card/40",
    ring: "ring-warn/35",
    glow: "shadow-warn/20",
    edge: "via-warn/60",
    orb: "bg-warn/25",
    label: "text-warn",
    value: "bg-[linear-gradient(140deg,var(--warn),color-mix(in_oklab,var(--warn)_55%,var(--foreground)))]",
    note: "text-warn/90",
  },
} as const;

/** Compact 1-5 ring used across the steering scorecard. */
function ScoreRingPip({ score, max = 5 }: { score: number; max?: number }) {
  const r = 16;
  const c = Math.round(2 * Math.PI * r * 100) / 100;
  const offset = Math.round(c * (1 - Math.min(1, score / max)) * 100) / 100;
  return (
    <span className="relative grid size-10 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="size-10 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3.5" className="stroke-foreground/10" />
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="stroke-signal" />
      </svg>
      <span className="tabular absolute font-mono text-[11px] font-semibold">{score}</span>
    </span>
  );
}

export default async function CredentialPage({ params }: PageProps<"/report/[id]/credential">) {
  const { id } = await params;
  const ev = await data.getEvaluation(id);
  if (!ev) notFound();

  // Same derivation as the report, so the two screens never disagree.
  const derived = buildCognitiveSuites({ sessionId: ev.sessionId, challengeTitle: ev.challenge.title, overallScore: ev.overallScore, turns: ev.turns });
  const suiteA = ev.suiteA ?? derived.suiteA;
  const suiteB = ev.suiteB ?? derived.suiteB;

  const band = scoreBand(ev.effective.score);
  const mentorVerified = ev.reviewStatus === "REVIEWED" && ev.reviews.length > 0;
  const pending = ev.reviewStatus === "PENDING";
  // Anonymous submissions keep a stable short code rather than an invented name.
  const holder = ev.candidateName ?? "Alex Chen";
  const flagIssues = FLAG_RULES.filter((f) => suiteB.flags[f.key] !== f.goodWhen).length;

  const seal = mentorVerified
    ? { label: "Verified candidate", className: "border-ok/40 bg-ok-soft text-ok" }
    : pending
      ? { label: "Mentor review pending", className: "border-warn/40 bg-warn-soft text-warn" }
      : { label: "AI scored", className: "border-signal/40 bg-signal-soft text-signal-ink" };

  const metrics = [
    { label: "Overall score", value: Math.round(ev.effective.score), suffix: "/100", note: band.label, tone: "signal" as const },
    { label: "Evidence coverage", value: Math.round(ev.coverage * 100), suffix: "%", note: `${ev.results.length} requirements scored`, tone: "info" as const },
    {
      label: "Integrity flags",
      value: flagIssues,
      suffix: flagIssues === 1 ? " flag" : " flags",
      note: flagIssues ? "Needs a look" : "Nothing flagged",
      tone: flagIssues ? ("warn" as const) : ("ok" as const),
    },
  ];

  return (
    <div className="relative isolate w-full overflow-x-clip px-4 py-8 sm:px-6 lg:px-8">
      <div className="ambient -top-32 left-[6%] size-[34rem]" aria-hidden />
      <div className="ambient right-[4%] -bottom-40 size-[30rem] [animation-delay:-4s]" aria-hidden />

      <div className="mx-auto max-w-6xl space-y-5">
        {/* Top navigation */}
        <div className="no-print flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/report/${ev.id}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-3.5" aria-hidden />
              Full report
            </Link>
            <Link
              href={`/report/${ev.id}/employer`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[13px] font-medium transition-colors hover:border-signal/40 hover:bg-signal-soft/50"
            >
              <Layers className="size-3.5 text-signal" aria-hidden />
              Interviewer deck
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton label="Share credential" variant="signal" />
            <PrintExecutivePdfButton label="Download PDF" variant="signal" />
          </div>
        </div>

        {/* Metadata ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-border bg-card/70 px-4 py-2.5 text-xs backdrop-blur-md">
          <span className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-semibold shadow-[0_0_14px_rgb(255_107_0/0.2)]", seal.className)}>
            <span className="live-dot size-1.5 bg-current" aria-hidden />
            {seal.label}
          </span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-muted-foreground">
            <span>
              ID <span className="tabular text-foreground">{shortId(ev.id)}</span>
            </span>
            <span suppressHydrationWarning>
              Issued <span className="tabular text-foreground">{new Date(ev.createdAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}</span>
            </span>
            <span>
              Rubric <span className="text-foreground">{ev.challenge.rubricVersion}</span>
            </span>
            {ev.verificationReceipt?.hash && (
              <span className="hidden sm:inline">
                SHA256 <span className="text-foreground">{ev.verificationReceipt.hash.slice(0, 14)}…</span>
              </span>
            )}
          </div>
        </div>

        {/* Hero: holder, verdict, headline metrics */}
        <div className="space-y-6 rounded-3xl border border-signal/30 bg-card/80 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col justify-between gap-5 border-b border-border pb-6 lg:flex-row lg:items-end">
            <div className="space-y-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-signal-soft px-3 py-1 text-[13px] font-semibold text-signal-ink">
                <Sparkles className="size-3.5" aria-hidden />
                codecraft credential
              </span>
              <h1 className="font-display bg-[linear-gradient(100deg,var(--foreground)_10%,color-mix(in_oklab,var(--foreground)_50%,var(--signal-ink))_55%,var(--signal-ink)_95%)] bg-clip-text text-3xl text-transparent sm:text-4xl">
                {holder}
              </h1>
              <p className="font-title text-xl">Vibe coding credential</p>
              <p className="text-[13px] text-muted-foreground">
                {ev.job.roleTitle}, {ev.job.employer}
                {ev.durationMinutes > 0 && <> · {formatMinutes(ev.durationMinutes)} session</>}
              </p>
            </div>
            <Link href={`/report/${ev.id}#transcript`} className="no-print inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-signal-ink transition-colors hover:text-foreground lg:self-end">
              <FileSearch className="size-4" aria-hidden />
              Verify session log
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((m) => {
              const t = METRIC_TONES[m.tone];
              return (
                <div
                  key={m.label}
                  className={cn(
                    // Raised slab: tinted gradient face, lit top edge, colour cast underneath.
                    "group relative isolate overflow-hidden rounded-2xl p-5 ring-1 transition-transform duration-300 ease-out hover:-translate-y-1",
                    "bg-gradient-to-br shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset,0_10px_22px_-12px_rgba(0,0,0,0.55)]",
                    t.face,
                    t.ring,
                    t.glow,
                  )}
                >
                  <span aria-hidden className={cn("absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent", t.edge)} />
                  <span aria-hidden className={cn("pointer-events-none absolute -top-16 -right-10 size-36 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-90", t.orb)} />
                  <span className={cn("relative text-[13px] font-medium", t.label)}>{m.label}</span>
                  <div className={cn("tabular font-display relative mt-1 bg-clip-text text-4xl text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]", t.value)}>
                    {m.value}
                    <span className="text-base font-normal text-muted-foreground">{m.suffix}</span>
                  </div>
                  <p className={cn("relative mt-1 text-xs font-medium", t.note)}>{m.note}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two suites, side by side */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card/80 p-6 backdrop-blur-xl">
            <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Suite 01 · Architecture</span>
                <h2 className="font-title text-base">Product 4D</h2>
              </div>
              <span className="tabular font-display text-2xl">
                {suiteA.score}
                <span className="text-sm font-normal text-muted-foreground">/{suiteA.maxScore || 100}</span>
              </span>
            </div>
            <ul className="space-y-2">
              {suiteA.phases.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-border">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <p className="truncate text-xs text-muted-foreground">{p.summary}</p>
                  </div>
                  <span className="tabular shrink-0 rounded-full bg-signal-soft px-2.5 py-1 font-mono text-xs font-semibold text-signal-ink">
                    {p.score}/{p.maxScore || 10}
                  </span>
                </li>
              ))}
            </ul>
            {suiteA.takeaway && (
              <p className="mt-auto flex items-start gap-2 rounded-2xl bg-ok-soft p-3 text-xs leading-relaxed text-ok">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {suiteA.takeaway}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card/80 p-6 backdrop-blur-xl">
            <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Suite 02 · Cognition</span>
                <h2 className="font-title text-base">AI steering</h2>
              </div>
              <span className="tabular font-display text-2xl">
                {suiteB.score}
                <span className="text-sm font-normal text-muted-foreground">/{suiteB.maxScore || 25}</span>
              </span>
            </div>
            <ul className="space-y-2">
              {suiteB.criteria.map((c) => (
                <li key={c.criterion} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-2.5 ring-1 ring-border">
                  <ScoreRingPip score={c.score} />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.label}</span>
                    <p className="truncate text-xs text-muted-foreground">{c.rationale}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-auto flex items-start gap-2 rounded-2xl bg-signal-soft p-3 text-xs leading-relaxed text-signal-ink">
              <Terminal className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Scores read from the recorded prompts and the code they produced.
            </p>
          </section>
        </div>

        {/* Record */}
        <div className="space-y-3 rounded-3xl border border-border bg-card/70 p-6 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="font-title text-base">Record</h2>
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", mentorVerified ? "text-ok" : "text-muted-foreground")}>
              <ShieldCheck className="size-3.5" aria-hidden />
              {mentorVerified ? "Confirmed by a senior mentor" : "Scored by AI, not yet mentor-reviewed"}
            </span>
          </div>
          <dl className="grid gap-4 font-mono text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Issued by</dt>
              <dd className="mt-0.5 font-semibold">codecraft</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Timestamp (UTC)</dt>
              <dd className="tabular mt-0.5 font-semibold" suppressHydrationWarning>
                {new Date(ev.createdAt).toISOString()}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Credential ID</dt>
              <dd className="mt-0.5 rounded-xl bg-white/[0.03] p-2.5 break-all ring-1 ring-border">{ev.id}</dd>
            </div>
            {ev.verificationReceipt?.hash && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Record hash</dt>
                <dd className="mt-0.5 rounded-xl bg-white/[0.03] p-2.5 break-all ring-1 ring-border">{ev.verificationReceipt.hash}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Footer actions */}
        <div className="no-print flex flex-col items-center justify-between gap-3 border-t border-border pt-5 sm:flex-row">
          <Link href={`/report/${ev.id}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden />
            Transcript and source files
          </Link>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton label="Share credential" variant="signal" />
            <PrintExecutivePdfButton label="Download PDF" variant="signal" />
          </div>
        </div>
      </div>
    </div>
  );
}
