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

export type AiStage = "parse" | "research" | "challenge" | "assistant" | "evaluator";

export type AiProvider = "openai" | "deepseek" | "custom";

export function aiProvider(): AiProvider {
  const p = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  if (p === "deepseek" || (!process.env.OPENAI_API_KEY && Boolean(process.env.DEEPSEEK_API_KEY))) {
    return "deepseek";
  }
  if (p === "custom") return "custom";
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

  if (stage === "assistant" || stage === "parse" || stage === "research") {
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

/** Active API key based on selected provider. */
export function aiApiKey(): string | undefined {
  if (aiProvider() === "deepseek") {
    return deepseekApiKey() || openaiApiKey();
  }
  return openaiApiKey() || deepseekApiKey();
}

/** Base URL for OpenAI-compatible endpoints or DeepSeek. */
export function aiBaseUrl(): string | undefined {
  if (process.env.AI_BASE_URL?.trim()) return process.env.AI_BASE_URL.trim();
  if (aiProvider() === "deepseek") {
    return process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
  }
  if (process.env.OPENAI_BASE_URL?.trim()) return process.env.OPENAI_BASE_URL.trim();
  return undefined;
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

