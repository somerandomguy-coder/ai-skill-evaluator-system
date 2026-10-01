/**
 * AI Model Pricing Catalog & Cost Calculation Utility.
 *
 * All rates and calculated costs are strictly in American Dollars (USD / $).
 * Grounded in docs/MODELS_AND_PRICING_CATALOG.md.
 */

export interface ModelPricing {
  modelName: string;
  matchPattern: RegExp;
  /** Price in USD per 1,000,000 input tokens */
  inputPerMillion: number;
  /** Price in USD per 1,000,000 cached input tokens (if applicable) */
  cachedInputPerMillion?: number;
  /** Price in USD per 1,000,000 output tokens */
  outputPerMillion: number;
}

export const PRICING_CATALOG: ModelPricing[] = [
  // --- DeepSeek ---
  {
    modelName: "deepseek-flash",
    matchPattern: /deepseek-flash|deepseek-v4-flash/i,
    inputPerMillion: 0.30, // Standard peak ($0.15 off-peak)
    cachedInputPerMillion: 0.006, // Cache hit
    outputPerMillion: 1.20,
  },
  {
    modelName: "deepseek-v4-pro",
    matchPattern: /deepseek-v4-pro/i,
    inputPerMillion: 1.32, // Standard peak ($0.66 off-peak)
    cachedInputPerMillion: 0.044, // Cache hit
    outputPerMillion: 3.96,
  },

  // --- OpenAI Flagship / Latest ---
  {
    modelName: "gpt-6-astra",
    matchPattern: /gpt-6-astra/i,
    inputPerMillion: 10.00,
    cachedInputPerMillion: 1.00,
    outputPerMillion: 50.00,
  },
  {
    modelName: "gpt-6.1-sol",
    matchPattern: /gpt-6\.1-sol/i,
    inputPerMillion: 2.00,
    cachedInputPerMillion: 0.10,
    outputPerMillion: 10.00,
  },
  {
    modelName: "gpt-6-luna",
    matchPattern: /gpt-6-luna/i,
    inputPerMillion: 0.10,
    cachedInputPerMillion: 0.01,
    outputPerMillion: 0.50,
  },
  {
    modelName: "gpt-6-sol",
    matchPattern: /gpt-6-sol/i,
    inputPerMillion: 2.00,
    cachedInputPerMillion: 0.20,
    outputPerMillion: 10.00,
  },
  {
    modelName: "gpt-5.6-sol",
    matchPattern: /gpt-5\.6-sol/i,
    inputPerMillion: 4.00,
    cachedInputPerMillion: 0.40,
    outputPerMillion: 20.00,
  },
  {
    modelName: "gpt-5.6-terra",
    matchPattern: /gpt-5\.6-terra/i,
    inputPerMillion: 2.00,
    cachedInputPerMillion: 0.20,
    outputPerMillion: 12.00,
  },
  {
    modelName: "gpt-5.6-luna",
    matchPattern: /gpt-5\.6-luna/i,
    inputPerMillion: 0.20,
    cachedInputPerMillion: 0.02,
    outputPerMillion: 1.20,
  },
  {
    modelName: "gpt-5.5",
    matchPattern: /gpt-5\.5(?!-pro)/i,
    inputPerMillion: 5.00,
    cachedInputPerMillion: 0.50,
    outputPerMillion: 30.00,
  },
  {
    modelName: "gpt-5.5-pro",
    matchPattern: /gpt-5\.5-pro/i,
    inputPerMillion: 30.00,
    outputPerMillion: 180.00,
  },
  {
    modelName: "gpt-5.4",
    matchPattern: /gpt-5\.4(?!-pro|-mini|-nano)/i,
    inputPerMillion: 2.50,
    cachedInputPerMillion: 0.25,
    outputPerMillion: 15.00,
  },
  {
    modelName: "gpt-5.4-pro",
    matchPattern: /gpt-5\.4-pro/i,
    inputPerMillion: 30.00,
    outputPerMillion: 180.00,
  },
  {
    modelName: "gpt-5.4-mini",
    matchPattern: /gpt-5\.4-mini/i,
    inputPerMillion: 0.75,
    cachedInputPerMillion: 0.075,
    outputPerMillion: 4.50,
  },
  {
    modelName: "gpt-5.4-nano",
    matchPattern: /gpt-5\.4-nano/i,
    inputPerMillion: 0.20,
    cachedInputPerMillion: 0.02,
    outputPerMillion: 1.25,
  },
];

export interface CalculatedCost {
  currency: "USD";
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  model: string;
}

/**
 * Calculates exact token cost in USD for a given model and token usage.
 */
export function calculateCost(
  model: string,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  }
): CalculatedCost {
  const pricing = PRICING_CATALOG.find((p) => p.matchPattern.test(model));
  if (!pricing) {
    // Default fallback (uses modest standard pricing if unknown)
    const inputCostUsd = (usage.inputTokens * 2.0) / 1_000_000;
    const outputCostUsd = (usage.outputTokens * 10.0) / 1_000_000;
    return {
      currency: "USD",
      inputCostUsd,
      outputCostUsd,
      totalCostUsd: inputCostUsd + outputCostUsd,
      model,
    };
  }

  const cachedTokens = Math.min(usage.cachedInputTokens ?? 0, usage.inputTokens);
  const uncachedInputTokens = Math.max(0, usage.inputTokens - cachedTokens);

  const uncachedInputCost = (uncachedInputTokens * pricing.inputPerMillion) / 1_000_000;
  const cachedInputCost =
    pricing.cachedInputPerMillion != null
      ? (cachedTokens * pricing.cachedInputPerMillion) / 1_000_000
      : (cachedTokens * pricing.inputPerMillion) / 1_000_000;

  const inputCostUsd = uncachedInputCost + cachedInputCost;
  const outputCostUsd = (usage.outputTokens * pricing.outputPerMillion) / 1_000_000;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  return {
    currency: "USD",
    inputCostUsd,
    outputCostUsd,
    totalCostUsd,
    model,
  };
}

/** Formats a USD amount nicely for telemetry or UI */
export function formatCostUsd(amount: number): string {
  if (amount === 0) return "$0.00 USD";
  if (amount < 0.01) return `$${amount.toFixed(5)} USD`;
  return `$${amount.toFixed(4)} USD`;
}
