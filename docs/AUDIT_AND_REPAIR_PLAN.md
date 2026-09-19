# ProofCraft audit and repair plan

Audit date: 19 September 2026. Baseline: `c44cbc3`. This document plans repairs; no application fixes were made during this audit. Use the companion `REPAIR_MODEL_PROMPTS.md` to assign one bounded task at a time. Performance measurements and hosting decisions are in `PERFORMANCE_AND_HOSTING.md`.

## What the product does, and what to protect

ProofCraft turns a job description into a work sample and rubric. A candidate directs an AI assistant in a browser workspace. The server records the conversation and file changes, captures a submission, evaluates the evidence, and routes uncertain or contested results to a mentor. Reports and credentials are intended to make demonstrated ability legible to employers.

The strongest existing engineering is the structured-output validation, server-owned transcript and file reconstruction, protected starter files, deterministic citation checks, withheld scores, and human-review escalation. Preserve those mechanisms. Do not replace this architecture or redesign the site as part of bug fixing.

The central risks are currently more serious than visual polish: generation can appear successful without durable usable records; different pages can disagree about an assessment; and polished reports contain unsupported verification and hiring claims. The default fast path is particularly unreliable.

## Hackathon alignment

Sources: `Hackathon - Topic Challenge (1).pdf` (9 pages) and `NSW Hackathon Day 1 Deck (2)-compressed.pdf` (55 pages), both supplied at the repository root. Both were text-extracted; selected challenge, responsibility, judging and submission pages were visually inspected.

- The closest fit is Track 1, Future of Work and International Talent: help international students/migrants demonstrate transferable capability to Australian employers. Keep one clear candidate-to-reviewer journey.
- The challenge brief asks for a realistic V1, privacy/fairness/accessibility, and human oversight rather than fully automated high-impact decisions (especially pp. 4–6).
- The submission includes a pitch deck and demo. The judging weights on p. 9 are problem 15%, solution 15%, technical execution 35%, evaluation/impact 20%, pitch 15%. A reliably saved assessment and inspectable evidence matter more than extra commercial pages.
- The Day 1 deck emphasizes Define, Design, Develop, Demonstrate and verifying claims. That supports explaining the development process; it does not by itself validate the app's invented cognitive scores, percentiles, calibration sample or certification protocol.

Recommended demo: one synthetic candidate, one relevant job, one real saved project, one candidate correction to AI output, a report showing the exact evidence, and one mentor/contest interaction. Clearly identify cached fixtures and live calls. Do not claim validated hiring outcomes, measured bias reduction or a benchmark cohort unless there is actual supporting evaluation.

## Verification baseline and limitations

| Check | Result |
| --- | --- |
| Source review | Routes/actions, service layer, data adapters, Prisma schema/migrations/seed, AI prompts/schemas/scoring, runtime, main UI/report/mentor flows, fixtures, tests and configuration reviewed. Third-party dependencies were not exhaustively audited. |
| `npm test` | 9 files passed; 136 tests passed, 1 live-AI test skipped. These do not exercise the complete database/browser workflow. |
| `npm run lint` | Failed: 11 errors, 73 warnings. |
| Fresh `npm run typecheck` | Failed because generated `PageProps`, `RouteContext`, and `LayoutProps` were absent. |
| `npx next typegen`, then typecheck | Passed. |
| `npm run build` | Passed, including Next compilation and type checking. |
| Local production browser | Synthetic sign-in works. Mock home advertises generation, but clicking it returns a read-only-fixture error. Header stepper points to seed IDs. Workspace emits React error 418; embedded preview remained at Booting during observation. |
| Pure-function probes | Empty transcript + score 90 yields `PRODUCTION_READY`, verification 5/5 at confidence .95, and `flaw_caught=true`. Hex IPv4-mapped private IPv6 addresses pass `isPublicAddress`. Backslash redirect input passes `safeNext` but normalizes to an external origin. |
| Live external services | OpenAI and the subsequently supplied transaction pooler worked. Direct IPv6-only Postgres was unreachable locally. Fast generation saved zero requirements and no real session; chat returned 404. A complete isolated fixture challenge supported real AI chat, submission, snapshot and a 12-result AI evaluation. Synthetic DB records were cleaned up. See performance report for timings. |

