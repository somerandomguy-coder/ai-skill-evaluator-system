import type { AssistantTurn } from "../ai/schemas";
import { WEAK_SESSION } from "./seed-sessions";

/**
 * Scripted assistant replies for DEMO_MODE, so the build workspace works with no
 * API key: the candidate's Nth message gets the Nth cached reply, whatever it
 * says. Every reply is prefixed so nobody mistakes it for a real response.
 *
 * The files come from the seeded weak session's assistant turns (a working,
 * deliberately naive reviewer console), so the preview visibly updates.
 */
const NOTE = "[Demo mode: this is a cached reply, not a response to your message.]";

const scripted: AssistantTurn[] = WEAK_SESSION.turns
  .filter((t) => t.role === "ASSISTANT")
  .map((t) => ({
    message: `${NOTE}\n\n${t.content}`,
    files: t.files ?? [],
    reasoning: t.reasoning ?? "",
  }));

export const DEMO_ASSISTANT_SCRIPT: readonly AssistantTurn[] = scripted;

export const DEMO_ASSISTANT_EXHAUSTED: AssistantTurn = {
  message: `${NOTE}\n\nThe demo has no further cached replies. Set DEMO_MODE=false and add an OpenAI API key to talk to the live assistant, or submit your session now.`,
  files: [],
  reasoning: "Demo mode script exhausted.",
};
