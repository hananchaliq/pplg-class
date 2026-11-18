"use client";

import * as React from "react";
import * as THREE from "three";
import { ensureAlbumFontsLoaded } from "@/lib/class-meta";

const SESSION_KEY = "pplg_uno_album_opened_v1";
const MIN_HOLD_MS = 750;
const SAFE_TIMEOUT_MS = 12000;

export interface LoadingContextValue {
  /** Monotonically increasing progress 0..100 */
  progress: number;
  /** Whether all assets have completed (or user clicked force open) */
  isReady: boolean;
  /** Whether the loader has completely finished its exit animation and unmounted */
  isLoaderUnmounted: boolean;
  /** True when 12s safety timeout has elapsed and some assets are still pending */
  canForceOpen: boolean;
  /** Report 3D scene progress (0..100) */
  reportSceneProgress: (pct: number, label?: string) => void;
  /** Mark 3D scene as ready */
  markSceneReady: () => void;
  /** Force open the album immediately */
  forceOpenAlbum: () => void;
  /** Complete exit unmount */
  markUnmounted: () => void;
  /** Whether this is the first visit in the current browser session */
  isFirstSessionVisit: boolean;
}

const LoadingContext = React.createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgressState] = React.useState<number>(12);
  const [fontsLoaded, setFontsLoaded] = React.useState<boolean>(false);
  const [imagesLoaded, setImagesLoaded] = React.useState<boolean>(false);
  const [dataLoaded, setDataLoaded] = React.useState<boolean>(false);
  const [sceneProgress, setSceneProgress] = React.useState<number>(20);
  const [minHoldElapsed, setMinHoldElapsed] = React.useState<boolean>(false);
  const [canForceOpen, setCanForceOpen] = React.useState<boolean>(false);
  const [forcedOpen, setForcedOpen] = React.useState<boolean>(false);
  const [isFirstSessionVisit, setIsFirstSessionVisit] =
    React.useState<boolean>(true);
  const [isLoaderUnmounted, setIsLoaderUnmounted] =
    React.useState<boolean>(false);

  // Monotonic setter: progress never decreases
  const updateMonotonicProgress = React.useCallback((nextVal: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(nextVal)));
    setProgressState((prev) => (clamped > prev ? clamped : prev));
  }, []);

  const reportSceneProgress = React.useCallback((pct: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    setSceneProgress((prev) => (clamped > prev ? clamped : prev));
  }, []);

  const markSceneReady = React.useCallback(() => {
    setSceneProgress(100);
  }, []);

  const forceOpenAlbum = React.useCallback(() => {
    setForcedOpen(true);
    setSceneProgress(100);
    setFontsLoaded(true);
    setImagesLoaded(true);
    setDataLoaded(true);
    setMinHoldElapsed(true);
    updateMonotonicProgress(100);
  }, [updateMonotonicProgress]);

  const markUnmounted = React.useCallback(() => {
    setIsLoaderUnmounted(true);
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("app:album-opened"));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // 1. Check sessionStorage on mount & lock body scroll while loading
  React.useEffect(() => {
    let alreadyOpened = false;
    try {
      alreadyOpened = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadyOpened = false;
    }

    if (alreadyOpened) {
      setIsFirstSessionVisit(false);
      setFontsLoaded(true);
      setImagesLoaded(true);
      setDataLoaded(true);
      setSceneProgress(100);
      setMinHoldElapsed(true);
      setProgressState(100);
      setIsLoaderUnmounted(true);
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    // Hold minimum ~750ms so loader never flickers
    const minHoldTimer = window.setTimeout(() => {
      setMinHoldElapsed(true);
    }, MIN_HOLD_MS);

    // 12-second safety timeout -> display "Buka album" button and allow fallback
    const safeTimer = window.setTimeout(() => {
      setCanForceOpen(true);
    }, SAFE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(minHoldTimer);
      window.clearTimeout(safeTimer);
      document.body.style.overflow = "";
    };
  }, []);

  // 2. Track Font Readiness (Old Standard TT, Source Serif 4, Special Elite)
  React.useEffect(() => {
    let active = true;
    ensureAlbumFontsLoaded().finally(() => {
      if (active) setFontsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // 3. Track Initial Data & Above-the-Fold Image Preload
  React.useEffect(() => {
    setDataLoaded(true);

    const checkAboveFoldImages = () => {
      const imgs = Array.from(document.querySelectorAll("img")).slice(0, 4);
      if (imgs.length === 0) {
        setImagesLoaded(true);
        return;
      }
      let remaining = imgs.length;
      const onDone = () => {
        remaining -= 1;
        if (remaining <= 0) setImagesLoaded(true);
      };
      imgs.forEach((img) => {
        if (img.complete) {
          onDone();
        } else {
          img.addEventListener("load", onDone, { once: true });
          img.addEventListener("error", onDone, { once: true });
        }
      });
      // Fallback if any image takes > 1.6s
      window.setTimeout(() => setImagesLoaded(true), 1600);
    };

    const rafId = window.requestAnimationFrame(checkAboveFoldImages);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  // 4. Listen to THREE.DefaultLoadingManager & custom scene events from SceneShell / DreamBoardSection
  React.useEffect(() => {
    const prevOnProgress = THREE.DefaultLoadingManager.onProgress;
    const prevOnLoad = THREE.DefaultLoadingManager.onLoad;

    THREE.DefaultLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      prevOnProgress?.(url, itemsLoaded, itemsTotal);
      if (itemsTotal > 0) {
        const pct = Math.round((itemsLoaded / itemsTotal) * 100);
        reportSceneProgress(pct);
      }
    };

    THREE.DefaultLoadingManager.onLoad = () => {
      prevOnLoad?.();
      markSceneReady();
    };

    const onSceneLoading = (e: Event) => {
      const detail = (e as CustomEvent<{ progress?: number }>).detail;
      reportSceneProgress(detail?.progress ?? 35);
    };

    const onSceneProgress = (e: Event) => {
      const detail = (e as CustomEvent<{ progress?: number }>).detail;
      if (typeof detail?.progress === "number") {
        reportSceneProgress(detail.progress);
      }
    };

    const onSceneReady = () => {
      markSceneReady();
    };

    window.addEventListener("app:scene-loading", onSceneLoading);
    window.addEventListener("app:scene-progress", onSceneProgress);
    window.addEventListener("app:scene-ready", onSceneReady);

    // If the current page or mobile Simple 2D view has no active WebGL canvas within 900ms,
    // smoothly advance sceneProgress to 100% so it never stalls at 99%.
    const noCanvasTimer = window.setTimeout(() => {
      const hasSceneShell = Boolean(
        document.querySelector('[data-testid="scene-shell"]') ||
          document.querySelector("canvas")
      );
      if (!hasSceneShell) {
        markSceneReady();
      } else {
        // Ensure even slow software WebGL completes within ~1.8s once first frame draws
        window.setTimeout(() => markSceneReady(), 1100);
      }
    }, 650);

    return () => {
      THREE.DefaultLoadingManager.onProgress = prevOnProgress;
      THREE.DefaultLoadingManager.onLoad = prevOnLoad;
      window.removeEventListener("app:scene-loading", onSceneLoading);
      window.removeEventListener("app:scene-progress", onSceneProgress);
      window.removeEventListener("app:scene-ready", onSceneReady);
      window.clearTimeout(noCanvasTimer);
    };
  }, [reportSceneProgress, markSceneReady]);

  // 5. Compute Combined Monotonic Progress
  React.useEffect(() => {
    if (forcedOpen) {
      updateMonotonicProgress(100);
      return;
    }
    const fontWeight = fontsLoaded ? 25 : 10;
    const dataWeight = dataLoaded ? 20 : 8;
    const imgWeight = imagesLoaded ? 20 : 8;
    const sceneWeight = Math.round((sceneProgress / 100) * 35);

    const combined = fontWeight + dataWeight + imgWeight + sceneWeight;
    if (
      fontsLoaded &&
      dataLoaded &&
      imagesLoaded &&
      sceneProgress >= 100 &&
      minHoldElapsed
    ) {
      updateMonotonicProgress(100);
    } else {
      updateMonotonicProgress(Math.min(98, combined));
    }
  }, [
    fontsLoaded,
    dataLoaded,
    imagesLoaded,
    sceneProgress,
    minHoldElapsed,
    forcedOpen,
    updateMonotonicProgress,
  ]);

  const isReady =
    forcedOpen ||
    (progress >= 100 &&
      fontsLoaded &&
      dataLoaded &&
      imagesLoaded &&
      sceneProgress >= 100 &&
      minHoldElapsed);

  const value = React.useMemo<LoadingContextValue>(
    () => ({
      progress,
      isReady,
      isLoaderUnmounted,
      canForceOpen,
      reportSceneProgress,
      markSceneReady,
      forceOpenAlbum,
      markUnmounted,
      isFirstSessionVisit,
    }),
    [
      progress,
      isReady,
      isLoaderUnmounted,
      canForceOpen,
      reportSceneProgress,
      markSceneReady,
      forceOpenAlbum,
      markUnmounted,
      isFirstSessionVisit,
    ]
  );

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const ctx = React.useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return ctx;
}
