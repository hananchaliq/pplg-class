"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Calendar, Users } from "lucide-react";
import { SITE_CONTENT } from "@/lib/content";
import { usePageFlipSound } from "@/lib/page-flip-audio";
import { useLivePublicData } from "@/lib/use-public-data";
import { useGsap, gsap } from "@/lib/gsap-utils";
import {
  MOTION_DISTANCE,
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_STAGGER,
} from "@/lib/motion-tokens";
import {
  CountUpNumber,
  DrawnHairlineRule,
  EditorialLinkButton,
  MonochromeShimmer,
  SplitLineHeading,
  TiltRevealCard,
} from "@/components/ui/motion-primitives";
import { navigateWithVanishingPoint } from "@/components/layout/vanishing-page-transition";
import type { MomentRow } from "@/lib/types";

const DynamicPolaroidCamera3D = dynamic(
  () =>
    import("@/components/beranda/polaroid-camera-3d").then(
      (mod) => mod.PolaroidCamera3D
    ),
  {
    ssr: false,
    loading: () => (
      <div
        data-dynamic-loading="true"
        aria-hidden="true"
        className="flex h-[430px] sm:h-[520px] w-full items-center justify-center p-4"
      >
        <MonochromeShimmer className="h-[340px] w-full max-w-[360px] rounded-xl" />
      </div>
    ),
  }
);

