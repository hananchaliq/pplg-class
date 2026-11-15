"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let scrollTriggerRegistered = false;

export function ensureScrollTrigger() {
  if (typeof window !== "undefined" && !scrollTriggerRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    scrollTriggerRegistered = true;
  }
}

export function useGsap(
  callback: (ctx: gsap.Context) => void | (() => void),
  deps: React.DependencyList = [],
  scopeRef?: React.RefObject<Element | null>
) {
  React.useLayoutEffect(() => {
    ensureScrollTrigger();
    let cleanupFn: void | (() => void);
    const ctx = gsap.context((self) => {
      cleanupFn = callback(self);
    }, scopeRef?.current ?? undefined);

    return () => {
      if (typeof cleanupFn === "function") {
        cleanupFn();
      }
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export { gsap, ScrollTrigger };
