"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useLoading } from "@/lib/loading-context";
import { useVisualTier } from "@/lib/visual-tier";
import { notifyRouteTransitionStart } from "@/lib/use-public-data";
import { MOTION_EASE } from "@/lib/motion-tokens";

export interface VanishingRouterLike {
  push: (href: string) => void;
}

interface CurtainController {
  startRouteTransition: (targetHref: string, onPush: () => void) => void;
}

let activeController: CurtainController | null = null;

/**
 * Navigasi SPA ringan dengan tirai arsitektural GPU-only (transform + opacity):
 * tanpa loop kanvas 2D 60fps, tanpa GSAP sinkron, dan tanpa MutationObserver.
 */
export function navigateWithVanishingPoint(
  targetHref: string,
  router?: VanishingRouterLike | null
) {
  if (typeof window === "undefined") return;

  if (window.location.pathname === targetHref) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  notifyRouteTransitionStart();

  const pushRoute = () => {
    if (router) {
      router.push(targetHref);
    } else {
      window.location.assign(targetHref);
    }
  };

  if (!activeController) {
    pushRoute();
    return;
  }

  activeController.startRouteTransition(targetHref, pushRoute);
}

export function triggerVanishingExit(
  _targetHref: string,
  onReady: () => void
) {
  onReady();
}

export function VanishingPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { tier } = useVisualTier();
  const {
    progress,
    isReady,
    isLoaderUnmounted,
    isFirstSessionVisit,
    canForceOpen,
    forceOpenAlbum,
    markUnmounted,
  } = useLoading();

  const [bootCurtainOpen, setBootCurtainOpen] = React.useState(false);
  const [routeVeilActive, setRouteVeilActive] = React.useState(false);
  const veilTimerRef = React.useRef<number | null>(null);
  const pushTimerRef = React.useRef<number | null>(null);
  const isFirstMountRef = React.useRef(true);

  React.useEffect(() => {
    document.documentElement.dataset.visualTier = tier;
  }, [tier]);

  // Lift first-visit darkroom curtain once initial readiness resolves
  React.useEffect(() => {
    if (!isFirstSessionVisit) {
      if (!isLoaderUnmounted) {
        markUnmounted();
      }
      return;
    }

    if (isReady && !bootCurtainOpen) {
      setBootCurtainOpen(true);
      const t = window.setTimeout(() => {
        markUnmounted();
      }, 440);
      return () => window.clearTimeout(t);
    }
  }, [
    isFirstSessionVisit,
    isReady,
    bootCurtainOpen,
    isLoaderUnmounted,
    markUnmounted,
  ]);

  const clearVeilTimers = React.useCallback(() => {
    if (veilTimerRef.current !== null) {
      window.clearTimeout(veilTimerRef.current);
      veilTimerRef.current = null;
    }
    if (pushTimerRef.current !== null) {
      window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }
  }, []);

  // Register lightweight route transition controller
  React.useEffect(() => {
    activeController = {
      startRouteTransition: (_targetHref, onPush) => {
        clearVeilTimers();
        setRouteVeilActive(true);
        pushTimerRef.current = window.setTimeout(() => {
          onPush();
        }, 120);
        veilTimerRef.current = window.setTimeout(() => {
          setRouteVeilActive(false);
        }, 650);
      },
    };
    return () => {
      activeController = null;
      clearVeilTimers();
    };
  }, [clearVeilTimers]);

  // Lift route veil smoothly once Next.js mounts the new route
  React.useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      setRouteVeilActive(false);
    }, 60);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const showBootCurtain = isFirstSessionVisit && !isLoaderUnmounted;

  return (
    <div className="relative w-full">
      {/* First-Visit Darkroom Curtain (GPU transform only, glides upward) */}
      <AnimatePresence>
        {showBootCurtain && (
          <motion.div
            key="editorial-boot-curtain"
            role="status"
            aria-live="polite"
            aria-label="Memuat Ruang Kenangan XII PPLG 1"
            initial={{ y: "0%" }}
            animate={bootCurtainOpen ? { y: "-100%" } : { y: "0%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.42, ease: MOTION_EASE.curtain }}
            className="darkroom-surface fixed inset-0 z-[95] flex flex-col items-center justify-center px-6 text-[#F3F1EA] will-change-transform"
          >
            <div className="flex max-w-sm flex-col items-center text-center">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.26em] text-[#D4B987]">
                <span className="size-1.5 rounded-full bg-[#D4B987]" />
                <span>UNO · XII PPLG 1</span>
                <span className="size-1.5 rounded-full bg-[#D4B987]" />
              </div>

              <p className="mt-3 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F1EA]">
                Ruang Kenangan MAKN Ende
              </p>

              {/* Hairline Progress Indicator */}
              <div className="mt-5 h-[2px] w-48 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full origin-left bg-[#D4B987] transition-transform duration-200 ease-out"
                  style={{ transform: `scaleX(${Math.max(0.12, progress / 100)})` }}
                />
              </div>

              {canForceOpen && (
                <button
                  type="button"
                  onClick={() => {
                    forceOpenAlbum();
                    setBootCurtainOpen(true);
                    window.setTimeout(() => markUnmounted(), 320);
                  }}
                  className="mt-5 rounded-lg border border-white/20 bg-white/10 px-4 py-1.5 font-sans text-xs font-semibold text-[#F3F1EA] transition-colors hover:bg-white/20"
                >
                  Buka halaman sekarang
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightweight Architectural Route Veil */}
      <AnimatePresence>
        {routeVeilActive && (
          <motion.div
            key="editorial-route-veil"
            aria-hidden="true"
            initial={{ opacity: 0, scaleY: 0.96 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 1.02 }}
            transition={{ duration: 0.16, ease: MOTION_EASE.curtain }}
            className="pointer-events-none fixed inset-0 z-[90] origin-top bg-background/80 backdrop-blur-[3px] will-change-transform"
          >
            <div className="mx-auto mt-16 flex max-w-xs items-center justify-center gap-2 rounded-full border border-border bg-card/90 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground shadow-sm">
              <span className="size-1.5 rounded-full bg-[var(--accent-gold)] animate-pulse" />
              <span>Membuka lembaran...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panggung Konten Halaman */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0.92, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: MOTION_EASE.luxury }}
        data-vanishing-stage
        className="w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
