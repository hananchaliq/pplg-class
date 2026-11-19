"use client";

/**
 * Client-Side Smart Image Compression (HTML5 Canvas)
 * - Mempertahankan rasio aspek asli (atau hasil crop dari ImageCropperModal)
 * - Membatasi sisi terpanjang maksimal 1600px
 * - Mengonversi ke format image/webp kualitas 0.82 (~150KB–350KB)
 *   agar wajah tetap tajam (album-friendly) namun ringan di scene 3D & Lightbox.
 */

export const DEFAULT_MAX_IMAGE_DIMENSION = 1600;
export const DEFAULT_WEBP_QUALITY = 0.82;

export interface CompressImageOptions {
  /** Batas dimensi sisi terpanjang (lebar atau tinggi), default 1600px */
  maxDimension?: number;
  /** Kualitas output WebP (0..1), default 0.82 */
  quality?: number;
  /** Nama file dasar opsional (tanpa/dengan ekstensi) */
  fileName?: string;
}

export interface CompressedImageResult {
  blob: Blob;
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

function buildWebpFileName(rawName?: string): string {
  const base = (rawName || `xii-pplg1-${Date.now()}`)
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return `${base || "foto-kelas"}.webp`;
}

function canvasToBlobPromise(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        // Fallback jika browser tidak mendukung toBlob WebP
        try {
          const fallbackUrl = canvas.toDataURL("image/jpeg", quality);
          const fallbackBlob = dataUrlToBlob(fallbackUrl);
          resolve(fallbackBlob);
        } catch (err) {
          reject(err);
        }
      },
      mimeType,
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Gagal mengonversi hasil kompresi ke data URL."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca blob gambar."));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    throw new Error("Format data URL gambar tidak valid.");
  }
  const mimeMatch = parts[0]?.match(/data:([^;]+);base64/i);
  const mime = mimeMatch?.[1] || "image/webp";
  const binary = atob(parts[1] || "");
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function dataUrlToWebpFile(
  dataUrl: string,
  fileName?: string
): File {
  const blob = dataUrlToBlob(dataUrl);
  const finalName = buildWebpFileName(fileName);
  return new File([blob], finalName, {
    type: blob.type || "image/webp",
    lastModified: Date.now(),
  });
}

export function formatFileSizeKB(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Kompres HTMLCanvasElement (misalnya hasil crop dari ImageCropperModal)
 * menjadi WebP 0.82 dengan sisi terpanjang maksimal 1600px.
 */
export async function compressCanvasToWebp(
  sourceCanvas: HTMLCanvasElement,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_IMAGE_DIMENSION;
  const quality = options.quality ?? DEFAULT_WEBP_QUALITY;

  const srcW = Math.max(1, sourceCanvas.width);
  const srcH = Math.max(1, sourceCanvas.height);
  const longest = Math.max(srcW, srcH);
  const scale = longest > maxDimension ? maxDimension / longest : 1;

  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  let targetCanvas = sourceCanvas;
  if (scale < 1) {
    const resized = document.createElement("canvas");
    resized.width = targetW;
    resized.height = targetH;
    const ctx = resized.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);
      targetCanvas = resized;
    }
  }

  // Encode WebP kualitas 0.82; jika foto ekstra padat melebihi 480KB, turunkan sedikit ke 0.76 agar tetap ringan
  let blob = await canvasToBlobPromise(targetCanvas, "image/webp", quality);
  if (blob.size > 480 * 1024 && quality > 0.76) {
    const tighter = await canvasToBlobPromise(targetCanvas, "image/webp", 0.76);
    if (tighter.size < blob.size) {
      blob = tighter;
    }
  }

  const mimeType = blob.type || "image/webp";
  const file = new File([blob], buildWebpFileName(options.fileName), {
    type: mimeType,
    lastModified: Date.now(),
  });
  const dataUrl = await blobToDataUrl(blob);

  return {
    blob,
    file,
    dataUrl,
    width: targetW,
    height: targetH,
    sizeBytes: blob.size,
    mimeType,
  };
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isLocal =
      src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/");
    if (!isLocal) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Gagal memuat gambar untuk kompresi."));
    img.src = src;
  });
}

/**
 * Kompres Data URL atau URL gambar melalui HTML5 Canvas sambil mempertahankan rasio aspek asli.
 */
export async function compressImageDataUrl(
  src: string,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_IMAGE_DIMENSION;
  const img = await loadHtmlImage(src);

  const natW = Math.max(1, img.naturalWidth || img.width);
  const natH = Math.max(1, img.naturalHeight || img.height);
  const longest = Math.max(natW, natH);
  const scale = longest > maxDimension ? maxDimension / longest : 1;

  const targetW = Math.max(1, Math.round(natW * scale));
  const targetH = Math.max(1, Math.round(natH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Browser tidak mendukung HTML5 Canvas 2D.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return compressCanvasToWebp(canvas, {
    ...options,
    maxDimension,
  });
}

/**
 * Kompres berkas File/Blob langsung dari input file HP atau desktop sebelum proses unggah.
 * Mempertahankan rasio aspek asli, sisi terpanjang maks 1600px, format image/webp kualitas 0.82.
 */
export async function compressImageFile(
  file: File | Blob,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const fileName =
      options.fileName || (file instanceof File ? file.name : undefined);
    return await compressImageDataUrl(objectUrl, {
      ...options,
      fileName,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
