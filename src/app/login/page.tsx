import { Info } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { switchUser } from "@/app/actions/auth";
import { LogoMark } from "@/components/site/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { data } from "@/lib/data";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = one(sp.next);
  const need = one(sp.need);
  const error = one(sp.error);

  const [user, users] = await Promise.all([getCurrentUser(), data.listUsers()]);
  // Already signed in and no role mismatch to resolve: go where they were headed.
  if (user && !need) redirect(safeNext(next));

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10 sm:py-14">
      <div className="flex flex-col items-center gap-3 text-center">
        <LogoMark className="size-10 rounded-xl [&_svg]:size-5" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to {APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to build a project and see how your reasoning scores.</p>
        </div>
      </div>

      {need && (
        <Alert>
          <Info aria-hidden />
          <AlertTitle>That page needs a {need.toLowerCase()} account</AlertTitle>
          <AlertDescription>Pick one of the {need.toLowerCase()} accounts below to continue.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-1">
          <AuthForm next={next} error={error} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Demo accounts
            <Badge variant="secondary">mock auth</Badge>
          </CardTitle>
          <CardDescription>
            Authentication is mocked: there are no passwords. Pick a seeded account to jump straight in, and switch any time from the menu in the header.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <form key={u.id} action={switchUser.bind(null, u.id, need ? (u.role === need ? next : undefined) : next)}>
              <Button type="submit" variant="outline" className="h-auto w-full justify-start gap-3 px-3 py-2 text-left">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    u.role === "MENTOR" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                  )}
                  aria-hidden
                >
                  {initials(u.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{u.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{u.email}</span>
                </span>
                <Badge variant="outline" className="shrink-0">
                  {u.role === "MENTOR" ? "Mentor" : "Candidate"}
                </Badge>
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
