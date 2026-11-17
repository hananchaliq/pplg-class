"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Moon,
  Sun,
  Sparkles,
  Compass,
  X,
  Loader2,
  Flame,
  Volume2,
  VolumeX,
  SkipForward,
  Box,
  Home,
  Users,
  Camera,
  BookOpen,
  Code2,
} from "lucide-react";
import { SITE_CONTENT } from "@/lib/content";
import { useTheme } from "@/lib/theme";
import { useVisualTier } from "@/lib/visual-tier";
import { useSadAudio } from "@/lib/sad-audio";
import { notifyRouteTransitionStart } from "@/lib/use-public-data";

const MOBILE_BOTTOM_LINKS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/anggota", label: "Anggota", icon: Users },
  { href: "/galeri", label: "Galeri", icon: Camera },
  { href: "/kenangan", label: "Kenangan", icon: BookOpen },
  { href: "/karya", label: "Karya", icon: Code2 },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { tier, webglSupported, setManualTier } = useVisualTier();
  const { playing, trackIndex, currentTrack, toggleAudio, nextTrack } =
    useSadAudio();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMobileMenuOpen(false);
    setPendingHref(null);
  }, [pathname]);

  const handleNavigate = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetHref: string
  ) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    e.preventDefault();
    setPendingHref(targetHref);
    setMobileMenuOpen(false);
    notifyRouteTransitionStart();

    if (window.location.pathname === targetHref) {
      window.location.reload();
    } else {
      window.location.assign(targetHref);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="ikat-divider" aria-hidden="true" />
        {pendingHref && (
          <div
            role="progressbar"
            aria-label="Memuat halaman..."
            className="h-0.5 w-full overflow-hidden bg-muted"
          >
            <div className="h-full w-2/3 animate-pulse bg-[var(--color-accent-warm)]" />
          </div>
        )}
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
          {/* Identitas Kelas & Logo "UNO" */}
          <Link
            href="/"
            prefetch={false}
            onClick={(e) => handleNavigate(e, "/")}
            className="group flex min-w-0 items-center gap-2 sm:gap-2.5 rounded-xl py-1 pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <motion.span
              aria-hidden="true"
              whileHover={{ scale: 1.06, rotate: -3 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex h-8 w-10 sm:h-9 sm:w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[#f3ca82] bg-gradient-to-br from-[#d97736] via-[#b84a27] to-[#872b19] font-serif text-[11px] sm:text-xs font-black tracking-wider text-[#fff8ec] shadow-xs"
            >
              <span className="relative z-10 drop-shadow-2xs">UNO</span>
              <Flame
                className="absolute right-0.5 bottom-0.5 size-2.5 text-[#ffe1a6] opacity-85"
                strokeWidth={2.2}
              />
            </motion.span>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-serif text-xs sm:text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-[var(--color-accent-warm)]">
                UNO · {SITE_CONTENT.school.className}
              </span>
              <span className="truncate font-hand text-[11px] sm:text-sm font-bold text-muted-foreground">
                {SITE_CONTENT.school.shortSchool}
              </span>
            </div>
          </Link>

          {/* Navigasi Utama Desktop (Termasuk Kuis) */}
          <nav
            aria-label="Navigasi Utama Album Kenangan"
            className="hidden lg:flex lg:items-center lg:gap-0.5"
          >
            {SITE_CONTENT.nav.links.map((link) => {
              const isCurrentPath =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              const isPending = pendingHref === link.href;
              const isActive = pendingHref ? isPending : isCurrentPath;

              return (
                <motion.div
                  key={link.href}
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                >
                  <Link
                    href={link.href}
                    prefetch={false}
                    onClick={(e) => handleNavigate(e, link.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      isActive
                        ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] font-semibold shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {isPending && <Loader2 className="size-3 animate-spin" />}
                    <span className="relative z-10">{link.label}</span>
                    {!isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1 left-3 right-3 h-0.5 origin-left scale-x-0 rounded-full bg-[var(--color-accent-warm)] transition-transform duration-200 group-hover:scale-x-100"
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Kontrol Global Terpusat di Header: Musik Kenangan + Mode 3D/2D + Mode Sore/Malam */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* 1. Kontrol Musik Kenangan */}
            <div className="inline-flex items-center rounded-xl border border-border bg-card p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={toggleAudio}
                aria-pressed={playing}
                aria-label={
                  playing
                    ? `Jeda musik kenangan (${currentTrack.title})`
                    : "Putar musik kenangan"
                }
                title={
                  playing
                    ? `Sedang diputar: ${currentTrack.title}`
                    : "Putar Musik Kenangan"
                }
                className={`inline-flex min-h-[32px] sm:min-h-[34px] items-center justify-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  playing
                    ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] font-semibold"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {playing ? (
                  <Volume2 className="size-3.5 animate-pulse" />
                ) : (
                  <VolumeX className="size-3.5 text-muted-foreground" />
                )}
                <span className="hidden sm:inline">
                  {playing ? `Lagu #${trackIndex + 1}` : "Musik"}
                </span>
              </button>
              {playing && (
                <button
                  type="button"
                  onClick={nextTrack}
                  aria-label="Lagu kenangan berikutnya"
                  title={`Ganti lagu (${currentTrack.title})`}
                  className="inline-flex size-7 sm:size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <SkipForward className="size-3.5" />
                </button>
              )}
            </div>

            {/* 2. Toggle Mode 3D / 2D Ringan */}
            <button
              type="button"
              disabled={!webglSupported && tier === "simple"}
              onClick={() => setManualTier(tier === "hd" ? "simple" : "hd")}
              aria-label={
                tier === "hd"
                  ? "Beralih ke Mode 2D Ringan"
                  : "Aktifkan Mode 3D Penuh"
              }
              title={
                tier === "hd"
                  ? "Mode 3D Aktif — Klik untuk Mode 2D Ringan"
                  : "Mode 2D Ringan — Klik untuk Mode 3D"
              }
              className={`inline-flex min-h-[34px] sm:min-h-[38px] items-center gap-1 rounded-xl border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap disabled:opacity-50 ${
                tier === "hd"
                  ? "border-[var(--color-chart-1)]/40 bg-card text-foreground hover:bg-muted"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Box className="size-3.5 text-[var(--color-chart-1)]" />
              <span>{tier === "hd" ? "3D" : "2D"}</span>
            </button>

            {/* 3. Toggle Tema Sore / Malam */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Aktifkan Mode Malam"
                  : "Aktifkan Mode Sore"
              }
              title={
                theme === "light"
                  ? "Mode Sore — Klik untuk Mode Malam"
                  : "Mode Malam — Klik untuk Mode Sore"
              }
              className="inline-flex min-h-[34px] sm:min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 sm:px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-[var(--color-accent-warm)]/50 hover:bg-muted whitespace-nowrap"
            >
              {theme === "light" ? (
                <>
                  <Sun className="size-3.5 text-[var(--color-accent-warm)]" />
                  <span className="hidden xl:inline">Sore</span>
                </>
              ) : (
                <>
                  <Moon className="size-3.5 text-[var(--color-accent-warm)]" />
                  <span className="hidden xl:inline">Malam</span>
                </>
              )}
            </button>

            {/* Tombol Menu Mobile/Tablet */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
              className="inline-flex min-h-[34px] sm:min-h-[38px] items-center gap-1.5 rounded-xl border border-[var(--color-accent-warm)]/50 bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted lg:hidden"
            >
              {mobileMenuOpen ? (
                <X className="size-4 text-[var(--color-accent-warm)]" />
              ) : (
                <Compass className="size-4 text-[var(--color-accent-warm)]" />
              )}
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>

        {/* Drawer Menu Mobile / Tablet Lengkap */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              id="mobile-nav-drawer"
              aria-label="Navigasi Mobile Album Kenangan"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden border-t border-border bg-card/98 backdrop-blur-md lg:hidden"
            >
              <div className="mx-auto max-w-7xl px-3.5 py-3.5 sm:px-6">
                <div className="mb-2.5 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent-warm)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="size-3" />
                    <span>Semua Halaman Ruang Kenangan</span>
                  </span>
                  {playing && (
                    <span className="max-w-[160px] truncate font-normal text-muted-foreground">
                      ♪ {currentTrack.title}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {SITE_CONTENT.nav.links.map((link) => {
                    const isCurrentPath =
                      link.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(link.href);
                    const isPending = pendingHref === link.href;
                    const isActive = pendingHref ? isPending : isCurrentPath;

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        prefetch={false}
                        onClick={(e) => handleNavigate(e, link.href)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex min-h-[42px] items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] font-semibold shadow-2xs"
                            : "border border-border/60 bg-background/70 text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="truncate">{link.label}</span>
                        {isPending ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin text-[#fbf6ec]" />
                        ) : isActive ? (
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full bg-[#fbf6ec]"
                          />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>

                {/* Bar Pengaturan Cepat di Dalam Drawer HP */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/60 p-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleAudio}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                        playing
                          ? "bg-[var(--color-accent-warm)] text-[#fbf6ec]"
                          : "border border-border bg-card text-foreground"
                      }`}
                    >
                      {playing ? (
                        <Volume2 className="size-3.5 animate-pulse" />
                      ) : (
                        <VolumeX className="size-3.5 text-muted-foreground" />
                      )}
                      <span>
                        {playing ? `Musik #${trackIndex + 1}` : "Putar Musik"}
                      </span>
                    </button>
                    {playing && (
                      <button
                        type="button"
                        onClick={nextTrack}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 font-medium text-foreground"
                      >
                        <SkipForward className="size-3.5" />
                        <span>Lagu Lain</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!webglSupported && tier === "simple"}
                      onClick={() =>
                        setManualTier(tier === "hd" ? "simple" : "hd")
                      }
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-semibold text-foreground disabled:opacity-50"
                    >
                      <Box className="size-3.5 text-[var(--color-chart-1)]" />
                      <span>Mode {tier === "hd" ? "3D" : "2D"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-semibold text-foreground"
                    >
                      {theme === "light" ? (
                        <>
                          <Sun className="size-3.5 text-[var(--color-accent-warm)]" />
                          <span>Sore</span>
                        </>
                      ) : (
                        <>
                          <Moon className="size-3.5 text-[var(--color-accent-warm)]" />
                          <span>Malam</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Bottom Navigation Bar Khusus Mobile / Tablet (Ramah Jempol Tanpa Memangkas Fitur) */}
      <nav
        aria-label="Navigasi Cepat Bawah Mobile"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-border/90 bg-card/95 px-2 py-1.5 shadow-[0_-6px_20px_rgba(28,18,10,0.12)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {MOBILE_BOTTOM_LINKS.map((item) => {
            const Icon = item.icon;
            const isCurrentPath =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const isPending = pendingHref === item.href;
            const isActive = pendingHref ? isPending : isCurrentPath;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={(e) => handleNavigate(e, item.href)}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--color-accent-warm)]/15 text-[var(--color-accent-warm)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin text-[var(--color-accent-warm)]" />
                ) : (
                  <Icon
                    className={`size-4 ${
                      isActive ? "text-[var(--color-accent-warm)]" : ""
                    }`}
                  />
                )}
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Menu lainnya"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
              mobileMenuOpen ||
              pathname.startsWith("/guru") ||
              pathname.startsWith("/dream-board") ||
              pathname.startsWith("/main")
                ? "bg-[var(--color-accent-warm)]/15 text-[var(--color-accent-warm)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {mobileMenuOpen ? (
              <X className="size-4 text-[var(--color-accent-warm)]" />
            ) : (
              <Compass className="size-4" />
            )}
            <span className="truncate">Lainnya</span>
          </button>
        </div>
      </nav>
    </>
  );
}

