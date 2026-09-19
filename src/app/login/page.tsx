import { Info } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { switchUser } from "@/app/actions/auth";
import { Logo } from "@/components/ui/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DEMO_USERS } from "@/lib/data/demo-users";
import { AuthForm } from "./auth-form";
import { OAuthButtons } from "./oauth-buttons";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = one(sp.next);
  const need = one(sp.need);
  const error = one(sp.error);

  const user = await getCurrentUser();
  const users = DEMO_USERS;
  // Already signed in and no role mismatch to resolve: go where they were headed.
  if (user && !need) redirect(safeNext(next));

  return (
    <div className="relative isolate mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 overflow-x-clip px-4 py-10 sm:py-14">
      {/* Ambient orange light behind the card. */}
      <div className="ambient -top-24 -left-24 size-[30rem]" aria-hidden />
      <div className="ambient -right-28 -bottom-20 size-[26rem] [animation-delay:-4s]" aria-hidden />

      <div className="flex flex-col items-center gap-4 text-center">
        <Logo size={40} showWordmark={false} priority />
        <h1 className="font-display bg-[linear-gradient(100deg,var(--foreground)_10%,color-mix(in_oklab,var(--foreground)_50%,var(--signal-ink))_55%,var(--signal-ink)_95%)] bg-clip-text text-4xl text-transparent">
          {need ? "Switch account" : "Welcome back"}
        </h1>
      </div>

      {need && (
        <Alert className="rounded-2xl border-signal/30 bg-card/80 backdrop-blur-md">
          <Info aria-hidden />
          <AlertTitle>Needs a {need.toLowerCase()} account</AlertTitle>
          <AlertDescription>Pick one below.</AlertDescription>
        </Alert>
      )}

      {/* Obsidian glass card */}
      <div className="space-y-5 rounded-3xl border border-signal/30 bg-card/80 p-6 shadow-2xl backdrop-blur-2xl">
        <AuthForm next={next} error={error} initialMode={one(sp.mode) === "signup" ? "signup" : "signin"} />

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" aria-hidden />
          or
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>

        <OAuthButtons />
      </div>

      {/* Mock auth: one tap into a seeded account. */}
      <div className="space-y-2.5 rounded-3xl border border-border bg-card/70 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Demo accounts</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">no passwords</span>
        </div>
        <ul className="grid gap-1.5">
          {users.map((u) => (
            <li key={u.id}>
              <form action={switchUser.bind(null, u.id, need ? (u.role === need ? next : undefined) : next)}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors hover:border-signal/40 hover:bg-signal-soft/50"
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      u.role === "MENTOR" ? "bg-warn-soft text-warn" : "bg-signal-soft text-signal-ink"
                    )}
                    aria-hidden
                  >
                    {initials(u.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{u.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{u.role === "MENTOR" ? "Mentor" : "Candidate"}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
