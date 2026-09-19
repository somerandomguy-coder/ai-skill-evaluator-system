"use client";

import { useState } from "react";
import { Users, GraduationCap, Building2, CheckCircle2, ArrowRight, ShieldCheck, Mail, Sparkles } from "lucide-react";
import { PageShell } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PARTNERSHIP_TRACKS = [
  {
    icon: Users,
    title: "Mentorship Networks & Platforms",
    audience: "For platforms like MentorMe, ADPList, and independent senior mentors",
    benefits: [
      "Monetize mentorship hours: earn $35–$75 per certified candidate review",
      "Inspect full authentic work: prompt-by-prompt reasoning and live code commits",
      "Confirm or override automated AI scores with personalized mentorship feedback",
      "Help ambitious developers bridge the gap into top-tier AI engineering roles",
    ],
  },
  {
    icon: GraduationCap,
    title: "Bootcamps & Career Centers",
    audience: "For universities, coding academies, and vocational programs",
    benefits: [
      "Replace artificial LeetCode exams with real-world work-sample assessments",
      "Measure authentic AI co-pilot proficiency and prompt engineering discipline",
      "Track cohort readiness across systems engineering (Suite A) and AI governance (Suite B)",
      "Issue cryptographic, employer-verifiable Proof of AI Skill credentials upon graduation",
    ],
  },
  {
    icon: Building2,
    title: "Hiring Partners & Engineering Teams",
    audience: "For engineering leaders, CTOs, and technical talent acquisition",
    benefits: [
      "Turn your open job descriptions into pre-calibrated, 2–4 hour coding challenges",
      "Eliminate take-home fraud: observe candidates' real-time thought process and model interaction",
      "Blind evaluation: candidates are judged purely on demonstrated output, not pedigree or proxy metrics",
      "Guaranteed human review SLA with dedicated senior mentor coverage",
    ],
  },
];

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
    <PageShell width="6xl" className="space-y-16 py-12">
      {/* Editorial Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <span className="font-mono text-xs uppercase px-2.5 py-0.5 bg-surface-container-low text-primary rounded font-semibold tracking-wider border border-border inline-flex items-center gap-2">
          <Sparkles className="size-3 text-emerald-600" />
          Ecosystem & Mentorship
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-primary">
          Partner with ProofCraft
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Join our network of mentorship platforms, educational institutions, and hiring teams building the future of authentic AI work-sample evaluation.
        </p>
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PARTNERSHIP_TRACKS.map((track) => {
          const Icon = track.icon;
          return (
            <Card key={track.title} className="border border-border bg-surface-container-lowest rounded flex flex-col justify-between">
              <CardHeader className="p-6 pb-4">
                <div className="size-10 rounded bg-surface-container border border-border flex items-center justify-center text-primary mb-3">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-lg font-bold text-primary">{track.title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  {track.audience}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <ul className="space-y-2.5 text-xs text-foreground/90">
                  {track.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Application / Inquiry Form */}
      <div className="max-w-2xl mx-auto w-full">
        <Card className="border border-border bg-surface-container-lowest rounded overflow-hidden">
          <CardHeader className="bg-surface-container-low/50 border-b border-border p-6">
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Mail className="size-5 text-secondary" />
              <span>Get in Touch with Our Partner Team</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Whether you are an established mentorship community (like MentorMe), an academy, or an experienced engineer wanting to mentor, tell us about your goals.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="size-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-primary">Inquiry Received!</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out, <strong>{formData.name || "Partner"}</strong>. Our partnership lead will contact you at <strong>{formData.email || "your email"}</strong> within 1 business day.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSubmitted(false)}
                  className="rounded text-xs font-mono border-border"
                >
                  Send another inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-mono text-primary">Your Name</Label>
                    <Input
                      id="name"
                      required
                      placeholder="e.g. Alex Rivera"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="text-xs rounded font-mono border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-mono text-primary">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="text-xs rounded font-mono border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="org" className="text-xs font-mono text-primary">Organization / Platform</Label>
                    <Input
                      id="org"
                      placeholder="e.g. MentorMe, Bootcamp, or Independent"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="text-xs rounded font-mono border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="track" className="text-xs font-mono text-primary">Partnership Type</Label>
                    <select
                      id="track"
                      value={formData.track}
                      onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                      className="w-full h-9 px-3 rounded text-xs font-mono border border-border bg-surface-container-lowest text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="mentorship">Mentorship Platform / Community</option>
                      <option value="bootcamp">Bootcamp / Training Center</option>
                      <option value="individual">Senior Engineering Mentor</option>
                      <option value="hiring">Hiring Partner / Employer</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-xs font-mono text-primary">How would you like to collaborate?</Label>
                  <Textarea
                    id="message"
                    required
                    rows={4}
                    placeholder="Tell us about your community, student cohort, or mentorship availability..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="text-xs rounded font-mono border-border"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded bg-primary text-white hover:bg-primary/90 font-semibold text-xs py-5 gap-2"
                >
                  <span>Submit Partnership Inquiry</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trust Quote */}
      <div className="text-center space-y-2 border-t border-border pt-8 text-xs text-muted-foreground font-mono">
        <div className="flex items-center justify-center gap-2 text-primary font-semibold">
          <ShieldCheck className="size-4 text-emerald-600" />
          <span>Accredited Senior Engineers from Australia & Global Tech Hubs</span>
        </div>
        <p>ProofCraft bridges practical AI co-pilot craftsmanship with rigorous, human-attested standards.</p>
      </div>
    </PageShell>
  );
}
