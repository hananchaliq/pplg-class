"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Moon,
  Sun,
  Compass,
  X,
  Loader2,
  Music,
  Disc3,
  SkipForward,
  SlidersHorizontal,
  Box,
  Home,
  Users,
  GraduationCap,
  Newspaper,
  Pin,
  BookOpen,
  Code2,
  Gamepad2,
} from "lucide-react";
import { SITE_CONTENT } from "@/lib/content";
import { useTheme } from "@/lib/theme";
import { useVisualTier } from "@/lib/visual-tier";
import { useSadAudio } from "@/lib/sad-audio";
import { UnoLogo } from "@/components/ui/uno-logo";
import { navigateWithVanishingPoint } from "@/components/layout/vanishing-page-transition";
import {
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_STAGGER,
} from "@/lib/motion-tokens";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Beranda",
    shortDesc: "Editorial 35mm & peta kenangan",
    icon: Home,
  },
  {
    href: "/anggota",
    label: "Anggota",
    shortDesc: "Profil & kartu ID lanyard 3D",
    icon: Users,
  },
  {
    href: "/guru",
    label: "Guru",
    shortDesc: "Wali kelas & dewan pengajar",
    icon: GraduationCap,
  },
  {
    href: "/galeri",
    label: "Galeri",
    shortDesc: "Koran jadul kenangan & foto kelas",
    icon: Newspaper,
  },
  {
    href: "/dream-board",
    label: "Dream Board",
    shortDesc: "Papan cita-cita & catatan doa",
    icon: Pin,
  },
  {
    href: "/kenangan",
    label: "Kenangan",
    shortDesc: "Buku kenangan 3D & kapsul waktu",
    icon: BookOpen,
  },
  {
    href: "/karya",
    label: "Karya",
    shortDesc: "Pameran proyek & coding siswa",
    icon: Code2,
  },
  {
    href: "/main",
    label: "Main",
    shortDesc: "Kuis kenangan & polling kelas",
    icon: Gamepad2,
  },
] as const;

