# Bounded implementation packets

Read [the plan](ASTRA_IMPLEMENTATION_PLAN.md) first. Copy the shared instruction and **one** packet into the implementing model. These packets are assignments for future implementation; none is recorded as completed by this review.

Avoid sending a cheaper model all the raw experiment archives. Give it the relevant source files, the named evidence summary, and the acceptance rows. If a packet needs schema design or cross-service coordination, use a stronger reviewer for that contract, then let a cheaper model implement the agreed diff.

## Shared instruction — prepend to every assignment

```text
Implement only packet [ID] from docs/agent-handoff-2026-10-08/ASTRA_EXECUTOR_PACKETS.md.
Read ASTRA_IMPLEMENTATION_PLAN.md, that packet, and its acceptance rows in
ASTRA_VALIDATION_MATRIX.md. Read AGENTS.md and relevant installed Next.js guides.
Inspect git status/diff before editing; this repository contains important
uncommitted implementation and research. Preserve it. Do not reset, auto-pull,
rewrite labels/ledgers, revert good existing safeguards, commit, push, or deploy.
Recheck the cited functions; anchors refer to the October 8 working tree.
Implement the smallest complete change. Use synthetic fixtures, mocked providers,
and a disposable database for integration tests. No live migrations/seeding,
production record changes, new paid experiments, or credential disclosure.
Do not skip failed assertions or weaken test coverage to make the suite green.
Unknown transport outcome is not proof a provider request was unbilled.
Before editing, state the files and contract you will change. Afterward report
changed files, acceptance rows proved, commands/results, outstanding blockers,
and migration/rollback notes if applicable. A blocked test is not a pass.
If a required dependency packet is incomplete, implement independent work only
and report the dependency; do not invent a second incompatible schema.
```

## M00 — Make offline verification reproducible

**Files:** `vitest.config.ts`, `package.json`, relevant test setup; initially no application edits. Existing config clears only `OPENAI_API_KEY`.

```text
Diagnose the Windows Vitest 5 temporary SSR-file ENOENT without changing scoring
expectations. Reproduce with one failing file; inspect supported installed Vitest
options before changing workers/cache settings. Prefer a narrow runner/temp-path
fix and verify on the supported OS/CI. Do not blindly downgrade dependencies or
exclude the failing suites. If the environment remains responsible, document the
repro and add/identify a clean CI run; do not claim the blocker fixed.

Create a hermetic test setup: clear all configured provider and tracing keys,
mock network/provider constructors where applicable, use mock/disposable storage,
and fail on an unexpected real request. Tests must never read production .env
secrets. Preserve tests that explicitly install their own fake configuration.
Run the ten-file focused selection from the validation document, then typecheck.
Record which assertions actually execute and the clean baseline before other work.
```

**Done:** V00. Dependency changes, if necessary, require a reasoned lockfile diff. Runner mechanics may change; product assertions may not.

## M01 — Close rehearsal routing loopholes

**Files:** `src/lib/engine/resolver.ts`, `src/lib/engine/verified-bank.ts`, `tests/resolver-initialization.test.ts`, `tests/v2-assessment.test.ts`; route metadata types only as needed.

```text
Preserve the four curated fast routes and default generation for unfamiliar jobs.
Make rehearsal intent explicit for fixture selection. For free-text matching,
require company evidence plus independent engineering/domain responsibility
evidence; company text must not count as its own domain signal. Check compatible
seniority before the fast return. Use conservative fallback for ambiguous or
conflicting evidence. Do not introduce a learned router or expand company coverage.

Separate curated-demo provenance from authenticated mentor approval. Do not erase
the existing demo fixtures; label them correctly and keep them usable in rehearsal.
Do not mutate shared fixture content/approval when counting uses or returning it.
Keep semantic reuse off by default and unavailable as a client-controlled option.
```

**Done:** R01–R06. Add spies proving zero embedding/generation calls for accepted fixtures, not merely the correct returned title. Add accountant/TGD, junior/payroll, company-only, conflicting domain, and wrong-company cases. Seniority conflict handling should not pretend the current two-level rubric covers every senior role.

