# Final-round product-readiness audit

Date: 4 October 2026 (Sydney). Audited commit: `b0af8b0` on `main`, pulled with `git pull --ff-only origin main` from `512ef8c`. Application source was not modified. No live database records, migrations, or AI calls were used. No credentials were saved. No commit or push was performed.

Start here, then use [REPAIR_WORK_PACKETS.md](REPAIR_WORK_PACKETS.md) to assign bounded fixes. This report supersedes current-status assumptions in the September audit; it does not erase that historical report.

## Executive finding

The application builds and its existing tests pass, but it is not ready to hold real candidate assessments. The main blockers are identity impersonation, unauthenticated mentor operations, uncontrolled sharing, unreliable verification labels, and reports that turn heuristics into apparent evidence of ability. Fix these before adding more framework terminology or changing hosting.

The three-tier resolver is now integrated into the normal JD pipeline. The old claim that it is merely planned is obsolete. However, database retrieval, verification, and persistence are not yet trustworthy. DeepSeek is selectable, but keeping two keys does not implement provider failover.

## Verification performed

| Check | Outcome |
| --- | --- |
| Working tree before pull | No tracked edits; existing user PDFs and `tmp/` preserved. |
| Dependency setup | `npm ci --ignore-scripts`, then `npx prisma generate`. Initial missing sql.js/jszip errors were stale local dependencies, NOT repository bugs. |
| Existing suite | 18 files; 197 tests passed, 1 skipped. |
| Production build | `DATA_SOURCE=mock DEMO_MODE=true npm run build` passed. |
| Typecheck after build | `npm run typecheck` passed; build generates Next route types. |
| Lint | 51 errors, 69 warnings before adding audit probes. Log: local `tmp/audit-lint.txt`. |
| Audit reproductions | 21 probes passed across three files. PASS means the defect was reproduced, NOT that the application is safe. External AI/DB/auth boundaries are mocked; actual application guards and sql.js execute locally. |
| Local production HTTP | Anonymous bounty GET returned 649 items, including 7 populated trap fields, in a 2,924,217-byte response. A forged `userId=mentor-1` cookie opened the mentor console. Synthetic public report/employer routes returned 200. |
| Trace export | Tracked CSV has 152 rows; 138 nonempty inputs, 53 outputs, 126 user IDs, 104 session IDs. Contents are deliberately not reproduced here. |
| Dependency audit | npm reported 12 affected packages: 1 critical, 11 high. Reachability must be triaged; this is not 12 demonstrated exploitable application bugs. |

Reproduce isolated defects from the repository root:

```powershell
npx vitest run --config docs/audit-2026-10-04/probes.config.mts
```

The probes deliberately assert current bad behavior. Do not add them unchanged to normal CI. During repair, translate each into assertions of the intended safe behavior, using the acceptance criteria below. Configuration clears AI and tracing keys, forces test/demo mode, and prevents bounty writes to disk. They never require the user's supplied credentials.

Evidence labels: **Reproduced** = isolated executable probe or local HTTP observation; **Code-confirmed** = directly traceable implementation defect; **Risk / unverified** = further deployment/browser evidence needed. Static confirmation does not imply exploitation occurred.

## Prioritised findings

### A01 — P0 — A cookie or an email is sufficient to impersonate a candidate or mentor

**Reproduced / code-confirmed.** `src/lib/auth.ts:18`, `src/app/actions/auth.ts:14`, `:33`, `src/lib/data/prisma.ts:159`, `src/lib/data/demo-users.ts:8`.

`getCurrentUser` trusts the unsigned `userId` cookie. `signIn` looks up an email and sets that cookie without verifying a password; `switchUser` accepts user IDs. Known demo mentors resolve before a database query even in the database adapter. Supabase environment variables do not turn this into Supabase Auth. Local production accepted the forged mentor cookie.

**Impact:** account takeover, reading candidate evidence and issuing mentor decisions. Ordinary role checks do not help when identity can be forged.

**Repair:** implement verified server-side sessions using an authentication provider; resolve application roles from controlled server-side records. Isolate demo identities behind explicit demo mode and separate data. Remove production impersonation actions. Set appropriate secure cookie attributes; validate session revocation.

