# ProofCraft performance findings and Vercel/Fly.io decision

Measured 19 September 2026 against baseline `c44cbc3`. This supplements `AUDIT_AND_REPAIR_PLAN.md`. No hosting configuration or application code was changed.

## Recommendation

Fix the database connection, chat/runtime coupling and high-latency generation path first. A small Fly.io comparison is reasonable because the owner already has a plan, but the evidence does not justify migrating everything as the first fix. Most of the measured generation delay was inside OpenAI calls. The browser's WebContainer runs on the candidate's device; moving the Next.js server does not move that workload to Fly.

A persistent Fly Machine could reduce cold starts, keep connection pools warm and support a background worker. It cannot fix missing database records, fabricate a reliable report, accelerate the same remote model response, or repair a hung browser boot. An in-memory challenge Map also remains unsafe on Fly: restarts and multiple Machines still lose/diverge that state.

## Live measurements

The user supplied production-style settings: `DATA_SOURCE=db`, `DEMO_MODE=false`, `FAST_PIPELINE=true`, global model `gpt-5.5`, Langfuse enabled, and the same direct Postgres endpoint for runtime and migrations. Credentials were used only for bounded synthetic tests and are not included here.

The live-stage harness called the repository's real `parseJobDescription`, `generateChallenge`, `generateRequirementBank` and `buildAssistant` functions. It used the supplied model, existing prompts/schemas/effort settings, and a fictional task-tracker job. Research was explicitly JD-only synthetic context, not a measured web search. The harness injected a real OpenAI client with retries disabled and a 90-second per-call timeout to bound audit spend; these two safeguards differ from the current app's defaults. Langfuse configuration was enabled, but delivery to its dashboard was not verified.

| Operation | Wall time | Input/output tokens | Observation |
| --- | ---: | ---: | --- |
| Tiny OpenAI connectivity request, low effort | 2.67s | 15 / 4 | API key and requested model worked |
| Actual JD parser, low effort | 3.03s | 722 / 142 | Parsed successfully |
| Actual challenge generation, high effort | 36.80s | 1,141 / 3,727 | 9 starter files; 2,048 output tokens were reasoning |
| Actual requirement generation, high effort | 39.38s | 1,852 / 3,823 | 13 requirements; structural/fairness lints passed; 854 reasoning tokens |
| Actual assistant, medium effort, README-only edit | 3.72s | 2,625 / 246 | Only README.md written; not representative of a large code rewrite |
| Direct database `SELECT 1` | Failed | N/A | Prisma could not connect from this machine |
| Database DNS | AAAA exists; A returns ENODATA | N/A | Direct endpoint is IPv6-only; OS address lookup did not yield a usable connection |
| Supabase transaction pooler: first `SELECT 1` | 3.09s | N/A | Reachable using subsequently supplied connection |
| Same pooler: two warm `SELECT 1` calls | 1.25s / 1.55s | N/A | End-to-end from this local machine, not server-side SQL execution time |
| Fast pipeline against the pooler | 10.61s | No AI call | Saved challenge had 0 requirements; returned session was absent; chat 404 |
| Start a normal saved synthetic session | 6.35s | N/A | Multiple DB round trips in current service |
| Real chat on that saved session | 9.15s | Not collected in this harness | USER and ASSISTANT persisted; short clarification with no file writes |
| Submit snapshot + real evaluation | 74.92s | Not collected in this harness | SUBMITTED, snapshot present, 12 results, source `ai`, review PENDING |

The model resolved to `gpt-5.5-2026-04-23`. Parsing + challenge + rubric took approximately **79.2 seconds**, excluding web research, persistence, browser navigation and preview startup. These are one-sample measurements, not a latency distribution. A second harness created a unique synthetic DB user and a complete fixture challenge, then exercised the real session/chat/submission/evaluation services. It cleaned up only its own records afterward. This verifies a narrow successful live service path, not a complete newly generated challenge/browser journey or Vercel production latency. A deployed URL is still needed for the hosting comparison.

