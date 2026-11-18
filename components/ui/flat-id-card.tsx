"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Crown, Sparkles } from "lucide-react";
import type {
  LanyardMember,
  TeamLanyardRailLabels,
} from "@/components/ui/team-lanyard-rail";
import { SITE_CONTENT } from "@/lib/content";

const FLAT_CARD_PALETTE_16 = [
  "bg-[#2D6366]",
  "bg-[#A95A42]",
  "bg-[#B5843F]",
  "bg-[#475B78]",
  "bg-[#4E6E52]",
  "bg-[#7D4B5A]",
  "bg-[#8C583A]",
  "bg-[#38687A]",
  "bg-[#6C7046]",
  "bg-[#9E6B43]",
  "bg-[#585175]",
  "bg-[#3D6E62]",
  "bg-[#964C4C]",
  "bg-[#5E6B7A]",
  "bg-[#857444]",
  "bg-[#664E6B]",
];

function SilhouetteAvatar() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className="size-full text-muted-foreground/60"
    >
      <circle cx="20" cy="15" r="7" fill="currentColor" />
      <path d="M6 38c1.5-8 7-12 14-12s12.5 4 14 12z" fill="currentColor" />
    </svg>
  );
}

export interface FlatIdCardRailProps {
  items: LanyardMember[];
  eyebrow?: string;
  heading?: string;
  caption?: string;
  action?: React.ReactNode;
  labels?: TeamLanyardRailLabels;
  onSelectMember?: (member: LanyardMember | null) => void;
}