Do not describe these checks as proof that deployment or the database workflow is healthy. Database races below are established by source control flow, not a production concurrency load test. WebContainer failure in an embedded browser is not proof that normal Chrome fails. Provider timing samples are small and are not p95 benchmarks.

## Execution rules for repair models

1. Read `AGENTS.md` and relevant **installed** Next.js docs under `node_modules/next/dist/docs/` before framework edits. This repo uses Next 16.3.5.
2. Work on one ticket. Re-read the current code; line numbers and status may change after earlier repairs. File paths and function names below are the durable anchors.
3. Start with a focused failing behavior test when state, persistence, security or scoring is involved. Do not add tests merely to duplicate JSX or implementation details.
4. Keep fixtures explicitly synthetic. Never recover from a live write or authorization failure by showing fixture success.
5. Preserve candidate text and evidence; do not silently rewrite, truncate or delete it to make validation pass.
6. Never run destructive migration resets or `seed --force` against the supplied database. Use a dedicated test database or clearly isolated synthetic records. Do not commit `.env*`, credentials, raw private transcripts or provider logs.
7. Finish with changed files, observed behavior, checks run, and remaining limitations. Do not claim a ticket is done if its acceptance criteria need unavailable infrastructure.

Priorities: **P0** blocks a trustworthy demo or use with real users; **P1** breaks important flows or creates material reliability/security risk; **P2** is secondary correctness/polish. Size S/M/L describes relative scope, not a time promise.

## Recommended order

| Batch | Tickets | Purpose |
| --- | --- | --- |
| 0 | R01, R02; P01 in performance report | Reproducible checks, explicit modes, correct DB connection and latency evidence |
| 1 | R03, R04 | Durable generation and strict lookups |
| 2 | R05, R06, R07 | Honest evidence, consistent report states and disclosed rubric |
| 3 | P02 in performance report; R08, R09, R10, R11 | Responsive chat, correct submission/recovery, isolated runtime and real navigation |
| 4 | R12, R13, R14 | Public-user identity/privacy and request boundary protections |
| 5 | P03–P05 in performance report; R15, R16 | Measured performance, bounded AI/context and fair fallback behavior |
| 6 | R17, R18, R19, R20 | UI/export/secondary claims, documentation and integrated rehearsal |

Do R12/R13/R14 before accepting real external candidate data, even if other demo polish is deferred. For a short hackathon deadline, use synthetic demo accounts behind an explicit demo mode and finish batches 0–3; hide unfinished commercial features. A hosting migration is not a prerequisite for these repairs.

## R01 — Make baseline checks reproducible

**P1 · S · no dependency.** Files: `package.json`, `vitest.config.mts`, lint-error locations, optional CI workflow.

Fresh typechecking relies on Next route types that do not yet exist. Lint errors currently include explicit `any` in `employer-deck.tsx`, `ai/langfuse.ts`, `data/index.ts`, `challenge-pipeline.ts`, `cognitive-rubric.ts`, `sessions.ts`; `prefer-const` in `data/prisma.ts` and `cognitive-rubric.ts`; and JSX comment text in `site/header.tsx`.

Make typecheck generate route types first using the installed Next CLI. Resolve actual lint errors with narrow types; do not turn off rules globally or erase validation. Keep unrelated warning cleanup out of this ticket. Add a minimal reproducible CI command sequence after existing scripts are reliable. Separate live-provider tests from offline tests: the current Vitest configuration unconditionally clears `OPENAI_API_KEY`, so the advertised live fairness opt-in cannot work as documented.

**Accept:** clean checkout/install → typecheck, lint, tests, build succeeds; offline tests never spend tokens; live tests require explicit opt-in and actually run when configured. Never print keys.

## R02 — Define a truthful application mode contract

**P0 · M · R01 helpful.** Files: `lib/env.ts`, `lib/data/index.ts`, `lib/api.ts`, `components/home/jd-intake.tsx`, site header/login, `.env.example`.

There are overlapping `DATA_SOURCE`, `DEMO_MODE`, `FAST_PIPELINE` and client `fast` controls. Mock mode rejects all mutation APIs but presents functional generation/chat/submit controls. `fastMode` starts true in intake; the server's `FAST_PIPELINE=true` forces simulation even when a user unchecks it. The data facade catches failures and silently swaps to fixtures while still advertising `kind: 'db'`.

