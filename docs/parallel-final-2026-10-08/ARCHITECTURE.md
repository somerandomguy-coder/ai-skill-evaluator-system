# ProofCraft architecture

The SVG/PNG is a presentation-ready overview; the Mermaid source is editable.
Prepared before synchronizing latest GitHub code, as requested, then checked against `origin/main` at `9eb7a3c`. It shows the application's major components, not certification that every security or durability safeguard is implemented. Use `ARCHITECTURE.png` in slides; `ARCHITECTURE.svg` is scalable and `ARCHITECTURE.mmd` is editable Mermaid.

- Browser: editor, AI chat, preview, WebContainer virtual filesystem/runtime, and separate exercise SQLite tools where used.
- Next.js server: job/task generation, model orchestration, validation, session capture, assessment finalization, report and mentor workflow.
- PostgreSQL: persisted product/session/evaluation records. Browser execution does not mean candidate data never leaves the device.
- External model provider: generation, assistant and evaluation inference. The primary evaluation path inspected uses transcript, code snapshot and rubric, not screenshots.
- Human mentor: task approval and candidate assessment review are separate jobs.
- Dashed Jev component is proposed shadow-only analysis: it records a recommendation and cannot change a score, suppress a required review, or decide mentor routing.

At this baseline, task approvals and operation leases still use local JSON files; share tokens use process memory. They are not yet durable shared PostgreSQL records. Assessment mentor reviews are database records. The diagram's report step describes a workflow, not a guarantee of safe public disclosure: the employer route and shared report projection need the repairs in `SPLIT_PLAN.md`.

The supplied provider configuration is not proof of the active deployed model. Use “configured model provider” in the pitch until an execution record verifies the provider and model. Browser execution uses WebContainer and its virtual filesystem; it is not a server-side Docker container, and a running preview does not prove candidate authorship or correctness.

The drawing omits optional telemetry for readability. Existing Langfuse integration is another possible external data destination and belongs in the full privacy/data-flow inventory.

Related files: ARCHITECTURE.svg, ARCHITECTURE.png and ARCHITECTURE.mmd.
