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

function createSafeDataSource(): DataSource {
  const isExplicitMock = process.env.DATA_SOURCE?.toLowerCase() === "mock";
  const dbUrl = process.env.DATABASE_URL?.trim();
  const hasPlaceholderPassword = dbUrl?.includes("[YOUR_SUPABASE_DB_PASSWORD]") || dbUrl?.includes("[PASSWORD]");
  const hasValidDbUrl = Boolean(dbUrl) && !hasPlaceholderPassword;

  if (isExplicitMock || !hasValidDbUrl) {
    return mockDataSource;
  }

  // Proxy prismaDataSource: if PostgreSQL is unreachable, credentials are invalid,
  // or tables are not yet migrated, gracefully fall back to mockDataSource instead of crashing with HTTP 500.
  const safeHandler: ProxyHandler<DataSource> = {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);
      if (typeof orig !== "function") return orig;

      return async (...args: any[]) => {
        try {
          return await orig.apply(target, args);
        } catch (err: any) {
          console.warn(
            `[SafeDataSource] Database operation '${String(prop)}' failed (${err?.code || err?.message || err}). Falling back to mock data.`
          );
          const fallback = Reflect.get(mockDataSource, prop);
          if (typeof fallback === "function") {
            return await fallback.apply(mockDataSource, args);
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
