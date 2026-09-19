import { Info } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { DEMO_USERS } from "@/lib/data/demo-users";
import { AuthForm } from "./auth-form";
import { DemoAccounts } from "./demo-accounts";
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

      {/* Mock auth: one tap into a seeded account with instant loading signal */}
      <DemoAccounts users={users} next={next} need={need} />
    </div>
  );
}
