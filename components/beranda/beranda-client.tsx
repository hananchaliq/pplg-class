"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Calendar, Music2, Sparkles, Users, Volume2 } from "lucide-react";
import { Adaptive } from "@/components/three/adaptive";
import { SITE_CONTENT } from "@/lib/content";
import { useSadAudio } from "@/lib/sad-audio";
import { notifyRouteTransitionStart, useLivePublicData } from "@/lib/use-public-data";
import type { MomentRow } from "@/lib/types";

const HeroDeskSceneHD = dynamic(
  () =>
    import("@/components/beranda/hero-desk-scene-hd").then(
      (m) => m.HeroDeskSceneHD
    ),
  { ssr: false }
);

/**
 * Ilustrasi SVG Berlapis "Meja Belajar Saat Senja" untuk Mobile & Mode Ringan (SimpleView)
 */
function HeroDeskSimpleSVG({ heroMoment }: { heroMoment?: MomentRow | null }) {
  const hasRealPhoto =
    Boolean(heroMoment?.image_url) &&
    !heroMoment!.image_url.startsWith("/api/moment-illustration");

  return (
    <div
      role="img"
      aria-label="Ilustrasi Meja Belajar Saat Senja Kelas XII PPLG 1 MAKN Ende"
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-[#211711] p-4 sm:p-6 shadow-md"
    >
      <svg
        viewBox="0 0 800 440"
        className="h-auto w-full select-none rounded-xl"
      >
        <defs>
          <linearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a84232" />
            <stop offset="55%" stopColor="#c86d3b" />
            <stop offset="100%" stopColor="#f3ca82" />
          </linearGradient>
          <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe49e" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#ffe49e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dinding Kamar / Lab Sore */}
        <rect width="800" height="440" fill="#231912" />

        {/* Jendela Senja Ende */}
        <rect
          x="140"
          y="28"
          width="520"
          height="230"
          rx="8"
          fill="url(#duskSky)"
          stroke="#462916"
          strokeWidth="12"
        />
        {/* Siluet Bukit Flores di Jendela */}
        <path
          d="M146 210 Q 280 140 430 190 T 654 165 L 654 252 L 146 252 Z"
          fill="#2d6a6e"
          fillOpacity="0.7"
        />
        <line x1="400" y1="28" x2="400" y2="258" stroke="#462916" strokeWidth="8" />
        <line x1="140" y1="145" x2="660" y2="145" stroke="#462916" strokeWidth="8" />

        {/* Cahaya Lampu Meja */}
        <circle cx="575" cy="220" r="145" fill="url(#lampGlow)" />

        {/* Permukaan Meja Kayu Jati */}
        <rect x="0" y="310" width="800" height="130" fill="#653b1e" />
        <rect x="0" y="310" width="800" height="14" fill="#8d5834" />

        {/* Tumpukan Buku di Kiri */}
        <rect x="85" y="284" width="135" height="26" rx="4" fill="#a84232" />
        <rect x="92" y="288" width="122" height="18" fill="#fbf6ec" />
        <rect x="95" y="260" width="120" height="24" rx="4" fill="#2d6a6e" />
        <rect x="102" y="264" width="108" height="16" fill="#fbf6ec" />
        <rect x="105" y="238" width="105" height="22" rx="4" fill="#3b593f" />

        {/* Polaroid Melayang (Menampilkan Foto Unggahan Admin) */}
        <g transform="translate(175, 74) rotate(-8)">
          <rect width="88" height="104" rx="4" fill="#fbf6ec" />
          {hasRealPhoto ? (
            <image
              href={heroMoment!.image_url}
              x="7"
              y="7"
              width="74"
              height="68"
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <>
              <rect x="7" y="7" width="74" height="68" fill="#c86d3b" />
              <circle cx="44" cy="40" r="14" fill="#fbf3dc" />
            </>
          )}
        </g>

        {/* Bingkai Foto Meja Kanan (Menampilkan Foto Unggahan Admin) */}
        <g transform="translate(532, 206) rotate(4)">
          <rect width="92" height="108" rx="5" fill="#3b2314" stroke="#c88d48" strokeWidth="3" />
          <rect x="7" y="7" width="78" height="72" fill="#2c1d15" />
          {hasRealPhoto ? (
            <image
              href={heroMoment!.image_url}
              x="7"
              y="7"
              width="78"
              height="72"
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <>
              <rect x="7" y="7" width="78" height="72" fill="#2d6a6e" />
              <circle cx="46" cy="42" r="14" fill="#fbf3dc" />
            </>
          )}
          <rect x="7" y="81" width="78" height="19" fill="#fffdf7" />
          <text x="46" y="94" textAnchor="middle" fill="#2b190d" fontSize="9" fontWeight="bold">
            {(heroMoment?.caption || "XII PPLG 1").slice(0, 14)}
          </text>
        </g>

        {/* Laptop Menyala di Tengah Meja (Anti-Silau & Jelas) */}
        <rect x="275" y="170" width="250" height="145" rx="8" fill="#2c2723" />
        <rect x="285" y="180" width="230" height="125" rx="4" fill="#0d1117" />
        {/* Baris Kode Jelas di Layar Laptop */}
        <text x="296" y="202" fill="#ff9e64" fontSize="11" fontFamily="monospace" fontWeight="bold">
          {"const kelas = 'XII PPLG 1';"}
        </text>
        <text x="296" y="220" fill="#7dcfff" fontSize="11" fontFamily="monospace" fontWeight="bold">
          {"const database = 'Supabase PostgreSQL';"}
        </text>
        <text x="296" y="238" fill="#9ece6a" fontSize="11" fontFamily="monospace" fontWeight="bold">
          {"const sekolah = 'MAKN Ende';"}
        </text>
        <text x="296" y="256" fill="#e0af68" fontSize="11" fontFamily="monospace" fontWeight="bold">
          {"await kenangan.simpanSelamanya();"}
        </text>
        <text x="296" y="278" fill="#bb9af7" fontSize="11" fontFamily="monospace" fontWeight="bold">
          {"// Sampai jumpa di puncak sukses!"}
        </text>
        <rect x="255" y="312" width="290" height="14" rx="5" fill="#4f4740" />

        {/* Cangkir Teh Hangat & Uap */}
        <rect x="215" y="274" width="38" height="42" rx="6" fill="#f4ead8" />
        <path
          d="M253 282 C266 282 266 306 253 306"
          fill="none"
          stroke="#f4ead8"
          strokeWidth="5"
        />
        <path
          d="M228 265 Q 222 250 232 238 M240 265 Q 246 250 236 236"
          fill="none"
          stroke="#fbf3dc"
          strokeOpacity="0.6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Lampu Meja & Gantungan Kunci di Kanan */}
        <ellipse cx="640" cy="316" rx="46" ry="12" fill="#c88d48" />
        <path
          d="M640 310 Q 675 210 595 155"
          fill="none"
          stroke="#c88d48"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Gantungan Kunci */}
        <line x1="632" y1="190" x2="632" y2="222" stroke="#ebd0a0" strokeWidth="2" />
        <circle cx="632" cy="230" r="10" fill="#a84232" stroke="#f3ca82" strokeWidth="2" />
        {/* Kap Lampu */}
        <path d="M555 175 L 605 140 L 625 182 Z" fill="#3b593f" />
        <circle cx="582" cy="172" r="10" fill="#ffe4a0" />
      </svg>
    </div>
  );
}

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
  const { data: liveData } = useLivePublicData({ moments: initialMoments });
  const moments = liveData?.moments ?? initialMoments;
  const heroSectionRef = React.useRef<HTMLElement | null>(null);
  const [daysLeft, setDaysLeft] = React.useState<number | null>(null);
  const { playing, toggleAudio, currentTrack } = useSadAudio();

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
          description: `Deretan kartu ID gantung interaktif ${stats.activeStudents} siswa aktif beserta ruang khusus 'Pernah Bersama Kita' untuk ${stats.movedStudents} sahabat yang pindah di Kelas X.`,
        };
      }
      if (card.href === "/guru") {
        return {
          ...card,
          subtitle: homeroomTeacherName
            ? `${homeroomTeacherName} & ${stats.totalTeachers} Pendidik`
            : `${stats.totalTeachers} Pendidik`,
          description: homeroomTeacherName
            ? `Ucapan terima kasih tulus untuk Wali Kelas kita, ${homeroomTeacherName}, serta kartu apresiasi untuk guru kejuruan, agama, dan akademik.`
            : `Kartu apresiasi dan ucapan terima kasih untuk para guru pembimbing di database.`,
        };
      }
      if (card.href === "/galeri") {
        return {
          ...card,
          subtitle: `Kelas X · XI · XII (${stats.totalMoments} Jepretan)`,
          description:
            "Foto-foto polaroid yang tergantung di tali jemuran kayu dari masa awal masuk madrasah hingga senja terakhir Kelas XII.",
        };
      }
      if (card.href === "/dream-board") {
        return {
          ...card,
          description: `Papan tulis kelas tempat ${stats.totalDreams} lembar cita-cita ditempel dengan pin warna-warni. Klik untuk membaca alasan dan mengirim doa semangat.`,
        };
      }
      if (card.href === "/karya") {
        return {
          ...card,
          subtitle: `${stats.totalWorks} Proyek Terbaik XII PPLG 1`,
          description: `Etalase satu karya unggulan dari tiap siswa lengkap dengan jaringan keahlian (Skill Map) yang menghubungkan talenta kelas kita.`,
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
    notifyRouteTransitionStart();
    if (window.location.pathname === targetHref) {
      window.location.reload();
    } else {
      window.location.assign(targetHref);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {/* HERO SECTION: Split / Full Viewport Presence dengan Meja Belajar Senja 3D & Hitung Mundur */}
      <section
        ref={heroSectionRef}
        aria-labelledby="hero-title"
        className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12"
      >
        {/* Kolom Kiri: Tipografi Hangat, Hitung Mundur, & CTA */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex flex-col items-start lg:col-span-5"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-warm)]">
            <Sparkles className="size-3.5" />
            <span>{SITE_CONTENT.hero.eyebrow}</span>
          </div>

          <h1
            id="hero-title"
            className="mt-2 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl [text-wrap:balance]"
          >
            {SITE_CONTENT.hero.title}
          </h1>

          <p className="mt-1 font-serif text-lg italic text-muted-foreground">
            {SITE_CONTENT.hero.subtitle} — {SITE_CONTENT.school.schoolName}
          </p>

          {homeroomTeacherName ? (
            <p className="mt-2 text-xs font-semibold text-[var(--color-chart-2)]">
              Wali Kelas Pembimbing: {homeroomTeacherName}
            </p>
          ) : null}

          <p className="mt-3 text-base leading-relaxed text-foreground/90">
            {SITE_CONTENT.school.tagline}
          </p>

          {/* Kotak Hitung Mundur "Tinggal X hari bersama" */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="mt-5 w-full rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-[var(--color-accent-warm)]" />
                <span>{SITE_CONTENT.hero.countdownLabel}</span>
              </div>
              <button
                type="button"
                onClick={toggleAudio}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {playing ? (
                  <>
                    <Volume2 className="size-3.5 animate-pulse text-[var(--color-accent-warm)]" />
                    <span>Musik Sedih Aktif</span>
                  </>
                ) : (
                  <>
                    <Music2 className="size-3.5 text-muted-foreground" />
                    <span>Putar Backsound Sedih</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-1.5 font-serif text-xl font-bold text-foreground sm:text-2xl">
              {daysLeft === null ? (
                "Menghitung hari kebersamaan..."
              ) : daysLeft > 0 ? (
                <>
                  {SITE_CONTENT.hero.countdownPrefix}{" "}
                  <span className="font-mono text-3xl text-[var(--color-accent-warm)] tabular-nums">
                    {daysLeft}
                  </span>{" "}
                  {SITE_CONTENT.hero.countdownSuffix}
                </>
              ) : (
                SITE_CONTENT.hero.countdownPassed
              )}
            </p>
            {playing && (
              <p className="mt-1 text-[11px] italic text-muted-foreground">
                ♪ Sedang diputar: {currentTrack.title} ({currentTrack.subtitle})
              </p>
            )}
          </motion.div>

          {/* Tombol Aksi Utama */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <a
                href="/kenangan"
                onClick={(e) => handleNavigate(e, "/kenangan")}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--color-accent-warm)] px-5 py-2.5 text-sm font-semibold text-[#fbf6ec] shadow-sm transition-opacity hover:opacity-90 whitespace-nowrap"
              >
                <BookOpen className="size-4" />
                <span>{SITE_CONTENT.hero.ctaPrimary}</span>
              </a>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <a
                href="/anggota"
                onClick={(e) => handleNavigate(e, "/anggota")}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted whitespace-nowrap"
              >
                <Users className="size-4 text-[var(--color-chart-1)]" />
                <span>{SITE_CONTENT.hero.ctaSecondary}</span>
              </a>
            </motion.div>
          </div>
        </motion.div>

        {/* Kolom Kanan: Scene 3D "Meja Belajar Saat Senja" (HD) / Ilustrasi SVG Berlapis (Simple) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
          className="lg:col-span-7"
        >
          <Adaptive
            simple={
              <HeroDeskSimpleSVG
                heroMoment={
                  moments.find(
                    (m) =>
                      m.category === "Foto Hero 3D" &&
                      m.image_url &&
                      !m.image_url.startsWith("/api/moment-illustration")
                  ) ??
                  moments.find(
                    (m) =>
                      m.image_url &&
                      !m.image_url.startsWith("/api/moment-illustration")
                  ) ??
                  moments[0] ??
                  null
                }
              />
            }
            hd={<HeroDeskSceneHD moments={moments} />}
          />
        </motion.div>
      </section>

      {/* Baris Statistik Ramah di Bawah Hero Split */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.4 }}
        aria-label="Ringkasan Angka Kelas XII PPLG 1"
        className="mt-10 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-4 sm:p-6"
      >
        <div>
          <p className="font-serif text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            {stats.activeStudents}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (+{stats.movedStudents} sahabat)
            </span>
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Anggota Keluarga Kelas
          </p>
        </div>

        <div>
          <p className="font-serif text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            {stats.totalTeachers}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {homeroomTeacherName
              ? `Guru & Wali Kelas (${homeroomTeacherName})`
              : "Guru & Wali Kelas"}
          </p>
        </div>

        <div>
          <p className="font-serif text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            {stats.totalMoments}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Jepretan Polaroid Kelas X–XII
          </p>
        </div>

        <div>
          <p className="font-serif text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            {stats.totalDreams}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Lembar Cita-Cita & {stats.totalWorks} Karya
          </p>
        </div>
      </motion.section>

      <div className="ikat-divider my-14" aria-hidden="true" />

      {/* PETA HALAMAN: Kartu Besar Cuplikan Tiap Menu Sebagai Pintu Masuk */}
      <section aria-labelledby="map-heading">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Peta Ruang Album Digital
          </p>
          <h2
            id="map-heading"
            className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground [text-wrap:balance]"
          >
            Pilih Sudut Kenangan yang Ingin Kamu Kunjungi
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {SITE_CONTENT.school.subTagline}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dynamicMapCards.map((card, idx) => (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <a
                href={card.href}
                onClick={(e) => handleNavigate(e, card.href)}
                className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-[var(--color-accent-warm)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono font-bold text-[var(--color-accent-warm)]">
                      {card.index}.
                    </span>
                    <span>{card.meta}</span>
                  </div>

                  <h3 className="mt-3 font-serif text-xl font-bold text-foreground group-hover:text-[var(--color-accent-warm)] transition-colors">
                    {card.title}
                  </h3>

                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {card.subtitle}
                  </p>

                  <p className="mt-3 text-sm leading-relaxed text-card-foreground/90">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-dashed border-border pt-3.5 text-xs font-semibold text-foreground">
                  <span>Masuk ke Halaman {card.title}</span>
                  <ArrowRight className="size-4 text-[var(--color-accent-warm)] transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
