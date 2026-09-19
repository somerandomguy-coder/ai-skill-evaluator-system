import { PageShell } from "@/components/common/layout";

export default function ReportLoading() {
  return (
    <PageShell width="5xl" className="space-y-6 py-8">
      <div className="space-y-4">
        <div className="skeleton h-6 w-40 rounded-full" />
        <div className="skeleton h-12 w-3/4" />
        <div className="flex gap-2">
          <div className="skeleton h-8 w-44 rounded-full" />
          <div className="skeleton h-8 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="skeleton h-64 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-48 rounded-3xl" />
          <div className="skeleton h-48 rounded-3xl" />
        </div>
      </div>
      <div className="skeleton h-16 rounded-2xl" />
      <div className="skeleton h-16 rounded-2xl" />
    </PageShell>
  );
}
