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

/**
 * Menghasilkan URL Auto-Screenshot langsung dari Link Demo (seperti pratinjau deployment Vercel)
 * tanpa perlu upload gambar manual.
 */
function getAutoDemoScreenshotUrl(
  demoUrl?: string,
  customImageUrl?: string
): string {
  const cleanCustom = (customImageUrl || "").trim();
  if (cleanCustom.length > 0) {
    return cleanCustom;
  }
  const cleanDemo = (demoUrl || "").trim();
  if (
    /^https?:\/\/.+/i.test(cleanDemo) &&
    cleanDemo !== "https://" &&
    cleanDemo !== "http://"
  ) {
    return `https://api.microlink.io/?url=${encodeURIComponent(
      cleanDemo
    )}&screenshot=true&meta=false&embed=screenshot.url`;
  }
  return "";
}

function getFallbackMshotsUrl(demoUrl?: string): string {
  const cleanDemo = (demoUrl || "").trim();
  if (
    /^https?:\/\/.+/i.test(cleanDemo) &&
    cleanDemo !== "https://" &&
    cleanDemo !== "http://"
  ) {
    return `https://s0.wordpress.com/mshots/v1/${encodeURIComponent(
      cleanDemo
    )}?w=1200&h=750`;
  }
  return "";
}