## M02 — Remove avoidable embeddings from default generation

**Files:** `src/lib/engine/resolver.ts`, resolver tests; callers only if necessary.

```text
Move the default generate-new path before initializeRepository and query embedding.
runAgenticGenerationPipeline already accepts omitted embedding arguments. Do not
generate an embedding to register a pending private draft that cannot be reused
in this path. Keep initialization, space checks, and query embeddings confined to
the explicitly supervised semantic path. Reuse the existing initialization promise.

Do not parallelize Agent 1/2/3: they consume preceding stage output. Do not add
unawaited background embedding work to a serverless request. Do not change output
quality, caps, or route policy to obtain a faster test result.
```

**Done:** R07–R08. With an unfamiliar JD and embedding function mocked to throw, the normal path still generates a pending challenge; embedding/initialization call count is zero. Supervised-path compatibility and concurrent initialization regressions still pass. Separate resolver savings from the normal service's earlier parser call.

## M03 — Make generation contracts explicit and bounded

**Files:** `src/lib/engine/pipeline.ts`, `src/lib/types/assessment-v2.ts`, `src/lib/files.ts`, `src/lib/engine/starter-template.ts`, `tests/pipeline-provenance.test.ts`, grounding tests.

Implement in three reviewable increments; preserve the first before starting the next:

```text
(a) Source handling. Keep canonical source/assumption sections and thin-input
questions, preserve employer identity, and keep Agent 3 task-model-only. Retain
source span references and indicate omitted text. Replace silent first-5000-char
coverage with a bounded, explicit policy: preserve relevant opening/final facts
and reject/clarify inputs whose omitted content prevents reliable task design.
Do not promise full source coverage after truncation. Source facts remain
untrusted data, never instructions; avoid rendering hostile source as active markup.

(b) Validation. Validate normalized starter paths with the shared file rules;
reject traversal, absolute/drive paths, duplicate normalized names, disallowed
reserved keys, and excessive counts/bytes before building a file map. Enforce
unique nonempty rubric IDs, exactly one category each, weight total 100, and
consistent task/rubric level. Apply existing fairness validation to the V2 output
as well as imports/fallbacks, with errors becoming pending correction rather than
silently accepting an invalid task. Preserve current good weight/category tests.

(c) Provenance. Carry per-stage origin, fallback reason code, prompt/config version,
actual model/usage where present, and missing-usage status into challenge metadata.
Keep 2000/8000/6000 low-effort caps. Record each provider attempt separately from
the final logical stage; do not call fallback 'free live AI'. Reconcile SFIA 8/9
labels and remove invented accreditation claims after checking intended mapping.
```

**Done:** G01–G07. Persisting the metadata is M08; define its serializable shape here. Do not add an external semantic critic. A safe structured clarification/error is preferable to falsely claiming a generic fallback is tailored.

## M04 — Repair the task domains that humans rejected

**Files:** new small domain draft/fixture module under `src/lib/engine/` (proposed), `pipeline.ts` integration if needed, focused tests. Read human generation/retrieval summaries and the exact canonical source cases first.

```text
Create two complete versioned assessment drafts, not company-name aliases:
1. Collaborative editing: bounded two-client document editing, WebSocket message
contract, CRDT/OT convergence, causal ordering, duplicate/reordered events,
concurrent edits and reconnect. State latency as a supplied requirement only if
the source actually contains it; measure only in a defined synthetic environment.
2. Offline mobile sync: local SQLite persistence, durable mutation queue,
bidirectional delta sync, deterministic conflict handling without trusted client
wall clocks, interrupted network recovery, and binary-photo cache consistency.

Each needs a coherent brief, source/assumption map, starter interfaces, observable
acceptance cases, seven-category rubric, practical scope/timebox, and PENDING
status. Use adapters/simulated transports where a full platform would exceed the
timebox; label assumptions. No complete industrial CRDT or mobile product required.
Quarantine generic queue/payroll templates for these cases. The Macquarie
vulnerability-management input must generate/clarify, not become a CDR/payroll task.
Do not auto-approve authored drafts, add broad employer fast paths, or claim a
schema/unit test substitutes for mentor review of relevance.
```

