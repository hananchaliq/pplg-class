"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import {
  TeamLanyardRail,
  type LanyardMember,
  type TeamLanyardRailLabels,
} from "@/components/ui/team-lanyard-rail";

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

  // Track pointer down on [data-badge] so clicking ANY card reliably flips it on first click
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
    // Ignore clicks on actual anchor links on the back of a flipped card
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

  // Pastikan lebar stage cukup agar TeamLanyardRail selalu berada dalam mode 1 Gagang Besi Utuh ("rail", bukan carousel)
  // dengan jarak antar kartu lega (150px per kartu) sehingga kartu tampil besar dan mudah diklik untuk flip.
  const railMinWidth =
    items.length <= 5 ? "100%" : `${Math.max(920, items.length * 150 + 96)}px`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/75 py-4 shadow-sm">
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
        </div>
      </div>

      {/* Bar Kontrol Geser Gagang Besi + Info Kartu Aktif & Tombol Balik Cepat */}
      <div className="relative z-10 mt-1 flex flex-col items-center justify-between gap-3 border-t border-border/60 px-4 pt-3 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          {items.length > 5 && (
            <>
              <button
                type="button"
                onClick={() => scrollByAmount(-1)}
                disabled={!canScrollLeft}
                aria-label="Geser gagang besi ke kiri"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                <span>Geser Kiri</span>
              </button>
              <button
                type="button"
                onClick={() => scrollByAmount(1)}
                disabled={!canScrollRight}
                aria-label="Geser gagang besi ke kanan"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted disabled:opacity-40"
              >
                <span>Geser Kanan</span>
                <ChevronRight className="size-4" />
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          <span className="text-xs text-muted-foreground">
            {caption ||
              "Klik kartu ID untuk membalik (Depan/Belakang) atau tarik ke bawah untuk efek pegas"}
          </span>
          {active !== null && items[active] && (
            <button
              type="button"
              onClick={() => setFlipped(flipped === active ? null : active)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--color-accent-warm)]/50 bg-[var(--color-accent-warm)]/10 px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-[var(--color-accent-warm)]/20"
            >
              <RotateCw className="size-3.5 text-[var(--color-accent-warm)]" />
              <span>
                {flipped === active ? "Tutup Sisi Belakang" : "Balik Kartu Ini"}
              </span>
            </button>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
