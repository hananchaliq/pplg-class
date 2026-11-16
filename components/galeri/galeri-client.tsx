"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Grid,
  Upload,
  X,
  CheckCircle2,
} from "lucide-react";
import { Adaptive } from "@/components/three/adaptive";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SITE_CONTENT } from "@/lib/content";
import {
  useLivePublicData,
  notifyPublicDataUpdated,
} from "@/lib/use-public-data";
import type { MomentPhase, MomentRow } from "@/lib/types";

const GaleriSceneHD = dynamic(
  () =>
    import("@/components/galeri/galeri-scene-hd").then((m) => m.GaleriSceneHD),
  { ssr: false }
);

/**
 * Kompres gambar di sisi klien sebelum upload (WebP, sisi terpanjang maksimal 1600 px)
 */
async function compressImageToWebp(file: File, maxSide = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca berkas gambar"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Berkas bukan gambar yang valid"));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Kanvas kompresi tidak tersedia"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const webpDataUrl = canvas.toDataURL("image/webp", 0.82);
        resolve(webpDataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const PHASES: Array<{ id: MomentPhase; label: string; subtitle: string }> = [
  {
    id: "X",
    label: "Kelas X (Awal Perjumpaan)",
    subtitle: "Masa orientasi madrasah, pengenalan algoritma pertama, dan teman sebangku baru.",
  },
  {
    id: "XI",
    label: "Kelas XI (Masa PKL & Proyek)",
    subtitle: "Praktik Kerja Lapangan, lomba kompetensi, dan malam-malam panjang menyusun kode.",
  },
  {
    id: "XII",
    label: "Kelas XII (Senja Terakhir)",
    subtitle: "Ujian komprehensif, doa bersama, dan detik-detik menjelang perpisahan.",
  },
];

export function GaleriClient({ initialMoments }: { initialMoments: MomentRow[] }) {
  const { data: liveData, refresh } = useLivePublicData({
    moments: initialMoments,
  });
  const moments = liveData?.moments ?? initialMoments;

  const [activePhase, setActivePhase] = React.useState<MomentPhase>("XII");
  const [activeCategory, setActiveCategory] = React.useState<string>("Semua");
  const [showAllGrid, setShowAllGrid] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [selected3DMoment, setSelected3DMoment] =
    React.useState<MomentRow | null>(null);

  // State Paginasi List Momen (Prev / Next Icon) agar tidak capek scroll
  const [momentPage, setMomentPage] = React.useState(1);
  const MOMENTS_PER_PAGE = 8;

  // State Form Unggah Foto
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploaderName, setUploaderName] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [category, setCategory] = React.useState("Momen lucu");
  const [phase, setPhase] = React.useState<MomentPhase>("XII");
  const [classCode, setClassCode] = React.useState("XIIPPLG1");
  const [compressedPreview, setCompressedPreview] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadFeedback, setUploadFeedback] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const isRealPhoto = React.useCallback((url?: string) => {
    const clean = (url || "").trim();
    return clean.length > 0 && !clean.startsWith("/api/moment-illustration");
  }, []);

  // Jika fase aktif belum punya foto asli tetapi fase lain punya foto asli yang diupload, arahkan ke fase yang punya foto asli saat pertama kali dibuka
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
    // Prioritaskan foto yang benar-benar diupload di urutan paling depan
    return [...list].sort(
      (a, b) =>
        (isRealPhoto(b.image_url) ? 1 : 0) - (isRealPhoto(a.image_url) ? 1 : 0)
    );
  }, [moments, activeCategory, isRealPhoto]);

  // Daftar momen yang sedang ditampilkan di bawah (seluruh koleksi atau difilter per fase)
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

  const phaseRackMoments = React.useMemo(() => {
    const inPhase = filteredMoments.filter((m) => m.phase === activePhase);
    const allRealUploaded = filteredMoments.filter((m) =>
      isRealPhoto(m.image_url)
    );
    const combined = [
      ...inPhase.filter((m) => isRealPhoto(m.image_url)),
      ...allRealUploaded.filter((m) => m.phase !== activePhase),
      ...inPhase.filter((m) => !isRealPhoto(m.image_url)),
    ];
    return combined.slice(0, 14);
  }, [filteredMoments, activePhase, isRealPhoto]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToWebp(file, 1600);
      setCompressedPreview(dataUrl);
    } catch {
      setUploadFeedback({
        ok: false,
        text: "Gagal mengompresi foto. Pastikan formatnya JPEG, PNG, atau WebP.",
      });
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUploadFeedback(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "moment",
          uploaderName,
          caption,
          category,
          phase,
          classCode,
          imageDataUrl: compressedPreview || undefined,
          honeypot: "",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setUploadFeedback({
          ok: false,
          text: json.error || "Gagal mengunggah foto momen.",
        });
      } else {
        setUploadFeedback({
          ok: true,
          text: json.message || "Foto berhasil dikirim ke antrean moderasi admin!",
        });
        setCaption("");
        setCompressedPreview("");
        notifyPublicDataUpdated();
        void refresh();
      }
    } catch {
      setUploadFeedback({
        ok: false,
        text: "Gagal menghubungi server. Coba lagi sebentar ya.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentLightboxMoment =
    lightboxIndex !== null ? filteredMoments[lightboxIndex] ?? null : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header Galeri Momen */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Arsip Foto Tiga Tahun · {moments.length} Momen Tersimpan
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
            Tali Polaroid & Dinding Kenangan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Setiap fase punya warnanya sendiri—dari canggungnya hari pertama
            Kelas X hingga hangatnya perpisahan Kelas XII.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowAllGrid((prev) => !prev);
              setMomentPage(1);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted whitespace-nowrap shrink-0"
          >
            <Grid className="size-4 text-[var(--color-chart-1)]" />
            <span>
              {showAllGrid
                ? "Tampilkan Per Fase Kelas"
                : `Semua Fase (${filteredMoments.length})`}
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
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] shadow-sm transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <Upload className="size-4" />
            <span>Unggah Foto Kelas</span>
          </motion.button>
        </div>
      </div>

      {/* Pilihan Timeline Fase (Kelas X, XI, XII) */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PHASES.map((p) => {
          const active = activePhase === p.id;
          return (
            <motion.button
              key={p.id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setActivePhase(p.id);
                setMomentPage(1);
              }}
              className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors ${
                active
                  ? "border-[var(--color-accent-warm)] bg-card shadow-sm"
                  : "border-border bg-card/40 hover:bg-card/80"
              }`}
            >
              <span className="font-serif text-base font-bold text-foreground">
                {p.label}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {p.subtitle}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Filter Kategori dengan Animasi Interaktif */}
      <div
        role="group"
        aria-label="Filter Kategori Momen"
        className="mt-5 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card/60 p-1.5"
      >
        {SITE_CONTENT.momentCategories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <motion.button
              key={cat}
              type="button"
              whileHover={{ y: -1, scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActiveCategory(cat);
                setMomentPage(1);
              }}
              className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? "bg-foreground text-background font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </motion.button>
          );
        })}
      </div>

      {/* Rak Polaroid (Adaptive: 3D Verlet Catenary di Desktop HD, Deret Scroll-Snap Polaroid Kertas Foto Asli di Mobile Simple) */}
      {!showAllGrid && (
        <div className="mt-6">
          <Adaptive
            simple={
              <section
                aria-label={`Deretan Polaroid Fase Kelas ${activePhase}`}
                className="rounded-2xl border border-border bg-card/70 p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-serif text-lg font-bold text-foreground">
                    Jemuran Kertas Foto Kelas {activePhase} ({phaseRackMoments.length} Lembar)
                  </h2>
                  <span className="font-hand text-base text-muted-foreground">
                    Geser ke samping · Ketuk foto untuk perbesar
                  </span>
                </div>

                {/* Tali Jemuran Kayu di Atas Polaroid Mobile */}
                <div className="relative pt-3">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2 right-0 left-0 h-1.5 rounded-full bg-gradient-to-r from-[#8d6b48] via-[#c8a97e] to-[#8d6b48] shadow-sm"
                  />
                  <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-5 pt-4">
                    {phaseRackMoments.map((m, idx) => {
                      const tiltClass =
                        idx % 2 === 0 ? "-rotate-2" : "rotate-2";
                      const globalIdx = filteredMoments.findIndex(
                        (fm) => fm.id === m.id
                      );
                      return (
                        <motion.button
                          key={m.id}
                          type="button"
                          whileHover={{ scale: 1.04, rotate: 0, y: -4 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() =>
                            setLightboxIndex(globalIdx >= 0 ? globalIdx : 0)
                          }
                          className={`real-photo-paper relative w-[242px] shrink-0 snap-center rounded-md p-3 pb-5 pt-4 text-left transition-shadow ${tiltClass}`}
                        >
                          {/* Jepitan Kayu di Tepi Atas */}
                          <span
                            aria-hidden="true"
                            className="absolute -top-3.5 left-1/2 h-5 w-2.5 -translate-x-1/2 rounded-xs border border-[#5c3d24] bg-[#c89662] shadow"
                          />
                          <div className="photo-gloss-sheen relative aspect-[4/3] w-full overflow-hidden rounded-xs border border-[#cbb799] bg-muted shadow-inner">
                            <img
                              src={m.image_url}
                              alt={m.caption}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          </div>
                          <p className="mt-3.5 line-clamp-2 font-hand text-2xl font-bold leading-snug text-foreground">
                            {m.caption}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between font-hand text-base font-bold text-muted-foreground">
                            <span>~ {m.category}</span>
                            <span>{m.taken_at}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </section>
            }
            hd={
              <div className="space-y-4">
                <GaleriSceneHD
                  moments={filteredMoments}
                  activePhase={activePhase}
                  selectedMoment={selected3DMoment}
                  onSelectMoment={setSelected3DMoment}
                />
                {selected3DMoment && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="real-photo-paper flex flex-col items-start justify-between gap-3 rounded-xl p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-hand text-lg font-bold text-muted-foreground">
                        <span>Fase Kelas {selected3DMoment.phase}</span>
                        <span aria-hidden="true">·</span>
                        <span>{selected3DMoment.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{selected3DMoment.taken_at}</span>
                        <span aria-hidden="true">·</span>
                        <span>Ditulis oleh {selected3DMoment.uploader_name}</span>
                      </div>
                      <p className="mt-1 font-hand text-3xl font-bold text-foreground">
                        &ldquo;{selected3DMoment.caption}&rdquo;
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        const idx = filteredMoments.findIndex(
                          (x) => x.id === selected3DMoment.id
                        );
                        if (idx >= 0) setLightboxIndex(idx);
                      }}
                      className="min-h-[40px] rounded-lg border border-border bg-background px-3.5 py-2 font-hand text-lg font-bold text-foreground hover:bg-muted whitespace-nowrap shrink-0"
                    >
                      Lihat Lembar Foto Penuh →
                    </motion.button>
                  </motion.div>
                )}
              </div>
            }
          />
        </div>
      )}

      {/* Daftar Momen Terpaginasi Bervisual Kertas Foto Cetak Asli & Font Tulisan Tangan */}
      <section aria-labelledby="all-photos-heading" className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2
              id="all-photos-heading"
              className="font-serif text-xl font-bold text-foreground"
            >
              {showAllGrid
                ? `Seluruh Koleksi Lembar Foto (${listSourceMoments.length} Momen)`
                : `Album Kertas Foto Kelas ${activePhase} (${listSourceMoments.length} Momen)`}
            </h2>
            <p className="font-hand text-lg text-muted-foreground">
              Menampilkan {MOMENTS_PER_PAGE} lembar kertas foto per halaman — ketuk foto untuk melihat catatan tulisan tangan di baliknya.
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
            className="font-hand text-xl font-bold text-[var(--color-accent-warm)] hover:underline whitespace-nowrap"
          >
            {showAllGrid
              ? `← Filter Hanya Kelas ${activePhase}`
              : `Gabungkan Semua ${filteredMoments.length} Lembar Foto →`}
          </motion.button>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {pagedMoments.map((m, idx) => {
            const globalIdx = filteredMoments.findIndex((x) => x.id === m.id);
            const naturalRot = ((idx % 4) - 1.5) * 1.1;
            return (
              <motion.button
                key={m.id}
                type="button"
                initial={{ opacity: 0, y: 14, rotate: naturalRot }}
                animate={{ opacity: 1, y: 0, rotate: naturalRot }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                whileHover={{ y: -6, rotate: 0, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setLightboxIndex(globalIdx >= 0 ? globalIdx : 0)}
                className="real-photo-paper group relative flex flex-col justify-between rounded-md p-3.5 pb-5 pt-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {/* Jepitan Kayu di Atas Bingkai Kertas Foto */}
                <span
                  aria-hidden="true"
                  className="absolute -top-2.5 left-1/2 h-4 w-2.5 -translate-x-1/2 rounded-xs border border-[#5c3d24] bg-[#c89662] shadow-sm transition-transform group-hover:scale-110"
                />
                <div>
                  <div className="photo-gloss-sheen relative aspect-[4/3] w-full overflow-hidden rounded-xs border border-[#cbb799] bg-muted shadow-inner dark:border-[#544030]">
                    <img
                      src={m.image_url}
                      alt={m.caption}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  {/* Tulisan Tangan Spidol di Dagu Kertas Polaroid */}
                  <p className="mt-3.5 line-clamp-2 font-hand text-2xl font-bold leading-snug text-foreground">
                    {m.caption}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#cbb799]/70 pt-2 font-hand text-base font-bold text-muted-foreground dark:border-[#544030]">
                  <span>
                    ~ Kelas {m.phase} · {m.category}
                  </span>
                  <span>{m.taken_at}</span>
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

      {/* Modal Lightbox Bervisual Kertas Foto Fisik Asli & Tulisan Tangan */}
      {currentLightboxMoment && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Peninjau Lembar Kertas Foto Ukuran Penuh"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: -1 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="real-photo-paper relative flex w-full max-w-3xl flex-col overflow-hidden rounded-xl p-4 pb-6 text-card-foreground shadow-2xl sm:p-6 sm:pb-8"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 font-hand text-xl font-bold text-muted-foreground">
                <span>Fase Kelas {currentLightboxMoment.phase}</span>
                <span aria-hidden="true">·</span>
                <span>{currentLightboxMoment.category}</span>
                <span aria-hidden="true">·</span>
                <span>{currentLightboxMoment.taken_at}</span>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06, rotate: 90 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Tutup foto"
                onClick={() => setLightboxIndex(null)}
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border bg-background/80 text-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            <div className="photo-gloss-sheen relative aspect-[16/10] w-full overflow-hidden rounded-sm border-2 border-[#cbb799] bg-black/90 shadow-inner dark:border-[#544030]">
              <img
                src={currentLightboxMoment.image_url}
                alt={currentLightboxMoment.caption}
                referrerPolicy="no-referrer"
                className="size-full object-contain"
              />
            </div>

            <div className="mt-5 flex flex-col justify-between gap-4 border-t border-dashed border-[#cbb799] pt-4 sm:flex-row sm:items-center dark:border-[#544030]">
              <div>
                <p className="font-hand text-3xl font-bold leading-snug text-foreground">
                  &ldquo;{currentLightboxMoment.caption}&rdquo;
                </p>
                <p className="mt-1 font-hand text-lg font-bold text-muted-foreground">
                  ~ Diabadikan oleh {currentLightboxMoment.uploader_name} · Lembar Foto{" "}
                  {lightboxIndex + 1} dari {filteredMoments.length} ~
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06, x: -2 }}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Foto sebelumnya"
                  onClick={() =>
                    setLightboxIndex(
                      (lightboxIndex - 1 + filteredMoments.length) %
                        filteredMoments.length
                    )
                  }
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
                >
                  <ChevronLeft className="size-5" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06, x: 2 }}
                  whileTap={{ scale: 0.92 }}
                  aria-label="Foto berikutnya"
                  onClick={() =>
                    setLightboxIndex(
                      (lightboxIndex + 1) % filteredMoments.length
                    )
                  }
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
                >
                  <ChevronRight className="size-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Unggah Foto Momen (Terkompresi WebP Klien) */}
      {uploadOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-moment-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Tambah Koleksi Galeri XII PPLG 1
                </p>
                <h2
                  id="upload-moment-title"
                  className="mt-1 font-serif text-xl font-bold text-foreground"
                >
                  Unggah Foto Kenangan Baru
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
              <div>
                <label
                  htmlFor="up-file"
                  className="block text-xs font-semibold text-foreground"
                >
                  Pilih Foto (Otomatis dikompres ke WebP maks 1600px)
                </label>
                <input
                  id="up-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="mt-1.5 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-foreground"
                />
                {compressedPreview && (
                  <p className="mt-1 text-[11px] text-[var(--color-chart-2)]">
                    ✓ Gambar berhasil dikompresi ke format WebP hemat kuota.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="up-name"
                    className="block text-xs font-semibold text-foreground"
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
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="up-phase"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Fase Kelas
                  </label>
                  <select
                    id="up-phase"
                    value={phase}
                    onChange={(e) => setPhase(e.target.value as MomentPhase)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                    className="block text-xs font-semibold text-foreground"
                  >
                    Kategori Momen
                  </label>
                  <select
                    id="up-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
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
                    className="block text-xs font-semibold text-foreground"
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
                  className="block text-xs font-semibold text-foreground"
                >
                  Cerita / Caption Singkat
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
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-hand text-lg text-foreground"
                />
              </div>

              {uploadFeedback && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-border bg-muted/60 p-3 text-xs text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-warm)]" />
                  <span>{uploadFeedback.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="min-h-[44px] rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--color-accent-warm)] px-5 py-2 text-xs font-semibold text-[#fbf6ec] hover:opacity-90 disabled:opacity-50"
                >
                  <Camera className="size-4" />
                  <span>{submitting ? "Mengirim..." : "Kirim Foto"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
