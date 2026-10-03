/**
 * In-browser SQLite WASM Engine powered by sql.js.
 * Provides client-side and fullstack query capabilities on in-memory / sqlite.db instances.
 */
import initSqlJs, { type Database as SqlJsDatabase, type QueryExecResult } from "sql.js";

let sqlPromise: Promise<any> | null = null;

export async function getSqlJs() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: (file: string) => {
        // In browser, load from Next.js static public assets:
        if (typeof window !== "undefined") {
          return `/${file}`;
        }
        // In Node / SSR / test environment, load from local public folder if available:
        try {
          const path = require("path");
          return path.join(process.cwd(), "public", file);
        } catch {
          return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm`;
        }
      },
    }).catch(async (err) => {
      console.warn("[sqlite] Local WASM load failed, falling back to CDN:", err);
      return initSqlJs({
        locateFile: () => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm`,
      });
    });
  }
  return sqlPromise;
}

export interface SqlQueryResult {
  columns: string[];
  values: any[][];
  executionTimeMs: number;
  rowsAffected?: number;
}

export interface SqlTableSchema {
  name: string;
  columns: { name: string; type: string; notnull: boolean; pk: boolean }[];
}

export class BrowserSqliteEngine {
  private db: SqlJsDatabase | null = null;
  private initialized = false;

  async init(initialSql?: string): Promise<void> {
    const SQL = await getSqlJs();
    this.db = new SQL.Database();
    this.initialized = true;

    if (initialSql && this.db) {
      try {
        this.db.run(initialSql);
      } catch (err) {
        console.warn("[sqlite] Initial SQL execution error:", err);
      }
    }
  }

  isReady(): boolean {
    return this.initialized && this.db !== null;
  }

  execute(sql: string): SqlQueryResult[] {
    if (!this.db) {
      throw new Error("SQLite Database engine is not initialized yet.");
    }

    const start = performance.now();
    const rawResults: QueryExecResult[] = this.db.exec(sql);
    const duration = Math.round((performance.now() - start) * 100) / 100;

    if (!rawResults || rawResults.length === 0) {
      const rowsAffected = this.db.getRowsModified();
      return [
        {
          columns: ["result"],
          values: [[`Query executed successfully. Rows modified: ${rowsAffected}`]],
          executionTimeMs: duration,
          rowsAffected,
        },
      ];
    }

    return rawResults.map((r) => ({
      columns: r.columns,
      values: r.values,
      executionTimeMs: duration,
    }));
  }

  getTables(): SqlTableSchema[] {
    if (!this.db) return [];
    try {
      const res = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
      if (!res.length || !res[0].values) return [];

      const tables: SqlTableSchema[] = [];
      for (const row of res[0].values) {
        const tableName = String(row[0]);
        const pragma = this.db.exec(`PRAGMA table_info("${tableName}");`);
        const columns = pragma.length
          ? pragma[0].values.map((c) => ({
              name: String(c[1]),
              type: String(c[2] || "TEXT"),
              notnull: Boolean(c[3]),
              pk: Boolean(c[5]),
            }))
          : [];
        tables.push({ name: tableName, columns });
      }
      return tables;
    } catch {
      return [];
    }
  }

  exportBinary(): Uint8Array {
    if (!this.db) {
      throw new Error("SQLite Database engine is not initialized yet.");
    }
    return this.db.export();
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}
