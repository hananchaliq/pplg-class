"use client";

import * as React from "react";
import { HeartHandshake, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SingleIronRailLanyard } from "@/components/ui/single-iron-rail-lanyard";
import { FlatIdCardRail } from "@/components/ui/flat-id-card";
import { Adaptive } from "@/components/three/adaptive";
import { teacherToLanyardMember } from "@/lib/domain-logic";
import { SITE_CONTENT } from "@/lib/content";
import { useLivePublicData } from "@/lib/use-public-data";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion-tokens";
import {
  SplitLineHeading,
  DrawnHairlineRule,
} from "@/components/ui/motion-primitives";
import type { TeacherGroup, TeacherRow } from "@/lib/types";

export function GuruClient({
  teachers: initialTeachers,
}: {
  teachers: TeacherRow[];
}) {
  const { data: liveData } = useLivePublicData({ teachers: initialTeachers });
  const teachers = liveData?.teachers ?? initialTeachers;

  const [activeGroup, setActiveGroup] = React.useState<TeacherGroup | "all">(
    "kejuruan"
  );

  const homeroomTeacher = React.useMemo(
    () => teachers.find((t) => t.is_homeroom) ?? teachers[0] ?? null,
    [teachers]
  );

  const homeroomCard = React.useMemo(
    () => (homeroomTeacher ? teacherToLanyardMember(homeroomTeacher) : null),
    [homeroomTeacher]
  );

  const groupTabs = React.useMemo<
    Array<{ id: TeacherGroup | "all"; label: string; desc: string }>
  >(() => {
    const kejuruanCount = teachers.filter((t) => t.grp === "kejuruan").length;
    const agamaCount = teachers.filter((t) => t.grp === "agama").length;
    const akademikCount = teachers.filter((t) => t.grp === "akademik").length;
    return [
      {
        id: "kejuruan",
        label: `Kejuruan (${kejuruanCount})`,
        desc: "Pembimbing rekayasa perangkat lunak, gim, basis data, dan jaringan.",
      },
      {
        id: "agama",
        label: `Agama (${agamaCount})`,
        desc: "Pembimbing adab, Al-Qur'an, akidah akhlak, dan fikih madrasah.",
      },
      {
        id: "akademik",
        label: `Akademik (${akademikCount})`,
        desc: "Pengajar matematika, bahasa, sains, sejarah, dan wawasan kebangsaan.",
      },
      {
        id: "all",
        label: `Semua (${teachers.length})`,
        desc: "Seluruh pendidik & Wali Kelas XII PPLG 1 MAKN Ende.",
      },
    ];
  }, [teachers]);

  // Semua kartu guru (termasuk Wali Kelas) dalam tab terpilih digantung pada 1 gagang besi tunggal yang bisa digeser
  const singleRailTeachers = React.useMemo(() => {
    return teachers
      .filter((t) => (activeGroup === "all" ? true : t.grp === activeGroup))
      .map((t) => teacherToLanyardMember(t));
  }, [teachers, activeGroup]);

  const currentTabMeta =
    groupTabs.find((t) => t.id === activeGroup) ?? groupTabs[0]!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.medium, ease: MOTION_EASE.editorial }}
      className="mx-auto max-w-7xl px-3.5 py-6 sm:px-6 sm:py-10"
    >
      {/* Header Halaman Guru */}
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Penghormatan &amp; Terima Kasih · {teachers.length} Pendidik MAKN Ende
        </p>
        <SplitLineHeading
          as="h1"
          className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]"
        >
          Guru Pembimbing &amp; Wali Kelas XII PPLG 1
        </SplitLineHeading>
        <p className="mx-auto mt-1.5 font-sans text-xs sm:text-sm leading-relaxed text-muted-foreground">
          Apresiasi tulus untuk Bapak dan Ibu Guru yang membimbing langkah kami selama tiga tahun di madrasah.
        </p>
      </header>

      <DrawnHairlineRule className="mx-auto mt-5 max-w-xs" />

      {/* Kartu Khusus Wali Kelas di Atas */}
      {homeroomTeacher && homeroomCard && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: MOTION_DURATION.slow,
            delay: 0.08,
            ease: MOTION_EASE.editorial,
          }}
          aria-labelledby="homeroom-heading"
          className="mt-6 sm:mt-8 overflow-hidden rounded-xl border border-foreground/40 bg-card shadow-md"
        >
          <div className="ikat-divider" aria-hidden="true" />
          <div className="grid grid-cols-1 items-center gap-5 p-4 sm:gap-6 sm:p-8 lg:grid-cols-12">
            {/* Visual Kartu ID Gantung Wali Kelas */}
            <div className="flex flex-col items-center text-center lg:col-span-4">
              <motion.div
                whileHover={{ y: -3, rotate: -1 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="relative flex w-full max-w-[230px] sm:max-w-[240px] flex-col items-center overflow-hidden rounded-xl border border-[#8E6D2F]/70 bg-gradient-to-b from-[#295458] via-[#214245] to-[#1A3336] p-4 text-[#F3ECDD] shadow-xl"
              >
                <div
                  aria-hidden="true"
                  className="mb-2.5 h-2 w-11 rounded-full bg-[#142729] ring-1 ring-[#D8B467]/60"
                />
                <div className="relative size-22 sm:size-24 overflow-hidden rounded-full border-4 border-[#D8B467] bg-[#2D585C] shadow-md">
                  {homeroomCard.image ? (
                    <img
                      src={homeroomCard.image}
                      alt={homeroomTeacher.full_name}
                      referrerPolicy="no-referrer"
                      className="public-film-photo size-full object-cover"
                    />
                  ) : null}
                </div>
                <span className="mt-2.5 inline-block border border-[#D8B467]/65 bg-[#36686C] px-3 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#F7EFDD]">
                  WALI KELAS XII PPLG 1
                </span>
                <h2
                  id="homeroom-heading"
                  className="mt-1.5 font-serif text-lg font-bold text-[#F7EFDD]"
                >
                  {homeroomTeacher.full_name}
                </h2>
                <p className="mt-0.5 text-xs text-[#D6CEBC]">
                  {homeroomTeacher.title}
                </p>
              </motion.div>
            </div>

            <div className="flex flex-col justify-between space-y-4 lg:col-span-8">
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="rounded-xl border border-border bg-background/80 p-4 sm:p-5 transition-shadow hover:shadow-xs"
              >
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Pesan Wali Kelas
                </p>
                <blockquote className="mt-2 font-serif text-base sm:text-lg font-medium italic leading-relaxed text-foreground">
                  &ldquo;{homeroomTeacher.message}&rdquo;
                </blockquote>
              </motion.div>

              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="flex items-start gap-3 rounded-xl border border-border bg-muted/60 p-4 transition-shadow hover:shadow-xs"
              >
                <HeartHandshake className="mt-0.5 size-4 shrink-0 text-foreground" />
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    Catatan Keluarga XII PPLG 1:
                  </p>
                  <p className="mt-1 font-sans text-xs sm:text-sm leading-relaxed text-foreground/90">
                    &ldquo;Terima kasih {homeroomTeacher.full_name} telah menjadi orang tua kedua kami di madrasah dan membimbing kami dengan tulus.&rdquo;
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Filter Tab Kelompok Guru + 1 Gagang Besi Geser */}
      <div className="mt-6 sm:mt-8">
        <div
          role="tablist"
          aria-label="Kelompok Bidang Guru"
          className="no-scrollbar mx-auto flex max-w-2xl flex-nowrap items-center justify-start gap-1.5 overflow-x-auto rounded-xl border border-border bg-card p-1.5 shadow-2xs sm:flex-wrap sm:justify-center"
        >
          {groupTabs.map((tab) => {
            const active = activeGroup === tab.id;
            return (
              <motion.button
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveGroup(tab.id)}
                className={`relative inline-flex min-h-[38px] shrink-0 sm:flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                  active
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="guru-filter-pill"
                    transition={MOTION_EASE.springNav}
                    className="absolute inset-0 rounded-lg bg-primary shadow-2xs"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <GraduationCap className="size-3.5" />
                  <span>{tab.label}</span>
                </span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={activeGroup}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mx-auto mt-3 max-w-xl text-center text-xs text-muted-foreground"
          >
            {currentTabMeta.desc}
          </motion.p>
        </AnimatePresence>

        {/* SATU GAGANG BESI TUNGGAL (Single Iron Rail) untuk Semua Guru di Tab Ini */}
        <div className="mt-4">
          <Adaptive
            simple={
              <FlatIdCardRail
                items={singleRailTeachers}
                eyebrow={`GAGANG BESI TUNGGAL · ${singleRailTeachers.length} PENDIDIK`}
                heading={currentTabMeta.label}
                caption="Klik: Balik Kartu · Panah < >: Geser"
                labels={SITE_CONTENT.lanyardLabels}
              />
            }
            hd={
              <SingleIronRailLanyard
                railKey={`single-teacher-rail-${activeGroup}`}
                items={singleRailTeachers}
                eyebrow={`GAGANG BESI TUNGGAL · ${singleRailTeachers.length} PENDIDIK`}
                heading={currentTabMeta.label}
                caption="Klik: Balik Kartu · Tarik: Pegas · Geser: Jelajah"
                labels={SITE_CONTENT.lanyardLabels}
              />
            }
          />
        </div>
      </div>
    </motion.div>
  );
}
