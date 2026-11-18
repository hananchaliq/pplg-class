"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { StageCurtainLoader } from "@/components/three/stage-curtain-loader";

export interface SceneLoadingEventDetail {
  sceneTitle?: string;
  progress?: number;
  label?: string;
}

/**
 * Komponen Loading Screen Layar Penuh (fixed inset-0 z-50) di Level Root Viewport.
 * Menutupi seluruh layar sejak awal halaman dimuat atau saat pindah halaman hingga
 * scene 3D (SceneShell) atau aset halaman selesai disiapkan, lalu membuka tirai 3D
 * disertai transisi fade-out yang halus.
 */
export function ViewportCurtainLoader() {
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);
  const [progress, setProgress] = React.useState(24);
  const [label, setLabel] = React.useState(
    "Menyiapkan album kenangan XII PPLG 1..."
  );
  const [sceneTitle, setSceneTitle] = React.useState(
    "ALBUM MEMORIES · UNO XII PPLG 1"
  );

  const activeSceneClaimedRef = React.useRef(false);

  React.useEffect(() => {
    activeSceneClaimedRef.current = false;
    setReady(false);
    setProgress(28);
    setLabel("Menyiapkan halaman & memori kelas...");

    // Jika halaman saat ini tidak me-mount SceneShell 3D (mis. Mode 2D atau halaman non-SceneShell),
    // otomatis buka tirai dengan mulus setelah DOM siap.
    const quickFallbackId = window.setTimeout(() => {
      if (!activeSceneClaimedRef.current) {
        setProgress(100);
        setLabel("Halaman siap ditampilkan!");
        setReady(true);
      }
    }, 240);

    // Safety timeout agar tidak pernah menggantung di perangkat lambat
    const maxSafetyId = window.setTimeout(() => {
      setProgress(100);
      setReady(true);
    }, 2200);

    return () => {
      window.clearTimeout(quickFallbackId);
      window.clearTimeout(maxSafetyId);
    };
  }, [pathname]);

  React.useEffect(() => {
    const onRouteStart = () => {
      activeSceneClaimedRef.current = false;
      setReady(false);
      setProgress(22);
      setLabel("Membuka lembar halaman berikutnya...");
      setSceneTitle("ALBUM MEMORIES · UNO XII PPLG 1");
    };

    const onSceneLoading = (e: Event) => {
      const detail = (e as CustomEvent<SceneLoadingEventDetail>).detail;
      activeSceneClaimedRef.current = true;
      setReady(false);
      if (detail?.sceneTitle) setSceneTitle(detail.sceneTitle);
      if (typeof detail?.progress === "number") setProgress(detail.progress);
      if (detail?.label) setLabel(detail.label);
    };

    const onSceneProgress = (e: Event) => {
      const detail = (e as CustomEvent<SceneLoadingEventDetail>).detail;
      activeSceneClaimedRef.current = true;
      if (detail?.sceneTitle) setSceneTitle(detail.sceneTitle);
      if (typeof detail?.progress === "number") setProgress(detail.progress);
      if (detail?.label) setLabel(detail.label);
    };

    const onSceneReady = (e: Event) => {
      const detail = (e as CustomEvent<SceneLoadingEventDetail>).detail;
      if (detail?.sceneTitle) setSceneTitle(detail.sceneTitle);
      setProgress(100);
      setLabel(detail?.label || "Ruang kenangan siap ditampilkan!");
      setReady(true);
    };

    window.addEventListener("app:route-transition-start", onRouteStart);
    window.addEventListener("app:scene-loading", onSceneLoading);
    window.addEventListener("app:scene-progress", onSceneProgress);
    window.addEventListener("app:scene-ready", onSceneReady);

    return () => {
      window.removeEventListener("app:route-transition-start", onRouteStart);
      window.removeEventListener("app:scene-loading", onSceneLoading);
      window.removeEventListener("app:scene-progress", onSceneProgress);
      window.removeEventListener("app:scene-ready", onSceneReady);
    };
  }, []);

  return (
    <StageCurtainLoader
      fullViewport
      ready={ready}
      progress={progress}
      label={label}
      sceneTitle={sceneTitle}
    />
  );
}
