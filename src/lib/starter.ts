/**
 * The pre-scaffolded project every candidate starts from.
 *
 * Design goals, in order:
 *  1. It must boot inside a WebContainer without surprises (reliability on stage).
 *  2. `npm install` must be fast, so dependencies are minimal.
 *
 * How goal 2 is met:
 *  - No @vitejs/plugin-react. That plugin pulls in Babel and roughly 100 extra
 *    packages. Vite's built-in esbuild transform handles JSX via
 *    `esbuild.jsx = "automatic"`, at the cost of full-page reloads instead of
 *    React Fast Refresh — irrelevant for a preview pane.
 *  - A pinned package-lock.json ships with the template, so the container skips
 *    dependency resolution and only downloads tarballs.
 *  - `overrides.rollup -> @rollup/wasm-node`: Vite 5 uses Rollup 4, whose native
 *    binaries cannot execute inside a WebContainer.
 *
 * The lockfile was produced with:
 *   npm install --package-lock-only --ignore-scripts   (package.json below)
 */
import type { FileMap } from "./files";
import lock from "./starter-lock.json";

export const BASE_VERSIONS = {
  react: "18.3.1",
  "react-dom": "18.3.1",
  vite: "5.4.21",
} as const;

export const BASE_PACKAGE_JSON = {
  name: "candidate-project",
  private: true,
  version: "0.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "vite build",
  },
  dependencies: {
    react: BASE_VERSIONS.react,
    "react-dom": BASE_VERSIONS["react-dom"],
  },
  devDependencies: {
    vite: BASE_VERSIONS.vite,
  },
  overrides: {
    rollup: "npm:@rollup/wasm-node",
  },
} as const;

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Candidate project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const VITE_CONFIG = `import { defineConfig } from "vite";

// No @vitejs/plugin-react on purpose: esbuild compiles JSX, which keeps
// \`npm install\` fast inside the browser sandbox.
export default defineConfig({
  esbuild: { jsx: "automatic" },
});
`;

const MAIN_JSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const APP_JSX = `export default function App() {
  return (
    <main className="shell">
      <h1>Your project starts here</h1>
      <p>
        Nothing has been built yet. Describe what you want in the chat and the
        assistant will write the code.
      </p>
    </main>
  );
}
`;

const STYLES_CSS = `:root {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #1a1a1a;
  background: #fafaf9;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.shell {
  max-width: 720px;
  margin: 12vh auto;
  padding: 0 24px;
}

.shell h1 {
  font-size: 1.6rem;
  margin: 0 0 0.5rem;
}

.shell p {
  color: #555;
  line-height: 1.6;
}
`;

/** Files a generated starter may never replace: they keep the container bootable. */
export const PROTECTED_STARTER_PATHS: ReadonlySet<string> = new Set([
  "package.json",
  "package-lock.json",
  "vite.config.js",
  "index.html",
  "src/main.jsx",
]);

export const BASE_STARTER: FileMap = Object.freeze({
  "package.json": JSON.stringify(BASE_PACKAGE_JSON, null, 2) + "\n",
  "package-lock.json": JSON.stringify(lock, null, 2) + "\n",
  "vite.config.js": VITE_CONFIG,
  "index.html": INDEX_HTML,
  "src/main.jsx": MAIN_JSX,
  "src/App.jsx": APP_JSX,
  "src/styles.css": STYLES_CSS,
}) as FileMap;

/**
 * Layer a challenge-specific starter (seed data, stub components, a README) over
 * the base template. Protected files always come from the base, so a generated
 * starter can never change dependencies or the entry point.
 */
export function mergeStarter(generated: FileMap): FileMap {
  const merged: FileMap = { ...BASE_STARTER };
  for (const [path, contents] of Object.entries(generated)) {
    if (PROTECTED_STARTER_PATHS.has(path)) continue;
    merged[path] = contents;
  }
  return merged;
}

export interface GuardedPackageJson {
  /** The package.json to persist and mount (base guarantees restored). */
  contents: string;
  /** Human-readable notes on anything that was adjusted. Empty when untouched. */
  notes: string[];
  /** False when the input was not valid JSON and the previous file was kept. */
  accepted: boolean;
}

/**
 * The build assistant rewrites whole files, including package.json. It is free
 * to add dependencies, but it must not break the runtime: the pinned versions,
 * the `dev` script and the rollup override are restored if they were dropped.
 */
export function guardPackageJson(raw: string, previous: string): GuardedPackageJson {
  const notes: string[] = [];
  let pkg: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    pkg = parsed as Record<string, unknown>;
  } catch {
    return {
      contents: previous,
      notes: ["package.json was not valid JSON, so the previous version was kept."],
      accepted: false,
    };
  }

  const asRecord = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {};

  const deps = asRecord(pkg.dependencies);
  const devDeps = asRecord(pkg.devDependencies);
  const scripts = asRecord(pkg.scripts);
  const overrides = asRecord(pkg.overrides);

  for (const name of ["react", "react-dom"] as const) {
    if (deps[name] !== BASE_VERSIONS[name]) {
      notes.push(`${name} is pinned to ${BASE_VERSIONS[name]} in this environment.`);
      deps[name] = BASE_VERSIONS[name];
    }
  }
  if (devDeps.vite !== BASE_VERSIONS.vite) {
    notes.push(`vite is pinned to ${BASE_VERSIONS.vite} in this environment.`);
    devDeps.vite = BASE_VERSIONS.vite;
  }
  if (scripts.dev !== "vite") {
    notes.push('The "dev" script must stay "vite"; restored.');
    scripts.dev = "vite";
  }
  if (overrides.rollup !== BASE_PACKAGE_JSON.overrides.rollup) {
    notes.push("Restored the rollup override that lets Vite run inside the browser sandbox.");
    overrides.rollup = BASE_PACKAGE_JSON.overrides.rollup;
  }

  const next = { ...pkg, type: "module", scripts, dependencies: deps, devDependencies: devDeps, overrides };
  return { contents: JSON.stringify(next, null, 2) + "\n", notes, accepted: true };
}

/** True when the dependency-relevant parts of two package.json files differ. */
export function dependenciesChanged(a: string | undefined, b: string | undefined): boolean {
  if (a === b) return false;
  try {
    const pick = (s: string | undefined) => {
      const p = s ? (JSON.parse(s) as Record<string, unknown>) : {};
      return JSON.stringify([p.dependencies ?? {}, p.devDependencies ?? {}, p.overrides ?? {}]);
    };
    return pick(a) !== pick(b);
  } catch {
    return true;
  }
}
