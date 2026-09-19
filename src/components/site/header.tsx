import { Handshake, LayoutDashboard, Sparkles } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { isDemoMode } from "@/lib/env";
import { DEMO_USERS } from "@/lib/data/demo-users";
import { RoleSwitcher } from "./role-switcher";
import { StepperNav } from "./stepper-nav";
import { ThemeToggle } from "./theme-toggle";



export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-50 border-b border-border bg-background/90 supports-[backdrop-filter]:bg-background/75 supports-[backdrop-filter]:backdrop-blur-md"
    >
      <div className="relative mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={`${APP_NAME} home`}
          className="shrink-0 rounded-lg transition-[opacity,transform] duration-200 hover:opacity-80 active:scale-[0.97]"
        >
          <Logo size={26} priority wordmarkClassName="hidden sm:inline" />
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <StepperNav />
        </div>

        <nav aria-label="Site" className="flex items-center text-[13px]">
          {/* Mentors land on their queue from "/", so one Dashboard link serves both roles. */}
          {/* Mentors moved into the account menu; Partners stays prominent. */}
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-full bg-signal-soft px-3 py-1.5 font-semibold text-signal-ink transition-colors hover:bg-signal/15 sm:inline-flex"
          >
            <LayoutDashboard className="size-3.5" aria-hidden />
            Dashboard
          </Link>
          <Link
            href="/partnerships"
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-signal-ink transition-colors hover:bg-signal-soft lg:inline-flex"
          >
            <Handshake className="size-3.5" aria-hidden />
            Partners
          </Link>
          {/* ChatGPT-style upgrade pill: orange outline, ambient glow, live dot, one shimmer sweep on hover. */}
          <Link
            href="/pricing"
            className="shimmer ml-1 hidden items-center gap-1.5 rounded-full border border-signal/60 bg-signal-soft/60 px-3 py-1.5 font-semibold text-signal-ink shadow-[0_0_16px_rgb(255_107_0/0.25)] backdrop-blur-md transition-[box-shadow,transform] duration-300 hover:-translate-y-px hover:shadow-[0_0_24px_rgb(255_107_0/0.45)] md:inline-flex"
          >
            <span className="live-dot size-1.5 text-signal" aria-hidden />
            <Sparkles className="size-3.5" aria-hidden />
            Upgrade
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          {isDemoMode() && (
            <span
              className="hidden items-center gap-1.5 rounded-full bg-[rgb(16_185_129/0.1)] px-2.5 py-1 text-xs font-semibold text-[#047857] shadow-[0_0_14px_rgb(16_185_129/0.35)] ring-1 ring-[rgb(16_185_129/0.35)] backdrop-blur-md sm:inline-flex dark:text-[#6ee7b7]"
              title="Demo mode: AI and search answers come from cached fixtures"
            >
              <span className="live-dot size-1.5 text-[#10b981]" aria-hidden />
              Demo
            </span>
          )}
          <ThemeToggle />
          <RoleSwitcher current={user} users={DEMO_USERS} />
        </div>
      </div>
    </header>
  );
}