Define and document three explicit capabilities: read-only fixture preview; database-backed cached demo; database-backed live AI. Remove the ambiguous fast path from the normal journey, or convert it in R03 into a labelled fixture creation path. Expose safe capability flags to UI. Read-only mode should show example navigation and explain why mutations are unavailable. Invalid environment combinations should produce actionable configuration errors. Show source provenance throughout challenge/workspace/report, not only a global badge.

**Accept:** table-driven tests for mode combinations; no mock mutation button promises persistence; unchecking a UI option cannot be silently overridden; no live failure becomes a successful demo result. No credential values in diagnostics.

## R03 — Persist a complete challenge and a real owned session

**P0 · L; split into persistence and session subtasks · R02.** Files: `services/challenge-pipeline.ts` (`runFastPipeline`, `runChallengePipeline`), `services/sessions.ts` (`startSession`), `data/mock.ts`, Prisma schema as needed.

The fast path stores a `ChallengeView` in a module Map before DB writes. It inserts no `Requirement` rows, yet reports twelve requirements (the in-memory array has six and lacks `AI_DIRECTION`). Research is marked grounded with `example.com`; stored research is missing fields expected by its schema. It catches save errors and still emits `done` with `demo:false`. `startSession` returns `sess-${challengeId}` immediately for an in-memory challenge, without creating a session. Chat/submission subsequently read only Prisma. After process restart the Map vanishes; if the DB record exists, its rubric is empty.

The live pipeline also catches transaction failure and reports a `gen-*` success. Its fallback view omits the generated starter; the mock workspace substitutes the seeded starter. This can silently change what the candidate is building.

**Live reproduction:** against the supplied reachable pooler, fast generation completed in 10.6 seconds and claimed `demo:false`. Its challenge existed with zero requirements; `startSession` returned a `sess-fast-*` ID with no stored BuildSession; `sendMessage` returned 404. This is not just a hypothetical serverless-restart failure.

Reuse one validated, transactional persistence routine for submission, challenge, starter, requirements and provenance. Emit success only after commit. On failure return a retryable error and preserve intake text. Resolve the authenticated user; do not invent a replacement account to conceal a missing user. Create/resume a real session with the correct owner. Remove module-memory authority for live assessments. If fast fixtures are retained, use the same schemas/persistence and explicitly mark them cached; do not claim research occurred.

**Accept:** live and cached DB flows survive a process restart; stored requirements match the displayed rubric; starter equals generated starter; candidate B cannot open candidate A's session; transaction failure produces no success event or orphan submission; two simultaneous starts return one active session according to an explicit uniqueness/idempotency policy. A dedicated Postgres integration test is required.

## R04 — Missing records and infrastructure failures must remain failures

**P0 · M · R02/R03.** Files: `data/index.ts`, `data/prisma.ts`, `data/mock.ts`, `services/sessions.ts`, affected pages and new route error boundaries.

`getChallenge` can return the latest unrelated challenge for an unknown ID. `getWorkspace` falls back to mock for unknown/missing records and for broad seed/demo prefixes. `findUser` and mutations can fall back to synthetic users. `startSession` catches its own 404 and returns an invented session ID. Broad alias handling can make mistyped IDs display plausible content. Mock `startSession` reuses and reassigns one shared active session.

Use exact, documented demo aliases only on explicit example routes. Live adapters return null for absent records; pages use `notFound`; service authorization failures retain 403/404/409; infrastructure errors remain 503/500 with safe copy. Remove duplicate catch-all fallback layers. Add an error boundary/retry surface so removing fallbacks does not leave a blank experience. Keep source-specific errors observable without private payloads.

**Accept:** unknown challenge/session/evaluation never substitutes another user's record; DB outage cannot authenticate a fixture identity or produce fake work; mock examples cannot change owners; exact example links still work intentionally.

## R05 — Remove unsupported assessment and certification claims

**P0 · M for removal; actual extra scoring is separate future work · R02.** Files: `services/cognitive-rubric.ts`, `data/prisma.ts`, `data/mock.ts`, `components/report/report-view.tsx`, `employer-deck.tsx`, credential pages, relevant types/fixtures.