**Acceptance:** anonymous, invalid/expired session and forged cookie fail; knowing an email is insufficient; candidate cannot become mentor; demo accounts cannot access real records. Cover server actions and API routes, not just page navigation.

### A02 — P1 — Mentor bounty reads and writes are available without mentor authorization

**Reproduced.** `src/app/api/mentor/bounties/route.ts:13`, `src/app/api/mentor/bounties/review/route.ts:22`.

Both use `user?.id || "mentor_demo"` instead of requiring a mentor. Anonymous POST verifies a requirement and earns a reward; an authenticated candidate can do the same. Anonymous GET returns the entire reviewer dataset, including hidden trap descriptions and review metadata. Local GET exposed 649 records and 7 trap fields.

**Repair:** require verified mentor identity on both routes and enforce it in the mutation service. Return a minimal, paginated reviewer DTO; move any intended public catalogue to a separate safe DTO. Add origin/CSRF protection for cookie-authenticated mutations.

**Acceptance:** anonymous 401, candidate 403, authorised mentor allowed. Rejected requests cause no review or credit mutation; public catalogue never includes traps or private reviewer notes.

### A03 — P1 — An anonymous generation endpoint permits paid work and returns internal challenge data

**Reproduced authorization omission; live spending not attempted.** `src/app/api/challenge/generate/route.ts:17`, `:33`.

Unlike `/api/jd`, this endpoint has no authentication, fixture-mode gate, quota or rate limit. It calls the resolver and returns the complete `ChallengeV2`, including rubric trap fields and embedding data when present. An anonymous cached request succeeds; unmatched live requests can reach paid embeddings and generation. `request.json()` reads an unbounded body before Zod limits are checked.

**Repair:** consolidate generation behind a single authenticated candidate service, impose per-user/IP concurrency and spend limits, parse with bounded bytes, return a candidate-safe result, and persist a usable owned challenge before success. Audit both generation routes for equivalent policy.

**Acceptance:** anonymous calls never invoke AI; quota rejects before paid work; returned ID can be loaded after restart; internal trap/vector fields are absent; oversized streaming bodies stop at the byte cap.

### A04 — P1 — Full assessment sharing is automatic rather than candidate-controlled

**Code-confirmed; fixture HTTP verified.** `src/app/report/[id]/page.tsx:16`, `src/app/report/[id]/employer/page.tsx:14`, `src/app/report/[id]/credential/page.tsx:85`, `src/lib/data/prisma.ts:114`.

Report pages load evaluations without an owner/mentor/share authorization decision. The full report passes transcripts, files, contest reasons, and mentor comments into client components. Hiding controls or collapsed panels is not access control. The schema has no share grant, revocation, expiry or field-level sharing choice.

**Repair:** default to owner/authorised-reviewer access. Add explicit candidate consent and revocable, expiring share grants. Build separate public DTOs before serialization, excluding private data by default. Make all report variants and exports use the same policy.

**Acceptance:** an unshared real assessment is unreadable to strangers and other candidates; approved sharing reveals only selected fields; revoke/expiry works; inspect HTML and RSC payloads as well as visible UI.

### A05 — P1 — Database failure can become a convincing synthetic workspace; seed aliases can select real assessments

**Reproduced workspace fallback; code-confirmed alias behavior.** `src/lib/data/index.ts:29`, `src/lib/data/prisma.ts:260`, `:330`, `src/lib/data/mock.ts` (`getWorkspace`, `getEvaluation`).

The data-source proxy substitutes mocks after errors. Missing workspace IDs produce an ACTIVE workspace owned by `candidate-1`. The DB adapter also resolves public `seed-*` evaluation aliases to the highest/lowest real score for the seed challenge source. Only the main report route rejects seed IDs; employer/credential routes do not.

**Repair:** production adapters must distinguish not found, forbidden and unavailable. Return 404/403/503 rather than fixtures. Resolve demo aliases only in an isolated demo store, never by selecting a real user's assessment.

**Acceptance:** unknown IDs and simulated DB outages never display another record or synthetic success; public seed aliases cannot select live data. Note: an older finding that every unknown evaluation ID returns a fixture did NOT reproduce here: current mock fallback selects an unevaluated first session and returns null. Do not reintroduce that stale claim.

### A06 — P1 — Rejected or unaudited challenges can be labelled Tier 1 verified