export function BerandaClient({
  graduationDate: initialGraduationDate,
  homeroomTeacherName: initialHomeroomTeacherName = "",
  initialMoments = [],
  stats: initialStats,
}: {
  graduationDate: string;
  homeroomTeacherName?: string;
  initialMoments?: MomentRow[];
  stats: {
    activeStudents: number;
    movedStudents: number;
    totalTeachers: number;
    totalMoments: number;
    totalDreams: number;
    totalWorks: number;
    totalMemories?: number;
    totalCapsules?: number;
    totalThanks?: number;
  };
}) {
  const router = useRouter();
  const { data: liveData } = useLivePublicData({ moments: initialMoments });
  const { playPageFlip } = usePageFlipSound();
  const moments = liveData?.moments ?? initialMoments;
  const pageRootRef = React.useRef<HTMLDivElement | null>(null);
  const [daysLeft, setDaysLeft] = React.useState<number | null>(null);

  const graduationDate =
    liveData?.settings?.graduation_date || initialGraduationDate;

  const homeroomTeacherName = React.useMemo(() => {
    if (liveData?.teachers) {
      if (liveData.teachers.length === 0) return "";
      const hr =
        liveData.teachers.find((t) => t.is_homeroom) ?? liveData.teachers[0];
      if (hr?.full_name) return hr.full_name;
    }
    return initialHomeroomTeacherName;
  }, [liveData, initialHomeroomTeacherName]);

  const stats = React.useMemo(() => {
    if (
      !liveData?.students ||
      !liveData.teachers ||
      !liveData.moments ||
      !liveData.dreams ||
      !liveData.works
    ) {
      return initialStats;
    }
    const activeStudents = liveData.students.filter((s) => s.is_active).length;
    const movedStudents = liveData.students.filter((s) => !s.is_active).length;
    return {
      activeStudents,
      movedStudents,
      totalTeachers: liveData.teachers.length,
      totalMoments: liveData.moments.length,
      totalDreams: liveData.dreams.length,
      totalWorks: liveData.works.length,
      totalMemories: liveData.memoryEntries?.length ?? 0,
      totalCapsules: liveData.timeCapsules?.length ?? 0,
      totalThanks: liveData.thanksList?.length ?? 0,
    };
  }, [liveData, initialStats]);

  const dynamicMapCards = React.useMemo(() => {
    return SITE_CONTENT.mapCards.map((card) => {
      if (card.href === "/anggota") {
        return {
          ...card,
          subtitle: `${stats.activeStudents} Siswa Aktif & ${stats.movedStudents} Sahabat`,
          description: `Gantungan ID Card 3D ${stats.activeStudents} siswa aktif & ${stats.movedStudents} sahabat istimewa.`,
        };
      }
      if (card.href === "/guru") {
        return {
          ...card,
          subtitle: homeroomTeacherName
            ? `${homeroomTeacherName} & ${stats.totalTeachers} Pendidik`
            : `${stats.totalTeachers} Pendidik`,
          description: homeroomTeacherName
            ? `Penghormatan untuk Wali Kelas ${homeroomTeacherName} & ${stats.totalTeachers} pendidik MAKN Ende.`
            : `Penghormatan untuk ${stats.totalTeachers} pendidik MAKN Ende.`,
        };
      }
      if (card.href === "/galeri") {
        return {
          ...card,
          subtitle: `Edisi Koran X · XI · XII (${stats.totalMoments} Foto)`,
          description:
            "Koran jadul interaktif berisi arsip foto & liputan kenangan kelas.",
        };
      }
      if (card.href === "/dream-board") {
        return {
          ...card,
          subtitle: `${stats.totalDreams} Kertas Cita-Cita`,
          description: `Papan tulis & catatan doa berisi ${stats.totalDreams} impian siswa.`,
        };
      }
      if (card.href === "/karya") {
        return {
          ...card,
          subtitle: `${stats.totalWorks} Proyek & Skill Map`,
          description: `Etalase ${stats.totalWorks} aplikasi siswa & jaringan keahlian kelas.`,
        };
      }
      return card;
    });
  }, [stats, homeroomTeacherName]);

  React.useEffect(() => {
    const computeDays = () => {
      const target = new Date(
        graduationDate || SITE_CONTENT.school.defaultGraduationDate
      ).getTime();
      const now = Date.now();
      const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      setDaysLeft(diff);
    };
    computeDays();
  }, [graduationDate]);

  useGsap(
    () => {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReduced) return;

      gsap.from(".hero-reveal", {
        y: MOTION_DISTANCE.md,
        opacity: 0,
        duration: MOTION_DURATION.slow,
        stagger: MOTION_STAGGER.base,
        ease: MOTION_EASE.gsapEditorial,
        clearProps: "transform,opacity",
      });
    },
    [],
    pageRootRef
  );

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
    playPageFlip();
    navigateWithVanishingPoint(targetHref, router);
  };

  return (
    <div
      ref={pageRootRef}
      className="mx-auto max-w-7xl px-3.5 py-6 sm:px-6 sm:py-10"
    >
      {/* HERO: Editorial Tipografi + Model 3D Kamera Polaroid Jadul Cetak Foto */}
      <section
        aria-labelledby="hero-title"
        className="grid grid-cols-1 items-center gap-6 sm:gap-10 lg:grid-cols-12"
      >
        {/* Kolom Kiri: Editorial Tipografi & Countdown */}
        <div className="flex flex-col items-start lg:col-span-5">
          <p className="hero-reveal font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            NO. 01 / {SITE_CONTENT.hero.eyebrow}
          </p>

          <SplitLineHeading
            as="h1"
            id="hero-title"
            className="mt-2.5 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl [text-wrap:balance]"
          >
            {SITE_CONTENT.hero.title}
          </SplitLineHeading>

          <p className="hero-reveal mt-2 font-serif text-base italic text-muted-foreground sm:text-lg">
            {SITE_CONTENT.hero.subtitle} — {SITE_CONTENT.school.schoolName}
          </p>

          {homeroomTeacherName ? (
            <p className="hero-reveal mt-2 font-mono text-xs text-muted-foreground">
              Wali Kelas Pembimbing · {homeroomTeacherName}
            </p>
          ) : null}

          <p className="hero-reveal mt-3.5 font-sans text-sm leading-[1.65] text-foreground/90 sm:text-base">
            {SITE_CONTENT.school.tagline}
          </p>

          {/* Kartu Countdown Kelulusan */}
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 360, damping: 24 }}
            className="hero-reveal mt-5 w-full rounded-xl border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-foreground" />
                <span>{SITE_CONTENT.hero.countdownLabel}</span>
              </div>
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-full bg-primary animate-pulse"
              />
            </div>
            <p className="mt-1.5 font-serif text-xl font-bold text-foreground sm:text-2xl">
              {daysLeft === null ? (
                "Menghitung hari kebersamaan..."
              ) : daysLeft > 0 ? (
                <>
                  {SITE_CONTENT.hero.countdownPrefix}{" "}
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                    <CountUpNumber value={daysLeft} />
                  </span>{" "}
                  {SITE_CONTENT.hero.countdownSuffix}
                </>
              ) : (
                SITE_CONTENT.hero.countdownPassed
              )}
            </p>
          </motion.div>

          {/* Tombol Aksi Utama (Sapuan Isi + Pegas + Magnetik Halus Desktop) */}
          <div className="hero-reveal mt-5 sm:mt-6 grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
            <EditorialLinkButton
              href="/galeri"
              variant="primary"
              onClick={(e) => handleNavigate(e, "/galeri")}
              className="w-full sm:w-auto"
            >
              <BookOpen className="size-4 shrink-0" />
              <span className="truncate">Baca Koran Galeri</span>
            </EditorialLinkButton>

            <EditorialLinkButton
              href="/anggota"
              variant="secondary"
              onClick={(e) => handleNavigate(e, "/anggota")}
              className="w-full sm:w-auto"
            >
              <Users className="size-4 shrink-0 text-foreground" />
              <span className="truncate">{SITE_CONTENT.hero.ctaSecondary}</span>
            </EditorialLinkButton>
          </div>
        </div>

        {/* Kolom Kanan: Kamera Polaroid 3D Jadul Terbuka Menyatu Halaman */}
        <div className="hero-reveal overflow-visible lg:col-span-7">
          <DynamicPolaroidCamera3D moments={moments} />
        </div>
      </section>

      {/* Baris Angka Statistik Arsip */}
      <section
        aria-label="Ringkasan Kelas XII PPLG 1"
        className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3 sm:grid-cols-4 sm:p-5"
      >
        <motion.div
          whileHover={{ y: -2 }}
          transition={MOTION_EASE.springTactile}
          className="rounded-lg p-2 transition-colors hover:bg-muted/40"
        >
          <p className="font-serif text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            <CountUpNumber value={stats.activeStudents} />{" "}
            <span className="font-sans text-xs font-normal text-muted-foreground">
              (+{stats.movedStudents} sahabat)
            </span>
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Anggota Keluarga Kelas
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={MOTION_EASE.springTactile}
          className="rounded-lg p-2 transition-colors hover:bg-muted/40"
        >
          <p className="font-serif text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            <CountUpNumber value={stats.totalTeachers} />
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Pendidik &amp; Wali Kelas
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={MOTION_EASE.springTactile}
          className="rounded-lg p-2 transition-colors hover:bg-muted/40"
        >
          <p className="font-serif text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            <CountUpNumber value={stats.totalMoments} />
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Foto Momen Kelas X–XII
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={MOTION_EASE.springTactile}
          className="rounded-lg p-2 transition-colors hover:bg-muted/40"
        >
          <p className="font-serif text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            <CountUpNumber value={stats.totalWorks} />
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Karya Siswa &amp; {stats.totalDreams} Cita-Cita
          </p>
        </motion.div>
      </section>

      <DrawnHairlineRule className="my-12" />

      {/* PETA HALAMAN KENANGAN */}
      <React.Suspense fallback={null}>
        <section aria-labelledby="map-heading" className="map-grid-section">
          <div className="mx-auto max-w-xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Indeks Ruang · XII PPLG 1
            </p>
            <SplitLineHeading
              as="h2"
              id="map-heading"
              className="mt-1.5 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Enam Sudut Cerita Kita
            </SplitLineHeading>
            <p className="mt-1.5 font-sans text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {SITE_CONTENT.school.subTagline}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dynamicMapCards.map((card, idx) => (
              <TiltRevealCard
                key={card.href}
                delay={idx * MOTION_STAGGER.base}
                className="h-full"
              >
                <a
                  href={card.href}
                  onClick={(e) => handleNavigate(e, card.href)}
                  className="group flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                      <span className="font-bold text-foreground transition-transform duration-200 group-hover:translate-x-0.5">
                        NO. {card.index}
                      </span>
                      <span>{card.meta}</span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <h3 className="editorial-underline font-serif text-lg font-bold text-foreground">
                        {card.title}
                      </h3>
                      <ArrowRight className="size-4 shrink-0 text-foreground transition-transform duration-200 group-hover:translate-x-1.5" />
                    </div>

                    <p className="mt-1 font-sans text-xs font-semibold text-muted-foreground">
                      {card.subtitle}
                    </p>

                    <p className="mt-2 line-clamp-2 font-sans text-xs leading-relaxed text-card-foreground/85">
                      {card.description}
                    </p>
                  </div>
                </a>
              </TiltRevealCard>
            ))}
          </div>
        </section>
      </React.Suspense>
    </div>
  );
}