`buildCognitiveSuites` infers nearly all cognitive scores and statements from the existing overall score and message count. It picks first/longest/keyword-matching messages as evidence and assigns fixed confidences. A direct probe with no turns and score 90 returned verification 5/5, `flaw_caught=true`, and `PRODUCTION_READY`. Privacy and injection flags are hardcoded false. The receipt is a formatted string beginning `sha256:`, not a SHA-256 digest; timestamp changes whenever mapped; calibration N=480 and evaluator version are hardcoded.

Report/employer/credential views add unsupported certification, mentor identity/signature, percentiles, benchmark counts, testing and hire-readiness claims. Source `demo-cache` or `demo-offline` is not consistently displayed. Quote existence checks do not prove correctness, independent candidate reasoning, executed tests or fair hiring validity.

For the smallest trustworthy V1, remove these derived suites/receipts and unsupported badges, or explicitly render them unavailable. Show persisted per-requirement results, actual coverage/confidence, evidence, strengths/gaps and provenance. Never replace absent candidate text with an invented quote. Do not implement a transparency log or calibration study in this repair. If additional rubrics are wanted later, version, disclose, independently assess and persist them with real evidence; do not reverse-engineer them from the overall number.

**Accept:** empty/unscored sessions receive no competence or verification claims; live pages contain no fictitious benchmark/percentile/mentor signature; repeated reads do not create new assessment facts; fixture reports visibly identify themselves as examples. Search report text for `100%`, `98th`, `480`, `140`, `Certified`, `PRODUCTION_READY`, `RFC-9162` and account for every remaining claim.

## R06 — Use one report state and real permitted identity everywhere

**P1 · M · R05.** Files: `services/effective-score.ts`, `data/prisma.ts` (`evaluationInclude`, `toEvaluationView`), `data/types.ts`, report/employer/credential components, mentor pages.

Effective numeric scores can reflect a mentor override while verdict text and cognitive suites still use the original AI score. A 90→20 override can retain strong-candidate language. Missing candidate identity falls back to names such as Alex Vance; a fixed mentor signature appears regardless of who reviewed. An offline-unscored report appears as a low-scoring candidate instead of an unavailable assessment. `NONE`, `PENDING`, reviewed and re-contested states are inconsistently presented; a report can look certified while awaiting review.

Create a small presentation model shared by report, deck and credential: assessment source, score availability, coverage, review status, effective score and basis. Join actual identity only into authorized DTOs. Keep original AI criteria as historical AI judgments when a mentor overrides only the overall score; do not fabricate criterion changes. Define and consistently display the status after a contest reopens a review. An absent score is not zero ability. Avoid categorical hiring decisions in the prototype.

**Accept:** fixtures cover no score, partial evidence, AI-only, pending, confirmed, override upward/downward, contested-after-review; all three outputs agree; identities correspond to records or are deliberately anonymous; no pending/contested result implies final certification.

## R07 — Display the rubric actually used and remove answer coaching

**P1 · M · R05/R06.** Files: `components/challenge/rubric.tsx`, `components/workspace/brief-sheet.tsx`, `chat-panel.tsx`, generation/evaluator prompts and schemas, marketing copy.

The UI promises an exact two-tier rubric, but the Barron criteria/audit-flag constants are not rendered, and the real evaluator uses seven requirement categories. The extra cognitive suite is computed separately after submission. Generic quick prompts disclose seeded answers about counting non-commenting respondents and pure gate logic, and include an unrelated 64MB constraint for arbitrary challenges. The assistant prompt forbids deliberate sabotage while copy assumes planted defects in every assessment.

Use the persisted requirement bank and version as the shared pre-build and report rubric. Explain score withholding and human review. Remove unimplemented tier promises and hardcoded seeded-solution hints. Use neutral prompts such as asking the candidate to identify uncertainties; record scaffold provenance if coaching remains relevant to assessment. Describe seeded defects as properties of that example, not a guaranteed live intervention.

**Accept:** every scored criterion was visible before submission; rubric survives refresh unchanged; three different job domains receive relevant neutral assistance; no default prompt gives away a scored seed answer.

## R08 — Make chat, start and submit safe under concurrency

**P1 · L; implement server operation state then race tests · R03/R04.** Files: `services/sessions.ts`, `services/evaluations.ts`, chat/submit routes, Prisma schema/migration.

