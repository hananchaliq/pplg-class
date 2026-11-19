"use client";

import * as React from "react";
import {
  LeafThrough,
  type GoToOptions,
  type LeafThroughOptions,
  type PageChangeDetail,
} from "leafthrough";

export interface LeafThroughVanillaHandle {
  next: () => boolean;
  prev: () => boolean;
  goTo: (page: number, opts?: GoToOptions) => void;
  readonly page: number;
  readonly pageCount: number;
  readonly instance: LeafThrough | null;
}

export interface LeafThroughWrapperProps
  extends Omit<
    LeafThroughOptions,
    "onPageChange" | "onReady" | "onPageLoad" | "onError"
  > {
  magazineRef?: React.RefObject<LeafThroughVanillaHandle | null>;
  className?: string;
  style?: React.CSSProperties;
  onPageChange?: (detail: PageChangeDetail) => void;
  onReady?: () => void;
  onPageLoad?: (page: number) => void;
  onError?: (error: unknown, page?: number) => void;
}

/**
 * Integrasi langsung format kode Vanilla resmi dari dmtrbrl/leafthrough:
 * `new LeafThrough(container, options)` + DOM EventTarget (`pagechange`, `ready`, `pageload`, `error`),
 * `magazine.update(...)`, dan `magazine.dispose()` (tanpa format scene Three.js / LeafThroughObject).
 */
export default function LeafThroughWrapper({
  magazineRef,
  className,
  style,
  onPageChange,
  onReady,
  onPageLoad,
  onError,
  ...options
}: LeafThroughWrapperProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const magazineInstanceRef = React.useRef<LeafThrough | null>(null);

  const callbacksRef = React.useRef({
    onPageChange,
    onReady,
    onPageLoad,
    onError,
  });

  React.useEffect(() => {
    callbacksRef.current = {
      onPageChange,
      onReady,
      onPageLoad,
      onError,
    };
  }, [onPageChange, onReady, onPageLoad, onError]);

  const initialOptionsRef = React.useRef<LeafThroughOptions>(options);

  // 1. Mount satu instansi Vanilla `new LeafThrough(container, options)` & daftarkan event listener DOM standar
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const magazine = new LeafThrough(container, {
      ...initialOptionsRef.current,
    });
    magazineInstanceRef.current = magazine;

    const handlePageChange = (event: CustomEvent<PageChangeDetail>) => {
      callbacksRef.current.onPageChange?.(event.detail);
    };
    const handleReady = () => {
      callbacksRef.current.onReady?.();
    };
    const handlePageLoad = (event: CustomEvent<{ page: number }>) => {
      callbacksRef.current.onPageLoad?.(event.detail.page);
    };
    const handleError = (
      event: CustomEvent<{ error: unknown; page?: number }>
    ) => {
      const handler = callbacksRef.current.onError;
      if (handler) {
        handler(event.detail.error, event.detail.page);
      } else {
        console.warn("[leafthrough]", event.detail.error);
      }
    };

    magazine.addEventListener("pagechange", handlePageChange);
    magazine.addEventListener("ready", handleReady);
    magazine.addEventListener("pageload", handlePageLoad);
    magazine.addEventListener("error", handleError);

    return () => {
      magazine.removeEventListener("pagechange", handlePageChange);
      magazine.removeEventListener("ready", handleReady);
      magazine.removeEventListener("pageload", handlePageLoad);
      magazine.removeEventListener("error", handleError);
      magazine.dispose();
      magazineInstanceRef.current = null;
    };
  }, []);

  const isFirstUpdateRef = React.useRef(true);

  // 2. Sinkronisasi pembaruan opsi secara langsung melalui metode Vanilla `magazine.update(...)`
  React.useEffect(() => {
    if (isFirstUpdateRef.current) {
      isFirstUpdateRef.current = false;
      return;
    }
    const magazine = magazineInstanceRef.current;
    if (!magazine) return;

    magazine.update({
      pages: options.pages,
      layout: options.layout,
      spreadQuery: options.spreadQuery,
      pageAspect: options.pageAspect,
      loop: options.loop,
      bleed: options.bleed,
      paper: options.paper,
      lighting: options.lighting,
      motion: options.motion,
      interaction: options.interaction,
      maxPixelRatio: options.maxPixelRatio,
      preload: options.preload,
      plain: options.plain,
      label: options.label,
      formatPageLabel: options.formatPageLabel,
    });
  }, [
    options.pages,
    options.layout,
    options.spreadQuery,
    options.pageAspect,
    options.loop,
    options.bleed,
    options.paper,
    options.lighting,
    options.motion,
    options.interaction,
    options.maxPixelRatio,
    options.preload,
    options.plain,
    options.label,
    options.formatPageLabel,
  ]);

  // 3. Ekspos kontrol navigasi Vanilla (`next`, `prev`, `goTo`) ke komponen koran induk
  React.useImperativeHandle(
    magazineRef,
    () => ({
      next: () => magazineInstanceRef.current?.next() ?? false,
      prev: () => magazineInstanceRef.current?.prev() ?? false,
      goTo: (page, opts) => magazineInstanceRef.current?.goTo(page, opts),
      get page() {
        return magazineInstanceRef.current?.page ?? options.startPage ?? 0;
      },
      get pageCount() {
        return magazineInstanceRef.current?.pageCount ?? options.pages.length;
      },
      get instance() {
        return magazineInstanceRef.current;
      },
    }),
    [options.pages.length, options.startPage]
  );

  return <div ref={containerRef} className={className} style={style} />;
}
