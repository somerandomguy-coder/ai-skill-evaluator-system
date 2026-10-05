/**
 * Skill Register & Slash Command Types
 *
 * Defines the contract for cognitive & behavioral skills injected into
 * workspace assistant interactions (e.g., /grill-me, /prototype, /audit).
 */

export interface SkillDefinition {
  /** Unique slug identifier (lowercase, alphanumeric, hyphens only, no spaces, e.g. "grill-me") */
  id: string;
  /** Display title (e.g. "Grill Me") */
  name: string;
  /** 1-sentence description of what this skill does */
  description: string;
  /** System / steering instructions for the AI assistant */
  prompt: string;
  /** Built-in default skill that cannot be deleted */
  isPreset?: boolean;
  /** Optional author or origin reference */
  author?: string;
  /** Optional icon or category hint */
  category?: "architecture" | "prototyping" | "security" | "debugging" | "custom";
}

export interface ParsedSkillCommand {
  token: string;
  skillId: string;
  isRecognized: boolean;
  definition?: SkillDefinition;
}
