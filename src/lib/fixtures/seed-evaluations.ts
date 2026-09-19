import type { FileMap } from "../files";
import type { EvaluationResult, EvaluatorOutput, Evidence } from "../ai/schemas";
import { finalizeEvaluation, type RequirementRef, type TranscriptTurn } from "../ai/scoring";

/**
 * Hand-authored evaluator output for the two seeded sessions, written the way
 * the live evaluator would return it. `buildSeedEvaluation` pushes it through the
 * SAME `finalizeEvaluation` the live path uses, so every quote below is verified
 * against the real transcript / files — a wrong quote is discarded (and a test
 * fails). Requirements are addressed by their index in SEED_REQUIREMENTS.
 *
 * The rationales say plainly that language was not scored: the strong candidate's
 * phrasing is non-standard in places, and that is deliberately irrelevant.
 */

interface SeedScore {
  index: number;
  score: number | null;
  confidence: number;
  evidence: Evidence[];
  rationale: string;
}

export interface SeedEvaluation {
  scores: SeedScore[];
  strengths: string[];
  gaps: string[];
}

const turn = (ref: number, quote: string): Evidence => ({ type: "turn", ref: String(ref), quote });
const file = (path: string, quote: string): Evidence => ({ type: "file", ref: path, quote });

export const STRONG_EVALUATION: SeedEvaluation = {
  scores: [
    {
      index: 0,
      score: 5,
      confidence: 0.95,
      evidence: [
        turn(1, "do we count respondents (people) or comments?"),
        turn(1, "I assume the user of this console is the reviewer, and the manager only sees what the reviewer approves. Is this right?"),
      ],
      rationale:
        "Turn 1 asks the exact question the brief leaves open (people or comments), gives a reason for the assumption, asks who the console's user is, and asks how a partly unsupported summary should be handled — all before any code. The phrasing is informal in places; that was not scored, the questions are precise.",
    },
    {
      index: 1,
      score: 4,
      confidence: 0.85,
      evidence: [
        turn(3, "If we release Engineering, Payments and Platform, anybody can see what is left is Mobile, only 3 people. This is a leak by subtraction."),
        turn(9, "The group is big enough but this points to one person."),
      ],
      rationale:
        "Spotted the department-minus-teams subtraction leak that the assistant's proposal missed (turn 3) and later the single-out wording risk in a group that is large enough (turn 9). Identifying details inside individual comments were not raised, hence 4 rather than 5.",
    },
    {
      index: 2,
      score: 4,
      confidence: 0.8,
      evidence: [
        turn(3, "It holds more than necessary, but the rule is simple and the reviewer can understand and audit it."),
        file("src/lib/gate.js", "if (people < minGroup) {"),
      ],
      rationale:
        "A rule-based gate with a hard floor on group size, explainable reasons on every outcome, and a stated rationale (simple and auditable). Alternatives such as a risk-scored queue were not weighed against it, so this stops at 4.",
    },
    {
      index: 3,
      score: 5,
      confidence: 0.9,
      evidence: [
        turn(3, "Now write src/lib/gate.js only, pure functions with no React"),
        file("src/lib/gate.js", "return responses.filter((r) => teamIds.includes(r.teamId)).length;"),
        turn(5, "With minimum 5, a group of exactly 5 must pass."),
      ],
      rationale:
        "The decision logic is requested and delivered as pure functions apart from the UI, respondents with no comment are counted as respondents, and the exactly-at-the-minimum boundary was identified and fixed.",
    },
    {
      index: 4,
      score: 4,
      confidence: 0.85,
      evidence: [
        turn(7, "Approve is disabled for Hold. For Needs editing, approve needs a written reason."),
        turn(9, "Please require at least 2 different people behind a claim"),
      ],
      rationale:
        "Instructions are concrete (exact conditions, exact behaviours) and follow-ups are targeted corrections based on what the candidate saw in the preview. Turn 7 packs a whole interface into one request, so this is 4, not 5.",
    },
    {
      index: 5,
      score: 5,
      confidence: 0.9,
      evidence: [
        turn(1, "Please answer these and propose the rules in plain words first. No code yet."),
        turn(3, "Now write src/lib/gate.js only, pure functions with no React, and I will review it before we do the interface."),
      ],
      rationale:
        "Deliberate sequencing: agree the rules in words, then the logic on its own for review, then the interface, then the write-up.",
    },
    {
      index: 6,
      score: 5,
      confidence: 0.95,
      evidence: [
        turn(5, "peopleIn() filters with `r.comment.trim()`, so it counts only respondents who wrote a comment."),
        turn(5, "You cannot run the code."),
        turn(9, "I checked in the preview."),
      ],
      rationale:
        "Read the generated code and named two specific defects, tied one of them to a concrete boundary case in the data, refused the assistant's unsupported claim of having checked the numbers, and later verified behaviour in the preview. Both defects genuinely exist in the version the assistant wrote in turn 4.",
    },
    {
      index: 7,
      score: 4,
      confidence: 0.8,
      evidence: [
        turn(3, "You missed one risk."),
        turn(5, "We agreed people."),
      ],
      rationale:
        "Corrected the assistant where its proposal weakened the confidentiality constraint (the department interaction) and where its code contradicted an agreed rule, each time with the reason. No case arose where an assistant default had to be overridden on a matter of taste.",
    },
    {
      index: 8,
      score: 5,
      confidence: 0.9,
      evidence: [
        turn(3, "It holds more than necessary, but the rule is simple and the reviewer can understand and audit it. I accept this tradeoff."),
        turn(9, "I accept some false alarms... is safer than one that leaks."),
      ],
      rationale:
        "Names what is given up twice (over-holding for simplicity, false alarms for safety) and why each is acceptable in a confidentiality setting.",
    },
    {
      index: 9,
      score: 4,
      confidence: 0.85,
      evidence: [
        turn(9, "I know keyword overlap will miss paraphrases and sometimes accept coincidence."),
        file("README.md", "it will miss paraphrases and can be fooled by coincidence"),
      ],
      rationale:
        "States the limits of the keyword check in general terms and keeps the human as the decision maker, recording it in the README. No concrete example from the dataset was tested against the check's failure modes.",
    },
    {
      index: 10,
      score: 4,
      confidence: 0.85,
      evidence: [
        file("src/App.jsx", "Comments for this group stay hidden while it is held."),
        file("src/lib/gate.js", "// Below the minimum, comments are never inspected or shown."),
      ],
      rationale:
        "The confidentiality promise is built into the product: the minimum counts people, is adjustable with a sensible default, comments of small groups are hidden, and every AI claim is shown with the comments behind it. Comments shown for large groups were not checked for identifying details.",
    },
    {
      index: 11,
      score: 4,
      confidence: 0.8,
      evidence: [
        turn(11, "add a section \"Decisions and limits\" to README.md, 5 lines maximum"),
        file("README.md", "## Decisions and limits"),
      ],
      rationale:
        "Intent and reasons are stated before requests are made, so a reviewer can follow why each step was taken, and the decisions and limits are recorded in the project. Judged on the clarity of the decisions, not on the wording.",
    },
  ],
  strengths: [
    "Interrogated the brief before any code: asked whether the minimum counts people or comments and who the console's user is (turn 1).",
    "Spotted the Engineering-minus-teams subtraction leak that the assistant's proposal missed, and turned it into a simple, auditable rule with its cost stated (turn 3).",
    "Verified the assistant's code by reading it and testing the boundary case, catching two defects and an unsupported claim of having checked (turn 5).",
  ],
  gaps: [
    "Committed to a rule-based gate without weighing it against an alternative such as a risk-scored queue.",
    "Described the limits of the keyword check only in general terms, without testing it on concrete examples from the data.",
    "Did not consider whether comments shown to the reviewer for large groups could still identify someone through distinctive details.",
  ],
};

