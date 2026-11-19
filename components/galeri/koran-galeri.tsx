"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid,
  Layers,
  Newspaper,
} from "lucide-react";
import type { LeafThroughHandle, PageSource } from "leafthrough/react";
import { useVisualTier } from "@/lib/visual-tier";
import { useGsap, gsap } from "@/lib/gsap-utils";
import {
  buildNewspaperPlan,
  createSkeletonNewspaperUrl,
  renderNewspaperPageToBlobUrl,
  NEWSPAPER_HEIGHT,
  NEWSPAPER_WIDTH,
  type LoadedImageResult,
} from "@/lib/newspaper-engine";
import type { MomentPhase, MomentRow } from "@/lib/types";

const DynamicLeafThrough = dynamic(
  () => import("@/components/galeri/leaf-through-wrapper"),
  {
    ssr: false,
    loading: () => (
      <div
        data-dynamic-loading="true"
        aria-hidden="true"
        className="h-[500px] sm:h-[620px] w-full"
      />
    ),
  }
);

export interface KoranGaleriHandle {
  goToPhase: (phase: MomentPhase) => void;
  goToCover: () => void;
}

interface KoranGaleriProps {
  moments: MomentRow[];
  activeCategory: string;
  activePhase: MomentPhase;
  onSelectPhase?: (phase: MomentPhase) => void;
  onShowAllGrid?: () => void;
}

