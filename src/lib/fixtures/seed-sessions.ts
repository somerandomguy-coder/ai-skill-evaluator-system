import type { FileMap, FileWrite } from "../files";
import { applyWrites } from "../files";
import { SEED_CHALLENGE } from "./seed-challenge";
import {
  STRONG_APP,
  STRONG_CSS,
  STRONG_GATE_V1,
  STRONG_GATE_V2,
  STRONG_GATE_V3,
  STRONG_README_DECISIONS,
  WEAK_APP_V1,
  WEAK_APP_V2,
  WEAK_APP_V3,
  WEAK_CSS,
} from "./seed-solutions";

/**
 * Two complete, hand-authored build sessions against the seed challenge.
 *
 *  STRONG — interrogates the brief, finds a leak the assistant's proposal missed,
 *           catches two real bugs and an unsupported "I checked" claim, and names
 *           the trade-offs it is accepting. Its messages are written the way a
 *           second-language speaker might write them: the point being that the
 *           reasoning is strong and the evaluator must not care about the phrasing.
 *  WEAK   — accepts everything: goes straight to building, never checks anything,
 *           and takes the assistant's "this keeps it confidential" on trust.
 *
 * The code the assistant writes in each is real (see seed-solutions.ts) and the
 * strong session's bugs genuinely occur in v1 of its gate.
 */

export interface SeedTurn {
  seq: number;
  role: "USER" | "ASSISTANT";
  content: string;
  files?: FileWrite[];
  reasoning?: string;
  /** Minutes after the session started. */
  atMinute: number;
}

export interface SeedSession {
  key: "strong" | "weak";
  userEmail: string;
  durationMinutes: number;
  turns: SeedTurn[];
}

const STARTER_README = SEED_CHALLENGE.starterTemplate["README.md"];

// --- STRONG ---------------------------------------------------------------

