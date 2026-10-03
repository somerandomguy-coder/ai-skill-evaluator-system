import { mergeStarter } from "../starter";

/**
 * Generates clean, role-tailored starter workspace files for candidate challenges.
 * Replaces legacy hardcoded prototype seed files (teams.json, responses.json, summaries.json)
 * while preserving base boot files (package.json, vite.config.js, index.html) for WebContainer runtime.
 */
/**
 * Detects whether a challenge brief or title represents a backend / fullstack / database task.
 */
export function isBackendChallenge(challenge: {
  title: string;
  brief: string;
  technicalInvariants?: string[];
}): boolean {
  const text = `${challenge.title} ${challenge.brief} ${challenge.technicalInvariants?.join(" ") || ""}`.toLowerCase();
  return /\b(backend|database|sqlite|sql|relational|postgresql|postgres|express|node\.js|nodejs|server-side|cdr gateway)\b/i.test(text);
}

export const makeStarterFiles = buildRoleStarterTemplate;

export function buildRoleStarterTemplate(challenge: {
  title: string;
  brief: string;
  technicalInvariants?: string[];
  starterSchemas?: Record<string, string>;
}): Record<string, string> {
  const files: Record<string, string> = {};
  const isBackend = isBackendChallenge(challenge);

  const invariants = challenge.technicalInvariants?.length
    ? `\n\n## Technical Invariants & Constraints\n${challenge.technicalInvariants.map((inv) => `- ${inv}`).join("\n")}`
    : "";

  const fullstackNotes = isBackend
    ? `\n\n## Fullstack Node-SQLite Architecture\n- **Backend Server**: \`server.js\` provides a Node.js REST API service.\n- **Database Engine**: \`schema.sql\` configures your relational SQLite schema.\n- **Database Console**: Use the interactive SQLite tab to query and inspect tables.\n`
    : "";

  files["README.md"] = `# ${challenge.title}\n\n${challenge.brief}${invariants}${fullstackNotes}\n\n## Candidate Workspace Instructions\n1. Review the brief and technical constraints above.\n2. Write your implementation files in \`src/\`.\n3. Validate boundary conditions, privacy sanitization, and domain rules.\n`;

  if (challenge.starterSchemas && Object.keys(challenge.starterSchemas).length > 0) {
    for (const [filename, content] of Object.entries(challenge.starterSchemas)) {
      const path = filename.startsWith("src/") ? filename : `src/${filename}`;
      files[path] = content;
    }
  } else {
    files["src/index.ts"] = `/**\n * Solution Module for: ${challenge.title}\n * Grounded in SFIA 9 & Evidence-Centered Design\n */\n\nexport function execute() {\n  // TODO: Implement solution logic adhering to the technical invariants\n}\n`;
  }

  // Fullstack Node-SQLite Template Additions for Backend Tasks
  if (isBackend) {
    files["schema.sql"] = `-- SQLite Relational Database Schema
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

-- Initial seed data for candidate testing
INSERT INTO users (name, email, role) VALUES 
  ('Sarah Connor', 'sarah.connor@example.com', 'admin'),
  ('John Doe', 'john.doe@example.com', 'candidate'),
  ('Alice Wang', 'alice.wang@example.com', 'developer');

INSERT INTO consents (user_id, purpose, status) VALUES
  (1, 'CDR Banking Data Access', 'ACTIVE'),
  (2, 'Taxation Automated Reporting', 'ACTIVE'),
  (3, 'Diagnostics & Error Telemetry', 'REVOKED');
`;

    files["seed.sql"] = `-- Seed Data for Local Development
INSERT INTO users (name, email, role) VALUES 
  ('Sarah Connor', 'sarah.connor@example.com', 'admin'),
  ('John Doe', 'john.doe@example.com', 'candidate'),
  ('Alice Wang', 'alice.wang@example.com', 'developer'),
  ('David Miller', 'david.miller@example.com', 'auditor');

INSERT INTO consents (user_id, purpose, status) VALUES
  (1, 'CDR Banking Data Access', 'ACTIVE'),
  (2, 'Taxation Automated Reporting', 'ACTIVE'),
  (3, 'Diagnostics & Error Telemetry', 'REVOKED'),
  (4, 'Payroll Compliance Verification', 'ACTIVE');

INSERT INTO audit_logs (action, user_id, details) VALUES
  ('AUTH_LOGIN', 'usr_981a', 'Successful passkey verification'),
  ('CONSENT_GRANTED', 'usr_981a', 'Banking data access approved'),
  ('CDR_GATEWAY_ACCESS', 'usr_420b', 'Disaggregated gross wages calculated');
`;

    files["server.js"] = `/**
 * Backend Node.js Service (Fullstack Runtime)
 * Exposes a lightweight REST API that interfaces with SQLite.
 */
import http from "node:http";

const PORT = 3001;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", \`http://\${req.headers.host}\`);

  if (url.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "backend-node-sqlite", uptime: process.uptime() }));
    return;
  }

  if (url.pathname === "/api/records") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      data: [
        { id: 1, name: "CDR Banking Gateway", status: "ACTIVE" },
        { id: 2, name: "Statutory Payroll Invariant", status: "VERIFIED" }
      ]
    }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

server.listen(PORT, () => {
  console.log(\`[backend] Node.js service running on port \${PORT}\`);
});
`;

    files["src/utils/db.ts"] = `/**
 * SQLite Entity Types & Client Helpers
 */
export interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface ConsentRecord {
  id: number;
  user_id: number;
  purpose: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  created_at: string;
}

export interface AuditRecord {
  id: number;
  action: string;
  user_id?: string;
  details?: string;
  timestamp: string;
}
`;
  }


  // Planted Bug 1: Currency & Float Precision (Floating-point division drift & USD default)
  files["src/utils/currency.ts"] = `/**
 * Financial & Currency Calculation Utilities
 * Note: Enterprise Australian compliance requires strict precision.
 */

/**
 * Calculates line-item totals with standard rounding.
 */
export function calculateLineTotal(quantity: number, unitPriceCents: number): number {
  // SUBTLE DOMAIN BUG 1: Floating-point currency division introduces IEEE-754 drift
  const unitDollars = unitPriceCents / 100;
  return Math.round(quantity * unitDollars * 100);
}

/**
 * Formats monetary amounts for user display.
 */
export function formatCurrency(cents: number, currency = "USD"): string {
  // SUBTLE DOMAIN BUG 1b: Defaults to USD instead of target Australian jurisdiction (AUD)
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
`;

  // Planted Bug 2: Data Privacy & Identity Leak (Unmasked userId in logger)
  files["src/utils/audit.ts"] = `/**
 * Audit Logging & Diagnostics Utility
 * Note: Enterprise compliance requires rigorous PII sanitization in all system logs.
 */
export interface AuditContext {
  action: string;
  userId?: string;
  email?: string;
  details?: Record<string, unknown>;
}

export function logAudit(context: AuditContext): void {
  // Masks email address
  const sanitizedEmail = context.email
    ? context.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : undefined;

  // SUBTLE DOMAIN BUG 2: unmasked userId / identity field passed directly to audit output
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      action: context.action,
      email: sanitizedEmail,
      userId: context.userId, // BUG: Identity field unmasked in logger output
      ...context.details,
    })
  );
}
`;

  // Planted Bug 3: Boundary & Capacity Invariant (Missing negative / underflow check)
  files["src/utils/capacity.ts"] = `/**
 * Capacity & Boundary Verification Utility
 * Note: Robust systems must validate capacity limits and avoid underflow conditions.
 */
export interface CapacityLimit {
  current: number;
  maximum: number;
}

/**
 * Validates whether incoming workload fits within active capacity boundaries.
 */
export function hasAvailableCapacity(limit: CapacityLimit): boolean {
  // SUBTLE DOMAIN BUG 3: Missing underflow guard for negative values (< 0)
  return limit.current < limit.maximum;
}
`;

  // Provide a clean, welcoming starter component tailored to the challenge
  files["src/App.jsx"] = `export default function App() {
  return (
    <main className="shell">
      <h1>${challenge.title.replace(/"/g, '&quot;')}</h1>
      <p>
        Review the brief in <code>README.md</code>, or message the AI assistant to start implementing your solution.
      </p>
    </main>
  );
}
`;

  return mergeStarter(files);
}
