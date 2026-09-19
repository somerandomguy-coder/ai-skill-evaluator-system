import { PageShell } from "@/components/common/layout";

export default function ChallengeLoading() {
  return (
    <PageShell width="7xl" className="py-8 sm:py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <div className="space-y-4">
            <div className="skeleton h-4 w-56" />
            <div className="skeleton h-12 w-4/5" />
            <div className="flex gap-2">
              <div className="skeleton h-7 w-24 rounded-full" />
              <div className="skeleton h-7 w-32 rounded-full" />
              <div className="skeleton h-7 w-28 rounded-full" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="skeleton h-6 w-40" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
          </div>
          <div className="skeleton h-72 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <div className="skeleton h-56 rounded-2xl" />
          <div className="skeleton h-36 rounded-2xl" />
        </div>
      </div>
    </PageShell>
  );
}
