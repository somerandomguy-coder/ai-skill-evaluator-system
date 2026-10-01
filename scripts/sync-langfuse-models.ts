/**
/**
 * Synchronizes AI model pricing from MODELS_AND_PRICING_CATALOG.md with Langfuse.
 *
 * This ensures that Langfuse Cloud calculates exact token costs in USD for:
 *  - DeepSeek models (deepseek-flash, deepseek-v4-pro)
 *  - Latest OpenAI models (gpt-6-*, gpt-5.6-*, gpt-5.5-*, gpt-5.4-*)
 *
 * Usage:
 *   npx tsx scripts/sync-langfuse-models.ts
 */
import "dotenv/config";
import { Langfuse } from "langfuse";

const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
const baseUrl =
  process.env.LANGFUSE_BASE_URL?.trim() ||
  process.env.LANGFUSE_BASEURL?.trim() ||
  "https://cloud.langfuse.com";

if (!publicKey || !secretKey) {
  console.error("LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY is missing from environment.");
  process.exit(1);
}

const langfuse = new Langfuse({
  publicKey,
  secretKey,
  baseUrl,
});

interface ModelPriceDefinition {
  modelName: string;
  matchPattern: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

// Authoritative prices in USD per 1M tokens from MODELS_AND_PRICING_CATALOG.md
export const CATALOG_MODELS: ModelPriceDefinition[] = [
  // --- DeepSeek ---
  {
    modelName: "deepseek-flash",
    matchPattern: "(?i)^(deepseek-flash|deepseek/deepseek-flash|deepseek-v4-flash.*)$",
    inputPricePerMillion: 0.30, // Standard peak rate ($0.15 off-peak)
    outputPricePerMillion: 1.20,
  },
  {
    modelName: "deepseek-v4-pro",
    matchPattern: "(?i)^(deepseek-v4-pro|deepseek/deepseek-v4-pro.*)$",
    inputPricePerMillion: 1.32, // Standard peak rate ($0.66 off-peak)
    outputPricePerMillion: 3.96,
  },

  // --- OpenAI Flagship / Latest ---
  {
    modelName: "gpt-6-astra",
    matchPattern: "(?i)^(gpt-6-astra.*)$",
    inputPricePerMillion: 10.00,
    outputPricePerMillion: 50.00,
  },
  {
    modelName: "gpt-6.1-sol",
    matchPattern: "(?i)^(gpt-6.1-sol.*)$",
    inputPricePerMillion: 2.00,
    outputPricePerMillion: 10.00,
  },
  {
    modelName: "gpt-6-luna",
    matchPattern: "(?i)^(gpt-6-luna.*)$",
    inputPricePerMillion: 0.10,
    outputPricePerMillion: 0.50,
  },
  {
    modelName: "gpt-6-sol",
    matchPattern: "(?i)^(gpt-6-sol.*)$",
    inputPricePerMillion: 2.00,
    outputPricePerMillion: 10.00,
  },
  {
    modelName: "gpt-5.6-sol",
    matchPattern: "(?i)^(gpt-5.6-sol.*)$",
    inputPricePerMillion: 4.00,
    outputPricePerMillion: 20.00,
  },
  {
    modelName: "gpt-5.6-terra",
    matchPattern: "(?i)^(gpt-5.6-terra.*)$",
    inputPricePerMillion: 2.00,
    outputPricePerMillion: 12.00,
  },
  {
    modelName: "gpt-5.6-luna",
    matchPattern: "(?i)^(gpt-5.6-luna.*)$",
    inputPricePerMillion: 0.20,
    outputPricePerMillion: 1.20,
  },
  {
    modelName: "gpt-5.5",
    matchPattern: "(?i)^(gpt-5.5(?!-pro).*)$",
    inputPricePerMillion: 5.00,
    outputPricePerMillion: 30.00,
  },
  {
    modelName: "gpt-5.5-pro",
    matchPattern: "(?i)^(gpt-5.5-pro.*)$",
    inputPricePerMillion: 30.00,
    outputPricePerMillion: 180.00,
  },
  {
    modelName: "gpt-5.4",
    matchPattern: "(?i)^(gpt-5.4(?!-pro|-mini|-nano).*)$",
    inputPricePerMillion: 2.50,
    outputPricePerMillion: 15.00,
  },
  {
    modelName: "gpt-5.4-pro",
    matchPattern: "(?i)^(gpt-5.4-pro.*)$",
    inputPricePerMillion: 30.00,
    outputPricePerMillion: 180.00,
  },
  {
    modelName: "gpt-5.4-mini",
    matchPattern: "(?i)^(gpt-5.4-mini.*)$",
    inputPricePerMillion: 0.75,
    outputPricePerMillion: 4.50,
  },
  {
    modelName: "gpt-5.4-nano",
    matchPattern: "(?i)^(gpt-5.4-nano.*)$",
    inputPricePerMillion: 0.20,
    outputPricePerMillion: 1.25,
  },
];

async function sync() {
  console.log(`[Langfuse Sync] Fetching registered models from ${baseUrl}...`);
  const existing = await langfuse.api.modelsList({});
  const existingMap = new Map((existing?.data ?? []).map((m) => [m.modelName, m]));

  for (const item of CATALOG_MODELS) {
    const inputPrice = item.inputPricePerMillion / 1_000_000;
    const outputPrice = item.outputPricePerMillion / 1_000_000;

    const current = existingMap.get(item.modelName);
    if (current && !current.isLangfuseManaged) {
      console.log(`[Langfuse Sync] Model "${item.modelName}" already registered (ID: ${current.id}).`);
      continue;
    }

    try {
      const created = await langfuse.api.modelsCreate({
        modelName: item.modelName,
        matchPattern: item.matchPattern,
        unit: "TOKENS",
        inputPrice,
        outputPrice,
      });
      console.log(`[Langfuse Sync] Successfully created "${item.modelName}" (ID: ${created.id}, In: $${item.inputPricePerMillion}/1M, Out: $${item.outputPricePerMillion}/1M USD)`);
    } catch (err: any) {
      console.warn(`[Langfuse Sync] Could not register "${item.modelName}":`, err?.message || err);
    }
  }

  console.log("[Langfuse Sync] Model price catalog sync completed.");
}

sync()
  .catch(console.error)
  .finally(() => langfuse.shutdownAsync());
