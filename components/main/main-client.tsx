"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, RotateCcw, Trophy, Vote } from "lucide-react";
import { SITE_CONTENT } from "@/lib/content";
import {
  useLivePublicData,
  notifyPublicDataUpdated,
} from "@/lib/use-public-data";
import { SplitLineHeading } from "@/components/ui/motion-primitives";
import { MOTION_EASE } from "@/lib/motion-tokens";
import type { PollWithOptions } from "@/lib/types";

const DEVICE_TOKEN_KEY = "xii_pplg1_device_voter_token";

function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") return "server-token";
  try {
    const existing = window.localStorage.getItem(DEVICE_TOKEN_KEY);
    if (existing && existing.length >= 8) return existing;
    const created = `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(DEVICE_TOKEN_KEY, created);
    return created;
  } catch {
    return `fallback_${Date.now()}`;
  }
}

export function MainClient({ initialPolls }: { initialPolls: PollWithOptions[] }) {
  const { data: liveData } = useLivePublicData({ polls: initialPolls });

  // State Kuis "Seberapa Kenal Kelasmu"
  const questions = SITE_CONTENT.quizQuestions;
  const [currentQ, setCurrentQ] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [quizFinished, setQuizFinished] = React.useState(false);

  // State Polling Kelas
  const [polls, setPolls] = React.useState<PollWithOptions[]>(initialPolls);
  const [votedPollIds, setVotedPollIds] = React.useState<Record<string, boolean>>({});
  const [pollMessage, setPollMessage] = React.useState<string | null>(null);
  const [voting, setVoting] = React.useState(false);

  React.useEffect(() => {
    if (liveData?.polls) {
      setPolls(liveData.polls);
    }
  }, [liveData?.polls]);

  const activeQuestion = questions[currentQ]!;
  const selectedAnswerIdx = answers[activeQuestion.id];

  const totalScore = React.useMemo(() => {
    let correct = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correctIndex) correct++;
    }
    return Math.round((correct / questions.length) * 100);
  }, [answers, questions]);

  const handleSelectOption = (optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [activeQuestion.id]: optIdx }));
  };

  const handleVote = async (pollId: string, optionId: string) => {
    setVoting(true);
    setPollMessage(null);
    try {
      const deviceToken = getOrCreateDeviceToken();
      const res = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, optionId, deviceToken }),
      });
      const json = await res.json();
      if (json.poll) {
        setPolls((prev) =>
          prev.map((p) => (p.id === pollId ? json.poll : p))
        );
      }
      if (!res.ok || !json.ok) {
        setPollMessage(
          json.error || "Perangkat ini sudah memberikan suara sebelumnya."
        );
        setVotedPollIds((prev) => ({ ...prev, [pollId]: true }));
      } else {
        setPollMessage(
          "Suaramu berhasil tercatat! Satu perangkat hanya dapat memilih satu kali."
        );
        setVotedPollIds((prev) => ({ ...prev, [pollId]: true }));
        notifyPublicDataUpdated();
      }
    } catch {
      setPollMessage("Gagal menyimpan suara polling.");
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3.5 py-6 sm:px-6 sm:py-10">
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Sudut Nostalgia · XII PPLG 1 MAKN Ende
        </p>
        <SplitLineHeading
          as="h1"
          className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]"
        >
          Kuis &amp; Polling Kelas
        </SplitLineHeading>
        <p className="mx-auto mt-1.5 font-sans text-xs sm:text-sm leading-relaxed text-muted-foreground">
          Uji ingatanmu tentang kisah laboratorium RPL dan pilih momen terbaik kita.
        </p>
      </header>

      <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
        {/* Bagian Kiri: Kuis Seberapa Kenal Kelasmu */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: MOTION_EASE.luxury }}
          aria-labelledby="quiz-heading"
          className="editorial-card-lux rounded-2xl border border-border bg-card p-4 sm:p-8 lg:col-span-6"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3.5 sm:pb-4">
            <div>
              <h2
                id="quiz-heading"
                className="font-serif text-lg sm:text-xl font-bold text-foreground"
              >
                Kuis: Seberapa Kenal Kelasmu?
              </h2>
              <p className="text-xs text-muted-foreground">
                5 Pertanyaan Kenangan XII PPLG 1
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-foreground">
              Soal {currentQ + 1} / {questions.length}
            </span>
          </div>

          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full origin-left bg-[var(--accent-gold)]"
              animate={{
                scaleX: quizFinished
                  ? 1
                  : (currentQ + 1) / Math.max(1, questions.length),
              }}
              transition={MOTION_EASE.springLuxury}
            />
          </div>

          <AnimatePresence mode="wait">
            {!quizFinished ? (
              <motion.div
                key={activeQuestion.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className="mt-5 sm:mt-6"
              >
                <p className="font-serif text-base sm:text-lg font-bold leading-snug text-foreground">
                  {activeQuestion.question}
                </p>

                <div className="mt-4 space-y-2.5">
                  {activeQuestion.options.map((opt, idx) => {
                    const chosen = selectedAnswerIdx === idx;
                    const isCorrect = idx === activeQuestion.correctIndex;
                    const showResult = selectedAnswerIdx !== undefined;

                    return (
                      <motion.button
                        key={opt}
                        type="button"
                        whileHover={{ x: 4, scale: 1.005 }}
                        whileTap={{ scale: 0.985 }}
                        transition={{ type: "spring", stiffness: 420, damping: 26 }}
                        onClick={() => handleSelectOption(idx)}
                        className={`flex min-h-[48px] w-full items-center justify-between rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm transition-colors ${
                          chosen
                            ? isCorrect
                              ? "border-[var(--color-chart-2)] bg-[var(--color-chart-2)]/15 font-semibold text-foreground shadow-xs"
                              : "border-[var(--color-chart-3)] bg-[var(--color-chart-3)]/15 font-semibold text-foreground shadow-xs"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        <span>{opt}</span>
                        {showResult && isCorrect && (
                          <motion.span
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 450, damping: 22 }}
                            className="ml-2 shrink-0 text-xs font-bold text-[var(--color-chart-2)]"
                          >
                            ✓ Tepat
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {selectedAnswerIdx !== undefined && (
                    <motion.p
                      key={`exp-${activeQuestion.id}`}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ type: "spring", stiffness: 360, damping: 24 }}
                      className="mt-4 rounded-xl border border-border bg-muted/60 p-3.5 text-xs leading-relaxed text-foreground"
                    >
                      {activeQuestion.explanation}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-5 sm:mt-6 flex items-center justify-between gap-2">
                  <motion.button
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    disabled={currentQ === 0}
                    onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
                    className="min-h-[42px] sm:min-h-[44px] rounded-lg border border-border px-3 sm:px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40"
                  >
                    ← Sebelumnya
                  </motion.button>

                  {currentQ < questions.length - 1 ? (
                    <motion.button
                      whileHover={{ x: 2, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      disabled={selectedAnswerIdx === undefined}
                      onClick={() =>
                        setCurrentQ((p) => Math.min(questions.length - 1, p + 1))
                      }
                      className="min-h-[42px] sm:min-h-[44px] rounded-lg bg-primary px-4 sm:px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                    >
                      Berikutnya →
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      disabled={selectedAnswerIdx === undefined}
                      onClick={() => setQuizFinished(true)}
                      className="min-h-[42px] sm:min-h-[44px] rounded-lg bg-primary px-4 sm:px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                    >
                      Lihat Hasil Akhir
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="quiz-finished"
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="mt-8 flex flex-col items-center py-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -18 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 340, damping: 16, delay: 0.08 }}
                >
                  <Trophy className="size-12 text-foreground" />
                </motion.div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Skor Akhir Kamu
                </p>
                <p className="mt-1 font-serif text-4xl sm:text-5xl font-bold tabular-nums text-foreground">
                  {totalScore} / 100
                </p>
                <p className="mt-3 max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {totalScore >= 80
                    ? "Luar biasa! Kamu benar-benar penghuni sejati laboratorium XII PPLG 1 yang hafal setiap sudut cerita kita."
                    : "Terima kasih sudah ikut bernostalgia! Buka kembali halaman Anggota dan Galeri untuk menyegarkan ingatanmu."}
                </p>
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setCurrentQ(0);
                    setQuizFinished(false);
                  }}
                  className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background px-5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  <RotateCcw className="size-4" />
                  <span>Mainkan Ulang Kuis</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Bagian Kanan: Polling Kelas dengan Batang 3D Ringan */}
        <section
          aria-labelledby="poll-heading"
          className="editorial-card-lux rounded-2xl border border-border bg-card p-4 sm:p-8 lg:col-span-6"
        >
          {polls.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <Vote className="size-10 text-muted-foreground/60" />
              <h2
                id="poll-heading"
                className="mt-3 font-serif text-xl font-bold text-foreground"
              >
                Polling Kelas Masih Kosong (0 Data)
              </h2>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Belum ada polling aktif di database Supabase. Pengurus kelas
                dapat menambahkan pertanyaan polling melalui Dasbor Admin.
              </p>
            </div>
          ) : (
            polls.map((poll) => {
              const maxVotes = Math.max(
                1,
                ...poll.options.map((o) => o.votes)
              );
              const alreadyVoted = Boolean(votedPollIds[poll.id]);

              return (
                <div key={poll.id}>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h2
                      id="poll-heading"
                      className="font-serif text-xl font-bold text-foreground"
                    >
                      Polling Kelas XII PPLG 1
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Satu perangkat satu suara · Tanpa data pribadi
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold tabular-nums text-muted-foreground">
                    Total {poll.total_votes} Suara
                  </span>
                </div>

                <p className="mt-6 font-serif text-lg font-bold text-foreground">
                  {poll.question}
                </p>

                {/* Grafik Batang 3D Isometrik Ringan */}
                <div className="mt-5 space-y-4">
                  {poll.options.map((opt, idx) => {
                    const pct =
                      poll.total_votes > 0
                        ? Math.round((opt.votes / poll.total_votes) * 100)
                        : 0;
                    const barColors = [
                      "bg-[var(--color-chart-1)]",
                      "bg-[var(--color-chart-2)]",
                      "bg-[var(--color-chart-3)]",
                      "bg-[var(--color-chart-4)]",
                    ];
                    const barClass = barColors[idx % barColors.length]!;

                    return (
                      <motion.div
                        key={opt.id}
                        whileHover={{ y: -2 }}
                        transition={{ type: "spring", stiffness: 360, damping: 24 }}
                        className="rounded-xl border border-border bg-background p-4 transition-shadow hover:shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {opt.label}
                          </span>
                          <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-foreground">
                            {opt.votes} suara ({pct}%)
                          </span>
                        </div>

                        {/* Batang 3D Berlapis dengan Animasi Spring */}
                        <div className="mt-3 h-4 w-full overflow-hidden rounded-md bg-muted p-0.5 shadow-inner">
                          <motion.div
                            initial={{ width: "6%" }}
                            animate={{
                              width: `${Math.max(6, (opt.votes / maxVotes) * 100)}%`,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 200,
                              damping: 24,
                            }}
                            className={`h-full rounded ${barClass}`}
                            style={{
                              boxShadow:
                                "inset 0 2px 0 rgba(255,255,255,0.35), 2px 2px 0 rgba(0,0,0,0.2)",
                            }}
                          />
                        </div>

                        <div className="mt-3 flex justify-end">
                          <motion.button
                            whileHover={{ y: -1.5, scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            disabled={voting || alreadyVoted}
                            onClick={() => handleVote(poll.id, opt.id)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                          >
                            <Vote className="size-3.5 text-foreground" />
                            <span>
                              {alreadyVoted ? "Sudah Memilih" : "Pilih Momen Ini"}
                            </span>
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {pollMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ type: "spring", stiffness: 360, damping: 24 }}
                      role="status"
                      className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted p-3 text-xs text-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                      <span>{pollMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
        </section>
      </div>
    </div>
  );
}
