"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Crop,
  FlipHorizontal,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Check,
  X,
  Move,
} from "lucide-react";

export type CropPresetRatio =
  | "target"
  | "original"
  | "1:1"
  | "4:3"
  | "16:10"
  | "3:4";

export interface ImageCropperModalProps {
  open: boolean;
  imageSrc: string | null;
  title?: string;
  /** Rasio target default, misal 1 untuk ID Card, 4/3 untuk Polaroid, 16/10 untuk Sampul/Hero/Karya */
  targetAspect?: number;
  targetLabel?: string;
  /** Tampilkan panduan lingkaran wajah ketika rasio 1:1 untuk ID Card */
  showCircleGuide?: boolean;
  maxOutputSide?: number;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm?: (croppedWebpDataUrl: string) => void;
  onComplete?: (croppedWebpDataUrl: string) => void;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

export function ImageCropperModal({
  open,
  imageSrc,
  title = "Atur Posisi & Ukuran Foto (Crop Mandiri)",
  targetAspect = 4 / 3,
  targetLabel = "Rasio Target",
  showCircleGuide = false,
  maxOutputSide = 1400,
  onClose,
  onCancel,
  onConfirm,
  onComplete,
}: ImageCropperModalProps) {
  const handleClose = React.useCallback(() => {
    onClose?.();
    onCancel?.();
  }, [onClose, onCancel]);

  const handleDone = React.useCallback(
    (dataUrl: string) => {
      onConfirm?.(dataUrl);
      onComplete?.(dataUrl);
    },
    [onConfirm, onComplete]
  );

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [naturalSize, setNaturalSize] = React.useState({ w: 800, h: 600 });
  const [ratioMode, setRatioMode] = React.useState<CropPresetRatio>("target");
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState<0 | 90 | 180 | 270>(0);
  const [flipH, setFlipH] = React.useState(false);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [processing, setProcessing] = React.useState(false);

  // State interaksi geser (Mouse & Jari HP) dan Pinch-to-Zoom 2 jari
  const dragRef = React.useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const activePointersRef = React.useRef<Map<number, { x: number; y: number }>>(
    new Map()
  );
  const pinchRef = React.useRef<{ initialDist: number; initialZoom: number } | null>(
    null
  );

  // Muat objek gambar saat modal dibuka
  React.useEffect(() => {
    if (!open || !imageSrc) return;
    setImgLoaded(false);
    setRatioMode("target");
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setOffset({ x: 0, y: 0 });

    const img = new window.Image();
    if (imageSrc.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      imgRef.current = img;
      setNaturalSize({
        w: Math.max(1, img.naturalWidth || img.width || 800),
        h: Math.max(1, img.naturalHeight || img.height || 600),
      });
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  // Hitung rasio aktif berdasarkan pilihan pengguna
  const effectiveAspect = React.useMemo(() => {
    const isRotated90 = rotation === 90 || rotation === 270;
    const rotW = isRotated90 ? naturalSize.h : naturalSize.w;
    const rotH = isRotated90 ? naturalSize.w : naturalSize.h;
    const origAspect = rotW / Math.max(1, rotH);

    switch (ratioMode) {
      case "target":
        return targetAspect;
      case "original":
        return origAspect;
      case "1:1":
        return 1;
      case "4:3":
        return 4 / 3;
      case "16:10":
        return 16 / 10;
      case "3:4":
        return 3 / 4;
      default:
        return targetAspect;
    }
  }, [ratioMode, targetAspect, naturalSize, rotation]);

  // Ukuran viewport kanvas pratinjau agar pas di layar HP maupun Desktop
  const viewportSize = React.useMemo(() => {
    const maxW = 480;
    const maxH = 360;
    if (effectiveAspect >= maxW / maxH) {
      const w = maxW;
      const h = Math.round(maxW / effectiveAspect);
      return { w, h: Math.max(180, h) };
    } else {
      const h = maxH;
      const w = Math.round(maxH * effectiveAspect);
      return { w: Math.max(180, w), h };
    }
  }, [effectiveAspect]);

  // Hitung batas geser maksimum agar gambar selalu menutup penuh bingkai crop
  const clampOffset = React.useCallback(
    (
      nextX: number,
      nextY: number,
      curZoom = zoom,
      curRot = rotation,
      vp = viewportSize
    ) => {
      const isRotated90 = curRot === 90 || curRot === 270;
      const srcW = isRotated90 ? naturalSize.h : naturalSize.w;
      const srcH = isRotated90 ? naturalSize.w : naturalSize.h;

      const baseScale = Math.max(vp.w / Math.max(1, srcW), vp.h / Math.max(1, srcH));
      const drawnW = srcW * baseScale * curZoom;
      const drawnH = srcH * baseScale * curZoom;

      const maxX = Math.max(0, (drawnW - vp.w) / 2);
      const maxY = Math.max(0, (drawnH - vp.h) / 2);

      return {
        x: Math.min(maxX, Math.max(-maxX, nextX)),
        y: Math.min(maxY, Math.max(-maxY, nextY)),
      };
    },
    [zoom, rotation, viewportSize, naturalSize]
  );

  // Jaga agar offset selalu valid saat zoom/rotasi/rasio berubah
  React.useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y));
  }, [zoom, rotation, effectiveAspect, clampOffset]);