Chat checks ACTIVE before an external AI call. While it waits, submit can snapshot files and mark SUBMITTED; the assistant can then append output after the snapshot. A pending USER turn is sufficient for submission, so assessed transcript and final snapshot may disagree. Concurrent retries can invoke the paid model twice for one USER turn; unique sequence constraints only reject the second persistence attempt afterward. Concurrent submit can duplicate evaluation calls; concurrent start uses find-then-create without an active-session uniqueness constraint.

Add durable idempotency/operation ownership keyed to session and client request ID. Define pending-message submission policy (reject with a useful 409 until resolved, or explicitly cancel and freeze a known version). Use short DB transactions and conditional writes around model calls, never a DB transaction held open over a model request. Verify session version/status again before appending. Claim one evaluation job per snapshot; retries return the existing operation/result. Handle abandoned leases with an explicit recoverable state.

**Accept:** deterministic tests with a deferred fake model cover send vs submit, retry vs retry, start vs start, submit vs submit, and two tabs. No assistant append after the frozen snapshot; exactly one canonical reply/evaluation; final files reconstruct to the submitted snapshot; retries do not double-charge by design. Test against Postgres constraints, not only in-memory mocks.

## R09 — Recover the client from saved prompts, lost responses and failed evaluation

**P1 · M · R08.** Files: `workspace.tsx`, `chat-panel.tsx`, `submit-dialog.tsx`, `evaluation-retry.tsx`, `lib/client/api.ts`, workspace read endpoint/page.

A saved USER turn survives an AI failure, but refresh loses the local retry flag. A lost network response after successful server persistence leaves optimistic turns/files stale. Retrying can return “no unanswered message” with no canonical resync. Submission closes the session before evaluation; on evaluation failure, “Keep building” suggests an action the server no longer allows.

Derive retryability from canonical server state, including pending operation IDs. Resync transcript, file version and session status after conflicts, reconnect and uncertain outcomes. Separate submitting, submitted/evaluating, evaluation-failed and evaluated UI states. Evaluation retry must reuse the frozen snapshot. Do not make report navigation wait indefinitely on browser runtime teardown.

**Accept:** refresh after saved-user/AI-failure exposes the right recovery; lost-response retry does not duplicate turns; second-tab updates do not mispair messages; evaluation failure never offers editable submitted work; retry leads to the same persisted evaluation.

## R10 — Isolate browser runtime by session and implement real recovery

**P1 · L · R09 contract helpful.** Files: `lib/runtime/webcontainer.ts`, `workspace.tsx`, `preview-panel.tsx`, `webcontainer-check/page.tsx`.

The module singleton's `startPromise` is not keyed by session. Navigating A→B can reuse A's container/files; workspace state also initializes only once from props. “Start over” calls `startRuntime(initialFiles)`, which can return the existing promise and do nothing, or restore stale initial files. Restarting the dev server does not repair failed dependency installation. Boot/install have no bounded completion; stop is not fully serialized against queued startup. Stale process events can overwrite current state.

Retain one WebContainer per page, but explicitly own it by session ID and generation number. On session change, serialize/cancel old work and mount current canonical files. Key/reset workspace component state. Implement full reset separately from dev-server restart, use latest saved files, add boot/install/start/stop deadlines and stale-event guards. Preserve chat/file access when preview is unavailable. Lazy-load runtime code and profile actual boot/install separately (P04).

**Accept:** A→B→A and diagnostic→workspace show correct files; strict-mode double mount remains safe; failure at each phase has a functioning retry; reset preserves saved edits; leaving mid-boot cannot resurrect a previous session; timeout produces actionable status. Verify in supported desktop Chrome/Edge as well as unsupported-browser fallback.

## R11 — Keep navigation inside the current assessment

**P1 · S/M · R03/R04.** Files: `site/stepper-nav.tsx`, header/layout and challenge/build/report pages.

Every stepper links to hardcoded seed challenge/session/evaluation IDs. Users can leave their real assessment for an unrelated demo by clicking the apparent next step; seeded workspaces can then hit DB-only mutation failures.

Pass or derive explicit flow context containing the actual challenge, session and evaluation IDs. Show unavailable future steps as non-links. Keep sample reports in separately labelled example links. Preserve return context through sign-in and successful generation.

**Accept:** follow the whole stepper in a new non-seed assessment and never visit seed data; back/forward/refresh retain correct state; direct report/example links work intentionally.

