import { Check, ArrowRight, Sparkles, UserCheck, HelpCircle } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Pricing — ProofCraft",
  description: "Simple, transparent pricing. Your first work-sample assessment is 100% free.",
};

const TIERS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "first project is free",
    description: "Experience the full assessment workflow. No credit card required.",
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
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro Candidate",
    price: "$29",
    cadence: "per month (or $19 single assessment)",
    description: "For active job seekers who want verified proof and senior human mentor feedback.",
    popular: true,
    badge: "Most Popular",
    features: [
      "Unlimited Role Assessments",
      "Human Mentor Review (Senior engineer audit within 48h)",
      "Ability to Contest & Escalate AI Scores",
      "Barron AI Prompt Telemetry & Flaw Catch metrics",
      "Cryptographic SHA-256 Tamper-Proof Audit Receipt",
      "Executive PDF Dossier Export for Hiring Managers",
      "Priority processing queue",
    ],
    cta: "Get Started with Pro",
    href: "/login?next=/pricing",
    ctaVariant: "default" as const,
  },
  {
    name: "Teams & Centers",
    price: "$149",
    cadence: "per month / seat",
    description: "For engineering hiring teams, mentorship programs, and coding bootcamps.",
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
    ctaVariant: "outline" as const,
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
    <PageShell width="6xl" className="space-y-16 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <span className="font-mono text-xs uppercase px-2.5 py-0.5 bg-surface-container-low text-primary rounded font-semibold tracking-wider border border-border inline-flex items-center gap-2">
          <Sparkles className="size-3 text-emerald-600" />
          Transparent Pricing
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-primary">
          First project is free. Pay only as you grow.
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Test your real engineering and AI co-pilot skills with zero risk. Upgrade when you need senior mentor evaluations and verified credentials.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={`flex flex-col justify-between border rounded relative ${
              tier.popular
                ? "border-primary bg-surface-container-lowest shadow-sm ring-1 ring-primary"
                : "border-border bg-surface-container-lowest"
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-white font-mono text-[11px] px-3 py-0.5 rounded uppercase tracking-wider">
                  {tier.badge}
                </Badge>
              </div>
            )}

            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-primary">{tier.name}</CardTitle>
                {!tier.popular && (
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border">
                    {tier.badge}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                {tier.description}
              </CardDescription>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-primary">{tier.price}</span>
                  <span className="text-xs text-muted-foreground font-mono">/ {tier.cadence}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-2 flex-1">
              <ul className="space-y-2.5 text-xs text-foreground/90">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{feat}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="p-6 pt-2">
              <Link
                href={tier.href}
                className={buttonVariants({
                  variant: tier.ctaVariant,
                  className: "w-full rounded font-semibold text-xs py-5 gap-2",
                })}
              >
                <span>{tier.cta}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Feature Highlights Banner */}
      <div className="bg-surface-container-low border border-border rounded p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-bold text-base">
            <UserCheck className="size-5 text-emerald-600" />
            <span>Looking for Human Mentorship or Career Review?</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Our accredited network of senior engineers from Atlassian, Canva, and Culture Amp reviews candidate sessions to provide deep feedback and verify credentials.
          </p>
        </div>
        <Link
          href="/partnerships"
          className={buttonVariants({ variant: "outline", className: "rounded shrink-0 text-xs font-mono border-border" })}
        >
          Learn About Mentors & Partnerships →
        </Link>
      </div>

      {/* FAQs */}
      <div className="space-y-8 max-w-3xl mx-auto pt-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-primary">Frequently Asked Questions</h2>
          <p className="text-xs text-muted-foreground">Everything you need to know about ProofCraft billing and plans.</p>
        </div>
        <div className="grid gap-4">
          {FAQS.map((faq) => (
            <Card key={faq.q} className="border border-border bg-surface-container-lowest rounded p-5">
              <h3 className="font-semibold text-primary text-sm flex items-center gap-2">
                <HelpCircle className="size-4 text-secondary shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed pl-6">{faq.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
