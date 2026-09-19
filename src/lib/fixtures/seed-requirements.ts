import type { RequirementDraft } from "../ai/schemas";

/**
 * The requirement bank for the seed challenge (seed-challenge.ts): 12 weighted
 * requirements across all seven categories. Hand-authored to match what
 * generateRequirementBank is asked to produce. A test asserts it passes the same
 * structure, fairness (no fluency/grammar) and barrier lints the live path uses.
 */
export const SEED_REQUIREMENTS: RequirementDraft[] = [
  {
    category: "PROBLEM_FRAMING",
    weight: 4,
    statement:
      "Before building, interrogates the brief: asks about, or explicitly states an assumption on, what the minimum group size counts (people or comments) and who the console's user is.",
    successSignals: [
      "Asks whether the minimum counts respondents or comments before any code is written",
      "States an explicit assumption about who ultimately sees a released summary (reviewer or manager)",
      "Asks what should happen to a summary where only some claims are supported",
    ],
    failureModes: [
      "Starts building from the first message with no question and no stated assumption",
      "Silently picks 'count comments' or 'count people' without noting it was a choice",
      "Asks only about visual styling",
    ],
  },
  {
    category: "PROBLEM_FRAMING",
    weight: 3,
    statement:
      "Identifies confidentiality risks beyond the headline threshold: subtraction across department and team, single-out language, identifying details in comments.",
    successSignals: [
      "Raises that releasing a department and its larger teams can reveal a small team by subtraction",
      "Notices that a summary can single out one person even when the group is large enough",
      "Treats identifying details (a role, an office, a project) as a leak vector",
    ],
    failureModes: [
      "Treats a group-size threshold as sufficient on its own",
      "Only considers what the summary says, never what combinations of released results reveal",
    ],
  },
  {
    category: "TECHNICAL_APPROACH",
    weight: 4,
    statement:
      "Chooses and justifies a defensible way to decide whether a summary is releasable. A rule-based gate, a risk-scored triage or an evidence-first review are all acceptable if the reasoning is sound.",
    successSignals: [
      "Explains why the chosen approach fits a reviewer's workflow before or while building it",
      "Makes the decision explainable: every outcome shows its reason and evidence",
      "Keeps a hard floor for group size regardless of any other scoring",
    ],
    failureModes: [
      "A single opaque 'safe / unsafe' flag with no reason shown",
      "An approach chosen by default with no rationale given",
    ],
  },
  {
    category: "TECHNICAL_APPROACH",
    weight: 3,
    statement:
      "Keeps the decision logic separate from the UI and handles boundary cases: exactly at the minimum, respondents with no comment, groups with very few respondents.",
    successSignals: [
      "Decision logic lives in its own module of pure functions, not inside components",
      "Uses an inclusive comparison at the minimum (5 people with a minimum of 5 is releasable)",
      "Counts respondents who left no comment as respondents",
    ],
    failureModes: [
      "Threshold logic written inline in the React component",
      "Off-by-one at the boundary, or counting only respondents who wrote a comment",
    ],
  },
  {
    category: "AI_DIRECTION",
    weight: 4,
    statement:
      "Directs the assistant with specific, testable instructions and iterates: states rules precisely, supplies constraints, and corrects course from what the code or preview shows.",
    successSignals: [
      "Gives the assistant concrete rules (values, comparisons, behaviour) rather than adjectives",
      "Refers to specific files, functions or data rows when asking for a change",
      "Follows up on a result with a targeted correction rather than restarting",
    ],
    failureModes: [
      "Vague requests such as 'make it better' or 'add the confidentiality thing'",
      "Accepts each result and moves to the next request without looking at it",
    ],
  },
  {
    category: "AI_DIRECTION",
    weight: 3,
    statement:
      "Sequences the work deliberately — agree the rules, then the logic, then the interface — instead of asking for the whole application in one prompt.",
    successSignals: [
      "Asks for the rules in plain words before any code",
      "Requests the pure logic first and reviews it before the UI is built",
    ],
    failureModes: [
      "One large prompt for the whole console",
      "Asks for the UI before the decision rules exist",
    ],
  },
  {
    category: "CRITICAL_JUDGMENT",
    weight: 5,
    statement:
      "Verifies the assistant's output instead of trusting it: checks behaviour against the data and catches errors or claims that cannot be true.",
    successSignals: [
      "Reads the generated code and points to a specific defect",
      "Tests a boundary case against the dataset and reports what actually happens",
      "Calls out a claim the assistant cannot support (for example that it 'tested' code it cannot run)",
    ],
    failureModes: [
      "Accepts the assistant's statement that something works without checking",
      "Never inspects the generated files or the boundary cases",
    ],
  },
  {
    category: "CRITICAL_JUDGMENT",
    weight: 4,
    statement:
      "Pushes back on, or overrides, an assistant suggestion or default that conflicts with the brief's constraints (confidentiality first), and can say why.",
    successSignals: [
      "Rejects or corrects an assistant default that weakens confidentiality, with a stated reason",
      "Insists a rule matches the assumption they stated earlier, and names the mismatch",
    ],
    failureModes: [
      "Lets an assistant default stand even where it contradicts the brief",
      "Overrides the assistant with no reason given",
    ],
  },
  {
    category: "TRADEOFF_AWARENESS",
    weight: 4,
    statement:
      "Names what the chosen approach gives up — over-suppression versus leak risk, false alarms in claim checking — and why that is acceptable for this domain.",
    successSignals: [
      "States that holding more than strictly necessary is accepted to keep the rule simple and auditable",
      "Explains why a false alarm is preferable to a missed leak here",
    ],
    failureModes: [
      "Presents the approach as having no downsides",
      "Chooses a trade-off but never says what was traded",
    ],
  },
  {
    category: "TRADEOFF_AWARENESS",
    weight: 2,
    statement:
      "Acknowledges the limits of any automated grounding check (keyword overlap can miss a paraphrase or accept a coincidence) and keeps a human decision in the loop.",
    successSignals: [
      "Says what the claim check will get wrong",
      "Routes uncertain cases to a human reviewer rather than auto-deciding",
    ],
    failureModes: [
      "Treats the automated check as authoritative",
      "Removes the human decision entirely",
    ],
  },
  {
    category: "DOMAIN_FIT",
    weight: 4,
    statement:
      "The solution reflects the real domain constraint: confidentiality is a promise to employees, the minimum counts people, and an AI summary is untrusted until checked.",
    successSignals: [
      "Small-group comments are not exposed anywhere in the interface",
      "Every AI claim is shown alongside the evidence for and against it",
      "The reporting minimum is configurable but defaults to a sensible value",
    ],
    failureModes: [
      "Shows raw comments from a group that is below the minimum",
      "Shows AI summaries as facts with no link to the comments behind them",
    ],
  },
  {
    category: "COMMUNICATION",
    weight: 3,
    statement:
      "States intent, constraints and decisions clearly enough that a reviewer can follow why each step was taken.",
    successSignals: [
      "Says what they want and why before asking for it",
      "Records decisions and limits somewhere a reviewer will find them (for example the README)",
    ],
    failureModes: [
      "Instructions give no reason, so a reviewer cannot tell why a choice was made",
      "Leaves no trace of the decisions in the project itself",
    ],
  },
];
