"use client";

import * as React from "react";
import { useVisualTier } from "@/lib/visual-tier";

/**
 * Lapisan tekstur film analog (SVG feTurbulence grain halus + vignette tepi + debu tipis sesekali).
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
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {/* Grain Film Analog (SVG feTurbulence opacity rendah) */}
      <svg className="absolute inset-0 size-full opacity-[0.045] dark:opacity-[0.065]">
        <filter id="uno-film-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#uno-film-grain)" />
      </svg>

      {/* Debu & Goresan Tipis Sesekali pada Klise 35mm */}
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full opacity-[0.055] dark:opacity-[0.07]"
      >
        <line
          x1="142"
          y1="24"
          x2="141"
          y2="165"
          stroke="currentColor"
          strokeWidth="0.6"
        />
        <line
          x1="1038"
          y1="520"
          x2="1039"
          y2="690"
          stroke="currentColor"
          strokeWidth="0.5"
        />
        <circle cx="290" cy="610" r="0.8" fill="currentColor" />
        <circle cx="884" cy="148" r="0.7" fill="currentColor" />
        <circle cx="620" cy="410" r="0.6" fill="currentColor" />
      </svg>

      {/* Vignette Lembut di Tepi Layar */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, transparent 62%, rgba(38, 31, 24, 0.11) 100%)",
        }}
      />
      <div
        className="hidden dark:block absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, transparent 58%, rgba(36, 30, 24, 0.34) 100%)",
        }}
      />
    </div>
  );
}
