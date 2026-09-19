import { EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { APP_NAME } from "@/lib/brand";

const LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/partnerships", label: "Partners" },
  { href: "/report/seed-eval-strong", label: "Sample report" },
  { href: "/mentor", label: "Mentor portal" },
];

// Lucide no longer ships brand icons, so the GitHub mark is inlined (Octicons, MIT).
const GitHubIcon = () => (
  <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

/** Add further profiles here (LinkedIn, X, Devpost...) as { href, label, icon }. */
const SOCIAL: { href: string; label: string; icon: ReactNode }[] = [
  { href: "https://github.com/somerandomguy-coder/ai-skill-evaluator-system", label: `${APP_NAME} on GitHub`, icon: <GitHubIcon /> },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-8 text-[13px] sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <Link href="/" aria-label={`${APP_NAME} home`} className="w-fit rounded-lg transition-opacity duration-200 hover:opacity-80">
            <Logo size={22} />
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-5 text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>
              © {year} {APP_NAME}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-ok" aria-hidden />
              Grammar and fluency are never scored
            </span>
            <span className="inline-flex items-center gap-1.5">
              <EyeOff className="size-3.5" aria-hidden />
              Evaluator never sees your name or CV
            </span>
          </div>
          <ul className="flex items-center gap-1">
            {SOCIAL.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={s.label}
                  title={s.label}
                  className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
