"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Grid,
  Upload,
  X,
  CheckCircle2,
  Crop,
  Newspaper,
} from "lucide-react";
import {
  KoranGaleri,
  type KoranGaleriHandle,
} from "@/components/galeri/koran-galeri";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  ImageCropperModal,
  readFileAsDataUrl,
} from "@/components/ui/image-cropper-modal";
import {
  compressImageFile,
  formatFileSizeKB,
} from "@/lib/image-compressor";
import { SITE_CONTENT } from "@/lib/content";
import { decodeHtmlEntities } from "@/lib/domain-logic";
import {
  useLivePublicData,
  notifyPublicDataUpdated,
} from "@/lib/use-public-data";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion-tokens";
import { SplitLineHeading } from "@/components/ui/motion-primitives";
import { useEditorialToast } from "@/components/ui/editorial-toast";
import type { MomentPhase, MomentRow } from "@/lib/types";

const SPECIAL_NON_GALLERY_CATEGORIES = new Set([
  "Foto Hero 3D",
  "Foto Sampul Buku",
  "Foto Bersama Kelas",
  "ID Card Siswa",
  "ID Card Sahabat Istimewa",
]);

export function GaleriClient({
  initialMoments,
}: {
  initialMoments: MomentRow[];
}) {
  const { data: liveData, refresh } = useLivePublicData({
    moments: initialMoments,
  });
  const rawMoments = liveData?.moments ?? initialMoments;

  const moments = React.useMemo(
    () =>
      rawMoments
        .filter((m) => !SPECIAL_NON_GALLERY_CATEGORIES.has(m.category))
        .map((m) => ({
          ...m,
          caption: decodeHtmlEntities(m.caption),
          uploader_name: decodeHtmlEntities(m.uploader_name),
          category: decodeHtmlEntities(m.category),
          taken_at: decodeHtmlEntities(m.taken_at),
        })),
    [rawMoments]
  );

  const koranRef = React.useRef<KoranGaleriHandle | null>(null);
  const gridSectionRef = React.useRef<HTMLElement | null>(null);

  const { toast } = useEditorialToast();
  const [activePhase, setActivePhase] = React.useState<MomentPhase>("XII");
  const [activeCategory, setActiveCategory] = React.useState<string>("Semua");
  const [showAllGrid, setShowAllGrid] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const [momentPage, setMomentPage] = React.useState(1);
  const MOMENTS_PER_PAGE = 8;

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploaderName, setUploaderName] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [category, setCategory] = React.useState("Momen lucu");
  const [phase, setPhase] = React.useState<MomentPhase>("XII");
  const [classCode, setClassCode] = React.useState("XIIPPLG1");
  const [rawUploadSource, setRawUploadSource] = React.useState<string>("");
  const [compressedPreview, setCompressedPreview] = React.useState<string>("");
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadFeedback, setUploadFeedback] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  React.useEffect(() => {
    if (lightboxIndex === null && !uploadOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (uploadOpen) setUploadOpen(false);
        else if (lightboxIndex !== null) setLightboxIndex(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, uploadOpen]);

  const isRealPhoto = React.useCallback((url?: string) => {
    const clean = (url || "").trim();
    return clean.length > 0 && !clean.startsWith("/api/moment-illustration");
  }, []);

  const didAutoSelectPhase = React.useRef(false);
  React.useEffect(() => {
    if (didAutoSelectPhase.current || moments.length === 0) return;
    const currentHasReal = moments.some(
      (m) => m.phase === activePhase && isRealPhoto(m.image_url)
    );
    if (!currentHasReal) {
      const phaseWithReal = (["XII", "XI", "X"] as MomentPhase[]).find((ph) =>
        moments.some((m) => m.phase === ph && isRealPhoto(m.image_url))
      );
      if (phaseWithReal && phaseWithReal !== activePhase) {
        setActivePhase(phaseWithReal);
      }
    }
    didAutoSelectPhase.current = true;
  }, [moments, activePhase, isRealPhoto]);

  const filteredMoments = React.useMemo(() => {
    const list = moments.filter((m) => {
      if (activeCategory !== "Semua" && m.category !== activeCategory) {
        return false;
      }
      return true;
    });
    return [...list].sort(
      (a, b) =>
        (isRealPhoto(b.image_url) ? 1 : 0) - (isRealPhoto(a.image_url) ? 1 : 0)
    );
  }, [moments, activeCategory, isRealPhoto]);

  const listSourceMoments = React.useMemo(() => {
    if (showAllGrid) return filteredMoments;
    return filteredMoments.filter((m) => m.phase === activePhase);
  }, [filteredMoments, showAllGrid, activePhase]);

  const totalMomentPages = Math.max(
    1,
    Math.ceil(listSourceMoments.length / MOMENTS_PER_PAGE)
  );

  const pagedMoments = React.useMemo(() => {
    const safePage = Math.min(momentPage, totalMomentPages);
    return listSourceMoments.slice(
      (safePage - 1) * MOMENTS_PER_PAGE,
      safePage * MOMENTS_PER_PAGE
    );
  }, [listSourceMoments, momentPage, totalMomentPages]);

  const handleOpenAllGrid = () => {
    setShowAllGrid(true);
    setMomentPage(1);
    window.setTimeout(() => {
      gridSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  const [compressedInfo, setCompressedInfo] = React.useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const [rawDataUrl, compressed] = await Promise.all([
        readFileAsDataUrl(file),
        compressImageFile(file),
      ]);
      setRawUploadSource(rawDataUrl);
      setCompressedPreview(compressed.dataUrl);
      setCompressedInfo(
        `WebP ${compressed.width}×${compressed.height}px · ${formatFileSizeKB(compressed.sizeBytes)}`
      );
      setCropModalOpen(true);
    } catch {
      setUploadFeedback({
        ok: false,
        text: "Gagal membaca foto. Pastikan formatnya JPEG, PNG, atau WebP.",
      });
    } finally {
      e.target.value = "";
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compressedPreview) {
      setUploadFeedback({
        ok: false,
        text: "Pilih foto kenangan terlebih dahulu sebelum mengirim.",
      });
      return;
    }
    setSubmitting(true);
    setUploadFeedback(null);
    try {
      // Pastikan file yang dikirim sudah terkompresi client-side (HTML5 Canvas, max 1600px, image/webp, kualitas 0.82)
      const compressed = await compressImageFile(
        await (await fetch(compressedPreview)).blob(),
        {
          fileName: `galeri-${category}-${uploaderName || "xiipplg1"}`,
          maxDimension: 1600,
          quality: 0.82,
        }
      );

      const formData = new FormData();
      formData.append("file", compressed.file);
      formData.append("channel", "gallery");
      formData.append("category", category);
      formData.append("senderName", uploaderName);
      formData.append("uploaderName", uploaderName);
      formData.append("title", `${category} | ${uploaderName}`);
      formData.append("caption", caption);
      formData.append("phase", phase);
      formData.append("classCode", classCode);
      formData.append("honeypot", "");

      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const errText = json.error || "Gagal mengunggah foto momen.";
        setUploadFeedback({ ok: false, text: errText });
        toast({
          title: "Gagal mengunggah",
          description: errText,
          variant: "error",
        });
      } else {
        const okText =
          json.message ||
          "Foto berhasil dikirim ke antrean moderasi admin (pending-manifest.json)!";
        setUploadFeedback({ ok: true, text: okText });
        toast({
          title: "Foto terkirim ke antrean",
          description: okText,
          variant: "success",
        });
        setCaption("");
        setCompressedPreview("");
        setCompressedInfo("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      const netText = "Gagal menghubungi server. Coba lagi sebentar ya.";
      setUploadFeedback({ ok: false, text: netText });
      toast({
        title: "Koneksi terputus",
        description: netText,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentLightboxMoment =
    lightboxIndex !== null ? (filteredMoments[lightboxIndex] ?? null) : null;

  return (
    <div className="mx-auto max-w-7xl px-3.5 py-6 sm:px-6 sm:py-10">
      {/* Header Halaman Galeri Koran */}
      <div className="flex flex-col items-start justify-between gap-3.5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Edisi Cetak Tiga Tahun · {moments.length} Arsip Foto
          </p>
          <SplitLineHeading
            as="h1"
            className="mt-1 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]"
          >
            Galeri Kenangan Bersama
          </SplitLineHeading>
          <p className="mt-1 font-sans text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Lembaran koran cetak jadul kecreaman dan arsip foto vintage Kelas X, XI, hingga XII PPLG 1 MAKN Ende.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowAllGrid((prev) => !prev);
              setMomentPage(1);
            }}
            className="inline-flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 font-sans text-xs font-semibold text-foreground transition-colors hover:bg-muted whitespace-nowrap shrink-0"
          >
            {showAllGrid ? (
              <Newspaper className="size-4 shrink-0 text-foreground" />
            ) : (
              <Grid className="size-4 shrink-0 text-foreground" />
            )}
            <span className="truncate">
              {showAllGrid
                ? "Mode Koran Kelas"
                : `Semua Foto (${filteredMoments.length})`}
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setUploadOpen(true);
              setUploadFeedback(null);
            }}
            className="inline-flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 font-sans text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <Upload className="size-4 shrink-0" />
            <span>Unggah Foto</span>
          </motion.button>
        </div>
      </div>

      {/* Filter Kategori */}
      <div
        role="group"
        aria-label="Filter Kategori Momen"
        className="no-scrollbar mt-5 flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-xl border border-border bg-card/70 p-1.5 sm:flex-wrap"
      >
        {SITE_CONTENT.momentCategories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <motion.button
              key={cat}
              type="button"
              whileHover={{ y: -1.5 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              onClick={() => {
                setActiveCategory(cat);
                setMomentPage(1);
              }}
              className={`relative min-h-[34px] rounded-lg px-3 py-1 font-sans text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? "text-background font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="galeri-cat-pill"
                  transition={MOTION_EASE.springNav}
                  className="absolute inset-0 rounded-lg bg-foreground shadow-2xs"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10">{cat}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Koran Kelas Interaktif (LeafThrough) */}
      {!showAllGrid && (
        <div className="mt-5">
          <KoranGaleri
            ref={koranRef}
            moments={filteredMoments}
            activeCategory={activeCategory}
            activePhase={activePhase}
            onSelectPhase={setActivePhase}
            onShowAllGrid={handleOpenAllGrid}
          />
        </div>
      )}

      {/* Grid Arsip Cetak Foto Monokrom dengan Paginasi Prev/Next */}
      <section
        ref={gridSectionRef}
        aria-labelledby="all-photos-heading"
        className="mt-8 sm:mt-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2
              id="all-photos-heading"
              className="font-serif text-lg sm:text-xl font-bold text-foreground"
            >
              {showAllGrid
                ? `Seluruh Arsip Cetak Foto (${listSourceMoments.length} Momen)`
                : `Arsip Foto Rubrik Kelas ${activePhase} (${listSourceMoments.length} Momen)`}
            </h2>
            <p className="font-sans text-xs text-muted-foreground">
              Menampilkan {MOMENTS_PER_PAGE} foto per halaman — ketuk foto untuk melihat detail ukuran penuh.
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setShowAllGrid((prev) => !prev);
              setMomentPage(1);
            }}
            className="font-sans text-xs font-semibold text-foreground hover:underline whitespace-nowrap"
          >
            {showAllGrid
              ? `← Kembali ke Koran Kelas ${activePhase}`
              : `Lihat Semua ${filteredMoments.length} Foto →`}
          </motion.button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {pagedMoments.map((m, idx) => {
            const globalIdx = filteredMoments.findIndex((x) => x.id === m.id);
            const naturalRot =
              idx % 3 === 0
                ? "-rotate-1"
                : idx % 3 === 1
                  ? "rotate-1"
                  : "rotate-0";
            return (
              <motion.button
                key={m.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: MOTION_DURATION.medium,
                  delay: idx * 0.04,
                  ease: MOTION_EASE.editorial,
                }}
                whileHover={{ y: -3, rotate: 0, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLightboxIndex(globalIdx >= 0 ? globalIdx : 0)}
                className={`real-photo-paper group flex flex-col justify-between rounded-xl p-3 pb-4 text-left transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${naturalRot}`}
              >
                <div>
                  <div className="photo-gloss-sheen relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={m.image_url}
                      alt={m.caption}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="public-film-photo size-full object-cover transition-transform duration-500 group-hover:scale-103"
                    />
                  </div>
                  <p className="mt-3 line-clamp-2 font-serif text-sm sm:text-base font-bold leading-snug text-foreground">
                    {m.caption}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-dashed border-border pt-2 font-mono text-[11px] font-semibold text-muted-foreground">
                  <span>
                    Kelas {m.phase} · {m.category}
                  </span>
                  <span className="tabular-nums">{m.taken_at}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <PaginationBar
          currentPage={Math.min(momentPage, totalMomentPages)}
          totalPages={totalMomentPages}
          totalItems={listSourceMoments.length}
          pageSize={MOMENTS_PER_PAGE}
          onPageChange={setMomentPage}
          itemLabel="lembar foto kenangan"
        />
      </section>

      {/* Modal Lightbox Pop-Up Kertas Foto Monokrom */}
      <AnimatePresence>
        {currentLightboxMoment && lightboxIndex !== null && (
          <motion.div
            key="galeri-lightbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Peninjau Kertas Foto Ukuran Penuh"
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#241E18]/80 p-0 backdrop-blur-xs sm:items-center sm:p-6"
          >
            <motion.div
              key={currentLightboxMoment.id}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="real-photo-paper relative mx-auto flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-y-auto rounded-t-3xl p-3.5 pb-5 text-card-foreground shadow-2xl sm:rounded-2xl sm:p-6"
            >
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-dashed border-border pb-2.5">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-bold text-muted-foreground">
                  <span className="rounded-md bg-secondary px-2.5 py-0.5 text-foreground">
                    Kelas {currentLightboxMoment.phase}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{currentLightboxMoment.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {currentLightboxMoment.taken_at}
                  </span>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.94 }}
                  aria-label="Tutup foto"
                  onClick={() => setLightboxIndex(null)}
                  className="inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </motion.button>
              </div>

              <div className="photo-gloss-sheen relative mx-auto flex w-fit max-w-full items-center justify-center overflow-hidden rounded-xl border-2 border-border bg-secondary shadow-md">
                <img
                  src={currentLightboxMoment.image_url}
                  alt={currentLightboxMoment.caption}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="public-film-photo block h-auto max-h-[46dvh] sm:max-h-[56vh] w-auto max-w-full object-contain"
                />
              </div>

              <div className="mt-4 rounded-xl border border-border bg-background/95 p-3.5 sm:p-4 shadow-xs">
                <p className="font-serif text-base sm:text-xl font-bold leading-relaxed text-foreground break-words">
                  &ldquo;{currentLightboxMoment.caption}&rdquo;
                </p>
                <div className="mt-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5 border-t border-dashed border-border pt-2.5">
                  <p className="font-mono text-xs font-medium text-muted-foreground">
                    Diabadikan oleh{" "}
                    <strong className="font-semibold text-foreground">
                      {currentLightboxMoment.uploader_name}
                    </strong>{" "}
                    · Bingkai {lightboxIndex + 1} dari {filteredMoments.length}
                  </p>

                  <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label="Foto sebelumnya"
                      onClick={() =>
                        setLightboxIndex(
                          (lightboxIndex - 1 + filteredMoments.length) %
                            filteredMoments.length
                        )
                      }
                      className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 font-sans text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <ChevronLeft className="size-4" />
                      <span>Sebelumnya</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Foto berikutnya"
                      onClick={() =>
                        setLightboxIndex(
                          (lightboxIndex + 1) % filteredMoments.length
                        )
                      }
                      className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 font-sans text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <span>Berikutnya</span>
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Unggah Foto Momen */}
      <AnimatePresence>
        {uploadOpen && (
          <motion.div
            key="galeri-upload-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-moment-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#241E18]/70 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:rounded-2xl sm:p-6"
            >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-medium text-muted-foreground">
                  Tambah Koleksi Galeri XII PPLG 1
                </p>
                <h2
                  id="upload-moment-title"
                  className="mt-1 font-serif text-xl font-bold text-foreground"
                >
                  Unggah Foto Momen Kelas
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup form unggah"
                onClick={() => setUploadOpen(false)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-muted/35 p-3.5">
                <label className="block font-sans text-xs font-semibold text-foreground">
                  Pilih Foto dari HP atau Desktop &amp; Atur Posisi (Crop)
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 py-2 font-sans text-xs font-semibold text-primary-foreground shadow-2xs hover:opacity-90">
                    <Upload className="size-3.5" />
                    <span>Pilih Foto</span>
                    <input
                      id="up-file"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {(rawUploadSource || compressedPreview) && (
                    <button
                      type="button"
                      onClick={() => setCropModalOpen(true)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 font-sans text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <Crop className="size-3.5 text-foreground" />
                      <span>Atur Posisi (Crop)</span>
                    </button>
                  )}
                </div>

                {compressedPreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-2xs">
                      <img
                        src={compressedPreview}
                        alt="Pratinjau terkompresi"
                        referrerPolicy="no-referrer"
                        className="max-h-24 w-auto object-contain"
                      />
                    </div>
                    <p className="font-sans text-xs text-muted-foreground">
                      ✓ Foto terkompresi siap diunggah ke Vercel Blob
                      {compressedInfo ? ` (${compressedInfo})` : ""}.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="up-name"
                    className="block font-sans text-xs font-semibold text-foreground"
                  >
                    Nama Pengunggah
                  </label>
                  <input
                    id="up-name"
                    type="text"
                    required
                    minLength={2}
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                    placeholder="Mis. Dimas"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="up-phase"
                    className="block font-sans text-xs font-semibold text-foreground"
                  >
                    Fase Kelas
                  </label>
                  <select
                    id="up-phase"
                    value={phase}
                    onChange={(e) => setPhase(e.target.value as MomentPhase)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="up-cat"
                    className="block font-sans text-xs font-semibold text-foreground"
                  >
                    Kategori Momen
                  </label>
                  <select
                    id="up-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground"
                  >
                    {SITE_CONTENT.momentCategories
                      .filter((c) => c !== "Semua")
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="up-code"
                    className="block font-sans text-xs font-semibold text-foreground"
                  >
                    Kode Kelas
                  </label>
                  <input
                    id="up-code"
                    type="text"
                    required
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="up-caption"
                  className="block font-sans text-xs font-semibold text-foreground"
                >
                  Cerita Singkat / Caption Foto
                </label>
                <textarea
                  id="up-caption"
                  required
                  minLength={4}
                  maxLength={220}
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tuliskan cerita di balik foto ini..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm leading-relaxed text-foreground"
                />
              </div>

              {uploadFeedback && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-border bg-muted/60 p-3 font-sans text-xs text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
                  <span>{uploadFeedback.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="min-h-[44px] rounded-lg border border-border px-4 py-2 font-sans text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Camera className="size-4" />
                  <span>{submitting ? "Mengirim..." : "Kirim ke Galeri"}</span>
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageCropperModal
        open={cropModalOpen}
        imageSrc={rawUploadSource || compressedPreview}
        title="Atur Posisi & Ukuran Foto Galeri"
        targetAspect={4 / 3}
        targetLabel="4:3 Foto Galeri"
        onClose={() => setCropModalOpen(false)}
        onConfirm={(croppedWebp) => {
          setCompressedPreview(croppedWebp);
          const approxBytes = Math.round((croppedWebp.length * 3) / 4);
          setCompressedInfo(`WebP ter-crop · ~${formatFileSizeKB(approxBytes)}`);
        }}
      />
    </div>
  );
}