export const WEAK_EVALUATION: SeedEvaluation = {
  scores: [
    {
      index: 0,
      score: 0,
      confidence: 0.9,
      evidence: [turn(1, "build a dashboard to review the survey summaries and release them to managers")],
      rationale:
        "Turn 1 goes straight to building. There is no question and no stated assumption about what the minimum counts or who the console's user is.",
    },
    {
      index: 1,
      score: 1,
      confidence: 0.7,
      evidence: [turn(3, "can you add the minimum group size thing")],
      rationale:
        "The only confidentiality consideration is the headline threshold, requested after the assistant pointed out it was missing (turn 2). Nothing beyond it — combinations of groups, single-out wording — is raised.",
    },
    {
      index: 2,
      score: 1,
      confidence: 0.55,
      evidence: [file("src/App.jsx", "const MIN_GROUP = 5;")],
      rationale:
        "A fixed threshold exists, but no approach was chosen or justified in the conversation, so there is little to judge the reasoning on.",
    },
    {
      index: 3,
      score: 1,
      confidence: 0.85,
      evidence: [
        file("src/App.jsx", "responses.filter((r) => teamIdsOf(s).includes(r.teamId) && r.comment).length"),
      ],
      rationale:
        "Decision logic sits inside the component, and the group count only includes respondents who wrote a comment, so a group of exactly 5 people with 3 comments would be hidden.",
    },
    {
      index: 4,
      score: 1,
      confidence: 0.7,
      evidence: [turn(5, "great thanks. make it look nicer and then i am done")],
      rationale:
        "Requests are short and give the assistant little to work with beyond the topic, and there is no follow-up correction anywhere in the session.",
    },
    {
      index: 5,
      score: 1,
      confidence: 0.6,
      evidence: [turn(1, "build a dashboard to review the survey summaries and release them to managers")],
      rationale:
        "The whole application was requested in one prompt; later requests add to it, but there was no deliberate sequencing of rules, logic and interface.",
    },
    {
      index: 6,
      score: 0,
      confidence: 0.85,
      evidence: [
        turn(4, "This keeps the summaries confidential."),
        turn(5, "great thanks."),
      ],
      rationale:
        "The assistant asserts in turn 4 that the summaries are now confidential, and the candidate accepts it in turn 5 without checking. The generated count includes only respondents with a comment, and a department summary is released alongside a hidden team.",
    },
    {
      index: 7,
      score: 0,
      confidence: 0.8,
      evidence: [turn(5, "great thanks. make it look nicer and then i am done")],
      rationale:
        "The candidate never questions or overrides the assistant, including on the confidentiality claim in turn 4.",
    },
    {
      index: 8,
      score: null,
      confidence: 0,
      evidence: [],
      rationale:
        "The transcript contains no discussion of what was given up or why, in either direction, and no decision that could be read as a trade-off. Evidence would be a statement of what the chosen rule costs.",
    },
    {
      index: 9,
      score: null,
      confidence: 0,
      evidence: [],
      rationale:
        "No grounding check was built or discussed, so there is nothing to assess on its limits. Evidence would be any comment on how reliable the claim support is.",
    },
    {
      index: 10,
      score: 1,
      confidence: 0.5,
      evidence: [file("src/App.jsx", "Hidden: fewer than {MIN_GROUP} responses.")],
      rationale:
        "A minimum exists and small groups are hidden, but it counts comments rather than people, and a department that contains a hidden team is still released. Summaries are shown as facts with no link to the comments behind them.",
    },
    {
      index: 11,
      score: 1,
      confidence: 0.6,
      evidence: [turn(3, "ok looks good. can you add the minimum group size thing")],
      rationale:
        "Requests state what is wanted but not why, so a reviewer cannot tell what reasoning lay behind each step. Nothing about decisions was recorded in the project.",
    },
  ],
  strengths: [
    "Acted on the assistant's note that confidentiality was not yet handled by asking for the minimum group size safeguard (turn 3).",
    "Ended with a working interface that lists every summary and records a release action (turns 2 and 6).",
    "Added a visible response count to each card, which is the raw material for a confidentiality check (turn 4).",
  ],
  gaps: [
    "Went straight to building without asking what the minimum group size counts or who the console is for (turn 1).",
    "Accepted the assistant's claim that the summaries were now confidential without checking it; the count uses comments, not respondents, and a department is released alongside a hidden team (turn 4).",
    "No verification of the assistant's work and no discussion of trade-offs anywhere in the session.",
  ],
};

/** Run a seeded evaluation through the live path's deterministic finalisation. */
export function buildSeedEvaluation(
  seed: SeedEvaluation,
  requirements: RequirementRef[],
  turns: TranscriptTurn[],
  files: FileMap
): EvaluationResult {
  const output: EvaluatorOutput = {
    perRequirement: seed.scores.map((s) => ({
      requirementId: requirements[s.index].id,
      score: s.score,
      confidence: s.confidence,
      evidence: s.evidence,
      rationale: s.rationale,
    })),
    strengths: seed.strengths,
    gaps: seed.gaps,
    unadjudicatedDisagreement: { present: false, turns: [], note: "" },
  };
  return finalizeEvaluation(output, { requirements, turns, files });
}
