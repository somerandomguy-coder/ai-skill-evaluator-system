import crypto from "node:crypto";

export interface ShareCapability {
  id: string;
  evaluationId: string;
  ownerId: string;
  tokenHash: string; // SHA-256 hash of opaque token
  scope: "EMPLOYER_VIEW";
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  versionRef: string;
}

const SHARE_STORE = new Map<string, ShareCapability>();
const TOKEN_HASH_INDEX = new Map<string, string>(); // tokenHash -> id

export function hashShareToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Creates an owner-authorized opaque share token.
 * Stores capability with hash, expiry, scope, and version reference.
 */
export async function createShareCapability(
  evaluationId: string,
  ownerId: string,
  options: { expiresInDays?: number; versionRef?: string } = {}
): Promise<{ token: string; capability: ShareCapability }> {
  const token = `share_${crypto.randomBytes(24).toString("hex")}`;
  const tokenHash = hashShareToken(token);
  const id = `cap_${crypto.randomUUID()}`;
  const now = new Date();
  const expiresAt = options.expiresInDays
    ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const capability: ShareCapability = {
    id,
    evaluationId,
    ownerId,
    tokenHash,
    scope: "EMPLOYER_VIEW",
    createdAt: now.toISOString(),
    expiresAt,
    revokedAt: null,
    versionRef: options.versionRef || "v1",
  };

  SHARE_STORE.set(id, capability);
  TOKEN_HASH_INDEX.set(tokenHash, id);

  return { token, capability };
}

/**
 * Revokes a previously granted share capability.
 */
export async function revokeShareCapability(capabilityId: string, ownerId: string): Promise<boolean> {
  const cap = SHARE_STORE.get(capabilityId);
  if (!cap) return false;
  if (cap.ownerId !== ownerId) return false;

  cap.revokedAt = new Date().toISOString();
  SHARE_STORE.set(capabilityId, cap);
  return true;
}

/**
 * Resolves an opaque share token by verifying its hash and checking revocation/expiration.
 */
export async function resolveShareCapability(rawToken: string): Promise<
  | { status: "VALID"; capability: ShareCapability }
  | { status: "REVOKED"; capability: ShareCapability }
  | { status: "EXPIRED"; capability: ShareCapability }
  | { status: "NOT_FOUND" }
> {
  if (!rawToken || typeof rawToken !== "string") return { status: "NOT_FOUND" };
  const tokenHash = hashShareToken(rawToken);
  const capId = TOKEN_HASH_INDEX.get(tokenHash);
  if (!capId) return { status: "NOT_FOUND" };
  const cap = SHARE_STORE.get(capId);
  if (!cap) return { status: "NOT_FOUND" };

  if (cap.revokedAt) {
    return { status: "REVOKED", capability: cap };
  }
  if (cap.expiresAt && new Date(cap.expiresAt).getTime() <= Date.now()) {
    return { status: "EXPIRED", capability: cap };
  }
  return { status: "VALID", capability: cap };
}

export function resetShareStore(): void {
  SHARE_STORE.clear();
  TOKEN_HASH_INDEX.clear();
}
