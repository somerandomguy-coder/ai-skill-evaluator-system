/** Progress events streamed while a challenge is built from a job description. Shared by server and client. */
export type PipelineStep = "read" | "parse" | "research" | "challenge" | "rubric" | "save";

export type PipelineEvent =
  | { type: "step"; step: PipelineStep; status: "start" | "done"; detail?: string }
  | { type: "done"; challengeId: string; demo: boolean; notice?: string }
  | { type: "error"; message: string };
