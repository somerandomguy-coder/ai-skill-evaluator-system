# Validation matrix and observed baseline

This is a set of **future acceptance tests**, not a list of completed fixes. Use with [the implementation plan](ASTRA_IMPLEMENTATION_PLAN.md) and [executor packets](ASTRA_EXECUTOR_PACKETS.md).

## Checks actually performed for this planning review

| Check | 8 October 2026 result | Meaning |
|---|---|---|
| Read handoff reports and selected structured artifacts | Completed | Decisions checked against human labels and recorded measurements. |
| Inspect current source and working-tree diff | Completed for the named paths | Targeted research-to-implementation review, not a fresh exhaustive security audit. |
| `npm run typecheck` | Exit 0 | Type-check passes in this working tree. |
| Focused ten-file Vitest run | Exit 1; five files passed, five failed during import; 49 tests passed | Partial assertion coverage; overall command failed. |
| Live inference, production DB, migration, deployed browser flow | Not run | No claim about live quality, schema compatibility, production authorization or performance. |
| Full tests, lint, build in this review | Not run | Historical results in other reports do not certify this working tree. |

The focused run loaded and passed `resolver-initialization`, `pipeline-provenance`, `escalation`, `employer-receipt`, and `scoring`. It could not load `v2-assessment`, `evaluator-evidence-gate`, `grounding-gates`, `academic-evaluator`, or `receipt-provenance` because temporary `.../ssr/<hash>` files were missing (`ENOENT`). This matches the class of Windows runner issue documented in the handoff; its cause is not established here. Do not turn these five load failures into skipped suites.

Reproduction command (PowerShell, repository root):

```powershell
$env:OPENAI_API_KEY=''
$env:DEEPSEEK_API_KEY=''
$env:AI_API_KEY=''
$env:LANGFUSE_SECRET_KEY=''
$env:LANGFUSE_PUBLIC_KEY=''
$env:DATA_SOURCE='mock'
$env:DEMO_MODE='false'
npx vitest run tests/resolver-initialization.test.ts tests/pipeline-provenance.test.ts tests/grounding-gates.test.ts tests/evaluator-evidence-gate.test.ts tests/academic-evaluator.test.ts tests/escalation.test.ts tests/v2-assessment.test.ts tests/receipt-provenance.test.ts tests/employer-receipt.test.ts tests/scoring.test.ts
```

These environment assignments apply to the test process/shell, not a saved `.env`. M00 must additionally establish a network-denying test setup so the absence of known keys is not the only safety boundary. Do not run live profiling or benchmark scripts as part of `npm test`.

## Acceptance rows

Initially every row below is **unverified**. Some behavior already exists and should pass; some deliberately exposes remaining gaps. The executor records the test name and result beside its packet completion note. Deterministic unit checks should make zero real network calls. DB rows require a disposable database; browser rows require synthetic accounts/data.

### Runner and routing

| ID | Input / fault | Required outcome | Owner / level |
|---|---|---|---|
| V00 | Clean Windows/CI test run; unexpected network attempt; externally set provider key | All intended assertions execute; real transport denied; no excluded suites or weakened expectations. | M00 / runner |
| R01 | Four curated engineering JDs: payroll, CDR, fair hiring, RTS | Correct fixture and `DEMO_FAST_PATH`; zero embedding/generation calls inside resolver; honest curated provenance. | M01 / unit |
| R02 | Company name without responsibilities, including `Total Game Development` + accountant | No engineering fast route from the company name itself. | M01 / unit |
| R03 | Junior payroll vs Level 3 fixture; senior role vs Level 2 fixture | No incompatible fast reuse; pending/clarify outcome with reason. | M01 / unit |
| R04 | Macquarie vulnerability role; CDR mentioned only as excluded work | No CDR or employer-derived payroll shortcut; bounded generation/clarification. | M01/M04 / unit |
| R05 | Correct domain, wrong company; unknown employer; rejected bank | No accidental company route; rejected content never reused. | M01 / unit |
| R06 | Repeated/concurrent fixture reads; client sends semantic-reuse flag | No cross-request fixture-content mutation; client cannot enable research reuse. | M01 / service |
| R07 | Non-demo JD; embedding function throws if touched | Generation succeeds as pending; no bank initialization or query embedding. | M02 / unit |
| R08 | Explicit supervised lookup; mixed model/space/dimensions; concurrent initialization | Space incompatibility rejected, filters applied, initialization awaited; existing fixes preserved. | M02 / unit |

