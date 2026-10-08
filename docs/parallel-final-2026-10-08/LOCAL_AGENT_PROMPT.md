# Agent A — continue on this machine

```text
Implement Agent A's work from docs/parallel-final-2026-10-08/SPLIT_PLAN.md.
Branch: codex/final-assessment-trust.
Prepared clean worktree on this machine:
C:/Users/Nam/.codex/worktrees/research-implementation-plan/ai-skill-evaluator-system

The original Projects/Deploying/SWE checkout is dirty and must stay intact.
Confirm this worktree's branch/status before editing. Read AGENTS.md, relevant
installed Next guides, BASELINE.md, SPLIT_PLAN.md and ARCHITECTURE.md. The original
research ASTRA documents provide acceptance detail, not a current completion claim.

Implement A0 through A4 in order: durable schema/state and migrations for a
disposable DB, verified identity, report/share privacy, frozen evidence and
operation idempotency, then one truthful persisted assessment/mentor decision.
Retain working improvements from main 9eb7a3c. Tests passing on that baseline
did not prove auth, safe public serialization, cross-instance durability, or
actual caller integration. Add the missing service/route integration tests.

Agent B works concurrently on codex/final-workspace-readiness. Observe exact
file ownership and frozen interfaces in SPLIT_PLAN.md; do not edit B-owned
files until B freezes its final SHA. Implement new production storage adapters
separately, then wire async resolver lookups and durable generation operations
after the merge. Do not ship the temporary file/Map adapters as production.

After the release blockers, evaluate A5: feature-flagged Jev shadow only, using
a verified service contract, and honest cost/provenance notes for Wendy. Jev
cannot alter scores, publish a result or suppress required mentor review.
If live Jev configuration/documentation is unavailable, report that dependency
and leave the flag off; do not invent a service or spend credits testing it.

Use synthetic fixtures/mocked AI and disposable databases only. No production
seeding/migration, paid experiments, credential copying or deployment. Keep
unknown costs and research claims explicitly unknown. For validation, generate
Prisma and Next route types before typecheck; use the baseline test and lint
results to distinguish old failures from regressions.

Commit/push focused changes on this branch. When B returns its final SHA,
review its diff/handoff, merge on this machine, and perform the deferred
integrations and complete integrated validation checklist. Do not merge into
main or deploy without a separate instruction. Keep the original dirty tree
out of integration; selectively port any useful local fix only after comparing
it with the current branch and writing a regression test.

Deliver ASSESSMENT_AND_COST_NOTES.md and INTEGRATION_REPORT.md in the same docs
folder, including tested commit, migration/preflight/rollback notes, actual test
and browser results, unresolved risks and the exact production steps still
requiring an operator. Do not stop at a new implementation plan.
```

Short continuation message for this chat:

> Start Agent A from `docs/parallel-final-2026-10-08/LOCAL_AGENT_PROMPT.md` in the prepared worktree. The other machine is doing Agent B. Preserve the ownership boundary and integrate its final branch here when I provide its SHA.
