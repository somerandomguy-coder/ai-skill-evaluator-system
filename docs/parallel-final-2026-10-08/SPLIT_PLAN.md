# Two-agent implementation plan

Start with `BASELINE.md`. This is the remaining-work split after main `9eb7a3c`, not an instruction to repeat every packet in the previous research plan. Both branches receive these documents in one common starting commit.

| Agent | Machine / branch | Responsibility |
| --- | --- | --- |
| A | This machine — `codex/final-assessment-trust` | Identity, report privacy, durable state, evidence/assessment correctness, optional Jev/cost records, final integration. |
| B | Other machine — `codex/final-workspace-readiness` | Task generation quality/validation, browser workspace/runtime, stream/error recovery, generation and UX evidence notes. |

This is a split by file ownership, not an estimate that both halves take the same time. A has more cross-cutting risk and owns the merge. B can start immediately on pure generation and browser work. Finish release blockers before optional research features; do not add a new retrieval system or redesign the product tonight.

## File ownership — one writer per file

**B owns only these existing paths and their focused tests:**

- `src/lib/engine/{pipeline,resolver,embedding,draft-fixtures,starter-template}.ts`
- `src/lib/types/assessment-v2.ts` (additive metadata only; preserve exported existing fields/signatures)
- `src/lib/services/challenge-pipeline.ts`
- `src/app/api/jd/route.ts`, `src/app/api/jd/inspect/route.ts`, `src/app/api/challenge/generate/route.ts`, `src/app/api/challenges/search/route.ts`
- `src/lib/ai/{classify-jd,inspect-jd,parse-jd}.ts`, `src/lib/fetch-jd.ts`
- `src/components/workspace/**`, `src/lib/runtime/**`, `src/lib/sqlite/**`, `src/lib/client/api.ts`
- `src/components/home/{jd-intake,pipeline-progress}.tsx`, `src/components/challenge/**`, `src/app/challenge/[id]/page.tsx`
- Existing tests: `resolver-initialization`, `pipeline-provenance`, `draft-fixtures`, `v2-assessment`, `inspect-jd`, `fullstack-sqlite` (all under `tests/*.test.ts`). New tests use `tests/generation-*.test.ts` or `tests/workspace-*.test.ts`.
- New notes: `docs/parallel-final-2026-10-08/B_PROGRESS.md`, `B_HANDOFF.md`, `GENERATION_AND_UX_NOTES.md`.

**A owns all other application/configuration files**, especially:

- `prisma/**`; `src/lib/data/**`; `src/lib/{auth,api,env,files,pipeline-events}.ts`; package/lock/test/Next/CI configuration.
- `src/lib/services/{sessions,evaluations,cognitive-rubric,effective-score,challenge-persistence}.ts`; assessment engine/types; remaining provider/scoring/telemetry modules.
- Login/auth actions/callbacks, build/chat/submit APIs, report/credential/mentor pages and report components, sharing APIs, mentor/audit/bounty APIs.
- Assessment, identity, privacy, persistence, concurrency and provider tests; shared `tests/setup.ts` and helpers.
- This plan, baseline, architecture and final integration documentation.

B must not edit A files to silence types or tests. Record an exact requested change and failing caller/test in `B_HANDOFF.md`, then continue independent work. A likewise does not edit B-owned files until B's final SHA is frozen. Small B-side test helpers can be separate files. No mass formatting, unrelated cleanup, dependency upgrades, or global lint suppression.

## Integration contracts frozen during parallel work

