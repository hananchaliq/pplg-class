"use client";

import * as React from "react";
import { motion } from "motion/react";

const FLOATING_MOTE_SEEDS = [
  { id: 1, left: "7%", top: "16%", size: 5, dur: 9, delay: 0, color: "var(--color-chart-4)" },
  { id: 2, left: "18%", top: "68%", size: 6, dur: 11, delay: 1.2, color: "var(--color-chart-1)" },
  { id: 3, left: "32%", top: "28%", size: 4, dur: 8.5, delay: 0.6, color: "var(--color-chart-3)" },
  { id: 4, left: "48%", top: "82%", size: 5, dur: 12, delay: 2.1, color: "var(--color-chart-2)" },
  { id: 5, left: "64%", top: "22%", size: 6, dur: 10, delay: 0.9, color: "var(--color-chart-4)" },
  { id: 6, left: "78%", top: "58%", size: 4, dur: 9.5, delay: 1.7, color: "var(--color-chart-1)" },
  { id: 7, left: "89%", top: "32%", size: 5, dur: 10.5, delay: 0.4, color: "var(--color-chart-3)" },
  { id: 8, left: "93%", top: "76%", size: 6, dur: 11.5, delay: 2.5, color: "var(--color-chart-2)" },
];

export function AmbientParticles() {
  const [clickRipples, setClickRipples] = React.useState<
    { id: number; x: number; y: number }[]
  >([]);

  React.useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      // Only add subtle sparkle ripple on non-input clicks
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.tagName === "CANVAS")
      ) {
        return;
      }
      const id = Date.now() + Math.random();
      setClickRipples((prev) => [...prev.slice(-4), { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => {
        setClickRipples((prev) => prev.filter((r) => r.id !== id));
      }, 750);
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {/* Floating nostalgic afternoon dust motes */}
      {FLOATING_MOTE_SEEDS.map((m) => (
        <motion.span
          key={m.id}
          initial={{ opacity: 0.15, y: 0, x: 0 }}
          animate={{
            opacity: [0.15, 0.45, 0.15],
            y: [0, -28, 0],
            x: [0, 12, -8, 0],
            scale: [1, 1.25, 1],
          }}
          transition={{
            duration: m.dur,
            delay: m.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            left: m.left,
            top: m.top,
            width: m.size,
            height: m.size,
            backgroundColor: m.color,
          }}
          className="absolute rounded-full blur-[0.5px]"
        />
      ))}

      {/* Interactive click micro-sparkles */}
      {clickRipples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ opacity: 0.75, scale: 0.2 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          style={{ left: r.x - 14, top: r.y - 14 }}
          className="fixed size-7 rounded-full border border-[var(--color-accent-warm)]/60 bg-[var(--color-accent-warm)]/10"
        />
      ))}
    </div>
  );
}
