"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap-utils";
import { useLoading } from "@/lib/loading-context";
import { useVisualTier } from "@/lib/visual-tier";
import { notifyRouteTransitionStart } from "@/lib/use-public-data";
import { prefersReducedMotion } from "@/lib/motion-tokens";

export interface VanishingRouterLike {
  push: (href: string) => void;
}

type LoaderPhase = "initial" | "entering" | "looping" | "fading" | "idle";

interface DotMatrixController {
  startRouteTransition: (targetHref: string, onPush: () => void) => void;
}

let activeController: DotMatrixController | null = null;

/**
 * Navigasi SPA dengan layar penuh matriks titik-titik:
 * Overlay tetap ber-loop penuh sampai rute baru 100% terpasang,
 * seluruh placeholder loading hilang, font & gambar utama terdekode,
 * dan kanvas 3D/Koran benar-benar sudah tergambar — baru memudar perlahan.
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

/**
 * Memastikan elemen <img> yang tampak di layar (above-the-fold) telah selesai
 * dimuat dan didekode ke GPU sebelum overlay matriks titik-titik memudar.
 */
async function decodeVisibleImages(maxWaitMs = 850): Promise<void> {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const vw = window.innerWidth || 1280;
  const vh = window.innerHeight || 800;

  const imgs = Array.from(
    document.querySelectorAll<HTMLImageElement>("main img")
  ).filter((img) => {
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    return rect.top < vh * 1.05 && rect.bottom > -20 && rect.left < vw * 1.05;
  });

  if (imgs.length === 0) return;

  const waitOne = (img: HTMLImageElement) =>
    new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const decodeNow = () => {
        if (typeof img.decode === "function") {
          img.decode().then(done).catch(done);
        } else {
          done();
        }
      };

      if (img.complete) {
        if (img.naturalWidth > 0) {
          decodeNow();
        } else {
          done();
        }
        return;
      }

      img.addEventListener("load", decodeNow, { once: true });
      img.addEventListener("error", done, { once: true });
    });

  await Promise.race([
    Promise.all(imgs.map(waitOne)),
    new Promise<void>((resolve) => window.setTimeout(resolve, maxWaitMs)),
  ]);
}

/**
 * Cek sinkron apakah DOM halaman aktif sudah 100% terpasang dan siap terlihat di layar
 * (tidak kosong polos putih, tidak sedang Suspense loading, tidak sedang dynamic loading).
 */
function inspectDomPaintReadiness(
  expectsSceneReady: boolean,
  sceneReady: boolean
): { ready: boolean; reason: string } {
  if (typeof document === "undefined") {
    return { ready: false, reason: "Menyiapkan dokumen..." };
  }

  if (
    document.readyState !== "complete" &&
    document.readyState !== "interactive"
  ) {
    return { ready: false, reason: "Memuat sumber daya halaman..." };
  }

  // 1. Pastikan Next.js route fallback (app/loading.tsx) sudah benar-benar hilang
  if (document.querySelector('[data-route-loading="true"]')) {
    return { ready: false, reason: "Menyiapkan lembaran halaman..." };
  }

  // 2. Pastikan semua komponen dynamic above-the-fold sudah terpasang
  if (document.querySelector('main [data-dynamic-loading="true"]')) {
    return { ready: false, reason: "Memuat panggung visual..." };
  }

  // 3. Pastikan <main> sudah memiliki konten visual nyata (bukan putih kosong)
  const mainEl = document.querySelector("main");
  if (!mainEl) {
    return { ready: false, reason: "Menyusun tata letak..." };
  }

  const mainRect = mainEl.getBoundingClientRect();
  const mainStyle = window.getComputedStyle(mainEl);
  if (
    mainRect.height < 120 ||
    mainStyle.visibility === "hidden" ||
    Number.parseFloat(mainStyle.opacity || "1") < 0.25
  ) {
    return { ready: false, reason: "Menata tampilan layar..." };
  }

  const hasText = (mainEl.textContent || "").trim().length >= 8;
  const hasVisualNode = Boolean(
    mainEl.querySelector("img, canvas, svg, h1, h2, section, article")
  );
  if (!hasText && !hasVisualNode) {
    return { ready: false, reason: "Menampilkan isi halaman..." };
  }

  // 4. Jika halaman memiliki scene 3D / LeafThrough di area utama, pastikan sinyal siap + kanvas tergambar (>0px)
  const hasInteractiveCanvasStage = Boolean(
    mainEl.querySelector('[data-testid="scene-shell"]') ||
      mainEl.querySelector("[data-scene-canvas]") ||
      mainEl.querySelector("[data-leafthrough]")
  );

  if (expectsSceneReady || hasInteractiveCanvasStage) {
    if (!sceneReady) {
      return { ready: false, reason: "Merender panggung 3D & koran..." };
    }
    const canvases = Array.from(
      mainEl.querySelectorAll<HTMLCanvasElement>(
        'canvas[data-scene-canvas], [data-testid="scene-shell"] canvas, [data-leafthrough] canvas'
      )
    );
    const hasUnpaintedCanvas = canvases.some((c) => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (c.width === 0 || c.height === 0);
    });
    if (hasUnpaintedCanvas) {
      return { ready: false, reason: "Menyelesaikan frame pertama..." };
    }
  }

  return { ready: true, reason: "Halaman siap ditampilkan" };
}