## R12 — Gate demo impersonation; implement real authentication before real users

**P0 for public real-user use · M/L · R02/R04.** Files: `lib/auth.ts`, `actions/auth.ts`, login, `role-switcher.tsx`, `site/header.tsx`, API/action authorization.

Authentication is deliberately mocked, but remains mocked with `DEMO_MODE=false`: a raw cookie contains user ID, sign-in trusts an email, passwords are decorative, and public `switchUser` can choose any existing user. The header loads all users, including emails, to render the role switcher. Supabase auth environment variables do not create an auth integration; this repository has none.

Short hackathon repair: hard-gate synthetic account switching to an explicit demo-only deployment and make the UI honest. Live mode must refuse mock impersonation. Before external real users, integrate verified sessions (the existing Supabase project is an option, not an already implemented feature), validate sessions server-side and retain ownership/role checks on every mutation and page. Set production cookie security attributes. Do not expose a global user list. Add logout/expiry/invalid-session handling.

**Accept:** editing the cookie or posting another user's ID cannot impersonate them in live mode; candidate cannot review or access another workspace; anonymous users cannot enumerate users; demo role switching works only for synthetic accounts in the deliberate demo environment. Avoid weakening checks to make fixtures pass.

## R13 — Make public reports an explicit, minimal sharing decision

**P0 before real candidate data · M/L · R06/R12.** Files: report/employer/credential pages, `data/prisma.ts`, `data/types.ts`, evidence explorer, sharing actions, `ai/langfuse.ts`.

Reports are public by ID and carry transcripts, files and assistant reasoning into client components. There is no candidate-controlled share/revoke policy. A blind mentor presentation can link to an identity-bearing dossier. Evaluator input excludes separate identity fields, but a candidate can still put personal information in messages/files; the claim of absolute blindness is stronger than the implementation. Langfuse sends prompt/transcript material to another service when configured.

Default real assessments to owner/authorized mentor access. Provide explicit consented share tokens and a minimal public report DTO; support revoke and avoid search indexing. Do not transmit the full private transcript to an unauthorized browser and merely hide it visually. Preserve private evidence for authorized review. Define what mentors may see, and remove identity shortcuts during blind review. Explain provider/telemetry processing and minimize traces; do not claim automatic anonymity. For the hackathon use clearly synthetic examples and disable public real submissions until this is done.

**Accept:** unauthorized fetch/HTML/RSC payload contains no private evidence; revoked shares stop working; public view contains only approved fields; mentor DTO follows the intended blind-review policy; trace payloads exclude credentials and unnecessary personal content.

## R14 — Fix network and request boundary bypasses

**P1; required before public live use · M, split into three small changes · R12 for auth-related tests.** Files: `lib/fetch-jd.ts`, `lib/auth.ts` (`safeNext`), `lib/api.ts` (`readBody`).

1. `isPublicAddress` checks dotted IPv4-mapped IPv6 but allows the canonical hexadecimal forms `::ffff:7f00:1` and `::ffff:a9fe:a9fe`. Direct probes return true. URL parsing can normalize dotted addresses to these forms. Normalize IPv6 using a vetted parser and test the embedded IPv4 address; retain validation of all DNS results and every redirect. Add an absolute overall request deadline; socket inactivity timeout alone does not bound a slow trickle.
2. `safeNext` accepts slash followed by backslash: `/\\outside.example/path` matches the regex but URL normalization changes the destination origin. Reject backslashes/control characters and validate against a trusted same-origin base; preserve valid internal query/hash navigation.
3. `readBody` trusts declared length for its early check, then loads the entire body before applying a JavaScript-character count called bytes. Enforce an actual streaming UTF-8 byte cap, cancel on overflow, and map malformed data safely.

**Accept:** table tests include IPv4/IPv6 literals, mapped hex/dotted addresses, redirect-to-private, mixed DNS results, slow body and abort; no real internal-network probe is necessary. Redirect tests cover backslashes and encoded edge cases. Request tests cover chunked oversized data without Content-Length and multibyte characters. Preserve safe URL import and ordinary JSON requests.

## R15 — Bound context and preserve evidence when capacity is reached

**P1 · M · R08/R09; coordinate with P03.** Files: `ai/build-assistant.ts`, `ai/prompts/evaluator.ts`, `ai/client.ts`, `services/sessions.ts`, client APIs.

