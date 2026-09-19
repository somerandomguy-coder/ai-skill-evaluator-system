/**
 * Environment access. Server-side only: nothing here may be imported by a
 * client component (the OpenAI key must never reach the browser).
 */

export function isDemoMode(): boolean {
  const v = process.env.DEMO_MODE?.toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export type AiStage = "parse" | "research" | "challenge" | "assistant" | "evaluator";

const DEFAULT_MODEL = "gpt-5.5";

/** Model for a pipeline stage: stage override -> global override -> gpt-5.5. */
export function modelFor(stage: AiStage): string {
  const stageVar = process.env[`OPENAI_MODEL_${stage.toUpperCase()}`];
  return stageVar?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function openaiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key ? key : undefined;
}
