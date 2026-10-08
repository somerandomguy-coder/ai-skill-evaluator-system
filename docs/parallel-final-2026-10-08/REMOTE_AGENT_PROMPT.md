# Copy this prompt into the agent on the other machine

```text
Implement Agent B's remaining work for ProofCraft.

Repository: https://github.com/somerandomguy-coder/ai-skill-evaluator-system
Your branch: codex/final-workspace-readiness
Integration machine's branch: codex/final-assessment-trust

Use a clean checkout/worktree. Inspect git status first and preserve any local
work. Fetch origin and check out the existing remote branch above. Do not start
from an old local main or overwrite an existing branch with reset --hard.
If the repository isn't present, clone it, then select the assigned branch.

Read AGENTS.md and relevant node_modules/next/dist/docs guides before code edits.
Read these files in order:
1. docs/parallel-final-2026-10-08/BASELINE.md
2. docs/parallel-final-2026-10-08/SPLIT_PLAN.md
3. docs/parallel-final-2026-10-08/ARCHITECTURE.md
Use docs/agent-handoff-2026-10-08/ASTRA_EXECUTOR_PACKETS.md and
ASTRA_VALIDATION_MATRIX.md only for additional acceptance detail. Main already
contains many partial fixes; inspect the actual callers before changing them.

Complete B1 through B4 from SPLIT_PLAN.md: generation quality/provenance,
consistent validation across entry points, workspace/runtime session isolation,
stream/error recovery, regression tests, and a concise technical evidence handoff.
Stay within Agent B's listed file ownership. Agent A owns authentication,
database schemas/migrations, persistence adapters, scoring, report privacy,
providers, package/lock/config files, and final merging. Do not duplicate those
systems or edit their files. Keep the frozen integration contracts compatible.
For an A-owned dependency, put the exact requested change and caller/test in
B_HANDOFF.md and continue work that is independent. No workaround that weakens
authorization, hides a failed test, or pretends an in-memory lock is durable.

Start by running the baseline with no production .env or credentials:
npm ci --ignore-scripts --no-audit --no-fund
npx prisma generate
npx next typegen
npm run typecheck
npm test
Use synthetic configuration if Prisma needs a URL; do not connect to a real DB.
Read the baseline lint result; fix errors introduced by your changes, without
mass cleanup outside your ownership. No production data, migrations, seeding,
paid AI experiments, deployment, or disclosure of credentials. Mock providers
and use synthetic fixtures. Build/browser checks that cannot run are blocked,
not passed. Preserve existing useful safeguards and assertions.

Make focused commits as each B packet is verified. Add B_HANDOFF.md and
GENERATION_AND_UX_NOTES.md under docs/parallel-final-2026-10-08/ with changed
files, regression evidence, commands/results, measured timings if available,
limitations, new metadata fields, and required A integration hooks. Distinguish
verified implementation from proposed research. Do not claim a benchmark win,
SFIA certification, mentor approval, or pricing measurement without evidence.

You are authorized to commit your implementation and push only
codex/final-workspace-readiness. Do not force-push, merge another work branch,
merge main, or deploy. This machine will handle the merge. Finish by giving me
your final pushed commit SHA, checks passed/blocked, and the handoff path.
Work through the packets autonomously; don't stop after writing another plan.
```

Clean-clone setup, if needed:

```powershell
git clone --branch codex/final-workspace-readiness git@github.com:somerandomguy-coder/ai-skill-evaluator-system.git
cd ai-skill-evaluator-system
git status --short
```

For an existing **clean** clone without a local branch of this name:

```powershell
git fetch origin
git switch --track origin/codex/final-workspace-readiness
```

If that local branch already exists, inspect it before switching/pulling. Never reset it to make the example command work.
