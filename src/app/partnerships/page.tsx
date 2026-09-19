"use client";

import { useState } from "react";
import { ArrowRight, Building2, Check, CheckCircle2, GraduationCap, Mail, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PageShell } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PARTNERSHIP_TRACKS = [
  {
    icon: Users,
    title: "Mentorship networks",
    tag: "Earn per review",
    span: "lg:col-span-3",
    benefits: ["$35–$75 per certified review", "See prompt-by-prompt reasoning", "Confirm or override AI scores", "Paid on your own hours"],
  },
  {
    icon: GraduationCap,
    title: "Bootcamps & career centers",
    tag: "For educators",
    span: "lg:col-span-3",
    benefits: ["Real work samples, not LeetCode", "Measure AI co-pilot discipline", "Cohort readiness tracking", "Verifiable graduate credentials"],
  },
  {
    icon: Building2,
    title: "Hiring teams",
    tag: "For employers",
    span: "lg:col-span-6",
    benefits: ["Job ads become 2–4 hour challenges", "No take-home fraud", "Blind, output-only evaluation", "Human review SLA"],
  },
];

const FIELD = "rounded-xl text-[13px]";

export default function PartnershipsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    track: "mentorship",
    message: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <PageShell width="6xl" className="space-y-16 py-12 sm:py-16">
      <header className="relative isolate mx-auto max-w-2xl space-y-5 overflow-x-clip text-center">
        <div className="ambient -top-32 left-1/2 size-[32rem] -translate-x-1/2" aria-hidden />
        <span className="rise inline-flex items-center gap-2 rounded-full border border-signal/50 bg-signal-soft/60 px-3 py-1 text-[13px] font-semibold text-signal-ink backdrop-blur-md">
          <Sparkles className="size-3.5" aria-hidden />
          Partner network
        </span>
        <h1 className="rise font-display text-4xl text-balance sm:text-6xl" style={{ ["--i" as string]: 1 }}>
          Partner with codecraft.
        </h1>
      </header>

      {/* Bento tracks */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-6">
        {PARTNERSHIP_TRACKS.map((track, i) => {
          const Icon = track.icon;
          const wide = track.span === "lg:col-span-6";
          return (
            <section
              key={track.title}
              style={{ ["--i" as string]: i }}
              className={cn(
                "rise lift-lg rounded-3xl border border-border bg-card p-6 transition-[border-color,box-shadow,transform] duration-300 hover:border-signal/50 hover:shadow-[0_0_25px_rgb(255_107_0/0.2)]",
                track.span
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-signal-soft text-signal">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="rounded-full border border-signal/40 bg-signal-soft/70 px-2.5 py-1 text-xs font-semibold text-signal-ink shadow-[0_0_14px_rgb(255_107_0/0.2)]">
                  {track.tag}
                </span>
              </div>
              <h2 className="font-title mt-4 text-xl">{track.title}</h2>
              <ul className={cn("mt-4 grid gap-2.5 text-[13px]", wide && "sm:grid-cols-2")}>
                {track.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-signal-soft text-signal-ink">
                      <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                    </span>
                    <span className="leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* CTA banner: orange hairline frame, ambient light, embossed action. */}
      <div className="relative isolate mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-signal/30 bg-card p-6 shadow-[0_20px_60px_-30px_rgb(255_107_0/0.5)] sm:p-8">
        <div className="ambient -top-40 -right-24 size-[26rem]" aria-hidden />
        <div className="ambient -bottom-40 -left-24 size-[22rem] [animation-delay:-4s]" aria-hidden />

        {submitted ? (
          <div className="slide-in space-y-4 py-10 text-center">
            <span className="pop-in mx-auto grid size-12 place-items-center rounded-2xl bg-ok-soft text-ok">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <h2 className="font-title text-xl">Inquiry received</h2>
            <p className="text-[13px] text-muted-foreground">
              We&apos;ll reply to <strong className="text-foreground">{formData.email || "your email"}</strong> within one business day.
            </p>
            <Button variant="outline" size="lg" onClick={() => setSubmitted(false)} className="rounded-full px-4">
              Send another
            </Button>
          </div>
        ) : (
          <>
            <h2 className="font-title flex items-center gap-2.5 text-xl">
              <span className="grid size-9 place-items-center rounded-xl bg-signal-soft text-signal">
                <Mail className="size-4" aria-hidden />
              </span>
              Contact the partner team
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-[13px]">
                    Name
                  </Label>
                  <Input
                    id="name"
                    required
                    placeholder="Alex Rivera"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={FIELD}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[13px]">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={FIELD}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="org" className="text-[13px]">
                    Organization
                  </Label>
                  <Input
                    id="org"
                    placeholder="MentorMe, bootcamp, independent"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className={FIELD}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="track" className="text-[13px]">
                    Partnership type
                  </Label>
                  <select
                    id="track"
                    value={formData.track}
                    onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                    className="h-9 w-full rounded-xl border border-input bg-transparent px-3 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="mentorship">Mentorship platform</option>
                    <option value="bootcamp">Bootcamp / training</option>
                    <option value="individual">Senior mentor</option>
                    <option value="hiring">Hiring partner</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-[13px]">
                  What do you have in mind?
                </Label>
                <Textarea
                  id="message"
                  required
                  rows={4}
                  placeholder="Your community, cohort size, or mentoring availability"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className={FIELD}
                />
              </div>

              <Button type="submit" variant="signal" size="xl" className="w-full">
                Contact partner team
                <ArrowRight aria-hidden />
              </Button>
            </form>
          </>
        )}
      </div>

      <p className="flex flex-wrap items-center justify-center gap-2 border-t border-border pt-8 text-[13px] text-muted-foreground">
        <ShieldCheck className="size-4 text-ok" aria-hidden />
        Accredited senior engineers, Australia and global
      </p>
    </PageShell>
  );
}
