# Implementation plan after research review — 8 October 2026

**Start here:** use this document for decisions, [ASTRA_EXECUTOR_PACKETS.md](ASTRA_EXECUTOR_PACKETS.md) for individual implementation assignments, and [ASTRA_VALIDATION_MATRIX.md](ASTRA_VALIDATION_MATRIX.md) for acceptance checks. The existing research files remain unchanged.

**Publication note:** these three plans are published on a documentation branch based on remote `main` at `249871b`. The review below used the earlier `b0af8b0` working tree and its local changes. Remote commits added since that review include product-readiness fixes; recheck every packet against the implementation before editing, and mark already-resolved items complete with evidence. The original research bundle and October 4 audit referenced here remain local and are not included in this three-file publication. The decisions, work packets and acceptance matrix are included; request the source bundle if raw study evidence is needed.

## Recommendation

Ship a narrow, inspectable assessment workflow: curated rehearsal exercises, tailored pending drafts for other jobs, candidate-attributed evidence, and durable mentor review. Improve correctness and eliminate unnecessary work before changing hosting or adding another model.

The research does **not** justify autonomous bank reuse, calibrated confidence percentages, a general model winner, or treating a quotation as proof that a candidate executed code. It does justify retaining source boundaries, low-effort generation, deterministic evidence gates, and explicit uncertainty.

This is an implementation plan, not a deployment approval or a claim that the product is ready. No application code, research labels, provider runs, database records, or Git history were changed during this review. Current local implementation work must be preserved.

## Review baseline and evidence precedence

- Reviewed the handoff's briefs, findings, work order, manifest, closeout, selected configuration, completion audit, human reviews, routing results, live screens, and synthetic review benchmark; cross-checked selected structured artifacts and current application code.
- Git HEAD at review: `b0af8b0`, branch `main`. There are substantial tracked modifications and untracked research/tests. **The working tree, not HEAD alone, is the implementation baseline.** Record a fresh status/diff before starting any packet; do not reset or pull across these edits.
- `npm run typecheck` passed on 8 October. A ten-file focused Vitest run passed 49 tests in five files, while five other files failed during module loading with Windows temporary SSR-file `ENOENT`. They did not execute assertions. See the validation document for exact scope.
- No paid model calls, production database checks, migrations, deployment, browser rehearsal, or full-suite certification were performed for this planning request.
- The installed Next.js data-security guide was consulted. Executors must read `AGENTS.md` and relevant installed guides before code changes.

When records disagree, use the latest human-labelled results and closeout for research decisions; use current source and fresh tests for implementation status. Earlier screening reports are historical observations. The October 4 audit is a backlog source, not proof that all its findings remain unchanged.

### Resolve these handoff ambiguities explicitly

1. Human generation and assessment prompt reviews are **complete for the selected samples**. Do not restart them because an older next-executor paragraph says they are pending.
2. “Ship local contextual chunk retrieval” is a research direction, not the current application's implementation. The application embeds a whole brief and has a 128-dimensional hashed fallback. The measured contextual requirement index lives in the experiment workspace. Put its integration in supervised/shadow work, outside the user generation critical path.
3. The latest default is generation for non-demo jobs, not “semantic retrieval or generation” as some earlier demo notes say. Preserve `allowSemanticReuse: false` by default.
4. The 16-word post-fix canary used deterministic fallbacks after provider failure. It establishes a fallback contract, not successful live-model quality or latency.
5. “Approved” static fixtures are curated demo data. They are not evidence of a real authenticated mentor approving the exact current content version.
6. Research names such as Flash, Luna, and Jev describe particular recorded configurations. Do not silently replace product provider settings with those names. A study winner on synthetic code is not a selected production candidate assessor.
7. Jev routing is optional. An unsuccessful Jev canary must not block shipping the conservative product, and an ambiguous billed request must not be automatically replayed.

## What to preserve and what to finish

Line anchors below refer to the reviewed working tree and will move. Locate the named function as well as the line before editing.

