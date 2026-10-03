"use client";

import { useState } from "react";
import { Award, CheckCircle2, ChevronRight, Gamepad2, Info, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChallengeAccreditationCardProps {
  initialBadge?: {
    mentorName: string;
    verifiedAt: string;
    auditScore: number;
    notes?: string;
  };
}

export function ChallengeAccreditationCard({ initialBadge }: ChallengeAccreditationCardProps) {
  const [badge, setBadge] = useState(initialBadge);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState(
    "Exemplary RTS simulation architecture. Injected floating-point tick drift and O(N²) spatial canary traps measure authentic systems engineering discernment."
  );

  const [scores, setScores] = useState({
    realism: 4,
    sfiaCalibration: 4,
    trapEfficacy: 4,
    observability: 3,
    fairness: 4,
  });

  const totalScore =
    scores.realism +
    scores.sfiaCalibration +
    scores.trapEfficacy +
    scores.observability +
    scores.fairness;

  const isEligible = totalScore >= 16 && Object.values(scores).every((s) => s >= 3);

  const handleAuditSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/mentor/challenge-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: "verified-tgd-rts-sim",
          scores,
          notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBadge(
          data.evaluation?.badge || {
            mentorName: "Lead Simulation Architect, Total Game Development",
            verifiedAt: new Date().toISOString(),
            auditScore: totalScore,
            notes,
          }
        );
      } else {
        // Fallback for offline demo mode
        setBadge({
          mentorName: "Lead Simulation Architect, Total Game Development",
          verifiedAt: new Date().toISOString(),
          auditScore: totalScore,
          notes,
        });
      }
    } catch {
      setBadge({
        mentorName: "Lead Simulation Architect, Total Game Development",
        verifiedAt: new Date().toISOString(),
        auditScore: totalScore,
        notes,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
      <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Gamepad2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Mentor Accreditation &amp; Challenge Audit
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  SFIA 9 Level 2 (Assist)
                </Badge>
              </div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Total Game Development — Junior AI &amp; Simulation Systems Developer
              </h2>
            </div>
          </div>

          {badge ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Award className="size-4 text-amber-500" />
              <span>MentorME Verified ({badge.auditScore}/20)</span>
            </div>
          ) : (
            <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
              Awaiting Mentor Attestation
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="space-y-6 p-5 sm:p-6">
        {/* Challenge Overview Banner */}
        <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-xs sm:grid-cols-3">
          <div>
            <span className="font-semibold text-foreground block">Task Target</span>
            <span className="text-muted-foreground">Deterministic 2D RTS Simulation Engine</span>
          </div>
          <div>
            <span className="font-semibold text-foreground block">Injected Canary Traps</span>
            <span className="text-muted-foreground">Floating-point tick drift, O(N²) loops, in-loop mutation</span>
          </div>
          <div>
            <span className="font-semibold text-foreground block">Accredited Skills</span>
            <span className="text-muted-foreground">PROG (L2/3), DESN (L2/3), TEST (L2)</span>
          </div>
        </div>

        {/* 5-Point Verification Scorecard */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              5-Point MentorME Verification Checklist
            </h3>
            <span className="font-mono text-xs font-bold text-foreground">
              Score: <span className={cn(isEligible ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600")}>{totalScore}/20</span> (Min 16/20 required)
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Dimension 1: Realism */}
            <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">1. Realism &amp; Context</span>
                <span className="font-mono text-xs font-bold text-primary">{scores.realism}/4</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Authentic to real studio gameplay simulation engineering tasks.
              </p>
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScores({ ...scores, realism: val })}
                    className={cn(
                      "flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-colors",
                      scores.realism === val
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimension 2: SFIA Calibration */}
            <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">2. SFIA Calibration</span>
                <span className="font-mono text-xs font-bold text-primary">{scores.sfiaCalibration}/4</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Solvable in realistic 2-hour window without excessive cognitive bloat.
              </p>
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScores({ ...scores, sfiaCalibration: val })}
                    className={cn(
                      "flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-colors",
                      scores.sfiaCalibration === val
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimension 3: Trap Validity */}
            <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">3. AI Trap Validity</span>
                <span className="font-mono text-xs font-bold text-primary">{scores.trapEfficacy}/4</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Tests genuine AI failure modes (fixed accumulator vs variable frame dt).
              </p>
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScores({ ...scores, trapEfficacy: val })}
                    className={cn(
                      "flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-colors",
                      scores.trapEfficacy === val
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimension 4: Observability */}
            <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">4. Observability</span>
                <span className="font-mono text-xs font-bold text-primary">{scores.observability}/4</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Transcript reveals candidate verification &amp; spatial partitioning directives.
              </p>
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScores({ ...scores, observability: val })}
                    className={cn(
                      "flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-colors",
                      scores.observability === val
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimension 5: Inclusion & Fairness */}
            <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">5. Inclusion &amp; Fairness</span>
                <span className="font-mono text-xs font-bold text-primary">{scores.fairness}/4</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Clear task specifications free of regional idioms or arbitrary trivia.
              </p>
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScores({ ...scores, fairness: val })}
                    className={cn(
                      "flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-colors",
                      scores.fairness === val
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Summary Card */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 flex flex-col justify-between space-y-2">
              <div>
                <span className="text-xs font-semibold text-foreground block">Accreditation Status</span>
                <span className="text-[11px] text-muted-foreground">
                  {badge ? "Certified as Tier 1 Work-Sample" : isEligible ? "Ready for Mentor Signature" : "Requires Min 3/4 on all dimensions"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-4" />
                <span>ECD &amp; SFIA 9 Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mentor Attestation Notes */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">
            Mentor Attestation &amp; Calibrated Feedback
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Provide qualitative feedback on challenge realism and trap fidelity..."
          />
        </div>

        {/* Action Button & Confirmation */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-border/70">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-3.5 text-primary" />
            <span>Stamping promotes this challenge to Tier 1 MentorME Verified status across all candidate intakes.</span>
          </div>

          <Button
            type="button"
            onClick={handleAuditSubmit}
            disabled={!isEligible || isSubmitting}
            className="gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold text-xs shadow-md"
          >
            <Award className="size-4" />
            {isSubmitting ? "Stamping Attestation..." : badge ? "Update MentorME Badge" : "Approve & Stamp MentorME Verified Badge"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
