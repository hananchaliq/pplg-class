"use client";

import * as React from "react";
import { Sparkles, Send, X, CheckCircle2 } from "lucide-react";
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
  const [cheerCode, setCheerCode] = React.useState("XIIPPLG1-2027");
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
  const [dreamCode, setDreamCode] = React.useState("XIIPPLG1-2027");
  const [dreamSubmitting, setDreamSubmitting] = React.useState(false);
  const [dreamFeedback, setDreamFeedback] = React.useState<string | null>(null);

  const handleOpenCheerForStudent = React.useCallback(
    (st: ExtendedStudentRecord) => {
      const matched =
        dreams.find((d) => d.student_id === st.id) ?? {
          id: `dream-${st.id}`,
          student_id: st.id,
          student_name: st.name,
          student_nickname: st.nickname || st.name.split(" ")[0] || st.name,
          dream: st.dream_title,
          reason: st.dream_reason,
          paper_color: st.dream_paper_color || "#FFF7D6",
          status: "approved",
          cheers: [],
        };
      setCheerTargetDream(matched);
      setCheerFeedback(null);
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

      {/* Modal Kirim Semangat untuk Siswa */}
      {cheerTargetDream && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dream-cheer-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Doa &amp; Semangat Sahabat XII PPLG 1
                </p>
                <h2
                  id="dream-cheer-title"
                  className="mt-1 font-serif text-xl font-bold text-foreground"
                >
                  Untuk {cheerTargetDream.student_name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup form kirim semangat"
                onClick={() => setCheerTargetDream(null)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {cheerTargetDream.cheers && cheerTargetDream.cheers.length > 0 ? (
                cheerTargetDream.cheers.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-border bg-background p-3"
                  >
                    <p className="font-hand text-xl text-foreground">
                      &ldquo;{c.message}&rdquo;
                    </p>
                    <p className="mt-1 text-right text-xs font-semibold text-[var(--color-accent-warm)]">
                      — {c.author_name}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  Belum ada pesan semangat. Jadilah yang pertama mendoakan!
                </p>
              )}
            </div>

            <form
              onSubmit={handleSendCheer}
              className="mt-4 space-y-3 border-t border-border pt-4"
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
                  Pesan Semangat
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
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-hand text-xl text-foreground"
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

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheerTargetDream(null)}
                  className="min-h-[40px] rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={cheerSubmitting}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="size-3.5" />
                  <span>
                    {cheerSubmitting ? "Mengirim..." : "Kirim Semangat"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tempel / Perbarui Cita-Cita Siswa */}
      {newDreamOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-dream-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Satu Siswa Satu Note Utama di Papan Tulis
                </p>
                <h2
                  id="new-dream-title"
                  className="mt-1 font-serif text-xl font-bold text-foreground"
                >
                  Tempel / Perbarui Cita-Cita
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup form cita-cita"
                onClick={() => setNewDreamOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
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
                  Cita-Cita Kamu
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
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="dr-reason"
                  className="block text-xs font-semibold text-foreground"
                >
                  Alasan Memilih Cita-Cita Ini
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
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dr-col"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Warna Kertas Note
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
                <button
                  type="submit"
                  disabled={dreamSubmitting}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-5 py-2 text-xs font-semibold text-[#fbf6ec] hover:opacity-90 disabled:opacity-50"
                >
                  <Sparkles className="size-4" />
                  <span>
                    {dreamSubmitting ? "Mengirim..." : "Tempel ke Papan"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
