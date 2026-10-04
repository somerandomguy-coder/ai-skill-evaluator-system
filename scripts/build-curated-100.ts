/**
 * TypeScript Runner for Curated 100 Benchmark Dataset Builder
 * Invokes scripts/build_curated_100.py to emit:
 *   - data-export/requirements-dataset.json (700 items)
 *   - data-export/requirements-dataset.csv (701 rows with header)
 */
import { execSync } from "node:child_process";
import * as path from "node:path";

console.log("[build-curated-100] Invoking Python dataset builder...");
const scriptPath = path.join(process.cwd(), "scripts", "build_curated_100.py");
execSync(`python3 "${scriptPath}"`, { stdio: "inherit" });
console.log("[build-curated-100] Dataset build complete!");

