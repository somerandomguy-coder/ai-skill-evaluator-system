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
          {requirement.successSignals.map((s) => (
            <li key={s} className="flex gap-2 text-foreground/85">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-rose-800">What would count against (Failure Modes)</div>
        <ul className="space-y-1.5">
          {requirement.failureModes.map((s) => (
            <li key={s} className="flex gap-2 text-foreground/85">
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

export function Rubric({ requirements }: { requirements: RequirementView[] }) {
  const groups = REQUIREMENT_CATEGORIES.map((category) => ({
    category,
    items: requirements.filter((r) => r.category === category),
  })).filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="suite-b" className="w-full">
        <TabsList className="w-full bg-surface-container-low border border-border p-1 rounded grid grid-cols-2">
          <TabsTrigger value="suite-b" className="gap-2 font-mono text-xs rounded data-[state=active]:bg-surface-container-lowest data-[state=active]:text-primary font-semibold">
            <Terminal className="size-3.5" />
            <span>Suite B: AI Prompt & Process Rubric (Barron)</span>
          </TabsTrigger>
          <TabsTrigger value="suite-a" className="gap-2 font-mono text-xs rounded data-[state=active]:bg-surface-container-lowest data-[state=active]:text-primary font-semibold">
            <ShieldCheck className="size-3.5" />
            <span>Suite A: Product 4D & Technical Requirements ({requirements.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* SUITE B: AI Usage Process Rubric (Barron Research) */}
        <TabsContent value="suite-b" className="space-y-6 pt-4">
          <div className="bg-surface-container-low border border-border p-4 rounded text-xs leading-relaxed space-y-1">
            <div className="flex items-center gap-2 font-mono font-bold text-primary uppercase text-[11px]">
              <Sparkles className="size-3.5 text-primary" />
              <span>Process-Focused AI Usage Evaluation (Zero Trust AIED)</span>
            </div>
            <p className="text-muted-foreground">
              You are evaluated on <strong>HOW you work with AI</strong> throughout the session log. Reasoning, boundaries, verification, and critical steering are scored—never grammar or fluency.
            </p>
          </div>

          <div className="space-y-4">
            {BARRON_CRITERIA.map((c) => (
              <div key={c.key} className="bg-surface-container-lowest border border-border rounded p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-2 border-b border-border">
                  <h4 className="font-bold text-primary text-sm">{c.title}</h4>
                  <span className="text-xs text-muted-foreground font-mono">{c.question}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-surface-container-low p-2.5 rounded border border-border space-y-1">
                    <span className="font-mono font-bold text-emerald-800 block text-[11px]">5 POINTS // EXCELLENCE</span>
                    <p className="text-foreground/90 leading-relaxed text-[11px]">{c.score5}</p>
                  </div>
                  <div className="bg-surface-container-low p-2.5 rounded border border-border space-y-1">
                    <span className="font-mono font-bold text-amber-800 block text-[11px]">3 POINTS // PARTIAL</span>
                    <p className="text-foreground/90 leading-relaxed text-[11px]">{c.score3}</p>
                  </div>
                  <div className="bg-surface-container-low p-2.5 rounded border border-border space-y-1">
                    <span className="font-mono font-bold text-rose-800 block text-[11px]">1 POINT // WEAK</span>
                    <p className="text-foreground/90 leading-relaxed text-[11px]">{c.score1}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 5 Audit Flags */}
          <div className="bg-surface-container-low border border-border p-4 rounded space-y-3">
            <div className="flex items-center gap-2 font-mono font-bold text-primary uppercase text-[11px]">
              <Flag className="size-3.5 text-primary" />
              <span>5 Automated Audit Flags Tracked During Build</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {AUDIT_FLAGS_EXPLAINED.map((f) => (
                <div key={f.flag} className="bg-surface-container-lowest p-2.5 rounded border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-primary">{f.flag}</span>
                    <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-surface-container border border-border text-muted-foreground">FLAG</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* SUITE A: Technical Requirements */}
        <TabsContent value="suite-a" className="space-y-6 pt-4">
          <div className="space-y-6">
            {groups.map(({ category, items }) => (
              <section key={category} aria-labelledby={`cat-${category}`} className="space-y-3">
                <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 id={`cat-${category}`}>
                    <CategoryBadge category={category} className="text-xs rounded font-mono" />
                  </h3>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
