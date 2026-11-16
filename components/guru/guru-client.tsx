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

  const nonHomeroomTeachers = React.useMemo(
    () => teachers.filter((t) => !t.is_homeroom),
    [teachers]
  );

  const groupTabs = React.useMemo<
    Array<{ id: TeacherGroup | "all"; label: string; desc: string }>
  >(() => {
    const kejuruanCount = nonHomeroomTeachers.filter(
      (t) => t.grp === "kejuruan"
    ).length;
    const agamaCount = nonHomeroomTeachers.filter(
      (t) => t.grp === "agama"
    ).length;
    const akademikCount = nonHomeroomTeachers.filter(
      (t) => t.grp === "akademik"
    ).length;
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
        label: `Semua Guru (${nonHomeroomTeachers.length})`,
        desc: "Seluruh pendidik MAKN Ende dalam satu gagang besi interaktif yang dapat digeser ke kiri dan kanan.",
      },
    ];
  }, [nonHomeroomTeachers]);

  // Semua kartu guru dalam tab terpilih digantung pada 1 gagang besi tunggal yang bisa digeser
  const singleRailTeachers = React.useMemo(() => {
    return nonHomeroomTeachers
      .filter((t) => (activeGroup === "all" ? true : t.grp === activeGroup))
      .map((t) => teacherToLanyardMember(t));
  }, [nonHomeroomTeachers, activeGroup]);

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

      {/* Kartu Khusus Wali Kelas di Atas */}
      {homeroomTeacher && (
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          aria-labelledby="homeroom-heading"
          className="mt-10 overflow-hidden rounded-2xl border-2 border-[var(--color-accent-warm)]/60 bg-card shadow-md"
        >
          <div className="ikat-divider" aria-hidden="true" />
          <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12">
            <div className="flex flex-col items-center text-center lg:col-span-4">
              <motion.div
                whileHover={{ scale: 1.06, rotate: -2 }}
                transition={{ type: "spring", stiffness: 340, damping: 20 }}
                className="relative size-28 overflow-hidden rounded-full border-4 border-[var(--color-accent-warm)]/40 bg-muted shadow-md"
              >
                {homeroomTeacher.photo_url ? (
                  <img
                    src={homeroomTeacher.photo_url}
                    alt={homeroomTeacher.full_name}
                    referrerPolicy="no-referrer"
                    className="size-full object-cover"
                  />
                ) : null}
              </motion.div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-warm)]">
                Wali Kelas XII PPLG 1
              </p>
              <h2
                id="homeroom-heading"
                className="mt-1 font-serif text-2xl font-bold text-foreground"
              >
                {homeroomTeacher.full_name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {homeroomTeacher.title}
              </p>
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