**Done:** G08–G10. Mentor content review remains an explicit unmet gate until performed by a person. If these domains will not be demonstrated, safe clarification/quarantine is enough for the rehearsal; do not rush unreviewed breadth.

## M05 — Make candidate attribution consistent

**Files:** `src/lib/ai/scoring.ts`, schemas only if needed, `tests/scoring.test.ts`, `tests/grounding-gates.test.ts`, fixture expectations affected by the real rule.

```text
The existing seven categories grade human-AI decisions. A verified file quote
alone must not authorize a numeric behavioural score. Starter files and assistant
writes cannot establish candidate authorship or verification. Require at least
one verified USER-turn citation for that score, retaining file/assistant evidence
as labelled context. Preserve normalized matching and fabricated-citation caps.
Do not remove artifact evidence or ban AI assistance; separate artifact existence
from evidence of a candidate decision.

Null/absent/fabricated/assistant-only/file-only evidence yields null and confidence
0 with a review reason. Observed weak candidate behaviour may score low. Preserve
valid candidate-backed scores. Do not change fixture labels simply to preserve
an old aggregate score; explain any expected result changed by the new contract.
```

**Done:** E01–E05. Test a CRITICAL_JUDGMENT score of 5 supported only by a valid `files["src/main.ts"]` quote: it must be withheld even though file verification succeeds. A candidate quote saying “I ran tests” is a recorded claim, not a certified run.

## M06 — Prevent unsupported narratives and inconsistent academic output

**Files:** `src/lib/ai/scoring.ts`, `src/lib/engine/evaluator.ts`, `src/lib/types/assessment-academic.ts`, relevant report components/tests.

```text
Keep the human-preferred evaluator prompt. Close the post-processing boundary:
use finalized result-derived summaries by default; unsupported raw strengths,
gaps, and invalidated-score rationale must not survive as public factual claims.
If raw model prose is retained for mentors, label it unverified and private.
Do not force exactly three invented strengths where evidence does not support them.

For academic model output, require the five distinct expected dimensions exactly
once. Invalid/missing/assistant-only traces cannot support a score. Do not replace
an invalid citation with another quote that appears verified. Recompute summary
state from accepted dimensions; all-null must be insufficient/unassessed, not the
model's STRONG or exemplary band. Do not classify absence alone as automation bias.
Show scored coverage, and label heuristic/model confidence honestly.
```

**Done:** E06–E09. Add the adversarial-but-valid quote case: exact text matching alone cannot justify unrelated praise. Default prose should not make that leap. This packet does not introduce an LLM semantic judge or claim to solve entailment deterministically.

## B01 — Replace demo identity before public candidate access

**Files:** `src/lib/auth.ts`, `src/app/actions/auth.ts`, data user mapping, API routes/actions; see October 4 packet 01 for broader inventory. Read installed Next.js authentication/data-security guides.

```text
Use verified server-side identity through the chosen Supabase auth setup and
controlled application roles. Never trust a plain user-ID cookie, a submitted
role, or self-editable auth profile metadata as mentor authority. Keep demo login
and role switching only in an explicitly isolated demo configuration; production
must fail closed. Do not auto-create mentors on review submissions.

Audit all action/route boundaries, including generate, bounty GET/review, and
challenge audit. Require identity/role/ownership as applicable and enforce request
byte/field limits before paid dispatch. Anonymous generation must not spend money.
Use bounded per-user operation quotas (durable enforcement coordinated with B04),
safe error DTOs, and a candidate-safe generation response that excludes hidden
traps/internal evidence/model metadata not intended for that viewer.
```

**Done:** P01–P03. Test forged cookies, candidate-to-mentor escalation, cross-owner requests, missing/expired session, and oversized input. Demo UI visibility is not authorization. Disable bounty endpoints until the full policy is enforced.

