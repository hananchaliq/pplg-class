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

  const [specialActiveIdx, setSpecialActiveIdx] = React.useState<number | null>(
    0
  );
  const [specialFlippedIdx, setSpecialFlippedIdx] = React.useState<
    number | null
  >(null);

  const [modalStudent, setModalStudent] = React.useState<LanyardMember | null>(
    null
  );
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

  const movedRailMembers = React.useMemo(
    () => movedStudents.map((s, idx) => studentToLanyardMember(s, idx)),
    [movedStudents]
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

  const selectedSpecialMember =
    (specialFlippedIdx !== null ? movedRailMembers[specialFlippedIdx] : null) ??
    (specialActiveIdx !== null ? movedRailMembers[specialActiveIdx] : null) ??
    movedRailMembers[0] ??
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
        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] shadow-sm transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <MessageSquareHeart className="size-4" />
        <span>Tulis pesan untuk {targetMember.name.split(" ")[0]}</span>
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
        setFeedback({
          ok: false,
          text: json.error || "Gagal mengirim pesan kenangan.",
        });
      } else {
        setFeedback({
          ok: true,
          text:
            json.message ||
            "Pesan berhasil dikirim dan menunggu persetujuan admin.",
        });
        setMessage("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setFeedback({
        ok: false,
        text: "Jaringan sedang sibuk, silakan coba sesaat lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filterTitle =
    filter === "family"
      ? `Kartu ID Berwarna-warni & ${movedStudents.length} Sahabat Istimewa (${students.length} Anggota)`
      : filter === "all"
        ? `Seluruh Anggota Aktif XII PPLG 1 (${activeStudents.length} Siswa)`
        : filter === "moved"
          ? `♛ Sahabat Istimewa — Pernah Bersama Kita (${movedStudents.length} Anggota Edisi Emas)`
          : filter === "L"
            ? `Barisan Putra XII PPLG 1 (${maleStudentsCount} Siswa)`
            : `Barisan Putri XII PPLG 1 (${femaleStudentsCount} Siswi)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6"
    >
      {/* Header Halaman Anggota */}
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Keluarga Besar XII PPLG 1 · MAKN Ende
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
          {activeStudents.length} Kepala Aktif & {movedStudents.length} Sahabat Istimewa, Seribu Baris Cerita
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Semua kartu ID tergantung pada satu gagang besi utuh—klik langsung
          kartu mana saja untuk membalik (Depan/Belakang), tarik ke bawah untuk
          efek pegas, atau geser gagang besi ke samping.
        </p>
      </header>

      {/* Filter Tab untuk 1 Gagang Besi */}
      <div
        role="tablist"
        aria-label="Filter Barisan Siswa pada Gagang Besi"
        className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card p-1.5 shadow-xs"
      >
        {(
          [
            {
              id: "family",
              label: `Semua Keluarga (${students.length})`,
              isCrown: true,
            },
            {
              id: "all",
              label: `Anggota Aktif (${activeStudents.length})`,
              isCrown: false,
            },
            {
              id: "L",
              label: `Siswa Putra (${maleStudentsCount})`,
              isCrown: false,
            },
            {
              id: "P",
              label: `Siswi Putri (${femaleStudentsCount})`,
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
              whileTap={{ scale: 0.96 }}
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setFilter(tab.id)}
              className={`inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                active
                  ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.isCrown ? (
                <Crown className="size-3.5 text-amber-400" />
              ) : (
                <Users className="size-3.5" />
              )}
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* SATU GAGANG BESI UTUH (Single Iron Rail) yang Bisa Digeser & Diklik untuk Flip */}
      <div className="mt-6">
        <Adaptive
          simple={
            <FlatIdCardRail
              items={railMembers}
              eyebrow={`GAGANG BESI TUNGGAL · ${railMembers.length} KARTU ID`}
              heading={filterTitle}
              caption="Klik kartu untuk membalik (Depan/Belakang) atau ketuk panah < > untuk berpindah anggota"
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
              caption="Klik kartu ID untuk membalik (Depan/Belakang) · Geser Kiri/Kanan untuk melihat semua anggota"
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

      {/* Bagian Khusus "Pernah Bersama Kita" — Menggunakan Komponen ID Card Lanyard yang Sama (Edisi Emas Bermahkota & Untaian Bunga) */}
      <section
        aria-labelledby="pernah-bersama-heading"
        data-testid="special-friends-section"
        className="relative mt-14 overflow-hidden rounded-3xl border border-[#eab308]/50 bg-gradient-to-b from-[#241b14] via-[#1e1610] to-[#17110c] p-6 text-[#fbf6ec] shadow-xl sm:p-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#eab308]/60 bg-[#eab308]/15 px-4 py-1 text-xs font-bold text-[#fde047]">
            <Crown className="size-4 text-[#fde047]" />
            <span>PERNAH BERSAMA KITA · EDISI EMAS KEHORMATAN</span>
            <Sparkles className="size-3.5 text-[#fde047]" />
          </div>
          <h2
            id="pernah-bersama-heading"
            className="mt-3 font-serif text-2xl font-bold text-[#fbf6ec] sm:text-3xl"
          >
            Dua Sahabat Istimewa Selamanya
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#d6c7b2]">
            Menggunakan ID Card gantung yang sama dengan hiasan khusus mahkota
            emas, untaian rantai bunga, dan tali lanyard emas untuk kedua
            sahabat kita yang pernah berjuang bersama di Kelas X. Klik kartu
            untuk membalik dan membaca kisahnya.
          </p>
        </div>

        <div className="mt-6">
          <Adaptive
            simple={
              <FlatIdCardRail
                items={movedRailMembers}
                eyebrow="GAGANG BESI TUNGGAL · EDISI EMAS"
                heading="Sahabat Istimewa XII PPLG 1"
                caption="Klik kartu untuk membalik (Depan/Belakang)"
                labels={SITE_CONTENT.lanyardLabels}
                action={renderMessageButton(selectedSpecialMember)}
              />
            }
            hd={
              <SingleIronRailLanyard
                railKey="special-friends-gold-rail"
                items={movedRailMembers}
                eyebrow="GAGANG BESI TUNGGAL · KEDUANYA BERWARNA EMAS"
                heading="Sahabat Istimewa XII PPLG 1"
                caption="Klik kartu untuk membalik (Depan/Belakang) atau tarik ke bawah untuk efek pegas"
                labels={SITE_CONTENT.lanyardLabels}
                active={specialActiveIdx}
                onActiveChange={setSpecialActiveIdx}
                flipped={specialFlippedIdx}
                onFlippedChange={setSpecialFlippedIdx}
                action={renderMessageButton(selectedSpecialMember)}
              />
            }
          />
        </div>
      </section>

      {/* Dialog Tulis Pesan ke Buku Kenangan Siswa */}
      <AnimatePresence>
        {modalStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-memory-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl"
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
                    Pesan Kenangan (akan ditulis dengan gaya tulisan tangan)
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
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 font-hand text-lg text-foreground outline-none focus:ring-2 focus:ring-ring"
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
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-warm)]" />
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalStudent(null)}
                    className="min-h-[44px] rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-5 py-2 text-xs font-semibold text-[#fbf6ec] transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="size-3.5" />
                    <span>
                      {submitting ? "Mengirim..." : "Kirim ke Buku Kenangan"}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