const MOBILE_PRIMARY_TABS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/anggota", label: "Anggota", icon: Users },
  { href: "/galeri", label: "Galeri", icon: Newspaper },
  { href: "/kenangan", label: "Kenangan", icon: BookOpen },
  { href: "/karya", label: "Karya", icon: Code2 },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { tier, setManualTier } = useVisualTier();
  const {
    playing,
    trackIndex,
    currentTrack,
    musicMenuOpen,
    toggleAudio,
    nextTrack,
    toggleMusicMenu,
  } = useSadAudio();
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    setMobileSheetOpen(false);
    setPendingHref(null);
  }, [pathname]);

  React.useEffect(() => {
    if (!mobileSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSheetOpen]);

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
    setMobileSheetOpen(false);
    if (window.location.pathname !== targetHref) {
      setPendingHref(targetHref);
    }
    navigateWithVanishingPoint(targetHref, router);
  };

  const isSecondaryRouteActive =
    pathname.startsWith("/guru") ||
    pathname.startsWith("/dream-board") ||
    pathname.startsWith("/main");

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full border-b transition-[background-color,border-color,box-shadow] duration-300 ${
          isScrolled
            ? "editorial-glass border-border/80 shadow-sm"
            : "border-border bg-card/90 backdrop-blur-md"
        }`}
      >
        <div className="ikat-divider" aria-hidden="true" />
        {pendingHref && (
          <div
            role="progressbar"
            aria-label="Memuat halaman..."
            className="h-0.5 w-full overflow-hidden bg-muted"
          >
            <div className="h-full w-2/3 bg-primary transition-all duration-300" />
          </div>
        )}

        <div className="mx-auto flex h-15 sm:h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
          {/* Identitas Brand Kiri: Logo + PPLG 1 / MAKN Ende */}
          <div className="relative flex min-w-0 items-center">
            <Link
              href="/"
              onClick={(e) => handleNavigate(e, "/")}
              className="group flex min-w-0 items-center gap-2 sm:gap-2.5 rounded-xl py-1 pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: -3 }}
                whileTap={{ scale: 0.96 }}
              >
                <UnoLogo size="md" />
              </motion.div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-serif text-sm sm:text-base font-bold tracking-tight text-foreground transition-opacity group-hover:opacity-75">
                  PPLG 1
                </span>
                <span className="truncate font-mono text-[10px] sm:text-[11px] text-muted-foreground">
                  {SITE_CONTENT.school.shortSchool}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigasi Utama Desktop (lg+) */}
          <nav
            aria-label="Navigasi Utama Desktop"
            className="hidden lg:flex lg:items-center lg:gap-0.5 lg:rounded-lg lg:border lg:border-border lg:bg-background/75 lg:p-1"
          >
            {NAV_ITEMS.map((link) => {
              const Icon = link.icon;
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
                  onClick={(e) => handleNavigate(e, link.href)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-2.5 py-1 font-sans text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="desktop-nav-pill"
                      transition={MOTION_EASE.springNav}
                      className="absolute inset-0 rounded-md bg-primary shadow-xs"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Icon
                        className={`size-3.5 transition-transform duration-200 group-hover:scale-110 ${
                          isActive
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                    )}
                    <span>{link.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Kontrol Global: Musik (Hover Expand CD) + 3D/2D + Tema Radial */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="group/music inline-flex items-center rounded-lg border border-border bg-background/80 p-0.5 transition-all duration-300 ease-out">
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleAudio}
                aria-pressed={playing}
                aria-label={
                  playing
                    ? `Matikan musik (${currentTrack.title})`
                    : "Putar musik kenangan"
                }
                title={
                  playing
                    ? `Sedang diputar: ${currentTrack.title}`
                    : "Putar Musik Kenangan"
                }
                className={`inline-flex size-8 items-center justify-center rounded-md font-sans text-xs font-semibold transition-colors ${
                  playing
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {playing ? (
                    <motion.span
                      key="disc-playing"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="inline-flex items-center gap-0.5"
                    >
                      <Disc3 className="size-3.5 animate-spin [animation-duration:3.5s]" />
                      <span className="inline-flex h-2.5 items-end gap-[1.5px]" aria-hidden="true">
                        <span className="w-[1.5px] rounded-full bg-[var(--accent-gold)] animate-pulse h-2" />
                        <span className="w-[1.5px] rounded-full bg-[var(--accent-gold)] animate-pulse h-2.5 [animation-delay:140ms]" />
                      </span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="music-idle"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="inline-flex"
                    >
                      <Music className="size-3.5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Tombol Kontrol CD Tambahan: Melebar Halus ke Kanan saat Hover / Focus */}
              <div className="flex max-w-0 items-center overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover/music:max-w-[140px] group-hover/music:pl-1 group-hover/music:opacity-100 group-focus-within/music:max-w-[140px] group-focus-within/music:pl-1 group-focus-within/music:opacity-100">
                <span className="px-1.5 font-mono text-[10px] font-bold text-foreground whitespace-nowrap">
                  CD #{trackIndex + 1}
                </span>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextTrack}
                  aria-label="Ganti lagu kenangan berikutnya"
                  title={`Lagu berikutnya (${currentTrack.title})`}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <SkipForward className="size-3.5" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMusicMenu}
                  aria-expanded={musicMenuOpen}
                  aria-label="Buka daftar putar musik"
                  title="Buka daftar lagu YouTube"
                  className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                    musicMenuOpen
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <SlidersHorizontal className="size-3.5" />
                </motion.button>
              </div>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              onClick={() => setManualTier(tier === "hd" ? "simple" : "hd")}
              aria-label={
                tier === "hd"
                  ? "Matikan Mode 3D (Beralih ke 2D Hemat)"
                  : "Aktifkan Mode 3D"
              }
              title={
                tier === "hd"
                  ? "Mode 3D Aktif — Klik untuk Mode 2D"
                  : "Mode 2D — Klik untuk Mode 3D"
              }
              className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors whitespace-nowrap ${
                tier === "hd"
                  ? "border-foreground/35 bg-secondary text-foreground hover:bg-muted"
                  : "border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Box className="size-3.5 text-foreground" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={tier}
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  {tier === "hd" ? "3D" : "2D"}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              onClick={(e) => toggleTheme(e)}
              aria-label={
                theme === "light"
                  ? "Ganti ke Ruang Gelap (Dark Mode)"
                  : "Ganti ke Kertas Terang (Light Mode)"
              }
              title={
                theme === "light"
                  ? "Kertas Terang — Klik untuk Ruang Gelap"
                  : "Ruang Gelap — Klik untuk Kertas Terang"
              }
              className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-border bg-background/80 px-2.5 py-1 font-sans text-xs font-semibold text-foreground transition-colors hover:border-foreground/50 hover:bg-muted whitespace-nowrap"
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === "light" ? (
                  <motion.span
                    key="theme-sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 360, damping: 22 }}
                    className="inline-flex items-center gap-1"
                  >
                    <Sun className="size-3.5 text-foreground" />
                    <span className="hidden xl:inline">Terang</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="theme-moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 360, damping: 22 }}
                    className="inline-flex items-center gap-1"
                  >
                    <Moon className="size-3.5 text-foreground" />
                    <span className="hidden xl:inline">Gelap</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Backdrop Drawer Mobile */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setMobileSheetOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-[2px] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Drawer Semua Ruang Mobile (Drag-to-Dismiss + Staggered Reveal) */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.section
            id="mobile-bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Semua Ruang Kenangan XII PPLG 1"
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={MOTION_EASE.springSheet}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 75 || info.velocity.y > 380) {
                setMobileSheetOpen(false);
              }
            }}
            className="fixed inset-x-0 bottom-[62px] z-50 mx-auto max-h-[75dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl lg:hidden"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />

            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Compass className="size-4 text-foreground" />
                <span className="font-serif text-sm font-bold text-foreground">
                  Jelajahi Semua Ruang (8 Halaman)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="Tutup menu"
                className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                const isCurrentPath =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const isPending = pendingHref === item.href;
                const isActive = pendingHref ? isPending : isCurrentPath;

                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: MOTION_DURATION.fast,
                      delay: idx * MOTION_STAGGER.tight,
                      ease: MOTION_EASE.editorial,
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={(e) => handleNavigate(e, item.href)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background/80 text-foreground hover:bg-muted/70"
                      }`}
                    >
                      <span
                        className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Icon className="size-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-sans text-xs font-bold">
                          {item.label}
                        </span>
                        <span
                          className={`block truncate font-sans text-[10px] ${
                            isActive
                              ? "text-primary-foreground/85"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.shortDesc}
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Navigasi Bawah Mobile (< lg) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="editorial-glass fixed right-0 bottom-0 left-0 z-50 border-t border-border px-2 py-1.5 shadow-[0_-6px_24px_rgba(27,27,26,0.12)] lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {MOBILE_PRIMARY_TABS.map((item) => {
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
                onClick={(e) => handleNavigate(e, item.href)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 font-sans text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    transition={MOTION_EASE.springNav}
                    className="absolute inset-0 rounded-lg bg-primary shadow-xs"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 flex flex-col items-center justify-center gap-0.5">
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                  <span className="max-w-full truncate px-0.5">{item.label}</span>
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileSheetOpen((prev) => !prev)}
            aria-expanded={mobileSheetOpen}
            aria-controls="mobile-bottom-sheet"
            aria-label="Buka semua halaman"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 font-sans text-[10px] font-semibold transition-colors ${
              mobileSheetOpen || isSecondaryRouteActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {mobileSheetOpen ? (
              <X className="size-4" />
            ) : (
              <Compass className="size-4" />
            )}
            <span className="truncate">
              {pathname.startsWith("/guru")
                ? "Guru"
                : pathname.startsWith("/dream-board")
                  ? "Mimpi"
                  : pathname.startsWith("/main")
                    ? "Main"
                    : "Lainnya"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
