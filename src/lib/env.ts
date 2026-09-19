/**
 * Environment access. Server-side only: nothing here may be imported by a
 * client component (the Anthropic key must never reach the browser).
 */

export function isDemoMode(): boolean {
  const v = process.env.DEMO_MODE?.toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export type AiStage = "parse" | "research" | "challenge" | "assistant" | "evaluator";

const DEFAULT_MODEL = "claude-opus-5";

/** Model for a pipeline stage: stage override -> global override -> claude-opus-5. */
export function modelFor(stage: AiStage): string {
  const stageVar = process.env[`ANTHROPIC_MODEL_${stage.toUpperCase()}`];
  return stageVar?.trim() || process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function anthropicApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? key : undefined;
}

/**
 * Server-side refusal fallbacks (beta). "default" lets the API re-run a request
 * the safety classifier declined on Anthropic's recommended fallback model.
 * Anything other than "default" turns it off and uses the plain endpoint.
 */
export function refusalFallbacksEnabled(): boolean {
  return (process.env.ANTHROPIC_REFUSAL_FALLBACKS ?? "default").toLowerCase() === "default";
}
