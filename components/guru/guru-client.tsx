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
        label: `Guru Kejuruan (${kejuruanCount})`,
        desc: "Pembimbing rekayasa perangkat lunak, gim, basis data, dan jaringan yang menemani jam praktik laboratorium kami.",
      },
      {
        id: "agama",
        label: `Guru Bidang Agama (${agamaCount})`,
        desc: "Penjaga adab, tahsin Al-Qur'an, akidah akhlak, dan fikih yang menenangkan hati di tengah padatnya tugas madrasah.",
      },
      {
        id: "akademik",
        label: `Guru Bidang Akademik (${akademikCount})`,
        desc: "Pengajar matematika, bahasa, sains, sejarah, dan wawasan kebangsaan yang meluaskan cara pandang kami.",
      },
      {
        id: "all",
        label: `Semua Guru (${teachers.length})`,
        desc: "Seluruh pendidik & Wali Kelas XII PPLG 1 MAKN Ende dalam satu gagang besi interaktif yang dapat digeser ke kiri dan kanan.",
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
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6"
    >
      {/* Header Halaman Guru */}
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Penghormatan & Terima Kasih · Wali Kelas & {teachers.length} Pendidik MAKN Ende
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
          Guru-Guru yang Menjaga Langkah Kami
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Setiap baris kode yang berhasil kami tulis dan setiap nilai kehidupan
          yang kami bawa pulang lahir dari kesabaran Bapak dan Ibu Guru di
          Madrasah Aliyah Kejuruan Negeri Ende.
        </p>
      </header>

      {/* Kartu Khusus Wali Kelas di Atas (Tersinkronisasi Penuh dengan Kartu ID) */}
      {homeroomTeacher && homeroomCard && (
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          aria-labelledby="homeroom-heading"
          className="mt-10 overflow-hidden rounded-2xl border-2 border-[var(--color-accent-warm)]/60 bg-card shadow-md"
        >
          <div className="ikat-divider" aria-hidden="true" />
          <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12">
            {/* Visual Kartu ID Gantung Wali Kelas */}
            <div className="flex flex-col items-center text-center lg:col-span-4">
              <motion.div
                whileHover={{ y: -4, rotate: -1 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="relative flex w-full max-w-[260px] flex-col items-center overflow-hidden rounded-2xl border-2 border-[#d4af37]/70 bg-gradient-to-b from-[#2f2319] via-[#241a12] to-[#1b130d] p-5 text-[#fbf6ec] shadow-xl"
              >
                {/* Lubang & Jepitan Kartu ID di Atas */}
                <div
                  aria-hidden="true"
                  className="mb-3 h-2.5 w-12 rounded-full bg-[#120c08] ring-1 ring-[#d4af37]/50"
                />
                <div className="relative size-28 overflow-hidden rounded-full border-4 border-[#d4af37] bg-[#3a2a1d] shadow-md">
                  {homeroomCard.image ? (
                    <img
                      src={homeroomCard.image}
                      alt={homeroomTeacher.full_name}
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <span className="mt-3 inline-block rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#f5d67b]">
                  ✦ WALI KELAS XII PPLG 1 ✦
                </span>
                <h2
                  id="homeroom-heading"
                  className="mt-2 font-serif text-xl font-bold text-[#fbf6ec]"
                >
                  {homeroomTeacher.full_name}
                </h2>
                <p className="mt-0.5 text-xs text-[#ebd0a0]/85">
                  {homeroomTeacher.title}
                </p>
                {/* Strip Barcode Kartu ID */}
                <div
                  aria-hidden="true"
                  className="mt-4 flex h-5 w-full items-center justify-center gap-0.5 border-t border-dashed border-[#d4af37]/30 pt-2 opacity-80"
                >
                  {Array.from({ length: 28 }).map((_, bIdx) => (
                    <span
                      key={bIdx}
                      className={`h-full bg-[#f5ebd6] ${
                        bIdx % 3 === 0 ? "w-1" : bIdx % 2 === 0 ? "w-0.5" : "w-[3px]"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            </div>

            <div className="flex flex-col justify-between space-y-4 lg:col-span-8">
              <div className="rounded-xl border border-border bg-background/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pesan Wali Kelas untuk XII PPLG 1
                </p>
                <blockquote className="mt-2 font-serif text-base italic leading-relaxed text-foreground sm:text-lg">
                  &ldquo;{homeroomTeacher.message}&rdquo;
                </blockquote>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4">
                <HeartHandshake className="mt-0.5 size-5 shrink-0 text-[var(--color-chart-3)]" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Ucapan Terima Kasih dari Seluruh Siswa XII PPLG 1 untuk{" "}
                    {homeroomTeacher.full_name}:
                  </p>
                  <p className="mt-1 font-hand text-xl leading-snug text-foreground/90">
                    &ldquo;Terima kasih {homeroomTeacher.full_name} sudah menjadi
                    orang tua kedua kami di madrasah, membimbing dengan penuh
                    kasih sayang, dan selalu percaya bahwa anak-anak XII PPLG 1
                    bisa terbang tinggi.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Filter Tab Kelompok Guru + 1 Gagang Besi Geser */}
      <div className="mt-12">
        <div
          role="tablist"
          aria-label="Kelompok Bidang Guru"
          className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card p-1.5 shadow-xs"
        >
          {groupTabs.map((tab) => {
            const active = activeGroup === tab.id;
            return (
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveGroup(tab.id)}
                className={`inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                  active
                    ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <GraduationCap className="size-3.5" />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">
          {currentTabMeta.desc}
        </p>

        {/* SATU GAGANG BESI TUNGGAL (Single Iron Rail) untuk Semua Guru di Tab Ini */}
        <div className="mt-6">
          <Adaptive
            simple={
              <FlatIdCardRail
                items={singleRailTeachers}
                eyebrow={`1 Gagang Besi Interaktif · ${singleRailTeachers.length} Pendidik`}
                heading={currentTabMeta.label}
                caption="Geser kartu atau ketuk tombol panah < > untuk melihat profil dan ucapan terima kasih"
                labels={SITE_CONTENT.lanyardLabels}
              />
            }
            hd={
              <SingleIronRailLanyard
                railKey={`single-teacher-rail-${activeGroup}`}
                items={singleRailTeachers}
                eyebrow={`GAGANG BESI TUNGGAL · ${singleRailTeachers.length} PENDIDIK`}
                heading={currentTabMeta.label}
                caption="Klik kartu ID untuk membalik (Depan/Belakang) · Geser Kiri/Kanan untuk melihat semua guru"
                labels={SITE_CONTENT.lanyardLabels}
              />
            }
          />
        </div>
      </div>
    </motion.div>
  );
}
