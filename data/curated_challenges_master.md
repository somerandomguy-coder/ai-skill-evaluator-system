# Curated Benchmark Challenges & Dataset Master Plan (10 Exemplar Deep Challenges)

> **Core Philosophy**: 100 gritty, highly authentic engineering briefs with real-world invariants beat 600 generic boilerplate JDs every day of the week.
> Modeled after real industry mentors, judges, and real systems engineering problems.

---

## Progress Overview (Target: 10 Verified Exemplar Challenges)

| # | Challenge ID | Company / Entity | Domain & Core Invariant | Status |
| :-: | :--- | :--- | :--- | :-: |
| **0** | `verified-tgd-rts-sim` | **Total Game Development** | 20Hz deterministic tick loop, spatial hash grid, double-buffering | ✅ Implemented |
| **1** | `verified-aegis-lending-risk` | **Aegis Risk Analytics** | WAD/RAY fixed-point math, oracle staleness threshold, atomic liquidation rollback | ✅ Implemented |
| **2** | `verified-apex-subscription-billing` | **Apex Marketplace Infrastructure** | Idempotency guard on retries, integer cent GST math, resilient state machine & SRE metrics | ✅ Implemented |
| **3** | *(Pending Persona #4)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **4** | *(Pending Persona #5)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **5** | *(Pending Persona #6)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **6** | *(Pending Persona #7)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **7** | *(Pending Persona #8)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **8** | *(Pending Persona #9)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **9** | *(Pending Persona #10)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **10** | *(Pending Persona #11)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |

---

## Detailed Specifications

### Challenge #1: Aegis Risk Analytics — `P2PLendingRiskEngine`
- **Company**: Aegis Risk Analytics (Sydney, NSW)
- **Role**: Junior Protocol Risk & Verifiable Telemetry Engineer
- **SFIA 9 Level**: Level 2 (Assist) / Level 3 (Apply) — `PROG`, `DESN`, `TEST`
- **Target Persona**: Joseph (DeFi protocol risk, lending markets, verifiable cryptographic state)

#### Problem Statement
Aegis Risk Analytics builds real-time monitoring infrastructure and simulation engines for decentralized peer-to-peer lending markets. In volatile market conditions, naive liquidation engines fail catastrophically due to floating-point rounding errors, stale oracle prices, and partial state corruption during liquidation cascades. Candidates build the `P2PLendingRiskEngine` to compute real-time Loan Health Factors ($HF$), detect liquidation insolvency, enforce atomic batch liquidations, and compute verifiable telemetry hashes.

#### Non-Negotiable Technical Invariants
1. **Fixed-Point Arithmetic (Wad/Ray / BPS)**: All collateral ratios, debt accruals, and health factors must be calculated using 18-decimal fixed-point (`WAD = 10^18`) or integer basis points (`1 BPS = 0.01%`). Floating-point (`number`) division is strictly forbidden.
2. **Oracle Staleness & Grace-Period Guard**: Oracle feeds must be timestamp-checked. If `currentTime - updatedAt > HEARTBEAT_THRESHOLD`, the feed is stale; the engine must throw `StalePriceFeedException` and freeze liquidation execution.
3. **Atomic Liquidation Cascades**: In batch liquidations, account state mutations and protocol collateral reserves must follow transactional semantics (copy-on-write snapshot). If an intermediate liquidation fails or invalidates pool solvency, the entire batch must rollback.
4. **Verifiable Telemetry Hash Chain**: Every processed block/tick must emit a deterministic SHA-256 state commitment over all updated loan positions and reserves.

#### Injected Canary Traps (What Discerning Engineers Catch)
- **Canary Trap 1: Floating-Point Division Precision Loss**: AI completions will generate naive JavaScript arithmetic: `const healthFactor = (collateralAmount * price) / debtAmount`. Discerning candidates reject this and refactor to fixed-point integer math (`mulWad` / `divWad`).
- **Canary Trap 2: Missing Oracle Staleness Validation**: AI will consume `{ asset, price, updatedAt }` without validating elapsed time against `HEARTBEAT_THRESHOLD`. Discerning candidates enforce timestamp validation.
- **Canary Trap 3: In-Place Mutation During Cascade**: AI batch liquidations mutate array balances in-place. If borrower #3 fails, balances are corrupted. Discerning candidates enforce atomicity / snapshot rollback.

---

### Challenge #0: Total Game Development — `DeterministicUnitSimulationEngine`
- **Company**: Total Game Development (Melbourne, VIC)
- **Role**: Junior AI & Simulation Systems Developer (Web / RTS)
- **SFIA 9 Level**: Level 2 (Assist) — `PROG`, `DESN`, `TEST`

#### Problem Statement
In networked/deterministic simulations, variable frame delta times cause desynchronization across client frames. Candidates build an entity manager executing a fixed 20Hz (50ms) simulation tick, updating unit positions on a 2D grid, managing state transitions (`IDLE`, `MOVING`, `ATTACKING`), and decoupling state updates from rendering.

#### Non-Negotiable Technical Invariants
1. **Fixed 20Hz Tick Rate (50ms)**: Inside a fixed-step accumulator (`accumulator += dt; while (accumulator >= 50ms)`).
2. **Spatial Partitioning Grid**: Proximity and range queries must not use $O(N^2)$ all-pairs comparisons; must use a spatial hash grid.
3. **Double-Buffering & State Isolation**: In-loop coordinate mutations forbidden; state updates are double-buffered.
4. **Decoupled Rendering**: Animation loop (`requestAnimationFrame`) interpolates from the latest tick snapshot.

### Challenge #2: Apex Marketplace Infrastructure — `SubscriptionWebhookReconciler`
- **Company**: Apex Marketplace Infrastructure (Sydney, NSW)
- **Role**: Junior Full-Stack Integration & Billing Engineer
- **SFIA 9 Level**: Level 2 (Assist) / Level 3 (Apply) — `PROG`, `DESN`, `TEST`
- **Target Persona**: David Nguyen (Marketplace platforms, subscription billing systems, cloud-native reliability, SRE)

#### Problem Statement
Apex Marketplace Infrastructure powers core listing monetization, subscription billing, and merchant reconciliation for high-volume Australian digital marketplace platforms. In high-concurrency distributed systems, payment gateways retry failed or delayed webhooks, often delivering payloads out-of-order or multiple times. Candidates build the `SubscriptionWebhookReconciler` and an interactive status dashboard to ingest external payment webhook events (`SUBSCRIPTION_CREATED`, `PAYMENT_PROCESSED`, `PAYMENT_FAILED`, `PLAN_UPGRADED`), enforce strict idempotency, calculate GST and prorations in exact integer cents, manage subscription state transitions, and emit SRE observability telemetry.

#### Non-Negotiable Technical Invariants
1. **Idempotency Guard & Deduplication**: Webhook event processing must check `eventId` / `idempotency_key` within a persistent or transactionally safe store before executing state transitions or billing deductions. Re-delivered webhooks must return the cached processing receipt without re-billing or re-extending plan durations.
2. **Integer Cent Financial Arithmetic & 10% Australian GST**: All monetary calculations, upgrade proration deltas, and 10% Australian GST must be computed in integer cents (`Math.round()` on cents). Raw IEEE-754 floating-point operations (e.g., `price * 0.1`) that produce floating precision drift are strictly forbidden.
3. **Resilient State Machine Transitions**: Enforces valid lifecycle transitions: `PENDING` $\rightarrow$ `ACTIVE` $\rightarrow$ `PAST_DUE` $\rightarrow$ `CANCELLED`. Out-of-order events (e.g. `PAYMENT_PROCESSED` arriving before `SUBSCRIPTION_CREATED`) must be handled gracefully without corrupting account balances.
4. **SRE Observability & Telemetry**: Differentiates transient errors (returning HTTP `500` to trigger gateway retry) from deterministic payload validation errors (`400`). Instruments structured logging with correlation IDs and emits real-time SLI/SLO metrics (`successRatePercent`, `duplicateDropCount`, `p95LatencyMs`).
5. **Interactive Operational Dashboard**: An interactive visual interface in React displaying the live incoming event stream, subscription status badges, and SRE metric gauges for real-time evaluator inspection.

#### Injected Canary Traps (What Discerning Engineers Catch)
- **Canary Trap 1: Non-Idempotent Webhook Processing (Double-Billing on Retries)**: AI implementations process webhook payloads immediately without checking an `idempotency_key` or `eventId`. When network retries fire, the AI logic increments billing counters or extends plan durations twice. Discerning candidates catch this and enforce an Idempotency Guard.
- **Canary Trap 2: Floating-Point Math on Proration & Australian GST**: AI calculates proration and 10% GST with raw JavaScript floating-point numbers (`price * 0.1`), causing precision drift (e.g., `$19.990000000000002`). Discerning candidates enforce integer cent arithmetic.
- **Canary Trap 3: Silent Failure & Missing SRE Observability (Swallowed Exceptions)**: AI wraps webhook ingestion in a generic `try/catch` block that logs a vague `console.error` and returns HTTP `200 OK`, hiding transient database deadlocks from gateway retries and telemetry pipelines. Discerning candidates refactor error handling to return `500` on transient errors and emit correlation IDs.

---

*(Slots #3 through #10 will be documented here immediately as you paste each profile/brainstorm).*
