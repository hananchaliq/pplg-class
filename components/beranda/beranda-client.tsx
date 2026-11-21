"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Calendar, Users } from "lucide-react";
import { SITE_CONTENT } from "@/lib/content";
import { usePageFlipSound } from "@/lib/page-flip-audio";
import { useLivePublicData } from "@/lib/use-public-data";
import {
  MOTION_DISTANCE,
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_STAGGER,
} from "@/lib/motion-tokens";
import {
  CountUpNumber,
  EditorialDivider,
  EditorialLinkButton,
  EditorialReveal,
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      {/* HERO: High-Contrast Editorial Bento + Model 3D Kamera Polaroid Jadul */}
      <section
        aria-labelledby="hero-title"
        className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12"
      >
        {/* Kolom Kiri: Editorial Tipografi & Dark Bento Scoreboard */}
        <div className="flex flex-col items-start lg:col-span-5">
          <motion.p
            initial={{ opacity: 0, y: MOTION_DISTANCE.sm }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_DURATION.medium, ease: MOTION_EASE.luxury }}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground"
          >
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-gold)] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--accent-gold)]" />
            </span>
            <span>NO. 01 · {SITE_CONTENT.hero.eyebrow}</span>
          </motion.p>

          <SplitLineHeading
            as="h1"
            id="hero-title"
            delay={0.05}
            className="mt-2 font-serif text-4xl font-bold leading-[1.04] tracking-tight text-foreground sm:text-5xl lg:text-6xl [text-wrap:balance]"
          >
            {SITE_CONTENT.hero.title}
          </SplitLineHeading>

          <motion.p
            initial={{ opacity: 0, y: MOTION_DISTANCE.sm }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: MOTION_DURATION.medium,
              delay: 0.14,
              ease: MOTION_EASE.luxury,
            }}
            className="mt-2.5 font-serif text-base italic text-muted-foreground sm:text-lg"
          >
            {SITE_CONTENT.hero.subtitle} · {SITE_CONTENT.school.schoolName}
          </motion.p>

          {homeroomTeacherName ? (
            <motion.p
              initial={{ opacity: 0, y: MOTION_DISTANCE.sm }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: MOTION_DURATION.medium,
                delay: 0.18,
                ease: MOTION_EASE.luxury,
              }}
              className="mt-1.5 font-mono text-xs text-muted-foreground"
            >
              Wali Kelas Pembimbing · {homeroomTeacherName}
            </motion.p>
          ) : null}

          <motion.p
            initial={{ opacity: 0, y: MOTION_DISTANCE.sm }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: MOTION_DURATION.medium,
              delay: 0.22,
              ease: MOTION_EASE.luxury,
            }}
            className="mt-3 font-sans text-sm leading-[1.65] text-foreground/90 sm:text-base"
          >
            {SITE_CONTENT.school.tagline}
          </motion.p>

          {/* High-Contrast Dark Scoreboard & Countdown Bento Card */}
          <motion.div
            initial={{ opacity: 0, y: MOTION_DISTANCE.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: MOTION_DURATION.slow,
              delay: 0.26,
              ease: MOTION_EASE.luxury,
            }}
            className="darkroom-surface mt-6 w-full rounded-3xl p-5 text-[#F3F1EA] sm:p-6"
          >
            <div className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#A8A49B]">
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-[#D4B987]" />
                <span>{SITE_CONTENT.hero.countdownLabel}</span>
              </div>
              <span className="text-[#D4B987]">ANGKATAN &apos;27</span>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-4 border-b border-white/10 pb-4">
              {daysLeft === null ? (
                <p className="font-serif text-xl font-bold text-[#F3F1EA]">
                  Menghitung hari kebersamaan...
                </p>
              ) : daysLeft > 0 ? (
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-bold tabular-nums tracking-tight text-[#F3F1EA] sm:text-5xl">
                    <CountUpNumber value={daysLeft} />
                  </span>
                  <div className="text-xs leading-snug text-[#A8A49B]">
                    <p className="font-semibold text-[#F3F1EA]">
                      {SITE_CONTENT.hero.countdownSuffix}
                    </p>
                    <p>Menuju pelepasan kelas XII PPLG 1</p>
                  </div>
                </div>
              ) : (
                <p className="font-serif text-xl font-bold text-[#F3F1EA]">
                  {SITE_CONTENT.hero.countdownPassed}
                </p>
              )}
            </div>

            {/* 3 Inner Sub-cards inside Dark Bento Card */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-white/8 bg-[#22211F]/90 px-3 py-3 text-center transition-colors hover:border-[#D4B987]/35">
                <p className="font-mono text-xl font-bold tabular-nums text-[#F3F1EA] sm:text-2xl">
                  <CountUpNumber
                    value={stats.activeStudents + stats.movedStudents}
                  />
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#A8A49B]">
                  Keluarga Kelas
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#22211F]/90 px-3 py-3 text-center transition-colors hover:border-[#D4B987]/35">
                <p className="font-mono text-xl font-bold tabular-nums text-[#F3F1EA] sm:text-2xl">
                  <CountUpNumber value={stats.totalMoments} />
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#A8A49B]">
                  Foto Momen
                </p>
              </div>
              <div className="rounded-2xl bg-[#F3F1EA] px-3 py-3 text-center text-[#141413] shadow-xs transition-transform duration-200 hover:-translate-y-0.5">
                <p className="font-mono text-xl font-bold tabular-nums sm:text-2xl">
                  <CountUpNumber
                    value={stats.totalDreams + stats.totalWorks}
                  />
                </p>
                <p className="mt-0.5 text-[11px] font-semibold opacity-80">
                  Mimpi &amp; Karya
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tombol Aksi Utama */}
          <motion.div
            initial={{ opacity: 0, y: MOTION_DISTANCE.sm }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: MOTION_DURATION.medium,
              delay: 0.34,
              ease: MOTION_EASE.luxury,
            }}
            className="mt-5 grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3"
          >
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
          </motion.div>
        </div>

        {/* Kolom Kanan: Kamera Polaroid 3D Jadul Terbuka Menyatu Halaman */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: MOTION_DURATION.slow,
            delay: 0.18,
            ease: MOTION_EASE.luxury,
          }}
          className="overflow-visible lg:col-span-7"
        >
          <DynamicPolaroidCamera3D moments={moments} />
        </motion.div>
      </section>

      {/* High-Contrast Architectural Editorial Ribbon */}
      <EditorialReveal delay={0.08} className="mt-10">
        <section
          aria-label="Ringkasan Kelas XII PPLG 1"
          className="darkroom-surface rounded-2xl px-5 py-4 text-[#F3F1EA]"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-white/12">
            <div className="sm:px-3 first:sm:pl-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#A8A49B]">
                01 · ANGGOTA KELAS
              </p>
              <p className="mt-1 font-serif text-lg font-bold tabular-nums text-[#F3F1EA] sm:text-xl">
                <CountUpNumber value={stats.activeStudents} /> Aktif · +
                {stats.movedStudents} Sahabat
              </p>
            </div>

            <div className="sm:px-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#A8A49B]">
                02 · PENDIDIK MAKN
              </p>
              <p className="mt-1 font-serif text-lg font-bold tabular-nums text-[#F3F1EA] sm:text-xl">
                <CountUpNumber value={stats.totalTeachers} /> Guru Pembimbing
              </p>
            </div>

            <div className="sm:px-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#A8A49B]">
                03 · ARSIP KORAN
              </p>
              <p className="mt-1 font-serif text-lg font-bold tabular-nums text-[#F3F1EA] sm:text-xl">
                <CountUpNumber value={stats.totalMoments} /> Dokumentasi X–XII
              </p>
            </div>

            <div className="sm:px-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#A8A49B]">
                04 · MASA DEPAN
              </p>
              <p className="mt-1 font-serif text-lg font-bold tabular-nums text-[#F3F1EA] sm:text-xl">
                <CountUpNumber value={stats.totalDreams} /> Mimpi ·{" "}
                <CountUpNumber value={stats.totalWorks} /> Karya
              </p>
            </div>
          </div>
        </section>
      </EditorialReveal>

      <EditorialDivider label="DIREKTORI RUANG" className="mt-12" />

      {/* PETA HALAMAN KENANGAN — Asymmetric High-Contrast Bento Directory */}
      <React.Suspense fallback={null}>
        <section aria-labelledby="map-heading" className="map-grid-section mt-8">
          <div className="flex flex-col justify-between gap-3 border-b border-border pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                INDEKS RUANG · XII PPLG 1 · MAKN ENDE
              </p>
              <SplitLineHeading
                as="h2"
                id="map-heading"
                className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                Enam Sudut Cerita Kita.
              </SplitLineHeading>
            </div>
            <p className="max-w-md font-sans text-xs leading-relaxed text-muted-foreground sm:text-right sm:text-sm">
              {SITE_CONTENT.school.subTagline}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
            {dynamicMapCards.map((card, idx) => {
              const spanClass =
                idx === 0 || idx === 3
                  ? "md:col-span-7"
                  : idx === 1 || idx === 2
                    ? "md:col-span-5"
                    : "md:col-span-6";
              const isDarkCard = idx === 0 || idx === 3;

              return (
                <TiltRevealCard
                  key={card.href}
                  delay={idx * MOTION_STAGGER.base}
                  className={`${spanClass} rounded-3xl`}
                >
                  <a
                    href={card.href}
                    data-cursor="BUKA"
                    onClick={(e) => handleNavigate(e, card.href)}
                    className={`group flex h-full min-h-[210px] flex-col justify-between rounded-3xl p-6 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                      isDarkCard
                        ? "darkroom-surface text-[#F3F1EA] hover:border-[#D4B987]/45"
                        : "editorial-card-lux border border-border bg-card text-foreground hover:border-foreground/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex h-8 items-center rounded-xl px-3 font-mono text-xs font-bold tabular-nums ${
                            isDarkCard
                              ? "border border-white/10 bg-[#22211F] text-[#D4B987]"
                              : "border border-border bg-secondary text-foreground"
                          }`}
                        >
                          {card.index}
                        </span>
                        <span
                          className={`font-mono text-[11px] uppercase tracking-wider ${
                            isDarkCard
                              ? "text-[#A8A49B]"
                              : "text-muted-foreground"
                          }`}
                        >
                          {card.meta}
                        </span>
                      </div>

                      <div className="mt-5 flex items-start justify-between gap-3">
                        <h3 className="font-serif text-2xl font-bold tracking-tight">
                          {card.title}
                        </h3>
                        <span
                          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-rotate-12 ${
                            isDarkCard
                              ? "bg-[#F3F1EA] text-[#141413]"
                              : "bg-[#141413] text-[#F3F1EA] dark:bg-[#F3F1EA] dark:text-[#141413]"
                          }`}
                        >
                          <ArrowRight className="size-4" />
                        </span>
                      </div>

                      <p
                        className={`mt-1.5 font-mono text-xs font-semibold ${
                          isDarkCard
                            ? "text-[#D6D2C9]"
                            : "text-muted-foreground"
                        }`}
                      >
                        {card.subtitle}
                      </p>
                    </div>

                    <p
                      className={`mt-4 border-t pt-3.5 font-sans text-xs leading-relaxed ${
                        isDarkCard
                          ? "border-white/10 text-[#A8A49B]"
                          : "border-border/80 text-card-foreground/85"
                      }`}
                    >
                      {card.description}
                    </p>
                  </a>
                </TiltRevealCard>
              );
            })}
          </div>
        </section>
      </React.Suspense>
    </div>
  );
}