## B02 — Private reports and explicit sharing

**Files:** report/credential pages, `src/lib/data/prisma.ts`, data interfaces, report DTO/component boundary, proposed share-capability persistence. Read October 4 packet 02; recheck findings.

```text
Owner and authorized mentor get their appropriate private report DTO. A report ID
alone grants no access. Implement explicit owner-created opaque share capabilities
with stored hash, expiration/revocation, scope, and version reference; public
visitors receive a minimal employer DTO. Never send the full evaluation to a
client component and rely on hidden UI to protect it.

Exclude raw transcripts, full files, reasoning, contest/private review notes,
hidden traps and private source JDs from public sharing by default. Choose public
evidence excerpts explicitly. Apply the same policy to credentials, nested pages,
downloads/exports and API endpoints. Return no private fallback fixture on lookup
or database failure. Consent/revocation must work across fresh requests/instances.
```

**Done:** P04–P06. Assert serialized response fields, not just screenshots. An owner-view private identifier cannot be reused as a public sharing token. Coordinate the schema with B03; do not run production migrations.

## B03 — Durable, version-specific task approval

**Files:** Prisma schema/migration, new bank/audit repository, `src/lib/engine/verification.ts`, resolver, mentor challenge-audit route; optional bounty module only in a separate follow-up.

```text
Define immutable bank/content versions with stable requirement identities and
durable mentor audit records: actor, timestamp, scores, decision, notes, content
digest/version. Distinguish imported/curated demo from mentor-approved production
content. Persist approval in a transaction after checking mentor authority.

Audit unknown IDs returns 404 without recording approval. Failed re-audit or new
content revision removes current approved status/badge; historical audit remains.
Edited tasks/rubrics become a new pending version. Resolver eligibility reads the
same durable version as the UI. Do not use mutable process state or JSON files as
the source of production trust. Never infer approval from database existence.

Pin old sessions to the version they started; do not delete/recreate requirements
that their evaluation JSON references. Prepare migration/backfill with unproven
legacy approvals marked unverified; no invented mentor records.
```

**Done:** P07–P09. Two instances and a restart observe the same state; rejected content has no live approved badge. Bounties can remain disabled; enabling requires a separate idempotent reward ledger and authorization tests, not repeated credit awards for repeated reviews.

## M07 — Persist the assessment that the mentor and employer see

**Files:** `src/lib/services/evaluations.ts`, `src/lib/ai/escalation.ts`, `src/lib/data/prisma.ts`, cognitive adapter, assessment/data types, report/credential/mentor pages, schema coordinated with B03.

```text
At evaluation creation, build one versioned immutable assessment envelope from
the frozen session evidence. Store primary finalized results and any separate
academic transcript signals with explicit deterministic/model origin, actual
challenge level, coverage, and reasons. Do not silently run a second paid evaluator.
Stop recomputing academic scores/timestamps on every report read.

Union explicit primary and displayed academic escalation reasons into the saved
review decision. A displayed required review must exist in the queue. Preserve
null and distinguish not-assessed from numeric zero. Historical records without
the new envelope must be labelled legacy/unassessed rather than silently graded.
Mentor review resolves a particular assessment version while retaining original
scores and reasons; owner, mentor, public report and credential read consistent
effective result/provenance. Do not mark absent privacy/fairness checks as passed.
```

**Done:** E10–E13. Use a normal-duration session with all primary requirements scored but one academic dimension null, so the test cannot pass accidentally because of the existing too-short-session rule. Reloading the report neither changes scores nor reopens a resolved review.

## M08 — Atomic generation save and honest recovery

**Files:** both branches of `src/lib/services/challenge-pipeline.ts`, generation route/service entry points, data fallback layer, schema/operation repository as agreed with B03/B04.

