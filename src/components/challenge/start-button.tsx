"use client";

import { useTransition } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startBuild } from "@/app/actions/build";
import { cn } from "@/lib/utils";

interface StartBuildButtonProps {
  challengeId: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "xl";
}

export function StartBuildButton({ challengeId, className, size = "xl" }: StartBuildButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleStart = () => {
    if (isPending) return;
    startTransition(async () => {
      try {
        await startBuild(challengeId);
      } catch (err) {
        const e = err as { digest?: string; message?: string } | null;
        // Next.js redirect works by throwing a special NEXT_REDIRECT error.
        // We must re-throw it so Next.js router navigates to the workspace page.
        if (e?.digest?.startsWith("NEXT_REDIRECT") || e?.message === "NEXT_REDIRECT") {
          throw err;
        }
        console.error("Failed to start build workspace:", err);
        alert(e?.message || "Could not open workspace. Please try again.");
      }
    });
  };

  return (
    <Button type="button" variant="signal" size={size} disabled={isPending} className={cn("w-full", className)} onClick={handleStart}>
      {isPending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          Opening workspace…
        </>
      ) : (
        <>
          Start building
          <ArrowRight className="transition-transform duration-200 group-hover/button:translate-x-0.5" aria-hidden />
        </>
      )}
    </Button>
  );
}