export const KoranGaleri = React.forwardRef<KoranGaleriHandle, KoranGaleriProps>(
  function KoranGaleri(
    { moments, activeCategory, activePhase, onSelectPhase, onShowAllGrid },
    ref
  ) {
    const { tier, reducedMotion, webglSupported } = useVisualTier();
    const leafRef = React.useRef<LeafThroughHandle | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const wingLeftRef = React.useRef<HTMLDivElement | null>(null);
    const wingRightRef = React.useRef<HTMLDivElement | null>(null);
    const stageCardRef = React.useRef<HTMLDivElement | null>(null);

    const [manualPlain, setManualPlain] = React.useState<boolean | null>(null);
    const [currentPage, setCurrentPage] = React.useState(0);
    const [visiblePages, setVisiblePages] = React.useState<number[]>([0]);
    const [isInView, setIsInView] = React.useState(true);
    const [isTabHidden, setIsTabHidden] = React.useState(false);
    const [corsWarningCount, setCorsWarningCount] = React.useState(0);
    const [renderedCount, setRenderedCount] = React.useState(0);

    const isPlain =
      manualPlain !== null
        ? manualPlain
        : tier === "simple" || reducedMotion || !webglSupported;

    const plan = React.useMemo(
      () => buildNewspaperPlan(moments, activeCategory),
      [moments, activeCategory]
    );

    // State URL halaman koran (dimulai dari SVG placeholder kecreaman ringan, lalu diisi kanvas secara bertahap)
    const [pageUrls, setPageUrls] = React.useState<string[]>(() =>
      plan.pages.map((spec) => createSkeletonNewspaperUrl(spec))
    );

    const renderedPagesSetRef = React.useRef<Set<number>>(new Set());
    const blobUrlsRef = React.useRef<string[]>([]);
    const imageCacheRef = React.useRef<Map<string, LoadedImageResult>>(new Map());
    const currentPageRef = React.useRef(0);
    currentPageRef.current = currentPage;

    // Reset lembar koran ketika filter kategori / data berubah
    React.useEffect(() => {
      blobUrlsRef.current.forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
      blobUrlsRef.current = [];
      renderedPagesSetRef.current = new Set();
      setCorsWarningCount(0);
      setRenderedCount(0);
      setCurrentPage(0);
      setVisiblePages([0]);
      setPageUrls(plan.pages.map((spec) => createSkeletonNewspaperUrl(spec)));
      leafRef.current?.goTo(0, { animate: false });
    }, [plan]);

    // Cleanup seluruh Blob URL saat unmount
    React.useEffect(() => {
      return () => {
        blobUrlsRef.current.forEach((u) => {
          if (u.startsWith("blob:")) URL.revokeObjectURL(u);
        });
        blobUrlsRef.current = [];
      };
    }, []);

    // Pantau visibilitas viewport & tab browser untuk jeda antrean render
    React.useEffect(() => {
      const onVis = () => setIsTabHidden(document.hidden);
      document.addEventListener("visibilitychange", onVis);

      const el = containerRef.current;
      let observer: IntersectionObserver | null = null;
      if (el && typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry) setIsInView(entry.isIntersecting);
          },
          { threshold: 0.05 }
        );
        observer.observe(el);
      }

      return () => {
        document.removeEventListener("visibilitychange", onVis);
        observer?.disconnect();
      };
    }, []);

    // Antrean render bertahap (prioritas halaman aktif ± 2, lalu seluruh sisa halaman tanpa batas jumlah)
    React.useEffect(() => {
      if (!isInView || isTabHidden) return;
      let cancelled = false;
      let idleHandle: number | null = null;
      let timerHandle: number | null = null;

      const pickNextPageIndex = (): number | null => {
        const total = plan.pages.length;
        const center = currentPageRef.current;
        const done = renderedPagesSetRef.current;

        const candidates: number[] = [];
        for (let offset = 0; offset < total; offset++) {
          const right = center + offset;
          const left = center - offset;
          if (right < total && !done.has(right)) candidates.push(right);
          if (offset > 0 && left >= 0 && !done.has(left)) candidates.push(left);
        }
        return candidates[0] ?? null;
      };

      const scheduleNext = () => {
        if (cancelled) return;
        const nextIdx = pickNextPageIndex();
        if (nextIdx === null) return;

        const runTask = async () => {
          if (cancelled) return;
          const spec = plan.pages[nextIdx];
          if (!spec || renderedPagesSetRef.current.has(nextIdx)) {
            scheduleNext();
            return;
          }

          renderedPagesSetRef.current.add(nextIdx);
          const result = await renderNewspaperPageToBlobUrl(
            spec,
            imageCacheRef.current
          );
          if (cancelled) {
            if (result.url.startsWith("blob:")) {
              URL.revokeObjectURL(result.url);
            }
            return;
          }

          if (result.url.startsWith("blob:")) {
            blobUrlsRef.current.push(result.url);
          }

          if (result.corsBlockedCount > 0) {
            setCorsWarningCount((prev) => prev + result.corsBlockedCount);
          }

          setPageUrls((prev) => {
            if (nextIdx >= prev.length) return prev;
            const next = [...prev];
            next[nextIdx] = result.url;
            return next;
          });
          setRenderedCount(renderedPagesSetRef.current.size);

          timerHandle = window.setTimeout(scheduleNext, 18);
        };

        const win = window as Window & {
          requestIdleCallback?: (
            cb: () => void,
            opts?: { timeout: number }
          ) => number;
          cancelIdleCallback?: (id: number) => void;
        };

        if (typeof win.requestIdleCallback === "function") {
          idleHandle = win.requestIdleCallback(() => void runTask(), {
            timeout: 180,
          });
        } else {
          timerHandle = window.setTimeout(() => void runTask(), 18);
        }
      };

      scheduleNext();

      return () => {
        cancelled = true;
        const win = window as Window & {
          cancelIdleCallback?: (id: number) => void;
        };
        if (idleHandle !== null && typeof win.cancelIdleCallback === "function") {
          win.cancelIdleCallback(idleHandle);
        }
        if (timerHandle !== null) {
          window.clearTimeout(timerHandle);
        }
      };
    }, [plan, isInView, isTabHidden, currentPage]);

    // Animasi GSAP halus pada panggung koran (selaras dengan animasi micro-dot viewport)
    useGsap(
      () => {
        if (reducedMotion || tier === "simple") return;
        const tl = gsap.timeline({ delay: 0.14 });
        if (wingLeftRef.current) {
          tl.fromTo(
            wingLeftRef.current,
            { scale: 0.72, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.55,
              ease: "power3.out",
              clearProps: "transform,opacity",
            },
            0
          );
        }
        if (wingRightRef.current) {
          tl.fromTo(
            wingRightRef.current,
            { scale: 0.72, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.55,
              ease: "power3.out",
              clearProps: "transform,opacity",
            },
            0
          );
        }
        if (stageCardRef.current) {
          tl.fromTo(
            stageCardRef.current,
            { opacity: 0, y: 10 },
            {
              opacity: 1,
              y: 0,
              duration: 0.65,
              ease: "power2.out",
              clearProps: "transform,opacity",
            },
            0.06
          );
        }
      },
      [reducedMotion, tier],
      containerRef
    );

    const goToPage = React.useCallback(
      (pageIdx: number) => {
        const clamped = Math.max(0, Math.min(plan.pages.length - 1, pageIdx));
        leafRef.current?.goTo(clamped, { animate: true });
        setCurrentPage(clamped);
      },
      [plan.pages.length]
    );

    React.useImperativeHandle(
      ref,
      () => ({
        goToPhase: (phase: MomentPhase) => {
          goToPage(plan.phaseStartPages[phase] ?? 1);
        },
        goToCover: () => {
          goToPage(0);
        },
      }),
      [goToPage, plan.phaseStartPages]
    );

    const leafPages: PageSource[] = React.useMemo(
      () =>
        plan.pages.map((spec, idx) => ({
          src: pageUrls[idx] ?? createSkeletonNewspaperUrl(spec),
          alt: spec.alt,
          text: spec.text,
        })),
      [plan.pages, pageUrls]
    );

    const activeSpec = plan.pages[currentPage] ?? plan.pages[0];
    const pageDisplayLabel =
      visiblePages.length > 1
        ? `Halaman ${visiblePages.map((p) => p + 1).join("–")} dari ${plan.pages.length}`
        : `Halaman ${currentPage + 1} dari ${plan.pages.length}`;

    return (
      <section
        ref={containerRef}
        aria-label="Koran Kenangan Bersama XII PPLG 1"
        className="relative overflow-hidden rounded-2xl border border-[#C9B794] bg-[#EFE5CE]/80 p-3.5 sm:p-6 text-[#261F18] shadow-sm dark:border-border dark:bg-card dark:text-foreground"
      >
        {/* Sudut Bingkai Cetak Kiri & Kanan */}
        <div
          ref={wingLeftRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-4 left-4 hidden h-7 w-7 border-t-2 border-l-2 border-[#6B5B4B]/45 dark:border-foreground/25 sm:block"
        />
        <div
          ref={wingRightRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-4 right-4 hidden h-7 w-7 border-t-2 border-r-2 border-[#6B5B4B]/45 dark:border-foreground/25 sm:block"
        />

        {/* Kepala Koran & Toolbar Kontrol */}
        <div className="flex flex-col gap-3 border-b border-[#C9B794] pb-4 dark:border-border lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-[#6B5B4B] dark:text-muted-foreground uppercase">
              <span className="inline-flex items-center gap-1.5 text-[#261F18] dark:text-foreground">
                <Newspaper className="size-3.5" />
                KORAN JADUL XII PPLG 1
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {plan.totalPhotos} FOTO · {plan.pages.length} LEMBAR CETAK
              </span>
              {renderedCount < plan.pages.length && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Mencetak {renderedCount}/{plan.pages.length}
                  </span>
                </>
              )}
            </div>
            <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#261F18] dark:text-foreground">
              Galeri Kenangan Bersama
            </h2>
            {activeSpec && (
              <p className="mt-0.5 font-sans text-xs text-[#6B5B4B] dark:text-muted-foreground">
                Sedang dibaca:{" "}
                <span className="font-semibold text-[#261F18] dark:text-foreground">
                  {activeSpec.rubricTitle}
                </span>
              </p>
            )}
          </div>

          {/* Tombol Aksi Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setManualPlain(!isPlain)}
              aria-pressed={isPlain}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#C9B794] bg-[#F7EEDB] px-3 py-1.5 font-sans text-xs font-semibold text-[#261F18] transition-colors hover:bg-[#E5D7B9] dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted"
            >
              {isPlain ? (
                <>
                  <Layers className="size-3.5" />
                  <span>Mode Kertas 3D</span>
                </>
              ) : (
                <>
                  <Eye className="size-3.5" />
                  <span>Mode Ringan</span>
                </>
              )}
            </button>

            {onShowAllGrid && (
              <button
                type="button"
                onClick={onShowAllGrid}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#2D241C] px-3 py-1.5 font-sans text-xs font-semibold text-[#EFE5CE] transition-opacity hover:opacity-90 dark:bg-primary dark:text-primary-foreground"
              >
                <Grid className="size-3.5" />
                <span>Lihat Semua Foto</span>
              </button>
            )}
          </div>
        </div>

        {/* Penanda Fase & Indeks Rubrik Terintegrasi di Kepala Koran */}
        <div
          aria-label="Penanda Fase & Indeks Rubrik Koran"
          className="no-scrollbar mt-3 flex flex-nowrap items-center gap-x-1 gap-y-1.5 overflow-x-auto border-y border-[#C9B794]/80 py-2 dark:border-border/80 sm:flex-wrap"
        >
          <span className="mr-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.14em] text-[#5A4B3C] dark:text-muted-foreground uppercase shrink-0">
            <BookOpen className="size-3.5" />
            PENANDA EDISI:
          </span>

          <button
            type="button"
            onClick={() => goToPage(0)}
            className={`min-h-[30px] rounded px-2.5 py-1 font-mono text-[11px] transition-colors whitespace-nowrap shrink-0 ${
              currentPage === 0
                ? "bg-[#2D241C] font-bold text-[#EFE5CE] dark:bg-primary dark:text-primary-foreground"
                : "text-[#3D3124] hover:bg-[#E5D7B9]/80 dark:text-foreground/85 dark:hover:bg-muted"
            }`}
          >
            Sampul · Hal. 1
          </button>

          <span aria-hidden="true" className="text-[#8A7864] select-none">
            /
          </span>

          {(
            [
              { ph: "X" as MomentPhase, bab: "Bab I · Kelas X" },
              { ph: "XI" as MomentPhase, bab: "Bab II · Kelas XI" },
              { ph: "XII" as MomentPhase, bab: "Bab III · Kelas XII" },
            ]
          ).map(({ ph, bab }, idx) => {
            const targetIdx = plan.phaseStartPages[ph];
            const phaseCount = moments.filter(
              (m) => String(m.phase || "XII").trim().toUpperCase() === ph
            ).length;
            const isActiveRubric =
              activeSpec?.phase === ph ||
              (activePhase === ph && currentPage === targetIdx);
            return (
              <React.Fragment key={ph}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectPhase?.(ph);
                    goToPage(targetIdx);
                  }}
                  className={`min-h-[30px] rounded px-2.5 py-1 font-mono text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                    isActiveRubric
                      ? "bg-[#2D241C] font-bold text-[#EFE5CE] dark:bg-primary dark:text-primary-foreground"
                      : "text-[#3D3124] hover:bg-[#E5D7B9]/80 dark:text-foreground/85 dark:hover:bg-muted"
                  }`}
                >
                  {bab} ({phaseCount})
                </button>
                {idx < 2 && (
                  <span aria-hidden="true" className="text-[#8A7864] select-none">
                    ·
                  </span>
                )}
              </React.Fragment>
            );
          })}

          <span aria-hidden="true" className="text-[#8A7864] select-none">
            /
          </span>

          <button
            type="button"
            onClick={() => goToPage(plan.tocPageIndex)}
            className={`min-h-[30px] rounded px-2.5 py-1 font-mono text-[11px] transition-colors whitespace-nowrap shrink-0 ${
              currentPage === plan.tocPageIndex
                ? "bg-[#2D241C] font-bold text-[#EFE5CE] dark:bg-primary dark:text-primary-foreground"
                : "text-[#3D3124] hover:bg-[#E5D7B9]/80 dark:text-foreground/85 dark:hover:bg-muted"
            }`}
          >
            Indeks
          </button>

          <span aria-hidden="true" className="text-[#8A7864] select-none">
            ·
          </span>

          <button
            type="button"
            onClick={() => goToPage(plan.backCoverIndex)}
            className={`min-h-[30px] rounded px-2.5 py-1 font-mono text-[11px] transition-colors whitespace-nowrap shrink-0 ${
              currentPage === plan.backCoverIndex
                ? "bg-[#2D241C] font-bold text-[#EFE5CE] dark:bg-primary dark:text-primary-foreground"
                : "text-[#3D3124] hover:bg-[#E5D7B9]/80 dark:text-foreground/85 dark:hover:bg-muted"
            }`}
          >
            Tamat
          </button>
        </div>

        {/* Panggung Koran LeafThrough Kecreaman */}
        <div
          ref={stageCardRef}
          className="relative mt-4 rounded-xl border border-[#C9B794] bg-[#E5D7B9]/65 px-2 py-4 sm:px-6 sm:py-6 dark:border-border dark:bg-secondary/55"
        >
          <DynamicLeafThrough
            magazineRef={leafRef}
            pages={leafPages}
            startPage={0}
            layout="auto"
            pageAspect={NEWSPAPER_HEIGHT / NEWSPAPER_WIDTH}
            plain={isPlain}
            bleed={!isPlain}
            preload={4}
            maxPixelRatio={2}
            label="Galeri Kenangan Bersama — Koran XII PPLG 1"
            paper={{
              backColor: "#EFE5CE",
              roughness: 0.88,
              metalness: 0.01,
              inkGloss: 0.03,
              grain: true,
              grainStrength: 0.14,
              showThrough: 0.06,
              wrinkles: 0.9,
              bulge: 0.82,
            }}
            lighting={{
              ambient: {
                sky: "#EFE6D2",
                ground: "#C9B794",
                intensity: 1.15,
              },
              sun: {
                color: "#F5ECD8",
                intensity: 0.82,
                position: [1.6, 1.8, 2.4],
              },
              shadows: true,
              floorShadow: 0.16,
            }}
            motion={{
              reducedMotion: "auto",
              speed: 1.05,
              hoverLift: 0.028,
            }}
            interaction={{
              drag: true,
              click: true,
              hold: true,
              hover: true,
              keyboard: true,
            }}
            onPageChange={(detail) => {
              setCurrentPage(detail.page);
              setVisiblePages(detail.visiblePages);
              const spec = plan.pages[detail.page];
              if (spec?.phase && spec.phase !== activePhase) {
                onSelectPhase?.(spec.phase);
              }
            }}
            style={{
              width: "100%",
              height: "clamp(430px, 68vh, 690px)",
            }}
          />
        </div>

        {/* Navigasi Halaman Koran Bawah */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => leafRef.current?.prev()}
              disabled={currentPage <= 0}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#C9B794] bg-[#F7EEDB] px-3.5 py-2 font-sans text-xs font-semibold text-[#261F18] transition-colors hover:bg-[#E5D7B9] disabled:opacity-40 dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
              <span>Halaman Sebelumnya</span>
            </button>

            <button
              type="button"
              onClick={() => leafRef.current?.next()}
              disabled={currentPage >= plan.pages.length - 1}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#C9B794] bg-[#F7EEDB] px-3.5 py-2 font-sans text-xs font-semibold text-[#261F18] transition-colors hover:bg-[#E5D7B9] disabled:opacity-40 dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-muted"
            >
              <span>Halaman Berikutnya</span>
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 font-mono text-xs text-[#6B5B4B] dark:text-muted-foreground">
            <span className="tabular-nums font-semibold text-[#261F18] dark:text-foreground">
              {pageDisplayLabel}
            </span>
            <span className="hidden md:inline">
              · Seret tepi kertas atau tekan ← / →
            </span>
          </div>
        </div>

        {corsWarningCount > 0 && (
          <div
            role="status"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#C9B794] bg-[#E5D7B9]/70 px-3.5 py-2 font-sans text-xs text-[#6B5B4B] dark:border-border dark:bg-secondary/70 dark:text-muted-foreground"
          >
            <span>
              Sebagian foto eksternal membatasi akses kanvas cetak (CORS). Semua foto tetap tampil penuh di grid arsip di bawah.
            </span>
            {onShowAllGrid && (
              <button
                type="button"
                onClick={onShowAllGrid}
                className="font-semibold text-[#261F18] dark:text-foreground underline underline-offset-4"
              >
                Buka Grid Foto →
              </button>
            )}
          </div>
        )}
      </section>
    );
  }
);