| Area | Current evidence | Status and implementation decision |
|---|---|---|
| Four local routes | `src/lib/engine/resolver.ts:52`, `findDemoFastPath` | Present; preserve their zero-provider resolver path, but repair eligibility gaps (M01). |
| Non-demo default | `resolver.ts:240` | Correctly generates a pending draft unless semantic reuse is explicitly enabled. Preserve. |
| Embedding compatibility | `src/lib/engine/embedding.ts`, repository initialization promise | Dimension/space checks and shared initialization already added. Preserve; do not redo the old fix. |
| Generation latency | `resolver.ts:231` initializes all bank embeddings before checking the no-reuse branch | Confirmed unnecessary work. Generate directly before initialization/query embedding when reuse is disabled (M02). |
| Source contract | `src/lib/engine/pipeline.ts:156,212,276,399` | Low effort and 2k/8k/6k caps, canonical sections, task-only Agent 3, and company preservation exist. Keep them (M03). |
| Source coverage | `pipeline.ts:182,236,387` | Agent 1/2 see only the first 5,000 characters; displayed canonical facts contain the first 500. Embedding tail preservation does not fix this. Expose truncation and preserve source references; do not imply whole-JD coverage (M03). |
| Input/output validation | `pipeline.ts:32,91,247`; `src/lib/engine/starter-template.ts:55` | Category/weight checks exist. Starter filenames are accepted into an object without path validation at that boundary; rubric ID uniqueness is not enforced. Add shared validation, not another prompt instruction (M03). |
| Wrong-domain exercises | Human retrieval/prompt labels; fallback branches at `pipeline.ts:442` | No dedicated collaboration/offline-sync task model in these production files. Generic fallbacks can still miss the core domain. Add reviewed drafts or clearly request clarification (M04). |
| Candidate attribution | `src/lib/ai/scoring.ts:124–127,184–205` | Assistant-turn-only scores are withheld, but **any verified file is considered candidate-attributable**. Starter/assistant code can therefore pass the gate for a behavioural claim (M05). |
| Narrative grounding | `scoring.ts:185,240–241` | Raw rationale/strength/gap prose survives score filtering. A withheld score can still accompany unsupported praise or accusations (M06). |
| Academic evaluator | `src/lib/engine/evaluator.ts:123–176` | Quotes and speaker checked; null forces its escalation flag. However five duplicate dimension names satisfy array length, and model overall band survives invalidated scores. Close both contract gaps (M06). |
| Persisted mentor queue | `src/lib/services/evaluations.ts:36`, `src/lib/data/prisma.ts:106`, `src/lib/services/cognitive-rubric.ts:71` | Saved primary evaluation controls the queue. Academic signals are recomputed on read by a deterministic heuristic, at hardcoded SFIA level 3; that flag is not merged into persistence (M07). |
| Report honesty | `cognitive-rubric.ts:176`; current employer/academic components and receipt tests | Manufactured verification receipt was removed; absent evidence displays were improved. Preserve. Remaining heuristic confidence and summary state need provenance and consistency (M07). |
| Persistence | `src/lib/services/challenge-pipeline.ts`, both save branches | Sequential writes, then caught errors return in-memory success. This is not durable success across refreshes/instances (M08). |
| Provider selection | `src/lib/env.ts:86–90`, `src/lib/engine/evaluator.ts:91` | Key selection crosses provider boundaries; academic evaluator availability tests OpenAI only. No complete provider failover policy (M09). |
| Trust/identity | `src/lib/auth.ts:20–23`; bounty routes; public report page | Mock cookie identity and anonymous accesses remain. Research changes do not solve them (B01/B02). |
| Approval durability | `src/app/api/mentor/challenge-audit/route.ts:53–64`; `src/lib/engine/verification.ts:113` | Audit updates an in-memory repository; missing challenge can still receive successful response; failed audit keeps old badge. Fix before “mentor verified” is a real product claim (B03). |
| Telemetry privacy | `src/lib/ai/langfuse.ts:53,102` | SDK observation and explicit raw message capture remain. Restrict traces before real candidate traffic (B05). |

### Two routing counterexamples to lock down

These are source-derived counterexamples, not paid/live reproductions:

- `Company: Total Game Development\nRole: Accountant` supplies its own `game` role signal through the company name. The current alias and signal checks both match, despite no engineering/RTS responsibility.
- `Company: Employment Hero\nRole: Junior payroll engineer` can reach the Level 3 fixture. `isEligibleForAutomaticReuse` runs only after the fast-path return.

For the final, prefer an explicitly selected rehearsal fixture over a broad employer detector. Retain free-text fast paths only for unambiguous company **and independent responsibility** evidence at a compatible level. Uncertain, negated, or conflicting role evidence goes to draft/clarification. Do not attempt to solve arbitrary language semantics with a longer keyword list.

## Product contracts to implement

