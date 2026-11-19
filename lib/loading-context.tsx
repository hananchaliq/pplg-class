"use client";

import * as React from "react";
import * as THREE from "three";
import { ensureAlbumFontsLoaded } from "@/lib/class-meta";

const SESSION_KEY = "pplg_uno_album_opened_v1";
const MIN_HOLD_MS = 450;
const SAFE_TIMEOUT_MS = 12000;

export interface LoadingContextValue {
  /** Monotonically increasing progress 0..100 */
  progress: number;
  /** Whether all core boot checks have completed (or user clicked force open) */
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
  const [docComplete, setDocComplete] = React.useState<boolean>(false);
  const [sceneProgress, setSceneProgress] = React.useState<number>(20);
  const [minHoldElapsed, setMinHoldElapsed] = React.useState<boolean>(false);
  const [canForceOpen, setCanForceOpen] = React.useState<boolean>(false);
  const [forcedOpen, setForcedOpen] = React.useState<boolean>(false);
  const [isFirstSessionVisit, setIsFirstSessionVisit] =
    React.useState<boolean>(true);
  const [isLoaderUnmounted, setIsLoaderUnmounted] =
    React.useState<boolean>(false);

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
    setDocComplete(true);
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

  // 1. Selalu jalankan penjagaan awal saat halaman pertama kali dibuka ATAU di-refresh
  //    agar tidak pernah muncul layar putih polos sebelum seluruh elemen & canvas siap.
  React.useEffect(() => {
    let alreadyOpened = false;
    try {
      alreadyOpened = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadyOpened = false;
    }

    if (alreadyOpened) {
      setIsFirstSessionVisit(false);
    }

    document.body.style.overflow = "hidden";

    // Tahan singkat agar titik-titik tidak berkedip keras
    const holdDuration = alreadyOpened ? 220 : MIN_HOLD_MS;
    const minHoldTimer = window.setTimeout(() => {
      setMinHoldElapsed(true);
    }, holdDuration);

    // Katup pengaman 12 detik -> munculkan tombol "Buka sekarang" jika jaringan macet
    const safeTimer = window.setTimeout(() => {
      setCanForceOpen(true);
    }, SAFE_TIMEOUT_MS);

    const markLoaded = () => setDocComplete(true);
    if (document.readyState === "complete") {
      markLoaded();
    } else {
      window.addEventListener("load", markLoaded, { once: true });
    }

    return () => {
      window.clearTimeout(minHoldTimer);
      window.clearTimeout(safeTimer);
      window.removeEventListener("load", markLoaded);
      document.body.style.overflow = "";
    };
  }, []);

  // 2. Pantau kesiapan font album
  React.useEffect(() => {
    let active = true;
    ensureAlbumFontsLoaded().finally(() => {
      if (active) setFontsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // 3. Pantau THREE.DefaultLoadingManager & sinyal scene-loading / scene-ready
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

    // Hanya tandai scene ready otomatis bila halaman memang TIDAK memiliki scene 3D / dynamic loader sama sekali
    const checkStaticRouteInterval = window.setInterval(() => {
      const hasPendingLoaders = Boolean(
        document.querySelector('[data-route-loading="true"]') ||
          document.querySelector('main [data-dynamic-loading="true"]')
      );
      if (hasPendingLoaders) return;

      const hasScene = Boolean(
        document.querySelector('main [data-testid="scene-shell"]') ||
          document.querySelector("main [data-scene-canvas]") ||
          document.querySelector("main [data-leafthrough]")
      );
      if (!hasScene && document.readyState === "complete") {
        markSceneReady();
        window.clearInterval(checkStaticRouteInterval);
      }
    }, 220);

    return () => {
      THREE.DefaultLoadingManager.onProgress = prevOnProgress;
      THREE.DefaultLoadingManager.onLoad = prevOnLoad;
      window.removeEventListener("app:scene-loading", onSceneLoading);
      window.removeEventListener("app:scene-progress", onSceneProgress);
      window.removeEventListener("app:scene-ready", onSceneReady);
      window.clearInterval(checkStaticRouteInterval);
    };
  }, [reportSceneProgress, markSceneReady]);

  // 4. Hitung progres monotonik gabungan
  React.useEffect(() => {
    if (forcedOpen) {
      updateMonotonicProgress(100);
      return;
    }
    const fontWeight = fontsLoaded ? 30 : 12;
    const docWeight = docComplete ? 25 : 10;
    const sceneWeight = Math.round((sceneProgress / 100) * 45);
    const combined = fontWeight + docWeight + sceneWeight;

    if (fontsLoaded && docComplete && sceneProgress >= 100 && minHoldElapsed) {
      updateMonotonicProgress(100);
    } else {
      updateMonotonicProgress(Math.min(98, combined));
    }
  }, [
    fontsLoaded,
    docComplete,
    sceneProgress,
    minHoldElapsed,
    forcedOpen,
    updateMonotonicProgress,
  ]);

  const isReady =
    forcedOpen ||
    (progress >= 100 &&
      fontsLoaded &&
      docComplete &&
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