The allowed turn count and per-message size can create a very large history. Assistant whole-file rewrites can be generated from files truncated at 20k characters, risking silent loss of unseen content. The evaluator's file-budget logic retains a minimum per-file allowance even after the total budget is exhausted. There is no consistent total request budget or disclosure when relevant evidence is omitted.

Measure and enforce total context/token budgets including schema/system/history/files. Keep full canonical evidence server-side. Select relevant files explicitly, refuse unsafe rewrites of truncated files, and expose omitted context as an assessment limitation. If evidence cannot be evaluated, withhold affected scores/escalate instead of treating absence as candidate failure. Add bounded provider timeout/retry budgets and per-user/global usage controls before anonymous public exposure. Choose a clear user-facing limit rather than silently cutting earlier reasoning.

**Accept:** maximal-turn and maximal-file fixtures remain within documented budgets; no rewrite destroys an unseen file suffix; omitted assessment evidence cannot yield confident negative judgments; retries and provider timeouts have bounded total duration and a recovery path.

## R16 — Keep rubric fallback and fairness claims grounded

**P1 · M · R05/R07.** Files: `ai/generate-requirements.ts`, `ai/barriers.ts`, `ai/scoring.ts`, `ai/schemas.ts`, `tests/fairness.test.ts`, corresponding report text.

Requirement generation catches any error and returns a generic fallback, masking provider/auth/schema errors. The fallback is not equivalently validated/provenanced and contains seeded/stack-specific assumptions. Barrier filtering can remove an entire demonstrable skill when it overlaps a sentence such as “5 years of experience with distributed systems”; negations deserve tests. Evidence verification proves a quote appears, not that it supports the criterion or represents the candidate's own reasoning. Free-text strengths/gaps and rationales do not carry the same citation contract. `computeOverall` derives its denominator from result rows, so partial stored results can overstate coverage (normal finalization fills missing rows, but the read path still needs defense).

Return an explicit failed/partial stage when a valid rubric cannot be produced, or use a separately labelled validated fallback. Preserve technical skill content while removing proxy duration/credential gates. Make coverage use the complete unique requirement bank; reject duplicates/unknown IDs consistently. Apply explicit candidate-attribution rules to reasoning criteria, distinguish artifact evidence from proof of independent candidate decisions, and qualify uncited narrative. Keep prompt fairness rules but describe empirical fairness as unproven until evaluated.

**Accept:** forced provider failure cannot yield a falsely live verified rubric; mixed skill/proxy and negation cases retain the intended technical requirement; partial/duplicate results do not inflate coverage; assistant-only reasoning evidence is not credited as independent candidate judgment. After R01, run explicitly opted-in paired grammar/reasoning evaluations and report actual results, not a universal bias-free guarantee.

## R17 — Fix input limits, time labels and responsive/accessibility defects

**P2; hydration/input failures first · M · R09.** Files: intake, chat/workspace/time formatting, header, evidence/file viewer, common UI.

Intake/API allow 25,000 characters but parser rejects above 20,000. The JD textarea lacks a clear accessible name. File import needs a bounded file size and read-error path. Sign-in navigation can lose the draft. Chat can silently disable an oversized message without a useful count/error. Workspace displays fabricated token budget 78%, an apparent 20-turn limit that differs from server 200 turns, and “AUTOSAVED [current local time] UTC” instead of persisted save status. Browser console showed React hydration error 418; locale/current-time formatting is a likely source requiring confirmation, not blanket suppression.

Share client-safe limits without importing server-only modules. Preserve draft through sign-in, report input errors near the field, and derive status from actual persisted events. Use deterministic server/client initial date formatting and an explicit timezone. Remove fake usage figures. Inspect 320/375/768px and desktop layouts; dense header/file-tree/workspace height require a keyboard and overflow pass. Fix focus and labels based on actual browser inspection.

**Accept:** boundary-length inputs behave identically in UI/API; file read failure is recoverable; typed draft survives authentication; no unexplained disabled send; no hydration error on fresh/refresh navigation; meaningful focus order and no critical off-screen controls at narrow widths. Do not use blanket `suppressHydrationWarning`.

## R18 — Make export represent the complete assessment

**P2 · M · R05/R06.** Files: `employer-deck.tsx`, `report/actions.tsx`, credential routes, `globals.css` print rules.

