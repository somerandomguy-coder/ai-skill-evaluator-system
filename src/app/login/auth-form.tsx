"use client";

import { ArrowRight, KeyRound, Loader2, Mail, ShieldAlert, UserRound } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const FIELD =
  "h-11 rounded-xl border-border bg-foreground/[0.04] pl-9 text-[14px] transition-[border-color,box-shadow,opacity] duration-200 focus-visible:border-signal focus-visible:ring-3 focus-visible:ring-signal/30 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/5";
const ICON = "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground";

export function AuthForm({ next, error, initialMode = "signin" }: { next?: string; error?: string; initialMode?: "signin" | "signup" }) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [isPending, startTransition] = useTransition();

  // Set global cursor to wait when action is pending
  useEffect(() => {
    if (isPending) {
      document.body.classList.add("cursor-wait");
    } else {
      document.body.classList.remove("cursor-wait");
    }
    return () => {
      document.body.classList.remove("cursor-wait");
    };
  }, [isPending]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === "signup" || isPending) return;

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await signIn(formData);
      } catch (err) {
        if (err && typeof err === "object" && "message" in err && String((err as { message: string }).message).includes("NEXT_REDIRECT")) {
          return;
        }
        console.error("Sign in failed:", err);
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Segmented switch: the active half slides. */}
      <div className="relative grid grid-cols-2 rounded-full bg-muted p-1" role="group" aria-label="Sign in or create an account">
        <span
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-card shadow-sm transition-transform duration-300 ease-[var(--ease)]"
          style={{ transform: mode === "signup" ? "translateX(100%)" : "none" }}
          aria-hidden
        />
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "relative rounded-full py-1.5 text-[13px] font-medium transition-colors",
              mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {mode === "signup" && (
        <div className="rounded-2xl border border-warn/30 bg-warn-soft/30 p-4 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-warn">
            <ShieldAlert className="size-4 shrink-0" />
            <span>Controlled Demo Mode</span>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Direct account creation is disabled in the hackathon sandbox to ensure a calibrated evaluation flow. Please use one of the pre-seeded demo accounts below.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {next && <input type="hidden" name="next" value={next} />}

        {mode === "signup" && (
          <div className="space-y-1.5 opacity-60">
            <Label htmlFor="name" className="text-[13px]">
              Name
            </Label>
            <div className="relative">
              <UserRound className={ICON} aria-hidden />
              <Input id="name" name="name" disabled placeholder="Alex Morgan" className={FIELD} />
            </div>
          </div>
        )}

        <div className={cn("space-y-1.5", mode === "signup" && "opacity-60")}>
          <Label htmlFor="email" className="text-[13px]">
            Email
          </Label>
          <div className="relative">
            <Mail className={ICON} aria-hidden />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required={mode === "signin"}
              disabled={mode === "signup" || isPending}
              placeholder="you@example.com"
              className={FIELD}
              aria-invalid={error === "email" || undefined}
            />
          </div>
          {error === "email" && <p className="text-xs text-bad">Enter a valid email address.</p>}
        </div>

        <div className={cn("space-y-1.5", mode === "signup" && "opacity-60")}>
          <Label htmlFor="password" className="text-[13px]">
            Password
          </Label>
          <div className="relative">
            <KeyRound className={ICON} aria-hidden />
            <Input
              id="password"
              name="password"
              type="password"
              disabled={mode === "signup" || isPending}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="Any value works in demo"
              className={FIELD}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="signal"
          size="xl"
          disabled={mode === "signup" || isPending}
          className={cn(
            "w-full shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_-3px_0_rgb(0_0_0/0.22),0_0_25px_rgb(255_107_0/0.4)]",
            mode === "signup" && "opacity-60 cursor-not-allowed hover:border-transparent hover:bg-muted text-muted-foreground shadow-none"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Signing in...
            </>
          ) : mode === "signup" ? (
            "Registration Paused — Pick Demo Account Below"
          ) : (
            <>
              Sign in
              <ArrowRight aria-hidden />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