1. Keep `runChallengePipeline(input, emit)` and existing `PipelineEvent` variants compatible. B can improve validation, messages and timing internally. A integrates the durable generation lease at the authenticated entry point after B's branch is merged. B must not invent a second operation store.
2. Keep `saveChallengeAtomically(input): Promise<{ challengeId: string }>` and `getCurrentUser` / `requireApiUser` callers compatible. A owns persistence and real identity. User identity always comes from the verified server session, never request JSON.
3. `ChallengeV2.metadata` / `provenance` may gain optional JSON-safe fields. B documents fields and examples in `B_HANDOFF.md`; A persists and hydrates them in `Challenge.meta`. Keep template/task-local rubric IDs stable in generated content; A maps to globally unique stored IDs consistently across evaluations.
4. Resolver currently imports synchronous `taskApprovalRepo` methods. A creates the production asynchronous DB adapter separately first and postpones changes to B-owned resolver/service call sites until integration. Existing file adapters must be demo/test-only by release. This is an explicit integration dependency, not permission to ship local JSON in production.
5. B may change the browser runtime API and all its B-owned callers together. Server chat/submit payloads stay compatible. Never submit browser-held files as trusted assessment evidence.
6. A owns package.json/lockfile, headers, global limits, DTO/envelope schemas and provider transport. If B needs a new dependency, a server API change, a safe path-validator change or new NDJSON event variant, propose it in the handoff; use independent local helpers only where that does not duplicate a security boundary.

## Agent A — this machine

### A0. Durable schema and storage foundation — first

Evidence: F04, F08, F09, F10. Dependencies: none; coordinate schema before other A packets.

- Prepare a reviewed migration for existing unmigrated schema changes plus durable task content versions, audit history, owner-bound share grants and operation leases as needed. Preserve existing users/tasks/sessions; do not assume deployment has the same migration history. Produce a drift/preflight and rollback document; apply only to a disposable test DB.
- Store complete pinned task/rubric/provenance versions, with a transactionally consistent relationship to sessions. Avoid conflating reusable template IDs with per-owner saved instances and globally unique requirement IDs.
- Replace production filesystem/Map persistence with database adapters. Commit related task, rubric and approval state atomically; distinguish post-commit failures from rolled-back work. No silently empty store on read failure.
- Acceptance: fresh DB from migrations works; existing synthetic pre-change data remains readable; two owners can instantiate the same fixture without collision/leak; failed rubric insert rolls back the task/submission; a fresh process sees grants, approvals and operation state. New task edit invalidates current approval while historical session keeps its old version.

### A1. Verified identity and role authority

Evidence: F01. Use the project's Supabase identity direction, with server-side token/session verification and an explicit mapping to application users. Never promote an account to mentor based on a submitted email or role. Keep fixture identity strictly isolated to demo. Missing/malformed auth configuration fails closed.

Acceptance: non-demo email-only impersonation fails; forged/expired/revoked identity fails; authenticated candidate cannot mutate another account/session or enter mentor APIs; legitimate mentor can review; logout clears the authenticated session. Exercise login actions/callbacks and route callers. Document configuration names without values.

### A2. Private reports, sharing and telemetry

Evidence: F02/F03. Audit all report/credential/employer aliases, downloads, payloads and client props. Implement owner-created/revoked/expiring scoped share grants and a minimal server DTO. Omit private transcripts/files/reasoning/JD, contest notes and internal hashes/traps; public excerpts require explicit consent and verified USER-turn attribution. Review authorization must be explicit rather than implied by a public token.

Acceptance: anonymous and cross-owner access fail on every private route; share visitors receive only allowlisted fields in rendered output and serialized client payload; expiry/revocation works across two instances; assistant quotations cannot become candidate evidence. Trace tests cover explicit tracking and SDK wrappers; use metadata-only defaults. Do not use UI hiding as access control.

### A3. Frozen evidence, safe retries, generation operations

Evidence: F04/F05/F09/F10 and concurrency risks. Transactionally pin transcript sequence/version and server-reconstructed file snapshot before dispatch. Only a lease holder dispatches evaluation. On a 15-second UI wait timeout, return pending; never start a second evaluation just because the first is slow. Make retry, expiry and ambiguous upstream outcome policies explicit; no claim of exactly-once billing across an external API.

Build a shared owner/input/version-bound operation and quota service. At final integration wire it before generation/classification calls on both entry paths, not just inside the final save helper. Persist a successful draft for save retry without rerunning models. Rate limits must use shared storage.

