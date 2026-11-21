"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { SITE_CONTENT } from "@/lib/content";
import { useLivePublicData } from "@/lib/use-public-data";
import { UnoLogo } from "@/components/ui/uno-logo";
import { navigateWithVanishingPoint } from "@/components/layout/vanishing-page-transition";
import {
  EditorialButton,
  EditorialDivider,
} from "@/components/ui/motion-primitives";
import { MOTION_EASE } from "@/lib/motion-tokens";

export function Footer() {
  const router = useRouter();
  const { data: liveData } = useLivePublicData();

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
    navigateWithVanishingPoint(targetHref, router);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const homeroomTeacherName = React.useMemo(() => {
    if (liveData?.teachers?.length) {
      const hr =
        liveData.teachers.find((t) => t.is_homeroom) ?? liveData.teachers[0];
      if (hr?.full_name) return hr.full_name;
    }
    return "Ibu Hajra, S.Pd.";
  }, [liveData]);

  return (
    <motion.footer
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.42, ease: MOTION_EASE.luxury }}
      className="mt-14 sm:mt-20 border-t border-border bg-card/90 pb-24 lg:pb-0 text-card-foreground"
    >
      <div className="ikat-divider" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          {/* Brand & Info Wali Kelas + Logo UNO */}
          <div className="flex items-center gap-3.5">
            <UnoLogo size="md" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-serif text-base font-bold tracking-tight text-foreground">
                  UNO · {SITE_CONTENT.school.className} — {SITE_CONTENT.school.shortSchool}
                </p>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-gold)]/45 bg-[var(--accent-gold-soft)] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-foreground">
                  EDISI PERPISAHAN · ANGKATAN &apos;27
                </span>
              </div>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                Wali Kelas:{" "}
                <span className="font-semibold text-foreground">
                  {homeroomTeacherName}
                </span>{" "}
                · Angkatan {SITE_CONTENT.school.cohortYears}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                Lambang Lingkaran UNO · Arsip Film &amp; Koran XII PPLG 1 · MAKN Ende
              </p>
            </div>
          </div>

          {/* Tautan Cepat dengan Garis Bawah Animasi + Tombol Kembali ke Atas */}
          <div className="flex items-center gap-4">
            <nav
              aria-label="Navigasi Bawah"
              className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-1.5 font-sans text-xs"
            >
              {SITE_CONTENT.nav.links.map((l) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => handleNavigate(e, l.href)}
                  className="group relative py-0.5 font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap"
                >
                  <span>{l.label}</span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[1.5px] origin-left scale-x-0 bg-[var(--accent-gold)] transition-transform duration-200 ease-out group-hover:scale-x-100"
                  />
                </motion.a>
              ))}
            </nav>

            <EditorialButton
              type="button"
              variant="secondary"
              onClick={scrollToTop}
              aria-label="Kembali ke atas halaman"
              className="min-h-[36px] px-3 py-1.5 text-xs"
            >
              <ArrowUp className="size-3.5" />
              <span>Kembali ke Atas</span>
            </EditorialButton>
          </div>
        </div>

        <EditorialDivider label="COLOPHON" className="my-5" />

        {/* Kutipan & Kolofon Footer */}
        <div className="flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left font-sans text-xs text-muted-foreground">
          <p className="font-serif italic text-foreground">
            &ldquo;UNO Born to Win, selamat menjalani hidup baru&rdquo;
          </p>
          <p className="font-mono text-[11px]">
            {SITE_CONTENT.school.schoolName} · Ende, Flores — NTT
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
