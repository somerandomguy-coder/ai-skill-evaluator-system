import { PageShell } from "@/components/common/layout";

export default function ReportLoading() {
  return (
    <PageShell width="5xl" className="py-8 space-y-8 animate-pulse">
      <div className="space-y-3 pb-6 border-b border-border">
        <div className="h-5 w-36 rounded bg-muted/80"></div>
        <div className="h-9 w-2/3 rounded bg-muted/80"></div>
        <div className="h-4 w-1/3 rounded bg-muted/50"></div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="h-36 rounded-lg border border-border bg-surface-container-low"></div>
        <div className="h-36 rounded-lg border border-border bg-surface-container-low"></div>
        <div className="h-36 rounded-lg border border-border bg-surface-container-low"></div>
      </div>

      <div className="h-64 rounded-lg border border-border bg-surface-container-low"></div>
    </PageShell>
  );
}
