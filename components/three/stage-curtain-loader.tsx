"use client";

import * as React from "react";
import { UnoLogo } from "@/components/ui/uno-logo";

export interface StageCurtainLoaderProps {
  /** Whether the 3D model/scene or page has finished generating and rendering its initial frame */
  ready: boolean;
  /** Loading progress percentage (0 - 100) */
  progress?: number;
  /** Descriptive status text while generating the 3D scene */
  label?: string;
  /** Optional subtitle or scene title */
  sceneTitle?: string;
  /** Whether rendered at full-viewport root level (fixed inset-0 z-50) */
  fullViewport?: boolean;
}

// Pre-computed 256-step Crimson Velvet 3D PBR Color Lookup Table (Zero string allocation in render loop)
const VELVET_COLOR_LUT: string[] = (() => {
  const lut: string[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * 1.18;
    const rCol = Math.min(242, Math.max(16, Math.round(16 + t * 218)));
    const gCol = Math.min(
      38,
      Math.max(1, Math.round(1 + Math.pow(Math.max(0, t), 2.1) * 24))
    );
    const bCol = Math.min(
      42,
      Math.max(2, Math.round(2 + Math.pow(Math.max(0, t), 1.95) * 28))
    );
    lut[i] = `rgb(${rCol},${gCol},${bCol})`;
  }
  return lut;
})();

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

/**
 * Animasi Tirai Beludru Merah 3D Bioskop/Teater Versi Ultra-Ringan + Fade-Out Halus
 * Menampilkan Kartu Progres Bulat UNO dengan sistem tipografi Memories (Fraunces + Plus Jakarta Sans + Space Mono).
 */
