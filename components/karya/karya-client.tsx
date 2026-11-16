"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ExternalLink,
  Code2,
  PlusCircle,
  X,
  CheckCircle2,
  Sparkles,
  Network,
  Radar,
  Users,
  Layers,
  Upload,
  Crop,
} from "lucide-react";
import {
  computeClassSkillMap,
  studentToLanyardMember,
} from "@/lib/domain-logic";
import { useVisualTier } from "@/lib/visual-tier";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  ImageCropperModal,
  readFileAsDataUrl,
} from "@/components/ui/image-cropper-modal";
import {
  useLivePublicData,
  notifyPublicDataUpdated,
} from "@/lib/use-public-data";
import type { StudentRow, WorkRow } from "@/lib/types";

function TiltWorkCard({
  work,
  student,
  studentIndex = 0,
  enableTilt,
  index,
  onPreviewImage,
}: {
  work: WorkRow;
  student?: StudentRow;
  studentIndex?: number;
  enableTilt: boolean;
  index: number;
  onPreviewImage?: (work: WorkRow) => void;
}) {
  const cardRef = React.useRef<HTMLElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!enableTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(800px) rotateY(${(
      x * 7
    ).toFixed(2)}deg) rotateX(${(-y * 7).toFixed(2)}deg) translateY(-2px)`;
  };

  const handlePointerLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform =
      "perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0px)";
  };

  const bannerTones = [
    "from-[#2d6a6e] to-[#1e4649]",
    "from-[#3b593f] to-[#263b29]",
    "from-[#a84232] to-[#752b20]",
    "from-[#c86d3b] to-[#8f4922]",
  ];
  const toneGrad = bannerTones[index % bannerTones.length]!;
  const lanyardCard = React.useMemo(
    () => (student ? studentToLanyardMember(student, studentIndex) : null),
    [student, studentIndex]
  );

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: (index % 6) * 0.05 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform duration-150 ease-out hover:border-[var(--color-accent-warm)]/60"
    >
      <div>
        {/* Pratinjau Visual Karya Tersinkronisasi dengan Foto Kartu ID Siswa */}
        <div
          onClick={() => {
            if (work.image_url && onPreviewImage) onPreviewImage(work);
          }}
          className={`relative flex h-44 flex-col justify-between overflow-hidden bg-gradient-to-br ${toneGrad} p-4 text-[#fbf6ec] ${
            work.image_url ? "cursor-pointer" : ""
          }`}
        >
          {work.image_url ? (
            <img
              src={work.image_url}
              alt={work.title}
              referrerPolicy="no-referrer"
              className="pointer-events-none absolute inset-0 size-full object-cover opacity-55 transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -bottom-6 size-28 rounded-full border border-white/15 transition-transform duration-500 group-hover:scale-125"
          />
          <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
            <span className="rounded bg-black/25 px-2 py-0.5 font-mono font-bold text-[#f3ca82]">
              KARYA #{String(index + 1).padStart(2, "0")}
            </span>
            {/* Mini Badge Kartu ID Siswa */}
            <div className="flex items-center gap-2 rounded-full border border-white/25 bg-black/30 py-1 pr-3 pl-1 backdrop-blur-2xs">
              <div className="relative size-7 shrink-0 overflow-hidden rounded-full border border-[#f3ca82] bg-[#2b1f18]">
                {lanyardCard?.image ? (
                  <img
                    src={lanyardCard.image}
                    alt={student?.full_name || work.student_name}
                    referrerPolicy="no-referrer"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center font-serif text-[10px] font-bold text-[#fbf6ec]">
                    {(student?.full_name || work.student_name || "S").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-left leading-none">
                <p className="max-w-[130px] truncate text-[11px] font-bold text-[#fbf6ec]">
                  {student?.full_name || work.student_name}
                </p>
                <p className="mt-0.5 text-[9px] text-[#ebd0a0]">
                  {lanyardCard?.role || "Siswa XII PPLG 1"}
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10">
            <p className="font-serif text-lg font-bold leading-snug drop-shadow-2xs">
              {work.title}
            </p>
          </div>
        </div>

        <div className="p-5">
          {/* Metadata tanpa pill sesuai disiplin Zero-Pill */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-warm)]">
            {work.tags.map((t, idx) => (
              <React.Fragment key={t}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span>{t}</span>
              </React.Fragment>
            ))}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-card-foreground/90">
            {work.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-xs font-semibold">
        <a
          href={work.demo_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[36px] items-center gap-1.5 text-[var(--color-accent-warm)] hover:underline whitespace-nowrap"
        >
          <span>Lihat Demo</span>
          <ExternalLink className="size-3.5" />
        </a>

        {work.repo_url && (
          <a
            href={work.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1.5 text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            <Code2 className="size-3.5" />
            <span>Kode Sumber</span>
          </a>
        )}
      </div>
    </motion.article>
  );
}

export function KaryaClient({
  works: initialWorks,
  students: initialStudents,
}: {
  works: WorkRow[];
  students: StudentRow[];
}) {
  const { data: liveData, refresh } = useLivePublicData({
    works: initialWorks,
    students: initialStudents,
  });
  const works = liveData?.works ?? initialWorks;
  const students = liveData?.students ?? initialStudents;

  const { tier } = useVisualTier();
  const [selectedSkill, setSelectedSkill] = React.useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = React.useState<string | null>(null);
  const [visualMode, setVisualMode] = React.useState<"constellation" | "radar">(
    "constellation"
  );

  // State Paginasi Karya (Prev / Next Icon) agar tidak capek scroll
  const [workPage, setWorkPage] = React.useState(1);
  const WORKS_PER_PAGE = 6;

  // State Form Kirim / Perbarui Karya
  const [modalOpen, setModalOpen] = React.useState(false);
  const [previewWork, setPreviewWork] = React.useState<WorkRow | null>(null);
  const [studentId, setStudentId] = React.useState(
    students.find((s) => s.is_active)?.id ?? ""
  );
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("Frontend, React, UI/UX");
  const [demoUrl, setDemoUrl] = React.useState("https://");
  const [repoUrl, setRepoUrl] = React.useState("https://github.com/");
  const [workImageDataUrl, setWorkImageDataUrl] = React.useState<string | null>(
    null
  );
  const [workCropSource, setWorkCropSource] = React.useState<string | null>(
    null
  );
  const [classCode, setClassCode] = React.useState("XIIPPLG1");
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const skillNodes = React.useMemo(
    () => computeClassSkillMap(students, works),
    [students, works]
  );

  const topNodes = React.useMemo(() => skillNodes.slice(0, 10), [skillNodes]);
  const maxWeight = React.useMemo(
    () => Math.max(1, ...topNodes.map((n) => n.totalWeight)),
    [topNodes]
  );

  const filteredWorks = React.useMemo(() => {
    if (!selectedSkill) return works;
    return works.filter((w) =>
      w.tags.some((t) => t.toLowerCase() === selectedSkill.toLowerCase())
    );
  }, [works, selectedSkill]);

  const totalWorkPages = Math.max(
    1,
    Math.ceil(filteredWorks.length / WORKS_PER_PAGE)
  );
  const pagedWorks = React.useMemo(() => {
    const safePage = Math.min(workPage, totalWorkPages);
    return filteredWorks.slice(
      (safePage - 1) * WORKS_PER_PAGE,
      safePage * WORKS_PER_PAGE
    );
  }, [filteredWorks, workPage, totalWorkPages]);

  const focusedSkillName = hoveredSkill ?? selectedSkill ?? topNodes[0]?.skill ?? null;
  const activeSkillNode = React.useMemo(
    () =>
      skillNodes.find((n) => n.skill === focusedSkillName) ??
      skillNodes[0] ??
      null,
    [skillNodes, focusedSkillName]
  );

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    const parsedTags = tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "work",
          studentId,
          title,
          description,
          tags: parsedTags.length ? parsedTags : ["PPLG"],
          demoUrl: demoUrl.startsWith("http") ? demoUrl : "",
          repoUrl: repoUrl.startsWith("http") ? repoUrl : "",
          imageDataUrl: workImageDataUrl || undefined,
          classCode,
          honeypot: "",
        }),
      });
      const json = await res.json();
      setFeedback(
        json.ok ? json.message : json.error || "Gagal mengirim data karya."
      );
      if (json.ok) {
        setTitle("");
        setDescription("");
        setWorkImageDataUrl(null);
        setWorkCropSource(null);
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setFeedback("Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Titik poligon untuk Mode Radar Spektrum
  const radarNodes = topNodes.slice(0, 8);
  const radarPolygonPoints = React.useMemo(() => {
    return radarNodes
      .map((node, i, arr) => {
        const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
        const ratio = Math.max(0.28, node.totalWeight / maxWeight);
        const r = ratio * 132;
        const x = 340 + Math.cos(angle) * r;
        const y = 195 + Math.sin(angle) * r;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [radarNodes, maxWeight]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header Karya & Skill Map */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Etalase Projek Akhir · 1 Siswa = 1 Karya Pilihan
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
            Karya Siswa & Ekosistem Skill Map XII PPLG 1
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Dari aplikasi layanan desa di Flores hingga gim edukasi tenun ikat—inilah
            buah tangan tiga tahun belajar rekayasa perangkat lunak di MAKN Ende.
          </p>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setModalOpen(true);
            setFeedback(null);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] shadow-sm hover:opacity-90 whitespace-nowrap shrink-0"
        >
          <PlusCircle className="size-4" />
          <span>Daftarkan / Perbarui Karya</span>
        </motion.button>
      </div>

      {/* EKOSISTEM SKILL MAP INTERAKTIF & ANIMATIF */}
      <section
        aria-labelledby="skill-map-heading"
        className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-md"
      >
        {/* Top Bar Skill Map + Switcher Mode Visual */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/40 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-warm)]">
              <Sparkles className="size-3.5" />
              <span>Visualisasi Keahlian Hidup · Real-Time Data Kelas</span>
            </div>
            <h2
              id="skill-map-heading"
              className="mt-0.5 font-serif text-2xl font-bold text-foreground"
            >
              Peta Konstelasi & Radar Keahlian XII PPLG 1
            </h2>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-1">
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setVisualMode("constellation")}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                visualMode === "constellation"
                  ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network className="size-3.5" />
              <span>Konstelasi Orbit</span>
            </motion.button>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setVisualMode("radar")}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                visualMode === "radar"
                  ? "bg-[var(--color-accent-warm)] text-[#fbf6ec] shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radar className="size-3.5" />
              <span>Radar Spektrum</span>
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-0 lg:grid-cols-12">
          {/* Kolom Kiri: Panel Detail Skill, Bar Kemahiran Hidup & Daftar Siswa */}
          <div className="flex flex-col justify-between border-b border-border p-6 lg:col-span-5 lg:border-r lg:border-b-0">
            <div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Arahkan kursor atau klik simpul keahlian pada visualisasi di
                samping untuk memantau denyut jaringan proyek dan menyaring
                karya siswa secara langsung.
              </p>

              {/* Kartu Fokus Skill Aktif dengan Animasi Transisi */}
              <AnimatePresence mode="wait">
                {activeSkillNode && (
                  <motion.div
                    key={activeSkillNode.skill}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="mt-4 rounded-xl border border-[var(--color-accent-warm)]/40 bg-background p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent-warm)]">
                          Simpul Keahlian Aktif
                        </span>
                        <h3 className="font-serif text-xl font-bold text-foreground">
                          {activeSkillNode.skill}
                        </h3>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <span className="block font-bold text-foreground">
                          {activeSkillNode.studentCount} Siswa
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {activeSkillNode.workCount} Karya Utama
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Animatif */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Intensitas Penguasaan Kelas</span>
                        <span className="font-mono font-semibold text-foreground">
                          {Math.min(
                            100,
                            Math.round((activeSkillNode.totalWeight / maxWeight) * 100)
                          )}
                          %
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (activeSkillNode.totalWeight / maxWeight) * 100
                              )
                            )}%`,
                          }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-[#2d6a6e] via-[#c86d3b] to-[#e0a958]"
                        />
                      </div>
                    </div>

                    {/* Daftar Siswa Penggiat Skill */}
                    <div className="mt-3.5 border-t border-dashed border-border pt-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <Users className="size-3.5 text-[var(--color-chart-1)]" />
                        <span>Anggota Kelas Penggiat {activeSkillNode.skill}:</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {activeSkillNode.students.map((stuName) => (
                          <span
                            key={stuName}
                            className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            {stuName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bar Distribusi Top 6 Keahlian Kelas */}
              <div className="mt-5 space-y-2.5">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Layers className="size-3.5 text-[var(--color-accent-warm)]" />
                  <span>Spektrum Keahlian Terpopuler</span>
                </p>
                {topNodes.slice(0, 6).map((node, idx) => {
                  const pct = Math.max(
                    18,
                    Math.round((node.totalWeight / maxWeight) * 100)
                  );
                  const isFocused = focusedSkillName === node.skill;
                  return (
                    <button
                      key={node.skill}
                      type="button"
                      onMouseEnter={() => setHoveredSkill(node.skill)}
                      onMouseLeave={() => setHoveredSkill(null)}
                      onClick={() => {
                        setSelectedSkill(
                          selectedSkill === node.skill ? null : node.skill
                        );
                        setWorkPage(1);
                      }}
                      className={`block w-full rounded-lg border p-2 text-left transition-colors ${
                        isFocused
                          ? "border-[var(--color-accent-warm)] bg-muted/60"
                          : "border-transparent hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {idx + 1}. {node.skill}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {node.studentCount} siswa · {node.workCount} karya
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: idx * 0.06 }}
                          className="h-full rounded-full bg-[var(--color-accent-warm)]"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tombol Filter Cepat */}
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex flex-wrap gap-1.5">
                <motion.button
                  whileHover={{ y: -1.5, scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setSelectedSkill(null);
                    setWorkPage(1);
                  }}
                  className={`min-h-[36px] rounded-lg border px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedSkill === null
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua ({works.length})
                </motion.button>
                {topNodes.map((node) => {
                  const active = selectedSkill === node.skill;
                  return (
                    <motion.button
                      whileHover={{ y: -1.5, scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      key={node.skill}
                      type="button"
                      onClick={() => {
                        setSelectedSkill(active ? null : node.skill);
                        setWorkPage(1);
                      }}
                      className={`min-h-[36px] rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? "border-[var(--color-accent-warm)] bg-[var(--color-accent-warm)] text-[#fbf6ec] font-semibold"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {node.skill} ({node.workCount})
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Kanvas Interaktif Hidup (Konstelasi Orbit / Radar Spektrum) */}
          <div className="relative flex flex-col justify-between bg-[#18120d] p-4 sm:p-6 lg:col-span-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#ebd0a0]/85">
              <span className="font-mono">
                {visualMode === "constellation"
                  ? "MODE: JARINGAN KONSTELasi ORBIT AKTIF"
                  : "MODE: RADAR SPEKTRUM KOMPETENSI KELAS"}
              </span>
              <span>
                {selectedSkill
                  ? `Filter Aktif: ${selectedSkill} (Klik lagi untuk reset)`
                  : "Klik simpul untuk memfilter karya"}
              </span>
            </div>

            <div className="relative my-auto overflow-hidden rounded-xl border border-[#3a2a1d] bg-[#140e0a] p-2 shadow-inner">
              {visualMode === "constellation" ? (
                <svg
                  role="img"
                  aria-label="Diagram Konstelasi Hidup Keahlian Siswa XII PPLG 1"
                  viewBox="0 0 680 400"
                  className="h-auto w-full select-none"
                >
                  <defs>
                    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#2d6a6e" stopOpacity="0.65" />
                      <stop offset="60%" stopColor="#c86d3b" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#140e0a" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="nodeGlowWarm" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f3ca82" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#c86d3b" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Grid Latar & Lingkaran Orbit Berputar Halus */}
                  <circle cx={340} cy={200} r={175} fill="url(#coreGlow)" />

                  <motion.circle
                    cx={340}
                    cy={200}
                    r={110}
                    fill="none"
                    stroke="#3a2a1d"
                    strokeWidth={1}
                    strokeDasharray="6 6"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 48,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{ transformOrigin: "340px 200px" }}
                  />
                  <motion.circle
                    cx={340}
                    cy={200}
                    r={155}
                    fill="none"
                    stroke="#463324"
                    strokeWidth={1}
                    strokeDasharray="4 8"
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 64,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{ transformOrigin: "340px 200px" }}
                  />

                  {/* Gelombang Sonar Denyut dari Pusat */}
                  <motion.circle
                    cx={340}
                    cy={200}
                    fill="none"
                    stroke="#e09f4c"
                    strokeWidth={1.5}
                    initial={{ r: 44, opacity: 0.65 }}
                    animate={{ r: 175, opacity: 0 }}
                    transition={{
                      duration: 3.4,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />

                  {/* Garis Jaringan Antar-Simpul Tetangga */}
                  {topNodes.map((node, idx, arr) => {
                    const nextIdx = (idx + 1) % arr.length;
                    const angle1 = (idx / arr.length) * Math.PI * 2 - Math.PI / 2;
                    const angle2 =
                      (nextIdx / arr.length) * Math.PI * 2 - Math.PI / 2;
                    const rx = idx % 2 === 0 ? 228 : 192;
                    const ry = idx % 2 === 0 ? 136 : 116;
                    const rx2 = nextIdx % 2 === 0 ? 228 : 192;
                    const ry2 = nextIdx % 2 === 0 ? 136 : 116;
                    return (
                      <line
                        key={`web-${node.skill}`}
                        x1={340 + Math.cos(angle1) * rx}
                        y1={200 + Math.sin(angle1) * ry}
                        x2={340 + Math.cos(angle2) * rx2}
                        y2={200 + Math.sin(angle2) * ry2}
                        stroke="#2d6a6e"
                        strokeOpacity={0.28}
                        strokeWidth={1}
                      />
                    );
                  })}

                  {/* Garis Penghubung + Partikel Data Mengalir dari Pusat ke Tiap Skill */}
                  {topNodes.map((node, idx, arr) => {
                    const angle = (idx / arr.length) * Math.PI * 2 - Math.PI / 2;
                    const rx = idx % 2 === 0 ? 228 : 192;
                    const ry = idx % 2 === 0 ? 136 : 116;
                    const cx = 340 + Math.cos(angle) * rx;
                    const cy = 200 + Math.sin(angle) * ry;
                    const isFocused = focusedSkillName === node.skill;
                    const isSelected = selectedSkill === node.skill;

                    return (
                      <g key={`link-${node.skill}`}>
                        <line
                          x1={340}
                          y1={200}
                          x2={cx}
                          y2={cy}
                          stroke={
                            isSelected || isFocused ? "#f3ca82" : "#6e5641"
                          }
                          strokeWidth={isSelected || isFocused ? 2.6 : 1.3}
                          strokeDasharray={
                            isSelected || isFocused ? "none" : "5 5"
                          }
                        />
                        {/* Partikel Energi Berjalan di Sepanjang Jalur */}
                        <motion.circle
                          r={isSelected || isFocused ? 4.5 : 3}
                          fill={isSelected || isFocused ? "#f3ca82" : "#4da1a7"}
                          animate={{
                            cx: [340, cx, 340],
                            cy: [200, cy, 200],
                            opacity: [0.2, 1, 0.2],
                          }}
                          transition={{
                            duration: 2.8 + (idx % 4) * 0.45,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: idx * 0.22,
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* Simpul Inti Pusat XII PPLG 1 */}
                  <g
                    onClick={() => {
                      setSelectedSkill(null);
                      setWorkPage(1);
                    }}
                    className="cursor-pointer"
                  >
                    <motion.circle
                      cx={340}
                      cy={200}
                      r={52}
                      fill="#2d6a6e"
                      fillOpacity={0.25}
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{ transformOrigin: "340px 200px" }}
                    />
                    <circle
                      cx={340}
                      cy={200}
                      r={44}
                      fill="#1f4e52"
                      stroke="#f3ca82"
                      strokeWidth={2.5}
                    />
                    <text
                      x={340}
                      y={195}
                      textAnchor="middle"
                      className="fill-[#fbf6ec] font-serif text-[14px] font-bold"
                    >
                      XII PPLG 1
                    </text>
                    <text
                      x={340}
                      y={212}
                      textAnchor="middle"
                      className="fill-[#f3ca82] font-mono text-[10px] font-semibold"
                    >
                      {works.length} Karya · {students.length} Siswa
                    </text>
                  </g>

                  {/* Simpul-Simpul Skill dengan Animasi Denyut & Hover */}
                  {topNodes.map((node, idx, arr) => {
                    const angle = (idx / arr.length) * Math.PI * 2 - Math.PI / 2;
                    const rx = idx % 2 === 0 ? 228 : 192;
                    const ry = idx % 2 === 0 ? 136 : 116;
                    const cx = 340 + Math.cos(angle) * rx;
                    const cy = 200 + Math.sin(angle) * ry;
                    const r = Math.min(36, 22 + node.totalWeight * 1.4);
                    const isSelected = selectedSkill === node.skill;
                    const isFocused = focusedSkillName === node.skill;
                    const palette = [
                      "#c86d3b",
                      "#3b593f",
                      "#a84232",
                      "#2d6a6e",
                      "#8d5b34",
                    ];
                    const baseColor = palette[idx % palette.length]!;

                    return (
                      <g
                        key={node.skill}
                        onMouseEnter={() => setHoveredSkill(node.skill)}
                        onMouseLeave={() => setHoveredSkill(null)}
                        onClick={() => {
                          setSelectedSkill(isSelected ? null : node.skill);
                          setWorkPage(1);
                        }}
                        className="cursor-pointer"
                      >
                        {/* Halo Berdenyut */}
                        <motion.circle
                          cx={cx}
                          cy={cy}
                          r={r + 8}
                          fill={
                            isSelected || isFocused
                              ? "url(#nodeGlowWarm)"
                              : baseColor
                          }
                          fillOpacity={isSelected || isFocused ? 0.55 : 0.18}
                          animate={{
                            scale: isSelected || isFocused ? [1, 1.24, 1] : [1, 1.08, 1],
                          }}
                          transition={{
                            duration: 2.2 + (idx % 3) * 0.4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{ transformOrigin: `${cx}px ${cy}px` }}
                        />

                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill={isSelected ? "#d9793b" : baseColor}
                          stroke={isSelected || isFocused ? "#fbf3dc" : "#d8c3a5"}
                          strokeWidth={isSelected || isFocused ? 3 : 1.5}
                        />

                        <text
                          x={cx}
                          y={cy - 3}
                          textAnchor="middle"
                          className="fill-[#fbf6ec] font-sans text-[11px] font-extrabold"
                        >
                          {node.skill}
                        </text>
                        <text
                          x={cx}
                          y={cy + 11}
                          textAnchor="middle"
                          className="fill-[#f3ca82] font-mono text-[9px] font-semibold"
                        >
                          {node.studentCount}S · {node.workCount}K
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                /* MODE 2: RADAR SPEKTRUM KOMPETENSI */
                <svg
                  role="img"
                  aria-label="Diagram Radar Spektrum Keahlian XII PPLG 1"
                  viewBox="0 0 680 400"
                  className="h-auto w-full select-none"
                >
                  {/* Jaring Radar Konsentris */}
                  {[35, 70, 105, 140].map((radius) => (
                    <circle
                      key={radius}
                      cx={340}
                      cy={195}
                      r={radius}
                      fill="none"
                      stroke="#3a2a1d"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Sumbu Radar */}
                  {radarNodes.map((node, i, arr) => {
                    const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
                    const x2 = 340 + Math.cos(angle) * 145;
                    const y2 = 195 + Math.sin(angle) * 145;
                    const lx = 340 + Math.cos(angle) * 176;
                    const ly = 195 + Math.sin(angle) * 168;
                    const isFocused = focusedSkillName === node.skill;
                    return (
                      <g
                        key={`axis-${node.skill}`}
                        onMouseEnter={() => setHoveredSkill(node.skill)}
                        onMouseLeave={() => setHoveredSkill(null)}
                        onClick={() => {
                          setSelectedSkill(
                            selectedSkill === node.skill ? null : node.skill
                          );
                          setWorkPage(1);
                        }}
                        className="cursor-pointer"
                      >
                        <line
                          x1={340}
                          y1={195}
                          x2={x2}
                          y2={y2}
                          stroke={isFocused ? "#f3ca82" : "#523c2a"}
                          strokeWidth={isFocused ? 2 : 1}
                        />
                        <text
                          x={lx}
                          y={ly}
                          textAnchor="middle"
                          className={`font-sans text-[11px] font-bold ${
                            isFocused ? "fill-[#f3ca82]" : "fill-[#ebd0a0]"
                          }`}
                        >
                          {node.skill} ({node.workCount})
                        </text>
                      </g>
                    );
                  })}

                  {/* Poligon Spektrum Terisi */}
                  <motion.polygon
                    points={radarPolygonPoints}
                    fill="#c86d3b"
                    fillOpacity={0.32}
                    stroke="#f3ca82"
                    strokeWidth={2.5}
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    style={{ transformOrigin: "340px 195px" }}
                  />

                  {/* Titik Simpul Radar */}
                  {radarNodes.map((node, i, arr) => {
                    const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
                    const ratio = Math.max(0.28, node.totalWeight / maxWeight);
                    const r = ratio * 132;
                    const x = 340 + Math.cos(angle) * r;
                    const y = 195 + Math.sin(angle) * r;
                    return (
                      <circle
                        key={`pt-${node.skill}`}
                        cx={x}
                        cy={y}
                        r={6}
                        fill="#f3ca82"
                        stroke="#18120d"
                        strokeWidth={2}
                      />
                    );
                  })}
                </svg>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#d5c3ad]">
              <span>
                ● Ukuran simpul mengikuti jumlah siswa & karya di bidang tersebut
              </span>
              <span className="font-mono text-[#f3ca82]">
                S = Siswa Penggiat · K = Karya Terdaftar
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Kartu Karya dengan Paginasi Prev/Next Icon */}
      <section aria-label="Daftar Karya Siswa" className="mt-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-foreground">
              {selectedSkill
                ? `Karya Bidang ${selectedSkill} (${filteredWorks.length} Karya)`
                : `Koleksi Karya Siswa XII PPLG 1 (${filteredWorks.length} Karya)`}
            </h2>
            <p className="text-xs text-muted-foreground">
              Menampilkan {WORKS_PER_PAGE} karya per halaman — gunakan tombol ikon panah kiri/kanan di bawah.
            </p>
          </div>
          {selectedSkill && (
            <button
              type="button"
              onClick={() => {
                setSelectedSkill(null);
                setWorkPage(1);
              }}
              className="text-xs font-semibold text-[var(--color-accent-warm)] hover:underline"
            >
              Reset Filter Keahlian →
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pagedWorks.map((w, idx) => {
            const stuIdx = students.findIndex((s) => s.id === w.student_id);
            const matchedStu = stuIdx >= 0 ? students[stuIdx] : undefined;
            return (
              <TiltWorkCard
                key={w.id}
                work={w}
                student={matchedStu}
                studentIndex={stuIdx >= 0 ? stuIdx : idx}
                enableTilt={tier === "hd"}
                index={(workPage - 1) * WORKS_PER_PAGE + idx}
              />
            );
          })}
        </div>

        <PaginationBar
          currentPage={Math.min(workPage, totalWorkPages)}
          totalPages={totalWorkPages}
          totalItems={filteredWorks.length}
          pageSize={WORKS_PER_PAGE}
          onPageChange={setWorkPage}
          itemLabel="karya siswa"
        />
      </section>

      {/* Modal Daftarkan / Perbarui Karya */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="work-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Constraint Unik: 1 Siswa = 1 Karya Utama
                </p>
                <h2
                  id="work-modal-title"
                  className="mt-1 font-serif text-xl font-bold text-foreground"
                >
                  Kirim / Perbarui Karya Siswa
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup form karya"
                onClick={() => setModalOpen(false)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleWorkSubmit} className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="wk-stu"
                  className="block text-xs font-semibold text-foreground"
                >
                  Pilih Siswa Pembuat Karya
                </label>
                <select
                  id="wk-stu"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
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
                  htmlFor="wk-title"
                  className="block text-xs font-semibold text-foreground"
                >
                  Judul Karya / Aplikasi / Gim
                </label>
                <input
                  id="wk-title"
                  type="text"
                  required
                  minLength={3}
                  maxLength={90}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Mis. Aplikasi Koperasi Siswa MAKN Ende"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="wk-desc"
                  className="block text-xs font-semibold text-foreground"
                >
                  Deskripsi Singkat (1–2 Kalimat)
                </label>
                <textarea
                  id="wk-desc"
                  required
                  minLength={10}
                  maxLength={280}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan manfaat dan fitur utama karyamu..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="wk-tags"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Tag Keahlian (pisahkan koma)
                  </label>
                  <input
                    id="wk-tags"
                    type="text"
                    required
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="wk-code"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Kode Kelas
                  </label>
                  <input
                    id="wk-code"
                    type="text"
                    required
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="wk-demo"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Tautan Demo
                  </label>
                  <input
                    id="wk-demo"
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="wk-repo"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Tautan Repo (Opsional)
                  </label>
                  <input
                    id="wk-repo"
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              {feedback && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-warm)]" />
                  <span>{feedback}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] rounded-lg bg-[var(--color-accent-warm)] px-5 py-2 text-xs font-semibold text-[#fbf6ec] hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : "Simpan Karya"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
