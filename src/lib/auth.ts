/**
 * Mock authentication.
 *
 * There are no passwords, sessions or email: the "session" is a cookie holding a
 * seeded user's id, and the login page is a role switcher that looks real. This
 * is deliberately not security — but authorisation *between roles* is still
 * enforced server-side (a candidate cannot open another candidate's workspace,
 * only a mentor can review), so the product behaves correctly when a role is
 * switched.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { USER_COOKIE } from "./constants";
import { data, type Role, type UserView } from "./data";

export const getCurrentUser = cache(async (): Promise<UserView | null> => {
  const id = (await cookies()).get(USER_COOKIE)?.value;
  if (!id) return null;
  return data.findUser(id);
});

/** For pages: send an anonymous visitor to the login page, then back. */
export async function requireUser(next: string, role?: Role): Promise<UserView> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (role && user.role !== role) redirect(`/login?next=${encodeURIComponent(next)}&need=${role}`);
  return user;
}

export async function setUserCookie(userId: string) {
  (await cookies()).set(USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearUserCookie() {
  (await cookies()).delete(USER_COOKIE);
}

/** Only same-site relative paths may be used as a post-login destination. */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?!\/)/.test(next) ? next : "/";
}
