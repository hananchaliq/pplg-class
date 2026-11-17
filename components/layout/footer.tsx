"use client";

import * as React from "react";
import { SITE_CONTENT } from "@/lib/content";
import {
  useLivePublicData,
  notifyRouteTransitionStart,
} from "@/lib/use-public-data";

export function Footer() {
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
    notifyRouteTransitionStart();
    if (window.location.pathname === targetHref) {
      window.location.reload();
    } else {
      window.location.assign(targetHref);
    }
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
    <footer className="mt-12 sm:mt-16 border-t border-border bg-card pb-20 lg:pb-0 text-card-foreground">
      <div className="ikat-divider" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          {/* Identitas Singkat UNO XII PPLG 1 */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#f3ca82] bg-gradient-to-br from-[#d97736] via-[#b84a27] to-[#872b19] font-serif text-xs font-black tracking-wider text-[#fff8ec] shadow-2xs"
            >
              UNO
            </span>
            <div>
              <p className="font-serif text-base font-bold tracking-tight text-foreground">
                UNO · {SITE_CONTENT.school.className} — {SITE_CONTENT.school.shortSchool}
              </p>
              <p className="text-xs text-muted-foreground">
                Wali Kelas:{" "}
                <span className="font-semibold text-foreground">
                  {homeroomTeacherName}
                </span>{" "}
                · Angkatan {SITE_CONTENT.school.cohortYears}
              </p>
            </div>
          </div>

          {/* Tautan Navigasi Ringkas */}
          <nav
            aria-label="Navigasi Footer"
            className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"
          >
            {SITE_CONTENT.nav.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNavigate(e, l.href)}
                className="font-medium text-muted-foreground transition-colors hover:text-[var(--color-accent-warm)] whitespace-nowrap"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground sm:flex-row">
          <p className="font-hand text-base text-foreground/85">
            &ldquo;Tiga tahun merajut logika, seumur hidup menjaga saudara.&rdquo;
          </p>
          <p>
            {SITE_CONTENT.school.schoolName} · Ende, Flores — NTT
          </p>
        </div>
      </div>
    </footer>
  );
}
