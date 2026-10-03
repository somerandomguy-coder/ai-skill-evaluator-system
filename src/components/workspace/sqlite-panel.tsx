"use client";

import { useEffect, useRef, useState } from "react";
import {
  Database,
  Play,
  RotateCcw,
  Table as TableIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrowserSqliteEngine, type SqlQueryResult, type SqlTableSchema } from "@/lib/sqlite/sqlite-engine";
import { cn } from "@/lib/utils";

interface SqlitePanelProps {
  files?: Record<string, string>;
  className?: string;
}

const DEFAULT_SAMPLE_SQL = `SELECT * FROM users LIMIT 10;`;

export function SqlitePanel({ files = {}, className }: SqlitePanelProps) {
  const [engine, setEngine] = useState<BrowserSqliteEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(DEFAULT_SAMPLE_SQL);
  const [results, setResults] = useState<SqlQueryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<SqlTableSchema[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const engineRef = useRef<BrowserSqliteEngine | null>(null);

  // Initialize SQLite engine with schema.sql from files or fallback seed
  useEffect(() => {
    let isMounted = true;
    const eng = new BrowserSqliteEngine();
    engineRef.current = eng;

    async function initDb() {
      try {
        setLoading(true);
        // Look for schema.sql and seed.sql in files, or use default seed
        const loadedSql = [
          files["schema.sql"] || files["server/schema.sql"] || files["src/schema.sql"],
          files["seed.sql"] || files["server/seed.sql"] || files["src/seed.sql"],
        ]
          .filter(Boolean)
          .join("\n\n");

        const schemaSql =
          loadedSql ||
          `-- Default Fullstack SQLite Schema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  user_id TEXT,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email, role) VALUES 
  ('Sarah Connor', 'sarah.connor@example.com', 'admin'),
  ('John Doe', 'john.doe@example.com', 'candidate'),
  ('Alice Wang', 'alice.wang@example.com', 'developer');

INSERT INTO consents (user_id, purpose, status) VALUES
  (1, 'CDR Data Sharing Banking', 'ACTIVE'),
  (2, 'Taxation Automated Reporting', 'ACTIVE'),
  (3, 'Diagnostics & Error Telemetry', 'REVOKED');

INSERT INTO audit_logs (action, user_id, details) VALUES
  ('AUTH_LOGIN', 'usr_981a', 'Successful passkey verification'),
  ('CONSENT_GRANTED', 'usr_981a', 'Banking data access approved'),
  ('CDR_GATEWAY_ACCESS', 'usr_420b', 'Disaggregated gross wages calculated');
`;

        await eng.init(schemaSql);
        if (isMounted) {
          setEngine(eng);
          const currentTables = eng.getTables();
          setTables(currentTables);
          if (currentTables.length > 0) {
            setSelectedTable(currentTables[0].name);
          }
          // Run initial query
          try {
            const initialRes = eng.execute(DEFAULT_SAMPLE_SQL);
            setResults(initialRes);
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Failed to initialize in-browser SQLite engine.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void initDb();

    return () => {
      isMounted = false;
      eng.close();
    };
  }, [files["schema.sql"]]);

  function handleRunQuery(sqlToRun?: string) {
    const sql = (sqlToRun ?? query).trim();
    if (!sql || !engine) return;

    setError(null);
    try {
      const res = engine.execute(sql);
      setResults(res);
      // Refresh table list in case query created or modified schema
      const refreshedTables = engine.getTables();
      setTables(refreshedTables);
    } catch (err: any) {
      setError(err?.message || "SQL Execution Error");
      setResults(null);
    }
  }

  function selectQuickQuery(sampleSql: string) {
    setQuery(sampleSql);
    handleRunQuery(sampleSql);
  }

  function handleTableClick(tableName: string) {
    setSelectedTable(tableName);
    const sql = `SELECT * FROM ${tableName} LIMIT 25;`;
    setQuery(sql);
    handleRunQuery(sql);
  }

  function handleDownloadDb() {
    if (!engine) return;
    try {
      const binary = engine.exportBinary();
      const blob = new Blob([binary as unknown as BlobPart], { type: "application/x-sqlite3" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sqlite.db";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Failed to export sqlite.db");
    }
  }

  return (
    <div className={cn("flex h-full w-full flex-col overflow-hidden bg-background text-foreground", className)}>
      {/* Top Header Bar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card px-3 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <Database className="size-4 text-primary" aria-hidden />
          <span className="font-bold text-foreground">SQLite 3 (WASM)</span>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected · sqlite.db
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadDb}
            className="h-7 gap-1 px-2 text-[11px] font-mono border-border/80 hover:bg-muted"
            title="Download active in-memory SQLite database as a real .db binary file"
          >
            <Download className="size-3 text-primary" />
            <span className="hidden sm:inline">Export sqlite.db</span>
          </Button>
          <span className="rounded bg-muted px-2 py-0.5">{tables.length} tables</span>
          <span className="hidden sm:inline text-muted-foreground/60">Press Cmd+Enter to run</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 divide-x divide-border">
        {/* Left Sidebar: Schema & Tables Explorer */}
        <div className="w-52 shrink-0 overflow-y-auto bg-surface-container-low/50 p-2.5 space-y-3 hidden sm:block">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Layers className="size-3.5" />
              Tables
            </span>
          </div>

          <div className="space-y-1">
            {tables.map((t) => {
              const isSelected = selectedTable === t.name;
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => handleTableClick(t.name)}
                  className={cn(
                    "w-full text-left rounded-lg p-2 transition-all flex items-center justify-between group text-xs",
                    isSelected
                      ? "bg-primary text-white font-medium shadow-xs"
                      : "text-foreground/80 hover:bg-surface-container hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <TableIcon className={cn("size-3.5 shrink-0", isSelected ? "text-white" : "text-primary")} />
                    <span className="truncate">{t.name}</span>
                  </span>
                  <ChevronRight className={cn("size-3 opacity-0 group-hover:opacity-100 transition-opacity", isSelected && "opacity-100")} />
                </button>
              );
            })}
          </div>

          {/* Table Column Detail */}
          {selectedTable && (
            <div className="pt-2 border-t border-border space-y-1.5 text-[11px]">
              <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground block">
                Columns ({tables.find((t) => t.name === selectedTable)?.columns.length || 0})
              </span>
              <ul className="space-y-1 font-mono text-[10px] text-muted-foreground">
                {tables
                  .find((t) => t.name === selectedTable)
                  ?.columns.map((c) => (
                    <li key={c.name} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-surface-container-lowest">
                      <span className="text-foreground truncate">{c.name}</span>
                      <span className="text-muted-foreground/80 uppercase text-[9px]">{c.type}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        {/* Main Console: Query Editor + Results */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {/* SQL Editor Area */}
          <div className="p-3 border-b border-border bg-card space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                Query Editor
              </span>

              {/* Quick Sample Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => selectQuickQuery("SELECT * FROM users;")}
                  className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors"
                >
                  users
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickQuery("SELECT * FROM audit_logs ORDER BY id DESC;")}
                  className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors"
                >
                  audit_logs
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickQuery("SELECT * FROM consents;")}
                  className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors"
                >
                  consents
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickQuery("SELECT name, sql FROM sqlite_master WHERE type='table';")}
                  className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors"
                >
                  schema
                </button>
              </div>
            </div>

            <div className="relative rounded-xl border border-border bg-code overflow-hidden shadow-inner">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleRunQuery();
                  }
                }}
                rows={3}
                placeholder="Enter SQL statement (e.g. SELECT * FROM users;)"
                className="w-full resize-none bg-transparent p-3 font-mono text-xs text-code-foreground outline-none focus:ring-0 leading-relaxed"
                spellCheck={false}
              />
              <div className="flex items-center justify-between px-3 py-1.5 bg-black/20 border-t border-border/40">
                <span className="font-mono text-[10px] text-code-foreground/50">
                  Ctrl+Enter / Cmd+Enter to execute
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setResults(null);
                      setError(null);
                    }}
                    className="h-6 text-[11px] text-code-foreground/70 hover:text-code-foreground hover:bg-white/10"
                  >
                    <RotateCcw className="size-3 mr-1" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRunQuery()}
                    disabled={loading || !query.trim()}
                    className="h-6 gap-1 px-3 text-[11px] font-mono rounded bg-primary text-white hover:bg-primary/90 font-bold"
                  >
                    <Play className="size-3 fill-current" />
                    Run Query
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-auto p-3">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 font-mono">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">SQL Execution Failed</span>
                  <p className="leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {!error && results && results.length > 0 && (
              <div className="space-y-4">
                {results.map((res, idx) => (
                  <div key={idx} className="space-y-2">
                    {/* Execution metadata bar */}
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span className="font-semibold text-foreground">{res.values.length} row{res.values.length === 1 ? "" : "s"}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] rounded bg-muted px-2 py-0.5">
                        <Clock className="size-3" />
                        {res.executionTimeMs} ms
                      </span>
                    </div>

                    {/* Data Grid Table */}
                    <div className="overflow-x-auto rounded-xl border border-border shadow-xs">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-surface-container-low text-muted-foreground border-b border-border">
                          <tr>
                            {res.columns.map((col) => (
                              <th key={col} className="px-3 py-2 font-bold uppercase tracking-wider text-[11px]">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 bg-card">
                          {res.values.length === 0 ? (
                            <tr>
                              <td colSpan={res.columns.length} className="px-3 py-4 text-center text-muted-foreground italic text-xs">
                                Query returned 0 rows.
                              </td>
                            </tr>
                          ) : (
                            res.values.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-surface-container-low/60 transition-colors">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="px-3 py-2 text-foreground/90 whitespace-nowrap">
                                    {cell === null ? (
                                      <span className="text-muted-foreground/40 italic">NULL</span>
                                    ) : typeof cell === "object" ? (
                                      JSON.stringify(cell)
                                    ) : (
                                      String(cell)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!error && (!results || results.length === 0) && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <Database className="size-8 stroke-1 text-muted-foreground/40 mb-2" />
                <span className="font-mono text-xs font-medium">Ready to query sqlite.db</span>
                <p className="text-[11px] text-muted-foreground/70 max-w-sm mt-1">
                  Type any SQL statement above or pick one of the quick table queries.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
