"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
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
  Camera,
  Box,
} from "lucide-react";
import { useVisualTier } from "@/lib/visual-tier";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { MonochromeShimmer, SplitLineHeading } from "@/components/ui/motion-primitives";
import { useEditorialToast } from "@/components/ui/editorial-toast";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion-tokens";
import { FAREWELL_MEME_STICKERS } from "@/lib/procedural-textures";
import { studentToLanyardMember } from "@/lib/domain-logic";
import { usePageFlipSound } from "@/lib/page-flip-audio";
import {
  useLivePublicData,
  notifyPublicDataUpdated,
} from "@/lib/use-public-data";
import type { BookSpread } from "@/components/kenangan/buku-scene-hd";
import type {
  MemoryEntryRow,
  MomentRow,
  StudentRow,
  ThanksRow,
  TimeCapsuleRow,
} from "@/lib/types";

const BukuKenanganSceneHD = dynamic(
  () =>
    import("@/components/kenangan/buku-scene-hd").then(
      (mod) => mod.BukuKenanganSceneHD
    ),
  {
    ssr: false,
    loading: () => (
      <div
        data-dynamic-loading="true"
        aria-hidden="true"
        className="flex h-[500px] sm:h-[580px] lg:h-[650px] w-full items-center justify-center rounded-xl border border-border bg-[#161614] p-4"
      >
        <MonochromeShimmer className="h-[380px] w-full max-w-2xl rounded-xl" />
      </div>
    ),
  }
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
      className={`inline-flex max-w-[275px] items-center gap-2.5 rounded-2xl border-2 p-2.5 shadow-[0_6px_16px_rgba(20,20,19,0.16),0_0_0_5px_#F3F1EA] select-none ${className}`}
    >
      <div
        style={{ borderColor: meme.accent }}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 bg-[#F3F1EA] text-[#1B1B1A] shadow-2xs"
      >
        {meme.icon === "coffee" || meme.icon === "reuni" ? (
          <Coffee className="size-5 text-[#2A2A28]" />
        ) : meme.icon === "git-bye" || meme.icon === "ctrl-s" || meme.icon === "bug" ? (
          <Terminal className="size-5 text-[#2A2A28]" />
        ) : (
          <Smile className="size-5 text-[#2A2A28]" />
        )}
      </div>
      <div className="min-w-0 text-left leading-tight">
        <span
          style={{ backgroundColor: meme.accent }}
          className="inline-block rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#F3F1EA]"
        >
          ★ {meme.badge} ★
        </span>
        <p className="mt-1 font-serif text-xs sm:text-sm font-bold leading-snug">
          {meme.topText}
        </p>
        <p
          style={{ color: meme.accent }}
          className="mt-0.5 font-sans text-[11px] sm:text-xs font-semibold leading-snug"
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
  moments: initialMoments = [],
}: {
  students: StudentRow[];
  memoryEntries: MemoryEntryRow[];
  timeCapsules: TimeCapsuleRow[];
  thanksList: ThanksRow[];
  moments?: MomentRow[];
}) {
  const { data: liveData, refresh } = useLivePublicData({
    students: initialStudents,
    memoryEntries: initialMemoryEntries,
    timeCapsules: initialTimeCapsules,
    thanksList: initialThanksList,
    moments: initialMoments,
  });
  const students = liveData?.students ?? initialStudents;
  const memoryEntries = liveData?.memoryEntries ?? initialMemoryEntries;
  const timeCapsules = liveData?.timeCapsules ?? initialTimeCapsules;
  const thanksList = liveData?.thanksList ?? initialThanksList;
  const moments = liveData?.moments ?? initialMoments;

  const { playPageFlip } = usePageFlipSound();
  const { tier, setManualTier, isClientReady } = useVisualTier();
  const { pushToast } = useEditorialToast();
  const [activeTab, setActiveTab] = React.useState<KenanganTab>("buku");
  // Buku Kenangan dimulai dalam keadaan TERTUTUP (sampul depan XII PPLG 1 + 1 Foto Bersama) baik 3D maupun 2D
  const [isBookOpen, setIsBookOpen] = React.useState(false);
  const [spreadIndex, setSpreadIndex] = React.useState(0);
  const [flipDirection, setFlipDirection] = React.useState<1 | -1>(1);
  // Override lokal agar pengguna dapat menekan "Aktifkan 3D" langsung di buku
  const [bookForce3D, setBookForce3D] = React.useState<boolean | null>(null);
  const [webglBookFailed, setWebglBookFailed] = React.useState(false);
  const [cssBookTilt, setCssBookTilt] = React.useState<{
    rx: number;
    ry: number;
  }>({ rx: 6, ry: 0 });
  const touchSwipeStartRef = React.useRef<number | null>(null);

  // Sync local override when global navbar 3D button is toggled
  const prevTierRef = React.useRef(tier);
  React.useEffect(() => {
    if (prevTierRef.current !== tier) {
      prevTierRef.current = tier;
      setBookForce3D(null);
    }
  }, [tier]);

  const is3DRigDesired = React.useMemo(() => {
    if (!isClientReady) return false;
    if (bookForce3D !== null) return bookForce3D;
    return tier === "hd";
  }, [isClientReady, bookForce3D, tier]);

  const is3DBookActive = is3DRigDesired && !webglBookFailed;

  const navigateSpread = React.useCallback(
    (nextIndex: number) => {
      setSpreadIndex((prev) => {
        const clamped = Math.max(0, Math.min(Math.max(0, students.length + 2), nextIndex));
        if (clamped !== prev) {
          setFlipDirection(clamped > prev ? 1 : -1);
          playPageFlip();
        }
        return clamped;
      });
    },
    [playPageFlip, students.length]
  );

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

  // 1 Foto Bersama untuk Sampul Depan Buku Kenangan (Prioritas: Kategori "Foto Sampul Buku" -> "Foto Bersama Kelas" -> Foto Upload Asli non-Hero/non-ID Card)
  const coverPhotoMoment = React.useMemo(() => {
    const isIdCardPortrait = (cat: string) =>
      cat === "ID Card Siswa" || cat === "ID Card Sahabat Istimewa";
    return (
      moments.find((m) => m.category === "Foto Sampul Buku") ||
      moments.find((m) => m.category === "Foto Bersama Kelas") ||
      moments.find(
        (m) =>
          m.category !== "Foto Hero 3D" &&
          !isIdCardPortrait(m.category) &&
          m.image_url &&
          !m.image_url.startsWith("/api/moment-illustration")
      ) ||
      moments.find(
        (m) => m.category !== "Foto Hero 3D" && !isIdCardPortrait(m.category)
      ) ||
      moments[0]
    );
  }, [moments]);

  // Koleksi Foto Bersama untuk 2 Spread (4 Halaman) pertama setelah sampul dibuka, sebelum Daftar Isi
  const groupPhotoPagesData = React.useMemo(() => {
    const isIdCardPortrait = (cat: string) =>
      cat === "ID Card Siswa" || cat === "ID Card Sahabat Istimewa";
    const prioritized = [
      ...moments.filter((m) => m.category === "Foto Bersama Kelas"),
      ...moments.filter((m) => m.category === "Foto Sampul Buku"),
      ...moments.filter(
        (m) =>
          m.category !== "Foto Bersama Kelas" &&
          m.category !== "Foto Sampul Buku" &&
          m.category !== "Foto Hero 3D" &&
          !isIdCardPortrait(m.category) &&
          m.image_url &&
          !m.image_url.startsWith("/api/moment-illustration")
      ),
      ...moments.filter(
        (m) =>
          m.category !== "Foto Bersama Kelas" &&
          m.category !== "Foto Sampul Buku" &&
          m.category !== "Foto Hero 3D" &&
          !isIdCardPortrait(m.category) &&
          (!m.image_url || m.image_url.startsWith("/api/moment-illustration"))
      ),
    ];

    const fallbackList = [
      {
        title: "Kebersamaan Keluarga Besar XII PPLG 1",
        category: "Kebersamaan Keluarga Besar XII PPLG 1",
        caption:
          "Dari hari pertama orientasi sampai sidang proyek akhir, selalu kompak satu frekuensi di MAKN Ende.",
        dateLabel: "2024 — 2027",
        dateStr: "2024 — 2027",
        imageUrl: coverPhotoMoment?.image_url || "",
        uploaderName: "XII PPLG 1",
        seed: 101,
      },
      {
        title: "Momen Laboratorium & Begadang Koding",
        category: "Momen Laboratorium & Begadang Koding",
        caption:
          "Suasana lab rekayasa perangkat lunak saat mengejar deadline aplikasi dan merayakan deploy sukses bersama.",
        dateLabel: "Kelas XI & XII",
        dateStr: "Kelas XI & XII",
        imageUrl: prioritized[1]?.image_url || coverPhotoMoment?.image_url || "",
        uploaderName: "XII PPLG 1",
        seed: 202,
      },
      {
        title: "Tawa & Cerita di Asrama MAKN Ende",
        category: "Tawa & Cerita di Asrama MAKN Ende",
        caption:
          "Kenangan apel pagi, belajar malam bersama, hingga berbagi kopi hangat sebelum ujian dimulai.",
        dateLabel: "Asrama Ende",
        dateStr: "Asrama Ende",
        imageUrl: prioritized[2]?.image_url || coverPhotoMoment?.image_url || "",
        uploaderName: "XII PPLG 1",
        seed: 303,
      },
      {
        title: "Langkah Menuju Masa Depan UNO PPLG 1",
        category: "Langkah Menuju Masa Depan UNO PPLG 1",
        caption:
          "Doa dan janji untuk kembali berkumpul membawa cerita sukses masing-masing di hari reuni nanti.",
        dateLabel: "Angkatan 2024–2027",
        dateStr: "Angkatan 2024–2027",
        imageUrl: prioritized[3]?.image_url || coverPhotoMoment?.image_url || "",
        uploaderName: "XII PPLG 1",
        seed: 404,
      },
    ];

    const mapped = prioritized.map((m, idx) => ({
      title: m.category || `Kenangan Kelas ${m.phase}`,
      category: m.category || `Kenangan Kelas ${m.phase}`,
      caption: m.caption,
      dateLabel: m.taken_at || `Kelas ${m.phase}`,
      dateStr: m.taken_at || `Kelas ${m.phase}`,
      imageUrl: m.image_url,
      uploaderName: m.uploader_name,
      seed: 110 + idx * 37,
    }));

    while (mapped.length < 8) {
      mapped.push(fallbackList[mapped.length % fallbackList.length]!);
    }

    return mapped.slice(0, 8);
  }, [moments, coverPhotoMoment]);

  // Susun Spread Buku Kenangan:
  // Spread 0 (Hal 1-2) = Foto Bersama Bagian I
  // Spread 1 (Hal 3-4) = Foto Bersama Bagian II
  // Spread 2 (Hal 5-6) = Daftar Isi Buku Kenangan
  // Spread 3..N (Hal 7+) = Halaman Kenangan Setiap Siswa (Foto dari ID Card)
  const TOC_SPREAD_INDEX = 2;
  const FIRST_STUDENT_SPREAD_INDEX = 3;

  const spreads: BookSpread[] = React.useMemo(() => {
    const result: BookSpread[] = [];

    // Spread 0: Halaman 1 & 2 — Album Foto Bersama Bagian I
    result.push({
      spreadIndex: 0,
      leftPage: {
        type: "group-photo",
        pageNumber: 1,
        groupTitle: "Foto Bersama XII PPLG 1 — Lembar I",
        groupSubtitle:
          "Kenangan kebersamaan satu angkatan dari awal melangkah hingga perpisahan.",
        groupPhotos: groupPhotoPagesData.slice(0, 2),
        decorSeed: 51,
      },
      rightPage: {
        type: "group-photo",
        pageNumber: 2,
        groupTitle: "Foto Bersama XII PPLG 1 — Lembar II",
        groupSubtitle:
          "Setiap senyum, perjuangan di lab, dan cerita hangat di MAKN Ende.",
        groupPhotos: groupPhotoPagesData.slice(2, 4),
        decorSeed: 73,
      },
    });

    // Spread 1: Halaman 3 & 4 — Album Foto Bersama Bagian II
    result.push({
      spreadIndex: 1,
      leftPage: {
        type: "group-photo",
        pageNumber: 3,
        groupTitle: "Foto Bersama XII PPLG 1 — Lembar III",
        groupSubtitle:
          "Jejak kebersamaan di kelas, asrama, dan kegiatan ekstrakurikuler.",
        groupPhotos: groupPhotoPagesData.slice(4, 6),
        decorSeed: 89,
      },
      rightPage: {
        type: "group-photo",
        pageNumber: 4,
        groupTitle: "Foto Bersama XII PPLG 1 — Lembar IV",
        groupSubtitle:
          "Satu keluarga UNO XII PPLG 1 yang tak lekang oleh waktu.",
        groupPhotos: groupPhotoPagesData.slice(6, 8),
        decorSeed: 107,
      },
    });

    // Spread 2: Halaman 5 & 6 — Daftar Isi Buku Kenangan
    const tocEntries = students.map((s, idx) => ({
      name: s.full_name,
      spreadIndex: idx + FIRST_STUDENT_SPREAD_INDEX,
    }));
    const halfToc = Math.ceil(tocEntries.length / 2);

    result.push({
      spreadIndex: TOC_SPREAD_INDEX,
      leftPage: {
        type: "toc",
        pageNumber: 5,
        tocEntries: tocEntries.slice(0, halfToc),
        decorSeed: 101,
      },
      rightPage: {
        type: "toc",
        pageNumber: 6,
        tocEntries: tocEntries.slice(halfToc),
        decorSeed: 202,
      },
    });

    // Spread 3..N: Halaman Kenangan Setiap Siswa (Foto langsung dari ID Card!)
    students.forEach((stu, idx) => {
      const stuMemories = memoryEntries
        .filter((m) => m.student_id === stu.id)
        .map((m) => ({
          author: m.author_name,
          text: m.message,
          seed: m.decor_seed,
        }));

      // Gunakan foto yang sama persis dengan ID Card 3D & 2D siswa
      const idCardMember = studentToLanyardMember(stu, idx);
      const sIdx = idx + FIRST_STUDENT_SPREAD_INDEX;

      result.push({
        spreadIndex: sIdx,
        leftPage: {
          type: "student-left",
          pageNumber: sIdx * 2 + 1,
          studentName: stu.full_name,
          studentNickname: stu.nickname,
          studentRole: stu.is_active
            ? `Peminatan ${stu.tags[0] || "PPLG"}`
            : "Sahabat Istimewa Selamanya",
          studentBio: stu.bio,
          studentTags: stu.tags,
          studentPhotoUrl: idCardMember.image || stu.photo_url,
          showPhoto: stu.show_photo,
          decorSeed: 300 + idx * 19,
        },
        rightPage: {
          type: "student-right",
          pageNumber: sIdx * 2 + 2,
          studentName: stu.full_name,
          studentNickname: stu.nickname,
          messages: stuMemories,
          decorSeed: 400 + idx * 29,
        },
      });
    });

    return result;
  }, [students, memoryEntries, groupPhotoPagesData]);

  const currentSpread = spreads[spreadIndex] ?? spreads[0]!;

  // Navigasi Keyboard Penuh untuk Buku Kenangan (ArrowLeft/Right, Space, PageUp/Down, Home/End)
  React.useEffect(() => {
    if (activeTab !== "buku") return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        if (!isBookOpen) {
          playPageFlip();
          setIsBookOpen(true);
        } else {
          navigateSpread(Math.min(spreads.length - 1, spreadIndex + 1));
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if (isBookOpen) {
          navigateSpread(Math.max(0, spreadIndex - 1));
        }
      } else if (e.key === " ") {
        e.preventDefault();
        if (!isBookOpen) {
          playPageFlip();
          setIsBookOpen(true);
        } else {
          navigateSpread(Math.min(spreads.length - 1, spreadIndex + 1));
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        setIsBookOpen(true);
        navigateSpread(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setIsBookOpen(true);
        navigateSpread(spreads.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, isBookOpen, spreads.length, spreadIndex, navigateSpread, playPageFlip]);

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
      const feedbackMsg = json.ok
        ? json.message
        : json.error || "Gagal mengirim catatan Buku Kenangan.";
      setMemFeedback(feedbackMsg);
      pushToast(feedbackMsg, json.ok ? "success" : "error");
      if (json.ok) {
        setMemMessage("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setMemFeedback("Gagal menghubungi server.");
      pushToast("Gagal menghubungi server.", "error");
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
      const feedbackMsg = json.ok
        ? json.message
        : json.error || "Gagal menyegel kapsul waktu.";
      setCapFeedback(feedbackMsg);
      pushToast(feedbackMsg, json.ok ? "success" : "error");
      if (json.ok) {
        setCapMessage("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setCapFeedback("Gagal menghubungi server.");
      pushToast("Gagal menghubungi server.", "error");
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
      const feedbackMsg = json.ok
        ? json.message
        : json.error || "Gagal mengirim ucapan.";
      setThFeedback(feedbackMsg);
      pushToast(feedbackMsg, json.ok ? "success" : "error");
      if (json.ok) {
        setThMessage("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setThFeedback("Gagal menghubungi server.");
      pushToast("Gagal menghubungi server.", "error");
    } finally {
      setThSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header Halaman Kenangan Ringkas */}
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Ruang Memori &amp; Surat Masa Depan · UNO XII PPLG 1
        </p>
        <SplitLineHeading
          as="h1"
          className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]"
        >
          Buku Kenangan, Kapsul Waktu &amp; Apresiasi
        </SplitLineHeading>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          Album foto bersama, catatan tulisan tangan tiap siswa, dan surat masa depan.
        </p>
      </header>

      {/* Tiga Tab: Buku Kenangan, Kapsul Waktu, Wall of Thanks */}
      <div
        role="tablist"
        aria-label="Menu Ruang Kenangan"
        className="no-scrollbar mx-auto mt-6 flex max-w-xl flex-nowrap items-center justify-start gap-1.5 overflow-x-auto rounded-xl border border-border bg-card p-1.5 sm:flex-wrap sm:justify-center"
      >
        <motion.button
          role="tab"
          type="button"
          whileHover={{ y: -1.5 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 24 }}
          aria-selected={activeTab === "buku"}
          onClick={() => setActiveTab("buku")}
          className={`relative inline-flex min-h-[42px] sm:flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3.5 sm:px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "buku"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {activeTab === "buku" && (
            <motion.span
              layoutId="kenangan-tab-pill"
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="absolute inset-0 rounded-lg bg-primary shadow-sm"
              aria-hidden="true"
            />
          )}
          <span className="relative z-10 inline-flex items-center gap-1.5 sm:gap-2">
            <BookOpen className="size-4" />
            <span>Buku Kenangan</span>
          </span>
        </motion.button>

        <motion.button
          role="tab"
          type="button"
          whileHover={{ y: -1.5 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 24 }}
          aria-selected={activeTab === "kapsul"}
          onClick={() => setActiveTab("kapsul")}
          className={`relative inline-flex min-h-[42px] sm:flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3.5 sm:px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "kapsul"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {activeTab === "kapsul" && (
            <motion.span
              layoutId="kenangan-tab-pill"
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="absolute inset-0 rounded-lg bg-primary shadow-sm"
              aria-hidden="true"
            />
          )}
          <span className="relative z-10 inline-flex items-center gap-1.5 sm:gap-2">
            <Clock className="size-4" />
            <span>Kapsul Waktu ({timeCapsules.length})</span>
          </span>
        </motion.button>

        <motion.button
          role="tab"
          type="button"
          whileHover={{ y: -1.5 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 24 }}
          aria-selected={activeTab === "thanks"}
          onClick={() => setActiveTab("thanks")}
          className={`relative inline-flex min-h-[42px] sm:flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3.5 sm:px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "thanks"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {activeTab === "thanks" && (
            <motion.span
              layoutId="kenangan-tab-pill"
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="absolute inset-0 rounded-lg bg-primary shadow-sm"
              aria-hidden="true"
            />
          )}
          <span className="relative z-10 inline-flex items-center gap-1.5 sm:gap-2">
            <Heart className="size-4" />
            <span>Wall of Thanks ({thanksList.length})</span>
          </span>
        </motion.button>
      </div>

      {/* TAB 1: BUKU KENANGAN */}
      {activeTab === "buku" && (
        <section aria-label="Buku Kenangan XII PPLG 1" className="mt-8 space-y-8">
          {/* Teks alternatif tersembunyi (sr-only) berisi pesan pada spread aktif untuk pembaca layar */}
          <div className="sr-only" aria-live="polite">
            {!isBookOpen ? (
              <p>Sampul Buku Kenangan XII PPLG 1 tertutup. Klik untuk membuka.</p>
            ) : currentSpread.leftPage.type === "group-photo" ? (
              <p>{currentSpread.leftPage.groupTitle}</p>
            ) : currentSpread.leftPage.type === "toc" ? (
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
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:gap-2.5 sm:pb-0">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsBookOpen((prev) => !prev)}
                className="inline-flex min-h-[40px] sm:min-h-[44px] shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg bg-primary px-3.5 sm:px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 whitespace-nowrap"
              >
                <BookOpen className="size-4" />
                <span>
                  {isBookOpen ? "Tutup Sampul" : "Buka Sampul"}
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
                className={`inline-flex min-h-[40px] sm:min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border px-3 sm:px-3.5 py-2 text-xs font-semibold whitespace-nowrap ${
                  isBookOpen && (spreadIndex === 0 || spreadIndex === 1)
                    ? "border-foreground/50 bg-muted text-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                <Camera className="size-4 text-foreground" />
                <span>Foto Bersama (Hal. 1–4)</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setIsBookOpen(true);
                  navigateSpread(TOC_SPREAD_INDEX);
                }}
                className={`inline-flex min-h-[40px] sm:min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border px-3 sm:px-3.5 py-2 text-xs font-semibold whitespace-nowrap ${
                  isBookOpen && spreadIndex === TOC_SPREAD_INDEX
                    ? "border-foreground/50 bg-muted text-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                <List className="size-4 text-foreground" />
                <span>Daftar Isi (Hal. 5–6)</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  const next3D = !is3DRigDesired;
                  setBookForce3D(next3D);
                  setManualTier(next3D ? "hd" : "simple");
                }}
                aria-pressed={is3DRigDesired}
                className={`inline-flex min-h-[40px] sm:min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border px-3 sm:px-3.5 py-2 font-mono text-xs font-semibold whitespace-nowrap transition-colors ${
                  is3DRigDesired
                    ? "border-foreground/50 bg-secondary text-foreground hover:bg-muted"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                <Box className="size-3.5 text-foreground" />
                <span>{is3DRigDesired ? "Mode 2D Ringan" : "Aktifkan 3D"}</span>
              </motion.button>
            </div>

            <div className="flex w-full items-center gap-1.5 sm:gap-2 lg:w-auto">
              <label htmlFor="jump-student" className="sr-only">
                Loncat ke halaman buku
              </label>
              <select
                id="jump-student"
                value={spreadIndex}
                onChange={(e) => {
                  setIsBookOpen(true);
                  setSpreadIndex(Number(e.target.value));
                }}
                className="min-h-[40px] sm:min-h-[44px] min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 sm:px-3 py-2 text-xs font-medium text-foreground lg:flex-initial"
              >
                <option value={0}>Hal. 1–2 · Foto Bersama Bagian I</option>
                <option value={1}>Hal. 3–4 · Foto Bersama Bagian II</option>
                <option value={TOC_SPREAD_INDEX}>Hal. 5–6 · Daftar Isi Buku</option>
                {students.map((s, idx) => (
                  <option key={s.id} value={idx + FIRST_STUDENT_SPREAD_INDEX}>
                    {String(idx + 1).padStart(2, "0")}. {s.full_name}
                  </option>
                ))}
              </select>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                aria-label="Halaman sebelumnya"
                disabled={isBookOpen && spreadIndex <= 0}
                onClick={() => {
                  if (!isBookOpen) {
                    playPageFlip();
                    setIsBookOpen(true);
                  } else {
                    navigateSpread(Math.max(0, spreadIndex - 1));
                  }
                }}
                className="inline-flex min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="size-5" />
              </motion.button>

              <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-muted-foreground px-1">
                {!isBookOpen ? "Sampul" : `Hal. ${currentSpread.leftPage.pageNumber}–${currentSpread.rightPage.pageNumber}`}
              </span>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                aria-label="Halaman berikutnya"
                disabled={isBookOpen && spreadIndex >= spreads.length - 1}
                onClick={() => {
                  if (!isBookOpen) {
                    playPageFlip();
                    setIsBookOpen(true);
                  } else {
                    navigateSpread(Math.min(spreads.length - 1, spreadIndex + 1));
                  }
                }}
                className="inline-flex min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="size-5" />
              </motion.button>
            </div>
          </div>

          {/* Buku Kenangan: 3D Vertex-Shader Book-Flip di Desktop/Opt-In, atau CSS 3D Hardcover Perspective / 2D Lipatan Kertas Lengkung Halus */}
          {is3DBookActive ? (
            <BukuKenanganSceneHD
              spreads={spreads}
              isBookOpen={isBookOpen}
              activeSpreadIndex={spreadIndex}
              onWebglUnavailable={() => setWebglBookFailed(true)}
              coverPhotoUrl={coverPhotoMoment?.image_url}
              coverCaption={
                coverPhotoMoment?.caption ||
                "Keluarga Besar XII PPLG 1 — Satu Kenangan Selamanya"
              }
              onOpenBook={() => {
                playPageFlip();
                setIsBookOpen(true);
              }}
              onChangeSpread={(next) => {
                navigateSpread(next);
              }}
            />
          ) : (
            <div
              onPointerMove={(e) => {
                if (!is3DRigDesired) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
                setCssBookTilt({ rx: 7 - ny * 4.5, ry: nx * 6 });
              }}
              onPointerLeave={() => {
                if (is3DRigDesired) {
                  setCssBookTilt({ rx: 6, ry: 0 });
                }
              }}
              onTouchStart={(e) => {
                touchSwipeStartRef.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                const startX = touchSwipeStartRef.current;
                touchSwipeStartRef.current = null;
                if (startX === null) return;
                const endX = e.changedTouches[0]?.clientX ?? startX;
                const dx = endX - startX;
                if (Math.abs(dx) < 44) return;
                if (!isBookOpen) {
                  playPageFlip();
                  setIsBookOpen(true);
                  return;
                }
                if (dx < 0 && spreadIndex < spreads.length - 1) {
                  navigateSpread(spreadIndex + 1);
                } else if (dx > 0 && spreadIndex > 0) {
                  navigateSpread(spreadIndex - 1);
                }
              }}
              style={{
                perspective: "1800px",
                transformStyle: "preserve-3d",
                ...(is3DRigDesired
                  ? {
                      transform: `rotateX(${cssBookTilt.rx}deg) rotateY(${cssBookTilt.ry}deg)`,
                      transition: "transform 180ms ease-out",
                    }
                  : {}),
              }}
              className={`relative overflow-hidden rounded-2xl border-2 border-[#C9C4B8] bg-[#ECE9E1] text-[#1B1B1A] ${
                is3DRigDesired
                  ? "ring-4 ring-[#3D3124] shadow-[0_28px_56px_rgba(0,0,0,0.42),0_10px_0_#C9B794,0_14px_0_#2D241C]"
                  : "shadow-lg"
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {!isBookOpen ? (
                  /* Sampul Buku 2D Tertutup dengan 1 Foto Bersama XII PPLG 1 */
                  <motion.div
                    key="book-2d-cover"
                    initial={{ opacity: 0, rotateY: -12, scale: 0.98 }}
                    animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                    exit={{ opacity: 0, rotateY: -22, x: -24 }}
                    transition={{
                      duration: MOTION_DURATION.medium,
                      ease: MOTION_EASE.editorial,
                    }}
                    className="flex flex-col items-center justify-center bg-gradient-to-br from-[#3D3124] via-[#2D241C] to-[#241C15] px-4 py-8 sm:px-6 sm:py-12 text-center text-[#EFE5CE]"
                  >
                    <div className="w-full max-w-lg rounded-2xl border-2 border-[#C9B794] bg-[#2D241C]/85 p-4 sm:p-8 shadow-inner">
                      <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[#D8C7A6]">
                        Album Memori Madrasah · UNO
                      </p>
                      <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-[#F7EEDB]">
                        Kenangan XII PPLG 1
                      </h2>
                      <p className="mt-1 font-mono text-xs sm:text-sm font-semibold tracking-wider text-[#D8C7A6]">
                        MAKN Ende · Angkatan 2024 — 2027
                      </p>

                      {/* 1 Foto Bersama di Sampul Depan Buku Kenangan */}
                      <motion.div
                        whileHover={{ rotate: 0, scale: 1.02 }}
                        onClick={() => setIsBookOpen(true)}
                        style={{ transform: "rotate(-1.2deg)" }}
                        className="relative mx-auto mt-6 max-w-sm cursor-pointer rounded-xl border border-[#C9C4B8] bg-[#F3F1EA] p-3 pb-4 text-[#1B1B1A] shadow-xl"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute -top-3 left-1/2 h-5 w-24 -translate-x-1/2 -rotate-2 bg-[#C9C4B8]/85 shadow-2xs"
                        />
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-[#222220]">
                          {coverPhotoMoment?.image_url ? (
                            <img
                              src={coverPhotoMoment.image_url}
                              alt={coverPhotoMoment.caption || "Foto Bersama XII PPLG 1"}
                              referrerPolicy="no-referrer"
                              className="public-film-photo size-full object-cover"
                            />
                          ) : (
                            <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-[#2A2A28] to-[#161614] p-4 text-[#F3F1EA]">
                              <Camera className="size-8 opacity-80" />
                              <span className="mt-1 font-serif text-base font-bold">
                                Keluarga Besar XII PPLG 1
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-2.5 font-serif text-sm sm:text-base font-bold leading-snug text-[#1B1B1A]">
                          ★ {coverPhotoMoment?.caption || "Keluarga Besar XII PPLG 1 — Satu Kenangan Selamanya"} ★
                        </p>
                      </motion.div>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          playPageFlip();
                          setIsBookOpen(true);
                        }}
                        className="mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#E8E5DC] px-6 py-2.5 text-xs font-bold text-[#1B1B1A] shadow-md"
                      >
                        <BookOpen className="size-4" />
                        <span>Buka Sampul Buku Kenangan</span>
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  /* Lembar Buku 2D Terbuka dengan Animasi Lipatan Kertas & Bayangan Lengkung */
                  <motion.div
                    key={`book-2d-spread-${spreadIndex}`}
                    initial={{
                      opacity: 0.35,
                      rotateY: flipDirection === 1 ? 14 : -14,
                      x: flipDirection === 1 ? 26 : -26,
                      scale: 0.985,
                    }}
                    animate={{ opacity: 1, rotateY: 0, x: 0, scale: 1 }}
                    exit={{
                      opacity: 0.25,
                      rotateY: flipDirection === 1 ? -16 : 16,
                      x: flipDirection === 1 ? -28 : 28,
                      scale: 0.985,
                    }}
                    transition={{
                      duration: MOTION_DURATION.medium,
                      ease: MOTION_EASE.editorial,
                    }}
                    style={{ transformOrigin: "50% 50%" }}
                    className="relative grid grid-cols-1 divide-y divide-[#C9C4B8] md:grid-cols-2 md:divide-x md:divide-y-0"
                  >
                    {/* Bayangan lipatan tengah buku (gutter fold shadow) */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-12 -translate-x-1/2 md:block"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(24,20,16,0) 0%, rgba(24,20,16,0.12) 48%, rgba(24,20,16,0.16) 50%, rgba(24,20,16,0.09) 55%, rgba(24,20,16,0) 100%)",
                      }}
                    />
                    {/* Halaman Kiri */}
                    <div className="relative flex flex-col justify-between p-4 sm:p-8">
                      <div>
                        {/* Hiasan Washi Tape */}
                        <div
                          aria-hidden="true"
                          className="mx-auto -mt-2 sm:-mt-3 mb-4 h-6 w-32 -rotate-2 bg-[#A8A49B]/45"
                        />
                        {currentSpread.leftPage.type === "group-photo" ? (
                          <div>
                            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1B1B1A]">
                              {currentSpread.leftPage.groupTitle}
                            </h2>
                            <p className="mt-1 font-sans text-xs sm:text-sm leading-relaxed text-[#5C5A54]">
                              {currentSpread.leftPage.groupSubtitle}
                            </p>
                            <div className="mt-5 space-y-5">
                              {currentSpread.leftPage.groupPhotos?.map((gp, idx) => (
                                <motion.div
                                  key={idx}
                                  whileHover={{ rotate: 0, scale: 1.01 }}
                                  style={{
                                    transform: `rotate(${idx % 2 === 0 ? -1.4 : 1.4}deg)`,
                                  }}
                                  className="relative rounded-xl border border-[#C9C4B8] bg-[#F3F1EA] p-3 pb-4 shadow-md"
                                >
                                  <span
                                    aria-hidden="true"
                                    className="absolute -top-2.5 left-1/2 h-4 w-20 -translate-x-1/2 bg-[#A8A49B]/55"
                                  />
                                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-[#222220]">
                                    {gp.imageUrl ? (
                                      <img
                                        src={gp.imageUrl}
                                        alt={gp.category}
                                        referrerPolicy="no-referrer"
                                        className="public-film-photo size-full object-cover"
                                      />
                                    ) : null}
                                    <span className="absolute top-2 right-2 rounded bg-[#161614]/80 px-2 py-0.5 font-mono text-[10px] font-bold text-[#E8E5DC]">
                                      {gp.dateStr}
                                    </span>
                                  </div>
                                  <h3 className="mt-2.5 font-serif text-base sm:text-lg font-bold text-[#1B1B1A]">
                                    ★ {gp.category}
                                  </h3>
                                  <p className="mt-1 font-sans text-xs sm:text-sm leading-relaxed text-[#2A2A28]">
                                    {gp.caption}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ) : currentSpread.leftPage.type === "toc" ? (
                          <div>
                            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1B1B1A]">
                              Daftar Isi — Bagian I
                            </h2>
                            <p className="mt-1 font-sans text-xs sm:text-sm text-[#5C5A54]">
                              Ketuk nama sahabat untuk langsung membuka lembar kenangannya:
                            </p>
                            <ul className="mt-4 space-y-2.5">
                              {currentSpread.leftPage.tocEntries?.map(
                                (entry, idx) => {
                                  const tilt =
                                    idx % 2 === 0 ? "-rotate-1" : "rotate-1";
                                  const stuNumber =
                                    entry.spreadIndex - FIRST_STUDENT_SPREAD_INDEX + 1;
                                  return (
                                    <li key={entry.spreadIndex}>
                                      <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() =>
                                          setSpreadIndex(entry.spreadIndex)
                                        }
                                        className={`flex w-full items-center justify-between rounded-xl border border-[#C9C4B8] bg-[#F3F1EA] px-3.5 py-2.5 text-left font-sans text-sm font-semibold text-[#1B1B1A] shadow-2xs hover:bg-[#E2DED4] ${tilt}`}
                                      >
                                        <span>
                                          {String(stuNumber).padStart(2, "0")}.{" "}
                                          {entry.name}
                                        </span>
                                        <span className="font-mono text-xs font-bold text-[#5C5A54]">
                                          Hal. {entry.spreadIndex * 2 + 1} →
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
                              className="real-photo-paper photo-gloss-sheen w-48 rounded-lg p-3 pb-4 shadow-md"
                            >
                              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded bg-gradient-to-br from-[#2A2A28] to-[#161614] text-[#F3F1EA]">
                                {currentSpread.leftPage.studentPhotoUrl &&
                                currentSpread.leftPage.showPhoto !== false ? (
                                  <img
                                    src={currentSpread.leftPage.studentPhotoUrl}
                                    alt={currentSpread.leftPage.studentName || ""}
                                    referrerPolicy="no-referrer"
                                    className="public-film-photo size-full object-cover"
                                  />
                                ) : (
                                  <span className="font-serif text-3xl font-bold">
                                    {currentSpread.leftPage.studentNickname?.slice(
                                      0,
                                      2
                                    )}
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 font-serif text-base font-bold text-[#1B1B1A]">
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
                              className="mt-5 w-full max-w-md rounded-xl border-2 border-[#A8A49B] bg-[#F3F1EA] px-4 py-2.5 shadow-xs"
                            >
                              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1B1B1A]">
                                {currentSpread.leftPage.studentName}
                              </h2>
                              <p className="mt-0.5 font-sans text-xs sm:text-sm font-semibold text-[#5C5A54]">
                                {currentSpread.leftPage.studentRole}
                              </p>
                            </div>

                            {/* Kotak Bio Siswa */}
                            <div
                              style={{
                                transform: `rotate(${
                                  ((spreadIndex * 7) % 5) - 2
                                }deg) translateX(${
                                  ((spreadIndex * 11) % 8) - 4
                                }px)`,
                              }}
                              className="relative mt-5 w-full max-w-md rounded-2xl border-2 border-[#5C5A54] bg-[#F3F1EA] p-4 sm:p-5 shadow-sm"
                            >
                              <p className="font-sans text-sm sm:text-base font-medium leading-[1.65] text-[#1B1B1A]">
                                &ldquo;{currentSpread.leftPage.studentBio}&rdquo;
                              </p>
                              {currentSpread.leftPage.studentTags && (
                                <p className="mt-3 font-mono text-xs font-bold text-[#5C5A54]">
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
                        <p className="text-center font-mono text-xs font-bold text-[#5C5A54]">
                          LEMBAR {currentSpread.leftPage.pageNumber} · UNO SCRAPBOOK
                        </p>
                      </div>
                    </div>

                    {/* Halaman Kanan */}
                    <div className="relative flex flex-col justify-between p-4 sm:p-8">
                      <div>
                        <div
                          aria-hidden="true"
                          className="mx-auto -mt-2 sm:-mt-3 mb-4 h-6 w-32 rotate-2 bg-[#A8A49B]/40"
                        />
                        {currentSpread.rightPage.type === "group-photo" ? (
                          <div>
                            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1B1B1A]">
                              {currentSpread.rightPage.groupTitle}
                            </h2>
                            <p className="mt-1 font-sans text-xs sm:text-sm leading-relaxed text-[#5C5A54]">
                              {currentSpread.rightPage.groupSubtitle}
                            </p>
                            <div className="mt-5 space-y-5">
                              {currentSpread.rightPage.groupPhotos?.map((gp, idx) => (
                                <motion.div
                                  key={idx}
                                  whileHover={{ rotate: 0, scale: 1.01 }}
                                  style={{
                                    transform: `rotate(${idx % 2 === 0 ? 1.4 : -1.4}deg)`,
                                  }}
                                  className="relative rounded-xl border border-[#C9C4B8] bg-[#F3F1EA] p-3 pb-4 shadow-md"
                                >
                                  <span
                                    aria-hidden="true"
                                    className="absolute -top-2.5 left-1/2 h-4 w-20 -translate-x-1/2 bg-[#A8A49B]/55"
                                  />
                                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-[#222220]">
                                    {gp.imageUrl ? (
                                      <img
                                        src={gp.imageUrl}
                                        alt={gp.category}
                                        referrerPolicy="no-referrer"
                                        className="public-film-photo size-full object-cover"
                                      />
                                    ) : null}
                                    <span className="absolute top-2 right-2 rounded bg-[#161614]/80 px-2 py-0.5 font-mono text-[10px] font-bold text-[#E8E5DC]">
                                      {gp.dateStr}
                                    </span>
                                  </div>
                                  <h3 className="mt-2.5 font-serif text-base sm:text-lg font-bold text-[#1B1B1A]">
                                    ★ {gp.category}
                                  </h3>
                                  <p className="mt-1 font-sans text-xs sm:text-sm leading-relaxed text-[#2A2A28]">
                                    {gp.caption}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ) : currentSpread.rightPage.type === "toc" ? (
                          <div>
                            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1B1B1A]">
                              Daftar Isi — Bagian II
                            </h2>
                            <p className="mt-1 font-sans text-xs sm:text-sm text-[#5C5A54]">
                              Ketuk nama sahabat untuk langsung membuka lembar kenangannya:
                            </p>
                            <ul className="mt-4 space-y-2.5">
                              {currentSpread.rightPage.tocEntries?.map(
                                (entry, idx) => {
                                  const tilt =
                                    idx % 2 === 0 ? "rotate-1" : "-rotate-1";
                                  const stuNumber =
                                    entry.spreadIndex - FIRST_STUDENT_SPREAD_INDEX + 1;
                                  return (
                                    <li key={entry.spreadIndex}>
                                      <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() =>
                                          setSpreadIndex(entry.spreadIndex)
                                        }
                                        className={`flex w-full items-center justify-between rounded-xl border border-[#C9C4B8] bg-[#F3F1EA] px-3.5 py-2.5 text-left font-sans text-sm font-semibold text-[#1B1B1A] shadow-2xs hover:bg-[#E2DED4] ${tilt}`}
                                      >
                                        <span>
                                          {String(stuNumber).padStart(2, "0")}.{" "}
                                          {entry.name}
                                        </span>
                                        <span className="font-mono text-xs font-bold text-[#5C5A54]">
                                          Hal. {entry.spreadIndex * 2 + 1} →
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
                            <div className="inline-block -rotate-1 rounded-xl border-2 border-[#2A2A28] bg-[#F3F1EA] px-4 py-1.5 shadow-2xs">
                              <h3 className="font-serif text-base sm:text-lg font-bold text-[#1B1B1A]">
                                Surat Sahabat untuk{" "}
                                {currentSpread.rightPage.studentNickname} ♥
                              </h3>
                            </div>
                            {currentSpread.rightPage.messages &&
                            currentSpread.rightPage.messages.length > 0 ? (
                              currentSpread.rightPage.messages.map((m, idx) => {
                                const cardBgs = [
                                  "bg-[#F3F1EA] border-[#5C5A54]",
                                  "bg-[#ECE9E1] border-[#3D3D3A]",
                                  "bg-[#F3F1EA] border-[#7D7A72]",
                                  "bg-[#E2DED4] border-[#2A2A28]",
                                ];
                                const rotDeg =
                                  (((m.seed || 10) + idx * 7 + spreadIndex * 3) %
                                    5) -
                                  2;
                                const shiftPx =
                                  (((m.seed || 10) + idx * 13) % 8) - 4;

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
                                    <p className="font-sans text-[15px] leading-[1.6] font-medium text-[#1B1B1A]">
                                      &ldquo;{m.text}&rdquo;
                                    </p>
                                    <footer className="mt-2 text-right font-serif text-xs font-bold text-[#5C5A54]">
                                      — Dari: {m.author} ♥
                                    </footer>
                                  </motion.blockquote>
                                );
                              })
                            ) : (
                              <div className="rounded-2xl border-2 border-dashed border-[#A8A49B] bg-[#F3F1EA]/80 p-5 text-center">
                                <p className="font-sans text-sm text-[#5C5A54]">
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
                        <p className="text-center font-mono text-xs font-bold text-[#5C5A54]">
                          LEMBAR {currentSpread.rightPage.pageNumber} · UNO SCRAPBOOK
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Petunjuk geser di mode 2D / CSS 3D */}
              {isBookOpen && (
                <div className="flex items-center justify-between border-t border-[#C9C4B8] bg-[#E6E2D7] px-4 py-2 font-mono text-[10px] text-[#5C5A54]">
                  <span>Geser kiri/kanan untuk membalik lembar</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next3D = !is3DRigDesired;
                      setBookForce3D(next3D);
                      setManualTier(next3D ? "hd" : "simple");
                    }}
                    className="inline-flex items-center gap-1 font-bold text-[#1B1B1A] underline underline-offset-2"
                  >
                    <Box className="size-3" />
                    <span>{is3DRigDesired ? "Mode 2D Ringan" : "Aktifkan 3D"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Strip Koleksi Stiker Meme Perpisahan di Bawah Buku (Tampil di Mode 3D & 2D) */}
          <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-foreground" />
                <span className="font-serif text-sm sm:text-base font-bold text-foreground">
                  Stiker Meme Perpisahan Lembar Ini (Hal. {currentSpread.leftPage.pageNumber} &ndash; {currentSpread.rightPage.pageNumber})
                </span>
              </div>
              <span className="font-sans text-xs text-muted-foreground">
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
                    const targetSpread = idx + FIRST_STUDENT_SPREAD_INDEX;
                    const isCurrent = isBookOpen && spreadIndex === targetSpread;
                    return (
                      <motion.button
                        key={s.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setIsBookOpen(true);
                          setSpreadIndex(targetSpread);
                        }}
                        className={`flex min-h-[42px] items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                          isCurrent
                            ? "border-foreground/50 bg-muted text-foreground font-semibold"
                            : "border-border/60 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        <span className="truncate">
                          {String(idx + 1).padStart(2, "0")}. {s.full_name}
                        </span>
                        <span className="ml-2 shrink-0 font-mono text-[11px] text-foreground">
                          Hal. {targetSpread * 2 + 1}
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
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm leading-relaxed text-foreground"
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
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
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
                                <Unlock className="size-3.5 text-foreground" />
                                <span>Sudah Terbuka</span>
                              </>
                            ) : (
                              <>
                                <Lock className="size-3.5 text-muted-foreground" />
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
                          <blockquote className="mt-4 rounded-xl border border-border bg-background p-3.5 font-sans text-sm sm:text-base leading-relaxed text-foreground">
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
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm leading-relaxed text-foreground"
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
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
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
                      <p className="mt-3 font-sans text-sm sm:text-base leading-relaxed text-foreground">
                        &ldquo;{th.message}&rdquo;
                      </p>
                    </div>
                    <p className="mt-4 border-t border-dashed border-border pt-2.5 text-right font-mono text-xs font-semibold text-muted-foreground">
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
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm leading-relaxed text-foreground"
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
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                  <span>{thFeedback}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={thSubmitting}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
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