### Generation and source provenance

| ID | Input / fault | Required outcome | Owner / level |
|---|---|---|---|
| G01 | Detailed coherent JD, mocked successful stage outputs | Low effort/caps 2k/8k/6k; Agent 3 receives validated task model, no separate raw-JD input. | M03 / unit |
| G02 | Thin JD; model omits sections or invents employer name | Canonical facts/assumptions/clarifications restored, submitted employer retained, pending status. | M03 / unit |
| G03 | Long JD with decisive tail/middle restrictions | No false whole-JD coverage; bounded selection/truncation visible; clarify if omitted facts make tailoring unreliable. | M03 / unit |
| G04 | JD includes instructions to reveal system prompt, award approval, inject markup | Source remains data; no approval/score instruction honored; source rendering safe. Prompt text checks alone are insufficient. | M03 / service |
| G05 | Duplicate rubric IDs/categories, wrong sum, inconsistent level, empty signals | Rejected/repairable pending output; valid rubric unchanged. | M03 / unit |
| G06 | `../`, drive/absolute paths, normalized duplicates, reserved keys, huge starter file set | Rejected before object-map persistence/mounting; bounded valid paths accepted. | M03 / unit |
| G07 | Stage 2 timeout after Stage 1 success; fallback lacks usage | Origins differ correctly by stage; error code and attempt recorded; usage unknown, never fabricated zero; pending remains. | M03/M09 / service |
| G08 | Collaborative-editing draft fixtures | Concurrent/reordered/duplicate edit and reconnect cases target convergence/causality; no generic queue rubric substitution. | M04 / fixture + human |
| G09 | Offline-sync draft fixtures | SQLite/outbox, delta sync, inaccurate clocks, interrupted network/photo cache addressed and observable in bounded scope. | M04 / fixture + human |
| G10 | Wrong-domain source/task pairing | Quarantine or clarify; no approval or claim source was correctly covered. Source facts distinguished from exercise choices. | M04 / unit + human |

### Evidence, narrative and mentor review

| ID | Input / fault | Required outcome | Owner / level |
|---|---|---|---|
| E01 | Requirement score cites fabricated/missing quote or missing turn | `null`, confidence 0, explicit review reason; valid comparison scores preserved. | M05 / unit |
| E02 | Exact assistant quote, no candidate support | Withheld behavioural score; assistant evidence labelled context. | M05 / unit |
| E03 | Exact starter/assistant file quote, no candidate support | Withheld behavioural score even though file exists and quote verifies. | M05 / unit |
| E04 | Valid candidate quote describing observed weak action versus no relevant action | Weak action may receive low score; absence receives null. | M05 / unit |
| E05 | One valid candidate quote plus one fabricated citation | Fabricated evidence removed, confidence cap/review reason preserved; no false all-verified label. | M05 / unit |
| E06 | Invalidated score plus raw “caught all bugs” strength / “leaked PII” gap | Unsupported public claims removed or replaced with finalized-result description; raw prose private/unverified. | M06 / unit/render |
| E07 | Correct quote but unrelated interpretation, e.g. candidate says “build it” | Quote not labelled semantic proof; no unsupported certified success claim in default summary. | M06 / unit/render |
| E08 | Five repeated academic dimension names; STRONG overall with all-null accepted scores | Contract rejects duplicates; accepted summary is unassessed/insufficient, not STRONG. | M06 / unit |
| E09 | Empty transcript; model/rule confidence present; candidate reports a test run without receipt | Missing coverage visible, confidence origin honest, no execution certification or inferred automation-bias finding from absence. | M06 / render |
| E10 | Normal-duration session; primary all scored; academic dimension null | Saved review PENDING with the academic reason, same reason in mentor queue and report. | M07 / DB |
| E11 | Reload old report after changing heuristic implementation | Saved score/provenance/timestamp unchanged; legacy report not silently recomputed. | M07 / DB/render |
| E12 | Mentor override, reload candidate/mentor/public/credential views, then contest | Consistent effective score/version; original result retained; contest deliberately reopens review; reads alone do not. | M07 / DB/browser |
| E13 | Level 2 challenge; incomplete scored coverage; unperformed privacy check | Actual level preserved; denominator visible; unperformed check is unknown/unassessed, not passed. | M07 / unit/render |