**Reproduced.** `src/lib/engine/resolver.ts:138`, `:212`, `:224`, `:236`; `src/lib/engine/verification.ts:111`.

Company substring matching bypasses role fit and uses hardcoded similarity values (.98/.95). The later repository fallback does not check verification status: a REJECTED item is returned as `TIER_1_VERIFIED`. The database fallback manufactures APPROVED status without finding an audit. A failed re-audit retains the old badge and tier.

**Repair:** derive verification exclusively from an approved audit of the exact immutable challenge version; clear active approval on rejection/recalibration. Apply status and suitability filters on every retrieval path. Keep match method separate from measured similarity; do not invent scores. Check static bank badge provenance before enabling production verified labels.

**Acceptance:** rejected/pending records never receive a verified label; rejection removes active badge; same employer/different role is not an automatic match; database presence alone cannot imply approval.

### A07 — P1 — Verification is not durable or attached consistently to the challenge candidates use

**Reproduced missing-ID false success; code-confirmed storage defect.** `src/app/api/mentor/challenge-audit/route.ts:55`, `src/lib/engine/resolver.ts:30`, `src/lib/engine/requirement-bounty.ts:87`, `src/components/mentor/challenge-accreditation-card.tsx:52`.

Audits update only a process-local Map. A nonexistent ID returns 200 and a successful audit result with `challenge: null`. The UI submits a hardcoded TGD bank ID. The main pipeline creates a new DB challenge ID, without a durable audit link to its bank source. Bounty reviews use a local JSON file; filesystem write errors are logged and ignored while success is returned. The bounty review store does not update the resolver's trust state.

**Repair:** persist versioned bank entries, audit records, source-to-instance relationships and reviews in PostgreSQL. Make the UI submit the selected actual version. Return 404 for missing records; commit before success. Unify requirement verification with explicit challenge promotion rules.

**Acceptance:** approval survives restart and is visible on another instance; DB-backed candidates show the correct version's audit; write failure yields failure; unknown challenge cannot be approved; no production runtime writes to repository JSON.

### A08 — P2 — Repeating the same bounty review repeatedly awards credits

**Reproduced.** `src/lib/engine/requirement-bounty.ts:398`, `:420`.

Each submission appends another paid-looking review, with no idempotency or uniqueness check. Reviewers also begin with 250 credits / $125-equivalent without a ledger event. This is demonstrated reward inflation, not evidence that real money is paid.

**Repair:** clarify whether rewards are fictional demo credits. For real rewards use a durable ledger, eligibility rules, idempotency keys and a uniqueness constraint for the rewarded unit of work. Validate duplicate targets and require reasons for flags. Editing a review must not pay twice.

**Acceptance:** repeated and concurrent identical requests award once; reversing a review has an explicit ledger policy; demo balances are labelled and excluded from financial totals.

### A09 — P1 — Production reports present derived heuristics as assessed evidence

**Reproduced.** `src/lib/data/prisma.ts:106`, `src/lib/services/cognitive-rubric.ts:45`, `:175`, `:283`, `src/lib/engine/evaluator.ts:179`, `:269`, `src/lib/engine/planted-bugs.ts:80`.

Database reports always call the deterministic academic fallback, not the live academic evaluator. With no transcript and score 90, it awards 5/5 constraint specification and fixed high confidence. It sets privacy/injection flags false, derives flaw detection partly from total score, emits a non-cryptographic string prefixed `sha256:`, and claims calibration N=480. Saying `accumulator spatial hash double-buffer` marks all three simulation bugs FIXED with no code. Report mapping does not pass snapshot files to this audit. These outputs are reconstructed on read and are not independently persisted evaluations.

**Repair:** remove unsupported certification, calibration and cryptographic claims from real reports. Withhold unobserved dimensions. Distinguish 'mentioned', 'attempted' and 'verified by a test'. Persist evaluator/version/provenance and observed evidence. For actual integrity receipts hash a canonical saved artifact and explain what that hash proves. Do not imply empirical calibration from a constant.

**Acceptance:** empty evidence produces no positive judgment; keywords alone cannot establish a fix; privacy not assessed is unknown, not safe; failed fixtures cannot appear as real results; refreshing a report cannot silently change its assessment.