  // Gambar pratinjau interaktif di kanvas
  React.useEffect(() => {
    if (!open || !imgLoaded || !imgRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w: vpW, h: vpH } = viewportSize;
    canvas.width = vpW;
    canvas.height = vpH;

    ctx.clearRect(0, 0, vpW, vpH);
    ctx.fillStyle = "#161614";
    ctx.fillRect(0, 0, vpW, vpH);

    const img = imgRef.current;
    const isRotated90 = rotation === 90 || rotation === 270;
    const srcW = isRotated90 ? naturalSize.h : naturalSize.w;
    const srcH = isRotated90 ? naturalSize.w : naturalSize.h;
    const baseScale = Math.max(vpW / Math.max(1, srcW), vpH / Math.max(1, srcH));
    const finalScale = baseScale * zoom;

    ctx.save();
    ctx.translate(vpW / 2 + offset.x, vpH / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -finalScale : finalScale, finalScale);
    ctx.drawImage(img, -naturalSize.w / 2, -naturalSize.h / 2);
    ctx.restore();

    // Gambar garis bantu Rule of Thirds tipis
    ctx.save();
    ctx.strokeStyle = "rgba(232, 229, 220, 0.36)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(vpW / 3, 0);
    ctx.lineTo(vpW / 3, vpH);
    ctx.moveTo((vpW * 2) / 3, 0);
    ctx.lineTo((vpW * 2) / 3, vpH);
    ctx.moveTo(0, vpH / 3);
    ctx.lineTo(vpW, vpH / 3);
    ctx.moveTo(0, (vpH * 2) / 3);
    ctx.lineTo(vpW, (vpH * 2) / 3);
    ctx.stroke();

    // Jika mode ID Card (1:1 & showCircleGuide), tampilkan panduan lingkaran wajah
    if (showCircleGuide && Math.abs(effectiveAspect - 1) < 0.05) {
      const radius = Math.min(vpW, vpH) * 0.44;
      ctx.strokeStyle = "rgba(232, 229, 220, 0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(vpW / 2, vpH / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Bingkai tepi dalam
    ctx.strokeStyle = "rgba(232, 229, 220, 0.88)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, vpW - 2, vpH - 2);
    ctx.restore();
  }, [
    open,
    imgLoaded,
    viewportSize,
    naturalSize,
    zoom,
    rotation,
    flipH,
    offset,
    showCircleGuide,
    effectiveAspect,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      pinchRef.current = { initialDist: Math.max(10, dist), initialZoom: zoom };
      dragRef.current.active = false;
      return;
    }

    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Gestur cubit 2 jari (Pinch-to-Zoom di HP)
    if (activePointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      const ratio = dist / pinchRef.current.initialDist;
      const nextZoom = Math.min(3.5, Math.max(1, pinchRef.current.initialZoom * ratio));
      setZoom(Number(nextZoom.toFixed(2)));
      return;
    }

    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = viewportSize.w / Math.max(1, rect.width);
    const scaleY = viewportSize.h / Math.max(1, rect.height);

    const dx = (e.clientX - dragRef.current.startX) * scaleX;
    const dy = (e.clientY - dragRef.current.startY) * scaleY;

    setOffset(
      clampOffset(dragRef.current.origX + dx, dragRef.current.origY + dy)
    );
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (dragRef.current.pointerId === e.pointerId) {
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) =>
      Number(Math.min(3.5, Math.max(1, prev + delta)).toFixed(2))
    );
  };

  const handleConfirmCrop = () => {
    if (!imgRef.current) return;
    setProcessing(true);
    try {
      const img = imgRef.current;
      const { w: vpW, h: vpH } = viewportSize;

      // Hitung ukuran kanvas output beresolusi tinggi sesuai rasio
      let outW = maxOutputSide;
      let outH = Math.round(maxOutputSide / effectiveAspect);
      if (outH > maxOutputSide) {
        outH = maxOutputSide;
        outW = Math.round(maxOutputSide * effectiveAspect);
      }

      const outCanvas = document.createElement("canvas");
      outCanvas.width = Math.max(1, outW);
      outCanvas.height = Math.max(1, outH);
      const outCtx = outCanvas.getContext("2d");
      if (!outCtx) {
        setProcessing(false);
        return;
      }

      const ratioOutToVp = outW / vpW;
      const isRotated90 = rotation === 90 || rotation === 270;
      const srcW = isRotated90 ? naturalSize.h : naturalSize.w;
      const srcH = isRotated90 ? naturalSize.w : naturalSize.h;
      const baseScale = Math.max(vpW / Math.max(1, srcW), vpH / Math.max(1, srcH));
      const finalScale = baseScale * zoom * ratioOutToVp;

      outCtx.save();
      outCtx.translate(
        outW / 2 + offset.x * ratioOutToVp,
        outH / 2 + offset.y * ratioOutToVp
      );
      outCtx.rotate((rotation * Math.PI) / 180);
      outCtx.scale(flipH ? -finalScale : finalScale, finalScale);
      outCtx.drawImage(img, -naturalSize.w / 2, -naturalSize.h / 2);
      outCtx.restore();

      const webpDataUrl = outCanvas.toDataURL("image/webp", 0.85);
      handleDone(webpDataUrl);
      handleClose();
    } finally {
      setProcessing(false);
    }
  };

