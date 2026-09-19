import { ArrowRight, Building2, Check, ChevronDown, Crown, GraduationCap, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/common/layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing. Your first work-sample assessment is 100% free.",
};

const TIERS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "first project is free",
    description: "No credit card",
    icon: Rocket,
    popular: false,
    badge: "Free Trial",
    features: [
      "1 Full Role Assessment (No time limit)",
      "Automated JD Synthesis & 4D Brief",
      "In-Browser IDE & AI Assistant Workspace",
      "Automated 2-Tier AI Evaluation (Suite A & B)",
      "Shareable Proof of AI Skill Link",
      "Standard community queue",
    ],
    cta: "Start Free Assessment",
    href: "/",
  },
  {
    name: "Pro Candidate",
    price: "$29",
    cadence: "per month (or $19 single assessment)",
    description: "Verified proof + mentor review",
    icon: Crown,
    popular: true,
    badge: "Highly recommended",
    features: [
      "Unlimited Role Assessments",
      "Human Mentor Review (Senior engineer audit within 48h)",
      "Ability to Contest & Escalate AI Scores",
      "AI Prompt Steering Telemetry & Flaw Catch metrics",
      "Cryptographic SHA-256 Tamper-Proof Audit Receipt",
      "Executive PDF Dossier Export for Hiring Managers",
      "Priority processing queue",
    ],
    cta: "Get Started with Pro",
    href: "/login?next=/pricing",
  },
  {
    name: "Teams & Centers",
    price: "$149",
    cadence: "per month / seat",
    description: "Hiring teams & bootcamps",
    icon: Building2,
    popular: false,
    badge: "For Organizations",
    features: [
      "Custom Company Benchmark Challenges",
      "Candidate Comparison & Review Portal",
      "Dedicated Mentor Review SLA (<24 hours)",
      "Cohort Analytics & Readiness Dashboards",
      "ATS & Webhook Integrations",
      "Verified Certificate Issuance API",
    ],
    cta: "Partner With Us",
    href: "/partnerships",
  },
];

const FAQS = [
  {
    q: "Why is the first assessment completely free?",
    a: "We believe candidates and hiring teams should see the quality of our evidence-backed reports and interactive AI workspace before spending a dime. No credit card is needed to start.",
  },
  {
    q: "What does the Human Mentor Review include?",
    a: "When you upgrade or request mentor evaluation, an accredited senior engineer reviews your complete prompt transcript, code files, and architectural decisions. They confirm or override the AI scores and provide actionable growth feedback.",
  },
  {
    q: "Can I contest an automated score?",
    a: "Yes! If you believe the automated evaluator missed context in your solution, Pro users can contest any criterion with one click. It routes directly to our senior mentor review queue.",
  },
  {
    q: "How do hiring managers verify my credential?",
    a: "Every report generates a public, shareable Proof of AI Skill URL backed by a SHA-256 hash. Recruiters can inspect verbatim quotes from your session and verify the authentic timestamp.",
  },
];

export default function PricingPage() {
  return (
    <PageShell width="6xl" className="space-y-16 py-12 sm:py-16">
      <header className="relative isolate mx-auto max-w-2xl space-y-5 overflow-x-clip text-center">
        <div className="ambient -top-32 left-1/2 size-[32rem] -translate-x-1/2" aria-hidden />
        <span className="rise inline-flex items-center gap-2 rounded-full border border-signal/50 bg-signal-soft/60 px-3 py-1 text-[13px] font-semibold text-signal-ink backdrop-blur-md">
          <Sparkles className="size-3.5" aria-hidden />
          First project free
        </span>
        <h1 className="rise font-display text-4xl text-balance sm:text-6xl" style={{ ["--i" as string]: 1 }}>
          Pay only as you grow.
        </h1>
      </header>

      <div className="relative isolate grid grid-cols-1 items-stretch gap-6 overflow-x-clip py-4 md:grid-cols-3">
        <div className="ambient top-1/2 left-1/2 h-[30rem] w-[46rem] -translate-x-1/2 -translate-y-1/2" aria-hidden />
        {TIERS.map((tier, i) => {
          const Icon = tier.icon;
          const card = (
            <div
              className={cn(
                "relative flex h-full flex-col gap-6 overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-card p-6",
                tier.popular && "backdrop-blur-xl"
              )}
            >
              {tier.popular && (
                <span
                  className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[radial-gradient(closest-side,rgb(255_107_0/0.16),transparent)]"
                  aria-hidden
                />
              )}
              <div className="flex items-center justify-between gap-3">
                <span className={cn("grid size-10 place-items-center rounded-xl", tier.popular ? "bg-action text-[var(--action-ink)]" : "bg-signal-soft text-signal-ink")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {!tier.popular && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{tier.badge}</span>}
              </div>
              <div className="space-y-1">
                <h2 className="font-title text-xl">{tier.name}</h2>
                <p className="text-[13px] text-muted-foreground">{tier.description}</p>
              </div>
              <div className="flex items-baseline gap-1.5 border-t border-border pt-5">
                <span className="tabular font-display text-5xl">{tier.price}</span>
                <span className="text-xs text-muted-foreground">{tier.cadence}</span>
              </div>
              <ul className="flex-1 space-y-2.5 text-[13px]">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-signal-soft text-signal-ink">
                      <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                    </span>
                    <span className="leading-relaxed">{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={buttonVariants({
                  variant: tier.popular ? "signal" : "outline",
                  size: "xl",
                  className: "w-full",
                })}
              >
                {tier.cta}
                <ArrowRight aria-hidden />
              </Link>
            </div>
          );
          return tier.popular ? (
            // Gradient border: a 1.5px orange frame around a frosted card, lifted and glowing.
            <div
              key={tier.name}
              className="rise lift-lg relative rounded-3xl bg-[linear-gradient(160deg,#ffb066,#ff6b00_40%,#ea580c_70%,rgb(234_88_12/0.2))] p-[1.5px] shadow-[0_20px_60px_-20px_rgb(255_107_0/0.55)] md:-my-3"
              style={{ ["--i" as string]: i }}
            >
              <span className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-action px-3 py-1 text-xs font-semibold whitespace-nowrap text-[var(--action-ink)] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_4px_14px_rgb(255_107_0/0.45)]">
                <Sparkles className="size-3.5" aria-hidden />
                {tier.badge}
              </span>
              {card}
            </div>
          ) : (
            <div key={tier.name} className="rise lift-lg rounded-3xl border border-border" style={{ ["--i" as string]: i }}>
              {card}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6 sm:flex-row">
        <span className="inline-flex items-center gap-2.5 font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-signal-soft text-signal-ink">
            <GraduationCap className="size-4" aria-hidden />
          </span>
          Mentors & partnerships
        </span>
        <Link href="/partnerships" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full px-4" })}>
          Explore
          <ArrowRight aria-hidden />
        </Link>
      </div>

      <section aria-labelledby="faq" className="mx-auto max-w-3xl space-y-5">
        <h2 id="faq" className="font-title text-center text-2xl">
          FAQ
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group/faq">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                {faq.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open/faq:rotate-180" aria-hidden />
              </summary>
              <p className="slide-in px-5 pb-5 text-[13px] leading-relaxed text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