The working pooler host supplied by the owner is in `ap-southeast-1`; the audit connection used Prisma 6 transaction-pooler compatibility (`pgbouncer=true`), one client connection and bounded connect/pool timeouts. Hosting secrets were not changed. The 1.25–1.55s warm query samples make deployment-side DB timings a priority, but local network/connection overhead cannot be attributed to Supabase SQL execution or to Vercel without measurement there.

The local production-build browser test used explicit mock mode and synthetic fixture accounts. Its workspace remained at Booting for more than five minutes in the embedded browser; console contained React hydration error 418. Treat this as a demonstrated missing timeout/recovery problem and a browser-compatibility lead, not a measured Chrome boot time.

## Why it feels slow

| Source | Evidence | Would moving to Fly directly fix it? |
| --- | --- | --- |
| Artificial generation delay | Fast pipeline has sequential 1s + 1s + 1.5s + 1s + .5s pauses | No |
| Sequential reasoning-heavy generation | Parse → research → challenge → rubric; challenge/rubric high effort. Live sample above spends ~76s on those last two stages | No |
| Large whole-file output | Assistant returns complete file contents with a 32k completion ceiling | No; optimize work requested/output instead |
| Chat waits on browser preview work | `Workspace.runChat` awaits `applyRuntimeWrites` before clearing pending; writes queue behind boot/install | No |
| Browser boot/install | WebContainer downloads/boots/installs in the browser, with no boot/install deadline | No |
| Database connection/address mismatch | Supplied direct endpoint is IPv6-only; local Prisma connection failed | Potentially changes reachability, but correct connection mode is the first repair |
| DB distance/repeated requests | Header fetches all users each render; home/auth/data reads can make additional DB round trips; no measured deployed region | Only if placement/queries are improved; currently a hypothesis |
| Cold starts or function limits | No deployed trace/URL yet; actual Vercel setting unknown | Possibly; measure before blaming the free tier |
| Telemetry lifecycle | App awaits flush on each stage, but wrapper and explicit event code use different clients | Fix code; measured stage overhead was only milliseconds in this run |

## P01 — Verify database reachability and server placement

**P0 operational blocker · small configuration task plus measurement.** Files: deployment docs, `.env.example`, Prisma schema/client and hosting settings. Coordinate with R02/R04.

For Vercel/serverless, get the exact **Transaction pooler** connection from Supabase's Connect dialog. It uses port 6543 and a pooler-specific username/host. Keep a suitable migration connection separately. For a persistent Fly deployment, direct IPv6 or an IPv4 session pooler may be appropriate. Copy the host from Supabase; do not guess a regional pooler hostname. Apply the connection/prepared-statement settings for this installed Prisma 6 version, not an unrelated Prisma 7 snippet. Supabase documents the environment-specific choices and IPv6 limitation. [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)

