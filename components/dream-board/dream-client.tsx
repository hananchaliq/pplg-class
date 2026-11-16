"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Send, X, CheckCircle2, Pin } from "lucide-react";
import {
  DreamBoardSection,
  type ExtendedStudentRecord,
} from "@/components/dream-board/dream-board-section";
import {
  mapToExtendedStudentRecords,
  DREAM_PAPER_PALETTE,
} from "@/lib/class-data";
import {
  useLivePublicData,
  notifyPublicDataUpdated,
} from "@/lib/use-public-data";
import type { DreamRow, StudentRow } from "@/lib/types";

export function DreamBoardClient({
  dreams: initialDreams,
  students: initialStudents,
}: {
  dreams: DreamRow[];
  students: StudentRow[];
}) {
  const { data: liveData, refresh } = useLivePublicData({
    dreams: initialDreams,
    students: initialStudents,
  });
  const dreams = liveData?.dreams ?? initialDreams;
  const students = liveData?.students ?? initialStudents;

  const extendedStudents = React.useMemo(
    () => mapToExtendedStudentRecords(students, dreams),
    [students, dreams]
  );

  // State Modal Kirim Semangat (Cheer)
  const [cheerTargetDream, setCheerTargetDream] =
    React.useState<DreamRow | null>(null);
  const [cheerAuthor, setCheerAuthor] = React.useState("");
  const [cheerMessage, setCheerMessage] = React.useState("");
  const [cheerCode, setCheerCode] = React.useState("XIIPPLG1");
  const [cheerSubmitting, setCheerSubmitting] = React.useState(false);
  const [cheerFeedback, setCheerFeedback] = React.useState<string | null>(null);

  // State Modal Tempel / Perbarui Cita-Cita Siswa
  const [newDreamOpen, setNewDreamOpen] = React.useState(false);
  const [dreamStudentId, setDreamStudentId] = React.useState(
    students.find((s) => s.is_active)?.id ?? ""
  );
  const [dreamText, setDreamText] = React.useState("");
  const [dreamReason, setDreamReason] = React.useState("");
  const [dreamColor, setDreamColor] = React.useState(
    DREAM_PAPER_PALETTE[0]?.hex ?? "#FFF7D6"
  );
  const [dreamCode, setDreamCode] = React.useState("XIIPPLG1");
  const [dreamSubmitting, setDreamSubmitting] = React.useState(false);
  const [dreamFeedback, setDreamFeedback] = React.useState<string | null>(null);

  const handleOpenCheerForStudent = React.useCallback(
    (st: ExtendedStudentRecord) => {
      const matched =
        dreams.find(
          (d) => d.id === st.dream_id || d.student_id === st.id
        ) ?? null;
      if (matched) {
        setCheerTargetDream(matched);
        setCheerFeedback(null);
      }
    },
    [dreams]
  );

  const handleSendCheer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cheerTargetDream) return;
    setCheerSubmitting(true);
    setCheerFeedback(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dream_cheer",
          dreamId: cheerTargetDream.id,
          authorName: cheerAuthor,
          message: cheerMessage,
          classCode: cheerCode,
          honeypot: "",
        }),
      });
      const json = await res.json();
      setCheerFeedback(
        json.ok
          ? json.message
          : json.error || "Gagal mengirim pesan semangat."
      );
      if (json.ok) {
        setCheerMessage("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setCheerFeedback("Gagal menghubungi server.");
    } finally {
      setCheerSubmitting(false);
    }
  };

  const handleSendDream = async (e: React.FormEvent) => {
    e.preventDefault();
    setDreamSubmitting(true);
    setDreamFeedback(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dream",
          studentId: dreamStudentId,
          dream: dreamText,
          reason: dreamReason,
          paperColor: dreamColor,
          classCode: dreamCode,
          honeypot: "",
        }),
      });
      const json = await res.json();
      setDreamFeedback(
        json.ok
          ? json.message
          : json.error || "Gagal mengirim catatan cita-cita."
      );
      if (json.ok) {
        setDreamText("");
        setDreamReason("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setDreamFeedback("Gagal menghubungi server.");
    } finally {
      setDreamSubmitting(false);
    }
  };

  return (
    <div className="pb-10">
      <DreamBoardSection
        students={extendedStudents}
        onOpenCheerModal={handleOpenCheerForStudent}
        onOpenSubmitDreamModal={() => {
          setNewDreamOpen(true);
          setDreamFeedback(null);
        }}
      />

      {/* Modal Lembar Doa & Semangat untuk Sahabat (Bersih, Rapi, Bergaya Kertas Catatan Tulis) */}
      {cheerTargetDream && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dream-cheer-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            style={{
              borderTopColor: cheerTargetDream.paper_color || "#e09f4c",
            }}
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border border-t-[6px] bg-card p-6 text-card-foreground shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="font-hand text-xl font-bold text-[var(--color-accent-warm)]">
                  Lembar Doa &amp; Semangat Sahabat UNO
                </p>
                <h2
                  id="dream-cheer-title"
                  className="mt-0.5 font-serif text-2xl font-bold text-foreground"
                >
                  Untuk {cheerTargetDream.student_name}
                </h2>
                <p className="mt-1 font-hand text-xl text-muted-foreground">
                  Cita-cita: &ldquo;{cheerTargetDream.dream}&rdquo;
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Tutup lembar doa"
                onClick={() => setCheerTargetDream(null)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            <div className="mt-4 max-h-52 space-y-2.5 overflow-y-auto pr-1">
              {cheerTargetDream.cheers && cheerTargetDream.cheers.length > 0 ? (
                cheerTargetDream.cheers.map((c) => (
                  <div
                    key={c.id}
                    className="border-b border-dashed border-border pb-2.5 last:border-b-0"
                  >
                    <p className="font-hand text-2xl leading-snug text-foreground">
                      &ldquo;{c.message}&rdquo;
                    </p>
                    <p className="mt-0.5 text-right font-hand text-lg font-bold text-[var(--color-accent-warm)]">
                      ~ {c.author_name}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-2 font-hand text-xl text-muted-foreground">
                  Belum ada catatan doa di lembar ini. Tuliskan doa pertamamu di bawah!
                </p>
              )}
            </div>

            <form
              onSubmit={handleSendCheer}
              className="mt-4 space-y-3.5 border-t border-border pt-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="ch-author"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Nama Kamu
                  </label>
                  <input
                    id="ch-author"
                    type="text"
                    required
                    value={cheerAuthor}
                    onChange={(e) => setCheerAuthor(e.target.value)}
                    placeholder="Mis. Rizky"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ch-code"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Kode Kelas
                  </label>
                  <input
                    id="ch-code"
                    type="text"
                    required
                    value={cheerCode}
                    onChange={(e) => setCheerCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ch-msg"
                  className="block text-xs font-semibold text-foreground"
                >
                  Tulisan Doa &amp; Semangat
                </label>
                <textarea
                  id="ch-msg"
                  required
                  minLength={3}
                  maxLength={280}
                  rows={2}
                  value={cheerMessage}
                  onChange={(e) => setCheerMessage(e.target.value)}
                  placeholder="Bismillah, semoga tercapai ya..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-hand text-2xl text-foreground"
                />
              </div>

              {cheerFeedback && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-warm)]" />
                  <span>{cheerFeedback}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCheerTargetDream(null)}
                  className="min-h-[40px] rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Tutup
                </button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={cheerSubmitting}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="size-3.5" />
                  <span>
                    {cheerSubmitting ? "Mengirim..." : "Tempel Doa"}
                  </span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal Tulis Kertas Cita-Cita Siswa (Rapi & Bersih Tanpa Ornamen AI) */}
      {newDreamOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-dream-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            style={{ borderTopColor: dreamColor }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border border-t-[6px] bg-card p-6 text-card-foreground shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="font-hand text-xl font-bold text-[var(--color-accent-warm)]">
                  Lembar Catatan Papan Cita-Cita UNO
                </p>
                <h2
                  id="new-dream-title"
                  className="mt-0.5 font-serif text-2xl font-bold text-foreground"
                >
                  Tulis &amp; Tempel Cita-Cita
                </h2>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Tutup form cita-cita"
                onClick={() => setNewDreamOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            <form onSubmit={handleSendDream} className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="dr-stu"
                  className="block text-xs font-semibold text-foreground"
                >
                  Nama Siswa
                </label>
                <select
                  id="dr-stu"
                  value={dreamStudentId}
                  onChange={(e) => setDreamStudentId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {students
                    .filter((s) => s.is_active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="dr-text"
                  className="block text-xs font-semibold text-foreground"
                >
                  Cita-Cita Kamu (Ditampilkan dengan Tulisan Tangan)
                </label>
                <input
                  id="dr-text"
                  type="text"
                  required
                  minLength={4}
                  maxLength={180}
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  placeholder="Mis. Menjadi Software Architect & Dosen di NTT"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-hand text-2xl font-bold text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="dr-reason"
                  className="block text-xs font-semibold text-foreground"
                >
                  Alasan &amp; Harapan di Balik Mimpi Ini
                </label>
                <textarea
                  id="dr-reason"
                  required
                  minLength={4}
                  maxLength={320}
                  rows={3}
                  value={dreamReason}
                  onChange={(e) => setDreamReason(e.target.value)}
                  placeholder="Ceritakan alasan di balik mimpimu..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-hand text-xl text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dr-col"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Warna Kertas Catatan
                  </label>
                  <select
                    id="dr-col"
                    value={dreamColor}
                    onChange={(e) => setDreamColor(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {DREAM_PAPER_PALETTE.map((p) => (
                      <option key={p.hex} value={p.hex}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="dr-code"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Kode Kelas
                  </label>
                  <input
                    id="dr-code"
                    type="text"
                    required
                    value={dreamCode}
                    onChange={(e) => setDreamCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                  />
                </div>
              </div>

              {dreamFeedback && (
                <p
                  role="status"
                  className="rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground"
                >
                  {dreamFeedback}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewDreamOpen(false)}
                  className="min-h-[40px] rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={dreamSubmitting}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-5 py-2 text-xs font-semibold text-[#fbf6ec] hover:opacity-90 disabled:opacity-50"
                >
                  <Pin className="size-4" />
                  <span>
                    {dreamSubmitting ? "Menempel..." : "Tempel ke Papan"}
                  </span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
