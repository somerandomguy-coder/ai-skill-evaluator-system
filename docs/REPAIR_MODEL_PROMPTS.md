# Small repair assignments for a cheaper coding model

Use `AUDIT_AND_REPAIR_PLAN.md` for evidence and acceptance criteria, and `PERFORMANCE_AND_HOSTING.md` for measured latency and hosting decisions. Assign one task per run. Do not ask a model to “fix everything” in one pass.

## Shared opening prompt

Copy this, replacing the ticket ID:

```text
Implement ticket [ID] from docs/AUDIT_AND_REPAIR_PLAN.md or
docs/PERFORMANCE_AND_HOSTING.md in this repository.

First read AGENTS.md and the relevant installed Next.js guide under
node_modules/next/dist/docs/. Read that ticket, its dependencies, and the named
source files. Inspect git status and preserve unrelated changes. Reproduce the
stated behavior or explain precisely why the current code no longer has it.

Implement only this ticket. Preserve the existing product flow and visual style.
Do not redesign the application, silently substitute fixtures for live failures,
weaken authorization, invent evidence, or remove validation to pass tests.
Do not print or commit credentials. Do not reset/migrate/seed the shared production
database destructively. Do not deploy or change production settings in this run.

For state, persistence, scoring or security changes, add focused regression tests
for the ticket's acceptance cases. Use a dedicated test database for integration
tests. Run relevant checks, then the required project checks once changes settle.
If live infrastructure is unavailable, state which acceptance cases remain
unverified; do not mark them passed.

Finish with: behavior fixed; files changed; tests/results; remaining risks; any
follow-up dependency. Keep the diff small and stop when this ticket is complete.
```

## Suggested assignments in order

Do P01 immediately if database connectivity is not configured. The audit verified the supplied transaction pooler locally; it did not update Vercel settings. Its later table entry is the deployment measurement follow-up.

| Run | Ticket/scope | Specific boundary |
| --- | --- | --- |
| 1 | R01: reproducible commands and current lint errors | No broad warning cleanup or package upgrades |
| 2 | R02: explicit modes and UI capabilities | Document contract before changing the generation path |
| 3 | R03a: transactional challenge persistence | Submission/challenge/requirements/starter/provenance; remove success-on-save-failure |
| 4 | R03b: real owned start/resume session | No synthetic session IDs; one active session under concurrent start |
| 5 | R04: strict lookup/error behavior | Unknown IDs/outages must not substitute fixtures; provide error UI |
| 6 | R05: remove unsupported suites/receipts/claims | Prefer removal/unavailable state; do not build a new scoring system |
| 7 | R06: shared report state and actual identities | Report, deck, credential agree after override/contest/offline state |
| 8 | R07: actual rubric and neutral assistance | No seeded-answer coaching or hidden scoring promises |
| 9 | P02: chat completion independent of preview | Small high-value latency fix; preserve ordered runtime writes |
| 10 | R08a: claim chat operation and freeze submission | Short transactions, conditional append, no AI inside DB transaction |
| 11 | R08b: retry/evaluation idempotency and race tests | One canonical operation/result; test deferred model races |
| 12 | R09: reconnect/refresh/submitted recovery | Client reflects server state rather than transient local flags |
| 13 | R10: session-owned runtime and real restart | Reset current files, deadlines, stale event cancellation |
| 14 | R11: actual assessment navigation | No seed-ID links in a real flow |
| 15 | R12a: demo-only impersonation gate | Block mock auth in live mode; no real-user auth claim yet |
| 16 | R12b: verified live auth | Only if real user rollout is required; all ownership/role tests |
| 17 | R13: private evidence and explicit minimal sharing | Separate owner/mentor/public DTOs and revocation |
| 18 | R14a: IPv6 SSRF normalization and fetch deadline | Pure network/address tests; never probe private network services |
| 19 | R14b: redirect normalization | Small isolated tests for same-origin return paths |
| 20 | R14c: streaming request byte limit | Missing Content-Length and multibyte cases |
| 21 | P01: connectivity/region measurement | Read-only diagnostics first; requires exact pooler/settings |
| 22 | P03a: stage timing/token instrumentation | Separate rubric stage; no prompt/model changes yet |
| 23 | P03b: measured AI tuning | Same synthetic inputs before/after; bounded opt-in live spend |
| 24 | P04/P05, one run each | Browser performance then telemetry lifecycle, separately |
| 25 | R15: context limits and evidence preservation | No unsafe whole-file rewrite from truncated source |
| 26 | R16a: valid explicit rubric fallback and barrier handling | Retain technical skill while removing proxy gate |
| 27 | R16b: coverage/attribution robustness | Do not equate exact quote match with valid judgment |
| 28 | R17: input/time/hydration, then responsive pass | Split browser layout polish if it grows |
| 29 | R18: complete print/export | Visually inspect exported result |
| 30 | R19: honest secondary feature states | No billing/CRM integration expansion |
| 31 | R20: documentation, safe seed, end-to-end rehearsal | Run the acceptance matrix; list unresolved checks |

The numbering is not a demand to complete every run before a synthetic hackathon demo. Prioritize R02–R11 and P01/P02 for a functional, truthful demo. Security/auth/privacy tasks are required before real external candidates. P06 is an optional hosting experiment only after approval to deploy it.

## Prompt for the first performance repair

```text
Implement P02 in docs/PERFORMANCE_AND_HOSTING.md only.
The concrete bug is that Workspace.runChat awaits applyRuntimeWrites after the
server has saved the answer, while the runtime write queue may be waiting forever
for boot/install. Separate chat request completion from preview synchronization.
Keep canonical files and ordered per-session writes. A preview failure must not
remove a saved user turn, mark the AI request failed or hold the composer pending.
Use deferred runtime promises in a focused regression test. Do not change models,
hosting, auth, schemas or the page design. Read AGENTS.md and installed Next docs.
```

## Prompt for reviewing a completed repair

```text
Review the current diff against ticket [ID] in docs/AUDIT_AND_REPAIR_PLAN.md
or docs/PERFORMANCE_AND_HOSTING.md. Do not implement unrelated improvements.
Check whether acceptance cases are covered and whether the repair hides failures,
weakens ownership, loses evidence, breaks explicit demo mode or changes unrelated
behavior. Run the smallest meaningful validation. Report only actionable issues
with file/line and a concrete failing scenario, then list any unverified cases.
```

## Handoff checklist

- Ticket and dependency status are explicit.
- No secret values, raw private candidate data or temporary credential files are included.
- A narrow test explains the old failure and verifies the new behavior.
- Success means persisted state when persistence is required.
- Unknown/unavailable evidence is shown as unknown/unavailable.
- Any database migration has a non-destructive development verification path.
- Results distinguish offline tests, live provider tests, browser tests and actual deployment tests.
- The next model receives the ticket and relevant files, not a vague instruction to continue everything.
