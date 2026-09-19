"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-script";

type Theme = "light" | "dark";

function readStored(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** The <html> class is the source of truth; React just observes it. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getSnapshot = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");
const getServerSnapshot = (): Theme | null => null;

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore<Theme | null>(subscribe, getSnapshot, getServerSnapshot);

  // React's dev-mode remount resets <html> attributes; re-apply before paint.
  useLayoutEffect(() => {
    apply(readStored());
  }, []);

  // Keep other open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) apply(e.newValue === "light" ? "light" : "dark");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle() {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    const commit = () => {
      apply(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage can be unavailable (private mode); the switch still works for this visit.
      }
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && typeof document.startViewTransition === "function") document.startViewTransition(commit);
    else commit();
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={theme === null ? undefined : isDark}
      title={isDark ? "Light theme" : "Dark theme"}
      className={cn(
        "relative grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {/* Both icons are always rendered; CSS picks one, so there is no hydration flash. */}
      <Moon
        className="size-4 transition-[transform,opacity] duration-300 ease-[var(--ease)] dark:scale-50 dark:-rotate-90 dark:opacity-0"
        aria-hidden
      />
      <Sun
        className="absolute size-4 scale-50 rotate-90 opacity-0 transition-[transform,opacity] duration-300 ease-[var(--ease)] dark:scale-100 dark:rotate-0 dark:opacity-100"
        aria-hidden
      />
    </button>
  );
}
