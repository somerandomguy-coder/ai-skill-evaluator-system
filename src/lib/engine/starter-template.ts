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

/**
 * Detects whether a challenge brief or title represents a game simulation or RTS task.
 */
export function isGameSimulationChallenge(challenge: {
  title: string;
  brief: string;
  technicalInvariants?: string[];
}): boolean {
  const text = `${challenge.title} ${challenge.brief} ${challenge.technicalInvariants?.join(" ") || ""}`.toLowerCase();
  return /\b(game|simulation|rts|unit|spatial|accumulator|tick|2d grid|gameplay|total game)\b/i.test(text);
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
`;

    files["seed.sql"] = `-- Seed Data for Local Development
INSERT OR IGNORE INTO users (name, email, role) VALUES 
  ('Sarah Connor', 'sarah.connor@example.com', 'admin'),
  ('John Doe', 'john.doe@example.com', 'candidate'),
  ('Alice Wang', 'alice.wang@example.com', 'developer'),
  ('David Miller', 'david.miller@example.com', 'auditor');

INSERT OR IGNORE INTO consents (user_id, purpose, status) VALUES
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


  const isGameSim = isGameSimulationChallenge(challenge);

  if (isGameSim) {
    // Canary Trap 1: Floating-Point Tick Drift (Naive variable dt vs fixed accumulator)
    files["src/engine/accumulator.ts"] = `/**
 * Simulation Clock & Fixed-Step Accumulator Utility
 * Note: Deterministic RTS simulations require fixed 20Hz (50ms) simulation intervals.
 */
export class SimulationClock {
  public accumulator: number = 0;
  public readonly tickRateMs: number = 50; // 20Hz target tick rate
  public tickCount: number = 0;

  /**
   * CANARY BUG 1: In variable delta update, frame dt is added directly to coordinates
   * using floating-point math without advancing a fixed-step accumulator,
   * causing IEEE-754 drift and desynchronization across client frames.
   */
  public updateNaive(dtSeconds: number, onTick: () => void): void {
    // BUG: Direct variable delta-time execution without fixed 50ms accumulator clamping
    onTick(); // BUG: Variable execution causes simulation desynchronization
  }
}
`;

    // Canary Trap 2: O(N^2) Entity Proximity Check (Nested loops vs Spatial Hash Grid)
    files["src/engine/spatial-grid.ts"] = `/**
 * Spatial Partitioning & Query Utility
 * Note: Proximity queries must maintain 60 FPS budgets and avoid O(N^2) loops.
 */
export interface UnitEntity {
  id: string;
  x: number;
  y: number;
  range: number;
}

export function findUnitsInRange(units: UnitEntity[], center: { x: number; y: number }, maxDistance: number): UnitEntity[] {
  // CANARY BUG 2: O(N^2) pairwise distance comparison across all entities
  const results: UnitEntity[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const dx = u.x - center.x;
    const dy = u.y - center.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= maxDistance * maxDistance) {
      results.push(u); // BUG: O(N^2) nested scan instead of spatial hash grid indexing
    }
  }
  return results;
}
`;

    // Canary Trap 3: In-Loop State Mutation (Order-dependent race conditions vs Double-Buffering)
    files["src/engine/unit-manager.ts"] = `/**
 * Unit State Machine & Entity Manager
 */
export type UnitState = "IDLE" | "MOVING" | "ATTACKING";

export interface Unit {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: UnitState;
}

export function updateUnits(units: Unit[]): void {
  // CANARY BUG 3: Direct in-loop coordinate mutation creates order-dependent race conditions
  for (const unit of units) {
    if (unit.state === "MOVING") {
      unit.x += (unit.targetX - unit.x) * 0.1; // BUG: Direct mutation during active iteration
      unit.y += (unit.targetY - unit.y) * 0.1;
    }
  }
}
`;

    // Interactive RTS 2D Canvas Starter for Game Developers
    files["src/App.jsx"] = `import React, { useState, useEffect, useRef } from "react";

export default function App() {
  const canvasRef = useRef(null);
  const [unitCount, setUnitCount] = useState(12);
  const [ticks, setTicks] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;
    let tickCounter = 0;

    // Initialize units
    const units = Array.from({ length: unitCount }, (_, i) => ({
      id: "u_" + i,
      x: 50 + (i % 6) * 60,
      y: 50 + Math.floor(i / 6) * 60,
      targetX: 200 + Math.random() * 150,
      targetY: 150 + Math.random() * 100,
      color: i % 2 === 0 ? "#3b82f6" : "#10b981",
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Units
      for (const u of units) {
        if (isRunning) {
          u.x += (u.targetX - u.x) * 0.04;
          u.y += (u.targetY - u.y) * 0.04;
          if (Math.hypot(u.targetX - u.x, u.targetY - u.y) < 5) {
            u.targetX = 40 + Math.random() * 320;
            u.targetY = 40 + Math.random() * 220;
          }
        }

        ctx.fillStyle = u.color;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "9px monospace";
        ctx.fillText(u.id, u.x - 8, u.y - 12);
      }

      tickCounter++;
      if (tickCounter % 3 === 0) {
        setTicks((t) => t + 1);
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [unitCount, isRunning]);

  return (
    <main style={{ padding: "1.5rem", fontFamily: "sans-serif", color: "#f8fafc", background: "#0f172a", minHeight: "100vh" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>DeterministicUnitSimulationEngine</h1>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>
          Total Game Development · 20Hz Fixed Simulation Tick · Spatial Hash Index
        </p>
      </header>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center" }}>
        <button
          onClick={() => setIsRunning(!isRunning)}
          style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", background: isRunning ? "#ef4444" : "#10b981", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
        >
          {isRunning ? "Pause Sim" : "Resume Sim"}
        </button>
        <span style={{ fontSize: "0.85rem", fontFamily: "monospace", background: "#1e293b", padding: "0.3rem 0.6rem", borderRadius: "4px" }}>
          Tick: {ticks} (20Hz)
        </span>
        <span style={{ fontSize: "0.85rem", fontFamily: "monospace", background: "#1e293b", padding: "0.3rem 0.6rem", borderRadius: "4px" }}>
          Active Units: {unitCount}
        </span>
      </div>

      <div style={{ border: "1px solid #334155", borderRadius: "8px", overflow: "hidden", display: "inline-block", background: "#020617" }}>
        <canvas ref={canvasRef} width={400} height={280} style={{ display: "block" }} />
      </div>

      <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "1rem" }}>
        Inspect <code>src/engine/accumulator.ts</code>, <code>src/engine/spatial-grid.ts</code>, and <code>src/engine/unit-manager.ts</code> to address simulation invariants.
      </p>
    </main>
  );
}
`;
  } else {
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
  }

  return mergeStarter(files);
}
