import type { ParsedJd } from "../ai/schemas";

/**
 * What parseJobDescription returns for the seed JD (seed-jd.ts): hand-authored to
 * match what the live parser is asked to produce, so DEMO_MODE shows the real
 * structure. Barrier texts are quoted verbatim from the posting.
 */
export const SEED_PARSED_JD: ParsedJd = {
  roleTitle: "Senior Applied AI Engineer",
  seniority: "SENIOR",
  employer: "Culture Amp",
  location: null,
  domain: "Employee experience and people analytics (HR tech)",
  teamContext:
    "The Frontier team builds agentic AI solutions on workplace data — surveys, goals, performance reviews, feedback and 1-1 notes — working with product, design and people science. Features ship to production; this is not a research lab.",
  mustHaveSkills: [
    "Taking ML/AI systems to production",
    "LLM evaluation and observability: LLM-as-judge, eval datasets, human-in-the-loop labelling, threshold scoring, tracing",
    "Designing production multi-agent systems: orchestration, prompt and context engineering, RAG, memory",
    "Full-stack development (Python, React, PGVector)",
    "Knowledge graphs and graph databases (Neo4j, Neptune)",
    "Clean, tested, maintainable code",
    "Delegating complex workflows to autonomous agents with reliable feedback loops",
    "Data pipelines over messy real-world inputs within rigorous security standards",
    "Pragmatic evaluation of new technology: does it scalably solve the problem?",
  ],
  niceToHaveSkills: [
    "GraphRAG and knowledge graphs in production",
    "Evaluation and benchmarking frameworks for AI systems",
    "Taking recent research techniques from paper to production",
    "People analytics or HR tech familiarity",
    "Open source contributions or public technical writing",
  ],
  barriers: [
    {
      text: "Postgraduate degree (Masters or PhD) in Machine Learning, Computer Science, Applied Mathematics, or related quantitative field",
      kind: "CREDENTIAL_GATE",
      reason:
        "A degree signals schooling, not the ability to build and evaluate LLM systems — which a work sample measures directly.",
    },
    {
      text: "Experience at startups or founding teams - comfortable with ambiguity and fast iteration",
      kind: "PEDIGREE_PROXY",
      reason:
        "Employer type is a proxy for handling ambiguity; a candidate with a non-linear career can show that in the work itself.",
    },
    {
      text: "Values alignment",
      kind: "CULTURE_FIT_PROXY",
      reason:
        "'Alignment' is subjective and tends to reward similarity to existing staff; it cannot be assessed objectively from a work sample.",
    },
  ],
};