### A10 — P2 — The separate academic evaluator keeps full scores after citation verification fails

**Reproduced; latent path, not the current report's live scoring source.** `src/lib/engine/evaluator.ts:91`, `:111`, `:120`, `:156`.

Fabricated quotations are relabelled `AUTOMATION_BIAS_TRAP`, while score, confidence, overall band and no-escalation remain unchanged. Assistant turns can also match candidate evidence because speaker ownership is not enforced. The schema requires five dimensions but not five unique dimensions. The model input omits the advertised code diff and brief, truncates the transcript, and availability checks only the OpenAI key even when DeepSeek is selected.

**Repair:** before integrating this evaluator, enforce candidate-owned evidence, unique required dimensions, withheld scores and deterministic escalation when verification fails. Preserve truncation/coverage metadata, supply intended inputs, use provider-aware capability checks, and label offline fallback.

**Acceptance:** nonexistent/assistant-only quotes cannot support candidate scores; invalid evidence forces appropriate uncertainty; DeepSeek-only configuration does not silently switch to heuristic grading; duplicate dimensions rejected.

### A11 — P1 — The golden benchmark report does not measure model accuracy

**Code-confirmed.** `scripts/eval-benchmarks.ts:68`, `:100`, `:107`, `:111`, `:181`, `:242`; `benchmarks/LATEST_BENCHMARK_REPORT.md:4`.

The runner derives flags, midpoint scores and escalation from the expected answers, then compares them to those same expectations. Task 1 checks benchmark-specific regexes and golden requirements, not the new resolver/generation flow. The report hardcodes 100% claims and production certification language. Running this script was deliberately avoided because it overwrites that misleading report.

**Repair:** separate case inputs from labels; invoke actual production functions through a controlled evaluator adapter; compare only after outputs are produced. Record model/provider/prompt/rubric versions, raw outputs, failures and latency. Derive every summary from measured results. Have humans review labels and reserve a holdout subset.

**Acceptance:** a deliberately wrong mocked evaluator fails; expected labels never enter model input; changed outcomes alter report totals; 50 drafted synthetic cases are not described as validated accuracy or zero bias.

### A12 — P1 — Provider fallback sends the wrong vendor's key to the selected endpoint

**Reproduced with synthetic keys; no credentials transmitted.** `src/lib/env.ts:86`, `:94`; `src/lib/ai/client.ts:133`.

If DeepSeek is selected but its key is missing, `aiApiKey` returns the OpenAI key while the base URL remains DeepSeek. The reverse configuration also mixes vendors. No failure path retries a coherent secondary provider configuration. The singleton client can also outlive a changed provider/model configuration in the same process.

**Repair:** model a provider as one validated tuple: endpoint, credential, model and capabilities. Missing selected-provider key must fail closed. If failover is desired, explicitly select a complete second tuple, record the provider used, and account for differing output/latency/cost. Do not silently route data to another provider.

**Acceptance:** provider-matrix tests prove no key crosses vendors; missing keys produce actionable safe errors; a failure triggers only configured failover; model/capabilities match the actual endpoint.

### A13 — P2 — Semantic retrieval mixes incompatible vector spaces and has an initialization race

**Vector defect reproduced; initialization race code-confirmed.** `src/lib/engine/embedding.ts:56`, `:88`; `src/lib/engine/resolver.ts:33`, `:42`.

Live embeddings can fall back to unrelated 128-dimensional hashes while existing vectors remain from the live model. Cosine similarity uses the shorter vector length; `[1,0]` and `[1,0,999]` return a perfect match. No vector provenance is stored. Initialization sets `initialized=true` before awaiting all embeddings, so concurrent requests can see a partial bank. Cold starts also embed the bank sequentially before even attempting direct matches.

**Repair:** persist model/version/dimensions with vectors; reject incompatible spaces. Switch the entire retrieval operation to a consistent offline index when needed. Use a shared initialization promise with failure recovery. Precompute approved-bank vectors and measure cold/warm latency.

**Acceptance:** mixed dimensions/providers never compare; simultaneous first requests see the same complete bank; transient embedding failure cannot silently change trust or return a false semantic match.

### A14 — P1 — Chat can write after submission, breaking snapshot/transcript consistency