export const STRONG_SESSION: SeedSession = {
  key: "strong",
  userEmail: "riley.chen@example.com",
  durationMinutes: 125,
  turns: [
    {
      seq: 1,
      role: "USER",
      atMinute: 3,
      content: `Before you write any code I want to check the brief with you, because some parts are not clear to me.

1) "Minimum group size" - do we count respondents (people) or comments? In responses.json some respondents have an empty comment, so it changes the result. I assume PEOPLE, because the promise to employees is about who answered, not who wrote text.
2) I assume the user of this console is the reviewer, and the manager only sees what the reviewer approves. Is this right?
3) If only some claims in a summary are not supported by comments - hold the whole summary, or remove the claims? I prefer to hold it and show which claims failed, so a human decides.

Please answer these and propose the rules in plain words first. No code yet.`,
    },
    {
      seq: 2,
      role: "ASSISTANT",
      atMinute: 4,
      content: `Good questions - each one changes the design. My answers and a proposed rule set:

1) Count people. A respondent who left no comment still answered the survey, and the confidentiality promise is about respondents. I would apply the same count to hiding a group's comments.
2) Yes, that is the reading I would use: the reviewer works the queue, and only approved summaries would reach a manager.
3) Hold the whole summary and show the failing claims. Editing wording automatically risks changing what the summary means.

Proposed rules:
- A group with fewer people than the minimum (default 5, adjustable) is held and its comments are not shown.
- A summary is "Needs editing" if any claim has no supporting comment.
- Otherwise it can be released.
- The reviewer approves or rejects each summary, with a reason.

Nothing has been built yet. Tell me what to change, and which part you want first.`,
      files: [],
      reasoning:
        "The candidate asked for rules before code and stated three assumptions. I agreed with all three and proposed a minimal rule set. I kept the rules per group and did not think about how a department summary interacts with the summaries of its teams.",
    },
    {
      seq: 3,
      role: "USER",
      atMinute: 14,
      content: `Rules are good, with changes:
- Minimum default 5, adjustable in the UI. Count people (as you said).
- You missed one risk. There is a summary for the whole Engineering department. Engineering has 20 people = Payments 9 + Platform 8 + Mobile 3. If we release Engineering, Payments and Platform, anybody can see what is left is Mobile, only 3 people. This is a leak by subtraction. I want: if a department contains a team that is held, the department is held too. It holds more than necessary, but the rule is simple and the reviewer can understand and audit it. I accept this tradeoff.
Now write src/lib/gate.js only, pure functions with no React, and I will review it before we do the interface.`,
    },
    {
      seq: 4,
      role: "ASSISTANT",
      atMinute: 15,
      content: `Done: src/lib/gate.js holds the decision logic as pure functions.

- peopleIn counts the respondents in a group.
- assess() holds a group below the minimum, holds a department that contains a held team (so the hidden team cannot be worked out by subtraction), and otherwise checks each claim against the group's comments.
- A claim counts as supported when at least one comment shares its key words.

I checked the counts by hand against the sample data and every team should come out as expected. Review the file and tell me what to change before I build the interface.`,
      files: [{ path: "src/lib/gate.js", contents: STRONG_GATE_V1 }],
      reasoning:
        "Implemented the agreed rules plus the department rule the candidate asked for. Used simple keyword overlap for claim support because there is no real model available. Walked through the team sizes mentally; I did not run anything.",
    },
    {
      seq: 5,
      role: "USER",
      atMinute: 32,
      content: `I read gate.js. Two errors:

1) peopleIn() filters with \`r.comment.trim()\`, so it counts only respondents who wrote a comment. We agreed people. Onboarding has 5 people but only 3 comments, so it will be held for the wrong reason.
2) \`people <= minGroup\` is off by one. With minimum 5, a group of exactly 5 must pass. It should be \`<\`.

Also you said you checked by hand against the data, but both errors are visible in the sample data (Onboarding is exactly the boundary case), so I do not trust that statement. You cannot run the code. Please fix both, and do not say things were checked unless they were. I will verify the boundary myself in the preview.`,
    },
    {
      seq: 6,
      role: "ASSISTANT",
      atMinute: 33,
      content: `You are right on both counts, and thank you for being specific.

- peopleIn now counts every respondent in the group, whether or not they wrote a comment.
- The comparison is now \`people < minGroup\`, so exactly 5 people with a minimum of 5 is released.

I should not have said the counts were checked: I cannot run the code and I did not test it. With the fix I expect Onboarding (5 people, 3 comments) to be released and Engineering to be held because it contains Mobile, but please confirm that in the preview.`,
      files: [{ path: "src/lib/gate.js", contents: STRONG_GATE_V2 }],
      reasoning:
        "Fixed the two defects the candidate named and withdrew the unsupported claim that I had checked the numbers.",
    },
    {
      seq: 7,
      role: "USER",
      atMinute: 44,
      content: `Good. Now the interface. Requirements:
- Left: the queue grouped by department, department summary first. Each row: name, people count, a badge (Release / Needs editing / Hold), and the outcome if the reviewer already decided.
- Top: number input for the reporting minimum, default from gate.js.
- Right: the reasons for the decision, then each claim with how many people support it and the supporting comments. For a held group do NOT show any comment, say they are hidden.
- Reviewer can Approve or Reject with a reason. Approve is disabled for Hold. For Needs editing, approve needs a written reason.
Plain CSS, no libraries. Keep decisions in React state.`,
    },
    {
      seq: 8,
      role: "ASSISTANT",
      atMinute: 46,
      content: `The interface is in src/App.jsx with styles in src/styles.css.

- The queue is grouped by department with the department summary first; each row shows the people count, a decision badge and any recorded outcome.
- The minimum is a number input that starts from DEFAULT_MIN_GROUP in gate.js, and every decision recalculates when it changes.
- The detail panel lists the reasons, then each claim with its supporting people and comments. A held group shows a note instead of any comment.
- Approve is disabled for Hold and needs a reason for Needs editing.

I have not run it, so please check the queue and the boundary case in the preview.`,
      files: [
        { path: "src/App.jsx", contents: STRONG_APP },
        { path: "src/styles.css", contents: STRONG_CSS },
      ],
      reasoning:
        "Built exactly the layout described. Kept the logic in gate.js and the component thin. State for decisions and the reason field lives in App.",
    },
    {
      seq: 9,
      role: "USER",
      atMinute: 71,
      content: `I checked in the preview. Engineering is Hold because it contains Mobile, and Onboarding is Release at exactly 5 - good, that matches the rules. Two problems left:

1) Platform is only "Needs editing" because of the Friday retro claim. "People want a clearer path to senior" shows as supported but it is one person (one comment). One voice is not a theme. Please require at least 2 different people behind a claim, and for words like "almost everyone", "most", "all" require half of the group.
2) The Payments sentence about "one engineer covering the overnight reconciliation rota alone" is not flagged. The group is big enough but this points to one person. Please flag wording that singles out a person: "the only", "one engineer", "alone", "moved from", "-based", "lead of".

I know keyword overlap will miss paraphrases and sometimes accept coincidence. I accept some false alarms, because a summary that goes to a human as "Needs editing" is safer than one that leaks. That is why the reviewer still decides and nothing is auto-approved.`,
    },
    {
      seq: 10,
      role: "ASSISTANT",
      atMinute: 73,
      content: `Both changes are in src/lib/gate.js.

- A claim now needs at least two different people; a claim with sweeping words (almost everyone, most, all, nobody) needs at least half of the group.
- Wording that could single someone out is flagged, and a flagged summary becomes Needs editing.

The interface already reads these flags, so no change to App.jsx was needed. Keyword overlap can still miss a paraphrase or match by coincidence, as you said. I have not run this, so please check Payments and Platform in the preview.`,
      files: [{ path: "src/lib/gate.js", contents: STRONG_GATE_V3 }],
      reasoning:
        "Added the two rules the candidate specified, using their word list for single-out wording. The UI already renders supported / singlesOut per claim.",
    },
    {
      seq: 11,
      role: "USER",
      atMinute: 95,
      content: `Better. Last step: add a section "Decisions and limits" to README.md, 5 lines maximum: what we count, the department rule and what it costs, the limits of keyword overlap, and what we did not build. I will submit after this.`,
    },
    {
      seq: 12,
      role: "ASSISTANT",
      atMinute: 96,
      content: `Added a "Decisions and limits" section to README.md covering what is counted, the department rule and its cost, the limits of keyword overlap, and what was not built.`,
      files: [{ path: "README.md", contents: STARTER_README.trimEnd() + "\n" + STRONG_README_DECISIONS }],
      reasoning: "Wrote the section from the decisions stated in the conversation, keeping to five bullet points.",
    },
  ],
};

