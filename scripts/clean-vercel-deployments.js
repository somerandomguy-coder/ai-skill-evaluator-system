/**
 * Clean Inactive / Preview Deployments on Vercel
 * 
 * Usage:
 *   VERCEL_TOKEN="your_token_here" node scripts/clean-vercel-deployments.js
 * 
 * To get a Vercel Token:
 *   Vercel Dashboard -> Account Settings -> Tokens -> Create Token (Scope: Full Account or Project)
 */

const https = require("node:https");

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_NAME = process.env.VERCEL_PROJECT || "ai-skill-evaluator-system";

if (!VERCEL_TOKEN) {
  console.log(`
[ERROR] Missing VERCEL_TOKEN environment variable.

How to run this script:
1. Go to https://vercel.com/account/tokens and generate a token.
2. Run:
   VERCEL_TOKEN="your_token" node scripts/clean-vercel-deployments.js
`);
  process.exit(1);
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://api.vercel.com${path}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function main() {
  console.log(`\n🔍 Fetching deployments for project: ${PROJECT_NAME}...`);
  const res = await request(`/v6/deployments?projectId=${PROJECT_NAME}&limit=100`);

  if (res.status !== 200 || !res.body.deployments) {
    console.error(`Failed to fetch deployments (status ${res.status}):`, res.body);
    return;
  }

  const deployments = res.body.deployments;
  console.log(`Found ${deployments.length} total deployments.`);

  let deletedCount = 0;
  let skippedCount = 0;

  for (const dep of deployments) {
    // Keep ONLY the active production deployment on main
    const isProduction = dep.target === "production" || dep.meta?.githubCommitRef === "main";
    const isReady = dep.state === "READY";

    if (isProduction && isReady && skippedCount === 0) {
      console.log(`🛡️  KEEPING ACTIVE PRODUCTION: ${dep.url} (Commit: ${dep.meta?.githubCommitMessage?.slice(0, 40) || "N/A"})`);
      skippedCount++;
      continue;
    }

    console.log(`🗑️  Deleting inactive deployment: ${dep.uid} (${dep.url}) [Branch: ${dep.meta?.githubCommitRef || "preview"}]...`);
    const delRes = await request(`/v13/deployments/${dep.uid}`, { method: "DELETE" });

    if (delRes.status === 200 || delRes.status === 204) {
      deletedCount++;
    } else {
      console.warn(`   ⚠️ Could not delete ${dep.uid}:`, delRes.body?.error?.message || delRes.body);
    }
  }

  console.log(`\n✅ Finished cleaning! Deleted ${deletedCount} deployments. Kept active production deployment.`);
  console.log(`Your Vercel storage will now drop significantly.`);
}

main().catch(console.error);