**Reproduced with a controlled deferred AI response.** `src/lib/services/sessions.ts:172`, `:244`, `:278`, `:352`, `:376`, `:400`.

Chat checks ACTIVE before calling AI but does not recheck before persisting the assistant turn. Submit accepts a session with an unanswered user turn, captures old files and evaluates. The assistant can then append files to the submitted session. Concurrent evaluation requests also perform duplicate paid work before the unique Evaluation constraint resolves their race; retrying chat has no durable in-flight claim.

**Repair:** introduce atomic state transitions and durable operation leases/idempotency. Block or coordinate submission while chat is in flight; reject late writes unless part of the exact frozen submission. Freeze the transcript revision and files together. Claim evaluation once and make other requests observe its state. Do not hold a DB transaction open during an AI call.

**Acceptance:** the included race probe becomes impossible; simultaneous submits invoke AI once; double retry cannot create two assistant completions; submitted evidence is immutable and matches the displayed project.

### A15 — P1 — URL and request boundary protections contain bypasses

**Address guard reproduced; other gaps code-confirmed.** `src/lib/fetch-jd.ts:29`, `src/lib/auth.ts:45`, `src/lib/api.ts:29`.

Hex IPv4-mapped addresses such as `::ffff:7f00:1` and `::ffff:a9fe:a9fe` pass the public-address guard. No private endpoint was contacted; deployment reachability was not tested. `safeNext` permits a slash followed by a backslash, which URL parsing can normalize to another origin. `readBody` buffers everything before enforcing a character-count limit; new routes bypass even that helper.

**Repair:** normalize addresses with a well-tested IP parser before range checks; retain DNS validation at connection time and on redirects. Validate redirect origin after canonicalization and reject backslashes/control characters. Limit incoming bytes while streaming and abort once exceeded. Use these guards consistently.

**Acceptance:** IPv4, expanded/compressed/mapped IPv6, redirects and hostname-resolution cases are covered without reaching private hosts. External post-login destinations fail. Chunked and multibyte oversized requests are bounded and return 413.

### A16 — P1 — Challenge creation is no longer atomic and can report temporary storage as success

**Code-confirmed.** `src/lib/services/challenge-pipeline.ts:256`, `:267`, `:270`, `:298`, `:325`; `src/lib/services/sessions.ts:110`.

The current live path separately creates user, submission, challenge and requirements. Failure at the last step leaves a challenge with no rubric, then switches to a process-local fallback and emits done. Session creation still permits synthetic session IDs for in-memory challenges. This is a regression from the older live-path transaction and leaves partial rows potentially discoverable by the bank.

**Repair:** generate outside the transaction, validate the complete artifact, then atomically persist its durable records. Return retryable failure when DB is unavailable; keep fixtures explicit. Add idempotent request IDs so retries cannot duplicate jobs/challenges. Persist stable source/version links for the bank.

**Acceptance:** injected failure at every write leaves no partial challenge; success IDs survive restart and support start/chat/submit; retries produce one artifact; no fake success after DB failure.

### A17 — P1 — The new generation path bypasses the old rubric fairness and semantic validators

**Schema gap reproduced.** `src/lib/services/challenge-pipeline.ts:234`, `src/lib/engine/pipeline.ts:72`, `:139`, `:168`, `:206`; compare `src/lib/ai/generate-requirements.ts:44`, `:82`, `:272`.

The parser detects barriers, but the resolver receives the raw JD and V2 generation never runs `lintRequirements` or `bankSchemaFor`. Its schema accepts five duplicate IDs and a native-English hiring criterion. Categories, unique IDs, coverage and weight consistency are not enforced. AI starter filenames also enter `buildRoleStarterTemplate` without the normal file-write sanitizer. Framework naming is inconsistent (SFIA 8 prompts versus SFIA 9 persisted labels), and level selection is constrained to 2/3 even for senior listings.

**Repair:** establish one versioned validated challenge contract for all tiers and imported data. Validate fairness and assessment relevance, unique IDs/categories, weights, executable starter files, bounded sizes and safe paths. Carry excluded barriers through generation and lint before persistence. Choose an explicitly supported framework version and role range; reject or clearly scope unsupported roles rather than implying accreditation.

**Acceptance:** the reproduced bad rubric fails; all three tiers pass the same invariants; unsafe filenames never reach a mount; requirement IDs remain stable; report framework/version matches actual generation and reviewed mapping.

