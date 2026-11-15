"use client";

import * as React from "react";
import Link from "next/link";
import {
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Box,
  Sparkles,
  SkipForward,
} from "lucide-react";
import { motion } from "motion/react";
import { SITE_CONTENT } from "@/lib/content";
import { useTheme } from "@/lib/theme";
import { useVisualTier } from "@/lib/visual-tier";
import { useSadAudio, SAD_TIKTOK_TRACKS } from "@/lib/sad-audio";
import { useLivePublicData } from "@/lib/use-public-data";

export function Footer() {
  const { theme, toggleTheme } = useTheme();
  const { tier, webglSupported, setManualTier } = useVisualTier();
  const { playing, trackIndex, currentTrack, toggleAudio, nextTrack, selectTrack } =
    useSadAudio();
  const { data: liveData } = useLivePublicData();

  const homeroomTeacherName = React.useMemo(() => {
    if (liveData?.teachers?.length) {
      const hr =
        liveData.teachers.find((t) => t.is_homeroom) ?? liveData.teachers[0];
      if (hr?.full_name) return hr.full_name;
    }
    return "Ibu Hajra, S.Pd.";
  }, [liveData]);

  return (
    <footer className="mt-20 border-t border-border bg-card text-card-foreground">
      <div className="ikat-divider" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Kolom 1: Identitas Kelas & Madrasah (Tanpa info login admin) */}
          <div>
            <p className="font-serif text-xl font-bold tracking-tight text-foreground">
              {SITE_CONTENT.school.className} — {SITE_CONTENT.school.shortSchool}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {SITE_CONTENT.school.majorFull}, {SITE_CONTENT.school.schoolName}.{" "}
              {SITE_CONTENT.school.city}.
            </p>
            <p className="mt-3 font-hand text-lg text-foreground/90">
              &ldquo;Tiga tahun merajut logika, seumur hidup menjaga saudara.&rdquo;
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Wali Kelas Pembimbing:{" "}
              <span className="font-semibold text-foreground">
                {homeroomTeacherName}
              </span>
            </p>
          </div>

          {/* Kolom 2: Peta Halaman & Interaksi Kelas */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ruang Album & Interaksi
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {SITE_CONTENT.nav.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-block py-1 text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/main"
                  className="inline-block py-1 font-semibold text-[var(--color-accent-warm)] transition-opacity hover:opacity-80 whitespace-nowrap"
                >
                  Main (Kuis & Polling)
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Pengaturan Tampilan & Pemutar 3 Lagu YouTube */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suasana & 3 Lagu Kenangan YouTube
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={toggleTheme}
                aria-label={
                  theme === "light"
                    ? "Ganti ke Mode Malam (Lampu Kuning Hangat)"
                    : "Ganti ke Mode Sore (Kertas Terang)"
                }
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted whitespace-nowrap shrink-0"
              >
                {theme === "light" ? (
                  <>
                    <Moon className="size-4 text-[var(--color-accent-warm)]" />
                    <span>Mode Malam</span>
                  </>
                ) : (
                  <>
                    <Sun className="size-4 text-[var(--color-accent-warm)]" />
                    <span>Mode Sore</span>
                  </>
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                disabled={!webglSupported && tier === "simple"}
                onClick={() => setManualTier(tier === "hd" ? "simple" : "hd")}
                aria-label={
                  tier === "hd"
                    ? "Beralih ke Mode Ringan (Tanpa WebGL 3D)"
                    : "Aktifkan Tampilan 3D Penuh"
                }
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {tier === "hd" ? (
                  <>
                    <Sparkles className="size-4 text-[var(--color-chart-1)]" />
                    <span>Mode ringan</span>
                  </>
                ) : (
                  <>
                    <Box className="size-4 text-[var(--color-chart-1)]" />
                    <span>Aktifkan 3D</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Pemutar 3 Lagu Kenangan YouTube */}
            <div className="mt-3 rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">
                    {currentTrack.title}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {currentTrack.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={toggleAudio}
                    aria-pressed={playing}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      playing
                        ? "bg-[var(--color-accent-warm)] text-[#fbf6ec]"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {playing ? (
                      <>
                        <Volume2 className="size-3.5 animate-pulse" />
                        <span>Jeda</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="size-3.5" />
                        <span>Putar</span>
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={nextTrack}
                    title="Ganti lagu perpisahan berikutnya"
                    aria-label="Ganti lagu perpisahan berikutnya"
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted"
                  >
                    <SkipForward className="size-3.5" />
                  </motion.button>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5">
                {SAD_TIKTOK_TRACKS.map((t, idx) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTrack(idx)}
                    className={`flex-1 rounded-md py-1 font-mono text-[10px] font-bold transition-colors ${
                      trackIndex === idx
                        ? "bg-[var(--color-accent-warm)] text-[#fbf6ec]"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Lagu #{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Mode tampilan:{" "}
              <span className="font-semibold text-foreground">
                {tier === "hd" ? "3D Interaktif (HD)" : "Tampilan Sederhana & Cepat"}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            Dibuat dengan penuh rasa rindu oleh Keluarga Besar{" "}
            <strong className="font-medium text-foreground">XII PPLG 1</strong> ·{" "}
            {SITE_CONTENT.school.schoolName} ({SITE_CONTENT.school.cohortYears})
          </p>
          <div className="flex items-center gap-4">
            <span>Ende, Flores — NTT</span>
            <span aria-hidden="true">·</span>
            <Link
              href="/main"
              className="hover:text-foreground underline underline-offset-4 whitespace-nowrap"
            >
              Kuis & Polling Kelas
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