export function FlatIdCardRail({
  items,
  eyebrow,
  heading,
  caption,
  action,
  labels = SITE_CONTENT.lanyardLabels,
  onSelectMember,
}: FlatIdCardRailProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [flippedId, setFlippedId] = React.useState<string | null>(null);
  const [failedImages, setFailedImages] = React.useState<Record<string, boolean>>({});
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setActiveIndex(0);
    setFlippedId(null);
    setFailedImages({});
  }, [items]);

  const handleToggleFlip = (item: LanyardMember, idx: number) => {
    setActiveIndex(idx);
    setFlippedId((prev) => {
      const next = prev === item.id ? null : item.id;
      onSelectMember?.(item);
      return next;
    });
  };

  const scrollToCard = (idx: number) => {
    const safeIdx = Math.max(0, Math.min(items.length - 1, idx));
    setActiveIndex(safeIdx);
    const item = items[safeIdx] ?? null;
    onSelectMember?.(item);
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[safeIdx] as HTMLElement | undefined;
    if (child) {
      child.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  const activePerson = items[activeIndex] ?? null;
  const isShowingBack = activePerson && flippedId === activePerson.id;

  if (items.length === 0) {
    return (
      <section
        aria-label={heading ?? "Daftar Kartu Identitas"}
        className="relative w-full overflow-hidden rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center"
      >
        {eyebrow && (
          <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>
        )}
        {heading && (
          <h2 className="mt-1 font-serif text-xl font-bold text-foreground">
            {heading}
          </h2>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Belum ada data kartu ID di database Supabase untuk kategori ini (0 data). Silakan tambahkan data melalui Dasbor Admin.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={heading ?? "Daftar Kartu Identitas"}
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-card/60 py-6"
    >
      {(eyebrow || heading) && (
        <header className="flex flex-col items-center gap-1 px-4 text-center">
          {eyebrow && (
            <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>
          )}
          {heading && (
            <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {heading}
            </h2>
          )}
        </header>
      )}

      {/* Visual 1 Gagang Besi di Atas Deretan Kartu */}
      <div className="relative mx-4 mt-5 flex items-center">
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 rounded-sm bg-gradient-to-b from-[#6E6B64] to-[#2A2A28] shadow"
        />
        <span
          aria-hidden="true"
          className="h-1.5 flex-1 bg-gradient-to-b from-[#A8A49B] via-[#5C5A54] to-[#2A2A28] shadow-xs"
        />
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 rounded-sm bg-gradient-to-b from-[#6E6B64] to-[#2A2A28] shadow"
        />
      </div>

      {/* Carousel geser horizontal pada 1 gagang besi */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, idx) => {
          const isFlipped = flippedId === item.id;
          const isSpecialFriend =
            item.team === "Pernah Bersama Kita" || item.tone === 5;
          const colorClass = isSpecialFriend
            ? "bg-gradient-to-r from-[#8E6D2F] via-[#D8B467] to-[#8E6D2F]"
            : FLAT_CARD_PALETTE_16[idx % FLAT_CARD_PALETTE_16.length]!;
          const showImg = Boolean(item.image) && !failedImages[item.id];

          return (
            <div
              key={item.id}
              className="w-[244px] sm:w-[264px] shrink-0 snap-center"
            >
              {/* Tali gantungan pendek dari gagang besi ke kartu */}
              <div className="mx-auto flex flex-col items-center" aria-hidden="true">
                <span className={`h-5 w-3 ${colorClass}`} />
                <span className="size-3 rounded-full border border-border bg-muted" />
              </div>

              <button
                type="button"
                aria-label={`${item.name}, ${item.role}. ${
                  isFlipped ? labels.back : labels.flip
                }`}
                aria-pressed={isFlipped}
                onClick={() => handleToggleFlip(item, idx)}
                className={`group relative flex h-[338px] w-full flex-col justify-between overflow-hidden rounded-xl border p-4 text-left text-card-foreground shadow-sm transition-transform active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  isSpecialFriend
                    ? "border-2 border-foreground/70 bg-secondary shadow-md"
                    : "border-border bg-card"
                }`}
              >
                {/* Pita warna monokrom di bagian atas kartu */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-12 ${colorClass}`}
                />
                {/* Lubang Lanyard */}
                <span
                  aria-hidden="true"
                  className="relative mx-auto mt-0.5 block h-2 w-10 rounded-full bg-background/90"
                />

                {!isFlipped ? (
                  /* Sisi Depan Kartu */
                  <div className="relative z-10 mt-3 flex flex-1 flex-col items-center text-center">
                    {isSpecialFriend && (
                      <span className="mb-1 inline-flex items-center gap-1 border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] font-bold text-foreground shadow-2xs">
                        <Crown className="size-3 text-foreground" />
                        <span>Sahabat Istimewa</span>
                      </span>
                    )}
                    <div
                      className={`relative size-22 overflow-hidden rounded-full bg-muted shadow-sm ${
                        isSpecialFriend
                          ? "border-2 border-foreground ring-2 ring-border"
                          : "border-2 border-card"
                      }`}
                    >
                      <SilhouetteAvatar />
                      {showImg && (
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                          }
                          className="public-film-photo absolute inset-0 size-full object-cover"
                        />
                      )}
                    </div>
                    <p className="mt-3 w-full truncate font-serif text-base font-bold text-foreground">
                      {item.name}
                    </p>
                    <p className="mt-0.5 w-full truncate text-xs text-muted-foreground">
                      {item.role}
                    </p>
                    {item.team && (
                      <p className="mt-1.5 w-full truncate text-[11px] font-semibold text-muted-foreground/90">
                        {isSpecialFriend ? `♛ ${item.team} ❀` : item.team}
                      </p>
                    )}
                    <div className="mt-auto w-full border-t border-dashed border-border pt-2.5 text-center">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] tracking-widest text-muted-foreground">
                        {isSpecialFriend && <Sparkles className="size-3 text-foreground" />}
                        <span>TAP UNTUK MEMBALIK</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Sisi Belakang Kartu */
                  <div className="relative z-10 mt-4 flex flex-1 flex-col justify-between text-left">
                    <div>
                      <p className="truncate font-serif text-sm font-bold text-foreground">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.role}
                      </p>
                      {item.bio && (
                        <p className="mt-2.5 line-clamp-4 text-xs leading-relaxed text-card-foreground/90">
                          {item.bio}
                        </p>
                      )}
                    </div>

                    {item.tags && item.tags.length > 0 && (
                      <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                        {item.tags.slice(0, 3).join(" · ")}
                      </p>
                    )}

                    <div className="mt-2 border-t border-dashed border-border pt-2 text-right">
                      <span className="text-[11px] font-medium text-foreground">
                        Tap lagi untuk kembali ↩
                      </span>
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Navigasi Prev / Next Ikon di Bawah Gagang Besi */}
      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 px-4">
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => scrollToCard(activeIndex - 1)}
            aria-label="Kartu sebelumnya"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-xs transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="min-w-[4.5rem] text-center font-mono text-xs font-bold tabular-nums text-foreground">
            {String(activeIndex + 1).padStart(2, "0")}{" "}
            <span className="text-muted-foreground">/</span>{" "}
            {String(items.length).padStart(2, "0")}
          </span>

          <button
            type="button"
            disabled={activeIndex >= items.length - 1}
            onClick={() => scrollToCard(activeIndex + 1)}
            aria-label="Kartu berikutnya"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-xs transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* Keterangan dan tombol aksi di bawah rail */}
      <div className="mt-3 flex flex-col items-center gap-2.5 px-4 text-center">
        <div aria-live="polite" className="min-h-[2.2rem]">
          <p className="text-xs font-medium text-foreground">
            {activePerson ? `${activePerson.name} — ${activePerson.role}` : caption}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {activePerson ? (isShowingBack ? labels.back : labels.flip) : ""}
          </p>
        </div>
        {action && <div className="flex w-full justify-center sm:w-auto">{action}</div>}
      </div>
    </section>
  );
}
