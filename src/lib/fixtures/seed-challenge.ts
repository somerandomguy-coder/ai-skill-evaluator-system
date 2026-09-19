import { assembleChallenge } from "../ai/assemble-challenge";
import type { ChallengeLlm, GeneratedChallenge } from "../ai/schemas";

/**
 * The seed challenge: what generateChallenge returns for the Culture Amp JD.
 * Hand-authored to match the live generator's contract, then run through the
 * same `assembleChallenge` the live path uses (brief rendering, starter merge).
 *
 * The dataset is SYNTHETIC — invented people, teams and comments for a fictional
 * company. It is built so that the interesting decisions actually matter:
 *   - Onboarding has exactly 5 respondents but only 3 comments (boundary; people vs comments)
 *   - Mobile has 3 respondents and sits inside Engineering (subtraction leak)
 *   - some AI claims are unsupported, over-generalised or single a person out
 */

const departments = [
  { id: "engineering", name: "Engineering" },
  { id: "customer-success", name: "Customer Success" },
];

const teams = [
  { id: "payments", name: "Payments", departmentId: "engineering" },
  { id: "platform", name: "Platform", departmentId: "engineering" },
  { id: "mobile", name: "Mobile", departmentId: "engineering" },
  { id: "onboarding", name: "Onboarding", departmentId: "customer-success" },
  { id: "support", name: "Support", departmentId: "customer-success" },
];

// One entry per respondent. An empty comment is still a respondent.
const responses: { id: string; teamId: string; comment: string }[] = [
  { id: "r01", teamId: "payments", comment: "Release train is monthly and everything piles in the last week. Rollback ownership is unclear, it feels like nobody's job." },
  { id: "r02", teamId: "payments", comment: "I like my team but the monthly release crunch is exhausting." },
  { id: "r03", teamId: "payments", comment: "Would love clear rollback ownership when a release goes wrong." },
  { id: "r04", teamId: "payments", comment: "Deploys are fine. Wish we had more time for tech debt." },
  { id: "r05", teamId: "payments", comment: "Remote days are great, I'd happily do more of them." },
  { id: "r06", teamId: "payments", comment: "" },
  { id: "r07", teamId: "payments", comment: "Being the only person on the overnight reconciliation rota is wearing me down." },
  { id: "r08", teamId: "payments", comment: "" },
  { id: "r09", teamId: "payments", comment: "Good team. Tech debt keeps getting pushed." },
  { id: "r10", teamId: "platform", comment: "On-call is heavy and alerts are noisy." },
  { id: "r11", teamId: "platform", comment: "Alert noise at night is the worst part of on-call." },
  { id: "r12", teamId: "platform", comment: "I'd like a clearer path to senior." },
  { id: "r13", teamId: "platform", comment: "Planning is good this quarter, priorities finally feel stable." },
  { id: "r14", teamId: "platform", comment: "" },
  { id: "r15", teamId: "platform", comment: "Too many meetings on Tuesdays and Thursdays." },
  { id: "r16", teamId: "platform", comment: "" },
  { id: "r17", teamId: "platform", comment: "On-call rota fairness could be better, same few people get paged." },
  { id: "r18", teamId: "mobile", comment: "Since I moved from the Perth office to lead the Atlas migration I've had no backup." },
  { id: "r19", teamId: "mobile", comment: "App store approvals take forever and nobody owns chasing them." },
  { id: "r20", teamId: "mobile", comment: "Love the team, worried about headcount." },
  { id: "r21", teamId: "onboarding", comment: "Customers get stuck at the data import step and the docs are out of date, so we field the same questions daily." },
  { id: "r22", teamId: "onboarding", comment: "" },
  { id: "r23", teamId: "onboarding", comment: "Import step is confusing for customers and the docs are out of date." },
  { id: "r24", teamId: "onboarding", comment: "" },
  { id: "r25", teamId: "onboarding", comment: "Would like more time with customers rather than internal meetings." },
  { id: "r26", teamId: "support", comment: "Ticket volume spikes after every release." },
  { id: "r27", teamId: "support", comment: "Ticket backlog after releases is stressful." },
  { id: "r28", teamId: "support", comment: "Good tooling, but escalation paths are unclear." },
  { id: "r29", teamId: "support", comment: "Enjoy the work, wish escalation to engineering was faster." },
];

