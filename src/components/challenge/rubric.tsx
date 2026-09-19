import { Check, ChevronRight, X, Sparkles, Terminal, ShieldCheck, Flag, CheckCircle2 } from "lucide-react";
import { CategoryBadge, CATEGORY_STYLE, WeightPips } from "@/components/common/category";
import { CATEGORY_META, REQUIREMENT_CATEGORIES } from "@/lib/ai/schemas";
import type { RequirementView } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BARRON_CRITERIA = [
  {
    key: "scope_boundary",
    title: "1. Scope Boundary",
    question: "Does the candidate define WHAT the solution should and should not do?",
    score5: "Before building, states what V1 WILL and WILL NOT do (in-scope / out-of-scope). When AI suggests extra features, classifies them and keeps V1 small.",
    score3: "States only part of the boundary, or defines it only after drifting. Accepts some AI-suggested extras without giving a reason.",
    score1: "No boundary stated. Lets the AI decide the scope, or keeps adding features (scope creep).",
  },
  {
    key: "decomposition",
    title: "2. Decomposition",
    question: "Does the candidate break the work into steps before and while building?",
    score5: "States a plan or steps early; tackles one part at a time; adjusts the plan when something fails.",
    score3: "Some structure, but jumps between parts or plans only after problems appear.",
    score1: "Asks AI to 'build everything' in one prompt; no visible plan.",
  },
  {
    key: "prompt_quality",
    title: "3. Prompt Quality",
    question: "Are prompts clear, specific, and context-rich?",
    score5: "Prompts provide goal, constraints, data format, expected output, are scoped to one task, and follow-ups build on previous answers.",
    score3: "Prompts are understandable but often vague or missing constraints, leading to rework.",
    score1: "Prompts are vague ('fix it', 'make it better') or copy the whole brief with no direction.",
  },
  {
    key: "verification",
    title: "4. Verification (Zero Trust)",
    question: "Does the candidate check AI output instead of trusting it?",
    score5: "Tests or questions AI output, spots errors, asks AI to explain logic, and catches the planted flaw.",
    score3: "Checks some outputs; misses others; may catch the flaw late or partially.",
    score1: "Accepts AI output without checking; planted flaw is missed.",
  },
  {
    key: "stack_decision",
    title: "5. Stack Decision",
    question: "Does the candidate compare technical options and choose one with reasons?",
    score5: "Considers at least 2 realistic options, compares criteria linked to brief, asks about trade-offs, and checks AI claims about the stack.",
    score3: "Considers options, but reasoning is vague ('AI said so') or accepts recommendation with only light questioning.",
    score1: "Uses whatever AI picks with no discussion, gives no reason, or stack contradicts constraints.",
  },
];

const AUDIT_FLAGS_EXPLAINED = [
  { flag: "flaw_caught", label: "Planted Flaw Identified", desc: "Candidate caught the deliberately planted edge-case defect in AI output." },
  { flag: "privacy_breach", label: "Zero Leakage Guard", desc: "Candidate avoided pasting confidential or sensitive mock data into the chat." },
  { flag: "scope_creep_resisted", label: "Scope Creep Resisted", desc: "Candidate declined or parked extraneous AI-suggested feature proposals." },
  { flag: "injection_attempt", label: "Evaluator Integrity", desc: "Log contains no manipulative prompt injections aimed at scoring systems." },
  { flag: "out_of_scope", label: "Alignment Guard", desc: "Work remains strictly faithful to the stated challenge mandate." },
];

