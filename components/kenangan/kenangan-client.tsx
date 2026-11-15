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
} from "lucide-react";
import { Adaptive } from "@/components/three/adaptive";
import { PaginationBar } from "@/components/ui/pagination-bar";
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
          decorSeed: 300 + idx * 19,
        },
        rightPage: {
          type: "student-right",
          pageNumber: (idx + 1) * 2 + 2,
          studentName: stu.full_name,
          studentNickname: stu.nickname,
          messages:
            stuMemories.length > 0
              ? stuMemories
              : [
                  {
                    author: "Keluarga XII PPLG 1",
                    text: `Terima kasih sudah menjadi bagian dari cerita hangat kita di MAKN Ende, ${stu.nickname}!`,
                    seed: 500 + idx,
                  },
                ],
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
          Ruang Memori & Surat Masa Depan · XII PPLG 1
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
          Buku Kenangan, Kapsul Waktu & Dinding Terima Kasih
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Buka lembar demi lembar catatan tulisan tangan untuk setiap sahabat,
          segel surat yang baru terbuka di masa depan, atau gantungkan ucapan
          terima kasih sederhana.
        </p>
      </header>

      {/* Tiga Tab: Buku Kenangan, Kapsul Waktu, Wall of Thanks */}
      <div
        role="tablist"
        aria-label="Menu Ruang Kenangan"
        className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card p-1.5"
      >
        <button
          role="tab"
          type="button"
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
        </button>

        <button
          role="tab"
          type="button"
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
        </button>

        <button
          role="tab"
          type="button"
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
        </button>
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
              <button
                type="button"
                onClick={() => setIsBookOpen((prev) => !prev)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] transition-opacity hover:opacity-90 whitespace-nowrap"
              >
                <BookOpen className="size-4" />
                <span>
                  {isBookOpen ? "Tutup Sampul Buku" : "Buka Sampul Buku"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsBookOpen(true);
                  setSpreadIndex(0);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted whitespace-nowrap"
              >
                <List className="size-4 text-[var(--color-chart-1)]" />
                <span>Daftar Isi</span>
              </button>
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

              <button
                type="button"
                aria-label="Halaman sebelumnya"
                disabled={spreadIndex <= 0}
                onClick={() => {
                  setIsBookOpen(true);
                  setSpreadIndex((p) => Math.max(0, p - 1));
                }}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="size-5" />
              </button>

              <span className="font-mono text-xs tabular-nums text-muted-foreground px-1">
                {spreadIndex + 1} / {spreads.length}
              </span>

              <button
                type="button"
                aria-label="Halaman berikutnya"
                disabled={spreadIndex >= spreads.length - 1}
                onClick={() => {
                  setIsBookOpen(true);
                  setSpreadIndex((p) => Math.min(spreads.length - 1, p + 1));
                }}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          {/* Adaptive Buku Kenangan: 3D Melengkung di Desktop HD, Buku 2D Geser dengan Hiasan di Mobile Simple */}
          <Adaptive
            simple={
              <div className="overflow-hidden rounded-2xl border-2 border-[#782f24]/60 bg-[#fbf5e8] text-[#2b2118] shadow-lg">
                {!isBookOpen ? (
                  /* Sampul Buku 2D Tertutup */
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-[#63261d] via-[#782f24] to-[#521e16] px-6 py-16 text-center text-[#f3ca82]">
                    <div className="w-full max-w-md rounded-xl border-2 border-[#e0a958] p-8 shadow-inner">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ebd0a0]">
                        Album Memori Madrasah
                      </p>
                      <h2 className="mt-4 font-serif text-4xl font-bold">
                        Kenangan XII PPLG 1
                      </h2>
                      <p className="mt-2 font-serif text-lg italic text-[#ebd0a0]">
                        MAKN Ende · Flores, NTT
                      </p>
                      <p className="mt-6 font-mono text-xs text-[#ebd0a0]/80">
                        2024 — 2027
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsBookOpen(true)}
                        className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#e0a958] px-6 py-2.5 text-xs font-bold text-[#2b2118] shadow transition-transform active:scale-95"
                      >
                        <BookOpen className="size-4" />
                        <span>Buka Lembar Pertama</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Lembar Buku 2D Terbuka dengan Lipatan Tengah, Washi Tape, dan Tulisan Tangan Caveat */
                  <div className="relative grid grid-cols-1 divide-y divide-[#d8c7ae] md:grid-cols-2 md:divide-x md:divide-y-0">
                    {/* Halaman Kiri */}
                    <div className="relative p-6 sm:p-8">
                      {/* Hiasan Washi Tape */}
                      <div
                        aria-hidden="true"
                        className="mx-auto -mt-3 mb-4 h-6 w-32 -rotate-2 bg-[#c86d3b]/35"
                      />
                      {currentSpread.leftPage.type === "toc" ? (
                        <div>
                          <h2 className="font-serif text-2xl font-bold text-[#2b2118]">
                            Daftar Isi — Bagian I
                          </h2>
                          <p className="mt-1 text-xs text-[#6e5a47]">
                            Ketuk nama sahabat untuk langsung membuka halamannya:
                          </p>
                          <ul className="mt-4 space-y-2">
                            {currentSpread.leftPage.tocEntries?.map((entry) => (
                              <li key={entry.spreadIndex}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSpreadIndex(entry.spreadIndex)
                                  }
                                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-[#2b2118] hover:bg-[#ebe0cd]"
                                >
                                  <span>
                                    {String(entry.spreadIndex).padStart(2, "0")}.{" "}
                                    {entry.name}
                                  </span>
                                  <span className="font-mono text-xs text-[#a84232]">
                                    Hal. {entry.spreadIndex * 2}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center">
                          <div className="vintage-photo-frame w-44 rotate-1 rounded-lg bg-white p-3">
                            <div className="flex aspect-square items-center justify-center rounded bg-[#d9c5a9] text-[#6e5a47]">
                              <span className="font-serif text-3xl font-bold">
                                {currentSpread.leftPage.studentNickname?.slice(
                                  0,
                                  2
                                )}
                              </span>
                            </div>
                            <p className="mt-2 font-hand text-xl font-bold text-[#2b2118]">
                              {currentSpread.leftPage.studentNickname}
                            </p>
                          </div>
                          <h2 className="mt-5 font-serif text-2xl font-bold text-[#2b2118]">
                            {currentSpread.leftPage.studentName}
                          </h2>
                          <p className="mt-1 text-xs font-semibold text-[#a84232]">
                            {currentSpread.leftPage.studentRole}
                          </p>
                          <p className="mt-4 font-hand text-2xl leading-relaxed text-[#3d2f22]">
                            &ldquo;{currentSpread.leftPage.studentBio}&rdquo;
                          </p>
                          {currentSpread.leftPage.studentTags && (
                            <p className="mt-4 text-xs font-semibold text-[#2d6a6e]">
                              {currentSpread.leftPage.studentTags.join(" · ")}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="mt-6 text-center font-serif text-xs text-[#6e5a47]">
                        — {currentSpread.leftPage.pageNumber} —
                      </p>
                    </div>

                    {/* Halaman Kanan */}
                    <div className="relative p-6 sm:p-8">
                      <div
                        aria-hidden="true"
                        className="mx-auto -mt-3 mb-4 h-6 w-32 rotate-2 bg-[#2d6a6e]/30"
                      />
                      {currentSpread.rightPage.type === "toc" ? (
                        <div>
                          <h2 className="font-serif text-2xl font-bold text-[#2b2118]">
                            Daftar Isi — Bagian II
                          </h2>
                          <p className="mt-1 text-xs text-[#6e5a47]">
                            Ketuk nama sahabat untuk langsung membuka halamannya:
                          </p>
                          <ul className="mt-4 space-y-2">
                            {currentSpread.rightPage.tocEntries?.map((entry) => (
                              <li key={entry.spreadIndex}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSpreadIndex(entry.spreadIndex)
                                  }
                                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-[#2b2118] hover:bg-[#ebe0cd]"
                                >
                                  <span>
                                    {String(entry.spreadIndex).padStart(2, "0")}.{" "}
                                    {entry.name}
                                  </span>
                                  <span className="font-mono text-xs text-[#a84232]">
                                    Hal. {entry.spreadIndex * 2}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h3 className="font-serif text-base font-bold italic text-[#6e5a47]">
                            Catatan Sahabat untuk{" "}
                            {currentSpread.rightPage.studentNickname}:
                          </h3>
                          {currentSpread.rightPage.messages?.map((m, idx) => (
                            <blockquote
                              key={idx}
                              className="rounded-xl border border-[#d8c7ae] bg-[#fffaf0] p-4 shadow-sm"
                            >
                              <p className="font-hand text-2xl leading-snug text-[#2b2118]">
                                &ldquo;{m.text}&rdquo;
                              </p>
                              <footer className="mt-2 text-right text-xs font-semibold text-[#a84232]">
                                — {m.author}
                              </footer>
                            </blockquote>
                          ))}
                        </div>
                      )}
                      <p className="mt-6 text-center font-serif text-xs text-[#6e5a47]">
                        — {currentSpread.rightPage.pageNumber} —
                      </p>
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
