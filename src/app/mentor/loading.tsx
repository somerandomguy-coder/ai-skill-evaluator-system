import { PageShell } from "@/components/common/layout";

export default function MentorLoading() {
  return (
    <PageShell width="5xl" className="space-y-8 animate-pulse py-8">
      <div className="space-y-3">
        <div className="h-4 w-20 rounded bg-muted/80"></div>
        <div className="h-9 w-64 rounded bg-muted/80"></div>
        <div className="h-4 w-96 rounded bg-muted/50"></div>
      </div>

      <div className="space-y-4">
        <div className="h-32 rounded-lg border border-border bg-surface-container-low"></div>
        <div className="h-32 rounded-lg border border-border bg-surface-container-low"></div>
        <div className="h-32 rounded-lg border border-border bg-surface-container-low"></div>
      </div>
    </PageShell>
  );
}