These are proposed contracts, not claims that the fields already exist. Keep them small and versioned. Migrations are developed against a disposable database; applying them to production is a separate operation.

### Routing and task provenance

- Preserve `resolutionReason` (`DEMO_FAST_PATH`, `GENERATED`, supervised `SEMANTIC_MATCH`). Add a separate origin/approval provenance field so tier names cannot manufacture trust.
- Curated demo, generated draft, and mentor-approved version are different states. Only a durable audit by an authorized mentor for the exact content version supports a mentor-verified badge. Old fixtures remain usable in isolated rehearsal with a visible demo label.
- A generated or adapted task is `PENDING`. An approved parent's badge never transfers to modified content.
- Retain original source privately, source digest/version, selected source spans, omitted/truncated status, exercise assumptions, questions, prompt version, and per-stage outcome. Do not log raw source by default.
- Record `ai`, `deterministic_fallback`, or `curated_demo` per stage, configured/returned model where available, elapsed time, retry/attempt count, and reported token usage. Unreported usage is **unknown**, not zero cost. Aggregate stage status must survive save/read.
- Keep SFIA edition/version explicit and consistent. Current prompts mix SFIA 8 and SFIA 9 labels; select the intended reference after checking the existing rubric, then describe it as a custom rubric mapped to selected skills/levels. Do not imply accreditation or full framework compliance from a prompt.

### Evidence, scores, and reports

- The current seven-category rubric assesses human-AI behaviour. A file is context about the produced artifact, not proof of who reasoned, tested, or caught a defect. Require a valid candidate-turn citation for a behavioural numeric score. A future code-correctness score needs a separate artifact/execution evidence contract; do not invent candidate authorship to reuse the behavioural score.
- Quote presence is deterministic attribution, **not semantic entailment**. Preserve normalized quote matching, including its documented whitespace/ellipsis policy. Describe it accurately rather than promising strict byte-for-byte verification.
- Missing/fabricated/assistant-only behavioural evidence produces `null`, confidence 0, an explicit reason, and durable mentor review. Observed weak behaviour may legitimately score 0/1; absence alone may not.
- Do not let free-form prose overrule withheld scores. Default to safe descriptions derived from finalized results; retain raw model rationale privately for mentor inspection if useful. A valid quotation still does not establish “tests passed” without a recorded execution result.
- Store an immutable assessment snapshot: transcript cutoff/hash, file snapshot hash, rubric/version/requirement IDs, primary finalized result, optional labelled academic signals, generation/evaluation provenance, and review reasons. Read pages must not re-grade historical evidence with today's heuristics.
- Keep missing coverage visible. “Not assessed” is not “at risk”; an average over scored dimensions must show its denominator. Model confidence is not a calibrated probability. Rule-based heuristic constants must not appear as measured certainty.
- One saved review decision feeds candidate, mentor, report, and credential views. A displayed “mentor review needed” must correspond to a queue reason, unless clearly presented as a historical reason already resolved by a mentor. Reading a report must never re-open a resolved review by itself.

### Durable operations and privacy

- A successful save means the complete challenge and rubric are committed. No production success response backed only by a process-local map.
- An operation key bound to owner, input digest, configuration, and version deduplicates repeated generation/submission. Different users must not accidentally share private drafts through a common JD hash.
- Freeze session evidence before evaluation. Claim evaluation work atomically before dispatching a paid request. A unique result row alone cannot prevent duplicate provider spending.
- Validate identity, role, ownership, and response projection on the server. Public sharing uses explicit consent and a revocable opaque capability, not an evaluation ID as sufficient authorization.
- Default telemetry is metadata only. Raw research traces and production records are not interchangeable training/golden data. No new third-party source sharing is required by this plan.

## Execution order and boundaries

Implement one packet at a time. The order is intentional because several packets touch the same files.

