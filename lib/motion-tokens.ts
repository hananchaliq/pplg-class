export const MOTION_DURATION = {
  fast: 0.22,
  medium: 0.36,
  slow: 0.58,
  routeWipe: 0.34,
  countUp: 0.72,
} as const;

export const MOTION_EASE = {
  /** Editorial cubic-bezier: cepat di awal, mendarat sangat halus tanpa pantulan berlebihan */
  editorial: [0.22, 1, 0.36, 1] as const,
  /** Luxury smooth deceleration */
  luxury: [0.19, 1, 0.22, 1] as const,
  /** Curtain reveal / exit */
  curtain: [0.76, 0, 0.24, 1] as const,
  /** Shutter kamera: akselerasi tegas lalu berhenti presisi */
  shutter: [0.19, 1, 0.22, 1] as const,
  /** Keluar bersih tanpa menyeret */
  exit: [0.4, 0, 1, 1] as const,
  /** GSAP string equivalents */
  gsapEditorial: "power3.out",
  gsapExpoOut: "expo.out",
  gsapShutterInOut: "power3.inOut",
  gsapCoverOvershoot: "back.out(1.28)",
  /** Spring presets untuk Motion (Framer) */
  springTactile: { type: "spring" as const, stiffness: 420, damping: 30, mass: 0.85 },
  springNav: { type: "spring" as const, stiffness: 460, damping: 34, mass: 0.8 },
  springSheet: { type: "spring" as const, stiffness: 360, damping: 34, mass: 0.9 },
  springToast: { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.85 },
  springLuxury: { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.9 },
  springMagnetic: { stiffness: 320, damping: 24, mass: 0.4 },
} as const;

export const MOTION_DISTANCE = {
  sm: 10,
  md: 18,
  lg: 26,
  magneticMaxPx: 4.5,
  tiltMaxDeg: 3.4,
} as const;

export const MOTION_STAGGER = {
  tight: 0.04,
  base: 0.06,
  relaxed: 0.085,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isFinePointerDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
