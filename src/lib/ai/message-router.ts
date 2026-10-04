/**
 * Naive Intent Router for Workspace AI Messages.
 * Splits candidate interactions into:
 *  - "ASK": conceptual questions, clarification, domain inquiries (concise answers, no files) - Quota: 30
 *  - "CODE": code generation, debugging, refactoring, implementation (files modified) - Quota: 20
 */

export type MessageTier = "ASK" | "CODE";

export const MAX_ASK_MESSAGES = 30;
export const MAX_CODE_MESSAGES = 20;

/**
 * Naive Intent Router to separate questions / clarification from coding / implementation.
 * (Can later be plugged into Jev's advanced routing system).
 */
export function routeMessageTier(message: string): MessageTier {
  const text = message.toLowerCase().trim();
  if (!text) return "ASK";

  // Explicit coding intent patterns (code generation / modification):
  const codePatterns = [
    /\b(write|create|code|implement|fix|refactor|generate|scaffold|build|patch|update|rewrite|modify|solve|debug)\b.*?\b(code|files?|functions?|class(es)?|methods?|components?|scripts?|tests?|endpoints?|apis?|bugs?|errors?|handlers?|logic|routes?|interfaces?|types?|everything|all|it|this|now|things|app|project|solution|system)\b/i,
    /\b(can you|please|help me)\s+(write|create|code|implement|fix|refactor|generate|scaffold|build|patch|add|update)\b/i,
    /\b(fix|solve|debug)\s+(the|this|my|that)?\s*(bug|issue|error|failure|test|typo)\b/i,
    /```[\s\S]*?```/, // candidate pasted code to work on
    /\b(in|into|for)\s+([a-zA-Z0-9_\-\.\/]+\.(ts|tsx|js|jsx|json|py|css|html|sql))\b/i,
    /\b(here is the code|here's my code|change this to|replace with)\b/i,
    /\b(commit|save to|write to)\b/i,
    /\b(make it pass|pass the tests|make the tests green)\b/i,
    /\b(code\s+everything|build\s+everything|implement\s+things|write\s+the\s+files|write\s+files|write\s+code)\b/i,
    /\b(start|proceed|ready|go ahead)\s+(to\s+)?(code|build|implement)\b/i,
    /^(code|build|implement|write|fix|create|refactor)\b/i,
  ];

  for (const pattern of codePatterns) {
    if (pattern.test(text)) {
      return "CODE";
    }
  }

  // Pure questioning / clarification / conversational patterns
  const askPatterns = [
    /^(what|why|how|who|where|when|which)\b/i,
    /\?$/, // ends with question mark
    /\b(explain|clarify|elaborate|describe|tell me about|what is|how does|what do you think)\b/i,
    /\b(does this|is there|are there|should I|can I|do we need)\b/i,
    /\b(trade-off|tradeoff|pros and cons|difference between|versus|vs)\b/i,
  ];

  for (const pattern of askPatterns) {
    if (pattern.test(text)) {
      return "ASK";
    }
  }

  // Pure questions with question marks default to ASK
  if (text.includes("?") && !/\b(code|build|write|implement|fix|refactor)\b/i.test(text)) {
    return "ASK";
  }

  // Casual short conversational greetings
  if (/^(hi|hello|hey|thanks|thank you|cool|ok|okay|got it|understood)\b/i.test(text)) {
    return "ASK";
  }

  return "CODE";
}

/**
 * Resolves the effective message tier considering both the user's explicit mode toggle
 * and the intent router:
 * 1. If user is in "ASK" mode: stays strictly in "ASK" mode (safe mode, file writes disabled).
 * 2. If user is in "CODE" (Build) mode: honors "CODE" mode so the user can build.
 *    Only auto-demotes if the user types a pure conceptual question with no coding keywords.
 * 3. If no user mode is provided, defaults to routeMessageTier(message).
 */
export function resolveEffectiveTier(
  message: string,
  userMode?: MessageTier
): { effectiveTier: MessageTier; reason: string; autoDemoted: boolean } {
  // 1. User explicitly selected Ask mode
  if (userMode === "ASK") {
    return {
      effectiveTier: "ASK",
      reason: "User selected Ask mode (safe mode, file writes disabled)",
      autoDemoted: false,
    };
  }

  // 2. User explicitly selected Build mode
  if (userMode === "CODE") {
    // Only auto-demote if the candidate typed a pure informational question with zero build intent
    // e.g., "What are the 5 ATO categories?" vs "Code everything, implement things please"
    const trimmed = message.trim();
    const isPureQuestion =
      /^(what|why|how|who|where|when|which|can you explain|explain|clarify)\b/i.test(trimmed) &&
      !/\b(code|build|write|implement|fix|refactor|create|make|generate)\b/i.test(trimmed);

    if (isPureQuestion) {
      return {
        effectiveTier: "ASK",
        reason: "Inquiry detected in Build mode — auto-routed to Ask to preserve your Build quota",
        autoDemoted: true,
      };
    }

    return {
      effectiveTier: "CODE",
      reason: "Build mode active — code implementation enabled",
      autoDemoted: false,
    };
  }

  // 3. Fallback if userMode not specified
  const detected = routeMessageTier(message);
  return {
    effectiveTier: detected,
    reason: `Auto-routed by intent classifier to ${detected}`,
    autoDemoted: false,
  };
}

export interface TierCounts {
  askCount: number;
  codeCount: number;
  isAskCapReached: boolean;
  isCodeCapReached: boolean;
}

/**
 * Computes the number of ASK vs CODE turns in a conversation.
 */
export function countTurnsByTier(
  turns: Array<{ role: string; content: string; filesWritten?: unknown }>
): TierCounts {
  let askCount = 0;
  let codeCount = 0;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (turn.role === "USER") {
      // Check if subsequent assistant turn wrote files
      const nextTurn = turns[i + 1]?.role === "ASSISTANT" ? turns[i + 1] : null;
      let hasFiles = false;
      if (nextTurn?.filesWritten) {
        if (Array.isArray(nextTurn.filesWritten)) {
          hasFiles = nextTurn.filesWritten.length > 0;
        } else if (typeof nextTurn.filesWritten === "string") {
          try {
            const parsed = JSON.parse(nextTurn.filesWritten);
            hasFiles = Array.isArray(parsed) && parsed.length > 0;
          } catch {
            // fallback
          }
        }
      }

      const tier = hasFiles ? "CODE" : routeMessageTier(turn.content);
      if (tier === "CODE") {
        codeCount++;
      } else {
        askCount++;
      }
    }
  }

  return {
    askCount,
    codeCount,
    isAskCapReached: askCount >= MAX_ASK_MESSAGES,
    isCodeCapReached: codeCount >= MAX_CODE_MESSAGES,
  };
}
