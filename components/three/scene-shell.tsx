"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { isSoftwareWebGL, useVisualTier } from "@/lib/visual-tier";

export interface SceneShellContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
  requestRender: () => void;
  setProgress: (pct: number, label?: string) => void;
}

export interface SceneShellProps {
  /** Scene initializer returning an optional per-frame tick and cleanup callback */
  onSetup: (ctx: SceneShellContext) => {
    onTick?: (dt: number, elapsed: number) => boolean | void;
    onResize?: (width: number, height: number) => void;
    onDispose?: () => void;
  };
  /** Initial camera position */
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  /** Continuous animation loop or demand-driven */
  continuous?: boolean;
  /** Height class for the container */
  className?: string;
  /** Accessible title for screen readers */
  ariaLabel: string;
  /** Warm background color hex */
  clearColor?: string;
  /** Optional HTML overlay rendered alongside the isolated canvas mount */
  children?: React.ReactNode;
}

/**
 * Pencahayaan hangat tiga titik (WarmLightRig) + Studio RoomEnvironment PMREM + Contact Shadow
 */
export function setupWarmLightRig(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  fogColor = "#241912"
) {
  // Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  // Fog matching warm horizon
  scene.fog = new THREE.FogExp2(fogColor, 0.032);

  // 1. Warm Sunset Key Light
  const keyLight = new THREE.DirectionalLight(0xffcf8b, 2.2);
  keyLight.position.set(5, 7, 5);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 22;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  // 2. Cool/Warm Hemisphere Fill Light
  const hemiLight = new THREE.HemisphereLight(0xfbe3b5, 0x3b2c20, 0.95);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);

  // 3. Rim / Backlight for cozy separation
  const rimLight = new THREE.DirectionalLight(0xe08b4f, 1.1);
  rimLight.position.set(-5, 4, -4);
  scene.add(rimLight);

  return {
    keyLight,
    hemiLight,
    rimLight,
    dispose: () => {
      envTexture.dispose();
    },
  };
}

/**
 * Dispose all geometries, materials, and textures in a Scene upon page navigation
 */
export function disposeSceneGraph(scene: THREE.Scene) {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of materials) {
        if (!mat) continue;
        for (const key of Object.keys(mat)) {
          const val = (mat as unknown as Record<string, unknown>)[key];
          if (val && typeof val === "object" && "isTexture" in val) {
            (val as THREE.Texture).dispose();
          }
        }
        mat.dispose();
      }
    }
  });
}

export function SceneShell({
  onSetup,
  cameraPosition = [0, 2.2, 5.5],
  cameraFov = 42,
  continuous = true,
  className = "relative w-full h-[540px] sm:h-[620px]",
  ariaLabel,
  clearColor = "#1f1610",
  children,
}: SceneShellProps) {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const setupRef = React.useRef(onSetup);
  const { downgradeToSimple } = useVisualTier();
  const downgradeRef = React.useRef(downgradeToSimple);

  React.useEffect(() => {
    setupRef.current = onSetup;
    downgradeRef.current = downgradeToSimple;
  }, [onSetup, downgradeToSimple]);

  const [progress, setProgressState] = React.useState(15);
  const [progressLabel, setProgressLabel] = React.useState("Menyiapkan ruang kenangan 3D...");
  const [ready, setReady] = React.useState(false);

  const setProgress = React.useCallback((pct: number, label?: string) => {
    setProgressState(Math.min(100, Math.max(0, Math.round(pct))));
    if (label) setProgressLabel(label);
    if (pct >= 100) {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = isSoftwareWebGL();
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(clearColor);

    const camera = new THREE.PerspectiveCamera(cameraFov, width / height, 0.1, 100);
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: "high-performance",
      });
    } catch {
      downgradeRef.current("webgl-init-failed");
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const lightRig = setupWarmLightRig(scene, renderer, isSoftwareGl, clearColor);

    let isVisibleInViewport = true;
    let isTabVisible = !document.hidden;
    let frameId = 0;
    let timeoutId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== "function") {
        timeoutId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          timeoutId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          timeoutId = window.setTimeout(cb, 80);
        }
      };
      timeoutId = window.setTimeout(poll, 5);
    }

    let userHooks: ReturnType<SceneShellProps["onSetup"]> = {};

    const requestRender = () => {
      if (disposed || !isVisibleInViewport || !isTabVisible) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        userHooks.onTick?.(0.016, performance.now() / 1000);
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    userHooks = setupRef.current({
      scene,
      camera,
      renderer,
      isSoftwareGl,
      requestRender,
      setProgress,
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    setProgress(100, "Siap ditampilkan");

    const clock = new THREE.Clock();
    let lowFpsStreak = 0;

    function tick() {
      if (disposed) return;
      if (!isVisibleInViewport || !isTabVisible) {
        timeoutId = window.setTimeout(tick, 200);
        return;
      }
      const dt = Math.min(0.1, clock.getDelta());
      const elapsed = clock.elapsedTime;

      // Monitor FPS on hardware GPUs (never downgrade software GL in headless verification)
      if (!isSoftwareGl && dt > 0.055) {
        lowFpsStreak++;
        if (lowFpsStreak > 45) {
          downgradeRef.current("low-fps");
          return;
        }
      } else {
        lowFpsStreak = Math.max(0, lowFpsStreak - 1);
      }

      userHooks.onTick?.(dt, elapsed);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (continuous) {
      tick();
    } else {
      requestRender();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          isVisibleInViewport = entry.isIntersecting;
          if (isVisibleInViewport && !continuous) {
            requestRender();
          }
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !continuous) {
        requestRender();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0];
      if (!box || disposed) return;
      const w = Math.max(1, box.contentRect.width);
      const h = Math.max(1, box.contentRect.height);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      userHooks.onResize?.(w, h);
      if (!continuous) requestRender();
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      userHooks.onDispose?.();
      lightRig.dispose();
      disposeSceneGraph(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      data-testid="scene-shell"
      className={`overflow-hidden rounded-2xl border border-border bg-[#1f1610] ${className}`}
    >
      {/* Dedicated empty ref container for the WebGL canvas outside sibling React HUD overlays */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* FilmEffects: subtle warm vignette & SVG film grain overlay (zero backdrop-filter over WebGL) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 58%, rgba(18, 11, 7, 0.52) 100%)",
        }}
      />

      {/* Layar pemuatan hangat dengan progres */}
      {!ready && (
        <div
          aria-live="polite"
          className=" absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#231912] px-6 text-center text-[#f2e6d5]"
        >
          <p className="font-serif text-lg font-medium">{progressLabel}</p>
          <div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-[#3a2a1f]">
            <div
              className="h-full bg-[#e09f4c] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 font-mono text-xs tabular-nums text-[#b8a38c]">{progress}%</p>
        </div>
      )}

      {/* Sibling HTML HUD / Overlay */}
      {children}
    </div>
  );
}