### Persistence and concurrency

| ID | Input / fault | Required outcome | Owner / level |
|---|---|---|---|
| D01 | Fail submission/challenge/requirement/provenance write in turn | Transaction rolls back; no partial challenge/orphan; no success event or memory-only production ID. | M08 / DB |
| D02 | Committed draft fetched by fresh process | Same content, seven requirements, IDs, origin/approval and source metadata; no dependence on warm process cache. | M08 / DB |
| D03 | Retry same generation key; different owner uses same JD | Authorized retry returns existing draft/result; other owner cannot receive private draft. | M08 / DB |
| D04 | DB read/save unavailable in production mode | Safe retryable failure, no synthetic identity/workspace/report masquerading as real data. | M08 / service |
| D05 | Two simultaneous submits held behind barriers | One paid dispatch and one stable result; both callers join/obtain same operation. | B04 / DB + mocked AI |
| D06 | Streaming assistant finishes during/after submit | Defined wait/conflict rule; no late mutation of frozen transcript or snapshot; evaluated evidence matches frozen version. | B04 / DB |
| D07 | Crash before dispatch, after dispatch, after response, after commit | Each recoverable state distinguishable; no blind redispatch of unknown outcome; committed result retrievable. | B04 / DB |
| D08 | Expired lease, duplicate callback/retry, user exceeds quota | Conditional claims enforce single ownership; result writes idempotent; bounded dispatch budget upheld. | B04 / DB |

### Provider behavior

| ID | Input / fault | Required outcome | Owner / level |
|---|---|---|---|
| A01 | DeepSeek selected, only OpenAI key set; reverse case | Configuration error/labelled unavailable fallback; no key sent to wrong endpoint. | M09 / mocked transport |
| A02 | DeepSeek-only valid configuration, academic evaluator invoked | Active-provider configuration recognized; no OpenAI-key-only availability decision. | M09 / unit |
| A03 | Custom endpoint and independently configured embedding provider | Model/key/base URL kept coherent; embedding space accurately labelled; no silent vendor inference. | M09 / mocked transport |
| A04 | 429, timeout after dispatch, 5xx, invalid JSON, truncation, thinking enabled | Bounded attempts/token/timeout policy; no hidden 64k expansion; ambiguous spend retained; actionable safe error. | M09 / mocked transport |
| A05 | Failed attempt then fallback/success | Per-attempt outcomes and reported usage retained; logical-stage total not misrepresented as one unbilled successful call. | M09 / service |

### Identity, approval and privacy

