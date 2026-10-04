import { execSync } from "node:child_process";
import * as path from "node:path";

async function exportRequirements() {
  console.log("[export-requirements] Building curated 100 benchmark dataset...");
  const scriptPath = path.join(process.cwd(), "scripts", "build_curated_100.py");
  execSync(`python3 "${scriptPath}"`, { stdio: "inherit" });
  console.log("[export-requirements] Successfully exported 100 challenges and 700 requirements.");
}

exportRequirements().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
