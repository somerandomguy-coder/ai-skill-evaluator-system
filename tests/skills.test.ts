import { describe, expect, it } from "vitest";
import { PRESET_SKILLS, parseSkillMarkdown, slugifySkillId } from "@/lib/skills/registry";
import {
  extractSlashTokens,
  formatPromptWithSkills,
  getSlashAutocompleteQuery,
  parseSkillCommands,
  STANDALONE_SLASH_REGEX,
} from "@/lib/skills/slash-parser";

describe("Skill Register - Presets and Markdown Parsing", () => {
  it("includes core preset skills (grill-me, prototype, audit, rubber-duck)", () => {
    const ids = PRESET_SKILLS.map((s) => s.id);
    expect(ids).toContain("grill-me");
    expect(ids).toContain("prototype");
    expect(ids).toContain("audit");
    expect(ids).toContain("rubber-duck");
  });

  it("slugifies skill IDs cleanly without spaces or invalid characters", () => {
    expect(slugifySkillId("Grill Me")).toBe("grill-me");
    expect(slugifySkillId("  My_New_Skill 123  ")).toBe("my_new_skill-123");
    expect(slugifySkillId("special!@#$%chars")).toBe("specialchars");
  });

  it("parses SKILL.md with YAML frontmatter", () => {
    const markdown = `---
name: custom-reviewer
description: Reviews TypeScript interfaces
author: John Doe
---
You are an expert TypeScript reviewer.
Inspect all interfaces for strict types and no any.`;

    const res = parseSkillMarkdown(markdown);
    expect(res.success).toBe(true);
    expect(res.skill?.id).toBe("custom-reviewer");
    expect(res.skill?.name).toBe("custom-reviewer");
    expect(res.skill?.description).toBe("Reviews TypeScript interfaces");
    expect(res.skill?.author).toBe("John Doe");
    expect(res.skill?.prompt).toContain("You are an expert TypeScript reviewer.");
  });

  it("parses raw markdown without frontmatter using fallbackId", () => {
    const markdown = `Always format outputs as JSON without markdown tags.`;
    const res = parseSkillMarkdown(markdown, "json-only");
    expect(res.success).toBe(true);
    expect(res.skill?.id).toBe("json-only");
    expect(res.skill?.prompt).toBe(markdown);
  });

  it("returns error for empty markdown", () => {
    const res = parseSkillMarkdown("   ");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});

describe("Slash Command Parser - Syntax, Disabling & Highlighting", () => {
  it("detects standalone /skill at start of line", () => {
    const tokens = extractSlashTokens("/grill-me I want to discuss the architecture");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.token).toBe("/grill-me");
    expect(tokens[0]?.skillId).toBe("grill-me");
  });

  it("detects standalone /skill in middle of text separated by whitespace", () => {
    const tokens = extractSlashTokens("Please activate /prototype for the navigation bar");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.token).toBe("/prototype");
    expect(tokens[0]?.skillId).toBe("prototype");
  });

  it("disables command when letters/words are attached to start (e.g. and/or, http://)", () => {
    expect(extractSlashTokens("Should we use React and/or Vue?")).toHaveLength(0);
    expect(extractSlashTokens("Check https://example.com/api")).toHaveLength(0);
    expect(extractSlashTokens("folder/subfolder/file.ts")).toHaveLength(0);
  });

  it("disables command when comma or full stop is attached to the end (e.g. /grill-me, /grill-me.)", () => {
    expect(extractSlashTokens("Let's use /grill-me, then write code.")).toHaveLength(0);
    expect(extractSlashTokens("We must try /prototype. Next step.")).toHaveLength(0);
    expect(extractSlashTokens("Have you tested /audit?")).toHaveLength(0);
    expect(extractSlashTokens("Run /grill-me!")).toHaveLength(0);
  });

  it("distinguishes recognized vs unrecognized skills", () => {
    const text = "First /grill-me on requirements, then try /unknown-skill please";
    const result = parseSkillCommands(text, PRESET_SKILLS);

    expect(result.recognized).toHaveLength(1);
    expect(result.recognized[0]?.id).toBe("grill-me");

    expect(result.unrecognized).toHaveLength(1);
    expect(result.unrecognized[0]).toBe("/unknown-skill");
  });

  it("provides autocomplete query when typing a slash at cursor", () => {
    expect(getSlashAutocompleteQuery("Hello /gr").query).toBe("gr");
    expect(getSlashAutocompleteQuery("Hello /").query).toBe("");
    expect(getSlashAutocompleteQuery("Hello /").isQuerying).toBe(true);

    expect(getSlashAutocompleteQuery("Hello /grill-me ").isQuerying).toBe(false);
    expect(getSlashAutocompleteQuery("and/or").isQuerying).toBe(false);
  });

  it("formats prompt with active skill instructions", () => {
    const skill = PRESET_SKILLS.find((s) => s.id === "grill-me")!;
    const formatted = formatPromptWithSkills("I want to design a payment reconciler", [skill]);

    expect(formatted).toContain('<active_skill name="grill-me"');
    expect(formatted).toContain("DO NOT implement code or output file modifications");
    expect(formatted).toContain("Candidate Request:\nI want to design a payment reconciler");
  });
});
