"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SITE_CONTENT } from "@/lib/content";
import { useLivePublicData } from "@/lib/use-public-data";
import { UnoLogo } from "@/components/ui/uno-logo";
import { navigateWithVanishingPoint } from "@/components/layout/vanishing-page-transition";

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

  const homeroomTeacherName = React.useMemo(() => {
    if (liveData?.teachers?.length) {
      const hr =
        liveData.teachers.find((t) => t.is_homeroom) ?? liveData.teachers[0];
      if (hr?.full_name) return hr.full_name;
    }
    return "Ibu Hajra, S.Pd.";
  }, [liveData]);

  return (
    <footer className="mt-14 sm:mt-20 border-t border-border bg-card/90 pb-24 lg:pb-0 text-card-foreground">
      <div className="ikat-divider" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          {/* Brand & Info Wali Kelas + Logo UNO */}
          <div className="flex items-center gap-3.5">
            <UnoLogo size="md" />
            <div>
              <p className="font-serif text-base font-bold tracking-tight text-foreground">
                UNO · {SITE_CONTENT.school.className} — {SITE_CONTENT.school.shortSchool}
              </p>
              <p className="mt-0.5 font-sans text-xs text-muted-foreground">
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

          {/* Tautan Cepat (Hanya Desktop; Mobile tanpa navbar footer) */}
          <nav
            aria-label="Navigasi Bawah"
            className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-1 font-sans text-xs"
          >
            {SITE_CONTENT.nav.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNavigate(e, l.href)}
                className="font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Kutipan & Kolofon Footer */}
        <div className="mt-5 flex flex-col items-center justify-between gap-2 border-t border-border pt-4 text-center sm:flex-row sm:text-left font-sans text-xs text-muted-foreground">
          <p className="font-serif italic text-foreground">
            &ldquo;UNO Born to Win, selamat menjalani hidup baru&rdquo;
          </p>
          <p className="font-mono text-[11px]">
            {SITE_CONTENT.school.schoolName} · Ende, Flores — NTT
          </p>
        </div>
      </div>
    </footer>
  );
}
