"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap-utils";
import { useVisualTier } from "@/lib/visual-tier";
import { notifyRouteTransitionStart } from "@/lib/use-public-data";

export interface VanishingRouterLike {
  push: (href: string) => void;
}

interface DotNode {
  x: number;
  y: number;
  /** Posisi diagonal ternormalisasi: 0.0 di pojok kiri-atas, 1.0 di pojok kanan-bawah */
  diag: number;
  /** Offset harmonik tipis agar kemunculan titik terasa organik dan hidup */
  jitter: number;
  /** Skala ukuran titik */
  scale: number;
  /** Apakah titik mendapat aksen kilau emas antik tipis */
  isWarmAccent: boolean;
}

interface MicroDotController {
  playExit: (onReadyToPush: () => void) => void;
}

let activeController: MicroDotController | null = null;
let pendingExitPushTimer: number | null = null;

/**
 * Navigasi SPA dengan transisi matriks titik-titik kecil (Micro-Dot Screen Reveal):
 * Titik-titik menyapu halus dari pojok kiri-atas ke ujung kanan-bawah dan terus
 * melakukan looping sampai halaman tujuan benar-benar siap dibuka.
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

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const isSimple = document.documentElement.dataset.visualTier === "simple";

  if (prefersReduced || !activeController) {
    pushRoute();
    return;
  }

  if (isSimple) {
    const stageEl = document.querySelector(
      "[data-vanishing-stage]"
    ) as HTMLElement | null;
    if (!stageEl) {
      pushRoute();
      return;
    }
    gsap.killTweensOf(stageEl);
    gsap.to(stageEl, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: pushRoute,
    });
    return;
  }

  if (pendingExitPushTimer !== null) {
    window.clearTimeout(pendingExitPushTimer);
    pendingExitPushTimer = null;
  }

  activeController.playExit(pushRoute);
}

function buildDotGrid(width: number, height: number): DotNode[] {
  const pitch = width < 640 ? 22 : 25;
  const cols = Math.max(8, Math.ceil(width / pitch) + 1);
  const rows = Math.max(8, Math.ceil(height / pitch) + 1);
  const maxCol = Math.max(1, cols - 1);
  const maxRow = Math.max(1, rows - 1);

  const nodes: DotNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = c / maxCol;
      const ny = r / maxRow;
      // Pojok kiri atas (0,0) -> 0.0; Pojok kanan bawah (1,1) -> 1.0
      const diag = nx * 0.54 + ny * 0.46;
      const wave = Math.sin(c * 1.45 + r * 2.15) * 0.028;
      const pulse = Math.cos(c * 0.85 - r * 1.3) * 0.014;
      const scale = 0.78 + ((c * 7 + r * 13) % 5) * 0.11;
      const isWarmAccent = (c * 3 + r * 5) % 7 === 0;
      nodes.push({
        x: c * pitch + (r % 2 === 0 ? 0 : pitch * 0.22),
        y: r * pitch,
        diag,
        jitter: wave + pulse,
        scale,
        isWarmAccent,
      });
    }
  }
  return nodes;
}

export function VanishingPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { tier } = useVisualTier();
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const gridRef = React.useRef<DotNode[]>([]);
  const viewportRef = React.useRef<{ w: number; h: number; dpr: number }>({
    w: 0,
    h: 0,
    dpr: 1,
  });
  const activeTweenRef = React.useRef<gsap.core.Tween | null>(null);
  const scenePendingRef = React.useRef(false);

  React.useEffect(() => {
    document.documentElement.dataset.visualTier = tier;
  }, [tier]);

  // Pantau event scene 3D agar loop micro-dot menunggu scene siap jika sedang dimuat
  React.useEffect(() => {
    const onLoading = () => {
      scenePendingRef.current = true;
    };
    const onReady = () => {
      scenePendingRef.current = false;
    };
    window.addEventListener("app:scene-loading", onLoading);
    window.addEventListener("app:scene-ready", onReady);
    return () => {
      window.removeEventListener("app:scene-loading", onLoading);
      window.removeEventListener("app:scene-ready", onReady);
    };
  }, []);

  const syncCanvasMetrics = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (
      viewportRef.current.w !== w ||
      viewportRef.current.h !== h ||
      viewportRef.current.dpr !== dpr
    ) {
      viewportRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      gridRef.current = buildDotGrid(w, h);
    }
  }, []);

  const drawFrame = React.useCallback(
    (progress: number, phase: "exit" | "loop" | "enter") => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w, h, dpr } = viewportRef.current;
      if (w <= 0 || h <= 0) return;

      const isDark = document.documentElement.classList.contains("dark");
      const veilRgb = isDark ? "28, 25, 22" : "239, 229, 206";
      const dotInkRgb = isDark ? "235, 227, 211" : "45, 36, 28";
      const dotGoldRgb = isDark ? "216, 180, 103" : "172, 124, 52";

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const bandWidth = 0.26;

      // 1. Selubung kertas kecreaman/sepia (hampir pekat agar konten transisi/loading di bawah tidak tembus)
      if (phase === "loop") {
        ctx.fillStyle = `rgba(${veilRgb}, 0.985)`;
        ctx.fillRect(0, 0, w, h);
      } else if (phase === "enter") {
        // Sapuan pembuka terakhir dari kiri-atas ke kanan-bawah
        const frontPos = progress;
        const grad = ctx.createLinearGradient(0, 0, w, h);
        const startStop = Math.max(0, Math.min(1, frontPos - bandWidth * 0.55));
        const endStop = Math.max(
          startStop,
          Math.min(1, frontPos + bandWidth * 0.45)
        );
        const veilAlpha = Math.max(0, Math.min(0.985, 1.18 - progress * 0.92));

        if (endStop > 0 && veilAlpha > 0.01) {
          grad.addColorStop(0, `rgba(${veilRgb}, 0)`);
          if (startStop > 0) {
            grad.addColorStop(startStop, `rgba(${veilRgb}, 0)`);
          }
          grad.addColorStop(endStop, `rgba(${veilRgb}, ${veilAlpha})`);
          if (endStop < 1) {
            grad.addColorStop(1, `rgba(${veilRgb}, ${veilAlpha})`);
          }
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        // Phase "exit": selubung menyapu masuk dari kiri-atas ke kanan-bawah
        const frontPos = progress;
        const grad = ctx.createLinearGradient(0, 0, w, h);
        const startStop = Math.max(0, Math.min(1, frontPos - bandWidth * 0.7));
        const endStop = Math.max(
          startStop,
          Math.min(1, frontPos + bandWidth * 0.2)
        );
        const maxAlpha = Math.min(0.985, 0.55 + progress * 0.46);

        grad.addColorStop(0, `rgba(${veilRgb}, ${maxAlpha})`);
        if (startStop > 0) {
          grad.addColorStop(startStop, `rgba(${veilRgb}, ${maxAlpha})`);
        }
        grad.addColorStop(endStop, `rgba(${veilRgb}, 0.06)`);
        if (endStop < 1) {
          grad.addColorStop(1, `rgba(${veilRgb}, 0)`);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Matriks titik-titik kecil
      const nodes = gridRef.current;
      const spread = 0.28;
      const maxRadius = w < 640 ? 2.45 : 2.9;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const triggerAt = node.diag + node.jitter;

        let localT = 0;
        if (phase === "loop") {
          // Gelombang looping mulus tanpa henti dari kiri-atas (0) ke kanan-bawah (1)
          const cycle = ((progress - triggerAt * 0.72) % 1 + 1) % 1;
          // Gelombang aktif pada 42% fase siklus lalu meluruh, memberi efek ombak titik terus mengalir
          localT = cycle < 0.44 ? cycle / 0.44 : -1;
        } else {
          localT = (progress - triggerAt) / spread;
        }

        if (localT <= 0 || localT >= 1.15) continue;

        const clampedT = Math.min(1, Math.max(0, localT));
        const easeBloom =
          clampedT < 0.38
            ? Math.sin((clampedT / 0.38) * (Math.PI * 0.5))
            : Math.cos(((clampedT - 0.38) / 0.62) * (Math.PI * 0.5));

        const tailSpark =
          phase === "exit"
            ? Math.max(0.24, easeBloom)
            : Math.pow(Math.max(0, easeBloom), 0.85);

        const radius =
          Math.max(0.4, maxRadius * node.scale * tailSpark) *
          (0.92 + 0.08 * Math.sin(clampedT * Math.PI * 3));

        const alpha =
          phase === "exit"
            ? Math.min(0.9, 0.3 + easeBloom * 0.6)
            : Math.min(0.92, tailSpark * 0.88);

        if (alpha <= 0.02) continue;

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${
          node.isWarmAccent ? dotGoldRgb : dotInkRgb
        }, ${alpha})`;
        ctx.fill();

        if (clampedT > 0.16 && clampedT < 0.64 && node.isWarmAccent) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 2.1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${dotGoldRgb}, ${alpha * 0.22})`;
          ctx.fill();
        }
      }

      // Garis kilau diagonal lembut saat gelombang berjalan
      const waveHead = phase === "loop" ? progress % 1 : progress;
      if (waveHead > 0 && waveHead < 1.05) {
        const cx = waveHead * w;
        const cy = waveHead * h;
        const glow = ctx.createRadialGradient(
          cx,
          cy,
          10,
          cx,
          cy,
          Math.max(w, h) * 0.34
        );
        glow.addColorStop(0, `rgba(${dotGoldRgb}, 0.1)`);
        glow.addColorStop(1, `rgba(${dotGoldRgb}, 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.restore();
    },
    []
  );

  const runLoopingLoadAndReveal = React.useCallback(() => {
    const canvas = canvasRef.current;
    const stageEl = stageRef.current;
    if (!canvas || !stageEl) return () => {};

    syncCanvasMetrics();

    if (activeTweenRef.current) {
      activeTweenRef.current.kill();
      activeTweenRef.current = null;
    }

    let cancelled = false;
    canvas.style.display = "block";
    canvas.style.opacity = "1";

    // Loop tak berhenti selama halaman & aset utama masih bersiap
    const loopState = { phase: 0 };
    drawFrame(0, "loop");

    gsap.killTweensOf(stageEl);
    gsap.set(stageEl, { opacity: 0.96, scale: 0.995 });

    activeTweenRef.current = gsap.to(loopState, {
      phase: 1,
      duration: 0.95,
      repeat: -1,
      ease: "none",
      onUpdate: () => {
        if (!cancelled) {
          drawFrame(loopState.phase, "loop");
        }
      },
    });

    const triggerFinalReveal = () => {
      if (cancelled) return;
      if (activeTweenRef.current) {
        activeTweenRef.current.kill();
        activeTweenRef.current = null;
      }

      const revealState = { progress: -0.05 };
      drawFrame(revealState.progress, "enter");

      gsap.to(stageEl, {
        opacity: 1,
        scale: 1,
        duration: 0.9,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });

      gsap.to(canvas, {
        opacity: 0,
        duration: 0.85,
        delay: 0.35,
        ease: "power2.inOut",
      });

      activeTweenRef.current = gsap.to(revealState, {
        progress: 1.35,
        duration: 1.15,
        ease: "power2.inOut",
        onUpdate: () => {
          if (!cancelled) {
            drawFrame(revealState.progress, "enter");
          }
        },
        onComplete: () => {
          activeTweenRef.current = null;
          if (!cancelled) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            canvas.style.opacity = "1";
            canvas.style.display = "none";
          }
        },
      });
    };

    // Tunggu halaman benar-benar siap: tanpa route/dynamic loading, font + gambar + scene 3D + jeda tenang
    const startTime = performance.now();
    const minLoopMs = 760;
    const maxWaitMs = 4500;

    const checkReadiness = async () => {
      // 1. Tunggu Suspense route (`app/loading.tsx`) dan dynamic import selesai digantikan halaman nyata
      while (
        !cancelled &&
        document.querySelector('[data-route-loading="true"], [data-dynamic-loading="true"]') &&
        performance.now() - startTime < maxWaitMs
      ) {
        await new Promise((r) => window.setTimeout(r, 60));
      }

      try {
        if ("fonts" in document) {
          await Promise.race([
            document.fonts.ready,
            new Promise((r) => window.setTimeout(r, 950)),
          ]);
        }
      } catch {
        // Abaikan error font api
      }

      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );

      // Tunggu gambar terlihat pertama di atas lipatan layar (maks 1200ms)
      const visibleImgs = Array.from(document.querySelectorAll("img")).slice(
        0,
        6
      );
      if (visibleImgs.length > 0) {
        await Promise.race([
          Promise.all(
            visibleImgs.map(
              (img) =>
                new Promise<void>((res) => {
                  if (img.complete) {
                    res();
                  } else {
                    img.addEventListener("load", () => res(), { once: true });
                    img.addEventListener("error", () => res(), { once: true });
                  }
                })
            )
          ),
          new Promise<void>((r) => window.setTimeout(r, 1200)),
        ]);
      }

      // Tunggu jika masih ada ruang 3D yang aktif membangun model
      while (
        !cancelled &&
        scenePendingRef.current &&
        performance.now() - startTime < maxWaitMs
      ) {
        await new Promise((r) => window.setTimeout(r, 70));
      }

      const elapsed = performance.now() - startTime;
      const remainingMin = Math.max(0, minLoopMs - elapsed);
      if (remainingMin > 0 && !cancelled) {
        await new Promise((r) => window.setTimeout(r, remainingMin));
      }

      // Beri jeda sejenak yang tenang sebelum layar load pudar perlahan
      if (!cancelled) {
        await new Promise((r) => window.setTimeout(r, 340));
      }

      if (!cancelled) {
        triggerFinalReveal();
      }
    };

    void checkReadiness();

    const hardSafetyTimer = window.setTimeout(() => {
      if (!cancelled) triggerFinalReveal();
    }, 5200);

    return () => {
      cancelled = true;
      window.clearTimeout(hardSafetyTimer);
      gsap.killTweensOf(canvas);
      if (activeTweenRef.current) {
        activeTweenRef.current.kill();
        activeTweenRef.current = null;
      }
    };
  }, [drawFrame, syncCanvasMetrics]);

  const runExitSweep = React.useCallback(
    (onReadyToPush: () => void) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        onReadyToPush();
        return;
      }

      syncCanvasMetrics();

      if (activeTweenRef.current) {
        activeTweenRef.current.kill();
        activeTweenRef.current = null;
      }

      canvas.style.display = "block";
      canvas.style.opacity = "1";

      const animState = { progress: 0 };
      drawFrame(animState.progress, "exit");

      let pushed = false;
      const safePush = () => {
        if (pushed) return;
        pushed = true;
        onReadyToPush();
      };

      activeTweenRef.current = gsap.to(animState, {
        progress: 1.15,
        duration: 0.34,
        ease: "power2.inOut",
        onUpdate: () => {
          drawFrame(animState.progress, "exit");
        },
        onComplete: () => {
          safePush();
          // Langsung lanjutkan loop micro-dot tanpa jeda beku saat menunggu route tujuan tiba
          const waitLoop = { phase: 0 };
          drawFrame(0, "loop");
          activeTweenRef.current = gsap.to(waitLoop, {
            phase: 1,
            duration: 0.95,
            repeat: -1,
            ease: "none",
            onUpdate: () => {
              drawFrame(waitLoop.phase, "loop");
            },
          });
        },
      });

      pendingExitPushTimer = window.setTimeout(safePush, 420);
    },
    [drawFrame, syncCanvasMetrics]
  );

  // Daftarkan pengendali global untuk tombol navbar/link SPA
  React.useEffect(() => {
    activeController = {
      playExit: runExitSweep,
    };

    const onResize = () => {
      syncCanvasMetrics();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (activeController?.playExit === runExitSweep) {
        activeController = null;
      }
      if (activeTweenRef.current) {
        activeTweenRef.current.kill();
        activeTweenRef.current = null;
      }
      if (pendingExitPushTimer !== null) {
        window.clearTimeout(pendingExitPushTimer);
        pendingExitPushTimer = null;
      }
    };
  }, [runExitSweep, syncCanvasMetrics]);

  React.useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      gsap.set(el, { clearProps: "all", opacity: 1 });
      if (canvasRef.current) canvasRef.current.style.display = "none";
      return;
    }

    if (tier === "simple") {
      if (canvasRef.current) canvasRef.current.style.display = "none";
      const ctx = gsap.context(() => {
        gsap.fromTo(
          el,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.32,
            ease: "power2.out",
            clearProps: "opacity",
          }
        );
      }, stageRef);
      return () => ctx.revert();
    }

    return runLoopingLoadAndReveal();
  }, [pathname, tier, runLoopingLoadAndReveal]);

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[75] hidden"
      />
      <div
        ref={stageRef}
        data-vanishing-stage
        className="w-full will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