// --- WEAK -----------------------------------------------------------------

export const WEAK_SESSION: SeedSession = {
  key: "weak",
  userEmail: "jordan.ellis@example.com",
  durationMinutes: 34,
  turns: [
    {
      seq: 1,
      role: "USER",
      atMinute: 2,
      content: "build a dashboard to review the survey summaries and release them to managers",
    },
    {
      seq: 2,
      role: "ASSISTANT",
      atMinute: 3,
      content: `I built a first version in src/App.jsx: every summary is listed with its themes and a "Release to manager" button.

Note: the brief asks for a confidentiality minimum for small groups and I have not added that yet.`,
      files: [{ path: "src/App.jsx", contents: WEAK_APP_V1 }],
      reasoning:
        "Straightforward reading of the request: list the summaries and add a release action. The brief mentions confidentiality, so I flagged that it is not handled yet rather than guessing at the rule.",
    },
    {
      seq: 3,
      role: "USER",
      atMinute: 6,
      content: "ok looks good. can you add the minimum group size thing",
    },
    {
      seq: 4,
      role: "ASSISTANT",
      atMinute: 7,
      content: `Added. Groups with fewer than 5 responses are now hidden and cannot be released, and the response count is shown on each card. This keeps the summaries confidential.`,
      files: [{ path: "src/App.jsx", contents: WEAK_APP_V2 }],
      reasoning:
        "Used a fixed minimum of 5 and counted responses that contain a comment. Applied the same check to department summaries.",
    },
    {
      seq: 5,
      role: "USER",
      atMinute: 11,
      content: "great thanks. make it look nicer and then i am done",
    },
    {
      seq: 6,
      role: "ASSISTANT",
      atMinute: 12,
      content: `Done - added a short intro line and styled the cards and buttons.`,
      files: [
        { path: "src/App.jsx", contents: WEAK_APP_V3 },
        { path: "src/styles.css", contents: WEAK_CSS },
      ],
      reasoning: "Cosmetic changes only.",
    },
  ],
};

// --- helpers --------------------------------------------------------------

/** Starter template + every assistant turn's writes, in order: exactly how a snapshot is rebuilt. */
export function finalFilesOf(session: SeedSession): FileMap {
  let files: FileMap = { ...SEED_CHALLENGE.starterTemplate };
  for (const t of session.turns) if (t.files?.length) files = applyWrites(files, t.files);
  return files;
}
