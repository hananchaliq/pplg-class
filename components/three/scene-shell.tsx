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
  fogColor = "#161614"
) {
  // Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  // Fog ruang gelap fotografi
  scene.fog = new THREE.FogExp2(fogColor, 0.024);

  // 1. Neutral Studio Key Light
  const keyLight = new THREE.DirectionalLight(0xf0ede6, 2.35);
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

  // 2. Neutral Silver-Gelatin Hemisphere Fill Light
  const hemiLight = new THREE.HemisphereLight(0xdad6cc, 0x2b2b29, 1.15);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);

  // 3. Rim / Backlight abu netral untuk kedalaman objek
  const rimLight = new THREE.DirectionalLight(0xc2beb4, 1.15);
  rimLight.position.set(-5, 4, -4);
  scene.add(rimLight);

  // 4. Soft Front Fill Light
  const frontFill = new THREE.DirectionalLight(0xf3f1ea, 0.85);
  frontFill.position.set(0, 3, 6);
  scene.add(frontFill);

  return {
    keyLight,
    hemiLight,
    rimLight,
    frontFill,
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
  clearColor = "#161614",
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

  const setProgress = React.useCallback(
    (pct: number, label?: string) => {
      const clamped = Math.min(100, Math.max(0, Math.round(pct)));
      try {
        window.dispatchEvent(
          new CustomEvent("app:scene-progress", {
            detail: {
              sceneTitle: ariaLabel.toUpperCase(),
              progress: clamped,
              label,
            },
          })
        );
      } catch {
        // Ignore
      }
    },
    [ariaLabel]
  );

  React.useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    try {
      window.dispatchEvent(
        new CustomEvent("app:scene-loading", {
          detail: {
            sceneTitle: ariaLabel.toUpperCase(),
            progress: 28,
            label: "Membangun geometri & tekstur 3D...",
          },
        })
      );
    } catch {
      // Ignore
    }

    const isSoftwareGl = isSoftwareWebGL();
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(clearColor);

    const camera = new THREE.PerspectiveCamera(
      cameraFov,
      width / height,
      0.1,
      100
    );
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
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const lightRig = setupWarmLightRig(
      scene,
      renderer,
      isSoftwareGl,
      clearColor
    );

    let isVisibleInViewport = true;
    let isTabVisible = !document.hidden;
    let frameId = 0;
    let timeoutId = 0;
    let curtainTimerId = 0;
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
        const elapsedNow = performance.now() / 1000;
        userHooks.onTick?.(0.016, elapsedNow);
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

    setProgress(76, "Menyalakan tata cahaya panggung 3D...");

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Render frame pertama model 3D di balik tirai layar penuh
    userHooks.onTick?.(0.016, 0);
    renderer.render(scene, camera);
    setProgress(100, "Model 3D siap ditampilkan!");

    curtainTimerId = window.setTimeout(() => {
      if (!disposed) {
        try {
          window.dispatchEvent(
            new CustomEvent("app:scene-ready", {
              detail: {
                sceneTitle: ariaLabel.toUpperCase(),
                progress: 100,
                label: "Model 3D siap ditampilkan!",
              },
            })
          );
        } catch {
          // Ignore
        }
      }
    }, 90);

    const clock = new THREE.Clock();

    function tick() {
      if (disposed) return;
      if (!isVisibleInViewport || !isTabVisible) {
        timeoutId = window.setTimeout(tick, 200);
        return;
      }

      const dt = Math.min(0.1, clock.getDelta());
      const elapsed = clock.elapsedTime;

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
    }

    const handleRouteTransitionStart = () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
      clearTimeout(curtainTimerId);
    };
    window.addEventListener(
      "app:route-transition-start",
      handleRouteTransitionStart
    );

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
      clearTimeout(curtainTimerId);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(
        "app:route-transition-start",
        handleRouteTransitionStart
      );
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
      className={`overflow-hidden rounded-xl border border-border bg-[#161614] ${className}`}
    >
      {/* Dedicated empty ref container for the WebGL canvas outside sibling React HUD overlays */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Monochrome vignette overlay (zero backdrop-filter over WebGL) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 58%, rgba(16, 16, 15, 0.52) 100%)",
        }}
      />

      {/* Sibling HTML HUD / Overlay */}
      {children}
    </div>
  );
}
