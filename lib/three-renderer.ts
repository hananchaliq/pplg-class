"use client";

import * as THREE from "three";

export interface SafeWebGLRendererOptions {
  antialias?: boolean;
  alpha?: boolean;
  preserveDrawingBuffer?: boolean;
}

/**
 * Progressive WebGLRenderer factory isolated from root layout providers
 * so Three.js (~600 KB) is never bundled on lightweight non-3D routes.
 */
export function createSafeWebGLRenderer(
  options: SafeWebGLRendererOptions = {}
): THREE.WebGLRenderer | null {
  if (typeof window === "undefined") return null;
  const wantAlpha = options.alpha ?? false;
  const wantAntialias = options.antialias ?? true;
  const wantPreserve = options.preserveDrawingBuffer ?? false;

  const attempts: THREE.WebGLRendererParameters[] = [
    {
      antialias: wantAntialias,
      alpha: wantAlpha,
      powerPreference: "high-performance",
      preserveDrawingBuffer: wantPreserve,
    },
    {
      antialias: false,
      alpha: wantAlpha,
      powerPreference: "default",
      preserveDrawingBuffer: false,
    },
    {
      antialias: false,
      alpha: wantAlpha,
      failIfMajorPerformanceCaveat: false,
    },
  ];

  for (const params of attempts) {
    try {
      const renderer = new THREE.WebGLRenderer(params);
      if (renderer && renderer.getContext()) {
        return renderer;
      }
      renderer?.dispose();
    } catch {
      // Continue to next fallback attempt
    }
  }

  try {
    const canvas = document.createElement("canvas");
    const ctxAttrs: WebGLContextAttributes = {
      alpha: wantAlpha,
      antialias: false,
      failIfMajorPerformanceCaveat: false,
    };
    const gl =
      (canvas.getContext("webgl2", ctxAttrs) as WebGLRenderingContext | null) ||
      (canvas.getContext("webgl", ctxAttrs) as WebGLRenderingContext | null) ||
      (canvas.getContext(
        "experimental-webgl",
        ctxAttrs
      ) as WebGLRenderingContext | null);
    if (gl) {
      return new THREE.WebGLRenderer({
        canvas,
        context: gl,
        alpha: wantAlpha,
        antialias: false,
      });
    }
  } catch {
    // WebGL unavailable
  }

  return null;
}
