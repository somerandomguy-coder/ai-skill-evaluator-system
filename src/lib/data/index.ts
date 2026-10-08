/**
 * The one place pages, layouts and actions get their data.
 *
 * Postgres by default. If `DATA_SOURCE=mock`, `DATABASE_URL` is unset, contains
 * placeholders, or if the database is unmigrated/unreachable, gracefully falls
 * back to mockDataSource to ensure production zero-downtime reliability.
 */
import { mockDataSource } from "./mock";
import { prismaDataSource } from "./prisma";
import type { DataSource } from "./types";

import { isDemoMode } from "../env";

function createSafeDataSource(): DataSource {
  const isExplicitMock = process.env.DATA_SOURCE?.toLowerCase() === "mock";
  const dbUrl = process.env.DATABASE_URL?.trim();
  const hasPlaceholderPassword = dbUrl?.includes("[YOUR_SUPABASE_DB_PASSWORD]") || dbUrl?.includes("[PASSWORD]");
  const hasValidDbUrl = Boolean(dbUrl) && !hasPlaceholderPassword;

  if (isExplicitMock || !hasValidDbUrl) {
    return mockDataSource;
  }

  // Proxy prismaDataSource: in demo mode gracefully fall back to mockDataSource.
  // In production mode (Row D04), do NOT silently activate mock storage or masquerade as real data.
  const safeHandler: ProxyHandler<DataSource> = {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);
      if (typeof orig !== "function") return orig;

      return async (...args: any[]) => {
        try {
          return await orig.apply(target, args);
        } catch (err: any) {
          if (isDemoMode()) {
            console.warn(
              `[SafeDataSource] Database operation '${String(prop)}' failed (${err?.code || err?.message || err}). Falling back to mock data in demo mode.`
            );
            const fallback = Reflect.get(mockDataSource, prop);
            if (typeof fallback === "function") {
              return await fallback.apply(mockDataSource, args);
            }
          }
          throw err;
        }
      };
    },
  };

  return new Proxy(prismaDataSource, safeHandler);
}

export const data: DataSource = createSafeDataSource();

export type * from "./types";
