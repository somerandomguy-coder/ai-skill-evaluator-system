import { PrismaClient } from "@prisma/client";

function getOptimizedDbUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "20");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "5");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

// Reuse one client across hot reloads in dev; each instance opens its own pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const optimizedUrl = getOptimizedDbUrl();
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(optimizedUrl ? { datasources: { db: { url: optimizedUrl } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
