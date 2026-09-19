import { PageShell } from "@/components/common/layout";

export default function ChallengeLoading() {
  return (
    <PageShell width="7xl" className="py-8 animate-pulse">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="min-w-0 space-y-8">
          <div className="space-y-3 pb-6 border-b border-border">
            <div className="flex gap-2">
              <div className="h-5 w-44 rounded bg-muted/80"></div>
              <div className="h-5 w-40 rounded bg-muted/50"></div>
            </div>
            <div className="h-9 w-3/4 rounded bg-muted/80"></div>
            <div className="h-4 w-1/2 rounded bg-muted/50"></div>
          </div>

          <div className="space-y-4">
            <div className="h-6 w-32 rounded bg-muted/70"></div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted/50"></div>
              <div className="h-4 w-5/6 rounded bg-muted/50"></div>
              <div className="h-4 w-4/6 rounded bg-muted/50"></div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="h-6 w-48 rounded bg-muted/70"></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-28 rounded-lg border border-border bg-surface-container-low"></div>
              <div className="h-28 rounded-lg border border-border bg-surface-container-low"></div>
              <div className="h-28 rounded-lg border border-border bg-surface-container-low"></div>
              <div className="h-28 rounded-lg border border-border bg-surface-container-low"></div>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="h-44 rounded-lg border border-border bg-surface-container-low"></div>
          <div className="h-44 rounded-lg border border-border bg-surface-container-low"></div>
        </aside>
      </div>
    </PageShell>
  );
}