export function StageCurtainLoader({
  ready,
  progress = 25,
  label = "Menyiapkan ruang kenangan...",
  sceneTitle = "ALBUM MEMORIES · UNO XII PPLG 1",
  fullViewport = false,
}: StageCurtainLoaderProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const readyRef = React.useRef(ready);
  const [unmounted, setUnmounted] = React.useState(false);
  const [fadingOut, setFadingOut] = React.useState(false);

  React.useEffect(() => {
    readyRef.current = ready;
    if (!ready) {
      setUnmounted(false);
      setFadingOut(false);
    }
  }, [ready]);

  React.useEffect(() => {
    if (unmounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let openElapsed = 0;
    const openDuration = 1.25;
    const startTime = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const scaleDown = Math.min(
        1,
        820 / Math.max(1, parent.clientWidth),
        480 / Math.max(1, parent.clientHeight)
      );
      const targetW = Math.max(240, Math.floor(parent.clientWidth * scaleDown));
      const targetH = Math.max(160, Math.floor(parent.clientHeight * scaleDown));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const focalLength = 2.4;
    const cols = 42;
    const rows = 10;
    const foldFreq = 8.2;

    interface VertexPoint {
      sx: number;
      sy: number;
      z3d: number;
      u: number;
      v: number;
      primaryWave: number;
      crestShape: number;
      dCrestDu: number;
    }

    const grid: VertexPoint[][] = Array.from({ length: cols + 1 }, () =>
      Array.from({ length: rows + 1 }, () => ({
        sx: 0,
        sy: 0,
        z3d: 0,
        u: 0,
        v: 0,
        primaryWave: 0,
        crestShape: 0,
        dCrestDu: 0,
      }))
    );

    let lastNow = performance.now();
    let lastIdleDraw = 0;
    let fadeTriggered = false;

    const renderFrame = (now: number) => {
      if (!readyRef.current && now - lastIdleDraw < 48) {
        animId = window.requestAnimationFrame(renderFrame);
        return;
      }
      lastIdleDraw = now;

      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      const elapsed = (now - startTime) / 1000;

      if (readyRef.current) {
        openElapsed += dt;
        if (!fadeTriggered && openElapsed >= openDuration * 0.58) {
          fadeTriggered = true;
          setFadingOut(true);
        }
        if (openElapsed >= openDuration) {
          setUnmounted(true);
          return;
        }
      } else {
        openElapsed = 0;
        fadeTriggered = false;
      }

      const rawP = Math.min(1, openElapsed / openDuration);
      const w = canvas.width;
      const h = canvas.height;
      const halfW = w * 0.5;
      const halfH = h * 0.5;

      ctx.clearRect(0, 0, w, h);

      if (!readyRef.current) {
        ctx.fillStyle = "#120203";
        ctx.fillRect(0, 0, w, h);
      }

      const rowOpenArr = new Float32Array(rows + 1);
      for (let r = 0; r <= rows; r++) {
        const v = r / rows;
        const vLag = Math.pow(v, 1.12) * 0.36;
        rowOpenArr[r] = smoothstep(vLag, vLag + 0.64, rawP);
      }

      const sinRawP = Math.sin(rawP * Math.PI);
      const lightShiftX = Math.sin(elapsed * 1.1) * 0.08;

      for (let sIdx = 0; sIdx < 2; sIdx++) {
        const side: -1 | 1 = sIdx === 0 ? -1 : 1;
        const sidePhaseOffset = side === 1 ? 0.75 : 0.0;

        for (let c = 0; c <= cols; c++) {
          const u = c / cols;
          const organicShift = Math.sin(u * Math.PI * 3.0) * 0.32;
          const colArr = grid[c]!;

          for (let r = 0; r <= rows; r++) {
            const v = r / rows;
            const rowOpen = rowOpenArr[r]!;
            const currentSpan = Math.max(0, 1.07 * (1 - rowOpen * 1.03));

            const gatherExp = 1.0 + rowOpen * 0.32 * (1 - v * 0.25);
            const uGathered = Math.pow(u, gatherExp);

            const pullShear = rowOpen * (1 - v) * 0.45;
            const phase =
              u * foldFreq * Math.PI * 2 +
              organicShift -
              pullShear +
              sidePhaseOffset;

            const primaryWave = Math.sin(phase);
            const crestShape =
              primaryWave + Math.sin(phase * 2 - Math.PI * 0.5) * 0.22;

            const baseFoldDepth =
              (0.068 + rowOpen * 0.055) *
              (0.78 + 0.22 * Math.sin(v * Math.PI * 0.8));
            const idleBreath =
              Math.sin(elapsed * 1.8 - v * 2.6 + u * 3.8 + side) *
              0.011 *
              (0.25 + 0.75 * v);
            const pullRipple =
              sinRawP *
              Math.sin(v * Math.PI * 2.2 - rawP * 8.5 + u * 5.0) *
              0.024 *
              u;

            const z3d = crestShape * baseFoldDepth + idleBreath + pullRipple;
            const trochoidPinch =
              -Math.cos(phase) * 0.013 * (1 - rowOpen * 0.45) * currentSpan;

            const distFromOuterWall = uGathered * currentSpan + trochoidPinch;
            const x3d = side * (1.06 - distFromOuterWall);
            const y3d = -1.06 + v * 2.12 + crestShape * 0.008 * v;

            const scale = focalLength / Math.max(0.45, focalLength - z3d);
            const pt = colArr[r]!;
            pt.sx = halfW + x3d * halfW * scale;
            pt.sy = halfH + y3d * halfH * scale;
            pt.z3d = z3d;
            pt.u = u;
            pt.v = v;
            pt.primaryWave = primaryWave;
            pt.crestShape = crestShape;
            pt.dCrestDu =
              Math.cos(phase) + Math.cos(phase * 2 - Math.PI * 0.5) * 0.44;
          }
        }

        if (rawP > 0.01 && rawP < 0.98) {
          const innerCol = grid[cols]!;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(innerCol[0]!.sx, innerCol[0]!.sy);
          for (let r = 1; r <= rows; r++) {
            ctx.lineTo(innerCol[r]!.sx, innerCol[r]!.sy);
          }
          const shadowWidth = Math.max(12, w * 0.028) * (1 - rawP * 0.5);
          for (let r = rows; r >= 0; r--) {
            ctx.lineTo(innerCol[r]!.sx - side * shadowWidth, innerCol[r]!.sy);
          }
          ctx.closePath();

          const midEdgeX = innerCol[Math.floor(rows * 0.4)]!.sx;
          const grad = ctx.createLinearGradient(
            midEdgeX,
            0,
            midEdgeX - side * shadowWidth,
            0
          );
          grad.addColorStop(0, "rgba(0,0,0,0.58)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }

        const lx = -side * 0.22 + lightShiftX;
        const ly = -0.28;
        const lz = 0.93;

        for (let c = 0; c < cols; c++) {
          const col0 = grid[c]!;
          const col1 = grid[c + 1]!;

          for (let r = 0; r < rows; r++) {
            const p00 = col0[r]!;
            const p10 = col1[r]!;
            const p11 = col1[r + 1]!;
            const p01 = col0[r + 1]!;

            if (
              side === -1 &&
              p00.sx < -2 &&
              p10.sx < -2 &&
              p11.sx < -2 &&
              p01.sx < -2
            ) {
              continue;
            }
            if (
              side === 1 &&
              p00.sx > w + 2 &&
              p10.sx > w + 2 &&
              p11.sx > w + 2 &&
              p01.sx > w + 2
            ) {
              continue;
            }

            const uMid = (p00.u + p10.u) * 0.5;
            const vMid = (p00.v + p01.v) * 0.5;
            const wave = (p00.primaryWave + p10.primaryWave) * 0.5;
            const crest = (p00.crestShape + p10.crestShape) * 0.5;
            const slopeX = (p00.dCrestDu + p10.dCrestDu) * 0.5 * -side;

            const nxRaw = slopeX * 0.82;
            const nyRaw = (p01.z3d - p00.z3d) * 2.8;
            const invLen = 1 / (Math.hypot(nxRaw, nyRaw, 1.0) || 1);
            const nx = nxRaw * invLen;
            const ny = nyRaw * invLen;
            const nz = invLen;

            const ndotl = Math.max(0, nx * lx + ny * ly + nz * lz);
            const normWave = Math.max(0, Math.min(1, (wave + 1) * 0.5));
            const valleyOcclusion = normWave * Math.sqrt(normWave);
            const ridgeNorm = Math.max(0, (crest + 0.85) * 0.54);
            const ridgeHighlight = ridgeNorm * ridgeNorm;

            const oneMinusNx = Math.max(0, 1 - Math.abs(nx * 0.85));
            const velvetSheen =
              oneMinusNx * oneMinusNx * oneMinusNx * normWave * 0.35;

            const diagBand =
              0.78 +
              0.26 * Math.sin((uMid * 1.35 - vMid * 0.95 + 0.25) * Math.PI);
            const vDiff = (vMid - 0.46) * 1.15;
            const verticalVignette = 1.0 - vDiff * vDiff * 0.26;
            const outerEdgeFalloff = 0.74 + 0.26 * Math.sqrt(uMid);
            const stageLightMask = Math.max(
              0.38,
              Math.min(1.18, diagBand * verticalVignette * outerEdgeFalloff)
            );

            const totalLight =
              (0.06 +
                ndotl * 0.46 * valleyOcclusion +
                ridgeHighlight * 0.54 +
                velvetSheen) *
              stageLightMask;

            const lutIdx = Math.min(
              255,
              Math.max(0, Math.round((totalLight / 1.18) * 255))
            );
            ctx.fillStyle = VELVET_COLOR_LUT[lutIdx]!;

            const padX = side === -1 ? -0.9 : 0.9;
            ctx.beginPath();
            ctx.moveTo(p00.sx, p00.sy);
            ctx.lineTo(p10.sx + padX, p10.sy);
            ctx.lineTo(p11.sx + padX, p11.sy + 0.9);
            ctx.lineTo(p01.sx, p01.sy + 0.9);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      animId = window.requestAnimationFrame(renderFrame);
    };

    animId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [unmounted]);

  if (unmounted) return null;

  const clampedProgress = Math.min(100, Math.max(8, Math.round(progress)));

  return (
    <div
      aria-live="polite"
      aria-busy={!ready}
      data-testid="stage-curtain-loader"
      className={`${
        fullViewport ? "fixed inset-0 z-50" : "absolute inset-0 z-30"
      } overflow-hidden select-none transition-opacity duration-500 ease-out ${
        fadingOut ? "opacity-0" : "opacity-100"
      } ${ready ? "pointer-events-none" : "pointer-events-auto"}`}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-full w-full"
      />

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-8 sm:bottom-12 z-20 flex justify-center px-4 transition-all duration-300 ${
          ready ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-[#f3ca82]/40 bg-[#1a0506]/95 px-6 py-4 text-center text-[#fbf6ec] shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          <UnoLogo size="sm" />
          <p className="mt-2.5 font-mono text-[11px] font-bold tracking-[0.18em] text-[#f3ca82] uppercase">
            {sceneTitle}
          </p>
          <p className="mt-1 font-serif text-base font-semibold text-[#fbf6ec]">
            {label}
          </p>
          <div className="mt-3 flex w-full items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2c080a]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#b80d13] via-[#ef1c22] to-[#f3ca82] transition-all duration-200"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold tabular-nums text-[#f3ca82]">
              {clampedProgress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