### A18 — P1 — Raw candidate data is exported to tracing and a trace export is tracked in Git

**Code-confirmed export; provenance/consent not verified.** `src/lib/ai/langfuse.ts:52`, `:106`, `:116`; `data/tracing_1_week_to_oct_1.csv:1`.

Tracing wraps model calls and separately exports whole candidate messages with user/session identifiers. The tracked CSV includes raw inputs/outputs and identifiers (counts above). Whether all records are synthetic is unverified; do not assert a confirmed personal-data breach. There is no implemented redaction boundary or end-to-end retention/deletion policy covering DB, reports, telemetry and exports.

**Repair:** treat the export as potentially sensitive pending owner review; stop adding raw traces to source control. Add default-minimal/redacted telemetry and explicit debug opt-in. Document actual processors and purposes, implement retention/deletion, and test secret/PII canaries. Review trace provenance and access; coordinate any history rewrite or credential rotation separately rather than doing it blindly.

**Acceptance:** fake emails, tokens and identifiers do not appear in default traces; private report content stays private in logs; retention is enforceable; a reviewed synthetic fixture replaces any needed committed example. Never copy secrets into repair prompts.

### A19 — P2 — Search filters run after limiting; results can miss existing matches and leak private challenge metadata

**Query shape reproduced.** `src/lib/services/sfia-query.ts:111`, `:116`, `:128`, `:171`; `src/app/api/challenges/search/route.ts:31`.

The database takes the most recent N records before applying company/role/skill filters in JavaScript. A matching older record disappears. Public search has no catalogue visibility/ownership distinction, no validated bounded pagination, and loads full job submissions unnecessarily. Invalid limits can produce DB errors that silently fall back to the bank. Static bank records can dominate the final limited results.

**Repair:** define published catalogue versus private candidate challenges; enforce visibility, push filters into a supported database schema/query, select only required fields, and paginate deterministically after filtering. Validate finite bounded limit/level/enums; preserve honest infrastructure errors.

**Acceptance:** an older matching row is returned despite newer nonmatches; private items never leak; malformed/huge/negative limits fail cheaply; pagination does not duplicate or omit records.

### A20 — P2 — Browser runtime state is not keyed to the build session

**Code-confirmed; browser reproduction still required.** `src/lib/runtime/webcontainer.ts:82`, `:229`, `:308`; `src/components/workspace/workspace.tsx:95`; `src/components/workspace/preview-panel.tsx` (Start over).

Module-level container/files/startPromise survive navigation. `startRuntime` returns the existing promise even when given a different project's files; the workspace effect has no session-aware teardown. Stop is tied mainly to submission. 'Start over' calls the same cached start function, so some post-start failures cannot reset. This can preview stale code from another session.

**Repair:** make lifecycle identity explicit, tear down/reset on session switch and relevant failures, cancel queued stale writes, and rebuild only from the current authoritative files. Coordinate cleanup with in-flight startup to avoid tearing down a newer instance.

**Acceptance:** browser test A -> B without a hard reload shows only B files/preview; delayed A writes cannot affect B; restart recovers installation/server failures; unsupported browsers get a usable alternative.

### A21 — P1 — Identity, score scales and mentor overrides disagree across report views

**Code-confirmed.** `src/app/report/[id]/credential/page.tsx:97`, `src/app/report/[id]/employer/page.tsx:19`, `src/components/report/employer-deck.tsx:42`, `src/app/mentor/[id]/page.tsx:35`, `src/lib/data/prisma.ts:106`.

The DB report mapper does not populate candidateName, while the credential substitutes Alex Chen. Employer praise and cognitive narratives use original AI overallScore even after a mentor override changes the displayed effective score. The mentor page combines requirement scores on 0-5 with overallScore on 0-100 when a requirement is null. A missing observation becomes a numeric value on a different scale.

**Repair:** derive all report variants from a single authorised report model. Use permitted actual identity or an explicit anonymous label, never a fictional name. Keep original AI and mentor judgments separate and labelled; remove incompatible derived praise. Preserve nulls and normalize scales only at clear boundaries.

**Acceptance:** synthetic candidate Bea is never rendered as Alex; a 90 -> 40 override is consistent everywhere; unscored requirements stay unscored; exports/share pages reflect the same saved state.

