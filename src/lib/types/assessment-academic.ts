import type { SfiaLevel } from "./assessment-v2";

export type AcademicDimension =
  | "EXPLORATION_VS_ACCELERATION"
  | "COGNITIVE_VERIFICATION"
  | "CONSTRAINT_SPECIFICATION"
  | "HIERARCHICAL_DECOMPOSITION"
  | "ARCHITECTURAL_SENSEMAKING";

export type QualitativeBand = "EXEMPLARY" | "PROFICIENT" | "DEVELOPING" | "AT_RISK";

export interface AcademicPaperMeta {
  title: string;
  authors: string;
  venue: string;
  year: number;
  openAccessUrl: string;
  officialDoiUrl?: string;
  citationKey: string;
  coreFinding: string;
}

export const ACADEMIC_FRAMEWORK_SOURCES: Record<AcademicDimension, AcademicPaperMeta> = {
  EXPLORATION_VS_ACCELERATION: {
    title: "Grounded Copilot: How Programmers Interact with Code-Generating Models",
    authors: "Shraddha Barke, Michael B. James, Nadia Polikarpova (UC San Diego)",
    venue: "ACM SIGPLAN OOPSLA",
    year: 2023,
    openAccessUrl: "https://arxiv.org/abs/2206.15000",
    officialDoiUrl: "https://dl.acm.org/doi/10.1145/3586030",
    citationKey: "Barke et al. (OOPSLA '23)",
    coreFinding:
      "Developers toggle between Exploration Mode (architectural ideation and boundary mapping) and Acceleration Mode (boilerplate and execution speed). Senior engineers proactively structure exploration before acceleration.",
  },
  COGNITIVE_VERIFICATION: {
    title: "Explanations Can Reduce Overreliance on AI Systems During Decision-Making",
    authors: "Helena Vasconcelos et al. (Stanford University & Microsoft Research)",
    venue: "ACM CSCW / CHI",
    year: 2023,
    openAccessUrl: "https://cicl.stanford.edu/papers/vasconcelos2023explanations.pdf",
    officialDoiUrl: "https://doi.org/10.1145/3579605",
    citationKey: "Vasconcelos et al. (CSCW '23)",
    coreFinding:
      "Formulates the Cost of Verification vs. Cost of Overreliance model. Developers suffer from automation bias when code appears clean, requiring deliberate cognitive hypothesis testing of failure boundaries.",
  },
  CONSTRAINT_SPECIFICATION: {
    title: "On the Structure of Educational Assessments (Evidence-Centered Design)",
    authors: "Robert J. Mislevy, Linda S. Steinberg, Russell G. Almond (ETS)",
    venue: "Measurement: Interdisciplinary Research and Perspectives",
    year: 2003,
    openAccessUrl: "https://cresst.org/wp-content/uploads/TR597.pdf",
    officialDoiUrl: "https://onlinelibrary.wiley.com/doi/abs/10.1002/j.2333-8504.2003.tb01908.x",
    citationKey: "Mislevy et al. (ETS / ECD)",
    coreFinding:
      "Eliminates subjective evaluator guesswork through the tripartite chain: Competency Model (SFIA 8 skills), Task Model (authentic context with planted traps), and Evidence Model (verbatim behavioral telemetry).",
  },
  HIERARCHICAL_DECOMPOSITION: {
    title: "Cognitive Architecture and Instructional Design in Software Engineering",
    authors: "John Sweller (University of New South Wales)",
    venue: "Educational Psychology Review / Cognitive Load Theory",
    year: 2020,
    openAccessUrl: "https://link.springer.com/article/10.1007/s10648-019-09465-5",
    citationKey: "Sweller (Cognitive Load Theory)",
    coreFinding:
      "Managing working memory capacity by breaking complex systems into atomic, decoupled sequences (Contracts -> Engine -> Validation -> Edge cases) rather than monolithic generation.",
  },
  ARCHITECTURAL_SENSEMAKING: {
    title: "Skills Framework for the Information Age: Systems Design (DESN) & Business Skills",
    authors: "Australian Computer Society / SFIA Foundation",
    venue: "SFIA 8 Standard",
    year: 2022,
    openAccessUrl: "https://sfia-online.org/en/sfia-8/skills/systems-design",
    citationKey: "SFIA 8 (ACS / DESN Level 2-3)",
    coreFinding:
      "Explicit technical reasoning and trade-off justification across latency, maintainability, and statutory compliance, demonstrating autonomy and technical sensemaking.",
  },
};

export interface EvidenceTrace {
  turnId: string;
  excerpt: string;
  observedBehavior: "SUCCESS_SIGNAL" | "AUTOMATION_BIAS_TRAP";
  interpretation: string;
}

export interface DimensionEvaluation {
  dimension: AcademicDimension;
  name: string;
  frameworkSource: string;
  paperMeta: AcademicPaperMeta;
  score: number | null; // 1-5 scale; null if insufficient evidence
  confidence: number; // 0.0 - 1.0
  qualitativeBand: QualitativeBand;
  rationale: string;
  evidenceTraces: EvidenceTrace[];
}

export interface GroundedAssessmentReport {
  sessionId: string;
  sfiaLevel: SfiaLevel;
  overallBand: "STRONG" | "SOLID" | "DEVELOPING" | "INSUFFICIENT";
  averageScore: number; // 1.0 - 5.0
  totalScore: number; // out of 25
  dimensions: DimensionEvaluation[];
  automationBiasIndex: number; // 0.0 (high verification rigour) to 1.0 (blind automation bias)
  needsHumanEscalation: boolean;
  escalationReason?: string;
  evaluationTimestamp: string;
}
