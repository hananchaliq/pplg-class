import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import { sanitizeText } from "@/lib/domain-logic";
import type { ContentStatus, MomentPhase, MomentRow, StudentRow } from "@/lib/types";

export type MediaChannel = "hero3d" | "yearbook" | "gallery";

export const MEDIA_CHANNEL_PREFIXES: Record<MediaChannel, `${MediaChannel}/`> = {
  hero3d: "hero3d/",
  yearbook: "yearbook/",
  gallery: "gallery/",
};

export interface MediaItem {
  id: string;
  channel: MediaChannel;
  title: string;
  caption: string;
  category: string;
  phase: MomentPhase;
  takenAt: string;
  uploaderName: string;
  /** Khusus channel yearbook (ID Card Siswa / Sahabat Istimewa / Sampul & Foto Bersama) */
  studentName?: string;
  studentId?: string;
  featured: boolean;
  status: ContentStatus;
  /** URL publik Vercel Blob (*.public.blob.vercel-storage.com) atau fallback lokal */
  url: string;
  /** Path berkas di dalam Vercel Blob, mis. hero3d/171000-foto.webp */
  pathname: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface MediaManifest {
  version: 1;
  updatedAt: string;
  items: MediaItem[];
}

export interface UploadMediaInput {
  channel: MediaChannel;
  buffer?: Buffer;
  contentType?: string;
  fileName?: string;
  /** Opsional: pakai URL yang sudah ada (mis. pilih foto yang ada untuk slot Buku Kenangan) */
  existingUrl?: string;
  title?: string;
  caption: string;
  category?: string;
  phase?: MomentPhase;
  takenAt?: string;
  uploaderName?: string;
  studentName?: string;
  studentId?: string;
  featured?: boolean;
  status?: ContentStatus;
  replaceExistingCategory?: boolean;
}

const MANIFEST_PATHNAME = "manifest.json";
const LOCAL_FALLBACK_DIR = path.join(process.cwd(), ".data");
const LOCAL_FALLBACK_MANIFEST = path.join(
  LOCAL_FALLBACK_DIR,
  "vercel-blob-manifest.json"
);

/**
 * Fallback media lokal aman jika manifest.json di Vercel Blob masih kosong
 * agar scene 3D Polaroid, Buku Kenangan, dan Koran Galeri tetap terisi rapi tanpa error.
 */
export const DEFAULT_LOCAL_MEDIA_FALLBACK: MediaItem[] = [
  {
    id: "fallback-hero-1",
    channel: "hero3d",
    title: "Foto Hero 3D | XII PPLG 1",
    caption: "Kebersamaan Keluarga Besar XII PPLG 1 di MAKN Ende",
    category: "Foto Hero 3D",
    phase: "XII",
    takenAt: "2026-03-10",
    uploaderName: "Arsip XII PPLG 1",
    featured: true,
    status: "approved",
    url: "/api/moment-illustration?title=Kebersamaan+XII+PPLG+1&phase=XII&category=Foto+Hero+3D&seed=101",
    pathname: "hero3d/default-hero-1.webp",
    createdAt: "2026-03-10T08:00:00.000Z",
  },
  {
    id: "fallback-yearbook-cover",
    channel: "yearbook",
    title: "Foto Sampul Buku | XII PPLG 1",
    caption: "Keluarga Besar UNO · XII PPLG 1 MAKN Ende (2024–2027)",
    category: "Foto Sampul Buku",
    phase: "XII",
    takenAt: "2026-04-01",
    uploaderName: "Arsip XII PPLG 1",
    featured: true,
    status: "approved",
    url: "/api/moment-illustration?title=Keluarga+Besar+UNO+XII+PPLG+1&phase=XII&category=Foto+Sampul+Buku&seed=202",
    pathname: "yearbook/default-cover.webp",
    createdAt: "2026-04-01T08:00:00.000Z",
  },
  {
    id: "fallback-gallery-x",
    channel: "gallery",
    title: "Momen Kelas | XII PPLG 1",
    caption: "Hari pertama orientasi jurusan PPLG dan baris kode perdana di ruang lab madrasah.",
    category: "Kebersamaan Kelas",
    phase: "X",
    takenAt: "2024-07-18",
    uploaderName: "Arsip XII PPLG 1",
    featured: true,
    status: "approved",
    url: "/api/moment-illustration?title=Orientasi+Kelas+X+PPLG+1&phase=X&category=Kebersamaan+Kelas&seed=301",
    pathname: "gallery/default-kelas-x.webp",
    createdAt: "2024-07-18T08:00:00.000Z",
  },
  {
    id: "fallback-gallery-xi",
    channel: "gallery",
    title: "Praktikum & Koding | XII PPLG 1",
    caption: "Begadang merakit proyek aplikasi dan persiapan PKL bersama satu angkatan.",
    category: "Praktikum & Koding",
    phase: "XI",
    takenAt: "2025-09-12",
    uploaderName: "Arsip XII PPLG 1",
    featured: true,
    status: "approved",
    url: "/api/moment-illustration?title=Praktikum+Lab+Kelas+XI&phase=XI&category=Praktikum+%26+Koding&seed=302",
    pathname: "gallery/default-kelas-xi.webp",
    createdAt: "2025-09-12T08:00:00.000Z",
  },
  {
    id: "fallback-gallery-xii",
    channel: "gallery",
    title: "Perpisahan | XII PPLG 1",
    caption: "Senja terakhir di bangku kelas XII PPLG 1 MAKN Ende sebelum melangkah menuju mimpi masing-masing.",
    category: "Perpisahan",
    phase: "XII",
    takenAt: "2026-04-20",
    uploaderName: "Arsip XII PPLG 1",
    featured: true,
    status: "approved",
    url: "/api/moment-illustration?title=Senja+Terakhir+XII+PPLG+1&phase=XII&category=Perpisahan&seed=303",
    pathname: "gallery/default-kelas-xii.webp",
    createdAt: "2026-04-20T08:00:00.000Z",
  },
];

export function isVercelBlobConfigured(): boolean {
  const token = (process.env.BLOB_READ_WRITE_TOKEN || "").trim();
  return (
    token.length > 10 &&
    !token.includes("ISI_DENGAN_TOKEN") &&
    !token.includes("your-token")
  );
}

export function isVercelBlobUrl(url: string): boolean {
  return /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//i.test(
    (url || "").trim()
  );
}