### A22 — P2 — AI request budgets and streaming recovery are incomplete

**Code-confirmed; failure-injection browser test pending.** `src/lib/ai/client.ts:138`, `:223`, `:299`; `src/lib/ai/build-assistant.ts` (`accumulatedJson`); `src/lib/ai/prompts/evaluator.ts:66`, `:85`; `src/lib/client/api.ts` (`sendChatStream`).

The apparent total file budget still grants at least 500 characters to every additional file. Transcript limits are per turn, not an overall token budget. Calls have no application deadline/cancellation coupled to route limits. A schema retry can stream into the same accumulated JSON/message buffer, confusing the visible reply. A dropped connection can occur after the server saved an answer; retry then lacks a reconciliation read. Raw provider reasoning is forwarded through a public stream without a specific product contract.

**Repair:** define stage budgets for tokens, files, requests and total wall time; abort when clients disconnect where safe. Preserve evidence coverage and do not grade omitted data as absent work. Add operation IDs/status reconciliation and reset stream state on retries. Expose intentional progress summaries instead of provider-internal fields by default.

**Acceptance:** maximum-size work stays within budget; truncated evidence is flagged; partial invalid response then retry renders only the accepted answer; dropped responses recover from saved state without duplicate cost or lost files.

### A23 — P2 — SQLite initialization silently leaves a partial database; backend demo is not connected to it

**Initialization reproduced; other behavior code-confirmed.** `src/lib/engine/starter-template.ts:97`, `:146`; `src/components/workspace/sqlite-panel.tsx:48`, `:131`; `src/lib/sqlite/sqlite-engine.ts:54`, `:75`.

The generated schema inserts the first three users, then seed.sql inserts them again against a unique email constraint. The panel concatenates both; initialization catches the error, marks itself ready and leaves later seeds absent. Probe observed three users and zero audit logs. The Node `/api/records` returns hardcoded rows rather than querying this browser SQLite database. Query edits and data mutations are not included in server submission snapshots. SQL executes synchronously without an execution budget, which can freeze the UI on costly input.

**Repair:** seed once in an atomic initializer and surface failures. Either implement the intended backend/database connection or label the panel as an independent SQL playground. Define whether SQL work is assessed and persist relevant evidence accordingly. Run untrusted SQL in a terminable worker with bounded result size. Handle changes to all supported schema/seed paths.

**Acceptance:** generated schema+seed loads without warnings and includes expected audit rows; initialization failure never reports ready; costly query can be cancelled; SQL work intended for grading survives reload/submit.

### A24 — P2 — Release quality checks and dependency updates need a real gate

**Measured, with exploitability caveat.** `package.json`, `package-lock.json`, `vitest.config.mts`.

Lint has 51 errors and 69 warnings. npm audit reports 12 affected packages, including Next 16.3.5. The [Next.js ImageResponse advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) applies to attacker-controlled SVG values in Node ImageResponse and lists 16.3.6 as patched. No `next/og` or `ImageResponse` application usage was found, so remote-code execution in this app is NOT demonstrated. npm's suggested fix at audit time was Next 16.3.8; other fixes include disruptive downgrades and must not be applied blindly. Tests clear only the OpenAI key, leaving other provider/tracing settings potentially inherited.

**Repair:** review affected dependency paths and compatible patched versions; remove unused production tooling where appropriate. Fix lint errors in bounded changes, enforce CI build/typecheck/lint/test, and make tests explicitly offline for every provider and telemetry system. Do not use `npm audit fix --force` indiscriminately.

**Acceptance:** clean reproducible install and checks; reviewed advisory reachability and update record; a failing live-provider mock cannot make network calls during the default suite.

### A25 — P1 — Re-populating existing challenges can destroy historical rubric references

**Code-confirmed; destructive script not executed.** `scripts/populate-challenges.ts:753`, `:775`, `src/lib/data/prisma.ts:98`, `prisma/schema.prisma` (Evaluation.perRequirement).

The population script deletes existing requirements and creates new generated IDs. Stored perRequirement results reference those old IDs in JSON, without relational integrity to preserve them. Report reconstruction joins against current requirements and can silently drop old scores after a refresh. Challenge content and rubricVersion are also updated in place.

