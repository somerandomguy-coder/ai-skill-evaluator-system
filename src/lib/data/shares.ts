import crypto from "node:crypto";
import { prisma } from "../db";

export interface ShareCapability {
  id: string;
  evaluationId: string;
  ownerId: string;
  tokenHash: string;
  scope: "EMPLOYER_VIEW";
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  versionRef: string;
}

type ShareResolution =
  | { status: "VALID"; capability: ShareCapability }
  | { status: "REVOKED"; capability: ShareCapability }
  | { status: "EXPIRED"; capability: ShareCapability }
  | { status: "NOT_FOUND" };

/** The only non-durable implementation is the hermetic mock/test adapter. */
const memoryShares = new Map<string, ShareCapability>();
const memoryTokenIndex = new Map<string, string>();

function usesMockStore(): boolean {
  return process.env.DATA_SOURCE?.trim().toLowerCase() === "mock";
}

function fromRow(row: {
  id: string;
  evaluationId: string;
  ownerId: string;
  tokenHash: string;
  scope: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  versionRef: string;
}): ShareCapability {
  if (row.scope !== "EMPLOYER_VIEW") throw new Error("Unsupported share capability scope.");
  return {
    id: row.id,
    evaluationId: row.evaluationId,
    ownerId: row.ownerId,
    tokenHash: row.tokenHash,
    scope: row.scope,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    versionRef: row.versionRef,
  };
}

export function hashShareToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

function makeToken(
  options: { expiresInDays?: number; versionRef?: string }
): { token: string; tokenHash: string; expiresAt: Date | null; versionRef: string } {
  const token = `share_${crypto.randomBytes(24).toString("hex")}`;
  return {
    token,
    tokenHash: hashShareToken(token),
    expiresAt: options.expiresInDays === undefined ? null : new Date(Date.now() + options.expiresInDays * 86_400_000),
    versionRef: options.versionRef || "v1",
  };
}

/**
 * Creates an owner-authorized opaque employer share capability.
 * Production stores it in Postgres; tests use the explicit mock adapter.
 */
export async function createShareCapability(
  evaluationId: string,
  ownerId: string,
  options: { expiresInDays?: number; versionRef?: string } = {}
): Promise<{ token: string; capability: ShareCapability }> {
  const created = makeToken(options);
  if (usesMockStore()) {
    const now = new Date();
    const capability: ShareCapability = {
      id: `cap_${crypto.randomUUID()}`,
      evaluationId,
      ownerId,
      tokenHash: created.tokenHash,
      scope: "EMPLOYER_VIEW",
      createdAt: now.toISOString(),
      expiresAt: created.expiresAt?.toISOString() ?? null,
      revokedAt: null,
      versionRef: created.versionRef,
    };
    memoryShares.set(capability.id, capability);
    memoryTokenIndex.set(capability.tokenHash, capability.id);
    return { token: created.token, capability };
  }

  // Bind a production grant to an evaluation actually owned by this candidate.
  const owned = await prisma.evaluation.findFirst({
    where: { id: evaluationId, buildSession: { userId: ownerId } },
    select: { id: true },
  });
  if (!owned) throw new Error("Evaluation was not found for this candidate.");

  const row = await prisma.shareCapability.create({
    data: {
      evaluationId,
      ownerId,
      tokenHash: created.tokenHash,
      scope: "EMPLOYER_VIEW",
      expiresAt: created.expiresAt,
      versionRef: created.versionRef,
    },
  });
  return { token: created.token, capability: fromRow(row) };
}

/** Revokes a capability only when its original owner requests it. */
export async function revokeShareCapability(capabilityId: string, ownerId: string): Promise<boolean> {
  if (usesMockStore()) {
    const capability = memoryShares.get(capabilityId);
    if (!capability || capability.ownerId !== ownerId) return false;
    capability.revokedAt = new Date().toISOString();
    memoryShares.set(capabilityId, capability);
    return true;
  }

  const result = await prisma.shareCapability.updateMany({
    where: { id: capabilityId, ownerId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count === 1;
}

/** Resolves only a SHA-256 token digest and always checks revocation and expiry. */
export async function resolveShareCapability(rawToken: string): Promise<ShareResolution> {
  if (!rawToken || typeof rawToken !== "string") return { status: "NOT_FOUND" };
  const tokenHash = hashShareToken(rawToken);
  let capability: ShareCapability | null = null;

  if (usesMockStore()) {
    const id = memoryTokenIndex.get(tokenHash);
    capability = id ? memoryShares.get(id) ?? null : null;
  } else {
    const row = await prisma.shareCapability.findUnique({ where: { tokenHash } });
    capability = row ? fromRow(row) : null;
  }

  if (!capability) return { status: "NOT_FOUND" };
  if (capability.revokedAt) return { status: "REVOKED", capability };
  if (capability.expiresAt && new Date(capability.expiresAt).getTime() <= Date.now()) return { status: "EXPIRED", capability };
  return { status: "VALID", capability };
}

/** Test-only reset hook. Production capabilities are intentionally durable. */
export function resetShareStore(): void {
  memoryShares.clear();
  memoryTokenIndex.clear();
}