  const aspectPillId = React.useId();

  return (
    <AnimatePresence>
      {open && imageSrc && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#141413]/80 p-3 sm:p-4 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-4 sm:p-5 text-card-foreground shadow-2xl"
          >
            {/* Header Modal Crop */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Editor Gambar Interaktif · HP & Desktop
                </p>
                <h3 className="mt-0.5 font-serif text-lg font-bold text-foreground">
                  {title}
                </h3>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleClose}
                aria-label="Tutup editor foto"
                className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            {/* Pilihan Rasio Ukuran Gambar (Otomatis Target + Manual) dengan sliding layoutId */}
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-muted-foreground">
                Rasio Bingkai Crop (Otomatis menyesuaikan tempat foto, bisa diubah manual):
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "target", label: `Otomatis (${targetLabel})` },
                    { id: "original", label: "Sesuai Ukuran Asli" },
                    { id: "1:1", label: "1:1 (ID Card)" },
                    { id: "4:3", label: "4:3 (Polaroid)" },
                    { id: "16:10", label: "16:10 (Lebar)" },
                    { id: "3:4", label: "3:4 (Potret)" },
                  ] as Array<{ id: CropPresetRatio; label: string }>
                ).map((opt) => {
                  const active = ratioMode === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRatioMode(opt.id)}
                      className={`relative rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? "border-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId={`crop-ratio-${aspectPillId}`}
                          transition={{ type: "spring", stiffness: 380, damping: 28 }}
                          className="absolute inset-0 rounded-md bg-primary"
                        />
                      )}
                      <span className="relative z-10">{opt.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

        {/* Area Kanvas Interaktif Geser Posisi & Cubit/Scroll */}
        <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-border bg-[#161614] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[#D6D2C9]">
            <Move className="size-3.5 text-[#E8E5DC]" />
            <span>
              Geser gambar dengan jari (HP) atau mouse (Desktop) untuk mengatur posisi
            </span>
          </div>

          <div className="relative flex w-full items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
              onWheel={handleWheel}
              className="max-h-[52vh] max-w-full cursor-grab touch-none rounded-lg shadow-lg active:cursor-grabbing"
            />
          </div>
        </div>

        {/* Kontrol Zoom, Putar 90 Derajat, Flip Horizontal, & Reset */}
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                setZoom((z) => Number(Math.max(1, z - 0.15).toFixed(2)))
              }
              aria-label="Perkecil ukuran gambar"
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
            >
              <ZoomOut className="size-4" />
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Ukuran / Zoom Gambar</span>
                <span className="font-mono tabular-nums text-foreground">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={3.5}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-1 w-full accent-primary"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setZoom((z) => Number(Math.min(3.5, z + 0.15).toFixed(2)))
              }
              aria-label="Perbesar ukuran gambar"
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setRotation(
                    (r) => (((r + 270) % 360) as 0 | 90 | 180 | 270)
                  )
                }
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted whitespace-nowrap shrink-0"
              >
                <RotateCcw className="size-3.5" />
                <span>Putar Kiri</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setRotation((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270))
                }
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted whitespace-nowrap shrink-0"
              >
                <RotateCw className="size-3.5" />
                <span>Putar 90°</span>
              </button>
              <button
                type="button"
                onClick={() => setFlipH((f) => !f)}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  flipH
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                <FlipHorizontal className="size-3.5" />
                <span>Balik Horizontal</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setFlipH(false);
                setOffset({ x: 0, y: 0 });
                setRatioMode("target");
              }}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground whitespace-nowrap shrink-0"
            >
              <RefreshCw className="size-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Tombol Batal & Terapkan Crop */}
        <div className="mt-4 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[42px] rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted whitespace-nowrap shrink-0"
          >
            Batal
          </button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            disabled={!imgLoaded || processing}
            onClick={handleConfirmCrop}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Check className="size-4" />
            <span>
              {processing ? "Memproses..." : "Terapkan Posisi & Ukuran"}
            </span>
          </motion.button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { Crop };
