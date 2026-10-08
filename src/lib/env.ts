/**
 * Environment access. Server-side only: nothing here may be imported by a
 * client component (the OpenAI key must never reach the browser).
 */

export function isDemoMode(): boolean {
  const v = process.env.DEMO_MODE?.toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isFastPipeline(): boolean {
  const v = process.env.FAST_PIPELINE?.toLowerCase() || process.env.NEXT_PUBLIC_FAST_PIPELINE?.toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export type AiStage = "classify" | "parse" | "research" | "challenge" | "assistant" | "evaluator" | "inspect";

export type AiProvider = "openai" | "deepseek" | "custom";

export function aiProvider(): AiProvider {
  const p = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  if (p === "deepseek") return "deepseek";
  if (p === "openai") return "openai";
  if (p === "custom") return "custom";
  if (!process.env.OPENAI_API_KEY && Boolean(process.env.DEEPSEEK_API_KEY)) {
    return "deepseek";
  }
  return "openai";
}

const DEFAULT_OPENAI_MODEL = "gpt-5.5";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-flash";

/** Model for a pipeline stage: stage override -> global override -> provider default. */
export function modelFor(stage: AiStage): string {
  if (aiProvider() === "deepseek") {
    const stageVar = process.env[`DEEPSEEK_MODEL_${stage.toUpperCase()}`] || process.env[`AI_MODEL_${stage.toUpperCase()}`];
    if (stageVar?.trim()) return stageVar.trim();
    const dsModel = process.env.DEEPSEEK_MODEL?.trim() || process.env.AI_MODEL?.trim();
    if (dsModel) return dsModel;
    const globalVar = process.env.OPENAI_MODEL?.trim();
    if (globalVar && !globalVar.toLowerCase().startsWith("gpt-")) return globalVar;
    return DEFAULT_DEEPSEEK_MODEL;
  }

  const stageVar = process.env[`OPENAI_MODEL_${stage.toUpperCase()}`] || process.env[`AI_MODEL_${stage.toUpperCase()}`];
  if (stageVar?.trim()) return stageVar.trim();
  const globalVar = process.env.OPENAI_MODEL?.trim() || process.env.AI_MODEL?.trim();
  if (globalVar) return globalVar;

  return DEFAULT_OPENAI_MODEL;
}

/**
 * Determine if DeepSeek Thinking Mode should be enabled for a given stage.
 * Defaults:
 *   - "assistant", "parse", "research": false (prevents token budget exhaustion and cuts latency from 30s to <1.5s)
 *   - "evaluator", "challenge": true if using pro/reasoner models or explicitly requested
 * Overrides:
 *   - DEEPSEEK_THINKING_<STAGE>=true|false
 *   - DEEPSEEK_THINKING=true|false
 */
export function isDeepSeekThinkingEnabled(stage: AiStage, model: string): boolean {
  const stageVar = process.env[`DEEPSEEK_THINKING_${stage.toUpperCase()}`];
  if (stageVar !== undefined) return stageVar.toLowerCase() === "true" || stageVar === "1";

  const globalVar = process.env.DEEPSEEK_THINKING;
  if (globalVar !== undefined) return globalVar.toLowerCase() === "true" || globalVar === "1";

  if (stage === "assistant" || stage === "parse" || stage === "research" || stage === "classify" || stage === "inspect") {
    return false;
  }

  return model.includes("pro") || model.includes("reasoner");
}

export function openaiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key ? key : undefined;
}

export function deepseekApiKey(): string | undefined {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  return key ? key : undefined;
}

/** Active API key based on selected provider. Never leaks cross-vendor credentials (Row A01). */
export function aiApiKey(): string | undefined {
  const provider = aiProvider();
  if (provider === "deepseek") {
    return deepseekApiKey();
  }
  if (provider === "openai") {
    return openaiApiKey();
  }
  if (provider === "custom") {
    return process.env.CUSTOM_AI_API_KEY?.trim() || undefined;
  }
  return undefined;
}

/** Base URL for OpenAI-compatible endpoints or DeepSeek. */
export function aiBaseUrl(): string | undefined {
  if (process.env.AI_BASE_URL?.trim()) return process.env.AI_BASE_URL.trim();
  if (aiProvider() === "deepseek") {
    return process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
  }
  if (aiProvider() === "openai") {
    return process.env.OPENAI_BASE_URL?.trim() || undefined;
  }
  return process.env.CUSTOM_AI_BASE_URL?.trim() || undefined;
}

export interface ProviderConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

/**
 * Resolves provider, model, key, and baseURL as one coherent configuration (Row A01-A03).
 * Refuses cross-vendor key substitution.
 */
export function resolveProviderConfig(stage: AiStage): ProviderConfig {
  const provider = aiProvider();
  let apiKey: string | undefined;
  let baseUrl: string | undefined;

  if (provider === "deepseek") {
    apiKey = deepseekApiKey();
    baseUrl = process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
    if (!apiKey) {
      const err = new Error("DeepSeek provider selected, but DEEPSEEK_API_KEY is not configured. Cross-vendor key fallback is prohibited.");
      (err as any).code = "missing_deepseek_key";
      throw err;
    }
  } else if (provider === "openai") {
    apiKey = openaiApiKey();
    baseUrl = process.env.OPENAI_BASE_URL?.trim() || undefined;
    if (!apiKey) {
      const err = new Error("OpenAI provider selected, but OPENAI_API_KEY is not configured. Cross-vendor key fallback is prohibited.");
      (err as any).code = "missing_openai_key";
      throw err;
    }
  } else if (provider === "custom") {
    apiKey = process.env.CUSTOM_AI_API_KEY?.trim();
    baseUrl = process.env.AI_BASE_URL?.trim() || process.env.CUSTOM_AI_BASE_URL?.trim();
    if (!apiKey) {
      const err = new Error("Custom provider selected, but CUSTOM_AI_API_KEY is not configured.");
      (err as any).code = "missing_custom_key";
      throw err;
    }
  }

  const model = modelFor(stage);
  return { provider, model, apiKey: apiKey!, baseUrl };
}

export type EmbeddingProvider = "openai" | "custom" | "deterministic";

export function embeddingProvider(): EmbeddingProvider {
  const p = (process.env.EMBEDDING_PROVIDER || "").toLowerCase().trim();
  if (p === "custom") return "custom";
  if (p === "deterministic") return "deterministic";
  if (p === "openai" || process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY) return "openai";
  return "deterministic";
}

export function embeddingApiKey(): string | undefined {
  return process.env.EMBEDDING_API_KEY?.trim() || openaiApiKey();
}

export function embeddingBaseUrl(): string | undefined {
  return process.env.EMBEDDING_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim() || undefined;
}

export function embeddingModel(): string {
  return process.env.EMBEDDING_MODEL?.trim() || process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
}

export function currentEmbeddingSpace(): string {
  const provider = embeddingProvider();
  if (provider === "deterministic") return "deterministic-128";
  return `${provider}/${embeddingModel()}`;
}

export function langfusePublicKey(): string | undefined {
  return process.env.LANGFUSE_PUBLIC_KEY?.trim() || undefined;
}

export function langfuseSecretKey(): string | undefined {
  return process.env.LANGFUSE_SECRET_KEY?.trim() || undefined;
}

export function langfuseBaseUrl(): string {
  return (
    process.env.LANGFUSE_BASE_URL?.trim() ||
    process.env.LANGFUSE_BASEURL?.trim() ||
    process.env.LANGFUSE_HOST?.trim() ||
    "https://cloud.langfuse.com"
  );
}

export function isLangfuseEnabled(): boolean {
  return Boolean(langfusePublicKey() && langfuseSecretKey());
}

