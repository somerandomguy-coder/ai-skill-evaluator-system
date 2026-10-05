import type { ParsedSkillCommand, SkillDefinition } from "./types";

/**
 * Regex for a standalone slash command token:
 * 1. Must be preceded by start of string or whitespace: (?:^|\s)
 * 2. Starts with a single slash: \/
 * 3. Followed by alphanumeric, hyphen, or underscore characters: ([a-zA-Z0-9_-]+)
 * 4. Must be followed immediately by whitespace or end of string: (?=\s|$)
 *
 * NOTE: Punctuation (comma, period, exclamation) or alphanumeric chars directly
 * attached to the start or end will disable the command match.
 */
export const STANDALONE_SLASH_REGEX = /(?:^|\s)\/([a-zA-Z0-9_-]+)(?=\s|$)/g;

/**
 * Extracts all standalone slash tokens from input text.
 */
export function extractSlashTokens(text: string): { token: string; skillId: string; index: number }[] {
  const matches: { token: string; skillId: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  STANDALONE_SLASH_REGEX.lastIndex = 0;

  while ((match = STANDALONE_SLASH_REGEX.exec(text)) !== null) {
    const rawMatch = match[0];
    const skillId = match[1] ?? "";
    const slashOffset = rawMatch.indexOf("/");
    const matchIndex = match.index + slashOffset;

    matches.push({
      token: `/${skillId}`,
      skillId: skillId.toLowerCase(),
      index: matchIndex,
    });
  }

  return matches;
}

/**
 * Evaluates all slash commands found in a text against registered skills.
 */
export function parseSkillCommands(
  text: string,
  registeredSkills: SkillDefinition[] | Map<string, SkillDefinition>
): {
  parsed: ParsedSkillCommand[];
  recognized: SkillDefinition[];
  unrecognized: string[];
} {
  const skillMap =
    registeredSkills instanceof Map
      ? registeredSkills
      : new Map(registeredSkills.map((s) => [s.id.toLowerCase(), s]));

  const tokens = extractSlashTokens(text);
  const parsed: ParsedSkillCommand[] = [];
  const recognizedMap = new Map<string, SkillDefinition>();
  const unrecognizedSet = new Set<string>();

  for (const t of tokens) {
    const skill = skillMap.get(t.skillId);
    if (skill) {
      recognizedMap.set(skill.id, skill);
      parsed.push({
        token: t.token,
        skillId: t.skillId,
        isRecognized: true,
        definition: skill,
      });
    } else {
      unrecognizedSet.add(t.token);
      parsed.push({
        token: t.token,
        skillId: t.skillId,
        isRecognized: false,
      });
    }
  }

  return {
    parsed,
    recognized: Array.from(recognizedMap.values()),
    unrecognized: Array.from(unrecognizedSet.values()),
  };
}

/**
 * Checks if the text currently ending at cursor is typing a slash command,
 * returning matching skill suggestions for autocomplete.
 */
export function getSlashAutocompleteQuery(
  textBeforeCursor: string
): { isQuerying: boolean; query: string; startIndex: number } {
  // Matches e.g. "foo /gri" or "/prot" right at the end of textBeforeCursor
  const match = textBeforeCursor.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
  if (!match) {
    return { isQuerying: false, query: "", startIndex: -1 };
  }

  const query = (match[1] ?? "").toLowerCase();
  const slashIndex = textBeforeCursor.lastIndexOf("/");
  return {
    isQuerying: true,
    query,
    startIndex: slashIndex,
  };
}

/**
 * Formats user prompt text with active skill instructions injected as clear steering XML blocks.
 */
export function formatPromptWithSkills(rawText: string, activeSkills: SkillDefinition[]): string {
  if (activeSkills.length === 0) return rawText.trim();

  const skillBlocks = activeSkills
    .map(
      (skill) =>
        `<active_skill name="${skill.id}" title="${skill.name}" description="${skill.description}">
${skill.prompt.trim()}
</active_skill>`
    )
    .join("\n\n");

  return `${skillBlocks}\n\nCandidate Request:\n${rawText.trim()}`;
}
