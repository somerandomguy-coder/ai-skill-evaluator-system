import { describe, expect, it } from "vitest";
import { isBackendChallenge, makeStarterFiles } from "@/lib/engine/starter-template";
import { BrowserSqliteEngine } from "@/lib/sqlite/sqlite-engine";

const mockBackendChallenge = {
  id: "backend-challenge-1",
  title: "Mid-Level Backend Engineer — Consumer Data Right (CDR) Consent Gateway",
  brief: "Build a CDR Consent Gateway backend API using Node.js, Express, and SQLite with audit logging and verification.",
  technicalInvariants: ["SQLite Audit Trail: All consent changes must be logged in SQLite"],
};

const mockFrontendChallenge = {
  id: "frontend-challenge-1",
  title: "Senior Design Technologist — Design System Tokens",
  brief: "Build an accessible color token palette viewer and design system component library.",
  technicalInvariants: ["WCAG AAA: All ratios >= 7:1"],
};

describe("isBackendChallenge detector", () => {
  it("detects backend challenges requiring fullstack Node + SQLite setup", () => {
    expect(isBackendChallenge(mockBackendChallenge)).toBe(true);
    expect(isBackendChallenge({ ...mockFrontendChallenge, brief: "Connects to a SQLite database." })).toBe(true);
    expect(isBackendChallenge({ ...mockFrontendChallenge, title: "Express API Service" })).toBe(true);
  });

  it("keeps pure frontend/design challenges on lightweight Vite setup", () => {
    expect(isBackendChallenge(mockFrontendChallenge)).toBe(false);
  });
});

describe("makeStarterFiles template generator", () => {
  it("generates fullstack template with server.js, schema.sql, and db utils for backend challenges", () => {
    const files = makeStarterFiles(mockBackendChallenge);

    expect(files["server.js"]).toBeDefined();
    expect(files["server.js"]).toContain("node:http");
    expect(files["server.js"]).toContain("sqlite");
    expect(files["server.js"]).toContain("3001");

    expect(files["schema.sql"]).toBeDefined();
    expect(files["schema.sql"]).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(files["schema.sql"]).toContain("CREATE TABLE IF NOT EXISTS audit_logs");
    expect(files["schema.sql"]).toContain("CREATE TABLE IF NOT EXISTS consents");

    expect(files["src/utils/db.ts"]).toBeDefined();
    expect(files["src/utils/db.ts"]).toContain("User");
    expect(files["src/utils/db.ts"]).toContain("ConsentRecord");

    expect(files["package.json"]).toBeDefined();
  });

  it("generates clean lightweight template without backend files for frontend challenges", () => {
    const files = makeStarterFiles(mockFrontendChallenge);

    expect(files["server.js"]).toBeUndefined();
    expect(files["schema.sql"]).toBeUndefined();
    expect(files["src/utils/db.ts"]).toBeUndefined();
    expect(files["src/App.jsx"]).toBeDefined();
    expect(files["index.html"]).toBeDefined();
  });
});

describe("BrowserSqliteEngine WASM execution", () => {
  it("initializes schema, inserts records, queries data, and inspects tables", async () => {
    const engine = new BrowserSqliteEngine();
    const initialSql = `
      CREATE TABLE test_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL
      );
      INSERT INTO test_items (name, price) VALUES ('Widget A', 19.95);
      INSERT INTO test_items (name, price) VALUES ('Widget B', 29.95);
    `;

    await engine.init(initialSql);
    expect(engine.isReady()).toBe(true);

    // Query tables schema
    const tables = engine.getTables();
    expect(tables.length).toBeGreaterThanOrEqual(1);
    const itemTable = tables.find((t) => t.name === "test_items");
    expect(itemTable).toBeDefined();
    expect(itemTable?.columns.map((c) => c.name)).toEqual(["id", "name", "price"]);

    // Query data
    const queryResults = engine.execute("SELECT name, price FROM test_items ORDER BY id ASC;");
    expect(queryResults.length).toBe(1);
    expect(queryResults[0].columns).toEqual(["name", "price"]);
    expect(queryResults[0].values).toEqual([
      ["Widget A", 19.95],
      ["Widget B", 29.95],
    ]);
    expect(queryResults[0].executionTimeMs).toBeGreaterThanOrEqual(0);

    // Insert new row
    const insertRes = engine.execute("INSERT INTO test_items (name, price) VALUES ('Widget C', 39.95);");
    expect(insertRes.length).toBe(1);
    expect(insertRes[0].rowsAffected).toBe(1);

    // Clean up
    engine.close();
    expect(engine.isReady()).toBe(false);
  });

  it("handles SQL syntax errors without crashing", async () => {
    const engine = new BrowserSqliteEngine();
    await engine.init();

    expect(() => {
      engine.execute("SELECT * FROM invalid_table_that_does_not_exist;");
    }).toThrow();

    engine.close();
  });
});
