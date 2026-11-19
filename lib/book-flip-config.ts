/**
 * Konfigurasi terpusat untuk rasa (feel) fisik, dimensi, kamera, dan performa Buku Kenangan 3D.
 * Seluruh konstanta kelengkungan, kecepatan balik halaman, momentum drag, dan framing kamera
 * dikendalikan dari satu tempat agar konsisten antara desktop, potret, dan reduced motion.
 */
export const BOOK_FLIP_CONFIG = {
  geometry: {
    pageWidth: 2.18,
    pageHeight: 2.82,
    segmentsX: 46,
    segmentsZ: 18,
    restArchHeight: 0.082,
    gutterDip: 0.02,
    maxStackHeight: 0.165,
    minStackHeight: 0.022,
    leafPoolSize: 5,
    leafHalfGap: 0.0014,
    stackLayerStep: 0.0024,
  },
  shader: {
    baseBend: 0.86,
    dragBendBoost: 0.34,
    midAirBellyBase: 0.2,
    midAirBellyBend: 0.1,
    cornerLeadWeight: 0.14,
    edgeLagWeight: 0.15,
    gutterShadeMin: 0.8,
  },
  flip: {
    durationSec: 0.66,
    cascadeDurationSec: 0.56,
    cascadeStaggerSec: 0.085,
    maxCascadeLeaves: 4,
    ease: "power2.inOut",
    snapEase: "power3.out",
    dragCommitProgress: 0.32,
    dragVelocityThresholdPxPerMs: 0.42,
    dragHorizontalSensitivity: 0.48,
    minDragActivationPx: 8,
  },
  cover: {
    openDurationSec: 0.88,
    closeDurationSec: 0.68,
    openAngleRad: Math.PI * 0.992,
    /** Overshoot lembut pada engsel sampul keras sebelum mendarat mantap */
    openEase: "back.out(1.18)",
    closeEase: "power3.inOut",
  },
  camera: {
    fov: 40,
    near: 0.15,
    far: 32,
    closedPos: { x: 0, y: 3.35, z: 3.25 },
    openPos: { x: 0, y: 2.92, z: 3.05 },
    portraitExtraDistance: 1.55,
    portraitExtraHeight: 1.15,
    lookAtClosed: { x: 0, y: 0.06, z: 0.04 },
    lookAtOpen: { x: 0, y: 0.05, z: 0.1 },
    reframeDurationSec: 0.85,
    reframeEase: "power3.out",
    idleSwayAmpX: 0.09,
    idleSwayAmpY: 0.04,
    idleSwaySpeed: 0.65,
    pointerParallaxX: 0.14,
    pointerParallaxY: 0.07,
  },
  performance: {
    maxPixelRatio: 2,
    textureCacheRadius: 3,
  },
} as const;