The employer deck renders only `currentSlide`; printing therefore exports only that card. Broad print selectors hide all header/nav/aside elements, including potentially meaningful content, while some action links remain. Scroll-limited transcript/evidence sections can clip. A global Space keyboard handler can intercept interaction with share/print buttons.

Create a print-only complete deck or a dedicated export view using the shared report state. Keep screen carousel behavior separate. Use specific print classes, sensible page breaks and unclipped essential evidence. Ignore deck shortcuts while interactive elements/inputs are focused. Replace unsupported PDF/certification claims with the actual export behavior.

**Accept:** print preview contains every intended card/page and correct review/source state; no orphan controls or clipped essential text; keyboard activates focused buttons normally; inspect exported output visually.

## R19 — Remove simulated commercial outcomes and unsupported service promises

**P2 · S · no dependency except shared copy with R05.** Files: `partnerships/page.tsx`, `pricing/page.tsx`, employer actions, marketing/footer.

Partnership inquiry only toggles local success, with no delivery. Interview action claims a copied outcome via alert without implementing it. Pricing upgrades route to sign-up without billing/entitlements. Service/mentor SLA, partnership and benchmark claims exceed implemented functionality.

For this hackathon, label unavailable flows planned or disable them with honest copy. Implement a small existing action such as clipboard copy only if it is truly intended and test failure fallback. Do not add billing, CRM, outbound email or recruiter integrations merely to fill these gaps. Keep the judged journey prominent.

**Accept:** no UI says sent, copied, upgraded, partnered or reviewed unless the corresponding operation occurred; planned features are visibly distinct from working ones.

## R20 — Document, seed and rehearse the real journey

**P1 final release gate · M · prior selected tickets.** Files: `README.md`, deployment guide, `.env.example`, `prisma/seed.ts`, integration/browser test setup.

README is mostly framework boilerplate. Existing deployment prose asserts environmental success that a fresh checkout cannot establish. Seed exits early if a submission already exists, so interrupted partial seeds can remain incomplete; force seeding can remove work attached to the seeded source. There is no integrated regression suite covering persistence, browser runtime and report claims.

Document exact mode/setup commands, DB connection choice, region, seeded-account limits, live API requirements and honest unsupported features. Make seed resumable/idempotent in a development DB; do not silently reset existing candidate work. Add a small Postgres integration suite and browser smoke path with controlled model responses. Use live calls only in an explicit bounded separate rehearsal. Produce a five-minute demo script and a contingency using clearly labelled saved synthetic evidence.

**Accept:** another developer follows the guide from clean checkout without hidden setup; seed twice gives the same fixture set without overwriting unrelated work; the matrix below passes; source, review and evidence caveats are visible in the demo and pitch.

## Release acceptance matrix

| Scenario | Required outcome |
| --- | --- |
| Fixture preview without DB/key | Browse labelled examples; no promise of writable assessment |
| Cached DB demo, no model key | Saved synthetic challenge/session, chat, submission, report and mentor flow work |
| Live DB + AI, small synthetic JD | All records durable; rubric/starter match; evidence/source truthful |
| DB unavailable before/during generation | Safe error; no mock account/challenge/session success |
| Unknown/foreign IDs | 404/403 as appropriate; no substituted assessment |
| AI refusal, rate limit, timeout, invalid schema | Saved candidate message retained; no fabricated success; safe retry |
| Disconnect after successful chat persistence | Canonical resync; exactly one reply and correct files |
| Concurrent send/retry/submit | No post-snapshot writes; one claimed operation; stable report |
| Runtime install failure; A→B navigation | Recovery uses correct latest session files |
| No score/partial/pending/override/contest | Report, deck and credential agree and state limitations |
| Private/shared/revoked report | Access and minimal public payload follow consent |
| Print/mobile/keyboard | Complete readable export and usable critical controls |
| Performance replay | Stage timings and failures recorded; no unsupported claim that hosting fixed latency |

## Scope intentionally deferred

Do not build payments, a recruiter CRM, a cryptographic transparency service, a benchmark cohort or a new cloud architecture while repairing the demo. Real hiring validity, bias calibration and outcomes require a separate empirical evaluation with human oversight; UI labels and a passing mocked unit test cannot establish them.