Acceptance: simultaneous submits (including >15-second provider delay) dispatch once in the test; chat/submit races cannot change frozen evidence; retry after successful generation plus DB failure reuses the draft; other owners cannot retrieve/replay it; repeated template/rubric IDs remain safe; ambiguous upstream failures are marked honestly.

### A4. One truthful persisted assessment and mentor decision

Evidence: F06/F07. Read actual SFIA level from validated pinned metadata. Keep code artifact evidence separate from candidate judgment; all candidate claims need captured USER support. Store one versioned validated envelope used consistently by mentor, candidate and employer projections. No read-time regeneration of legacy verified-looking claims. Remove fixed calibration/protocol/model claims, hardcoded success stories and seed quote fallbacks from live reports.

Acceptance: sparse USER input plus strong ASSISTANT output does not score candidate reasoning highly; Level 2 stays Level 2 through the real persistence path; null/unavailable assessment triggers review; reload does not change the assessment/digest; mentor adjustment remains separate from original AI score and is consistent in every view; a legacy row is clearly unverified. Inspect effective-score ordering and concurrent mentor decisions.

### A5. Optional Jev shadow and cost records — after blockers

Jev is an experimental shadow recommendation, not a mentor gate. First establish the actual provider/API contract and configured endpoint from approved documentation/configuration; do not invent an SDK or send data to an inferred service. Add a feature flag off by default, bounded minimized input, strict result validation, time/cost limits and a versioned stored shadow record. No blocking the report on a slow/unavailable shadow call, unawaited serverless work, score changes, automatic publication or suppression of required mentor review. If no verified integration contract exists, deliver a tested adapter interface and mark the live integration blocked.

For Wendy, record stage/provider/model, measured versus estimated tokens/cost, currency, pricing-version/date and retries. Unknown cost stays unknown; do not assume a fallback was free or present research-only prices as production unit economics. Deliver `ASSESSMENT_AND_COST_NOTES.md`: score meaning, actual limitations, verified improvements, before/after tests and trade-offs. A failed Jev canary is not a blocker for the conservative release.

## Agent B — other machine

### B1. Generation contracts and honest provenance — first

Evidence: F11 plus source-coverage risks. Fix configurable truncation; explicitly distinguish source facts, assumptions and omissions. Exercise decisive middle/tail facts, vague/nontechnical ads, mixed domains, junior/senior mismatch and injection-shaped text. Keep authored collaborative-editing and offline-sync drafts pending, complete and domain-specific. Preserve default generation without unnecessary embeddings; do not enable semantic reuse by client input.

Keep existing schema/rubric bounds, validated safe starter paths and framework labeling consistent; resolve SFIA 8/9 inconsistencies against the actual intended mapping and cite that mapping in notes. Do not call a custom limited rubric full SFIA certification. Document serializable stage provenance additions for A's persistence adapter.

Acceptance: custom truncation limits are honored; omitted-critical-information cases clarify/fail safely; seven categories and IDs/weights remain valid; no unsafe path or assistant-only statement promoted to candidate ability; curated fixture routing doesn't claim authenticated mentor approval; ordinary unknown-JD path makes zero embedding calls. Preserve existing passing tests and add tests through real generation orchestration where helpers previously masked gaps.

### B2. Consistent generation entry points and recovery

Evidence: F12. Map UI inspection, `/api/jd`, direct generation and fast/rehearsal routes. Production clients cannot bypass mandatory validation by setting `fast`; distinguish a conservative prompt-injection policy from proven injection immunity. Keep real identity guards and add rejection before expensive work where possible. Raw provider/DB exception text must not become user-visible error text.

Keep `saveChallengeAtomically` as the persistence boundary. Success is emitted only after a committed save. Bound request/response sizes and validate streamed events. Remove artificial delays from non-demo fast paths; record stage timing without logging raw JD/transcript. Audit URL-fetch validation/redirects for private-network access using mocked addresses; never probe internal live services.