**Repair:** use immutable challenge/rubric versions once referenced by sessions. Populate new versions or preserve stable IDs only when semantics are unchanged. Snapshot the rubric used for evaluation; make import validation and commits atomic. Provide a dry-run impact report and a separate reviewed migration for existing data.

**Acceptance:** re-importing content cannot alter or erase a completed report's rubric/evidence; existing active sessions retain their original contract; all historical IDs resolve; failed imports leave no partial update.

## What improved since September

| Previous finding | Current status |
| --- | --- |
| R01 baseline checks | Build/typecheck pass after installing locked dependencies; lint still fails. |
| R02 ambiguous modes | Still open: client can request fast mode; production fallbacks still resemble success. |
| R03 empty fast requirements | Fast path now inserts requirements; do not repeat the old zero-requirements claim. A16 covers current atomicity/fallback failures. |
| R04 missing records | Unknown evaluation fallback is now null in the tested fixture setup; synthetic workspaces and live seed aliases remain (A05). |
| R05 unsupported claims | Still open and expanded with academic/bug-fix claims (A09-A11). |
| R06 report consistency | Effective headline score is used in more views; identity and derived narrative disagreements remain (A21). |
| R07 fixed rubric display | Challenge rubric now maps passed requirements; old hardcoded-category claim is not repeated. Hidden traps now leak through new APIs (A02-A03). |
| R08 concurrency | Client guards added, but cross-request/server race remains reproduced (A14). |
| R09 retry/recovery | Streaming and client guards improved; lost-response reconciliation remains (A22). |
| R10 runtime isolation | Still open by source inspection (A20). |
| R11 seed navigation | Stepper now only links Home; previous hardcoded seed-step links removed. |
| R12 authentication / R13 sharing | Still product blockers (A01/A04). |
| R14 network boundaries | Mapped-IPv6 guard bypass still reproduces (A15). |
| R15 context budget | Still open (A22). |
| R16 fairness | New pipeline bypasses previous deterministic lint (A17). |
| R17 UI/accessibility | Not comprehensively browser re-tested; do not treat historical visual findings as newly verified. |
| R18 export | Project ZIP now exists and ZIP tests pass. Full report/export privacy and consistency still need A04/A21 acceptance. |
| R19 commercial promises | Bounty rewards and interview button still include simulations; make production scope explicit. |
| R20 documentation/demo | Update after repairs and preserve a synthetic fallback demo. |

## Unverified risks and remaining validation

- Actual deployment environment, Supabase RLS, database grants, pool mode, backup/restore, regional placement, provider balances and runtime platform limits were not inspected. Supplied environment values are configuration intent, not proof of deployed settings. No live-user data was queried.
- Real DeepSeek/OpenAI latency, cost, prompt-injection resistance and model agreement were not measured in this audit. Do not reuse September timings as current measurements. Full live synthetic E2E should use a staging database after A01-A04.
- WebContainer navigation isolation, sandbox capabilities, dependency install scripts, iframe navigation/egress, cross-origin headers and mobile support need adversarial browser checks. Missing an iframe sandbox attribute alone does not prove a same-origin escape.
- Framework mapping, domain/regulatory accuracy, mentor qualification and calibration claims require expert evidence. A model persona claiming accreditation does not supply it. No external SFIA/academic validation was performed.
- Raw provider errors are returned from some new routes and logged in others; test sanitized error responses with canary secrets, request IDs and malformed provider responses. Avoid emitting full upstream bodies to users.
- The original credentials shared in chat were not persisted by this audit. Rotation/revocation and repository-history review are owner-controlled operational work, not silently executed changes.

## Product release gates

1. **Access and privacy:** A01-A04 plus A15/A18; no real users until identity and sharing are controlled.
2. **Truthful evidence:** A06-A11/A17/A21; verified must mean a recorded review of that version, and unknown must remain unknown.
3. **Durable workflow:** A07/A14/A16/A25; no lost approvals, mutable submissions or success without persistence.
4. **Usability and operations:** A12-A13/A19-A20/A22-A24; measured budgets, recovery, repeatable checks and staging E2E.

A host migration does not repair these trust and data-integrity failures. First measure slow stages and make durable state authoritative; then compare hosting using the same safe workload.