function createProjectFallbackDataUri(work: {
  title: string;
  demo_url?: string;
  tags?: string[];
}): string {
  const safeTitle = (work.title || "Proyek Siswa XII PPLG 1")
    .replace(/[<>&"']/g, "")
    .slice(0, 42);
  const safeUrl = (work.demo_url || "https://xiipplg1-maknende.sch.id")
    .replace(/[<>&"']/g, "")
    .slice(0, 48);
  const safeTag = (work.tags?.[0] || "Full-Stack Web").replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#161614"/>
        <stop offset="55%" stop-color="#222220"/>
        <stop offset="100%" stop-color="#2E2E2B"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#bg)"/>
    <rect x="28" y="24" width="744" height="452" rx="14" fill="#181816" stroke="#4A4843" stroke-width="2"/>
    <rect x="28" y="24" width="744" height="42" rx="14" fill="#222220"/>
    <circle cx="54" cy="45" r="6" fill="#A8A49B"/>
    <circle cx="74" cy="45" r="6" fill="#7D7A72"/>
    <circle cx="94" cy="45" r="6" fill="#D6D2C9"/>
    <rect x="124" y="33" width="520" height="24" rx="6" fill="#161614"/>
    <text x="140" y="49" font-family="Special Elite,monospace" font-size="13" fill="#C9C4B8">${safeUrl}</text>
    <rect x="64" y="102" width="160" height="28" rx="6" fill="#5C5A54" fill-opacity="0.28" stroke="#A8A49B"/>
    <text x="144" y="121" text-anchor="middle" font-family="Source Serif 4,serif" font-weight="bold" font-size="13" fill="#E8E5DC">${safeTag}</text>
    <text x="64" y="176" font-family="Old Standard TT,Georgia,serif" font-weight="bold" font-size="30" fill="#F3F1EA">${safeTitle}</text>
    <rect x="64" y="210" width="420" height="12" rx="6" fill="#3D3D3A"/>
    <rect x="64" y="234" width="340" height="12" rx="6" fill="#2A2A28"/>
    <rect x="64" y="280" width="210" height="130" rx="10" fill="#1C1C1A" stroke="#4A4843"/>
    <rect x="294" y="280" width="210" height="130" rx="10" fill="#1C1C1A" stroke="#4A4843"/>
    <rect x="524" y="280" width="210" height="130" rx="10" fill="#1C1C1A" stroke="#A8A49B" stroke-opacity="0.6"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

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
  onPreviewImage?: (work: WorkRow, resolvedShotUrl: string) => void;
}) {
  const cardRef = React.useRef<HTMLElement | null>(null);

  const primaryShotUrl = React.useMemo(
    () =>
      getAutoDemoScreenshotUrl(work.demo_url, work.image_url) ||
      createProjectFallbackDataUri(work),
    [work]
  );
  const [imgSrc, setImgSrc] = React.useState(primaryShotUrl);
  const fallbackStageRef = React.useRef(0);

  React.useEffect(() => {
    fallbackStageRef.current = 0;
    setImgSrc(primaryShotUrl);
  }, [primaryShotUrl]);

  const handleImgError = () => {
    if (fallbackStageRef.current === 0) {
      fallbackStageRef.current = 1;
      const mshot = getFallbackMshotsUrl(work.demo_url);
      if (mshot && mshot !== imgSrc) {
        setImgSrc(mshot);
        return;
      }
    }
    fallbackStageRef.current = 2;
    setImgSrc(createProjectFallbackDataUri(work));
  };

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
    "from-[#2A2A28] to-[#1A1A18]",
    "from-[#3D3D3A] to-[#222220]",
    "from-[#4A4843] to-[#2A2A28]",
    "from-[#333330] to-[#1C1C1A]",
  ];
  const toneGrad = bannerTones[index % bannerTones.length]!;
  const lanyardCard = React.useMemo(
    () => (student ? studentToLanyardMember(student, studentIndex) : null),
    [student, studentIndex]
  );

  let hostnameLabel = "live-demo.app";
  try {
    if (work.demo_url && /^https?:\/\//i.test(work.demo_url)) {
      hostnameLabel = new URL(work.demo_url).hostname.replace(/^www\./, "");
    }
  } catch {
    hostnameLabel = "live-demo.app";
  }

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: (index % 6) * 0.05 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform duration-150 ease-out hover:border-foreground/50"
    >
      <div>
        {/* Pratinjau Screenshot Otomatis dari Link Demo (Gaya Vercel) + Kartu ID Siswa */}
        <div
          onClick={() => {
            if (onPreviewImage) onPreviewImage(work, imgSrc);
          }}
          className={`relative flex h-52 cursor-pointer flex-col justify-between overflow-hidden bg-gradient-to-br ${toneGrad} p-3.5 text-[#F3F1EA]`}
        >
          {/* Bingkai Browser Mini & Auto-Screenshot */}
          <img
            src={imgSrc}
            alt={`Pratinjau ${work.title}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={handleImgError}
            className="public-film-photo pointer-events-none absolute inset-0 size-full object-cover object-top opacity-90 transition-transform duration-500 group-hover:scale-105"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2D241C]/82 via-[#2D241C]/20 to-[#2D241C]/48"
          />

          <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-md border border-[#EFE5CE]/30 bg-[#2D241C]/68 px-2 py-1 font-mono text-[10px] font-semibold text-[#EFE5CE] backdrop-blur-xs">
              <span className="size-2 rounded-full bg-[#D8C7A6]" />
              <span className="max-w-[115px] truncate">{hostnameLabel}</span>
            </div>

            {/* Mini Badge Kartu ID Siswa */}
            <div className="flex items-center gap-2 rounded-full border border-[#EFE5CE]/30 bg-[#2D241C]/68 py-1 pr-3 pl-1 backdrop-blur-xs">
              <div className="relative size-7 shrink-0 overflow-hidden rounded-full border border-[#D8C7A6] bg-[#3B3025]">
                {lanyardCard?.image ? (
                  <img
                    src={lanyardCard.image}
                    alt={student?.full_name || work.student_name}
                    referrerPolicy="no-referrer"
                    className="public-film-photo size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center font-serif text-[10px] font-bold text-[#F3F1EA]">
                    {(student?.full_name || work.student_name || "S")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-left leading-none">
                <p className="max-w-[125px] truncate text-[11px] font-bold text-[#F3F1EA]">
                  {student?.full_name || work.student_name}
                </p>
                <p className="mt-0.5 text-[9px] text-[#C9C4B8]">
                  {lanyardCard?.role || "Siswa XII PPLG 1"}
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between gap-2">
            <div>
              <span className="inline-block rounded bg-[#161614]/65 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#E8E5DC]">
                PROYEK #{String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-1 font-serif text-lg font-bold leading-snug text-[#F3F1EA] drop-shadow-xs">
                {work.title}
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-[#E8E5DC]/25 bg-[#161614]/65 px-2 py-1 text-[10px] font-semibold text-[#F3F1EA] opacity-90 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              Klik Perbesar
            </span>
          </div>
        </div>

        <div className="p-5">
          {/* Metadata tanpa pill sesuai disiplin Zero-Pill */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-semibold text-muted-foreground">
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
          className="inline-flex min-h-[36px] items-center gap-1.5 text-foreground hover:underline whitespace-nowrap"
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
  const [previewWork, setPreviewWork] = React.useState<{
    work: WorkRow;
    shotUrl: string;
  } | null>(null);
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
  const [workCropOpen, setWorkCropOpen] = React.useState(false);
  const [classCode, setClassCode] = React.useState("XIIPPLG1");
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const liveFormScreenshotUrl = React.useMemo(
    () => getAutoDemoScreenshotUrl(demoUrl, workImageDataUrl || undefined),
    [demoUrl, workImageDataUrl]
  );

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header Karya & Skill Map Ringkas */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Etalase Projek Akhir · 1 Siswa 1 Karya Pilihan
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
            Karya Siswa &amp; Skill Map XII PPLG 1
          </h1>
          <p className="mt-1.5 max-w-xl text-xs sm:text-sm text-muted-foreground">
            Koleksi proyek aplikasi web, mobile, UI/UX, dan gim karya siswa MAKN Ende.
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
          className="inline-flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 whitespace-nowrap shrink-0"
        >
          <PlusCircle className="size-4" />
          <span>Daftarkan Karya</span>
        </motion.button>
      </div>

      {/* EKOSISTEM SKILL MAP INTERAKTIF & ANIMATIF */}
      <section
        aria-labelledby="skill-map-heading"
        className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-md"
      >
        {/* Top Bar Skill Map + Switcher Mode Visual */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/40 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5" />
              <span>Jaringan Talenta Kelas</span>
            </div>
            <h2
              id="skill-map-heading"
              className="mt-0.5 font-serif text-xl sm:text-2xl font-bold text-foreground"
            >
              Peta Keahlian XII PPLG 1
            </h2>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background p-1">
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setVisualMode("constellation")}
              className={`relative inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                visualMode === "constellation"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {visualMode === "constellation" && (
                <motion.span
                  layoutId="karya-mode-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="absolute inset-0 rounded-lg bg-primary shadow-2xs"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <Network className="size-3.5" />
                <span>Konstelasi</span>
              </span>
            </motion.button>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setVisualMode("radar")}
              className={`relative inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                visualMode === "radar"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {visualMode === "radar" && (
                <motion.span
                  layoutId="karya-mode-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="absolute inset-0 rounded-lg bg-primary shadow-2xs"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <Radar className="size-3.5" />
                <span>Radar</span>
              </span>
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-0 lg:grid-cols-12">
          {/* Kolom Kiri: Panel Detail Skill, Bar Kemahiran Hidup & Daftar Siswa */}
          <div className="flex flex-col justify-between border-b border-border p-5 sm:p-6 lg:col-span-5 lg:border-r lg:border-b-0">
            <div>
              <p className="text-xs text-muted-foreground">
                Klik simpul keahlian untuk menyaring karya siswa secara langsung.
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
                    className="mt-4 rounded-xl border border-foreground/30 bg-background p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
                          className="h-full rounded-full bg-gradient-to-r from-[#5C5A54] via-[#3D3D3A] to-[#1B1B1A] dark:from-[#A8A49B] dark:via-[#C9C4B8] dark:to-[#E8E5DC]"
                        />
                      </div>
                    </div>

                    {/* Daftar Siswa Penggiat Skill */}
                    <div className="mt-3.5 border-t border-dashed border-border pt-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <Users className="size-3.5 text-foreground" />
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
                  <Layers className="size-3.5 text-foreground" />
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
                          ? "border-foreground/50 bg-muted/60"
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
                          className="h-full rounded-full bg-foreground"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tombol Filter Cepat */}
            <div className="mt-5 border-t border-border pt-4">
              <div className="no-scrollbar flex flex-nowrap gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0">
                <motion.button
                  whileHover={{ y: -1.5, scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setSelectedSkill(null);
                    setWorkPage(1);
                  }}
                  className={`min-h-[36px] shrink-0 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
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
                      className={`min-h-[36px] shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
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
          <div className="relative flex flex-col justify-between bg-[#161614] p-4 sm:p-6 lg:col-span-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#C9C4B8]">
              <span className="font-mono">
                {visualMode === "constellation"
                  ? "MODE: JARINGAN KONSTELASI ORBIT AKTIF"
                  : "MODE: RADAR SPEKTRUM KOMPETENSI KELAS"}
              </span>
              <span>
                {selectedSkill
                  ? `Filter Aktif: ${selectedSkill} (Klik lagi untuk reset)`
                  : "Klik simpul untuk memfilter karya"}
              </span>
            </div>

            <div className="relative my-auto overflow-hidden rounded-xl border border-[#353430] bg-[#121211] p-2 shadow-inner">
              {visualMode === "constellation" ? (
                <svg
                  role="img"
                  aria-label="Diagram Konstelasi Hidup Keahlian Siswa XII PPLG 1"
                  viewBox="0 0 680 400"
                  className="h-auto w-full select-none"
                >
                  <defs>
                    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#6E6B64" stopOpacity="0.45" />
                      <stop offset="60%" stopColor="#3D3D3A" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#121211" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="nodeGlowWarm" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#E8E5DC" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#5C5A54" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Grid Latar & Lingkaran Orbit Berputar Halus */}
                  <circle cx={340} cy={200} r={175} fill="url(#coreGlow)" />

                  <motion.circle
                    cx={340}
                    cy={200}
                    r={110}
                    fill="none"
                    stroke="#353430"
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
                    stroke="#45443F"
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
                    stroke="#A8A49B"
                    strokeWidth={1.5}
                    initial={{ r: 44, opacity: 0.6 }}
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
                        stroke="#6E6B64"
                        strokeOpacity={0.32}
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
                            isSelected || isFocused ? "#E8E5DC" : "#5C5A54"
                          }
                          strokeWidth={isSelected || isFocused ? 2.6 : 1.3}
                          strokeDasharray={
                            isSelected || isFocused ? "none" : "5 5"
                          }
                        />
                        {/* Partikel Energi Berjalan di Sepanjang Jalur */}
                        <motion.circle
                          r={isSelected || isFocused ? 4.5 : 3}
                          fill={isSelected || isFocused ? "#F3F1EA" : "#A8A49B"}
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
                      fill="#5C5A54"
                      fillOpacity={0.28}
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
                      fill="#222220"
                      stroke="#E8E5DC"
                      strokeWidth={2.5}
                    />
                    <text
                      x={340}
                      y={195}
                      textAnchor="middle"
                      className="fill-[#F3F1EA] font-serif text-[14px] font-bold"
                    >
                      XII PPLG 1
                    </text>
                    <text
                      x={340}
                      y={212}
                      textAnchor="middle"
                      className="fill-[#C9C4B8] font-mono text-[10px] font-semibold"
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
                      "#3D3D3A",
                      "#4A4843",
                      "#2A2A28",
                      "#5C5A54",
                      "#333330",
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
                          fillOpacity={isSelected || isFocused ? 0.55 : 0.22}
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
                          fill={isSelected ? "#5C5A54" : baseColor}
                          stroke={isSelected || isFocused ? "#F3F1EA" : "#A8A49B"}
                          strokeWidth={isSelected || isFocused ? 3 : 1.5}
                        />

                        <text
                          x={cx}
                          y={cy - 3}
                          textAnchor="middle"
                          className="fill-[#F3F1EA] font-sans text-[11px] font-bold"
                        >
                          {node.skill}
                        </text>
                        <text
                          x={cx}
                          y={cy + 11}
                          textAnchor="middle"
                          className="fill-[#C9C4B8] font-mono text-[9px] font-semibold"
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
                      stroke="#353430"
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
                          stroke={isFocused ? "#E8E5DC" : "#4A4843"}
                          strokeWidth={isFocused ? 2 : 1}
                        />
                        <text
                          x={lx}
                          y={ly}
                          textAnchor="middle"
                          className={`font-sans text-[11px] font-bold ${
                            isFocused ? "fill-[#F3F1EA]" : "fill-[#C9C4B8]"
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
                    fill="#7D7A72"
                    fillOpacity={0.3}
                    stroke="#E8E5DC"
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
                        fill="#E8E5DC"
                        stroke="#161614"
                        strokeWidth={2}
                      />
                    );
                  })}
                </svg>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#C9C4B8]">
              <span>
                ● Ukuran simpul mengikuti jumlah siswa &amp; karya di bidang tersebut
              </span>
              <span className="font-mono text-[#E8E5DC]">
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
              className="text-xs font-semibold text-foreground hover:underline"
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
                onPreviewImage={(clickedWork, resolvedShotUrl) =>
                  setPreviewWork({ work: clickedWork, shotUrl: resolvedShotUrl })
                }
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

      {/* Modal Pop-Up Pratinjau Screenshot Karya Ukuran Penuh */}
      <AnimatePresence>
        {previewWork && (
          <motion.div
            key="karya-preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Pratinjau Karya ${previewWork.work.title}`}
            onClick={() => setPreviewWork(null)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#141413]/85 p-0 sm:p-6 backdrop-blur-xs"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="relative mx-auto flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6 text-card-foreground shadow-2xl"
            >
            <div className="mb-3 flex items-start justify-between gap-4 border-b border-border pb-3">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tangkapan Layar Otomatis dari Link Demo · Karya {previewWork.work.student_name}
                </p>
                <h3 className="mt-0.5 font-serif text-xl sm:text-2xl font-bold text-foreground">
                  {previewWork.work.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Tutup pratinjau karya"
                onClick={() => setPreviewWork(null)}
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mx-auto flex w-fit max-w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 shadow-md">
              <img
                src={previewWork.shotUrl}
                alt={previewWork.work.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = createProjectFallbackDataUri(previewWork.work);
                }}
                className="public-film-photo block h-auto max-h-[56vh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="mt-4 flex flex-col justify-between gap-4 rounded-xl border border-border bg-background/70 p-4 sm:flex-row sm:items-center">
              <div className="max-w-2xl">
                <p className="text-sm leading-relaxed text-foreground">
                  {previewWork.work.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs font-semibold text-muted-foreground">
                  {previewWork.work.tags.map((t, i) => (
                    <React.Fragment key={t}>
                      {i > 0 && <span aria-hidden="true">·</span>}
                      <span>{t}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {previewWork.work.demo_url && (
                  <a
                    href={previewWork.work.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <span>Buka Website Demo</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
                {previewWork.work.repo_url && (
                  <a
                    href={previewWork.work.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    <Code2 className="size-3.5" />
                    <span>Kode Sumber</span>
                  </a>
                )}
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Daftarkan / Perbarui Karya */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            key="karya-submit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-modal-title"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#141413]/75 p-0 backdrop-blur-xs sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-card p-5 sm:p-6 text-card-foreground shadow-xl"
            >
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
                    Tautan Demo (Otomatis Di-Screenshot)
                  </label>
                  <input
                    id="wk-demo"
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://proyek-kamu.vercel.app"
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

              {/* Pratinjau Tangkapan Layar Otomatis dari Link Demo (Seperti Vercel) */}
              <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Pratinjau Foto Proyek (Otomatis dari Link Demo)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Tidak perlu upload manual — foto karya otomatis diambil dari tautan demo di atas seperti di Vercel.
                    </p>
                  </div>
                  <label className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted">
                    <Upload className="size-3" />
                    <span>{workImageDataUrl ? "Ganti Foto Manual" : "Upload Manual (Opsional)"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          const raw = await readFileAsDataUrl(f);
                          setWorkCropSource(raw);
                          setWorkImageDataUrl(raw);
                          setWorkCropOpen(true);
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>

                {liveFormScreenshotUrl && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background">
                    <img
                      src={liveFormScreenshotUrl}
                      alt="Pratinjau otomatis proyek"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = createProjectFallbackDataUri({
                          title: title || "Pratinjau Karya Siswa",
                          demo_url: demoUrl,
                          tags: tagsInput.split(","),
                        });
                      }}
                      className="public-film-photo max-h-40 w-full object-cover object-top"
                    />
                    <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[11px]">
                      <span className="font-semibold text-foreground">
                        {workImageDataUrl
                          ? "✓ Menggunakan foto hasil crop manual"
                          : "✓ Auto-Screenshot aktif dari Tautan Demo"}
                      </span>
                      {workImageDataUrl && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setWorkCropOpen(true)}
                            className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline"
                          >
                            <Crop className="size-3" />
                            <span>Atur Crop</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWorkImageDataUrl(null);
                              setWorkCropSource(null);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Gunakan Auto-SS
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {feedback && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-border bg-muted p-2.5 text-xs text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
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
                  className="min-h-[44px] rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : "Simpan Karya"}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageCropperModal
        open={workCropOpen}
        imageSrc={workCropSource || workImageDataUrl}
        title="Atur Posisi & Ukuran Gambar Karya"
        targetAspect={16 / 10}
        targetLabel="16:10 Pratinjau Proyek"
        onClose={() => setWorkCropOpen(false)}
        onConfirm={(croppedWebp) => setWorkImageDataUrl(croppedWebp)}
      />
    </div>
  );
}