Acceptance: both entry paths enforce equivalent minimum rules; malformed/oversized/unauthorized requests cause zero generation; fast flag cannot bypass quality/security checks; save failure does not emit done; client-disconnect handling does not throw repeated enqueue errors or silently dispatch retries. The durable quota/lease hookup is A's integration dependency: document the exact hook positions, do not claim it complete on an in-memory counter.

### B3. Workspace lifecycle and stream reliability

Evidence: F13/F14. Key runtime ownership to workspace/session, isolate teardown from queued old writes, and cancel/ignore late callbacks after switching. Keep React Strict Mode safe without retaining another session's project. Bound installation/start waits and provide recoverable visible errors. Inspect preview origin/iframe permissions, SQL resource lifecycle and log truncation; fix confirmed issues with focused tests.

Make the NDJSON parser handle split chunks, trailing final line, malformed records, EOF without a terminal event, disconnect and abort. UI recovery cannot blindly resubmit a potentially completed paid operation. Show pending/retry state using current API contracts; ask A for a richer status contract if necessary.

Acceptance: switch A→B during install and after success without A files/logs/preview appearing in B; late A writes are ignored; repeated mounts don't boot twice; submission cannot race an active stream; network loss gives a truthful state; unsupported WebContainer retains usable evidence/workflow guidance. Use mocked runtime tests plus a real browser rehearsal; if browser execution is unavailable, record it as blocked, not passed.

### B4. Evidence notes and handoff

Deliver `GENERATION_AND_UX_NOTES.md` for the pitch: what changed about vague JDs, where source data/framework mapping actually enters, failures observed then fixed, costs/latency drivers and alternatives/trade-offs. Only measured numbers, with sample count/configuration; no invented 100-JD coverage, human validation or benchmark accuracy. Unit test counts are engineering validation, not product quality scores.

`B_HANDOFF.md` must list commits, files, baseline/new checks, remaining failures, additive metadata contracts, requested A-file edits, exact remaining integration hooks and browser results. Commit and push only B's branch. Do not merge main or A, rebase public history, deploy or apply migrations. Freeze the final SHA when handing back to this machine.

## Merge and release checklist — this machine only

1. Inspect both branch histories and verify they share the documentation baseline. Preserve the original dirty checkout; use the clean attached A worktree.
2. Require B's final commit SHA and completed handoff. Fetch origin; inspect `git diff <common-base>...origin/codex/final-workspace-readiness`. Check file ownership and secret/large-file hygiene before merge.
3. On A, merge the reviewed B SHA with a normal merge. Do not cherry-pick the same commits and then merge them again. Resolve shared types/call sites explicitly; do not use blanket ours/theirs.
4. A performs the deferred integrations: async DB approval lookups, metadata persistence/hydration, production quotas and pre-dispatch generation lease, any required API status changes. Add tests across the combined paths.
5. From the integrated commit run generated Prisma/Next types, typecheck, focused tests, full offline tests, lint and production build. Baseline lint debt is recorded separately; touched paths must introduce no lint errors. Record build/network/environment blockers honestly.
6. In a disposable DB, apply migrations and rehearse two candidates plus mentor: generate, reload, chat, disconnect/retry, submit, review/adjust, share, revoke, cross-owner denial, fresh-instance reload. Exercise simultaneous submit and >15-second inference. Run a browser pass for workspace switch and preview containment.
7. Update architecture and technical notes to match the integrated result; report tested SHA and remaining limits. Push the integration branch for review. No production migration/deployment/main merge is implied by this coding handoff.

## Reading order / what to give the agents

Give each agent the **repository on its assigned branch**, `BASELINE.md`, this file and its machine prompt. The three earlier `ASTRA_*.md` files under `docs/agent-handoff-2026-10-08/` are supporting acceptance detail, not current completion status. The whole raw research folder is not required; it contains local-only material and large archives. If a research claim needs unavailable source data, label it unverified and request the specific artifact rather than fabricating a result.
