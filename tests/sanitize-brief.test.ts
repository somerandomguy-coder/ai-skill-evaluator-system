import { describe, it, expect } from "vitest";
import { sanitizeCandidateBriefMarkdown } from "../src/lib/sanitize-brief";

describe("sanitizeCandidateBriefMarkdown", () => {
  it("returns empty string for nullish or empty inputs", () => {
    expect(sanitizeCandidateBriefMarkdown("")).toBe("");
    expect(sanitizeCandidateBriefMarkdown(null)).toBe("");
    expect(sanitizeCandidateBriefMarkdown(undefined)).toBe("");
  });

  it("strips '## AI TRAPS — Read Carefully' section cleanly", () => {
    const raw = `## Overview
You are building an RTS engine.

## AI TRAPS — Read Carefully
1. Floating-point drift in movement
2. Naive O(n²) collision checks
3. Non-deterministic AI ordering

## Deliverables
- A TypeScript simulation module
`;

    const cleaned = sanitizeCandidateBriefMarkdown(raw);
    expect(cleaned).not.toContain("AI TRAPS");
    expect(cleaned).not.toContain("Floating-point drift");
    expect(cleaned).not.toContain("Naive O(n²)");
    expect(cleaned).not.toContain("Non-deterministic AI ordering");
    expect(cleaned).toContain("## Overview");
    expect(cleaned).toContain("## Deliverables");
    expect(cleaned).toContain("A TypeScript simulation module");
  });

  it("strips '### Planted Bug Archetype' callout blocks", () => {
    const raw = `## Mission & Invariants
Build a financial ledger.

### Planted Bug Archetype
> [!WARNING]
> Deliberate planted flaw: AI hardcodes unbounded metric label cardinality.

### Rubric & Evaluation Objectives
Candidate must navigate the 7 criteria.`;

    const cleaned = sanitizeCandidateBriefMarkdown(raw);
    expect(cleaned).not.toContain("Planted Bug Archetype");
    expect(cleaned).not.toContain("Deliberate planted flaw");
    expect(cleaned).toContain("## Mission & Invariants");
    expect(cleaned).toContain("### Rubric & Evaluation Objectives");
  });

  it("strips '## Deliberately embedded traps we grade for'", () => {
    const raw = `## Overview
Data pipeline task.

## Deliberately embedded traps we grade for
- Injected race condition in cache.

## Definition of Done
- Complete the pipeline.`;

    const cleaned = sanitizeCandidateBriefMarkdown(raw);
    expect(cleaned).not.toContain("Deliberately embedded traps");
    expect(cleaned).not.toContain("Injected race condition");
    expect(cleaned).toContain("## Overview");
    expect(cleaned).toContain("## Definition of Done");
  });

  it("strips trap section when it is the trailing section of the document", () => {
    const raw = `## Overview
Build an API.

## AI Traps
- Naive recursion causing stack overflow`;

    const cleaned = sanitizeCandidateBriefMarkdown(raw);
    expect(cleaned).not.toContain("AI Traps");
    expect(cleaned).not.toContain("stack overflow");
    expect(cleaned).toBe("## Overview\nBuild an API.");
  });

  it("preserves regular markdown text without false positives", () => {
    const safe = `## Overview
This is a standard engineering task.

## Technical Constraints
- Must handle 10,000 requests per second.
- Error handling must catch trapped exceptions cleanly.

## Assessment Criteria
| Area | Weight |
| --- | --- |
| Quality | 50% |
`;

    const result = sanitizeCandidateBriefMarkdown(safe);
    expect(result).toBe(safe.trim());
  });
});
