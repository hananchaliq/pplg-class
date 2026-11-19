"use client";

import * as React from "react";
import {
  MessageSquareHeart,
  Send,
  X,
  CheckCircle2,
  Users,
  Crown,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type LanyardMember } from "@/components/ui/team-lanyard-rail";
import { SingleIronRailLanyard } from "@/components/ui/single-iron-rail-lanyard";
import { FlatIdCardRail } from "@/components/ui/flat-id-card";
import { Adaptive } from "@/components/three/adaptive";
import { studentToLanyardMember } from "@/lib/domain-logic";
import { SITE_CONTENT } from "@/lib/content";
import {
  useLivePublicData,
  notifyPublicDataUpdated,
} from "@/lib/use-public-data";
import { MOTION_EASE, MOTION_DURATION } from "@/lib/motion-tokens";
import { SplitLineHeading } from "@/components/ui/motion-primitives";
import { useEditorialToast } from "@/components/ui/editorial-toast";
import type { StudentRow } from "@/lib/types";

type StudentFilter = "family" | "all" | "L" | "P" | "moved";

export function AnggotaClient({
  students: initialStudents,
}: {
  students: StudentRow[];
}) {
  const { data: liveData, refresh } = useLivePublicData({
    students: initialStudents,
  });
  const students = liveData?.students ?? initialStudents;

  const [filter, setFilter] = React.useState<StudentFilter>("family");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(0);
  const [flippedIndex, setFlippedIndex] = React.useState<number | null>(null);
  const [selectedMobileMember, setSelectedMobileMember] =
    React.useState<LanyardMember | null>(null);

  const { toast } = useEditorialToast();
  const [modalStudent, setModalStudent] = React.useState<LanyardMember | null>(
    null
  );

  React.useEffect(() => {
    if (!modalStudent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalStudent(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalStudent]);
  const [authorName, setAuthorName] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [classCode, setClassCode] = React.useState("XIIPPLG1");
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const activeStudents = React.useMemo(
    () => students.filter((s) => s.is_active && s.rail_group !== "moved"),
    [students]
  );

  const movedStudents = React.useMemo(
    () => students.filter((s) => !s.is_active || s.rail_group === "moved"),
    [students]
  );

  const maleStudentsCount = React.useMemo(
    () => activeStudents.filter((s) => s.gender === "L").length,
    [activeStudents]
  );

  const femaleStudentsCount = React.useMemo(
    () => activeStudents.filter((s) => s.gender === "P").length,
    [activeStudents]
  );

  // Semua kartu berada pada 1 gagang besi tunggal yang dapat digeser ke kiri/kanan.
  // Pada mode "family" (default), sahabat istimewa tampil di barisan depan dengan ID Card Emas Bermahkota.
  const railMembers = React.useMemo(() => {
    const filtered =
      filter === "family"
        ? [...movedStudents, ...activeStudents]
        : filter === "all"
          ? activeStudents
          : filter === "moved"
            ? movedStudents
            : activeStudents.filter((s) => s.gender === filter);
    return filtered.map((s, idx) => studentToLanyardMember(s, idx));
  }, [activeStudents, movedStudents, filter]);

  React.useEffect(() => {
    setActiveIndex(0);
    setFlippedIndex(null);
    setSelectedMobileMember(railMembers[0] ?? null);
  }, [railMembers]);

  const selectedDesktopMember =
    (flippedIndex !== null ? railMembers[flippedIndex] : null) ??
    (activeIndex !== null ? railMembers[activeIndex] : null) ??
    railMembers[0] ??
    null;

  const renderMessageButton = (targetMember: LanyardMember | null) => {
    if (!targetMember) return null;
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={() => {
          setModalStudent(targetMember);
          setFeedback(null);
        }}
        className="inline-flex min-h-[40px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <MessageSquareHeart className="size-4 shrink-0" />
        <span className="truncate">Tulis pesan untuk {targetMember.name.split(" ")[0]}</span>
      </motion.button>
    );
  };

  const handleSendMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalStudent) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "memory",
          studentId: modalStudent.id,
          authorName,
          message,
          classCode,
          honeypot: "",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const errText = json.error || "Gagal mengirim pesan kenangan.";
        setFeedback({ ok: false, text: errText });
        toast({ title: "Gagal mengirim", description: errText, variant: "error" });
      } else {
        const okText =
          json.message ||
          "Pesan berhasil dikirim dan menunggu persetujuan admin.";
        setFeedback({ ok: true, text: okText });
        toast({ title: "Pesan terkirim", description: okText, variant: "success" });
        setMessage("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      const netText = "Jaringan sedang sibuk, silakan coba sesaat lagi.";
      setFeedback({ ok: false, text: netText });
      toast({ title: "Koneksi terputus", description: netText, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const filterTitle =
    filter === "family"
      ? `Keluarga Besar XII PPLG 1 (${students.length} Anggota)`
      : filter === "all"
        ? `Anggota Aktif (${activeStudents.length} Siswa)`
        : filter === "moved"
          ? `♛ Sahabat Istimewa — Pernah Bersama Kita (${movedStudents.length} Anggota)`
          : filter === "L"
            ? `Barisan Putra (${maleStudentsCount} Siswa)`
            : `Barisan Putri (${femaleStudentsCount} Siswi)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.medium, ease: MOTION_EASE.editorial }}
      className="mx-auto max-w-7xl px-3.5 py-6 sm:px-6 sm:py-10"
    >
      {/* Header Halaman Anggota */}
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Keluarga Besar XII PPLG 1 · MAKN Ende
        </p>
        <SplitLineHeading
          as="h1"
          className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]"
        >
          {`${activeStudents.length} Siswa Aktif & ${movedStudents.length} Sahabat Istimewa`}
        </SplitLineHeading>
        <p className="mx-auto mt-1.5 font-sans text-xs sm:text-sm leading-relaxed text-muted-foreground">
          Klik kartu untuk membalik profil, tarik untuk efek pegas, atau tulis pesan ke buku kenangannya.
        </p>
      </header>

      {/* Filter Tab untuk 1 Gagang Besi: Horizontal Swipe di Mobile, Wrap di Desktop */}
      <div
        role="tablist"
        aria-label="Filter Barisan Siswa pada Gagang Besi"
        className="no-scrollbar mx-auto mt-5 flex max-w-3xl flex-nowrap items-center justify-start gap-1.5 overflow-x-auto rounded-xl border border-border bg-card p-1.5 shadow-2xs sm:mt-6 sm:flex-wrap sm:justify-center"
      >
        {(
          [
            {
              id: "family",
              label: `Semua (${students.length})`,
              isCrown: true,
            },
            {
              id: "all",
              label: `Aktif (${activeStudents.length})`,
              isCrown: false,
            },
            {
              id: "L",
              label: `Putra (${maleStudentsCount})`,
              isCrown: false,
            },
            {
              id: "P",
              label: `Putri (${femaleStudentsCount})`,
              isCrown: false,
            },
            {
              id: "moved",
              label: `Sahabat Istimewa (${movedStudents.length})`,
              isCrown: true,
            },
          ] as const
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <motion.button
              whileHover={{ y: -1.5 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setFilter(tab.id)}
              className={`relative inline-flex min-h-[38px] shrink-0 sm:flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="anggota-filter-pill"
                  transition={MOTION_EASE.springNav}
                  className="absolute inset-0 rounded-lg bg-primary shadow-2xs"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {tab.isCrown ? (
                  <Crown className="size-3.5" />
                ) : (
                  <Users className="size-3.5" />
                )}
                <span>{tab.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Keterangan Singkat Saat Tab Sahabat Istimewa Dipilih */}
      <AnimatePresence>
        {filter === "moved" && (
          <motion.div
            key="special-friends-banner"
            data-testid="special-friends-section"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 360, damping: 24 }}
            className="mx-auto mt-4 flex max-w-2xl items-center justify-center gap-2 rounded-xl border border-foreground/35 bg-secondary px-4 py-2 text-center text-xs font-medium text-foreground shadow-xs"
          >
            <Crown className="size-4 shrink-0 text-foreground" />
            <span>
              Edisi Platinum Kehormatan untuk {movedStudents.length} sahabat yang pernah berjuang bersama di Kelas X.
            </span>
            <Sparkles className="size-3.5 shrink-0 text-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SATU GAGANG BESI UTUH (Single Iron Rail) — Tanpa Duplikasi Rail Kedua di Bawah */}
      <div className="mt-5">
        <Adaptive
          simple={
            <FlatIdCardRail
              items={railMembers}
              eyebrow={`GAGANG BESI TUNGGAL · ${railMembers.length} KARTU ID`}
              heading={filterTitle}
              caption="Klik: Balik Kartu · Panah < >: Geser"
              labels={SITE_CONTENT.lanyardLabels}
              onSelectMember={setSelectedMobileMember}
              action={renderMessageButton(
                selectedMobileMember ?? railMembers[0] ?? null
              )}
            />
          }
          hd={
            <SingleIronRailLanyard
              railKey={`single-student-rail-${filter}`}
              items={railMembers}
              eyebrow={`GAGANG BESI TUNGGAL · ${railMembers.length} KARTU ID`}
              heading={filterTitle}
              caption="Klik: Balik Kartu · Tarik: Pegas · Geser: Jelajah"
              labels={SITE_CONTENT.lanyardLabels}
              active={activeIndex}
              onActiveChange={setActiveIndex}
              flipped={flippedIndex}
              onFlippedChange={setFlippedIndex}
              action={renderMessageButton(selectedDesktopMember)}
            />
          }
        />
      </div>

      {/* Dialog Tulis Pesan ke Buku Kenangan Siswa (Bottom Sheet di Mobile) */}
      <AnimatePresence>
        {modalStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-memory-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.96, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 20 }}
              className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:rounded-2xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Titip Catatan ke Buku Kenangan
                  </p>
                  <h2
                    id="modal-memory-title"
                    className="mt-1 font-serif text-xl font-bold text-foreground"
                  >
                    Untuk {modalStudent.name}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Tutup jendela tulis pesan"
                  onClick={() => setModalStudent(null)}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSendMemory} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="mem-author"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Nama Kamu / Panggilan
                  </label>
                  <input
                    id="mem-author"
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Mis. Fauzan / Sahabat Sebangku"
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mem-text"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Pesan Kenangan (akan ditampilkan di Buku Kenangan)
                  </label>
                  <textarea
                    id="mem-text"
                    required
                    minLength={5}
                    maxLength={500}
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Tuliskan kesan, doa, atau momen paling berkesan bersama ${modalStudent.name}...`}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 font-sans text-sm leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mem-code"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Kode Kelas XII PPLG 1
                  </label>
                  <input
                    id="mem-code"
                    type="text"
                    required
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    placeholder="XIIPPLG1"
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-mono text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Kode kelas menjaga kiriman tetap bersih dari spam otomatis.
                    Semua kiriman disetujui admin sebelum tampil di Buku Kenangan.
                  </p>
                </div>

                {feedback && (
                  <div
                    role="status"
                    className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                      feedback.ok
                        ? "border-[var(--color-chart-2)] bg-[var(--color-chart-2)]/10 text-foreground"
                        : "border-[var(--color-chart-3)] bg-[var(--color-chart-3)]/10 text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setModalStudent(null)}
                    className="min-h-[44px] rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Tutup
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="size-3.5" />
                    <span>
                      {submitting ? "Mengirim..." : "Kirim ke Buku Kenangan"}
                    </span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