| ID | Input / fault | Required outcome | Owner / level |
|---|---|---|---|
| P01 | Forged user-ID cookie, expired token, user-set mentor role | No impersonation; production role switch disabled; server-verified identity required. | B01 / service/browser |
| P02 | Anonymous/candidate bounty GET/review or mentor audit | 401/403 as policy requires, no hidden bank disclosure, mutation, credit, or synthetic mentor. | B01 / service |
| P03 | Anonymous/overquota/oversized generation request | Rejected before paid call; bounded input read; successful candidate DTO excludes hidden fields. | B01 / service |
| P04 | Another candidate or anonymous visitor opens private report/credential | Denied independent of knowing the ID; private API/export paths equally protected. | B02 / service/browser |
| P05 | Valid share token, revoked/expired token, cached repeat | Minimal authorized employer DTO only; revocation/expiry respected; no raw transcript/files/contest/internal traps. | B02 / DB/browser |
| P06 | Full report sent to a client component | Serialization assertion fails unless private viewer authorized; public DTO constructed server-side. | B02 / render |
| P07 | Audit unknown challenge; fake mentor; edited approved task | No orphan successful audit; no forged approval; edited version pending. | B03 / DB |
| P08 | Failed re-audit of formerly approved task; read on second instance | Current badge/eligibility revoked consistently; historical approval retained as history. | B03 / DB |
| P09 | New bank version after completed session | Old rubric/requirement IDs and report still resolve unchanged. | B03 / DB |
| P10 | Synthetic private identifiers and fake credential marker in source/chat/error | Absent from outbound metadata-only traces including nested SDK capture; no raw content by default. | B05 / mocked telemetry |
| P11 | Telemetry outage; study/export request | Assessment still works; export scope governed; no production records silently added to research corpus. | B05 / service |

### Integration and future research

| ID | Input / fault | Required outcome | Owner / level |
|---|---|---|---|
| L01 | Four fixtures + unfamiliar + thin + wrong-domain JD | Correct persisted flow/UI, honest pending/demo labels, no unexpected live calls in rehearsal mode. | M10 / browser |
| L02 | Missing evidence → mentor review → override → share → revoke | One consistent result/version and state across pages; private data stays private. | M10 / browser |
| L03 | Provider/DB failure, refresh, duplicate click/submit | Clear recoverable state; no fake success, duplicate dispatch or lost committed result. | M10 / browser |
| L04 | Cold/warm request timing and integrated quality checks | Timings separated by stage with sample counts; focused/full tests/typecheck/lint/build results recorded accurately. | M10 / release |
| X01 | Stale/different-space contextual chunks, nonfinite vectors, unapproved private bank | Invalid candidates rejected before ranking/advice; local index versioned; no user-path behavior change. | R01a / offline |
| X02 | Shadow route with absent quotes, wrong level, conflict or timeout | No automatic reuse; valid recommendation visible only to supervisor; served assessment unchanged. | R01b / mocked service |
| X03 | Overlapping/paraphrased JD roots in evaluation splits | Leakage detected; frozen held-out roots separate; human adjudication provenance retained. | R01c / data check |
| X04 | Runner deliberately returns a wrong route/score | Comparison records an error; runner does not echo golden answer; route/score/support metrics remain separate. | R01c / offline |

## Completion rules

1. Unit tests demonstrate deterministic behavior; they do not establish semantic relevance, grading calibration or real auth integration.
2. DB durability/concurrency claims require real transactions against a disposable database and independent connections/processes where relevant.
3. Human content-review rows remain open until an actual reviewer records source fit and task feasibility. AI-authored fixtures do not approve themselves.
4. No live external benchmark is necessary to implement these safeguards. New performance/quality claims from providers require a separate bounded run plan and honest accounting of dispatched/unknown outcomes.
5. Tests under `docs/audit-2026-10-04/` characterize old defects. Some assert the presence of a bug; do not copy their expected vulnerable behavior into regression tests.
6. Keep evidence exclusions: the self/cross study contains 20 requested cases but only 18 verified fixtures, nine defects and nine controls. Never put the two excluded cases back into the denominator to improve a headline.
7. Declare the intended release gate. A synthetic rehearsal pass cannot be relabelled a real-user pilot pass; unresolved identity/privacy/durability checks block the latter.

## Release record template

```text
Intended gate: synthetic rehearsal / real-user pilot / research-only
Commit and working-tree diff identifier:
Node/package manager/OS:
Configuration mode (no secrets):
Completed packets:
Acceptance IDs proved, test/report path:
Unit/DB/browser checks passed:
Typecheck/full test/lint/build results:
Failures and blocked checks:
Observed end-to-end latency (N, cold/warm, stage breakdown):
Provider usage and unknown outcomes, if any:
Unmet human reviews:
Deployment decision: not part of this implementation request
```
