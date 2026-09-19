"use client";

import { useTransition } from "react";
import { LoaderCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startBuild } from "@/app/actions/build";

interface StartBuildButtonProps {
  challengeId: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function StartBuildButton({ challengeId, className, size = "lg" }: StartBuildButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleStart = () => {
    if (isPending) return;
    startTransition(async () => {
      try {
        await startBuild(challengeId);
      } catch (err: any) {
        // Next.js redirect works by throwing a special NEXT_REDIRECT error.
        // We must re-throw it so Next.js router navigates to the workspace page.
        if (err?.digest?.startsWith("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
          throw err;
        }
        console.error("Failed to start build workspace:", err);
        alert(err?.message || "Could not open workspace. Please try again.");
      }
    });
  };

  return (
    <Button
      type="button"
      size={size}
      disabled={isPending}
      className={className ?? "w-full gap-2"}
      onClick={handleStart}
    >
      {isPending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          <span>Opening workspace...</span>
        </>
      ) : (
        <>
          <Play className="size-4" aria-hidden />
          <span>Start building</span>
        </>
      )}
    </Button>
  );
}
