"use client";

import { Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Sign in / create account. Looks like the real thing; the password field is
 * decoration (auth is mocked) and both tabs post to the same action.
 */
export function AuthForm({ next, error }: { next?: string; error?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="space-y-5">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
        <TabsList className="w-full">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>
      </Tabs>

      <form action={signIn} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="name" name="name" autoComplete="name" placeholder="Alex Morgan" className="pl-8" />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="pl-8"
              aria-invalid={error === "email" || undefined}
            />
          </div>
          {error === "email" && <p className="text-xs text-destructive">Enter a valid email address.</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="Any value works in this demo" />
        </div>

        <Button type="submit" className="w-full" size="lg">
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