export function normalizeChannel(
  channel?: string | null,
  category?: string | null
): MediaChannel {
  const c = (channel || "").trim().toLowerCase();
  if (c === "hero3d" || c === "hero") return "hero3d";
  if (c === "yearbook" || c === "kenangan") return "yearbook";
  if (c === "gallery" || c === "galeri") return "gallery";

  const cat = (category || "").trim();
  if (cat === "Foto Hero 3D") return "hero3d";
  if (
    cat === "Foto Sampul Buku" ||
    cat === "Foto Bersama Kelas" ||
    cat === "ID Card Sahabat Istimewa" ||
    cat === "ID Card Siswa"
  ) {
    return "yearbook";
  }
  return "gallery";
}

function defaultCategoryForChannel(channel: MediaChannel): string {
  if (channel === "hero3d") return "Foto Hero 3D";
  if (channel === "yearbook") return "Foto Bersama Kelas";
  return "Kebersamaan Kelas";
}

function slugifyFileSegment(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "foto-kelas"
  );
}

async function readLocalFallbackManifest(): Promise<MediaManifest> {
  try {
    const raw = await fs.readFile(LOCAL_FALLBACK_MANIFEST, "utf8");
    const parsed = JSON.parse(raw) as Partial<MediaManifest>;
    if (Array.isArray(parsed.items)) {
      return {
        version: 1,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        items: parsed.items,
      };
    }
  } catch {
    // Belum ada file manifest lokal
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: [],
  };
}

async function writeLocalFallbackManifest(manifest: MediaManifest): Promise<void> {
  try {
    await fs.mkdir(LOCAL_FALLBACK_DIR, { recursive: true });
    await fs.writeFile(
      LOCAL_FALLBACK_MANIFEST,
      JSON.stringify(manifest, null, 2),
      "utf8"
    );
  } catch {
    // Abaikan jika filesystem bersifat read-only
  }
}

/**
 * Membaca file manifest.json langsung dari Vercel Blob (dengan fallback lokal aman jika token belum diisi).
 */