```text
Unify challenge persistence behind one validated transaction saving submission,
challenge version, complete rubric, starter template and provenance. Use the
authenticated existing user; do not create a synthetic production identity.
Emit save/done only after commit. Failure rolls back and yields a safe recoverable
error, not a gen-* memory ID reported as success. Keep mock storage explicitly
isolated to demo/test; database failure must not silently activate it.

Bind generation idempotency to owner/input digest/config/version and preserve the
validated generated draft for retry under an authorized operation record. Do not
regenerate/pay again merely because a final DB write or client connection failed.
Keep stable requirement IDs or store an explicit mapping used consistently by
saved evaluations. Generated fallbacks stay pending and visibly labelled.
```

**Done:** D01–D04. Inject failures at each write using a disposable DB; verify no orphan submission/partial rubric and no success event. Cold process read sees the complete same version. Coordinate operation lifecycle with B04 rather than designing two job tables.

## M09 — Provider identity and bounded fallback

**Files:** `src/lib/env.ts`, `src/lib/ai/client.ts`, `src/lib/engine/evaluator.ts`, pipeline metrics, provider tests.

```text
Resolve provider, key, base URL and model as one validated configuration. Remove
cross-vendor key fallback. A missing DeepSeek key cannot send an OpenAI key to the
DeepSeek endpoint, and vice versa. Use active-provider availability consistently,
including the academic evaluator. Keep embeddings on an explicit independently
configured embedding provider/space. Do not change the user's production provider
or model merely because the experiment used a different one.

Default to clear unavailable/draft fallback behavior, not automatic cross-provider
failover. If failover is later enabled, require an explicit ordered provider policy
and recompute the entire configuration; no key swapping. Preserve attempt IDs,
safe failure codes, missing usage, fallback origin and bounded timeout/token/retry
budgets. DeepSeek thinking currently raises output allowance to at least 64000:
remove hidden budget expansion or reject unsupported settings explicitly. Account
for SDK retries and validation retries together. Never blindly retry an ambiguous
dispatched job as a new paid request; B04 owns durable recovery semantics.
```

**Done:** A01–A05. Mock transports for OpenAI-only, DeepSeek-only, custom endpoint, wrong/missing key, timeout, 429/5xx, invalid schema and truncation. No secrets appear in errors or telemetry. Stage metrics distinguish failed attempts from successful low-effort results.

## B04 — Freeze evidence and deduplicate paid work

**Files:** `src/lib/services/sessions.ts`, evaluation/generation services, proposed operation repository, Prisma constraints/state; review October 4 packets 04/11.

```text
Use conditional state transitions/short DB transactions to freeze transcript
cutoff and file snapshot together. Reserve chat sequencing and prevent a late
assistant stream from appending evidence after submission. Snapshot and evaluator
must refer to the identical frozen version. Decide and test whether submit waits
for an active chat operation or returns a conflict; do not accept inconsistent data.

Claim an owner-scoped evaluation/generation operation before provider dispatch,
with durable status/lease, request digest, attempt and result reference. Concurrent
submits/retries join the existing operation rather than duplicate inference.
Use idempotent final writes, bounded per-user budgets, and explicit interrupted/
unknown-provider-outcome recovery. Do not hold a database transaction open across
LLM latency. A unique Evaluation row is insufficient to prevent duplicate calls.
```

**Done:** D05–D08. Controlled barriers prove two simultaneous submits cause one dispatch; race chat versus submit; simulate crash before/after dispatch and before/after result commit. Do not promise exactly-once external billing when the provider cannot guarantee it.

## B05 — Minimize telemetry and protect real data

**Files:** `src/lib/ai/langfuse.ts`, client observation, trace call sites, export tooling, privacy configuration/tests. Recheck October 4 packet 09 before a pilot.

```text
Default to metadata-only telemetry: opaque operation ID, stage, duration, safe
error code, model/version, token usage and billing-unknown state. Disable automatic
raw prompt/completion observation unless an explicitly governed debug/research
mode has consent, redaction, bounded retention and access controls. Redact before
leaving the app, including exception paths and nested SDK observation.

Test with synthetic emails, identifiers and fake secret markers. Exported study
packs must not include production transcripts or credentials. Inventory existing
raw trace artifacts privately; do not reprint them or rewrite/delete historical
research without a deliberate retention decision. Document deletion/retention
responsibilities and processor boundaries before inviting real candidates.
```