function waitTwoAnimationFrames(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

const SAFETY_AUTO_OPEN_MS = 2500;

export function VanishingPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { tier } = useVisualTier();
  const {
    isReady: isInitialAppReady,
    canForceOpen,
    forceOpenAlbum,
    markUnmounted,
  } = useLoading();

  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = React.useState<LoaderPhase>("initial");
  const [statusLabel, setStatusLabel] = React.useState("Memuat halaman...");
  const [routeCanForceOpen, setRouteCanForceOpen] = React.useState(false);

  const phaseRef = React.useRef<LoaderPhase>("initial");
  const pendingPushRef = React.useRef<(() => void) | null>(null);
  const targetPathRef = React.useRef<string | null>(null);
  const isFirstMountRef = React.useRef(true);
  const activeFadeTweenRef = React.useRef<gsap.core.Tween | null>(null);
  const routeEscapeTimerRef = React.useRef<number | null>(null);
  const sceneReadyFlagRef = React.useRef<boolean>(false);
  const has3DSceneFlagRef = React.useRef<boolean>(false);

  const setPhaseSynced = React.useCallback((next: LoaderPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.visualTier = tier;
  }, [tier]);

  const clearRouteTimers = React.useCallback(() => {
    if (routeEscapeTimerRef.current !== null) {
      window.clearTimeout(routeEscapeTimerRef.current);
      routeEscapeTimerRef.current = null;
    }
  }, []);

  /**
   * Memudarkan layar matriks titik-titik secara perlahan & lembut
   * HANYA setelah elemen utama halaman siap di layar atau saat safety timeout 2.5 detik tercapai.
   */
  const fadeOutSlowly = React.useCallback(
    (isInitialBoot = false) => {
      if (phaseRef.current === "fading" || phaseRef.current === "idle") return;
      clearRouteTimers();
      setRouteCanForceOpen(false);
      setPhaseSynced("fading");

      const overlay = overlayRef.current;
      const stage = stageRef.current;
      const reduced = prefersReducedMotion();

      activeFadeTweenRef.current?.kill();

      if (stage && !reduced) {
        gsap.fromTo(
          stage,
          { opacity: 0.94 },
          {
            opacity: 1,
            duration: 0.42,
            ease: "power2.out",
            clearProps: "opacity",
          }
        );
      }

      if (!overlay) {
        setPhaseSynced("idle");
        if (isInitialBoot) markUnmounted();
        return;
      }

      activeFadeTweenRef.current = gsap.to(overlay, {
        opacity: 0,
        duration: reduced ? 0.16 : 0.48,
        ease: "power2.inOut",
        onComplete: () => {
          setPhaseSynced("idle");
          if (isInitialBoot) {
            markUnmounted();
          }
        },
      });
    },
    [clearRouteTimers, markUnmounted, setPhaseSynced]
  );

  /**
   * Menunggu kesiapan tampilan aktual halaman (DOM, font, gambar above-the-fold,
   * bebas route/dynamic skeleton, dan scene 3D/Koran selesai render) dengan MutationObserver + poll.
   */
  const waitUntilPageFullyPainted = React.useCallback(
    (
      isInitialBoot: boolean,
      signal: { cancelled: boolean }
    ) => {
      let resolving = false;

      const checkNow = async () => {
        if (signal.cancelled || resolving) return;
        if (phaseRef.current === "fading" || phaseRef.current === "idle") return;

        const status = inspectDomPaintReadiness(
          has3DSceneFlagRef.current,
          sceneReadyFlagRef.current
        );
        if (!status.ready) {
          setStatusLabel(status.reason);
          return;
        }

        resolving = true;
        try {
          if (typeof document !== "undefined" && "fonts" in document) {
            await Promise.race([
              document.fonts.ready,
              new Promise<void>((r) => window.setTimeout(r, 500)),
            ]).catch(() => {});
          }
          if (signal.cancelled) return;

          setStatusLabel("Menyelesaikan pemuatan foto...");
          await decodeVisibleImages(850);
          if (signal.cancelled) return;

          // Tunggu 2 frame komposit GPU tanpa jeda buatan panjang
          await waitTwoAnimationFrames();
          if (signal.cancelled) return;

          const recheck = inspectDomPaintReadiness(
            has3DSceneFlagRef.current,
            sceneReadyFlagRef.current
          );
          if (!recheck.ready) {
            setStatusLabel(recheck.reason);
            resolving = false;
            return;
          }

          fadeOutSlowly(isInitialBoot);
        } finally {
          const currentPhase = phaseRef.current as LoaderPhase;
          if (!signal.cancelled && currentPhase !== "fading" && currentPhase !== "idle") {
            resolving = false;
          }
        }
      };

      const observer = new MutationObserver(() => {
        void checkNow();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-route-loading", "data-dynamic-loading", "class"],
      });

      const pollId = window.setInterval(() => {
        void checkNow();
      }, 80);

      void checkNow();

      return () => {
        observer.disconnect();
        window.clearInterval(pollId);
      };
    },
    [fadeOutSlowly]
  );

  // 1. Pantau sinyal scene 3D / Koran sepanjang hidup aplikasi
  React.useEffect(() => {
    const onSceneLoading = (ev: Event) => {
      has3DSceneFlagRef.current = true;
      sceneReadyFlagRef.current = false;
      const detail = (ev as CustomEvent<{ label?: string }>).detail;
      if (detail?.label) {
        setStatusLabel(detail.label);
      }
    };

    const onSceneReady = () => {
      sceneReadyFlagRef.current = true;
    };

    window.addEventListener("app:scene-loading", onSceneLoading);
    window.addEventListener("app:scene-ready", onSceneReady);
    return () => {
      window.removeEventListener("app:scene-loading", onSceneLoading);
      window.removeEventListener("app:scene-ready", onSceneReady);
    };
  }, []);

  // 1B. Safety Timeout 2.5 Detik saat Initial Boot: otomatis pudar mulus bila ada aset lambat
  React.useEffect(() => {
    if (phase !== "initial") return;
    const bootEscape = window.setTimeout(() => {
      if (phaseRef.current === "initial") {
        sceneReadyFlagRef.current = true;
        forceOpenAlbum();
        fadeOutSlowly(true);
      }
    }, SAFETY_AUTO_OPEN_MS);
    return () => window.clearTimeout(bootEscape);
  }, [phase, forceOpenAlbum, fadeOutSlowly]);

  // 2. Siklus Awal Buka / Refresh Situs:
  //    Tetap loop titik-titik hingga LoadingContext siap DAN halaman siap tergambar!
  React.useEffect(() => {
    if (phase !== "initial") return;
    if (!isInitialAppReady) return;

    const signal = { cancelled: false };
    const cleanup = waitUntilPageFullyPainted(true, signal);
    return () => {
      signal.cancelled = true;
      cleanup();
    };
  }, [phase, isInitialAppReady, waitUntilPageFullyPainted]);

  // 3. Daftarkan controller navigasi SPA untuk transisi antar menu
  React.useEffect(() => {
    activeController = {
      startRouteTransition: (targetHref: string, onPush: () => void) => {
        clearRouteTimers();
        activeFadeTweenRef.current?.kill();

        has3DSceneFlagRef.current = false;
        sceneReadyFlagRef.current = false;
        targetPathRef.current = targetHref.split("?")[0] || targetHref;
        pendingPushRef.current = onPush;
        setRouteCanForceOpen(false);
        setStatusLabel("Membuka lembaran...");
        setPhaseSynced("entering");

        // Safety timeout 2.5 detik: otomatis pudar mulus saat timeout tercapai agar user tidak tertahan lama
        routeEscapeTimerRef.current = window.setTimeout(() => {
          if (
            phaseRef.current === "entering" ||
            phaseRef.current === "looping"
          ) {
            sceneReadyFlagRef.current = true;
            setRouteCanForceOpen(true);
            fadeOutSlowly(false);
          }
        }, SAFETY_AUTO_OPEN_MS);
      },
    };

    return () => {
      activeController = null;
      clearRouteTimers();
      activeFadeTweenRef.current?.kill();
    };
  }, [clearRouteTimers, fadeOutSlowly, setPhaseSynced]);

  // 4. Jalankan fade-in halus saat overlay baru terpasang pada fase "entering", lalu push rute
  React.useEffect(() => {
    if (phase !== "entering") return;
    const overlay = overlayRef.current;
    const pushNow = () => {
      const fn = pendingPushRef.current;
      pendingPushRef.current = null;
      setPhaseSynced("looping");
      fn?.();
    };

    const reduced = prefersReducedMotion();
    if (!overlay || reduced) {
      if (overlay) gsap.set(overlay, { opacity: 1 });
      pushNow();
      return;
    }

    activeFadeTweenRef.current?.kill();
    gsap.set(overlay, { opacity: 0 });
    activeFadeTweenRef.current = gsap.to(overlay, {
      opacity: 1,
      duration: 0.2,
      ease: "power2.out",
      onComplete: pushNow,
    });
  }, [phase, setPhaseSynced]);

  // 5. Saat pathname sudah benar-benar berpindah ke rute tujuan:
  //    Tunggu sampai 100% DOM, font, gambar, & scene 3D/Koran tergambar penuh — BARU pudar perlahan!
  React.useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (phaseRef.current === "idle") return;

    // Jika rute tujuan belum cocok (misal navigasi masih streaming), tetap looping
    if (targetPathRef.current && pathname !== targetPathRef.current) {
      return;
    }
    targetPathRef.current = null;

    const signal = { cancelled: false };
    let cleanupObserver: (() => void) | null = null;

    // Beri 2 frame awal agar halaman rute baru sempat memasang komponen dynamic / app:scene-loading
    const startTimer = window.setTimeout(() => {
      if (signal.cancelled) return;
      cleanupObserver = waitUntilPageFullyPainted(false, signal);
    }, 60);

    return () => {
      signal.cancelled = true;
      window.clearTimeout(startTimer);
      cleanupObserver?.();
    };
  }, [pathname, phase, waitUntilPageFullyPainted]);

  // 6. Loop Canvas Matriks Titik-Titik Ringan (60fps, Single Canvas, berhenti total saat phase === "idle")
  const isOverlayActive = phase !== "idle";

  React.useEffect(() => {
    if (!isOverlayActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let isDark = document.documentElement.classList.contains("dark");

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      isDark = document.documentElement.classList.contains("dark");
    };
    resize();

    const startTime = performance.now();

    const drawDotMatrix = (now: number) => {
      if (document.hidden) {
        rafId = window.requestAnimationFrame(drawDotMatrix);
        return;
      }

      const t = reduced ? 0 : (now - startTime) * 0.001;
      ctx.clearRect(0, 0, width, height);

      const spacing = width < 640 ? 22 : 26;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const offsetX = (width - (cols - 1) * spacing) * 0.5;
      const offsetY = (height - (rows - 1) * spacing) * 0.5;
      const cx = width * 0.5;
      const cy = height * 0.5;
      const maxDist = Math.hypot(cx, cy) || 1;

      const dotRgb = isDark ? "235, 227, 211" : "35, 31, 26";

      for (let r = 0; r < rows; r++) {
        const y = offsetY + r * spacing;
        const dy = y - cy;
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * spacing;
          const dx = x - cx;
          const dist = Math.hypot(dx, dy);
          const normDist = dist / maxDist;

          const wave = reduced
            ? 0.5
            : 0.5 + 0.5 * Math.sin(dist * 0.022 - t * 3.6);
          const radialFade = 1 - normDist * 0.35;
          const radius = 1.05 + wave * 1.45;
          const alpha = (0.14 + wave * 0.42) * radialFade;

          ctx.fillStyle = `rgba(${dotRgb}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduced) {
        rafId = window.requestAnimationFrame(drawDotMatrix);
      }
    };

    rafId = window.requestAnimationFrame(drawDotMatrix);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [isOverlayActive]);

  const showForceOpenButton =
    (phase === "initial" && canForceOpen) ||
    ((phase === "looping" || phase === "entering") && routeCanForceOpen);

  return (
    <div className="relative w-full">
      {/* Layar Penuh Matriks Titik-Titik Lama (Loop sampai 100% elemen halaman siap dilihat -> Pudar Perlahan) */}
      {isOverlayActive && (
        <div
          ref={overlayRef}
          role="status"
          aria-live="polite"
          aria-label="Memuat halaman UNO XII PPLG 1"
          data-dot-matrix-loader="true"
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-background text-foreground will-change-[opacity]"
          style={{
            pointerEvents: phase === "fading" ? "none" : "auto",
          }}
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          <div className="relative z-10 flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-background/88 px-7 py-5 text-center shadow-sm backdrop-blur-[2px]">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-foreground animate-pulse" />
              <span>UNO · XII PPLG 1</span>
              <span className="inline-block size-1.5 rounded-full bg-foreground animate-pulse" />
            </div>

            <p className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Ruang Kenangan MAKN Ende
            </p>

            <div className="flex items-center gap-2 pt-0.5" aria-hidden="true">
              <span className="size-1.5 rounded-full bg-foreground/75 animate-bounce [animation-delay:0ms] [animation-duration:1.1s]" />
              <span className="size-1.5 rounded-full bg-foreground/75 animate-bounce [animation-delay:180ms] [animation-duration:1.1s]" />
              <span className="size-1.5 rounded-full bg-foreground/75 animate-bounce [animation-delay:360ms] [animation-duration:1.1s]" />
            </div>

            <p className="font-mono text-[11px] tracking-wider text-muted-foreground">
              {statusLabel}
            </p>

            {showForceOpenButton && (
              <button
                type="button"
                onClick={() => {
                  if (phase === "initial") {
                    forceOpenAlbum();
                  }
                  fadeOutSlowly(phase === "initial");
                }}
                className="mt-1 rounded-lg border border-border bg-card px-3.5 py-1.5 font-sans text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Buka halaman sekarang
              </button>
            )}
          </div>
        </div>
      )}

      {/* Panggung Konten Halaman */}
      <div ref={stageRef} data-vanishing-stage className="w-full">
        {children}
      </div>
    </div>
  );
}
