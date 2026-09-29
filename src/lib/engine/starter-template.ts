/**
 * Generates clean, role-tailored starter workspace files for candidate challenges.
 * Replaces legacy hardcoded prototype seed files (teams.json, responses.json, summaries.json).
 */
export function buildRoleStarterTemplate(challenge: {
  title: string;
  brief: string;
  technicalInvariants?: string[];
  starterSchemas?: Record<string, string>;
}): Record<string, string> {
  const files: Record<string, string> = {};

  const invariants = challenge.technicalInvariants?.length
    ? `\n\n## Technical Invariants & Constraints\n${challenge.technicalInvariants.map((inv) => `- ${inv}`).join("\n")}`
    : "";

  files["README.md"] = `# ${challenge.title}\n\n${challenge.brief}${invariants}\n\n## Candidate Workspace Instructions\n1. Review the brief and technical constraints above.\n2. Write your implementation files in \`src/\`.\n3. Validate boundary conditions and domain rules.\n`;

  if (challenge.starterSchemas && Object.keys(challenge.starterSchemas).length > 0) {
    for (const [filename, content] of Object.entries(challenge.starterSchemas)) {
      const path = filename.startsWith("src/") ? filename : `src/${filename}`;
      files[path] = content;
    }
  } else {
    files["src/index.ts"] = `/**\n * Solution Module for: ${challenge.title}\n * Grounded in SFIA 9 & Evidence-Centered Design\n */\n\nexport function execute() {\n  // TODO: Implement solution logic adhering to the technical invariants\n}\n`;
  }

  return files;
}
