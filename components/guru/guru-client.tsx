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
import { SplitLineHeading } from "@/components/ui/motion-primitives";
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
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10"
    >
      {/* Header Halaman Guru — High-Contrast Editorial Split */}
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            PENGHORMATAN PENDIDIK · {teachers.length} GURU MAKN ENDE
          </p>
          <SplitLineHeading
            as="h1"
            className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] [text-wrap:balance]"
          >
            Guru Pembimbing &amp; Wali Kelas.
          </SplitLineHeading>
        </div>
        <p className="max-w-md font-sans text-xs leading-relaxed text-muted-foreground lg:text-right sm:text-sm">
          Apresiasi tulus untuk Bapak dan Ibu Guru yang membimbing langkah kami
          selama tiga tahun di madrasah.
        </p>
      </header>

      {/* Bento Row: Dark Homeroom Spotlight Card + Quote Cards */}
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
          className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12"
        >
          {/* Left Dark Anchor Card for Wali Kelas */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#2A2926] bg-[#141413] p-6 text-[#F3F1EA] shadow-lg lg:col-span-5">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-[#A8A49B]">
              <span>WALI KELAS XII PPLG 1</span>
              <span>PEMBIMBING UTAMA</span>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-[#22211F]">
                {homeroomCard.image ? (
                  <img
                    src={homeroomCard.image}
                    alt={homeroomTeacher.full_name}
                    referrerPolicy="no-referrer"
                    className="public-film-photo size-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <h2
                  id="homeroom-heading"
                  className="font-serif text-xl font-bold text-[#F3F1EA] sm:text-2xl"
                >
                  {homeroomTeacher.full_name}
                </h2>
                <p className="mt-1 font-mono text-xs text-[#A8A49B]">
                  {homeroomTeacher.title}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-white/10 pt-4">
              <div className="rounded-2xl bg-[#22211F] p-2.5 text-center border border-white/8">
                <p className="font-mono text-lg font-bold tabular-nums text-[#F3F1EA]">
                  {teachers.length}
                </p>
                <p className="text-[10px] text-[#A8A49B]">Total Guru</p>
              </div>
              <div className="rounded-2xl bg-[#22211F] p-2.5 text-center border border-white/8">
                <p className="font-mono text-lg font-bold tabular-nums text-[#F3F1EA]">
                  3 Thn
                </p>
                <p className="text-[10px] text-[#A8A49B]">Bimbingan</p>
              </div>
              <div className="rounded-2xl bg-[#F3F1EA] p-2.5 text-center text-[#141413]">
                <p className="font-mono text-lg font-bold tabular-nums">
                  UNO
                </p>
                <p className="text-[10px] font-semibold opacity-80">Keluarga</p>
              </div>
            </div>
          </div>

          {/* Right Light Bento Cards: Message & Family Tribute */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-7">
            <div className="flex-1 rounded-3xl border border-border bg-card p-6 shadow-xs">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                PESAN WALI KELAS UNTUK ANGKATAN &apos;27
              </p>
              <blockquote className="mt-2.5 font-serif text-lg font-bold italic leading-relaxed text-foreground sm:text-xl">
                &ldquo;{homeroomTeacher.message}&rdquo;
              </blockquote>
            </div>

            <div className="flex items-start gap-3.5 rounded-3xl border border-border bg-card/85 p-5 shadow-2xs">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#141413] text-[#F3F1EA] dark:bg-[#F3F1EA] dark:text-[#141413]">
                <HeartHandshake className="size-4" />
              </span>
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                  CATATAN KELUARGA XII PPLG 1
                </p>
                <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  &ldquo;Terima kasih {homeroomTeacher.full_name} telah menjadi
                  orang tua kedua kami di madrasah dan membimbing kami dengan
                  tulus.&rdquo;
                </p>
              </div>
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
