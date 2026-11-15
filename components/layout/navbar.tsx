"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Music } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SITE_CONTENT } from "@/lib/content";
import { useSadAudio } from "@/lib/sad-audio";

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { playing, currentTrack, musicMenuOpen, toggleMusicMenu } = useSadAudio();

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <Link
          href="/"
          className="font-serif text-lg font-bold tracking-tight text-foreground whitespace-nowrap shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {SITE_CONTENT.nav.brand}
        </Link>

        {/* Zone 2: Clean single-line text navigation links with animated active underline */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted-foreground"
        >
          {SITE_CONTENT.nav.links.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative whitespace-nowrap shrink-0 py-1 transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${
                  active ? "text-foreground font-semibold" : ""
                }`}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="navbar-active-indicator"
                    className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-[var(--color-accent-warm)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Compact Spinning Music Disc Icon + Primary CTA + Mobile Hamburger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            type="button"
            data-testid="navbar-music-icon-btn"
            onClick={toggleMusicMenu}
            aria-expanded={musicMenuOpen}
            aria-label={`Fitur Musik (${currentTrack.title})`}
            title="Klik untuk membuka fitur pemutar musik kenangan"
            className={`relative inline-flex size-10 items-center justify-center rounded-full border transition-all ${
              playing
                ? "border-[var(--color-accent-warm)] bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-md"
                : musicMenuOpen
                  ? "border-[var(--color-accent-warm)] bg-[var(--color-accent-warm)]/15 text-[var(--color-accent-warm)]"
                  : "border-border bg-card text-foreground hover:border-[var(--color-accent-warm)]/60 hover:bg-muted"
            }`}
          >
            <span
              className={`inline-flex items-center justify-center rounded-full ${
                playing
                  ? "animate-spin [animation-duration:2.6s]"
                  : "animate-spin [animation-duration:6s]"
              }`}
            >
              <Music className="size-4" />
            </span>
            {playing && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
            )}
          </motion.button>

          <Link
            href="/kenangan"
            className="hidden sm:inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] shadow-xs transition-transform hover:scale-[1.02] hover:opacity-95 whitespace-nowrap shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Tulis Kenangan
          </Link>

          <button
            type="button"
            aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-card text-foreground lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            aria-label="Navigasi Mobile"
            className="overflow-hidden border-t border-border bg-card px-4 py-4 lg:hidden"
          >
            <ul className="grid grid-cols-2 gap-2">
              {SITE_CONTENT.nav.links.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex min-h-[44px] items-center rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                        active
                          ? "bg-muted text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href={SITE_CONTENT.nav.footerPlayLink.href}
                  className="flex min-h-[44px] items-center rounded-lg px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground whitespace-nowrap"
                >
                  {SITE_CONTENT.nav.footerPlayLink.label}
                </Link>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
