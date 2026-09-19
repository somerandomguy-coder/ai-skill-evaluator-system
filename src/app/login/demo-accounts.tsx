"use client";

import { Loader2, ArrowRight } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { switchUser } from "@/app/actions/auth";
import type { UserView } from "@/lib/data/types";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DemoAccountsProps {
  users: UserView[];
  next?: string;
  need?: string;
}

export function DemoAccounts({ users, next, need }: DemoAccountsProps) {
  const [isPending, startTransition] = useTransition();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // Set global cursor to wait when action is pending
  useEffect(() => {
    if (isPending) {
      document.body.classList.add("cursor-wait");
    } else {
      document.body.classList.remove("cursor-wait");
      setActiveUserId(null);
    }
    return () => {
      document.body.classList.remove("cursor-wait");
    };
  }, [isPending]);

  const handleSelect = (userId: string, targetRole: string) => {
    if (isPending) return;
    setActiveUserId(userId);
    const destination = need ? (targetRole === need ? next : undefined) : next;

    startTransition(async () => {
      try {
        await switchUser(userId, destination);
      } catch (err) {
        // Next.js redirect throws an internal NEXT_REDIRECT error which is expected
        if (err && typeof err === "object" && "message" in err && String((err as { message: string }).message).includes("NEXT_REDIRECT")) {
          return;
        }
        console.error("Failed to switch user:", err);
        setActiveUserId(null);
      }
    });
  };

  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card/70 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Demo accounts</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">1-click instant login for judging and evaluation</p>
        </div>
        <span className="rounded-full bg-signal-soft px-2 py-0.5 text-[11px] font-medium text-signal-ink border border-signal/20">
          Instant
        </span>
      </div>

      <ul className="grid gap-2">
        {users.map((u) => {
          const isLoadingThis = isPending && activeUserId === u.id;
          const isOtherLoading = isPending && activeUserId !== u.id;

          return (
            <li key={u.id}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleSelect(u.id, u.role)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                  isLoadingThis
                    ? "border-signal bg-signal-soft/60 ring-2 ring-signal/30"
                    : isOtherLoading
                    ? "border-transparent opacity-45 cursor-not-allowed"
                    : "border-border/60 bg-foreground/[0.02] hover:border-signal/40 hover:bg-signal-soft/40 hover:shadow-sm"
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                    isLoadingThis
                      ? "bg-signal text-white"
                      : u.role === "MENTOR"
                      ? "bg-warn-soft text-warn"
                      : "bg-signal-soft text-signal-ink"
                  )}
                  aria-hidden
                >
                  {isLoadingThis ? <Loader2 className="size-4 animate-spin" /> : initials(u.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium text-foreground">{u.name}</span>
                    {isLoadingThis && (
                      <span className="text-[11px] font-semibold text-signal-ink animate-pulse">
                        Signing in...
                      </span>
                    )}
                  </div>
                  <span className="block truncate text-[11px] text-muted-foreground">{u.email}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      u.role === "MENTOR"
                        ? "bg-warn-soft text-warn border border-warn/20"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {u.role === "MENTOR" ? "Mentor" : "Candidate"}
                  </span>
                  {!isLoadingThis && (
                    <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
