# Curated Benchmark Challenges & Dataset Master Plan (10 Exemplar Deep Challenges)

> **Core Philosophy**: 100 gritty, highly authentic engineering briefs with real-world invariants beat 600 generic boilerplate JDs every day of the week.
> Modeled after real industry mentors, judges, and real systems engineering problems.

---

## Progress Overview (Target: 10 Verified Exemplar Challenges)

| # | Challenge ID | Company / Entity | Domain & Core Invariant | Status |
| :-: | :--- | :--- | :--- | :-: |
| **0** | `verified-tgd-rts-sim` | **Total Game Development** | 20Hz deterministic tick loop, spatial hash grid, double-buffering | ✅ Implemented |
| **1** | `verified-aegis-lending-risk` | **Aegis Risk Analytics** | WAD/RAY fixed-point math, oracle staleness threshold, atomic liquidation rollback | ✅ Implemented |
| **2** | *(Pending Persona #2)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **3** | *(Pending Persona #3)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **4** | *(Pending Persona #4)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **5** | *(Pending Persona #5)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **6** | *(Pending Persona #6)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **7** | *(Pending Persona #7)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **8** | *(Pending Persona #8)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **9** | *(Pending Persona #9)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |
| **10** | *(Pending Persona #10)* | *Awaiting input...* | *Awaiting input...* | ⏳ Queued |

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

---

*(Slots #2 through #10 will be documented here immediately as you paste each profile/brainstorm).*
