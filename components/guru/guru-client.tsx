"use client";

import * as React from "react";
import { HeartHandshake, GraduationCap } from "lucide-react";
import { motion } from "motion/react";
import { SingleIronRailLanyard } from "@/components/ui/single-iron-rail-lanyard";
import { FlatIdCardRail } from "@/components/ui/flat-id-card";
import { Adaptive } from "@/components/three/adaptive";
import { teacherToLanyardMember } from "@/lib/domain-logic";
import { SITE_CONTENT } from "@/lib/content";
import { useLivePublicData } from "@/lib/use-public-data";
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

  const nonHomeroomTeachers = React.useMemo(
    () => teachers.filter((t) => !t.is_homeroom),
    [teachers]
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-7xl px-3.5 py-6 sm:px-6 sm:py-10"
    >
      {/* Header Halaman Guru Ringkas */}
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-warm)]">
          Penghormatan & Terima Kasih · {teachers.length} Pendidik MAKN Ende
        </p>
        <h1 className="mt-1.5 font-serif text-2xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
          Guru & Wali Kelas XII PPLG 1
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
          Apresiasi tulus untuk Bapak dan Ibu Guru yang membimbing langkah kami.
        </p>
      </header>

      {/* Kartu Khusus Wali Kelas di Atas */}
      {homeroomTeacher && homeroomCard && (
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          aria-labelledby="homeroom-heading"
          className="mt-6 sm:mt-8 overflow-hidden rounded-2xl border-2 border-[var(--color-accent-warm)]/60 bg-card shadow-md"
        >
          <div className="ikat-divider" aria-hidden="true" />
          <div className="grid grid-cols-1 items-center gap-5 p-4 sm:gap-6 sm:p-8 lg:grid-cols-12">
            {/* Visual Kartu ID Gantung Wali Kelas */}
            <div className="flex flex-col items-center text-center lg:col-span-4">
              <motion.div
                whileHover={{ y: -3, rotate: -1 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="relative flex w-full max-w-[230px] sm:max-w-[240px] flex-col items-center overflow-hidden rounded-2xl border-2 border-[#d4af37]/70 bg-gradient-to-b from-[#2f2319] via-[#241a12] to-[#1b130d] p-4 text-[#fbf6ec] shadow-xl"
              >
                <div
                  aria-hidden="true"
                  className="mb-2.5 h-2 w-11 rounded-full bg-[#120c08] ring-1 ring-[#d4af37]/50"
                />
                <div className="relative size-22 sm:size-24 overflow-hidden rounded-full border-4 border-[#d4af37] bg-[#3a2a1d] shadow-md">
                  {homeroomCard.image ? (
                    <img
                      src={homeroomCard.image}
                      alt={homeroomTeacher.full_name}
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <span className="mt-2.5 inline-block rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#f5d67b]">
                  ✦ WALI KELAS XII PPLG 1 ✦
                </span>
                <h2
                  id="homeroom-heading"
                  className="mt-1.5 font-serif text-lg font-bold text-[#fbf6ec]"
                >
                  {homeroomTeacher.full_name}
                </h2>
                <p className="mt-0.5 text-xs text-[#ebd0a0]/85">
                  {homeroomTeacher.title}
                </p>
              </motion.div>
            </div>

            <div className="flex flex-col justify-between space-y-3.5 lg:col-span-8">
              <div className="rounded-xl border border-border bg-background/80 p-3.5 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pesan Wali Kelas
                </p>
                <blockquote className="mt-1.5 font-serif text-sm sm:text-base italic leading-relaxed text-foreground">
                  &ldquo;{homeroomTeacher.message}&rdquo;
                </blockquote>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3.5">
                <HeartHandshake className="mt-0.5 size-4 shrink-0 text-[var(--color-chart-3)]" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Terima Kasih Keluarga XII PPLG 1:
                  </p>
                  <p className="mt-1 font-sans text-xs sm:text-sm leading-relaxed text-foreground/90">
                    &ldquo;Terima kasih {homeroomTeacher.full_name} telah menjadi orang tua kedua kami di madrasah dan membimbing kami dengan tulus.&rdquo;
                  </p>
                </div>
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
                className={`inline-flex min-h-[38px] shrink-0 sm:flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                  active
                    ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-2xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <GraduationCap className="size-3.5" />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted-foreground">
          {currentTabMeta.desc}
        </p>

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
