"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient cursor light for the whole site: one fixed layer mounted once in
 * the root layout, moved with `transform: translate3d` only (never repaints
 * a gradient per frame — GPU compositing only). Sits behind all content and
 * never intercepts pointer events. Desktop fine-pointer only; CSS hides it
 * under reduced motion or a coarse/touch pointer.
 */
export function GlobalMouseGlow() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let pending: { x: number; y: number } | null = null;
    let shown = false;

    function flush() {
      frame = 0;
      if (!pending || !el) return;
      el.style.setProperty("--gx", `${pending.x}px`);
      el.style.setProperty("--gy", `${pending.y}px`);
      if (!shown) {
        shown = true;
        el.classList.add("is-active");
      }
    }

    function onPointerMove(e: PointerEvent) {
      pending = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="global-mouse-glow" aria-hidden />;
}