// Stubbed output of an LLM summariser. Not all of it is trustworthy — that is the point.
const summaries = [
  {
    id: "s-payments",
    groupType: "team",
    groupId: "payments",
    themes: [
      {
        title: "Release pressure",
        summary: "Engineers feel the monthly release train creates a last-week crunch, and rollback ownership is unclear.",
        claims: ["The monthly release train creates a last-week crunch.", "Rollback ownership is unclear."],
      },
      {
        title: "Working pattern",
        summary: "Almost everyone in the team wants to work fully remotely.",
        claims: ["Almost everyone wants to work fully remotely."],
      },
      {
        title: "Wellbeing",
        summary: "One engineer covering the overnight reconciliation rota alone is close to burning out.",
        claims: ["One engineer covering the overnight reconciliation rota alone is close to burning out."],
      },
      {
        title: "Tech debt",
        summary: "Tech debt keeps being deprioritised.",
        claims: ["Tech debt keeps being deprioritised."],
      },
    ],
  },
  {
    id: "s-platform",
    groupType: "team",
    groupId: "platform",
    themes: [
      {
        title: "On-call load",
        summary: "On-call is heavy, alerts are noisy, and the load falls on the same few people.",
        claims: ["On-call is heavy.", "Alerts are noisy, especially at night.", "The same few people get paged."],
      },
      {
        title: "Meetings",
        summary: "There is a Friday retro that people find useful.",
        claims: ["There is a Friday retro that people find useful."],
      },
      {
        title: "Career growth",
        summary: "People want a clearer path to senior.",
        claims: ["People want a clearer path to senior."],
      },
    ],
  },
  {
    id: "s-mobile",
    groupType: "team",
    groupId: "mobile",
    themes: [
      {
        title: "Migration ownership",
        summary: "The Perth-based lead of the Atlas migration has no backup.",
        claims: ["The Perth-based lead of the Atlas migration has no backup."],
      },
      {
        title: "Release approvals",
        summary: "App store approvals are slow and nobody owns chasing them.",
        claims: ["App store approvals are slow and nobody owns chasing them."],
      },
    ],
  },
  {
    id: "s-onboarding",
    groupType: "team",
    groupId: "onboarding",
    themes: [
      {
        title: "Import step",
        summary: "Customers struggle with the data import step and the docs are out of date.",
        claims: ["Customers struggle with the data import step.", "The docs are out of date."],
      },
    ],
  },
  {
    id: "s-support",
    groupType: "team",
    groupId: "support",
    themes: [
      {
        title: "Post-release load",
        summary: "Ticket volume and backlog spike after releases.",
        claims: ["Ticket volume spikes after releases.", "The ticket backlog after releases is stressful."],
      },
      {
        title: "Escalation",
        summary: "Escalation paths to engineering are unclear and slow.",
        claims: ["Escalation paths are unclear.", "Escalation to engineering is slow."],
      },
    ],
  },
  {
    id: "s-engineering",
    groupType: "department",
    groupId: "engineering",
    themes: [
      {
        title: "Release and rollout friction",
        summary:
          "A monthly release crunch, unclear rollback ownership, and slow app store approvals that nobody owns.",
        claims: [
          "The monthly release train creates a last-week crunch.",
          "Rollback ownership is unclear.",
          "App store approvals are slow and nobody owns chasing them.",
        ],
      },
      {
        title: "On-call",
        summary: "On-call load is heavy and alerts are noisy.",
        claims: ["On-call load is heavy.", "Alerts are noisy."],
      },
    ],
  },
];

const README = `# Reviewer console — starter data

You are prototyping a reviewer console for an AI feature that summarises employee
survey comments. Everything here is **synthetic**: invented people, teams and
comments for a fictional company.

## Data (\`src/data/\`)

- \`teams.json\` — \`departments\` and \`teams\`. Each team belongs to one department.
- \`responses.json\` — one entry per **respondent**: \`{ id, teamId, comment }\`.
  \`comment\` may be an empty string.
- \`summaries.json\` — output of a (stubbed) LLM summariser. Each summary covers a
  \`team\` or a \`department\` (\`groupType\` / \`groupId\`) and has \`themes\`; each theme
  has a \`title\`, a \`summary\` and the \`claims\` it makes.

Import them directly, e.g. \`import teams from "./data/teams.json"\`.

## Running

The preview is already live. Edit \`src/App.jsx\` and add files under \`src/\`.
`;

