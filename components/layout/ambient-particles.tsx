"use client";

import * as React from "react";
import { useVisualTier } from "@/lib/visual-tier";

/**
 * Partikel debu proyektor statis/ringan monokrom.
 * Otomatis dimatikan di tier `simple` dan saat prefers-reduced-motion aktif.
 */
const DUST_MOTES = [
  { id: 1, left: "8%", top: "18%", size: 3 },
  { id: 2, left: "22%", top: "64%", size: 4 },
  { id: 3, left: "38%", top: "28%", size: 2 },
  { id: 4, left: "54%", top: "76%", size: 3 },
  { id: 5, left: "69%", top: "22%", size: 4 },
  { id: 6, left: "84%", top: "58%", size: 3 },
];

export function AmbientParticles() {
  const { tier } = useVisualTier();
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (tier === "simple" || reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
      {DUST_MOTES.map((mote) => (
        <span
          key={mote.id}
          style={{
            left: mote.left,
            top: mote.top,
            width: mote.size,
            height: mote.size,
          }}
          className="absolute rounded-full bg-foreground/15"
        />
      ))}
    </div>
  );
}