export async function readRawMediaManifest(): Promise<{
  manifest: MediaManifest;
  storage: "vercel-blob" | "local-fallback";
}> {
  if (!isVercelBlobConfigured()) {
    const local = await readLocalFallbackManifest();
    return { manifest: local, storage: "local-fallback" };
  }

  try {
    const { blobs } = await list({ prefix: MANIFEST_PATHNAME, limit: 20 });
    const exactManifestBlob =
      blobs.find((b) => b.pathname === MANIFEST_PATHNAME) ??
      blobs.find((b) => b.pathname.endsWith(MANIFEST_PATHNAME));

    if (!exactManifestBlob?.url) {
      return {
        manifest: {
          version: 1,
          updatedAt: new Date().toISOString(),
          items: [],
        },
        storage: "vercel-blob",
      };
    }

    const res = await fetch(
      `${exactManifestBlob.url}${exactManifestBlob.url.includes("?") ? "&" : "?"}t=${Date.now()}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return {
        manifest: {
          version: 1,
          updatedAt: new Date().toISOString(),
          items: [],
        },
        storage: "vercel-blob",
      };
    }

    const parsed = (await res.json()) as Partial<MediaManifest>;
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return {
      manifest: {
        version: 1,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        items,
      },
      storage: "vercel-blob",
    };
  } catch {
    const local = await readLocalFallbackManifest();
    return { manifest: local, storage: "local-fallback" };
  }
}

/**
 * Menyimpan manifest.json yang sudah diperbarui ke Vercel Blob (allowOverwrite: true).
 */
export async function writeMediaManifest(
  items: MediaItem[]
): Promise<MediaManifest> {
  const manifest: MediaManifest = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  };

  if (!isVercelBlobConfigured()) {
    await writeLocalFallbackManifest(manifest);
    return manifest;
  }

  await put(MANIFEST_PATHNAME, JSON.stringify(manifest, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });

  return manifest;
}

/**
 * Ambil seluruh item media (dengan fallback lokal aman jika manifest masih kosong).
 */
export async function getMediaManifest(options?: {
  includeFallbackIfEmpty?: boolean;
  includePending?: boolean;
  channel?: MediaChannel;
}): Promise<{
  items: MediaItem[];
  storage: "vercel-blob" | "local-fallback";
  isFallback: boolean;
}> {
  const { manifest, storage } = await readRawMediaManifest();
  const hasRealItems = manifest.items.length > 0;
  const sourceItems =
    hasRealItems || options?.includeFallbackIfEmpty === false
      ? manifest.items
      : DEFAULT_LOCAL_MEDIA_FALLBACK;

  let filtered = sourceItems;
  if (!options?.includePending) {
    filtered = filtered.filter((item) => item.status === "approved");
  }
  if (options?.channel) {
    filtered = filtered.filter((item) => item.channel === options.channel);
  }

  return {
    items: filtered,
    storage,
    isFallback: !hasRealItems && options?.includeFallbackIfEmpty !== false,
  };
}

/**
 * Ambil item media berdasarkan 1 kanal spesifik (`hero3d`, `yearbook`, atau `gallery`).
 */
export async function getMediaByChannel(
  channel: MediaChannel,
  options?: { includeFallbackIfEmpty?: boolean; includePending?: boolean }
): Promise<MediaItem[]> {
  const res = await getMediaManifest({
    channel,
    includeFallbackIfEmpty: options?.includeFallbackIfEmpty ?? true,
    includePending: options?.includePending ?? false,
  });
  return res.items;
}

/**
 * Konversi data URL base64 menjadi Buffer + mimeType untuk diunggah ke Vercel Blob.
 */
export function parseImageDataUrl(dataUrl: string): {
  buffer: Buffer;
  contentType: string;
  extension: string;
} {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
  if (!match) {
    throw new Error("Format data gambar tidak valid (harus base64 image).");
  }
  const contentType = match[1]!.toLowerCase();
  const buffer = Buffer.from(match[2]!, "base64");
  const extension = contentType.includes("webp")
    ? "webp"
    : contentType.includes("png")
      ? "png"
      : "jpg";
  return { buffer, contentType, extension };
}

/**
 * Unggah berkas gambar terkompresi ke Vercel Blob (di bawah prefix hero3d/, yearbook/, atau gallery/)
 * dan perbarui manifest.json secara atomik.
 */
export async function uploadMediaToBlob(
  input: UploadMediaInput
): Promise<{
  item: MediaItem;
  manifest: MediaManifest;
  storage: "vercel-blob" | "local-fallback";
}> {
  const cleanField = (val: string, maxLen: number) =>
    sanitizeText(val).slice(0, maxLen);

  const channel = normalizeChannel(input.channel, input.category);
  const category = cleanField(
    input.category || defaultCategoryForChannel(channel),
    80
  );
  const caption = cleanField(
    input.caption || "Dokumentasi Kenangan XII PPLG 1 MAKN Ende",
    260
  );
  const uploaderName = cleanField(
    input.uploaderName || "Admin XII PPLG 1",
    80
  );
  const title = cleanField(
    input.title || `${category} | ${uploaderName}`,
    140
  );
  const phase: MomentPhase =
    input.phase === "X" || input.phase === "XI" || input.phase === "XII"
      ? input.phase
      : "XII";
  const takenAt = cleanField(
    input.takenAt || new Date().toISOString().slice(0, 10),
    32
  );
  const studentName = input.studentName
    ? cleanField(input.studentName, 100)
    : undefined;
  const studentId = input.studentId
    ? cleanField(input.studentId, 80)
    : undefined;
  const status: ContentStatus = input.status || "approved";
  const featured = input.featured ?? true;

  const { manifest: currentManifest, storage } = await readRawMediaManifest();
  const prefix = MEDIA_CHANNEL_PREFIXES[channel];
  const slug = slugifyFileSegment(
    input.fileName || studentName || category || caption
  );
  const timestamp = Date.now();
  const ext =
    input.contentType?.includes("png")
      ? "png"
      : input.contentType?.includes("jpeg") || input.contentType?.includes("jpg")
        ? "jpg"
        : "webp";
  const pathname = `${prefix}${timestamp}-${slug}.${ext}`;

  let finalUrl = (input.existingUrl || "").trim();
  let finalPathname = pathname;
  let sizeBytes = input.buffer?.byteLength;

  if (input.buffer && input.buffer.byteLength > 0) {
    if (isVercelBlobConfigured()) {
      const uploaded = await put(pathname, input.buffer, {
        access: "public",
        contentType: input.contentType || "image/webp",
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      finalUrl = uploaded.url;
      finalPathname = uploaded.pathname;
    } else {
      // Fallback aman saat dev lokal tanpa BLOB_READ_WRITE_TOKEN
      const mime = input.contentType || "image/webp";
      finalUrl = `data:${mime};base64,${input.buffer.toString("base64")}`;
      finalPathname = pathname;
    }
  }

  if (!finalUrl) {
    throw new Error("Berkas gambar atau URL foto wajib tersedia untuk diunggah.");
  }

  const nowIso = new Date().toISOString();
  const newItem: MediaItem = {
    id: crypto.randomUUID(),
    channel,
    title,
    caption,
    category,
    phase,
    takenAt,
    uploaderName,
    ...(studentName ? { studentName } : {}),
    ...(studentId ? { studentId } : {}),
    featured,
    status,
    url: finalUrl,
    pathname: finalPathname,
    ...(typeof sizeBytes === "number" ? { sizeBytes } : {}),
    createdAt: nowIso,
  };

  let nextItems = [...currentManifest.items];

  // Jika replaceExistingCategory aktif (mis. Foto Sampul Buku), ganti entri kategori yang sama
  if (input.replaceExistingCategory && category) {
    const replaced = nextItems.filter(
      (i) => i.channel === channel && i.category === category
    );
    nextItems = nextItems.filter(
      (i) => !(i.channel === channel && i.category === category)
    );
    // Hapus blob lama bila berbeda URL agar hemat kuota storage
    if (isVercelBlobConfigured()) {
      for (const old of replaced) {
        if (old.url !== finalUrl && isVercelBlobUrl(old.url)) {
          const stillReferenced = nextItems.some((x) => x.url === old.url);
          if (!stillReferenced) {
            await del(old.url).catch(() => {});
          }
        }
      }
    }
  }

  // Jika mengunggah foto ID Card / Sahabat Istimewa untuk siswa tertentu, perbarui entri siswa tersebut
  if (channel === "yearbook" && (studentId || studentName)) {
    const targetNameLower = studentName?.toLowerCase();
    const prevStudentPhotos = nextItems.filter(
      (i) =>
        i.channel === "yearbook" &&
        ((studentId && i.studentId === studentId) ||
          (targetNameLower && i.studentName?.toLowerCase() === targetNameLower))
    );
    if (prevStudentPhotos.length > 0 && category.startsWith("ID Card")) {
      nextItems = nextItems.filter((i) => !prevStudentPhotos.includes(i));
      if (isVercelBlobConfigured()) {
        for (const old of prevStudentPhotos) {
          if (old.url !== finalUrl && isVercelBlobUrl(old.url)) {
            const stillUsed = nextItems.some((x) => x.url === old.url);
            if (!stillUsed) {
              await del(old.url).catch(() => {});
            }
          }
        }
      }
    }
  }

  nextItems = [newItem, ...nextItems];
  const savedManifest = await writeMediaManifest(nextItems);

  return {
    item: newItem,
    manifest: savedManifest,
    storage,
  };
}

/**
 * Perbarui status moderasi atau caption item di manifest.json Vercel Blob.
 */
export async function updateMediaItemInManifest(
  id: string,
  patch: Partial<Pick<MediaItem, "status" | "caption" | "category" | "phase" | "featured">>
): Promise<boolean> {
  const { manifest } = await readRawMediaManifest();
  const idx = manifest.items.findIndex((item) => item.id === id);
  if (idx < 0) return false;

  const current = manifest.items[idx]!;
  const updated: MediaItem = {
    ...current,
    ...(patch.status ? { status: patch.status } : {}),
    ...(typeof patch.caption === "string"
      ? { caption: sanitizeText(patch.caption).slice(0, 260) }
      : {}),
    ...(typeof patch.category === "string"
      ? { category: sanitizeText(patch.category).slice(0, 80) }
      : {}),
    ...(patch.phase ? { phase: patch.phase } : {}),
    ...(typeof patch.featured === "boolean" ? { featured: patch.featured } : {}),
  };

  const nextItems = [...manifest.items];
  nextItems[idx] = updated;
  await writeMediaManifest(nextItems);
  return true;
}

/**
 * Hapus berkas gambar dari Vercel Blob (`del`) dan bersihkan entrinya dari manifest.json.
 */
export async function deleteMediaFromBlob(
  idOrUrl: { id?: string; url?: string }
): Promise<{
  deleted: boolean;
  removedItem: MediaItem | null;
  manifest: MediaManifest;
}> {
  const { manifest } = await readRawMediaManifest();
  const target = manifest.items.find(
    (item) =>
      (idOrUrl.id && item.id === idOrUrl.id) ||
      (idOrUrl.url && item.url === idOrUrl.url)
  );

  if (!target) {
    // Jika admin mengirim URL blob langsung di luar manifest, coba hapus blobnya juga
    if (idOrUrl.url && isVercelBlobConfigured() && isVercelBlobUrl(idOrUrl.url)) {
      await del(idOrUrl.url).catch(() => {});
      return { deleted: true, removedItem: null, manifest };
    }
    return { deleted: false, removedItem: null, manifest };
  }

  const nextItems = manifest.items.filter((item) => item.id !== target.id);

  // Hapus file fisik di Vercel Blob hanya jika tidak ada item manifest lain yang masih merujuk URL sama
  const stillReferenced = nextItems.some((item) => item.url === target.url);
  if (!stillReferenced && isVercelBlobConfigured() && isVercelBlobUrl(target.url)) {
    await del(target.url).catch(() => {});
  }

  const savedManifest = await writeMediaManifest(nextItems);
  return {
    deleted: true,
    removedItem: target,
    manifest: savedManifest,
  };
}

/**
 * Konversi MediaItem dari manifest Vercel Blob menjadi MomentRow
 * agar 100% kompatibel dengan 3D Hero Polaroid, Buku Kenangan, Koran Galeri, dan Lightbox.
 */
export function mediaItemToMomentRow(item: MediaItem): MomentRow {
  return {
    id: item.id,
    image_url: item.url,
    caption: item.caption,
    taken_at: item.takenAt,
    category: item.category,
    phase: item.phase,
    uploader_name: item.uploaderName,
    featured: item.featured,
    status: item.status,
    created_at: item.createdAt,
  };
}

/**
 * Terapkan foto ID Card / Sahabat Istimewa dari channel `yearbook/` pada manifest.json
 * ke daftar StudentRow agar perubahan foto langsung terlihat di ID Card 3D/2D & Buku Kenangan.
 */
export function applyYearbookMediaToStudents(
  students: StudentRow[],
  mediaItems: MediaItem[]
): StudentRow[] {
  const yearbookPortraits = mediaItems.filter(
    (item) =>
      item.channel === "yearbook" &&
      item.status === "approved" &&
      (item.studentId || item.studentName)
  );
  if (yearbookPortraits.length === 0) return students;

  return students.map((stu) => {
    const matched = yearbookPortraits.find(
      (item) =>
        (item.studentId && item.studentId === stu.id) ||
        (item.studentName &&
          (item.studentName.toLowerCase() === stu.full_name.toLowerCase() ||
            item.studentName.toLowerCase() === stu.nickname.toLowerCase()))
    );
    if (!matched) return stu;
    return {
      ...stu,
      photo_url: matched.url,
      show_photo: true,
    };
  });
}