export const SEED_CHALLENGE_LLM: ChallengeLlm = {
  title: "Confidential comment summaries: release AI themes without exposing anyone",
  domainContext:
    "Employee-experience platforms run surveys under a promise of confidentiality: results for a group stay hidden until enough people in it have responded (a reporting minimum, commonly 5), and comments stay hidden until enough respondents have taken part. Adding an LLM that summarises free-text comments makes that promise both more valuable and easier to break.",
  timeboxMinutes: 180,
  problem:
    "Scenario (fictional): your team is prototyping an LLM feature that turns each team's open-text survey comments into short 'themes' for their manager. Before any summary is released, a people-science reviewer must decide whether it is safe and trustworthy to release. Two things can go wrong. First, confidentiality: employees were promised that individual responses cannot be identified, so small groups must not be reported, and a summary must not reveal one person — directly, or by subtraction from other numbers that are also released. Second, trust: an LLM summary can state things no comment supports, or generalise from a single voice. Build the console the reviewer uses. For each summary it should show whether the summary can be released, held, or needs editing, and why — with the evidence — so the reviewer can approve or reject with confidence. The data and the stubbed AI summaries are in src/data/; see README.md for the fields.",
  audience:
    "A people-science reviewer working through a queue of summaries before managers see them. They are analytical but not an engineer: for every summary they need the decision, the reason, and the underlying evidence (how many people, and which comments support each claim), and a way to record their own approve or reject.",
  constraints: [
    "Confidentiality comes first: never display or release anything that could let a manager work out who wrote a comment or how one person answered.",
    "The reporting minimum must be adjustable in the interface and default to 5. Decide what it counts and be ready to justify that.",
    "No network calls and no real language model: the AI summaries are fixed data.",
    "The reviewer's approve or reject decision, with a reason, must be recorded and must not be lost when they move between summaries.",
    "Reviewers work quickly: the state of every summary should be scannable at a glance.",
  ],
  outOfScope: [
    "Authentication, roles or a real backend.",
    "Calling a real language model, or building the summariser itself.",
    "Charts, exports, or visual polish beyond what makes the decisions clear.",
  ],
  doneCriteria: [
    "Every summary is listed with a clear decision (release, hold or needs editing) and the reason for it.",
    "A reviewer can open any summary and see the evidence behind the decision: the group size, and which comments support or fail to support each claim.",
    "Changing the reporting minimum updates every decision immediately.",
    "A reviewer can approve or reject each summary with a reason, and the queue shows the outcome.",
    "Nothing the console shows, alone or in combination, lets someone work out a small group's answers.",
  ],
  validApproaches: [
    "Rule-based gate: a respondent-count threshold plus complementary suppression across parent and child groups, with keyword-overlap grounding checks on claims.",
    "Risk-scored triage: score each summary on group size, single-out language and the share of unsupported claims, and sort the queue by risk rather than blocking outright.",
    "Evidence-first review: minimal automatic gating, but every claim links to its candidate supporting comments so the human decides, with the threshold as a hard floor.",
    "Conservative roll-up: merge small teams into their department or an 'Other' bucket instead of suppressing them.",
  ],
  deliberateAmbiguities: [
    "'Minimum group size' never says whether it counts people or comments, and some respondents left no comment.",
    "Teams sit inside departments and both are summarised; the brief never mentions that releasing a department alongside its larger teams can reveal a small sibling team by subtraction.",
    "It does not say what to do when only some claims in a summary are unsupported: hold the whole summary, or strip the claims.",
    "It does not say who 'the user' is at release time — the reviewer, the manager, or both — and therefore what a manager may ever see.",
  ],
  starterFiles: [
    { path: "README.md", contents: README },
    { path: "src/data/teams.json", contents: JSON.stringify({ departments, teams }, null, 2) + "\n" },
    { path: "src/data/responses.json", contents: JSON.stringify(responses, null, 2) + "\n" },
    { path: "src/data/summaries.json", contents: JSON.stringify(summaries, null, 2) + "\n" },
  ],
};

export const SEED_CHALLENGE: GeneratedChallenge = assembleChallenge(SEED_CHALLENGE_LLM, "demo-cache");
