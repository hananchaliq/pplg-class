"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import {
  TeamLanyardRail,
  type LanyardMember,
  type TeamLanyardRailLabels,
} from "@/components/ui/team-lanyard-rail";
import { StageCurtainLoader } from "@/components/three/stage-curtain-loader";

interface SingleIronRailLanyardProps {
  items: LanyardMember[];
  eyebrow?: string;
  heading?: string;
  caption?: string;
  labels?: TeamLanyardRailLabels;
  action?: React.ReactNode;
  active?: number | null;
  onActiveChange?: (index: number | null) => void;
  flipped?: number | null;
  onFlippedChange?: (index: number | null) => void;
  railKey?: string;
}

export function SingleIronRailLanyard({
  items,
  eyebrow,
  heading,
  caption,
  labels,
  action,
  active: controlledActive,
  onActiveChange,
  flipped: controlledFlipped,
  onFlippedChange,
  railKey,
}: SingleIronRailLanyardProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [innerActive, setInnerActive] = React.useState<number | null>(0);
  const [innerFlipped, setInnerFlipped] = React.useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isTransitioningOut, setIsTransitioningOut] = React.useState(false);
  const [railReady, setRailReady] = React.useState(false);
  const [railProgress, setRailProgress] = React.useState(26);

  React.useEffect(() => {
    setRailReady(false);
    setRailProgress(35);
    const t1 = window.setTimeout(() => setRailProgress(82), 140);
    const t2 = window.setTimeout(() => {
      setRailProgress(100);
      setRailReady(true);
    }, 380);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [railKey]);

  React.useEffect(() => {
    const onRouteStart = () => {
      setIsTransitioningOut(true);
    };
    window.addEventListener("app:route-transition-start", onRouteStart);
    return () =>
      window.removeEventListener("app:route-transition-start", onRouteStart);
  }, []);

  const active =
    controlledActive !== undefined ? controlledActive : innerActive;
  const flipped =
    controlledFlipped !== undefined ? controlledFlipped : innerFlipped;

  const flippedRef = React.useRef<number | null>(flipped);
  React.useEffect(() => {
    flippedRef.current = flipped;
  }, [flipped]);

  const setActive = React.useCallback(
    (next: number | null) => {
      if (controlledActive === undefined) setInnerActive(next);
      onActiveChange?.(next);
    },
    [controlledActive, onActiveChange]
  );

  const setFlipped = React.useCallback(
    (next: number | null) => {
      flippedRef.current = next;
      if (controlledFlipped === undefined) setInnerFlipped(next);
      onFlippedChange?.(next);
    },
    [controlledFlipped, onFlippedChange]
  );

  const updateScrollButtons = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    updateScrollButtons();
    const onResize = () => updateScrollButtons();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [items.length, railKey, updateScrollButtons]);

  const scrollByAmount = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(320, Math.round(el.clientWidth * 0.68));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const clickTrackerRef = React.useRef<{
    badgeIdx: number;
    startX: number;
    startY: number;
    flippedBefore: number | null;
    handledByInner: boolean;
  }>({
    badgeIdx: -1,
    startX: 0,
    startY: 0,
    flippedBefore: null,
    handledByInner: false,
  });

  const handleFlippedFromInner = React.useCallback(
    (next: number | null) => {
      clickTrackerRef.current.handledByInner = true;
      setFlipped(next);
    },
    [setFlipped]
  );

  const handlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const badgeBtn = target?.closest?.("[data-badge]") as HTMLElement | null;
    if (!badgeBtn) {
      clickTrackerRef.current.badgeIdx = -1;
      return;
    }
    const rawIdx = Number(badgeBtn.getAttribute("data-badge"));
    if (Number.isNaN(rawIdx)) {
      clickTrackerRef.current.badgeIdx = -1;
      return;
    }
    clickTrackerRef.current = {
      badgeIdx: rawIdx,
      startX: e.clientX,
      startY: e.clientY,
      flippedBefore: flippedRef.current,
      handledByInner: false,
    };
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const tracker = clickTrackerRef.current;
    if (tracker.badgeIdx < 0) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest?.("a")) return;

    const dist = Math.hypot(
      e.clientX - tracker.startX,
      e.clientY - tracker.startY
    );
    const clickedIdx = tracker.badgeIdx;
    const before = tracker.flippedBefore;

    if (dist <= 10) {
      queueMicrotask(() => {
        if (!clickTrackerRef.current.handledByInner) {
          const nextFlipped = before === clickedIdx ? null : clickedIdx;
          setActive(clickedIdx);
          setFlipped(nextFlipped);
        }
      });
    }
  };

  const railMinWidth =
    items.length <= 5 ? "100%" : `${Math.max(920, items.length * 150 + 96)}px`;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        {heading && (
          <h2 className="mt-1 font-serif text-xl font-bold text-foreground">
            {heading}
          </h2>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Belum ada data kartu ID di database Supabase untuk kategori ini (0 data). Silakan tambahkan data melalui Dasbor Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/75 py-4 shadow-sm">
      {/* Tirai Merah Bioskop / Panggung 3D saat Model Kartu ID Lanyard 3D Di-Generate */}
      <StageCurtainLoader
        ready={railReady}
        progress={railProgress}
        label="Merangkai gantungan ID Card 3D..."
        sceneTitle={
          heading ? heading.toUpperCase() : "PANGGUNG 3D · KARTU ID XII PPLG 1"
        }
      />

      {(eyebrow || heading) && (
        <header className="relative z-10 flex flex-col items-center gap-1 px-4 pt-2 text-center sm:px-6">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          {heading && (
            <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {heading}
            </h2>
          )}
        </header>
      )}

      {/* Viewport Geser 1 Gagang Besi Utuh */}
      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        onPointerDownCapture={handlePointerDownCapture}
        onClick={handleClick}
        className="relative w-full overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:thin]"
      >
        <div style={{ width: railMinWidth, minWidth: "100%" }}>
          {!isTransitioningOut ? (
            <TeamLanyardRail
              key={railKey}
              items={items}
              autoplay={false}
              labels={labels}
              active={active}
              onActiveChange={setActive}
              flipped={flipped}
              onFlippedChange={handleFlippedFromInner}
              className="bg-transparent"
            />
          ) : (
            <div className="h-[340px] w-full" />
          )}
        </div>
      </div>

      {/* Bar Kontrol Geser Gagang Besi + Petunjuk Ikon Singkat */}
      <div className="relative z-10 mt-1 flex flex-col items-stretch justify-between gap-2.5 border-t border-border/60 px-3 pt-3 sm:flex-row sm:items-center sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:justify-start">
          {items.length > 5 && (
            <button
              type="button"
              onClick={() => scrollByAmount(-1)}
              disabled={!canScrollLeft}
              aria-label="Geser gagang besi ke kiri"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              <span>Kiri</span>
            </button>
          )}

          {active !== null && items[active] && (
            <button
              type="button"
              onClick={() => setFlipped(flipped === active ? null : active)}
              className="inline-flex min-h-[36px] flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border border-[var(--color-accent-warm)]/50 bg-[var(--color-accent-warm)]/10 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-[var(--color-accent-warm)]/20"
            >
              <RotateCw className="size-3.5 text-[var(--color-accent-warm)]" />
              <span>
                {flipped === active ? "Tutup" : "Balik Kartu"}
              </span>
            </button>
          )}

          {items.length > 5 && (
            <button
              type="button"
              onClick={() => scrollByAmount(1)}
              disabled={!canScrollRight}
              aria-label="Geser gagang besi ke kanan"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted disabled:opacity-40"
            >
              <span>Kanan</span>
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-center text-center">
          <span className="font-mono text-[10px] sm:text-[11px] text-muted-foreground">
            {caption || "Klik: Balik · Tarik: Pegas · Geser: Jelajah"}
          </span>
        </div>

        {action && <div className="flex w-full justify-center sm:w-auto sm:shrink-0">{action}</div>}
      </div>
    </div>
  );
}
