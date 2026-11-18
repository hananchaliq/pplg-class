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
  Volume2,
  VolumeX,
  SkipForward,
  Box,
  Home,
  Users,
  GraduationCap,
  Camera,
  Star,
  BookOpen,
  Code2,
  Gamepad2,
  Info,
} from "lucide-react";
import { SITE_CONTENT } from "@/lib/content";
import { useTheme } from "@/lib/theme";
import { useVisualTier } from "@/lib/visual-tier";
import { useSadAudio } from "@/lib/sad-audio";
import { UnoLogo } from "@/components/ui/uno-logo";
import { navigateWithVanishingPoint } from "@/components/layout/vanishing-page-transition";

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
    icon: Camera,
  },
  {
    href: "/dream-board",
    label: "Dream Board",
    shortDesc: "Papan cita-cita & catatan doa",
    icon: Star,
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
  { href: "/galeri", label: "Galeri", icon: Camera },
  { href: "/kenangan", label: "Kenangan", icon: BookOpen },
  { href: "/karya", label: "Karya", icon: Code2 },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { tier, webglSupported, setManualTier } = useVisualTier();
  const { playing, trackIndex, currentTrack, toggleAudio, nextTrack } =
    useSadAudio();
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);
  const [logoMeaningOpen, setLogoMeaningOpen] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMobileSheetOpen(false);
    setLogoMeaningOpen(false);
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
    setMobileSheetOpen(false);
    setLogoMeaningOpen(false);
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
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md">
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
          {/* Identitas Brand + Logo UNO + Popover Filosofi */}
          <div className="relative flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              prefetch={false}
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
                  UNO · {SITE_CONTENT.school.className}
                </span>
                <span className="truncate font-mono text-[10px] sm:text-[11px] text-muted-foreground">
                  {SITE_CONTENT.school.shortSchool} · {SITE_CONTENT.school.cohortYears}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setLogoMeaningOpen((prev) => !prev)}
              aria-expanded={logoMeaningOpen}
              aria-label="Makna lambang UNO XII PPLG 1"
              title="Lihat filosofi lambang UNO"
              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
                logoMeaningOpen
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background/80 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
              }`}
            >
              <Info className="size-3.5" />
            </button>

            <AnimatePresence>
              {logoMeaningOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                  className="absolute top-full left-0 z-50 mt-2 w-72 sm:w-80 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <UnoLogo size="sm" />
                      <div>
                        <p className="font-serif text-sm font-bold text-foreground">
                          Filosofi Lambang &ldquo;UNO&rdquo;
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          Satu Keluarga, Satu Cerita
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogoMeaningOpen(false)}
                      aria-label="Tutup penjelasan logo"
                      className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <ul className="mt-2.5 space-y-1.5 border-t border-border pt-2.5 font-sans text-xs leading-relaxed text-muted-foreground">
                    <li>
                      <strong className="text-foreground">Lingkaran Utuh (UNO = Satu):</strong>{" "}
                      Persatuan keluarga besar {SITE_CONTENT.school.className} yang tak terputus oleh jarak &amp; waktu.
                    </li>
                    <li>
                      <strong className="text-foreground">3 Bintang Angkatan:</strong>{" "}
                      Melambangkan 3 tahun perjalanan bersama di madrasah (Kelas X, XI, dan XII).
                    </li>
                    <li>
                      <strong className="text-foreground">Simbol &lt;•&gt; &amp; Cincin Film:</strong>{" "}
                      Rekam jejak kode perangkat lunak PPLG yang terbingkai dalam arsip film kenangan.
                    </li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
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
                  prefetch={false}
                  onClick={(e) => handleNavigate(e, link.href)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-2.5 py-1 font-sans text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Icon
                      className={`size-3.5 ${
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                  )}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Kontrol Global: Musik + 3D/2D + Tema */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="inline-flex items-center rounded-lg border border-border bg-background/80 p-0.5">
              <button
                type="button"
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
                className={`inline-flex min-h-[32px] items-center justify-center gap-1 rounded-md px-2 py-1 font-sans text-xs font-semibold transition-colors whitespace-nowrap ${
                  playing
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {playing ? (
                  <Volume2 className="size-3.5" />
                ) : (
                  <VolumeX className="size-3.5 text-muted-foreground" />
                )}
                <span className="hidden sm:inline">
                  {playing ? `#${trackIndex + 1}` : "Musik"}
                </span>
              </button>
              {playing && (
                <button
                  type="button"
                  onClick={nextTrack}
                  aria-label="Ganti lagu kenangan berikutnya"
                  title={`Ganti lagu (${currentTrack.title})`}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <SkipForward className="size-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={!webglSupported && tier === "simple"}
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
              className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors whitespace-nowrap disabled:opacity-50 ${
                tier === "hd"
                  ? "border-foreground/35 bg-secondary text-foreground hover:bg-muted"
                  : "border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Box className="size-3.5 text-foreground" />
              <span>{tier === "hd" ? "3D" : "2D"}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
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
              {theme === "light" ? (
                <>
                  <Sun className="size-3.5 text-foreground" />
                  <span className="hidden xl:inline">Terang</span>
                </>
              ) : (
                <>
                  <Moon className="size-3.5 text-foreground" />
                  <span className="hidden xl:inline">Gelap</span>
                </>
              )}
            </button>
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

      {/* Drawer Semua Ruang Mobile */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.section
            id="mobile-bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Semua Ruang Kenangan XII PPLG 1"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
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
              {NAV_ITEMS.map((item) => {
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
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Navigasi Bawah Mobile (< lg) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="fixed right-0 bottom-0 left-0 z-50 border-t border-border bg-card/95 px-2 py-1.5 shadow-[0_-4px_20px_rgba(27,27,26,0.1)] backdrop-blur-md lg:hidden"
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
                prefetch={false}
                onClick={(e) => handleNavigate(e, item.href)}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 font-sans text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
                <span className="max-w-full truncate px-0.5">{item.label}</span>
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
