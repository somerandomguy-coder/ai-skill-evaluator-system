"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";

export function StepperNav() {
  const pathname = usePathname();

  // Determine current active step based on pathname
  let currentStep = 1;
  if (pathname.startsWith("/challenge")) {
    currentStep = 2;
  } else if (pathname.startsWith("/build")) {
    currentStep = 3;
  } else if (pathname.startsWith("/report")) {
    currentStep = 4;
  } else if (pathname === "/") {
    currentStep = 1;
  }

  const steps = [
    { number: 1, label: "1. Input JD", href: "/" },
    { number: 2, label: "2. Challenge & Rubric", href: "/challenge/seed-challenge" },
    { number: 3, label: "3. Build Workspace", href: "/build/seed-session-active" },
    { number: 4, label: "4. Assessment Report", href: "/report/seed-eval-strong" },
  ];

  return (
    <nav
      aria-label="Assessment Pipeline Stages"
      className="hidden md:flex items-center gap-0.5 bg-surface-container-low px-2 py-1 rounded border border-border text-xs font-mono"
    >
      {steps.map((step, idx) => {
        const isCurrent = currentStep === step.number;
        const isPast = currentStep > step.number;

        return (
          <div key={step.number} className="flex items-center">
            <Link
              href={step.href}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                isCurrent
                  ? "bg-primary text-white font-bold shadow-xs"
                  : isPast
                  ? "text-foreground hover:bg-surface-container font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-container"
              }`}
            >
              {isCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
              {isPast && (
                <Check className="size-3 text-emerald-600 stroke-[3]" />
              )}
              <span>{step.label}</span>
            </Link>

            {idx < steps.length - 1 && (
              <ChevronRight className="size-3 text-muted-foreground/50 mx-0.5 shrink-0" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
