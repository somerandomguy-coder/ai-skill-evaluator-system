export default function BuildLoading() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col" aria-busy="true" aria-label="Opening your workspace">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <div className="skeleton h-4 w-64" />
        <div className="ml-auto flex gap-2">
          <div className="skeleton h-7 w-24" />
          <div className="skeleton h-7 w-20" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
        <div className="space-y-5 border-r border-border bg-card p-4">
          <div className="skeleton ml-auto h-14 w-3/4 rounded-2xl" />
          <div className="skeleton h-24 w-5/6 rounded-2xl" />
          <div className="skeleton ml-auto h-10 w-1/2 rounded-2xl" />
        </div>
        <div className="hidden flex-col items-center justify-center gap-3 lg:flex">
          <div className="skeleton size-12 rounded-2xl" />
          <p className="text-[13px] text-muted-foreground">Opening your workspace</p>
        </div>
      </div>
    </div>
  );
}
