import { cn } from "@/lib/utils";

/** A rounded tile with a trace line: the reasoning trace is the product's evidence. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground", className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13h4l2.5-7 5 12 2.5-5H21" />
      </svg>
    </span>
  );
}
