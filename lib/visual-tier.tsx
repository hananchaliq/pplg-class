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

let cachedWebGLSupport: boolean | null = null;
let cachedSoftwareWebGL: boolean | null = null;

export function detectWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  if (cachedWebGLSupport !== null) return cachedWebGLSupport;
  try {
    const canvas = document.createElement("canvas");
    const attrs: WebGLContextAttributes = {
      failIfMajorPerformanceCaveat: false,
    };
    const gl =
      canvas.getContext("webgl2", attrs) ||
      canvas.getContext("webgl", attrs) ||
      canvas.getContext("experimental-webgl", attrs) ||
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!gl) {
      cachedWebGLSupport = false;
      return false;
    }
    try {
      const ext = (gl as WebGLRenderingContext).getExtension(
        "WEBGL_debug_renderer_info"
      );
      const param = ext
        ? ext.UNMASKED_RENDERER_WEBGL
        : (gl as WebGLRenderingContext).RENDERER;
      const gpu = String((gl as WebGLRenderingContext).getParameter(param));
      cachedSoftwareWebGL =
        /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      cachedSoftwareWebGL = false;
    }
    cachedWebGLSupport = true;
    return true;
  } catch {
    cachedWebGLSupport = false;
    return false;
  }
}

export function isSoftwareWebGL(): boolean {
  if (typeof window === "undefined") return true;
  if (cachedSoftwareWebGL !== null) return cachedSoftwareWebGL;
  const supported = detectWebGLSupport();
  if (!supported) return true;
  return cachedSoftwareWebGL ?? false;
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
  const isMobileViewport = window.innerWidth < 768;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  const saveData = Boolean(nav.connection?.saveData);

  if (saveData || isMobileViewport) {
    return { tier: "simple", webgl, reduced };
  }
  return { tier: "hd", webgl, reduced };
}

export function VisualTierProvider({ children }: { children: React.ReactNode }) {
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

    if (stored === "hd") {
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

  const downgradeToSimple = React.useCallback((_reason?: string) => {
    // Do not force-downgrade global tier when the user wants 3D mode; individual scenes handle fallback gracefully
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
