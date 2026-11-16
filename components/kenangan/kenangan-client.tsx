"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Lock,
  Unlock,
  Send,
  List,
  CheckCircle2,
  Sparkles,
  Smile,
  Coffee,
  Terminal,
} from "lucide-react";
import { Adaptive } from "@/components/three/adaptive";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { FAREWELL_MEME_STICKERS } from "@/lib/procedural-textures";
import {
  useLivePublicData,
  notifyPublicDataUpdated,
} from "@/lib/use-public-data";
import type { BookSpread } from "@/components/kenangan/buku-scene-hd";
import type {
  MemoryEntryRow,
  StudentRow,
  ThanksRow,
  TimeCapsuleRow,
} from "@/lib/types";

const BukuKenanganSceneHD = dynamic(
  () =>
    import("@/components/kenangan/buku-scene-hd").then(
      (m) => m.BukuKenanganSceneHD
    ),
  { ssr: false }
);

type KenanganTab = "buku" | "kapsul" | "thanks";

function FarewellMemeStickerCard({
  memeIdx,
  rotateDeg = -3,
  className = "",
}: {
  memeIdx: number;
  rotateDeg?: number;
  className?: string;
}) {
  const meme =
    FAREWELL_MEME_STICKERS[
      Math.abs(memeIdx) % FAREWELL_MEME_STICKERS.length
    ]!;

  return (
    <motion.div
      whileHover={{ scale: 1.06, rotate: 0 }}
      whileTap={{ scale: 0.96 }}
      style={{
        transform: `rotate(${rotateDeg}deg)`,
        backgroundColor: meme.bg,
        borderColor: meme.accent,
        color: meme.ink,
      }}
      className={`inline-flex max-w-[275px] items-center gap-2.5 rounded-2xl border-2 p-2.5 shadow-[0_6px_16px_rgba(28,18,10,0.16),0_0_0_5px_#fffdf9] select-none ${className}`}
    >
      <div
        style={{ borderColor: meme.accent }}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 bg-[#fffdf9] text-[#23140b] shadow-2xs"
      >
        {meme.icon === "coffee" || meme.icon === "reuni" ? (
          <Coffee className="size-5 text-[#c86d3b]" />
        ) : meme.icon === "git-bye" || meme.icon === "ctrl-s" || meme.icon === "bug" ? (
          <Terminal className="size-5 text-[#2d6a6e]" />
        ) : (
          <Smile className="size-5 text-[#d9534f]" />
        )}
      </div>
      <div className="min-w-0 text-left leading-tight">
        <span
          style={{ backgroundColor: meme.accent }}
          className="inline-block rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#fffdf9]"
        >
          ★ {meme.badge} ★
        </span>
        <p className="mt-1 font-hand text-base font-bold leading-none">
          {meme.topText}
        </p>
        <p
          style={{ color: meme.accent }}
          className="mt-0.5 font-hand text-sm font-bold leading-tight"
        >
          {meme.bottomText}
        </p>
      </div>
    </motion.div>
  );
}

export function KenanganClient({
  students: initialStudents,
  memoryEntries: initialMemoryEntries,
  timeCapsules: initialTimeCapsules,
  thanksList: initialThanksList,
}: {
  students: StudentRow[];
  memoryEntries: MemoryEntryRow[];
  timeCapsules: TimeCapsuleRow[];
  thanksList: ThanksRow[];
}) {
  const { data: liveData, refresh } = useLivePublicData({
    students: initialStudents,
    memoryEntries: initialMemoryEntries,
    timeCapsules: initialTimeCapsules,
    thanksList: initialThanksList,
  });
  const students = liveData?.students ?? initialStudents;
  const memoryEntries = liveData?.memoryEntries ?? initialMemoryEntries;
  const timeCapsules = liveData?.timeCapsules ?? initialTimeCapsules;
  const thanksList = liveData?.thanksList ?? initialThanksList;

  const [activeTab, setActiveTab] = React.useState<KenanganTab>("buku");
  const [isBookOpen, setIsBookOpen] = React.useState(true);
  const [spreadIndex, setSpreadIndex] = React.useState(0);

  // State Paginasi (Prev / Next Icon) agar tidak capek scroll
  const [tocPage, setTocPage] = React.useState(1);
  const TOC_PER_PAGE = 8;

  const [capsulePage, setCapsulePage] = React.useState(1);
  const CAPSULES_PER_PAGE = 4;

  const [thanksPage, setThanksPage] = React.useState(1);
  const THANKS_PER_PAGE = 4;

  // Form Kirim Pesan Buku Kenangan
  const [memStudentId, setMemStudentId] = React.useState(
    students[0]?.id ?? ""
  );
  const [memAuthor, setMemAuthor] = React.useState("");
  const [memMessage, setMemMessage] = React.useState("");
  const [memCode, setMemCode] = React.useState("XIIPPLG1");
  const [memFeedback, setMemFeedback] = React.useState<string | null>(null);
  const [memSubmitting, setMemSubmitting] = React.useState(false);

  // Form Kirim Kapsul Waktu
  const [capAuthor, setCapAuthor] = React.useState("");
  const [capRecipient, setCapRecipient] = React.useState(
    "Untuk Reuni XII PPLG 1"
  );
  const [capMessage, setCapMessage] = React.useState("");
  const [capUnlockAt, setCapUnlockAt] = React.useState("2027-06-01");
  const [capCode, setCapCode] = React.useState("XIIPPLG1");
  const [capFeedback, setCapFeedback] = React.useState<string | null>(null);
  const [capSubmitting, setCapSubmitting] = React.useState(false);

  // Form Kirim Wall of Thanks
  const [thFrom, setThFrom] = React.useState("");
  const [thTo, setThTo] = React.useState("");
  const [thMessage, setThMessage] = React.useState("");
  const [thCode, setThCode] = React.useState("XIIPPLG1");
  const [thFeedback, setThFeedback] = React.useState<string | null>(null);
  const [thSubmitting, setThSubmitting] = React.useState(false);

  // Susun Spread Buku Kenangan: Spread 0 = Daftar Isi, Spread 1..N = tiap siswa
  const spreads: BookSpread[] = React.useMemo(() => {
    const result: BookSpread[] = [];
    const tocEntries = students.map((s, idx) => ({
      name: s.full_name,
      spreadIndex: idx + 1,
    }));
    const halfToc = Math.ceil(tocEntries.length / 2);

    result.push({
      spreadIndex: 0,
      leftPage: {
        type: "toc",
        pageNumber: 1,
        tocEntries: tocEntries.slice(0, halfToc),
        decorSeed: 101,
      },
      rightPage: {
        type: "toc",
        pageNumber: 2,
        tocEntries: tocEntries.slice(halfToc),
        decorSeed: 202,
      },
    });

    students.forEach((stu, idx) => {
      const stuMemories = memoryEntries
        .filter((m) => m.student_id === stu.id)
        .map((m) => ({
          author: m.author_name,
          text: m.message,
          seed: m.decor_seed,
        }));

      result.push({
        spreadIndex: idx + 1,
        leftPage: {
          type: "student-left",
          pageNumber: (idx + 1) * 2 + 1,
          studentName: stu.full_name,
          studentNickname: stu.nickname,
          studentRole: stu.is_active
            ? `Peminatan ${stu.tags[0] || "PPLG"}`
            : "Pernah Bersama Kita",
          studentBio: stu.bio,
          studentTags: stu.tags,
          studentPhotoUrl: stu.photo_url,
          showPhoto: stu.show_photo,
          decorSeed: 300 + idx * 19,
        },
        rightPage: {
          type: "student-right",
          pageNumber: (idx + 1) * 2 + 2,
          studentName: stu.full_name,
          studentNickname: stu.nickname,
          messages: stuMemories,
          decorSeed: 400 + idx * 29,
        },
      });
    });

    return result;
  }, [students, memoryEntries]);

  const currentSpread = spreads[spreadIndex] ?? spreads[0]!;

  // Navigasi Keyboard untuk Buku Kenangan
  React.useEffect(() => {
    if (activeTab !== "buku") return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        if (!isBookOpen) setIsBookOpen(true);
        else setSpreadIndex((p) => Math.min(spreads.length - 1, p + 1));
      } else if (e.key === "ArrowLeft") {
        setSpreadIndex((p) => Math.max(0, p - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, isBookOpen, spreads.length]);

  const submitMemoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemSubmitting(true);
    setMemFeedback(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "memory",
          studentId: memStudentId,
          authorName: memAuthor,
          message: memMessage,
          classCode: memCode,
          honeypot: "",
        }),
      });
      const json = await res.json();
      setMemFeedback(
        json.ok
          ? json.message
          : json.error || "Gagal mengirim catatan Buku Kenangan."
      );
      if (json.ok) {
        setMemMessage("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setMemFeedback("Gagal menghubungi server.");
    } finally {
      setMemSubmitting(false);
    }
  };

  const submitCapsuleForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setCapSubmitting(true);
    setCapFeedback(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "time_capsule",
          authorName: capAuthor,
          recipientLabel: capRecipient,
          message: capMessage,
          unlockAt: capUnlockAt,
          classCode: capCode,
          honeypot: "",
        }),
      });
      const json = await res.json();
      setCapFeedback(
        json.ok ? json.message : json.error || "Gagal menyegel kapsul waktu."
      );
      if (json.ok) {
        setCapMessage("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setCapFeedback("Gagal menghubungi server.");
    } finally {
      setCapSubmitting(false);
    }
  };

  const submitThanksForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setThSubmitting(true);
    setThFeedback(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "thanks",
          fromName: thFrom,
          toName: thTo,
          message: thMessage,
          classCode: thCode,
          honeypot: "",
        }),
      });
      const json = await res.json();
      setThFeedback(
        json.ok ? json.message : json.error || "Gagal mengirim ucapan."
      );
      if (json.ok) {
        setThMessage("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setThFeedback("Gagal menghubungi server.");
    } finally {
      setThSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header Halaman Kenangan */}
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Ruang Memori & Surat Masa Depan · UNO XII PPLG 1
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
          Buku Kenangan, Kapsul Waktu & Dinding Terima Kasih
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Buka lembar demi lembar catatan tulisan tangan asli lengkap dengan
          stiker meme perpisahan untuk setiap sahabat, segel surat masa depan,
          atau gantungkan ucapan terima kasih.
        </p>
      </header>

      {/* Tiga Tab: Buku Kenangan, Kapsul Waktu, Wall of Thanks */}
      <div
        role="tablist"
        aria-label="Menu Ruang Kenangan"
        className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card p-1.5"
      >
        <motion.button
          role="tab"
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          aria-selected={activeTab === "buku"}
          onClick={() => setActiveTab("buku")}
          className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "buku"
              ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <BookOpen className="size-4" />
          <span>Buku Kenangan</span>
        </motion.button>

        <motion.button
          role="tab"
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          aria-selected={activeTab === "kapsul"}
          onClick={() => setActiveTab("kapsul")}
          className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "kapsul"
              ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Clock className="size-4" />
          <span>Kapsul Waktu ({timeCapsules.length})</span>
        </motion.button>

        <motion.button
          role="tab"
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          aria-selected={activeTab === "thanks"}
          onClick={() => setActiveTab("thanks")}
          className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "thanks"
              ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Heart className="size-4" />
          <span>Wall of Thanks ({thanksList.length})</span>
        </motion.button>
      </div>

      {/* TAB 1: BUKU KENANGAN */}
      {activeTab === "buku" && (
        <section aria-label="Buku Kenangan XII PPLG 1" className="mt-8 space-y-8">
          {/* Teks alternatif tersembunyi (sr-only) berisi pesan pada spread aktif untuk pembaca layar */}
          <div className="sr-only" aria-live="polite">
            {currentSpread.leftPage.type === "toc" ? (
              <p>Halaman Daftar Isi Buku Kenangan XII PPLG 1.</p>
            ) : (
              <div>
                <h2>Halaman Kenangan {currentSpread.leftPage.studentName}</h2>
                <p>{currentSpread.leftPage.studentBio}</p>
                <ul>
                  {currentSpread.rightPage.messages?.map((m, i) => (
                    <li key={i}>
                      Pesan dari {m.author}: {m.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Kontrol Navigasi Buku & Daftar Isi Cepat */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsBookOpen((prev) => !prev)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] transition-opacity hover:opacity-90 whitespace-nowrap"
              >
                <BookOpen className="size-4" />
                <span>
                  {isBookOpen ? "Tutup Sampul Buku" : "Buka Sampul Buku"}
                </span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setIsBookOpen(true);
                  setSpreadIndex(0);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted whitespace-nowrap"
              >
                <List className="size-4 text-[var(--color-chart-1)]" />
                <span>Daftar Isi</span>
              </motion.button>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="jump-student" className="sr-only">
                Loncat ke halaman siswa
              </label>
              <select
                id="jump-student"
                value={spreadIndex}
                onChange={(e) => {
                  setIsBookOpen(true);
                  setSpreadIndex(Number(e.target.value));
                }}
                className="min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground"
              >
                <option value={0}>00. Daftar Isi Buku</option>
                {students.map((s, idx) => (
                  <option key={s.id} value={idx + 1}>
                    {String(idx + 1).padStart(2, "0")}. {s.full_name}
                  </option>
                ))}
              </select>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                aria-label="Halaman sebelumnya"
                disabled={spreadIndex <= 0}
                onClick={() => {
                  setIsBookOpen(true);
                  setSpreadIndex((p) => Math.max(0, p - 1));
                }}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="size-5" />
              </motion.button>

              <span className="font-mono text-xs tabular-nums text-muted-foreground px-1">
                {spreadIndex + 1} / {spreads.length}
              </span>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                aria-label="Halaman berikutnya"
                disabled={spreadIndex >= spreads.length - 1}
                onClick={() => {
                  setIsBookOpen(true);
                  setSpreadIndex((p) => Math.min(spreads.length - 1, p + 1));
                }}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="size-5" />
              </motion.button>
            </div>
          </div>

          {/* Adaptive Buku Kenangan: 3D Melengkung di Desktop HD, Buku 2D Scrapbook dengan Kotak Teks Acak & Stiker Meme di Mode Ringan */}
          <Adaptive
            simple={
              <div className="overflow-hidden rounded-2xl border-2 border-[#782f24]/60 bg-[#fbf5e8] text-[#2b2118] shadow-lg">
                {!isBookOpen ? (
                  /* Sampul Buku 2D Tertutup */
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-[#63261d] via-[#782f24] to-[#521e16] px-6 py-16 text-center text-[#f3ca82]">
                    <div className="w-full max-w-md rounded-xl border-2 border-[#e0a958] p-8 shadow-inner">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ebd0a0]">
                        Album Memori Madrasah · UNO
                      </p>
                      <h2 className="mt-4 font-serif text-4xl font-bold">
                        Kenangan XII PPLG 1
                      </h2>
                      <p className="mt-2 font-hand text-2xl text-[#ebd0a0]">
                        MAKN Ende · Flores, NTT
                      </p>
                      <p className="mt-6 font-mono text-xs text-[#ebd0a0]/80">
                        2024 — 2027
                      </p>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsBookOpen(true)}
                        className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#e0a958] px-6 py-2.5 text-xs font-bold text-[#2b2118] shadow"
                      >
                        <BookOpen className="size-4" />
                        <span>Buka Lembar Pertama</span>
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  /* Lembar Buku 2D Terbuka dengan Lipatan Tengah, Kotak Teks Acak, Tulisan Tangan Caveat, dan Stiker Meme Perpisahan */
                  <div className="relative grid grid-cols-1 divide-y divide-[#d8c7ae] md:grid-cols-2 md:divide-x md:divide-y-0">
                    {/* Halaman Kiri */}
                    <div className="relative flex flex-col justify-between p-6 sm:p-8">
                      <div>
                        {/* Hiasan Washi Tape */}
                        <div
                          aria-hidden="true"
                          className="mx-auto -mt-3 mb-4 h-6 w-32 -rotate-2 bg-[#c86d3b]/35"
                        />
                        {currentSpread.leftPage.type === "toc" ? (
                          <div>
                            <h2 className="font-hand text-3xl font-bold text-[#2b2118]">
                              Daftar Isi — Bagian I
                            </h2>
                            <p className="mt-1 font-hand text-lg text-[#6e5a47]">
                              Ketuk nama sahabat untuk langsung membuka lembar kenangannya:
                            </p>
                            <ul className="mt-4 space-y-2.5">
                              {currentSpread.leftPage.tocEntries?.map(
                                (entry, idx) => {
                                  const tilt =
                                    idx % 2 === 0 ? "-rotate-1" : "rotate-1";
                                  return (
                                    <li key={entry.spreadIndex}>
                                      <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() =>
                                          setSpreadIndex(entry.spreadIndex)
                                        }
                                        className={`flex w-full items-center justify-between rounded-xl border border-[#d8c7ae] bg-[#fffdf7] px-3.5 py-2 text-left font-hand text-xl font-bold text-[#2b2118] shadow-2xs hover:bg-[#ebe0cd] ${tilt}`}
                                      >
                                        <span>
                                          {String(entry.spreadIndex).padStart(
                                            2,
                                            "0"
                                          )}
                                          . {entry.name}
                                        </span>
                                        <span className="font-hand text-lg text-[#a84232]">
                                          Hal. {entry.spreadIndex * 2} →
                                        </span>
                                      </motion.button>
                                    </li>
                                  );
                                }
                              )}
                            </ul>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center">
                            <motion.div
                              whileHover={{ rotate: 0, scale: 1.03 }}
                              style={{
                                transform: `rotate(${
                                  ((spreadIndex % 5) - 2) * 1.8
                                }deg)`,
                              }}
                              className="real-photo-paper photo-gloss-sheen w-48 rounded-lg p-3 pb-5 shadow-md"
                            >
                              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded bg-gradient-to-br from-[#2d6a6e] to-[#8c3b2b] text-[#fbf6ec]">
                                {currentSpread.leftPage.studentPhotoUrl &&
                                currentSpread.leftPage.showPhoto !== false ? (
                                  <img
                                    src={currentSpread.leftPage.studentPhotoUrl}
                                    alt={currentSpread.leftPage.studentName || ""}
                                    referrerPolicy="no-referrer"
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <span className="font-hand text-4xl font-bold">
                                    {currentSpread.leftPage.studentNickname?.slice(
                                      0,
                                      2
                                    )}
                                  </span>
                                )}
                              </div>
                              <p className="mt-2.5 font-hand text-2xl font-bold text-[#2b2118]">
                                ★ {currentSpread.leftPage.studentNickname} ★
                              </p>
                            </motion.div>

                            {/* Kotak Nama Miring Unik */}
                            <div
                              style={{
                                transform: `rotate(${
                                  ((spreadIndex % 3) - 1) * -1.4
                                }deg)`,
                              }}
                              className="mt-5 w-full max-w-md rounded-xl border-2 border-[#d99b4e] bg-[#fffdf7] px-4 py-2.5 shadow-xs"
                            >
                              <h2 className="font-hand text-3xl font-bold text-[#2b2118]">
                                {currentSpread.leftPage.studentName}
                              </h2>
                              <p className="font-hand text-lg font-bold text-[#a84232]">
                                {currentSpread.leftPage.studentRole}
                              </p>
                            </div>

                            {/* Kotak Bio dengan Variasi Kertas & Posisi Acak per Siswa */}
                            <div
                              style={{
                                transform: `rotate(${
                                  ((spreadIndex * 7) % 5) - 2
                                }deg) translateX(${
                                  ((spreadIndex * 11) % 16) - 8
                                }px)`,
                              }}
                              className="relative mt-5 w-full max-w-md rounded-2xl border-2 border-[#6e4e32] bg-[#fffaf0] p-5 shadow-sm"
                            >
                              <span
                                aria-hidden="true"
                                className="absolute -top-3 left-6 h-5 w-16 -rotate-6 bg-[#c86d3b]/45"
                              />
                              <p className="font-hand text-2xl leading-relaxed text-[#182542]">
                                &ldquo;{currentSpread.leftPage.studentBio}&rdquo;
                              </p>
                              {currentSpread.leftPage.studentTags && (
                                <p className="mt-3 font-hand text-lg font-bold text-[#a84232]">
                                  #{currentSpread.leftPage.studentTags.join("  #")}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stiker Meme Perpisahan Lucu di Halaman Kiri */}
                      <div className="mt-6 flex flex-col items-center gap-3 pt-2">
                        <FarewellMemeStickerCard
                          memeIdx={spreadIndex * 2 + 1}
                          rotateDeg={spreadIndex % 2 === 0 ? -3 : 3}
                        />
                        <p className="text-center font-hand text-lg font-bold text-[#6e5a47]">
                          ~ Lembar {currentSpread.leftPage.pageNumber} · UNO Scrapbook ~
                        </p>
                      </div>
                    </div>

                    {/* Halaman Kanan */}
                    <div className="relative flex flex-col justify-between p-6 sm:p-8">
                      <div>
                        <div
                          aria-hidden="true"
                          className="mx-auto -mt-3 mb-4 h-6 w-32 rotate-2 bg-[#2d6a6e]/30"
                        />
                        {currentSpread.rightPage.type === "toc" ? (
                          <div>
                            <h2 className="font-hand text-3xl font-bold text-[#2b2118]">
                              Daftar Isi — Bagian II
                            </h2>
                            <p className="mt-1 font-hand text-lg text-[#6e5a47]">
                              Ketuk nama sahabat untuk langsung membuka lembar kenangannya:
                            </p>
                            <ul className="mt-4 space-y-2.5">
                              {currentSpread.rightPage.tocEntries?.map(
                                (entry, idx) => {
                                  const tilt =
                                    idx % 2 === 0 ? "rotate-1" : "-rotate-1";
                                  return (
                                    <li key={entry.spreadIndex}>
                                      <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() =>
                                          setSpreadIndex(entry.spreadIndex)
                                        }
                                        className={`flex w-full items-center justify-between rounded-xl border border-[#d8c7ae] bg-[#fffdf7] px-3.5 py-2 text-left font-hand text-xl font-bold text-[#2b2118] shadow-2xs hover:bg-[#ebe0cd] ${tilt}`}
                                      >
                                        <span>
                                          {String(entry.spreadIndex).padStart(
                                            2,
                                            "0"
                                          )}
                                          . {entry.name}
                                        </span>
                                        <span className="font-hand text-lg text-[#a84232]">
                                          Hal. {entry.spreadIndex * 2} →
                                        </span>
                                      </motion.button>
                                    </li>
                                  );
                                }
                              )}
                            </ul>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            <div className="inline-block -rotate-1 rounded-xl border-2 border-[#2b190d] bg-[#fffdf7] px-4 py-1.5 shadow-2xs">
                              <h3 className="font-hand text-2xl font-bold text-[#2b2118]">
                                Surat Sahabat utk{" "}
                                {currentSpread.rightPage.studentNickname} ♥
                              </h3>
                            </div>
                            {currentSpread.rightPage.messages &&
                            currentSpread.rightPage.messages.length > 0 ? (
                              currentSpread.rightPage.messages.map((m, idx) => {
                                const cardBgs = [
                                  "bg-[#fffdf5] border-[#5c4026]",
                                  "bg-[#f3faf7] border-[#2d6a6e]",
                                  "bg-[#fef9e7] border-[#b8732a]",
                                  "bg-[#fdf2e9] border-[#a84232]",
                                ];
                                const rotDeg =
                                  (((m.seed || 10) + idx * 7 + spreadIndex * 3) %
                                    7) -
                                  3;
                                const shiftPx =
                                  (((m.seed || 10) + idx * 13) % 20) - 10;

                                return (
                                  <motion.blockquote
                                    key={idx}
                                    whileHover={{ scale: 1.02, rotate: 0 }}
                                    style={{
                                      transform: `rotate(${rotDeg}deg) translateX(${shiftPx}px)`,
                                    }}
                                    className={`relative rounded-2xl border-2 p-4 shadow-sm transition-shadow hover:shadow-md ${
                                      cardBgs[(idx + spreadIndex) % cardBgs.length]
                                    }`}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="absolute -top-2.5 left-1/2 h-4 w-20 -translate-x-1/2 bg-[#c86d3b]/45"
                                    />
                                    <p className="font-hand text-2xl leading-snug text-[#182542]">
                                      &ldquo;{m.text}&rdquo;
                                    </p>
                                    <footer className="mt-2 text-right font-hand text-xl font-bold text-[#a84232]">
                                      ~ Dari: {m.author} ♥
                                    </footer>
                                  </motion.blockquote>
                                );
                              })
                            ) : (
                              <div className="rounded-2xl border-2 border-dashed border-[#c4a782] bg-[#fffdf7]/80 p-5 text-center">
                                <p className="font-hand text-2xl text-[#6e5a47]">
                                  Belum ada pesan kenangan di database untuk halaman ini.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stiker Meme Perpisahan Lucu di Halaman Kanan */}
                      <div className="mt-6 flex flex-col items-center gap-3 pt-2">
                        <FarewellMemeStickerCard
                          memeIdx={spreadIndex * 2 + 2}
                          rotateDeg={spreadIndex % 2 === 0 ? 3 : -3}
                        />
                        <p className="text-center font-hand text-lg font-bold text-[#6e5a47]">
                          ~ Lembar {currentSpread.rightPage.pageNumber} · UNO Scrapbook ~
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            }
            hd={
              <BukuKenanganSceneHD
                spreads={spreads}
                isBookOpen={isBookOpen}
                activeSpreadIndex={spreadIndex}
                onOpenBook={() => setIsBookOpen(true)}
                onChangeSpread={(next) => setSpreadIndex(next)}
              />
            }
          />

          {/* Strip Koleksi Stiker Meme Perpisahan di Bawah Buku (Tampil di Mode 3D & 2D) */}
          <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--color-accent-warm)]" />
                <span className="font-hand text-xl font-bold text-foreground">
                  Stiker Meme Perpisahan Lembar Ini (Hal. {currentSpread.leftPage.pageNumber} &ndash; {currentSpread.rightPage.pageNumber})
                </span>
              </div>
              <span className="font-hand text-base text-muted-foreground">
                Setiap halaman menyimpan stiker kenangan masa sekolah yang berbeda ✨
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:justify-around">
              <FarewellMemeStickerCard
                memeIdx={spreadIndex * 2 + 1}
                rotateDeg={-2}
              />
              <FarewellMemeStickerCard
                memeIdx={spreadIndex * 2 + 2}
                rotateDeg={2}
              />
            </div>
          </div>

          {/* Panel Daftar Isi Interaktif & Form Kirim Catatan Buku Kenangan */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Daftar Isi Cepat dengan Paginasi Prev/Next */}
            <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-7">
              <h2 className="font-serif text-xl font-bold text-foreground">
                Daftar Isi Cepat (Loncat ke Halaman Sahabat)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Klik nama siswa untuk langsung membuka lembar kenangannya di atas:
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {students
                  .slice((tocPage - 1) * TOC_PER_PAGE, tocPage * TOC_PER_PAGE)
                  .map((s, localIdx) => {
                    const idx = (tocPage - 1) * TOC_PER_PAGE + localIdx;
                    const isCurrent = spreadIndex === idx + 1;
                    return (
                      <motion.button
                        key={s.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setIsBookOpen(true);
                          setSpreadIndex(idx + 1);
                        }}
                        className={`flex min-h-[42px] items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                          isCurrent
                            ? "border-[var(--color-accent-warm)] bg-muted text-foreground font-semibold"
                            : "border-border/60 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        <span className="truncate">
                          {String(idx + 1).padStart(2, "0")}. {s.full_name}
                        </span>
                        <span className="ml-2 shrink-0 font-mono text-[11px] text-[var(--color-accent-warm)]">
                          Hal. {(idx + 1) * 2 + 1}
                        </span>
                      </motion.button>
                    );
                  })}
              </div>
              <PaginationBar
                currentPage={tocPage}
                totalPages={Math.max(1, Math.ceil(students.length / TOC_PER_PAGE))}
                totalItems={students.length}
                pageSize={TOC_PER_PAGE}
                onPageChange={setTocPage}
                itemLabel="siswa di Daftar Isi"
              />
            </div>

            {/* Form Tulis Pesan Baru ke Buku Kenangan */}
            <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-5">
              <h2 className="font-serif text-xl font-bold text-foreground">
                Tulis Pesan ke Buku Kenangan
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Pesanmu akan dirender dengan tulisan tangan dan hiasan stiker di
                halaman sahabat yang kamu pilih setelah disetujui admin.
              </p>

              <form onSubmit={submitMemoryForm} className="mt-4 space-y-3.5">
                <div>
                  <label
                    htmlFor="bk-student"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Pilih Sahabat Tujuan
                  </label>
                  <select
                    id="bk-student"
                    value={memStudentId}
                    onChange={(e) => setMemStudentId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.nickname})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="bk-author"
                      className="block text-xs font-semibold text-foreground"
                    >
                      Nama Kamu
                    </label>
                    <input
                      id="bk-author"
                      type="text"
                      required
                      minLength={2}
                      value={memAuthor}
                      onChange={(e) => setMemAuthor(e.target.value)}
                      placeholder="Nama / Panggilan"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bk-code"
                      className="block text-xs font-semibold text-foreground"
                    >
                      Kode Kelas
                    </label>
                    <input
                      id="bk-code"
                      type="text"
                      required
                      value={memCode}
                      onChange={(e) => setMemCode(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="bk-msg"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Isi Catatan Kenangan
                  </label>
                  <textarea
                    id="bk-msg"
                    required
                    minLength={5}
                    maxLength={500}
                    rows={3}
                    value={memMessage}
                    onChange={(e) => setMemMessage(e.target.value)}
                    placeholder="Tuliskan pesan hangatmu di sini..."
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-hand text-xl text-foreground"
                  />
                </div>

                {memFeedback && (
                  <p
                    role="status"
                    className="rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground"
                  >
                    {memFeedback}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={memSubmitting}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2.5 text-xs font-semibold text-[#fbf6ec] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="size-3.5" />
                  <span>
                    {memSubmitting ? "Mengirim..." : "Tempel ke Buku Kenangan"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: KAPSUL WAKTU */}
      {activeTab === "kapsul" && (
        <section aria-label="Kapsul Waktu XII PPLG 1" className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <h2 className="font-serif text-2xl font-bold text-foreground">
              Amplop Kapsul Waktu Kelas
            </h2>
            <p className="text-sm text-muted-foreground">
              Surat yang belum mencapai tanggal bukanya (`unlock_at`) disegel
              langsung dari server sehingga isinya tetap rahasia sampai waktunya
              tiba.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {timeCapsules
                .slice(
                  (capsulePage - 1) * CAPSULES_PER_PAGE,
                  capsulePage * CAPSULES_PER_PAGE
                )
                .map((cap, idx) => {
                  const unlockDateStr = new Date(cap.unlock_at).toLocaleDateString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  );
                  return (
                    <motion.article
                      key={cap.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      whileHover={{ y: -2 }}
                      className={`flex flex-col justify-between rounded-2xl border p-5 ${
                        cap.is_unlocked
                          ? "border-border bg-card shadow-sm"
                          : "border-dashed border-border bg-muted/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                            {cap.is_unlocked ? (
                              <>
                                <Unlock className="size-3.5 text-[var(--color-chart-2)]" />
                                <span>Sudah Terbuka</span>
                              </>
                            ) : (
                              <>
                                <Lock className="size-3.5 text-[var(--color-accent-warm)]" />
                                <span>Terkunci Rapat</span>
                              </>
                            )}
                          </span>
                          <span className="tabular-nums">{unlockDateStr}</span>
                        </div>

                        <h3 className="mt-3 font-serif text-base font-bold text-foreground">
                          {cap.recipient_label}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Ditulis oleh {cap.author_name}
                        </p>

                        {cap.is_unlocked && cap.message ? (
                          <blockquote className="mt-4 rounded-xl border border-border bg-background p-3.5 font-hand text-xl leading-snug text-foreground">
                            &ldquo;{cap.message}&rdquo;
                          </blockquote>
                        ) : (
                          <div className="mt-4 rounded-xl border border-dashed border-border bg-background/60 p-4 text-center">
                            <Lock className="mx-auto size-5 text-muted-foreground" />
                            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                              Amplop ini masih tersegel di server. Baru dapat
                              dibaca pada {unlockDateStr}.
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
            </div>

            <PaginationBar
              currentPage={capsulePage}
              totalPages={Math.max(
                1,
                Math.ceil(timeCapsules.length / CAPSULES_PER_PAGE)
              )}
              totalItems={timeCapsules.length}
              pageSize={CAPSULES_PER_PAGE}
              onPageChange={setCapsulePage}
              itemLabel="kapsul waktu"
            />
          </div>

          {/* Form Buat Kapsul Waktu */}
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-5 h-fit">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Segel Kapsul Waktu Baru
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tulis pesan untuk dirimu di masa depan atau untuk reuni kelas XII
              PPLG 1.
            </p>

            <form onSubmit={submitCapsuleForm} className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="cap-author"
                  className="block text-xs font-semibold text-foreground"
                >
                  Nama Pengirim
                </label>
                <input
                  id="cap-author"
                  type="text"
                  required
                  value={capAuthor}
                  onChange={(e) => setCapAuthor(e.target.value)}
                  placeholder="Mis. Hanan Al-Ghifari"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="cap-rec"
                  className="block text-xs font-semibold text-foreground"
                >
                  Ditujukan Untuk
                </label>
                <input
                  id="cap-rec"
                  type="text"
                  required
                  value={capRecipient}
                  onChange={(e) => setCapRecipient(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="cap-date"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Tanggal Buka Segel
                  </label>
                  <input
                    id="cap-date"
                    type="date"
                    required
                    value={capUnlockAt}
                    onChange={(e) => setCapUnlockAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cap-code"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Kode Kelas
                  </label>
                  <input
                    id="cap-code"
                    type="text"
                    required
                    value={capCode}
                    onChange={(e) => setCapCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cap-msg"
                  className="block text-xs font-semibold text-foreground"
                >
                  Isi Surat Masa Depan
                </label>
                <textarea
                  id="cap-msg"
                  required
                  minLength={5}
                  maxLength={600}
                  rows={4}
                  value={capMessage}
                  onChange={(e) => setCapMessage(e.target.value)}
                  placeholder="Tuliskan pesan rahasia yang baru boleh dibaca saat tanggal buka tiba..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-hand text-xl text-foreground"
                />
              </div>

              {capFeedback && (
                <p
                  role="status"
                  className="rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground"
                >
                  {capFeedback}
                </p>
              )}

              <button
                type="submit"
                disabled={capSubmitting}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2.5 text-xs font-semibold text-[#fbf6ec] hover:opacity-90 disabled:opacity-50"
              >
                <Lock className="size-3.5" />
                <span>
                  {capSubmitting ? "Menyegel..." : "Segel Kapsul Waktu"}
                </span>
              </button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 3: WALL OF THANKS */}
      {activeTab === "thanks" && (
        <section aria-label="Wall of Thanks XII PPLG 1" className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7 h-fit">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {thanksList
                .slice(
                  (thanksPage - 1) * THANKS_PER_PAGE,
                  thanksPage * THANKS_PER_PAGE
                )
                .map((th, idx) => (
                  <motion.article
                    key={th.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    whileHover={{ y: -2 }}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Kepada:{" "}
                        <strong className="font-semibold text-foreground">
                          {th.to_name}
                        </strong>
                      </p>
                      <p className="mt-3 font-hand text-2xl leading-snug text-foreground">
                        &ldquo;{th.message}&rdquo;
                      </p>
                    </div>
                    <p className="mt-4 border-t border-dashed border-border pt-2.5 text-right text-xs font-semibold text-[var(--color-accent-warm)]">
                      — Dari {th.from_name}
                    </p>
                  </motion.article>
                ))}
            </div>

            <PaginationBar
              currentPage={thanksPage}
              totalPages={Math.max(
                1,
                Math.ceil(thanksList.length / THANKS_PER_PAGE)
              )}
              totalItems={thanksList.length}
              pageSize={THANKS_PER_PAGE}
              onPageChange={setThanksPage}
              itemLabel="ucapan terima kasih"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-5 h-fit">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Kirim Ucapan Terima Kasih
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Untuk sahabat, guru, wali kelas (Ibu Hajra, S.Pd.), penjaga madrasah, atau siapa saja
              yang pernah membuat harimu di MAKN Ende lebih ringan.
            </p>

            <form onSubmit={submitThanksForm} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="th-from"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Dari Siapa
                  </label>
                  <input
                    id="th-from"
                    type="text"
                    required
                    value={thFrom}
                    onChange={(e) => setThFrom(e.target.value)}
                    placeholder="Mis. Anak Bangku Belakang"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="th-to"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Untuk Siapa
                  </label>
                  <input
                    id="th-to"
                    type="text"
                    required
                    value={thTo}
                    onChange={(e) => setThTo(e.target.value)}
                    placeholder="Mis. Ibu Hajra, S.Pd. / Aisyah"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="th-msg"
                  className="block text-xs font-semibold text-foreground"
                >
                  Ucapan Terima Kasih
                </label>
                <textarea
                  id="th-msg"
                  required
                  minLength={4}
                  maxLength={320}
                  rows={3}
                  value={thMessage}
                  onChange={(e) => setThMessage(e.target.value)}
                  placeholder="Terima kasih sudah..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-hand text-xl text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="th-code"
                  className="block text-xs font-semibold text-foreground"
                >
                  Kode Kelas
                </label>
                <input
                  id="th-code"
                  type="text"
                  required
                  value={thCode}
                  onChange={(e) => setThCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                />
              </div>

              {thFeedback && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-warm)]" />
                  <span>{thFeedback}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={thSubmitting}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2.5 text-xs font-semibold text-[#fbf6ec] hover:opacity-90 disabled:opacity-50"
              >
                <Heart className="size-3.5" />
                <span>
                  {thSubmitting ? "Mengirim..." : "Tempel ke Wall of Thanks"}
                </span>
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
