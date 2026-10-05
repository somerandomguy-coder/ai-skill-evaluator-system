"use client";

import { useEffect, useRef } from "react";

/**
 * Attaches a cursor-tracking ambient light to an element: writes --mx/--my in
 * element-local percentages so CSS (`.glow-follow` in globals.css) can paint
 * a radial gradient that follows the pointer, clipped to the element's own
 * border-radius. rAF-throttled so it never queues more than one write per
 * frame. No-ops under prefers-reduced-motion — the element still gets a
 * static centered glow on hover/focus via the CSS fallback.
 *
 * Usage: <div ref={useMouseGlow()} className="glow-follow relative ..." />
 */
export function useMouseGlow<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    function flush() {
      frame = 0;
      if (!pending || !el) return;
      el.style.setProperty("--mx", `${pending.x}%`);
      el.style.setProperty("--my", `${pending.y}%`);
    }

    function onPointerMove(e: PointerEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      pending = {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
      if (!frame) frame = requestAnimationFrame(flush);
    }

    el.addEventListener("pointermove", onPointerMove);
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
