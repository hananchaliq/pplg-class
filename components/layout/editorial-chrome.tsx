"use client";

import * as React from "react";
import { isFinePointerDevice, prefersReducedMotion } from "@/lib/motion-tokens";

/**
 * 1. ReadingProgressBar: bilah progres baca tipis 2px di sisi paling atas layar.
 * Menggunakan transform scaleX (compositor-only, 60fps tanpa reflow).
 */
export function ReadingProgressBar() {
  const barRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / scrollable));
      bar.style.transform = `scaleX(${progress})`;
      bar.style.opacity = progress > 0.01 ? "0.9" : "0";
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-foreground/80 transition-opacity duration-200 will-change-transform"
        style={{ transform: "scaleX(0)", opacity: 0 }}
      />
    </div>
  );
}

/**
 * 2. ViewfinderCursor: kursor ring tipis ala jendela bidik kamera analog khusus desktop (pointer: fine).
 * Nonaktif otomatis pada perangkat sentuh dan prefers-reduced-motion; berhenti merender saat diam/tab tersembunyi.
 */
export function ViewfinderCursor() {
  const ringRef = React.useRef<HTMLDivElement | null>(null);
  const dotRef = React.useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!isFinePointerDevice() || prefersReducedMotion()) return;
    setEnabled(true);
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    let targetX = -100;
    let targetY = -100;
    let curX = -100;
    let curY = -100;
    let visible = false;
    let hoveringInteractive = false;
    let pressing = false;
    let rafId = 0;

    const interactiveSelector =
      'a, button, [role="button"], [role="tab"], input, select, textarea, summary, [data-viewfinder-interactive]';

    const applyVisualState = () => {
      const scale = pressing ? 0.84 : hoveringInteractive ? 1.42 : 1;
      ring.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%) scale(${scale})`;
      ring.style.opacity = visible ? (hoveringInteractive ? "0.9" : "0.52") : "0";
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) scale(${pressing ? 0.7 : 1})`;
      dot.style.opacity = visible ? "0.8" : "0";
      ring.dataset.hover = hoveringInteractive ? "true" : "false";
    };

    const step = () => {
      if (document.hidden) {
        rafId = 0;
        return;
      }
      curX += (targetX - curX) * 0.22;
      curY += (targetY - curY) * 0.22;
      applyVisualState();

      if (Math.abs(targetX - curX) > 0.15 || Math.abs(targetY - curY) > 0.15) {
        rafId = window.requestAnimationFrame(step);
      } else {
        curX = targetX;
        curY = targetY;
        applyVisualState();
        rafId = 0;
      }
    };

    const schedule = () => {
      if (!rafId && !document.hidden) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        curX = targetX;
        curY = targetY;
        visible = true;
      }
      const el = e.target as HTMLElement | null;
      hoveringInteractive = Boolean(el?.closest?.(interactiveSelector));
      schedule();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pressing = true;
      schedule();
    };

    const onPointerUp = () => {
      pressing = false;
      schedule();
    };

    const onLeave = () => {
      visible = false;
      hoveringInteractive = false;
      pressing = false;
      applyVisualState();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        data-hover="false"
        className="pointer-events-none fixed top-0 left-0 z-[90] size-7 rounded-full border border-foreground/75 transition-[border-color,opacity] duration-150 will-change-transform data-[hover=true]:border-foreground"
        style={{ opacity: 0, transform: "translate3d(-100px,-100px,0)" }}
      >
        <span className="absolute -top-[1px] left-1/2 h-1 w-[1px] -translate-x-1/2 bg-foreground/70" />
        <span className="absolute -bottom-[1px] left-1/2 h-1 w-[1px] -translate-x-1/2 bg-foreground/70" />
        <span className="absolute top-1/2 -left-[1px] h-[1px] w-1 -translate-y-1/2 bg-foreground/70" />
        <span className="absolute top-1/2 -right-[1px] h-[1px] w-1 -translate-y-1/2 bg-foreground/70" />
      </div>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[90] size-1 rounded-full bg-foreground/85 will-change-transform"
        style={{ opacity: 0, transform: "translate3d(-100px,-100px,0)" }}
      />
    </>
  );
}
