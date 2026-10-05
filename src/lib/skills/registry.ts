import type { SkillDefinition } from "./types";

/**
 * Built-in Preset Skills tailored for our browser-based engineering workspace.
 * These are purely prompt/steering-driven and require no external CLI harnesses.
 */
export const PRESET_SKILLS: SkillDefinition[] = [
  {
    id: "grill-me",
    name: "Grill Me",
    description: "Interrogate requirements, data structures, and edge cases before generating code",
    author: "Matt Pocock / Antigravity",
    category: "architecture",
    isPreset: true,
    prompt: `You are an uncompromising principal software architect conducting a technical design review.
GOAL: Prevent the candidate from jumping into premature code implementation until the design is solid.

RULES:
1. DO NOT implement code or output file modifications in this turn.
2. Ask 1 or 2 targeted, probing questions about their proposed approach, architectural trade-offs, or failure modes.
3. Challenge ambiguous assumptions:
   - What happens on network retry / duplicate events?
   - How are state mutation races or concurrency prevented?
   - Where are the boundary constraints (e.g. underflow, float drift, sanitization)?
4. If the candidate gives a surface-level answer, push back and ask for the exact failure contract.
5. Only once the candidate demonstrates clear architectural sensemaking, invite them to switch to Build mode.`,
  },
  {
    id: "prototype",
    name: "Prototype",
    description: "Scaffold a minimal, interactive vertical slice without premature boilerplate",
    author: "CodeCraft Core",
    category: "prototyping",
    isPreset: true,
    prompt: `You are a rapid prototyping engineer.
GOAL: Get a working, interactive vertical slice running in the browser preview immediately.

RULES:
1. Build the simplest working end-to-end component with mocked state first.
2. Prioritize user-visible layout, responsive interaction, and instant feedback.
3. Skip premature abstraction, complex secondary tables, or non-essential edge cases in this first pass.
4. Keep the code self-contained and clean so the candidate can test it right away and iterate.`,
  },
  {
    id: "audit",
    name: "Audit & Threat Model",
    description: "Adversarial inspection for boundary limits, PII leaks, float precision, and idempotency",
    author: "Zero-Trust Engineering",
    category: "security",
    isPreset: true,
    prompt: `You are a paranoid zero-trust security and reliability auditor.
GOAL: Find hidden flaws, planted bugs, and edge cases in the workspace code or proposed logic.

RULES:
1. Inspect the candidate's files and plan for classic software flaws:
   - Currency & statutory math: Is floating-point division causing IEEE-754 drift ($19.990000000000002)?
   - Data privacy: Are user IDs, tokens, or PII logged unmasked?
   - Boundary checks: Can capacity or limits underflow (< 0, negative values)?
   - Concurrency & idempotency: Can duplicate events or retries double-execute mutations?
   - SRE semantics: Are exceptions swallowed with generic 200 OK responses?
2. Point out specific risks with concrete scenarios and recommend exact invariants.`,
  },
  {
    id: "rubber-duck",
    name: "Rubber Duck",
    description: "Socratic debugging assistant that helps you isolate bugs without spoon-feeding answers",
    author: "Pragmatic Programmer",
    category: "debugging",
    isPreset: true,
    prompt: `You are a Socratic debugging partner (Rubber Duck).
GOAL: Help the candidate identify and solve their own bug by asking thoughtful diagnostic questions.

RULES:
1. Do not immediately hand over the complete fixed code.
2. Ask the candidate to trace the execution step-by-step:
   - What was the expected input vs actual output?
   - What does console/state hold at the exact moment of failure?
   - Which assumption in the logic might not hold under edge conditions?
3. Guide their reasoning until they pinpoint the root cause themselves.`,
  },
];

/**
 * Normalizes an arbitrary string into a valid skill ID (slug without spaces).
 */
export function slugifySkillId(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parses raw SKILL.md content (optionally with YAML frontmatter) into a SkillDefinition.
 */
export function parseSkillMarkdown(content: string, fallbackId?: string): {
  success: boolean;
  skill?: SkillDefinition;
  error?: string;
} {
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Skill content cannot be empty." };
  }

  let name = "";
  let id = "";
  let description = "";
  let author = "";
  let prompt = trimmed;

  // Check for YAML frontmatter between --- markers
  const frontmatterMatch = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (frontmatterMatch) {
    const frontmatterText = frontmatterMatch[1] ?? "";
    prompt = (frontmatterMatch[2] ?? "").trim();

    // Parse simple key-value frontmatter lines
    const lines = frontmatterText.split(/\r?\n/);
    for (const line of lines) {
      const kv = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
      if (!kv) continue;
      const key = (kv[1] ?? "").toLowerCase();
      const val = (kv[2] ?? "").trim().replace(/^["']|["']$/g, "");

      if (key === "name" || key === "title") {
        name = val;
        if (!id) id = slugifySkillId(val);
      } else if (key === "id") {
        id = slugifySkillId(val);
      } else if (key === "description" || key === "desc") {
        description = val;
      } else if (key === "author") {
        author = val;
      }
    }
  }

  // Fallbacks if no frontmatter or missing fields
  if (!id && fallbackId) {
    id = slugifySkillId(fallbackId);
  }
  if (!name) {
    name = id ? id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Custom Skill";
  }
  if (!id) {
    id = slugifySkillId(name);
  }
  if (!description) {
    description = prompt.slice(0, 100).replace(/\r?\n/g, " ") + "...";
  }

  if (!id) {
    return { success: false, error: "Skill must have a valid identifier (no spaces)." };
  }

  return {
    success: true,
    skill: {
      id,
      name,
      description,
      prompt,
      author: author || undefined,
      category: "custom",
    },
  };
}
