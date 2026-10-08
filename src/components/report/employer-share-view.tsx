import type { EmployerReportDto } from "@/lib/data/employer-dto";

/**
 * The share-link view intentionally accepts only EmployerReportDto. Keeping it
 * separate from EmployerDeck prevents transcripts, files, and AI reasoning
 * from crossing a React Server Component boundary for anonymous visitors.
 */
export function EmployerShareView({ report }: { report: EmployerReportDto }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-12 sm:px-8">
      <section className="w-full space-y-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <header className="space-y-3 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal-ink">ProofCraft employer dossier</p>
          <h1 className="font-display text-3xl sm:text-4xl">{report.candidateName ?? "Candidate"}</h1>
          <p className="text-muted-foreground">{report.roleTitle} · {report.employer}</p>
          <p className="max-w-2xl text-sm text-muted-foreground">This shared view contains an assessment summary only. It does not disclose the candidate’s transcript, workspace files, private comments, or model reasoning.</p>
        </header>

        <dl className="grid gap-4 sm:grid-cols-3">
          <Metric label="Assessment score" value={`${Math.round(report.effectiveScore)}/100`} />
          <Metric label="Evidence coverage" value={`${Math.round(report.coverage * 100)}%`} />
          <Metric label="Assessment confidence" value={`${Math.round(report.confidence * 100)}%`} />
        </dl>

        <div className="grid gap-6 lg:grid-cols-2">
          <InsightList title="Observed strengths" items={report.strengths} empty="No strengths were recorded." />
          <InsightList title="Development areas" items={report.gaps} empty="No development areas were recorded." />
        </div>

        <section className="space-y-3">
          <h2 className="font-title text-lg">Rubric coverage</h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            {report.publicEvidence.map((item) => (
              <div key={item.requirementId} className="grid gap-2 border-b border-border p-4 last:border-b-0 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
                <span className="text-xs font-semibold text-muted-foreground">{item.category.replaceAll("_", " ")}</span>
                <span className="text-sm">{item.statement}</span>
                <span className="w-fit rounded-full bg-signal-soft px-2.5 py-1 font-mono text-xs font-semibold text-signal-ink">
                  {item.score === null ? "Not scored" : `${item.score}/5`}
                </span>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border pt-5 text-xs text-muted-foreground">
          Shared by the candidate for employer review. Assessment results support a hiring conversation; a mentor remains responsible for any review or adjustment.
        </footer>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-2xl">{value}</dd>
    </div>
  );
}

function InsightList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="rounded-2xl border border-border p-5">
      <h2 className="font-title text-lg">{title}</h2>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {items.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      ) : <p className="mt-3 text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}
