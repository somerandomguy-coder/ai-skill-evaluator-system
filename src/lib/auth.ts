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
import crypto from "node:crypto";
import { USER_COOKIE } from "./constants";
import { data, type Role, type UserView } from "./data";
import { isDemoMode } from "./env";
import { DEMO_USERS } from "./data/demo-users";

export function signSessionToken(userId: string, expiresInMs = 60 * 60 * 24 * 30 * 1000): string {
  const secret = process.env.SESSION_SECRET || "proofcraft-session-signing-secret-default-hermetic";
  const expiresAt = Date.now() + expiresInMs;
  const payload = `${userId}:${expiresAt}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function verifySessionToken(token: string): { userId: string } | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const [userId, expiresStr, sig] = parts;
  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null; // expired

  const secret = process.env.SESSION_SECRET || "proofcraft-session-signing-secret-default-hermetic";
  const expectedSig = crypto.createHmac("sha256", secret).update(`${userId}:${expiresStr}`).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { userId };
}

export const getCurrentUser = cache(async (): Promise<UserView | null> => {
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(USER_COOKIE)?.value;
    if (!rawCookie) return null;

    const verified = verifySessionToken(rawCookie);
    let resolvedUserId: string | null = verified?.userId ?? null;

    // In isolated DEMO_MODE only, permit plain demo user ID if session token isn't signed
    if (!resolvedUserId && isDemoMode()) {
      const demo = DEMO_USERS.find((u) => u.id === rawCookie);
      if (demo) resolvedUserId = demo.id;
    }

    if (!resolvedUserId) return null; // Forged or unverified cookie fails closed

    return data.findUser(resolvedUserId);
  } catch {
    return null;
  }
});

/** For pages: send an anonymous visitor to the login page, then back. */
export async function requireUser(next: string, role?: Role): Promise<UserView> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (role && user.role !== role) redirect(`/login?next=${encodeURIComponent(next)}&need=${role}`);
  return user;
}

export async function setUserCookie(userId: string) {
  const token = signSessionToken(userId);
  (await cookies()).set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearUserCookie() {
  (await cookies()).delete(USER_COOKIE);
}

/** Only same-site relative paths may be used as a post-login destination. */
export function safeNext(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/";
  const trimmed = next.trim();
  // Must start with a single forward slash, and not followed by another slash or backslash
  if (!/^\/[^/\\]/.test(trimmed)) return "/";
  // Must not contain backslashes, carriage returns, or control characters that browsers or parsers could normalize to another origin
  if (/[\\<>'"\r\n\t\0]/.test(trimmed)) return "/";
  return trimmed;
}
