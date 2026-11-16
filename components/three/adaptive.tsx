"use client";

import * as React from "react";
import { useVisualTier } from "@/lib/visual-tier";
import { StageCurtainLoader } from "@/components/three/stage-curtain-loader";

interface AdaptiveProps {
  /** SimpleView rendered first on the server and on mobile/low-power devices */
  simple: React.ReactNode;
  /** SceneHD rendered lazily on the client when visual tier is "hd" */
  hd: React.ReactNode;
}

export function Adaptive({ simple, hd }: AdaptiveProps) {
  const { tier, isClientReady } = useVisualTier();

  if (!isClientReady) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        {simple}
        <StageCurtainLoader
          ready={false}
          progress={18}
          label="Menyiapkan panggung visual 3D..."
        />
      </div>
    );
  }

  if (tier === "simple") {
    return <>{simple}</>;
  }

  return <>{hd}</>;
}