Verify read-only connectivity first, then schema presence. Record cold connect, warm `SELECT 1`, one representative challenge read and one report read without printing rows or credentials. Confirm the DB region and function/Machine region; colocate server DB calls where practical. Vercel documents regional placement and recommends executing functions near the data source. [Vercel Functions](https://vercel.com/docs/functions)

Remove the live error-to-fixture fallbacks with R04; otherwise a DB timeout can look like slow but successful navigation. Limit Prisma pool sizes to suit the deployment and DB capacity; do not choose arbitrary large limits. Replace header `listUsers()` with the minimum needed identity query outside demo mode.

**Accept:** runtime and migration connections are appropriate and separately documented; cold/warm DB timings are recorded; live outage is visible as an error; no global user list in normal header; no secrets in logs/docs.

## P02 — Decouple chat completion from preview synchronization

**P1 · small focused UI/state fix · coordinate with R09/R10.** Files: `components/workspace/workspace.tsx`, `lib/runtime/webcontainer.ts`, runtime status.

After a successful chat API response, the transcript and files are already persisted. `runChat` nevertheless awaits `applyRuntimeWrites`, whose queued task cannot run until current boot/install finishes. If boot never settles, the composer stays pending indefinitely even though AI has answered. A dependency change can similarly make a fast AI reply feel like a long chat request.

Treat server chat completion and preview synchronization as separate operations. Clear chat pending after accepting the canonical server result; track preview syncing/failure independently. Keep ordered/coalesced writes and session-generation guards so asynchronous preview updates never display older files. A runtime failure must not remove a successfully saved candidate turn or claim the assistant request failed. Separate teardown from successful report navigation with a bounded cleanup policy.

**Accept:** deferred/hung boot plus instant successful chat response immediately shows saved response and restores composer; preview displays syncing/failure; multiple responses produce the latest ordered filesystem state; submission remains correct because it uses server files, not preview state.

## P03 — Reduce measured AI latency without sacrificing evidence

**P1 · medium, split instrumentation and tuning.** Files: `lib/env.ts`, `ai/client.ts`, generation/assistant/evaluator stage callers, client progress UI.

1. Record stage duration, queue time, provider duration, attempts, model, effort, input/output/reasoning/cached tokens, and result status. Keep payloads out of operational logs.
2. Give rubric generation its own stage identifier. It currently appears as `challenge_output` and shares `OPENAI_MODEL_CHALLENGE`, obscuring its separate ~39s cost.
3. Benchmark lower effort for challenge/rubric on a fixed set of representative JDs. Keep the current implementation as the comparison. Introduce a smaller/faster stage model only if structure, fairness, relevance and starter bootability remain acceptable. Existing per-stage model overrides are useful; do not blindly swap the evaluator to the cheapest option.
4. Reduce output: generate compact starter content, bounded explanations and only changed files. Do not truncate already-authored code. The max-token ceiling is not the actual output size; measure actual tokens before changing it.
5. Remove artificial waits from real generation. Use truthful progress and elapsed time. Pipeline steps have dependencies; do not naively parallelize rubric generation against a not-yet-generated challenge.
6. Cache only suitable reusable research/challenge artifacts using input/model/prompt/rubric version and provenance. Never cache an individual candidate's evaluated result across users. A cached result must say it is cached.
7. Stream progress or visible assistant text where useful, but apply code only after complete schema validation and server persistence. Add cancellation/deadlines and a durable retry policy. A streaming spinner is not evidence of saved state.

OpenAI recommends optimizing output length and request structure for latency; GPT-5.5 guidance recommends evaluating lower reasoning effort for latency-sensitive workflows and increasing it only when evaluation warrants the cost. These are tuning opportunities, not guaranteed speedups. [Latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization), [GPT-5.5 guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.5)

**Accept:** compare the same inputs before/after with saved timing/token summaries; all rubric/fixture integrity checks pass; inspect generated projects in the runtime; no claim of improvement based on one unrelated prompt. Start with 5 diverse synthetic JDs and several small/large assistant edits, then expand only if useful. Live spend must be explicitly bounded.

## P04 — Profile preview startup and stop indefinite waits

**P1 · medium · R10.** Files: runtime module, runtime/preview components, workspace import boundaries.

Measure browser time from workspace navigation to runtime import, boot, mount, install, dev-server-ready, and first iframe render. Include browser/version, network state, cold/warm visit and device class. Preserve required COOP/COEP headers and tested pinned starter dependencies. Add deadlines/abort/retry for boot and install as well as server-ready. Show unsupported-browser guidance when prerequisites fail, and a different recovery path when boot itself hangs.

Lazy-load heavy runtime code where useful, avoid reinstall when dependency-relevant package content is unchanged, and evaluate a safe reusable base snapshot only after correctness is established. Never improve speed by reusing another session's files. Review whether dense transcript/file rendering needs memoization or virtualization using measurements rather than adding complexity speculatively.

**Accept:** supported Chrome/Edge cold/warm timings collected; timeout always reaches a usable recovery state; chat/file reading remains responsive during install; session switching passes R10; network/build failures do not show endless progress.

## P05 — Fix telemetry ownership and keep it off the interaction path

**P1 for reliable diagnosis · small/medium.** Files: `ai/langfuse.ts`, `ai/client.ts`, route lifecycle integration, telemetry tests.

The explicit event helpers construct their own `Langfuse` instance. `observeOpenAI` is called without that instance/parent and the installed SDK uses its own `LangfuseSingleton`. `flushLangfuse` flushes only the explicitly created client; it does not necessarily flush the model wrapper's queue. Consequently a fast flush is not proof all AI spans were delivered. The current 1.5s timeout also adds potential foreground delay and leaves an uncancelled timeout timer; actual overhead in the live sample was small, so telemetry is not proven to be the main latency source.

Use one supported client/trace ownership scheme for model spans and app events; verify it against the installed SDK. Flush the correct queue through a bounded post-response lifecycle mechanism appropriate to Next/Vercel, or on process shutdown for a persistent server. Do not simply fire-and-forget where the platform can freeze execution. Capture request IDs/stage timings with minimal payloads and redaction. Test unavailable telemetry without delaying/failing user work.

**Accept:** one synthetic request appears with correctly linked stage spans and timing; no duplicate traces; timeout is bounded and timers cleaned up; disabled/unavailable Langfuse does not break the request; telemetry does not leak credentials or unnecessary private content.

## P06 — Optional controlled Fly.io comparison

**P2 experiment, after persistence and measurement fixes.** Do not deploy merely because this plan exists. The user's request here was for a recommendation, not permission to switch production DNS or create paid resources.

Vercel Hobby with Fluid Compute currently permits up to 300 seconds for a function; legacy projects without Fluid have lower limits. The application already exports `maxDuration=300` for generation/chat/submit, but dashboard settings and actual failures must be checked. A long model call is not automatically a free-tier timeout. [Vercel function limits](https://vercel.com/docs/functions/limitations)

For an approved Fly experiment, prepare a containerized production build using the installed Next standalone-output guidance, include Prisma's required runtime assets, bind the correct port/address, add health checks and graceful shutdown, and keep secrets out of the image. Use a region chosen with DB placement in mind. Keep one Machine running during measurements if cold-start elimination is the experiment: Fly's `min_machines_running=1` applies in the primary region with automatic stop/suspend configured. This consumes resources even when idle. [Fly Next.js deployment](https://fly.io/docs/js/frameworks/nextjs/), [Fly autostop/autostart](https://fly.io/docs/launch/autostop-autostart/)

Compare the same repaired commit, DB, model settings and synthetic scenarios on both providers. Collect warm/cold page TTFB, DB wait, AI stage duration, HTTP failure rate and browser preview timing. Keep production/DNS untouched and preserve a rollback path. Use a small repeated sample before interpreting p95; do not present five requests as a reliable tail-latency estimate.

**Decision rule:** move if measurements show material cold-start/server-runtime/worker benefits and the operating cost is acceptable. Stay if the bottleneck remains AI output or client-side runtime. If work must continue after navigation or regularly exceeds request budgets, design durable jobs with claimed state and retries; a long-running VM alone does not make jobs durable.

## Remaining inputs

- Pooler reachability is resolved and verified locally. Actual deployed `DATABASE_URL`, connection compatibility settings and function/DB placement still need verification; no deployment secrets were changed.
- Deployed website URL and actual function region/Fluid settings for a Vercel comparison.
- A supported Chrome/Edge preview run to distinguish the embedded-browser limitation from general runtime behavior.
- Rotate credentials pasted into the conversation; update actual hosting secrets separately. Supabase public/publishable identifiers are not equivalent to its secret key or database password. No credentials belong in the repair handoff.
