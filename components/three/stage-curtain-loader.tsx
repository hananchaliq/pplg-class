"use client";

import * as React from "react";
import { UnoLogo } from "@/components/ui/uno-logo";
import { gsap } from "@/lib/gsap-utils";

export interface StageCurtainLoaderProps {
  /** Whether the scene or page has finished loading */
  ready: boolean;
  /** Loading progress percentage (0 - 100) */
  progress?: number;
  /** Descriptive status text while preparing the archive */
  label?: string;
  /** Optional subtitle or title */
  sceneTitle?: string;
  /** Whether rendered at full-viewport root level (fixed inset-0 z-50) */
  fullViewport?: boolean;
}

/**
 * Loading Screen Monokrom "Film Dikokang / Proyektor 35mm" (CSS + GSAP, tanpa 3D berat).
 * Menutupi viewport saat halaman pertama dimuat hingga aset siap, lalu keluar fade-out halus.
 */
export function StageCurtainLoader({
  ready,
  progress = 25,
  label = "Memasang gulungan film 35mm...",
  sceneTitle = "ARSIP FILM · UNO XII PPLG 1",
  fullViewport = false,
}: StageCurtainLoaderProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const reelLeftRef = React.useRef<SVGSVGElement | null>(null);
  const reelRightRef = React.useRef<SVGSVGElement | null>(null);
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const [unmounted, setUnmounted] = React.useState(false);
  const [fadingOut, setFadingOut] = React.useState(false);

  React.useEffect(() => {
    if (!ready) {
      setUnmounted(false);
      setFadingOut(false);
    }
  }, [ready]);

  React.useEffect(() => {
    if (unmounted) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      if (reelLeftRef.current) {
        gsap.to(reelLeftRef.current, {
          rotation: 360,
          duration: 3.4,
          repeat: -1,
          ease: "none",
          transformOrigin: "50% 50%",
        });
      }
      if (reelRightRef.current) {
        gsap.to(reelRightRef.current, {
          rotation: 360,
          duration: 3.4,
          repeat: -1,
          ease: "none",
          transformOrigin: "50% 50%",
        });
      }
      if (stripRef.current) {
        gsap.fromTo(
          stripRef.current,
          { xPercent: 0 },
          {
            xPercent: -12.5,
            duration: 1.6,
            repeat: -1,
            ease: "steps(4)",
          }
        );
      }
      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [unmounted]);

  React.useEffect(() => {
    if (!ready || unmounted) return;
    setFadingOut(true);
    const t = window.setTimeout(() => {
      setUnmounted(true);
    }, 520);
    return () => window.clearTimeout(t);
  }, [ready, unmounted]);

  if (unmounted) return null;

  const clampedProgress = Math.min(100, Math.max(8, Math.round(progress)));

  return (
    <div
      ref={rootRef}
      aria-live="polite"
      aria-busy={!ready}
      data-testid="stage-curtain-loader"
      className={`${
        fullViewport ? "fixed inset-0 z-50" : "absolute inset-0 z-30"
      } flex flex-col items-center justify-center overflow-hidden bg-[#241E18] px-4 text-[#EFE5CE] select-none transition-opacity duration-500 ease-out ${
        fadingOut ? "opacity-0" : "opacity-100"
      } ${ready ? "pointer-events-none" : "pointer-events-auto"}`}
    >
      {/* Lubang Sprocket Strip Film 35mm Atas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-8 overflow-hidden border-b border-[#463B2E] bg-[#2C241C]"
      >
        <div
          ref={stripRef}
          className="flex h-full w-[125%] items-center justify-around gap-4 px-2"
        >
          {Array.from({ length: 28 }).map((_, idx) => (
            <span
              key={idx}
              className="h-3.5 w-5 shrink-0 rounded-[2px] border border-[#5A4C3C] bg-[#1F1A14]"
            />
          ))}
        </div>
      </div>

      {/* Lubang Sprocket Strip Film 35mm Bawah */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 overflow-hidden border-t border-[#463B2E] bg-[#2C241C]"
      >
        <div className="flex h-full w-full items-center justify-around gap-4 px-2">
          {Array.from({ length: 24 }).map((_, idx) => (
            <span
              key={idx}
              className="h-3.5 w-5 shrink-0 rounded-[2px] border border-[#5A4C3C] bg-[#1F1A14]"
            />
          ))}
        </div>
      </div>

      {/* Vignette Ruang Gelap Sepia */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(239,229,206,0.08) 0%, rgba(36,30,24,0.88) 76%)",
        }}
      />

      {/* Kartu Proyektor & Progres Kertas Film */}
      <div
        ref={cardRef}
        className={`relative z-10 flex w-full max-w-sm flex-col items-center rounded-xl border border-[#5A4C3C] bg-[#2D241C]/95 px-6 py-6 text-center shadow-[0_24px_60px_rgba(24,18,12,0.62)] transition-transform duration-300 ${
          ready ? "translate-y-2 scale-[0.98]" : "translate-y-0 scale-100"
        }`}
      >
        {/* Dua Roda Rol Proyektor 35mm */}
        <div
          aria-hidden="true"
          className="mb-3 flex items-center justify-center gap-4 text-[#C9B794]"
        >
          <svg
            ref={reelLeftRef}
            viewBox="0 0 40 40"
            className="size-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <circle cx="20" cy="20" r="16" />
            <circle cx="20" cy="20" r="4" />
            <circle cx="20" cy="10" r="2.2" />
            <circle cx="28.6" cy="25" r="2.2" />
            <circle cx="11.4" cy="25" r="2.2" />
          </svg>
          <UnoLogo size="sm" />
          <svg
            ref={reelRightRef}
            viewBox="0 0 40 40"
            className="size-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <circle cx="20" cy="20" r="16" />
            <circle cx="20" cy="20" r="4" />
            <circle cx="20" cy="10" r="2.2" />
            <circle cx="28.6" cy="25" r="2.2" />
            <circle cx="11.4" cy="25" r="2.2" />
          </svg>
        </div>

        <p className="font-mono text-[11px] tracking-[0.2em] text-[#C9B794] uppercase">
          {sceneTitle}
        </p>
        <p className="mt-1.5 font-serif text-lg font-bold text-[#EFE5CE]">
          {label}
        </p>

        {/* Progress Film Counter */}
        <div className="mt-4 flex w-full items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#463B2E]">
            <div
              className="h-full rounded-full bg-[#EFE5CE] transition-all duration-200 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <span className="font-mono text-xs tabular-nums text-[#E5D7B9]">
            {clampedProgress}%
          </span>
        </div>

        <p className="mt-2.5 font-mono text-[10px] tracking-widest text-[#B0A595] uppercase">
          FRAME NO. {String(Math.max(1, Math.round(clampedProgress / 3))).padStart(2, "0")} · 35MM VINTAGE
        </p>
      </div>
    </div>
  );
}
