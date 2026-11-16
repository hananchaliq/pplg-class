"use client";

import * as React from "react";

/**
 * Partikel debu cahaya senja statis/ringan tanpa loop JS Framer Motion terus-menerus
 * agar tidak membebani main thread saat berpindah menu navigasi.
 */
const DUST_MOTES = [
  { id: 1, left: "8%", top: "18%", size: 4 },
  { id: 2, left: "22%", top: "64%", size: 5 },
  { id: 3, left: "38%", top: "28%", size: 3 },
  { id: 4, left: "54%", top: "76%", size: 4 },
  { id: 5, left: "69%", top: "22%", size: 5 },
  { id: 6, left: "84%", top: "58%", size: 4 },
];

export function AmbientParticles() {
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
          className="absolute rounded-full bg-[var(--color-accent-warm)]/25 blur-[0.5px]"
        />
      ))}
    </div>
  );
}
