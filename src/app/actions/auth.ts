"use server";

/**
 * Mock authentication actions. There are no passwords: "signing in" picks a
 * seeded user (or creates a candidate for an unknown email) and stores the id
 * in a cookie. See lib/auth.ts.
 */
import { redirect } from "next/navigation";
import { clearUserCookie, safeNext, setUserCookie } from "@/lib/auth";
import { data } from "@/lib/data";

/** Role switcher / "Continue as": become an existing seeded user. */
export async function switchUser(userId: string, next?: string) {
  const user = await data.findUser(userId);
  if (!user) redirect("/login");
  await setUserCookie(user.id);
  redirect(safeNext(next ?? (user.role === "MENTOR" ? "/mentor" : "/")));
}

/** The login / sign-up form. The password field is decoration. */
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "") || undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/login?error=email${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  const name = String(formData.get("name") ?? "").trim() || undefined;
  const user = (await data.findUserByEmail(email)) ?? (await data.createCandidate(email, name));
  await setUserCookie(user.id);
  redirect(safeNext(next ?? (user.role === "MENTOR" ? "/mentor" : "/")));
}

export async function signOut() {
  await clearUserCookie();
  redirect("/login");
}
