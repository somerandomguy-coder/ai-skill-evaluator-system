import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { data } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { RoleSwitcher } from "./role-switcher";
import { ShieldCheck, Terminal, Cpu } from "lucide-react";

export async function SiteHeader() {
  const [user, users] = await Promise.all([getCurrentUser(), data.listUsers()]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-baseline gap-2 font-bold tracking-tight text-primary">
            <span className="text-xl tracking-tight uppercase font-extrabold">{APP_NAME}</span>
            <span className="hidden font-mono text-[11px] text-muted-foreground uppercase tracking-wider sm:inline">
              // Work-Sample Assessment
            </span>
          </Link>
        </div>

        {/* Stepper Navigation */}
        <nav className="hidden xl:flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded border border-border text-xs font-medium">
          <Link
            href="/"
            className="px-2.5 py-1 transition-all rounded flex items-center gap-1.5 text-primary hover:bg-surface-container font-semibold"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span>1. Input JD</span>
          </Link>
          <span className="text-muted-foreground font-mono">→</span>
          <Link
            href="/challenge/seed-challenge"
            className="px-2.5 py-1 text-muted-foreground hover:text-primary hover:bg-surface-container rounded transition-all flex items-center gap-1.5"
          >
            <span>2. Challenge & Rubric</span>
          </Link>
          <span className="text-muted-foreground font-mono">→</span>
          <Link
            href="/build/seed-session-active"
            className="px-2.5 py-1 text-muted-foreground hover:text-primary hover:bg-surface-container rounded transition-all flex items-center gap-1.5"
          >
            <span>3. Build Workspace</span>
          </Link>
          <span className="text-muted-foreground font-mono">→</span>
          <Link
            href="/report/seed-eval-strong"
            className="px-2.5 py-1 text-muted-foreground hover:text-primary hover:bg-surface-container rounded transition-all flex items-center gap-1.5"
          >
            <span>4. Assessment Report</span>
          </Link>
        </nav>

        {/* Right Status & Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 font-mono text-[11px] bg-surface-container-lowest px-3 py-1 rounded border border-border text-foreground">
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-primary transition-colors font-sans font-medium"
            >
              Pricing
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/partnerships"
              className="text-muted-foreground hover:text-primary transition-colors font-sans font-medium"
            >
              Partnerships
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/mentor"
              className="text-secondary hover:text-primary transition-colors flex items-center gap-1 font-sans font-medium"
            >
              <ShieldCheck className="size-3.5" />
              <span>Mentor Portal</span>
            </Link>
          </div>

          {isDemoMode() && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold uppercase">
              Demo Mode
            </span>
          )}

          <RoleSwitcher current={user} users={users} />
        </div>
      </div>
    </header>
  );
}
