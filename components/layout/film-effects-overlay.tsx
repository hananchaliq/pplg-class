"use client";

import * as React from "react";
import { useVisualTier } from "@/lib/visual-tier";

/**
 * Lapisan tekstur film analog ringan (CSS static tile + key-light wash + vignette tepi).
 * Bebas SVG <feTurbulence> full-screen sehingga komposit GPU tetap 60fps.
 * Otomatis dimatikan saat prefers-reduced-motion: reduce atau visual tier === "simple".
 */
export function FilmEffectsOverlay() {
  const { tier } = useVisualTier();
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (tier === "simple" || reducedMotion) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      {/* Pre-tiled static archival grain (zero filter recomputation) */}
      <div className="film-grain-tile absolute inset-0 opacity-[0.045] dark:opacity-[0.06]" />

      {/* Top-center warm studio gallery key-light wash */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "radial-gradient(60% 35% at 50% 0%, rgba(166, 134, 82, 0.055), transparent 72%)",
        }}
      />
      <div
        className="hidden dark:block absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 35% at 50% 0%, rgba(212, 185, 135, 0.065), transparent 72%)",
        }}
      />

      {/* Archival edge vignette */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, transparent 64%, rgba(38, 31, 24, 0.09) 100%)",
        }}
      />
      <div
        className="hidden dark:block absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, transparent 60%, rgba(20, 16, 12, 0.34) 100%)",
        }}
      />
    </div>
  );
}
