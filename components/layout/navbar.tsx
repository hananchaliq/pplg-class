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
import { notifyRouteTransitionStart } from "@/lib/use-public-data";
import { UnoLogo } from "@/components/ui/uno-logo";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Beranda",
    shortDesc: "Meja belajar & ringkasan kelas",
    icon: Home,
  },
  {
    href: "/anggota",
    label: "Anggota",
    shortDesc: "Profil & kartu ID 3D siswa",
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
    shortDesc: "Jemuran foto Kelas X, XI, XII",
    icon: Camera,
  },
  {
    href: "/dream-board",
    label: "Dream Board",
    shortDesc: "Papan gabus impian & cita-cita",
    icon: Star,
  },
  {
    href: "/kenangan",
    label: "Kenangan",
    shortDesc: "Buku kenangan & kapsul waktu",
    icon: BookOpen,
  },
  {
    href: "/karya",
    label: "Karya",
    shortDesc: "Etalase projek & peta keahlian",
    icon: Code2,
  },
  {
    href: "/main",
    label: "Kuis",
    shortDesc: "Tebak kenangan & polling kelas",
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
    setPendingHref(targetHref);
    setMobileSheetOpen(false);
    setLogoMeaningOpen(false);
    notifyRouteTransitionStart();

    if (window.location.pathname === targetHref) {
      window.location.reload();
    } else {
      window.location.assign(targetHref);
    }
  };

  const isSecondaryRouteActive =
    pathname.startsWith("/guru") ||
    pathname.startsWith("/dream-board") ||
    pathname.startsWith("/main");

  return (
    <>
      {/* =====================================================================
          1. HEADER ATAS (Mobile & Desktop):
             Berisi Identitas Logo Bulat UNO + Kontrol Global (Musik, 3D/2D, Sore/Malam).
             Di Mobile TIDAK ada tombol Menu/Navigasi di atas karena navigasi halaman
             sepenuhnya berada di Bottom Navigation Bar di bawah.
         ===================================================================== */}
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
          {/* Identitas Kelas & Logo Bulat "UNO" + Popover Makna Logo */}
          <div className="relative flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              prefetch={false}
              onClick={(e) => handleNavigate(e, "/")}
              className="group flex min-w-0 items-center gap-2 sm:gap-2.5 rounded-full py-1 pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <motion.div
                whileHover={{ scale: 1.07, rotate: -4 }}
                whileTap={{ scale: 0.95 }}
              >
                <UnoLogo size="md" />
              </motion.div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-serif text-xs sm:text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-[var(--color-accent-warm)]">
                  UNO · {SITE_CONTENT.school.className}
                </span>
                <span className="truncate font-mono text-[10px] sm:text-xs font-medium tracking-wide text-muted-foreground">
                  {SITE_CONTENT.school.shortSchool} · {SITE_CONTENT.school.cohortYears}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setLogoMeaningOpen((prev) => !prev)}
              aria-expanded={logoMeaningOpen}
              aria-label="Filosofi & makna logo bulat UNO"
              title="Lihat filosofi & makna logo UNO"
              className={`inline-flex size-6 sm:size-7 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
                logoMeaningOpen
                  ? "border-[var(--color-accent-warm)] bg-[var(--color-accent-warm)] text-[#fbf6ec]"
                  : "border-border/80 bg-card text-muted-foreground hover:border-[var(--color-accent-warm)]/60 hover:text-foreground"
              }`}
            >
              <Info className="size-3 sm:size-3.5" />
            </button>

            <AnimatePresence>
              {logoMeaningOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-full left-0 z-50 mt-2 w-72 sm:w-80 rounded-2xl border border-border bg-card p-3.5 sm:p-4 text-card-foreground shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <UnoLogo size="sm" />
                      <div>
                        <p className="font-serif text-xs sm:text-sm font-bold text-foreground">
                          Filosofi Logo Bulat &ldquo;UNO&rdquo;
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Lambang Persaudaraan XII PPLG 1
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogoMeaningOpen(false)}
                      aria-label="Tutup info logo"
                      className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <ul className="mt-2.5 space-y-1.5 border-t border-border/70 pt-2.5 text-[11px] sm:text-xs leading-relaxed text-muted-foreground">
                    <li>
                      <strong className="text-foreground">Lingkaran Utuh (UNO = Satu):</strong>{" "}
                      Persatuan satu keluarga besar XII PPLG 1 yang tak terputus oleh jarak & waktu.
                    </li>
                    <li>
                      <strong className="text-foreground">3 Bintang Puncak:</strong>{" "}
                      3 warna Danau Kelimutu Ende & 3 fase perjalanan (Kelas X, XI, XII).
                    </li>
                    <li>
                      <strong className="text-foreground">Simbol &lt;•&gt; & Cincin Tenun:</strong>{" "}
                      Perpaduan budaya Tenun Ikat Ende dan logika kode rekayasa perangkat lunak.
                    </li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigasi Utama Desktop dalam Kapsul Rapi (Hanya tampil di Desktop lg+) */}
          <nav
            aria-label="Navigasi Utama Album Kenangan"
            className="hidden lg:flex lg:items-center lg:gap-0.5 lg:rounded-full lg:border lg:border-border/80 lg:bg-card/85 lg:p-1 lg:shadow-2xs"
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
                <motion.div
                  key={link.href}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Link
                    href={link.href}
                    prefetch={false}
                    onClick={(e) => handleNavigate(e, link.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      isActive
                        ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] font-semibold shadow-2xs"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Icon
                        className={`size-3.5 ${
                          isActive
                            ? "text-[#fbf6ec]"
                            : "text-muted-foreground group-hover:text-[var(--color-accent-warm)]"
                        }`}
                      />
                    )}
                    <span>{link.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Kontrol Global di Header Atas (Mobile & Desktop): Musik + Mode 3D/2D + Sore/Malam */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 shadow-2xs">
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
                className={`inline-flex min-h-[32px] sm:min-h-[34px] items-center justify-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
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
                <span className="hidden xs:inline sm:inline">
                  {playing ? `Lagu #${trackIndex + 1}` : "Musik"}
                </span>
              </button>
              {playing && (
                <button
                  type="button"
                  onClick={nextTrack}
                  aria-label="Lagu kenangan berikutnya"
                  title={`Ganti lagu (${currentTrack.title})`}
                  className="inline-flex size-7 sm:size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                  ? "Beralih ke Mode 2D Ringan"
                  : "Aktifkan Mode 3D Penuh"
              }
              title={
                tier === "hd"
                  ? "Mode 3D Aktif — Klik untuk Mode 2D Ringan"
                  : "Mode 2D Ringan — Klik untuk Mode 3D"
              }
              className={`inline-flex min-h-[32px] sm:min-h-[36px] items-center gap-1 rounded-full border px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap disabled:opacity-50 ${
                tier === "hd"
                  ? "border-[var(--color-chart-1)]/40 bg-card text-foreground hover:bg-muted"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Box className="size-3.5 text-[var(--color-chart-1)]" />
              <span>{tier === "hd" ? "3D" : "2D"}</span>
            </button>

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
              className="inline-flex min-h-[32px] sm:min-h-[36px] items-center justify-center gap-1.5 rounded-full border border-border bg-card px-2.5 sm:px-3 py-1 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-[var(--color-accent-warm)]/50 hover:bg-muted whitespace-nowrap"
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
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. NAVIGASI HALAMAN DI BAWAH KHUSUS MOBILE / TABLET (< lg)
             Header tetap di atas, sedangkan perpindahan halaman di Mobile
             sepenuhnya menggunakan Bottom Navigation Bar + Bottom-Sheet Menu.
         ===================================================================== */}

      {/* Backdrop Gelap saat Bottom-Sheet Menu Mobile Terbuka */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setMobileSheetOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Bottom-Sheet Laci Semua 8 Halaman (Muncul dari Bawah tepat di Atas Bottom Nav) */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.section
            id="mobile-bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Semua Halaman Ruang Kenangan UNO XII PPLG 1"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-[62px] z-50 mx-auto max-h-[75dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card/98 p-4 text-card-foreground shadow-2xl backdrop-blur-md lg:hidden"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />

            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--color-accent-warm)]" />
                <span className="font-serif text-sm font-bold text-foreground">
                  Jelajahi Semua Ruang Kenangan (8 Halaman)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="Tutup daftar halaman"
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
                        ? "border-[var(--color-accent-warm)] bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-xs"
                        : "border-border/70 bg-background/80 text-foreground hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${
                        isActive
                          ? "bg-white/20 text-[#fbf6ec]"
                          : "bg-muted text-[var(--color-accent-warm)]"
                      }`}
                    >
                      {isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Icon className="size-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">
                        {item.label}
                      </span>
                      <span
                        className={`block truncate text-[10px] ${
                          isActive ? "text-[#fbf6ec]/85" : "text-muted-foreground"
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

      {/* Fixed Bottom Navigation Bar Murni Navigasi Halaman di Mobile (< lg) */}
      <nav
        aria-label="Navigasi Halaman Bawah Mobile"
        className="fixed right-0 bottom-0 left-0 z-50 border-t border-border/90 bg-card/95 px-2 py-1.5 shadow-[0_-6px_22px_rgba(24,15,8,0.14)] backdrop-blur-md lg:hidden"
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
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-2xs"
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
            aria-label="Buka semua menu halaman"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
              mobileSheetOpen || isSecondaryRouteActive
                ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-2xs"
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
                  ? "Dream"
                  : pathname.startsWith("/main")
                    ? "Kuis"
                    : "Lainnya"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
