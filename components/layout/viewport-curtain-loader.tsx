"use client";

import * as React from "react";
import { StageCurtainLoader } from "@/components/three/stage-curtain-loader";

export interface SceneLoadingEventDetail {
  sceneTitle?: string;
  progress?: number;
  label?: string;
}

/**
 * Loading Screen Layar Penuh (fixed inset-0 z-50) di Level Root Viewport.
 * Menampilkan animasi film dikokang / proyektor 35mm hingga halaman siap,
 * lalu keluar dengan fade-out halus.
 */
export function ViewportCurtainLoader() {
  const [ready, setReady] = React.useState(true);
  const [progress, setProgress] = React.useState(100);
  const [label, setLabel] = React.useState(
    "Memasang gulungan film XII PPLG 1..."
  );
  const [sceneTitle, setSceneTitle] = React.useState(
    "ARSIP FILM · UNO XII PPLG 1"
  );

  React.useEffect(() => {
    let sceneSafetyTimer: number | null = null;

    const onSceneLoading = (e: Event) => {
      const detail = (e as CustomEvent<SceneLoadingEventDetail>).detail;
      setReady(false);
      if (detail?.sceneTitle) setSceneTitle(detail.sceneTitle);
      if (typeof detail?.progress === "number") setProgress(detail.progress);
      else setProgress(28);
      if (detail?.label) setLabel(detail.label);

      if (sceneSafetyTimer !== null) window.clearTimeout(sceneSafetyTimer);
      sceneSafetyTimer = window.setTimeout(() => {
        setProgress(100);
        setReady(true);
      }, 2400);
    };

    const onSceneProgress = (e: Event) => {
      const detail = (e as CustomEvent<SceneLoadingEventDetail>).detail;
      if (detail?.sceneTitle) setSceneTitle(detail.sceneTitle);
      if (typeof detail?.progress === "number") setProgress(detail.progress);
      if (detail?.label) setLabel(detail.label);
    };

    const onSceneReady = (e: Event) => {
      const detail = (e as CustomEvent<SceneLoadingEventDetail>).detail;
      if (sceneSafetyTimer !== null) {
        window.clearTimeout(sceneSafetyTimer);
        sceneSafetyTimer = null;
      }
      if (detail?.sceneTitle) setSceneTitle(detail.sceneTitle);
      setProgress(100);
      setLabel(detail?.label || "Ruang kenangan siap ditampilkan.");
      setReady(true);
    };

    window.addEventListener("app:scene-loading", onSceneLoading);
    window.addEventListener("app:scene-progress", onSceneProgress);
    window.addEventListener("app:scene-ready", onSceneReady);

    return () => {
      if (sceneSafetyTimer !== null) window.clearTimeout(sceneSafetyTimer);
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
