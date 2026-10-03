"use client";

import { useEffect, useState } from "react";
import {
  BookOpenText,
  MessageSquare,
  MonitorPlay,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Pin,
  PinOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkspaceTourProps {
  open: boolean;
  onClose: () => void;
  onOpenBrief?: () => void;
  onStepChange?: (stepIndex: number) => void;
}

interface TourStep {
  targetId: string;
  title: string;
  badge: string;
  description: string;
  icon: typeof BookOpenText;
  actionText?: string;
  positionHint: "below" | "beside-right" | "bottom-corner";
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-brief-button",
    badge: "Step 1 of 3",
    title: "1. Review Requirements & Rubric",
    description:
      "Start by inspecting the challenge brief here. You can review Australian compliance invariants, data schemas, and the zero-trust evaluation rubric at any point during your build.",
    icon: BookOpenText,
    actionText: "Open Brief Sheet",
    positionHint: "below",
  },
  {
    targetId: "tour-chat-panel",
    badge: "Step 2 of 3",
    title: "2. Direct the AI Assistant",
    description:
      "Collaborate with your AI co-pilot in this panel. Practice deliberate problem decomposition and zero-trust verification: review proposed code, test edge cases, and catch planted domain bugs.",
    icon: MessageSquare,
    positionHint: "beside-right",
  },
  {
    targetId: "tour-work-panel",
    badge: "Step 3 of 3",
    title: "3. Live Preview & SQLite Database",
    description:
      "Your app compiles and updates in the live preview. Switch tabs to explore the project files, check runtime console logs, or query the fullstack SQLite database directly.",
    icon: MonitorPlay,
    actionText: "Start Building!",
    positionHint: "bottom-corner",
  },
];

export function WorkspaceTour({ open, onClose, onOpenBrief, onStepChange }: WorkspaceTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [dockToCorner, setDockToCorner] = useState(false);

  const step = TOUR_STEPS[currentStepIndex];

  useEffect(() => {
    if (open) {
      onStepChange?.(currentStepIndex);
    }
  }, [open, currentStepIndex, onStepChange]);

  // Calculate target element position whenever step or window changes
  useEffect(() => {
    if (!open) return;

    function updateRect() {
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    }

    updateRect();
    const timer = setTimeout(updateRect, 150);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [open, currentStepIndex, step.targetId]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleFinish();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentStepIndex]);

  function handleFinish() {
    if (typeof window !== "undefined") {
      localStorage.setItem("ai_skill_workspace_tour_completed", "true");
    }
    onClose();
  }

  function handleNext() {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  }

  function handlePrev() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }

  if (!open) return null;

  const Icon = step.icon;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  // Floating placement: follow target outline, or dock in corner
  const getCardStyle = (): React.CSSProperties => {
    if (typeof window === "undefined") {
      return { bottom: "24px", right: "24px", position: "fixed" };
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const CARD_WIDTH = Math.min(420, vw - 32);

    if (dockToCorner || !targetRect) {
      return {
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: `${CARD_WIDTH}px`,
        zIndex: 50,
      };
    }

    const GAP = 14;
    let top: number | undefined;
    let bottom: number | undefined;
    let left: number | undefined;
    let right: number | undefined;

    if (currentStepIndex === 0) {
      // Step 1: tour-brief-button (header) -> place directly below
      top = targetRect.bottom + GAP;
      left = Math.max(16, Math.min(targetRect.right - CARD_WIDTH, vw - CARD_WIDTH - 16));
    } else if (currentStepIndex === 1) {
      // Step 2: tour-chat-panel (left panel) -> float cleanly to the right of chat
      if (vw >= 1024 && targetRect.right + CARD_WIDTH + GAP < vw) {
        left = targetRect.right + GAP;
        top = Math.max(68, Math.min(targetRect.top + 40, vh - 300));
      } else {
        // Narrow/mobile: dock at bottom
        bottom = 20;
        left = Math.max(16, (vw - CARD_WIDTH) / 2);
      }
    } else if (currentStepIndex === 2) {
      // Step 3: tour-work-panel (preview & files) -> dock at bottom-right corner
      bottom = 24;
      right = 24;
    }

    return {
      position: "fixed",
      ...(top !== undefined ? { top: `${Math.round(top)}px` } : {}),
      ...(bottom !== undefined ? { bottom: `${Math.round(bottom)}px` } : {}),
      ...(left !== undefined ? { left: `${Math.round(left)}px` } : {}),
      ...(right !== undefined ? { right: `${Math.round(right)}px` } : {}),
      width: `${CARD_WIDTH}px`,
      zIndex: 50,
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none">
      {/* 
        SVG Mask: The rest of the screen is darkened (rgba(0,0,0,0.72)),
        while the cutout rectangle over targetRect is 100% transparent.
        The highlighted element remains completely illuminated, bright, and readable!
      */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-40">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White fills the screen (making the dark overlay visible) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black hole cuts out the target element completely */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark overlay with transparent cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.74)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto cursor-default"
          onClick={handleFinish}
        />
      </svg>

      {/* Target Element Illuminated Neon Spotlight Ring */}
      {targetRect && (
        <div
          className="fixed rounded-xl pointer-events-none transition-all duration-300 ease-out border-2 border-primary shadow-[0_0_32px_rgba(255,107,0,0.5)] ring-4 ring-primary/25 z-40"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Smart Positioning Tour Card (Follows outline or docks in corner) */}
      <div
        style={getCardStyle()}
        className="pointer-events-auto transition-all duration-300 ease-out animate-in fade-in zoom-in-95"
      >
        <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-primary tracking-wider block">
                  {step.badge}
                </span>
                <h3 className="font-bold text-foreground text-sm">{step.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Toggle to dock in corner or follow element */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDockToCorner(!dockToCorner)}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                title={dockToCorner ? "Follow highlighted element" : "Pin to bottom corner"}
              >
                {dockToCorner ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleFinish}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="Skip tutorial"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          {/* Action button if first step */}
          {isFirst && onOpenBrief && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenBrief();
                  handleNext();
                }}
                className="w-full text-xs font-medium gap-1.5 h-8 border-primary/30 text-primary hover:bg-primary/10"
              >
                <BookOpenText className="size-3.5" />
                Peek at Brief & Requirements
              </Button>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={cn(
                    "size-2 rounded-full transition-all",
                    currentStepIndex === idx
                      ? "w-5 bg-primary"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFinish}
                className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
              >
                Skip
              </Button>

              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleNext}
                className="h-8 gap-1 px-3 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90"
              >
                <span>{isLast ? "Got it!" : "Next"}</span>
                {isLast ? <CheckCircle2 className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
