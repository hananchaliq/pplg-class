"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Moon, Sun, Sparkles, Compass, X, Loader2, Flame } from "lucide-react";
import { SITE_CONTENT } from "@/lib/content";
import { useTheme } from "@/lib/theme";
import { notifyRouteTransitionStart } from "@/lib/use-public-data";

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Identitas Kelas & Logo "UNO" yang Hidup & Hangat */}
        <Link
          href="/"
          prefetch={false}
          onClick={(e) => handleNavigate(e, "/")}
          className="group flex items-center gap-3 rounded-xl py-1 pr-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring shrink-0"
        >
          <motion.span
            aria-hidden="true"
            whileHover={{ scale: 1.08, rotate: -4 }}
            whileTap={{ scale: 0.94, rotate: 2 }}
            animate={{
              boxShadow: [
                "0 0 0 0px rgba(200, 109, 59, 0.22)",
                "0 0 16px 3px rgba(224, 159, 76, 0.36)",
                "0 0 0 0px rgba(200, 109, 59, 0.22)",
              ],
            }}
            transition={{
              boxShadow: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
              type: "spring",
              stiffness: 380,
              damping: 18,
            }}
            className="relative flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl border-2 border-[#f3ca82] bg-gradient-to-br from-[#d97736] via-[#b84a27] to-[#872b19] font-serif text-xs font-black tracking-wider text-[#fff8ec] shadow-sm"
          >
            {/* Cahaya Hangat Bergerak di Belakang Teks UNO */}
            <motion.span
              aria-hidden="true"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="pointer-events-none absolute -top-4 -right-4 size-8 rounded-full bg-[#ffd98e]/30 blur-xs"
            />
            <span className="relative z-10 drop-shadow-2xs">UNO</span>
            <Flame
              className="absolute right-1 bottom-0.5 size-2.5 text-[#ffe1a6] opacity-85 transition-transform duration-300 group-hover:scale-125"
              strokeWidth={2.2}
            />
          </motion.span>
          <div className="flex flex-col leading-tight">
            <span className="flex items-center gap-1.5 font-serif text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-[var(--color-accent-warm)]">
              <span>UNO · {SITE_CONTENT.school.className}</span>
            </span>
            <span className="font-hand text-sm font-bold text-muted-foreground">
              {SITE_CONTENT.school.shortSchool} · Flores, NTT
            </span>
          </div>
        </Link>

        {/* Navigasi Desktop dengan Animasi Interaktif di Setiap Menu */}
        <nav
          aria-label="Navigasi Utama Album Kenangan"
          className="hidden md:flex md:items-center md:gap-1"
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
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 420, damping: 20 }}
              >
                <Link
                  href={link.href}
                  prefetch={false}
                  onClick={(e) => handleNavigate(e, link.href)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isActive
                      ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  <span className="relative z-10">{link.label}</span>
                  {!isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1.5 left-3.5 right-3.5 h-0.5 origin-left scale-x-0 rounded-full bg-[var(--color-accent-warm)] transition-transform duration-200 group-hover:scale-x-100"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Kontrol Kanan: Toggle Tema Sore/Malam + Tombol Menu Mobile */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.94, rotate: -6 }}
            onClick={toggleTheme}
            aria-label={
              theme === "light"
                ? "Aktifkan Mode Malam (Kamar Lampu Kuning Hangat)"
                : "Aktifkan Mode Sore (Kertas Hangat Terang)"
            }
            title={
              theme === "light"
                ? "Mode Sore Aktif — Klik untuk Mode Malam"
                : "Mode Malam Aktif — Klik untuk Mode Sore"
            }
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-[var(--color-accent-warm)]/50 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring whitespace-nowrap"
          >
            {theme === "light" ? (
              <>
                <Sun className="size-4 text-[var(--color-accent-warm)] transition-transform duration-300 hover:rotate-45" />
                <span className="hidden sm:inline">Mode Sore</span>
              </>
            ) : (
              <>
                <Moon className="size-4 text-[var(--color-accent-warm)] transition-transform duration-300 hover:-rotate-12" />
                <span className="hidden sm:inline">Mode Malam</span>
              </>
            )}
          </motion.button>

          {/* Tombol Menu Mobile */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={
              mobileMenuOpen
                ? "Tutup Peta Ruang Kenangan"
                : "Buka Peta Ruang Kenangan"
            }
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[var(--color-accent-warm)]/50 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {mobileMenuOpen ? (
              <>
                <X className="size-4 text-[var(--color-accent-warm)]" />
                <span>Tutup</span>
              </>
            ) : (
              <>
                <Compass className="size-4 text-[var(--color-accent-warm)]" />
                <span>Ruang Kelas</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Menu Mobile dengan Animasi Halus */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            id="mobile-nav-drawer"
            aria-label="Navigasi Mobile Album Kenangan"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-border bg-card/95 backdrop-blur-md md:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent-warm)]">
                <Sparkles className="size-3" />
                <span>Pilih Sudut Kenangan UNO · XII PPLG 1</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SITE_CONTENT.nav.links.map((link, idx) => {
                  const isCurrentPath =
                    link.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.href);
                  const isPending = pendingHref === link.href;
                  const isActive = pendingHref ? isPending : isCurrentPath;

                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <Link
                        href={link.href}
                        prefetch={false}
                        onClick={(e) => handleNavigate(e, link.href)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] font-semibold shadow-xs"
                            : "border border-border/60 bg-background/70 text-foreground hover:bg-muted"
                        }`}
                      >
                        <span>{link.label}</span>
                        {isPending ? (
                          <Loader2 className="size-3.5 animate-spin text-[#fbf6ec]" />
                        ) : isActive ? (
                          <span
                            aria-hidden="true"
                            className="size-2 rounded-full bg-[#fbf6ec]"
                          />
                        ) : null}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
