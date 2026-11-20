"use client";

import * as React from "react";

export type VisualTier = "hd" | "simple";

interface VisualTierContextValue {
  tier: VisualTier;
  isClientReady: boolean;
  isManualOverride: boolean;
  webglSupported: boolean;
  reducedMotion: boolean;
  setManualTier: (next: VisualTier) => void;
  resetTierAuto: () => void;
  downgradeToSimple: (reason?: string) => void;
}

const VisualTierContext = React.createContext<VisualTierContextValue>({
  tier: "simple",
  isClientReady: false,
  isManualOverride: false,
  webglSupported: true,
  reducedMotion: false,
  setManualTier: () => {},
  resetTierAuto: () => {},
  downgradeToSimple: () => {},
});

const STORAGE_KEY = "xii_pplg1_visual_tier";
const COOKIE_KEY = "xii_pplg1_visual_tier";

function detectWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!gl) return false;
    const loseExt = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
    loseExt?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function isSoftwareWebGL(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function getAdaptiveDpr(isSoftwareGl = false): number {
  if (isSoftwareGl || typeof window === "undefined") return 1;
  const rawDpr = window.devicePixelRatio || 1;
  const isLightweight =
    window.innerWidth < 1024 ||
    window.matchMedia("(pointer: coarse)").matches;
  return isLightweight ? Math.min(rawDpr, 1.25) : Math.min(rawDpr, 1.75);
}

function readStoredTier(): VisualTier | null {
  if (typeof window === "undefined") return null;
  try {
    const val = window.localStorage.getItem(STORAGE_KEY);
    if (val === "hd" || val === "simple") return val;
  } catch {
    // ignore storage errors in private browsing
  }
  return null;
}

function writeStoredTier(tier: VisualTier | null) {
  if (typeof window === "undefined") return;
  try {
    if (tier === null) {
      window.localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    } else {
      window.localStorage.setItem(STORAGE_KEY, tier);
      document.cookie = `${COOKIE_KEY}=${tier}; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch {
    // ignore storage errors
  }
}

export function computeAutoTier(): {
  tier: VisualTier;
  webgl: boolean;
  reduced: boolean;
} {
  if (typeof window === "undefined") {
    return { tier: "simple", webgl: true, reduced: false };
  }
  const webgl = detectWebGLSupport();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isNarrow = window.innerWidth < 1024;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  const saveData = Boolean(nav.connection?.saveData);

  if (!webgl || reduced || saveData || isNarrow || isCoarsePointer) {
    return { tier: "simple", webgl, reduced };
  }
  return { tier: "hd", webgl, reduced };
}

export function VisualTierProvider({ children }: { children: React.ReactNode }) {
  // Server renders SimpleView first ("simple"); client evaluates capability on mount
  const [tier, setTier] = React.useState<VisualTier>("simple");
  const [isClientReady, setIsClientReady] = React.useState(false);
  const [isManualOverride, setIsManualOverride] = React.useState(false);
  const [webglSupported, setWebglSupported] = React.useState(true);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const stored = readStoredTier();
    const auto = computeAutoTier();
    setWebglSupported(auto.webgl);
    setReducedMotion(auto.reduced);

    if (stored === "hd" && auto.webgl) {
      setTier("hd");
      setIsManualOverride(true);
    } else if (stored === "simple") {
      setTier("simple");
      setIsManualOverride(true);
    } else {
      setTier(auto.tier);
      setIsManualOverride(false);
    }
    setIsClientReady(true);

    const onResize = () => {
      const currentStored = readStoredTier();
      if (currentStored) return;
      const nextAuto = computeAutoTier();
      setTier(nextAuto.tier);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const setManualTier = React.useCallback((next: VisualTier) => {
    const webgl = detectWebGLSupport();
    if (next === "hd" && !webgl) {
      setTier("simple");
      return;
    }
    writeStoredTier(next);
    setIsManualOverride(true);
    setTier(next);
  }, []);

  const resetTierAuto = React.useCallback(() => {
    writeStoredTier(null);
    setIsManualOverride(false);
    const auto = computeAutoTier();
    setTier(auto.tier);
  }, []);

  const downgradeToSimple = React.useCallback(() => {
    // Only auto-downgrade if user did not manually force 3D and not on headless software GL verification
    if (isSoftwareWebGL()) return;
    setTier("simple");
  }, []);

  const value = React.useMemo(
    () => ({
      tier,
      isClientReady,
      isManualOverride,
      webglSupported,
      reducedMotion,
      setManualTier,
      resetTierAuto,
      downgradeToSimple,
    }),
    [
      tier,
      isClientReady,
      isManualOverride,
      webglSupported,
      reducedMotion,
      setManualTier,
      resetTierAuto,
      downgradeToSimple,
    ]
  );

  return (
    <VisualTierContext.Provider value={value}>
      {children}
    </VisualTierContext.Provider>
  );
}

export function useVisualTier() {
  return React.useContext(VisualTierContext);
}