**Done:** P10–P11. Capture mocked outbound telemetry and verify raw source, candidate messages, files and secret markers are absent. Telemetry failure does not fail an assessment. No new Jev data-sharing is required.

## M10 — Release verification and measured rehearsal

**Files:** validation/release notes, focused tests or synthetic browser harness where needed; no speculative architecture changes.

```text
Run the acceptance matrix for the intended gate. Record exact commit plus local
diff state, Node/package versions, environment mode (no secrets), commands and
pass/fail/blocked results. Run focused tests, typecheck, full tests, lint and build
after integration. Separate pre-existing failures from regressions; never hide them.

Use synthetic candidate/mentor accounts in a disposable environment to rehearse
four fixtures, unfamiliar and thin JD, wrong-domain rejection, incomplete evidence,
mentor override, report sharing/revocation, refresh, provider failure, DB failure,
and duplicate submission. Inspect network response DTOs as well as visuals.
Measure resolver, parse, each generation stage, DB save, queue/startup and browser
render separately, with cold/warm status and sample size. Report unknown provider
usage honestly. Do not run paid benchmarks without an explicit separate run budget.
```

**Done:** L01–L04 and every relevant row below. Leave unchecked gates visibly open. Do not deploy or publish as part of this packet without a separate instruction.

## R01 — Later: supervised retrieval and independent evaluation

**Not required for the final-round conservative path.** Split into R01a offline integration, R01b shadow service, and R01c independent evaluation. No new provider dispatch in R01a.

```text
R01a: Import/version a local contextual per-requirement index from governed bank
content, using the research representation and max chunk-to-bank aggregation.
Record model, dimensions, normalization, template version, content hash and bank
version. Refuse mixed spaces/stale versions/nonfinite vectors. Exact scan remains
sufficient. Compare against contextual BM25 as an offline baseline. Keep this out
of user generation requests. Do not call the hashed fallback the studied embedding.

R01b: If separately requested, create a supervised/shadow router with route enum
reuse/adapt/generate/clarify, source/bank version, exact quoted spans, required-domain
coverage, seniority compatibility, contradictions and missing information. Validate
quote references deterministically, but never equate quote validity with correctness.
Return recommendations to a mentor; do not alter served challenge/score/approval.
Adaptation always creates a pending new version. Deterministic approval/privacy/
level filters precede model advice. Timeout or malformed output means no reuse.

R01c: Append independent JD roots and candidate sessions with versioned human
labels; separate development, calibration and held-out test by root, not paraphrase.
Include unsafe same-company matches, seniority conflicts, thin inputs, minority
domains, negative controls, absent evidence and real disagreements. Have a second
reviewer independently label at least disputed/high-risk cases and record adjudication.
Freeze prompts/config/thresholds before holdout; report numerator/denominator,
route confusion matrix, unsafe reuse, false withholding, score agreement, coverage,
latency and cost separately. Preserve original labels and invalid-fixture exclusions.
The runner must invoke the candidate implementation and compare outputs to held-out
labels, not echo expected labels as predictions. No autonomous release follows
automatically from these development results.
```

**Done:** X01–X04. Optional Jev work needs a distinct run/data-sharing decision and must not replay the transport-ambiguous canary. This plan chooses to defer Jev routing, so there is no unfinished Jev dependency on the product release.

## Executor completion record

Append a small result note for each packet, rather than rewriting the research:

```text
Packet:
Baseline commit and relevant pre-existing edits:
Changed files:
Contract implemented:
Acceptance row IDs with test names/results:
Commands and exit status:
Still blocked/not tested:
Migration/backfill/rollback (if applicable):
Remaining dependencies:
```

Do not equate “code written” with “acceptance proven.” Schema/state-machine packets B03, M07, M08 and B04 need integration review; tests composed entirely of mocks cannot establish transaction isolation or cross-instance durability.
