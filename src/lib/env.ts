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
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

/** Model for a pipeline stage: stage override -> global override -> provider default. */
export function modelFor(stage: AiStage): string {
  const stageVar = process.env[`OPENAI_MODEL_${stage.toUpperCase()}`] || process.env[`AI_MODEL_${stage.toUpperCase()}`];
  if (stageVar?.trim()) return stageVar.trim();
  const globalVar = process.env.OPENAI_MODEL?.trim() || process.env.AI_MODEL?.trim();
  if (globalVar) return globalVar;

  if (aiProvider() === "deepseek") {
    return DEFAULT_DEEPSEEK_MODEL;
  }
  return DEFAULT_OPENAI_MODEL;
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

