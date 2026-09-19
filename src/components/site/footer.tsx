import Link from "next/link";
import { ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-container-low/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border text-xs">
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <span className="font-bold text-primary">{APP_NAME}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Work-Sample Assessment Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
              Pricing & Plans
            </Link>
            <Link href="/partnerships" className="text-muted-foreground hover:text-primary transition-colors">
              Mentorship & Partnerships
            </Link>
            <Link href="/report/seed-eval-strong" className="text-muted-foreground hover:text-primary transition-colors">
              Sample Report
            </Link>
            <Link href="/mentor" className="text-muted-foreground hover:text-primary transition-colors">
              Mentor Portal
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" aria-hidden />
            <span>Scores engineering decisions and AI reasoning. Never grammar, spelling, fluency, or pedigree.</span>
          </p>
          <p className="font-mono text-[11px]">The evaluator sees transcript turns and code only — blind to name or CV.</p>
        </div>
      </div>
    </footer>
  );
}