| Order | Packet | Outcome | Dependencies |
|---|---|---|---|
| 1 | M00 | Reproducible offline test runner and recorded baseline | None |
| 2 | M01 | Safe, explicit rehearsal routing | M00 |
| 3 | M02 | No embedding-bank startup in default generation | M01 |
| 4 | M03 | Bounded source/validation/provenance contract | M00; preserve M01–02 |
| 5 | M04 | Correct collaboration/offline-sync draft fixtures | M03 |
| 6 | M05 | Candidate attribution in primary scoring | M00 |
| 7 | M06 | Grounded report prose and academic output contract | M05 |
| 8 | B01, then B02 | Real identity and private report boundary | M00; required before public testing |
| 9 | B03 | Versioned, durable task approval | B01, M03; schema foundation |
| 10 | M07 | Persisted assessment/review consistency | M05–06, B03 schema coordination |
| 11 | M08 | Atomic challenge persistence | B01, B03, M03 |
| 12 | M09 | Coherent provider selection and bounded recovery | M03; coordinate M08 operation metadata |
| 13 | B04 | Frozen evidence and single-flight paid evaluation | B01, M07–09 |
| 14 | B05 | Metadata-only telemetry and real-data safeguards | B01–02; complete before candidate pilot |
| 15 | M10 | End-to-end release checks and rehearsal | Relevant gate below |
| Later | R01 | Offline retrieval integration / optional shadow router | Separate research milestone; not a release dependency |

If preparation time is short: finish M00–06, exercise the current flows with synthetic data, and describe the demo honestly. This does **not** authorize exposing the current mock-auth app to real candidate data. For a real-user pilot, B01–05 and M07–10 are also release gates. Hide/disable optional bounty functionality until its authorization, durable review, and idempotent reward work is complete.

### Rehearsal gate

All four curated cases resolve correctly; unrelated roles do not. Known fixtures make zero embedding/generation calls **inside the resolver**. The normal full pipeline currently calls `parseJobDescription` first, so prove endpoint-level behavior separately; never claim the entire request is model-free from a resolver unit test. Unfamiliar or thin jobs produce visibly pending drafts/clarifications. Missing evidence is unscored with an inspectable mentor reason. No fabricated execution receipt or borrowed employer architecture. Browser flow and retry/failure state work using synthetic accounts and data.

### Real-user pilot gate

Authenticated ownership, revocable sharing, durable version-specific approval, atomic saves and frozen evidence, persisted review state, bounded provider dispatch, and restricted telemetry all pass. Revisit remaining October 4 audit packets for SSRF/redirect/input limits, workspace lifecycle, SQL execution, data filtering, and dependency health; they were not exhaustively re-audited here. Passing this research implementation checklist alone does not close that broader backlog.

## What to defer

- Do not move to a vector database or ANN service at the measured ~100-bank scale.
- Do not change Vercel to Fly.io as a presumed fix. The source already shows avoidable embeddings and sequential inference; measure deployed queue, startup, DB, provider, persistence, and browser timings separately. Consider a worker/host change only if measured runtime/lifecycle constraints remain after correctness fixes. No hosting benchmark was run here.
- Do not add Jev or a second evaluator to every user request. Deterministic gates and mentor review remain the policy; shadow results cannot change scores or routing.
- Do not lower cosine thresholds, deploy the rejected evidence-discipline prompt, add raw JD back into Agent 3, or run a broad new model tournament.
- Do not call the 50 planned golden examples complete until independently labelled fixtures, immutable inputs, split definitions, and an actual model/evaluator runner exist. Research counts below concern different tasks and cannot be pooled into one accuracy score.

## Claims the team can defend

| Evidence | Safe statement | Unsafe extrapolation |
|---|---|---|
| Ten human top-1 retrieval labels | Six reused unchanged, two needed adaptation, two needed generation in this selected sample. | “Retrieval is 80% accurate” by counting adaptation as unchanged reuse. |
| Luna routing, 10 selected jobs | 7/10 exact route agreement; five reuse decisions, none unsafe in this sample. | Zero production risk or autonomous routing validated. |
| Human prompt comparisons | Generation baseline preferred 8/10, two rewrites; assessment baseline 4/6, candidate 1/6, one tie. | Pure prompt causal effect; generation comparison also changed context. |
| One matched detailed-JD pipeline | 101.518s to 45.936s in one recorded high/low-effort comparison. | Site-wide p95, SLA, or hosting speedup. |
| Verified synthetic review fixtures | Both reviewers found 9/9 defects; Flash 0/9 false positives, Luna 2/9. | Same-model review is unbiased or hiring assessment validity proven. |
| Cost reconciliation | Recorded/reserved exposure about $0.159934581, subject to the ledger's caveats. | Invoice-confirmed expenditure or a guaranteed per-user price. |

Local source bundle: `docs/agent-handoff-2026-10-08/evidence/MANIFEST.md`. Relative `artifacts/...` links inside copied historical reports may refer to the canonical workspace at `docs/experiments-2026-10-06/study-v2/`, not a subfolder alongside that report. Preserve those archives and labels; append new results under a new run ID.