export function SignalLists({ requirement, className }: { requirement: Pick<RequirementView, "successSignals" | "failureModes">; className?: string }) {
  return (
    <div className={cn("grid gap-4 text-xs sm:grid-cols-2", className)}>
      <div>
        <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-800">What we look for (Success Signals)</div>
        <ul className="space-y-1.5">
          {requirement.successSignals.map((s, idx) => (
            <li key={`${s}-${idx}`} className="flex gap-2 text-foreground/85">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-rose-800">What would count against (Failure Modes)</div>
        <ul className="space-y-1.5">
          {requirement.failureModes.map((s, idx) => (
            <li key={`${s}-${idx}`} className="flex gap-2 text-foreground/85">
              <X className="mt-0.5 size-3.5 shrink-0 text-rose-600" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function RubricDetails({ requirement, label = "Inspect success signals & failure modes", className }: { requirement: RequirementView; label?: string; className?: string }) {
  return (
    <details className={cn("group", className)}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 font-mono text-xs font-semibold text-primary hover:underline [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
        {label}
      </summary>
      <SignalLists requirement={requirement} className="mt-3 rounded border border-border bg-surface-container-low p-3" />
    </details>
  );
}

export function RubricItem({ requirement }: { requirement: RequirementView }) {
  return (
    <div className={cn("rounded border border-l-4 bg-card p-4 border-border", CATEGORY_STYLE[requirement.category].accent)}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium leading-relaxed text-foreground">{requirement.statement}</p>
        <WeightPips weight={requirement.weight} />
      </div>
      <RubricDetails requirement={requirement} className="mt-2.5" />
    </div>
  );
}

const FOUR_D_FRAMEWORK = [
  {
    phase: "Define",
    title: "1. Scope & Boundaries",
    desc: "Clarifying ambiguities, defining non-goals, and resisting scope creep before writing code.",
    warning: "Define skipped: jumping straight to build without boundary agreement.",
    icon: "01",
  },
  {
    phase: "Design",
    title: "2. Technical Architecture",
    desc: "Designing decoupled data structures, pure functions, and contracts prior to code generation.",
    warning: "Design skipped: monolithic prompt with tangled UI and business logic.",
    icon: "02",
  },
  {
    phase: "Develop",
    title: "3. Disciplined Build",
    desc: "Writing clean, maintainable logic; catching planted AI defects and avoiding code bloat.",
    warning: "Develop bloated: accepting unverified AI scope and rubber-stamping flawed code.",
    icon: "03",
  },
  {
    phase: "Demonstrate",
    title: "4. Evidence & Testing",
    desc: "Proving correctness with unit evidence gates, stress tests, and transparent trade-offs.",
    warning: "Demonstrate unclear: fake completeness with surface polish and broken edge cases.",
    icon: "04",
  },
];

export function Rubric({ requirements, compact = false }: { requirements: RequirementView[]; compact?: boolean }) {
  const groups = REQUIREMENT_CATEGORIES.map((category) => ({
    category,
    items: requirements.filter((r) => r.category === category),
  })).filter((g) => g.items.length);

  return (
    <div className="space-y-8 min-w-0">
      {/* 4D Assessment Framework Card */}
      <div className="bg-surface-container-low border border-border p-4 sm:p-5 rounded space-y-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2 font-mono font-bold text-primary uppercase text-xs">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span>Product Assessment Framework (4D Engineering Lifecycle)</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Comprehensive Work-Sample Evaluation</span>
        </div>

        <div className="p-3 bg-surface-container-lowest rounded border border-border flex items-start gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
          <div className="space-y-0.5 text-xs min-w-0">
            <span className="font-mono text-[10px] uppercase font-bold text-primary block">
              EVALUATION THESIS: &ldquo;A POLISHED APP CAN STILL BE THE WRONG APP&rdquo;
            </span>
            <p className="text-muted-foreground text-[11px] leading-relaxed break-words">
              We assess whether you skip Define &amp; Design, jump straight to Build, trust AI assumptions, or create fake completeness with no evidence gate.
            </p>
          </div>
        </div>

        <div className={cn("grid gap-3 pt-1", compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4")}>
          {FOUR_D_FRAMEWORK.map((f) => (
            <div key={f.phase} className="bg-surface-container-lowest p-3 rounded border border-border space-y-2 flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    {f.phase}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground font-semibold">{f.icon}</span>
                </div>
                <h4 className="font-semibold text-primary text-xs leading-snug break-words">{f.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed break-words">{f.desc}</p>
              </div>
              <div className="pt-2 border-t border-border/60 text-[10px] text-amber-700 font-mono leading-tight break-words">
                ⚠ {f.warning}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Technical Requirements Bank */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-bold text-primary text-base">
            Technical Requirements Bank ({requirements.length})
          </h3>
          <span className="font-mono text-xs text-muted-foreground">Visible scoring criteria</span>
        </div>

        <div className="space-y-6">
          {groups.map(({ category, items }) => (
            <section key={category} aria-labelledby={`cat-${category}`} className="space-y-3">
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h4 id={`cat-${category}`}>
                  <CategoryBadge category={category} className="text-xs rounded font-mono" />
                </h4>
                <span className="text-xs text-muted-foreground">{CATEGORY_META[category].question}</span>
              </header>
              <div className="space-y-2.5">
                {items.map((r) => (
                  <RubricItem key={r.id} requirement={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Passive AI Observation Note */}
      <div className="bg-surface-container-low border border-border p-4 rounded text-xs flex items-start gap-3 text-muted-foreground">
        <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-primary">How Your AI Collaboration is Evaluated</p>
          <p className="leading-relaxed">
            You do not need to follow any artificial prompting formulas or memorized scripts. Work naturally with the in-browser AI co-pilot as you would on a real engineering team. Your problem-solving process, verification checks, and architectural reasoning are observed passively throughout the session log.
          </p>
        </div>
      </div>
    </div>
  );
}
