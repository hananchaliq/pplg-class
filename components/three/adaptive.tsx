"use client";

import * as React from "react";
import { useVisualTier } from "@/lib/visual-tier";

interface AdaptiveProps {
  /** SimpleView rendered first on the server and on mobile/low-power devices */
  simple: React.ReactNode;
  /** SceneHD rendered lazily on the client when visual tier is "hd" */
  hd: React.ReactNode;
}

export function Adaptive({ simple, hd }: AdaptiveProps) {
  const { tier, isClientReady } = useVisualTier();

  if (!isClientReady || tier === "simple") {
    return <>{simple}</>;
  }

  return <>{hd}</>;
}
