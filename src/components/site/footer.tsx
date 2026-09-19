import { ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
          {APP_NAME} scores decisions and reasoning. Never grammar, spelling, fluency, or background.
        </p>
        <p>The evaluator sees your transcript and files only, not your name or CV.</p>
      </div>
    </footer>
  );
}
