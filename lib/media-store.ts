import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import { sanitizeText } from "@/lib/domain-logic";
import type {
  ContentStatus,
  DreamCheerRow,
  DreamRow,
  MemoryEntryRow,
  MomentPhase,
  MomentRow,
  PollWithOptions,
  StudentRow,
  TeacherRow,
  ThanksRow,
  WorkRow,
} from "@/lib/types";

export type MediaChannel =
  | "hero3d"
  | "yearbook"
  | "gallery"
  | "karya"
  | "students";

export const MEDIA_CHANNEL_PREFIXES: Record<MediaChannel, `${MediaChannel}/`> = {
  hero3d: "hero3d/",
  yearbook: "yearbook/",
  gallery: "gallery/",
  karya: "karya/",
  students: "students/",
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
  /** Khusus channel yearbook / students / karya */
  studentName?: string;
  studentId?: string;
  /** Khusus channel karya (proyek aplikasi siswa) */
  demoUrl?: string;
  repoUrl?: string;
  tags?: string[];
  featured: boolean;
  status: ContentStatus;
  /** URL publik Vercel Blob (*.public.blob.vercel-storage.com) atau fallback lokal */
  url: string;
  /** Alias blobUrl untuk konsistensi skema */
  blobUrl?: string;
  /** Path berkas di dalam Vercel Blob, mis. hero3d/171000-foto.webp */
  pathname: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface PendingSubmissionItem {
  id: string;
  senderName: string;
  title: string;
  caption: string;
  category: string;
  channel: MediaChannel;
  phase: MomentPhase;
  takenAt: string;
  blobUrl: string;
  pathname: string;
  sizeBytes?: number;
  studentId?: string;
  studentName?: string;
  demoUrl?: string;
  repoUrl?: string;
  tags?: string[];
  status: "pending";
  createdAt: string;
}

export interface PendingMediaManifest {
  version: 1;
  updatedAt: string;
  items: PendingSubmissionItem[];
}

export interface RawTimeCapsuleBlobRecord {
  id: string;
  author_name: string;
  recipient_label: string;
  message: string;
  unlock_at: string;
  status: ContentStatus;
  created_at?: string;
}

export interface BlobClassRecords {
  students: StudentRow[];
  teachers: TeacherRow[];
  dreams: DreamRow[];
  dreamCheers: DreamCheerRow[];
  memoryEntries: MemoryEntryRow[];
  rawTimeCapsules: RawTimeCapsuleBlobRecord[];
  thanksList: ThanksRow[];
  works: WorkRow[];
  polls: PollWithOptions[];
  settings: {
    graduation_date: string;
  };
}

export interface MediaManifest {
  version: 1;
  updatedAt: string;
  items: MediaItem[];
  records?: Partial<BlobClassRecords>;
}

export interface UploadMediaInput {
  channel: MediaChannel;
  buffer?: Buffer;
  contentType?: string;
  fileName?: string;
  /** Opsional: pakai URL yang sudah ada */
  existingUrl?: string;
  title?: string;
  caption: string;
  category?: string;
  phase?: MomentPhase;
  takenAt?: string;
  uploaderName?: string;
  studentName?: string;
  studentId?: string;
  demoUrl?: string;
  repoUrl?: string;
  tags?: string[];
  featured?: boolean;
  status?: ContentStatus;
  replaceExistingCategory?: boolean;
}

export interface CreatePendingSubmissionInput {
  channel?: MediaChannel | string;
  category?: string;
  buffer?: Buffer;
  contentType?: string;
  fileName?: string;
  existingUrl?: string;
  senderName: string;
  title?: string;
  caption: string;
  phase?: MomentPhase;
  takenAt?: string;
  studentId?: string;
  studentName?: string;
  demoUrl?: string;
  repoUrl?: string;
  tags?: string[];
}

const MANIFEST_PATHNAME = "manifest.json";
const PENDING_MANIFEST_PATHNAME = "pending-manifest.json";
const LOCAL_FALLBACK_DIR = path.join(process.cwd(), ".data");
const LOCAL_FALLBACK_MANIFEST = path.join(
  LOCAL_FALLBACK_DIR,
  "vercel-blob-manifest.json"
);
const LOCAL_FALLBACK_PENDING_MANIFEST = path.join(
  LOCAL_FALLBACK_DIR,
  "vercel-blob-pending-manifest.json"
);

export const MAX_PUBLIC_SUBMISSION_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_SUBMISSION_MIME_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

/**
 * Fallback media lokal aman per-channel jika array untuk channel tersebut di manifest.json Vercel Blob masih kosong (length === 0)
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
    blobUrl:
      "/api/moment-illustration?title=Kebersamaan+XII+PPLG+1&phase=XII&category=Foto+Hero+3D&seed=101",
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
    blobUrl:
      "/api/moment-illustration?title=Keluarga+Besar+UNO+XII+PPLG+1&phase=XII&category=Foto+Sampul+Buku&seed=202",
    pathname: "yearbook/default-cover.webp",
    createdAt: "2026-04-01T08:00:00.000Z",
  },
  {
    id: "fallback-gallery-x",
    channel: "gallery",
    title: "Momen Kelas | XII PPLG 1",
    caption:
      "Hari pertama orientasi jurusan PPLG dan baris kode perdana di ruang lab madrasah.",
    category: "Kebersamaan Kelas",
    phase: "X",
    takenAt: "2024-07-18",
    uploaderName: "Arsip XII PPLG 1",
    featured: true,
    status: "approved",
    url: "/api/moment-illustration?title=Orientasi+Kelas+X+PPLG+1&phase=X&category=Kebersamaan+Kelas&seed=301",
    blobUrl:
      "/api/moment-illustration?title=Orientasi+Kelas+X+PPLG+1&phase=X&category=Kebersamaan+Kelas&seed=301",
    pathname: "gallery/default-kelas-x.webp",
    createdAt: "2024-07-18T08:00:00.000Z",
  },
  {
    id: "fallback-gallery-xi",
    channel: "gallery",
    title: "Praktikum & Koding | XII PPLG 1",
    caption:
      "Begadang merakit proyek aplikasi dan persiapan PKL bersama satu angkatan.",
    category: "Praktikum & Koding",
    phase: "XI",
    takenAt: "2025-09-12",
    uploaderName: "Arsip XII PPLG 1",
    featured: true,
    status: "approved",
    url: "/api/moment-illustration?title=Praktikum+Lab+Kelas+XI&phase=XI&category=Praktikum+%26+Koding&seed=302",
    blobUrl:
      "/api/moment-illustration?title=Praktikum+Lab+Kelas+XI&phase=XI&category=Praktikum+%26+Koding&seed=302",
    pathname: "gallery/default-kelas-xi.webp",
    createdAt: "2025-09-12T08:00:00.000Z",
  },
  {
    id: "fallback-gallery-xii",
    channel: "gallery",
    title: "Perpisahan | XII PPLG 1",
    caption:
      "Senja terakhir di bangku kelas XII PPLG 1 MAKN Ende sebelum melangkah menuju mimpi masing-masing.",
    category: "Perpisahan",
    phase: "XII",
    takenAt: "2026-04-20",
    uploaderName: "Arsip XII PPLG 1",
    featured: true,
    status: "approved",
    url: "/api/moment-illustration?title=Senja+Terakhir+XII+PPLG+1&phase=XII&category=Perpisahan&seed=303",
    blobUrl:
      "/api/moment-illustration?title=Senja+Terakhir+XII+PPLG+1&phase=XII&category=Perpisahan&seed=303",
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
  if (c === "karya" || c === "work" || c === "works") return "karya";
  if (c === "students" || c === "student" || c === "anggota") return "students";

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
  if (cat === "Karya Siswa" || cat === "Proyek Siswa") return "karya";
  return "gallery";
}

function defaultCategoryForChannel(channel: MediaChannel): string {
  if (channel === "hero3d") return "Foto Hero 3D";
  if (channel === "yearbook") return "Foto Bersama Kelas";
  if (channel === "karya") return "Karya Siswa";
  if (channel === "students") return "ID Card Siswa";
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

function cleanField(val: string, maxLen: number): string {
  return sanitizeText(val).slice(0, maxLen);
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
        ...(parsed.records ? { records: parsed.records } : {}),
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

async function readLocalFallbackPendingManifest(): Promise<PendingMediaManifest> {
  try {
    const raw = await fs.readFile(LOCAL_FALLBACK_PENDING_MANIFEST, "utf8");
    const parsed = JSON.parse(raw) as Partial<PendingMediaManifest>;
    if (Array.isArray(parsed.items)) {
      return {
        version: 1,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        items: parsed.items,
      };
    }
  } catch {
    // Belum ada file pending-manifest lokal
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: [],
  };
}

async function writeLocalFallbackPendingManifest(
  manifest: PendingMediaManifest
): Promise<void> {
  try {
    await fs.mkdir(LOCAL_FALLBACK_DIR, { recursive: true });
    await fs.writeFile(
      LOCAL_FALLBACK_PENDING_MANIFEST,
      JSON.stringify(manifest, null, 2),
      "utf8"
    );
  } catch {
    // Abaikan jika filesystem bersifat read-only
  }
}

/**
 * Membaca file manifest.json langsung dari Vercel Blob (list({ prefix: 'manifest.json' }) + fetch no-store).
 */
export async function readRawMediaManifest(): Promise<{
  manifest: MediaManifest;
  storage: "vercel-blob" | "local-fallback";
}> {
  if (!isVercelBlobConfigured()) {
    const local = await readLocalFallbackManifest();
    return { manifest: local, storage: "local-fallback" };
  }

  const { blobs } = await list({ prefix: MANIFEST_PATHNAME, limit: 20 });
  const exactManifestBlob =
    blobs.find((b) => b.pathname === MANIFEST_PATHNAME) ??
    blobs.find((b) => b.pathname.endsWith(`/${MANIFEST_PATHNAME}`));

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
    {
      cache: "no-store",
      next: { tags: ["media-manifest"] },
    }
  );
  if (!res.ok) {
    throw new Error(
      `Gagal mengunduh manifest.json dari Vercel Blob (HTTP ${res.status}).`
    );
  }

  const parsed = (await res.json()) as Partial<MediaManifest>;
  const items = Array.isArray(parsed.items)
    ? parsed.items.map((it) => ({
        ...it,
        blobUrl: it.blobUrl || it.url,
      }))
    : [];
  return {
    manifest: {
      version: 1,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      items,
      ...(parsed.records ? { records: parsed.records } : {}),
    },
    storage: "vercel-blob",
  };
}

/**
 * Menyimpan manifest.json yang sudah diperbarui ke Vercel Blob (allowOverwrite: true).
 * Jika BLOB_READ_WRITE_TOKEN dikonfigurasi tetapi gagal, lempar error asli dari @vercel/blob.
 */
export async function writeMediaManifest(
  items: MediaItem[],
  recordsOverride?: Partial<BlobClassRecords>
): Promise<MediaManifest> {
  const current = await readRawMediaManifest().catch(
    (): { manifest: MediaManifest; storage: "local-fallback" } => ({
      manifest: { version: 1, updatedAt: "", items: [] },
      storage: "local-fallback",
    })
  );

  const mergedRecords =
    recordsOverride !== undefined ? recordsOverride : current.manifest.records;

  const manifest: MediaManifest = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
    ...(mergedRecords ? { records: mergedRecords } : {}),
  };

  if (!isVercelBlobConfigured()) {
    if (process.env.VERCEL === "1") {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN belum dikonfigurasi di Environment Variables Vercel."
      );
    }
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
 * Membaca file pending-manifest.json dari Vercel Blob (daftar antrean kiriman pengunjung berstatus pending).
 */
export async function readPendingMediaManifest(): Promise<{
  manifest: PendingMediaManifest;
  storage: "vercel-blob" | "local-fallback";
}> {
  if (!isVercelBlobConfigured()) {
    const local = await readLocalFallbackPendingManifest();
    return { manifest: local, storage: "local-fallback" };
  }

  const { blobs } = await list({ prefix: PENDING_MANIFEST_PATHNAME, limit: 20 });
  const exactBlob =
    blobs.find((b) => b.pathname === PENDING_MANIFEST_PATHNAME) ??
    blobs.find((b) => b.pathname.endsWith(`/${PENDING_MANIFEST_PATHNAME}`));

  if (!exactBlob?.url) {
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
    `${exactBlob.url}${exactBlob.url.includes("?") ? "&" : "?"}t=${Date.now()}`,
    {
      cache: "no-store",
      next: { tags: ["media-manifest", "pending-manifest"] },
    }
  );
  if (!res.ok) {
    throw new Error(
      `Gagal mengunduh pending-manifest.json dari Vercel Blob (HTTP ${res.status}).`
    );
  }

  const parsed = (await res.json()) as Partial<PendingMediaManifest>;
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return {
    manifest: {
      version: 1,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      items,
    },
    storage: "vercel-blob",
  };
}

/**
 * Menyimpan pending-manifest.json ke Vercel Blob (`allowOverwrite: true`).
 */
export async function writePendingMediaManifest(
  items: PendingSubmissionItem[]
): Promise<PendingMediaManifest> {
  const manifest: PendingMediaManifest = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  };

  if (!isVercelBlobConfigured()) {
    if (process.env.VERCEL === "1") {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN belum dikonfigurasi di Environment Variables Vercel."
      );
    }
    await writeLocalFallbackPendingManifest(manifest);
    return manifest;
  }

  await put(PENDING_MANIFEST_PATHNAME, JSON.stringify(manifest, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });

  return manifest;
}

/**
 * Tahap 1 — Pengiriman Foto oleh Pengunjung/Siswa ke Antrean Pending:
 * 1) Simpan berkas gambar ke Vercel Blob dengan prefix `pending/<timestamp>-<slug>.webp`
 * 2) Simpan metadata kiriman ke `pending-manifest.json` di Vercel Blob (`allowOverwrite: true`).
 */
export async function createPendingBlobSubmission(
  input: CreatePendingSubmissionInput
): Promise<{
  item: PendingSubmissionItem;
  manifest: PendingMediaManifest;
  storage: "vercel-blob" | "local-fallback";
}> {
  const category = cleanField(
    input.category ||
      defaultCategoryForChannel(normalizeChannel(input.channel, input.category)),
    80
  );
  const channel = normalizeChannel(input.channel, category);
  const senderName = cleanField(input.senderName || "Siswa XII PPLG 1", 80);
  const caption = cleanField(
    input.caption || "Kiriman Kenangan XII PPLG 1 MAKN Ende",
    280
  );
  const title = cleanField(
    input.title || `${category} | ${senderName}`,
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
  const studentId = input.studentId
    ? cleanField(input.studentId, 80)
    : undefined;
  const studentName = input.studentName
    ? cleanField(input.studentName, 100)
    : undefined;
  const demoUrl = input.demoUrl ? input.demoUrl.trim().slice(0, 300) : undefined;
  const repoUrl = input.repoUrl ? input.repoUrl.trim().slice(0, 300) : undefined;
  const tags = Array.isArray(input.tags)
    ? input.tags.map((t) => cleanField(t, 40)).filter(Boolean).slice(0, 8)
    : undefined;

  const slug = slugifyFileSegment(
    input.fileName || title || studentName || senderName || category
  );
  const timestamp = Date.now();
  const contentType = (input.contentType || "image/webp").toLowerCase();
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : "webp";
  const pendingPathname = `pending/${timestamp}-${slug}.${ext}`;

  let blobUrl = (input.existingUrl || "").trim();
  let finalPathname = pendingPathname;
  let sizeBytes = input.buffer?.byteLength;

  if (input.buffer && input.buffer.byteLength > 0) {
    if (input.buffer.byteLength > MAX_PUBLIC_SUBMISSION_BYTES) {
      throw new Error(
        "Ukuran file gambar melebihi batas maksimal 2 MB. Pastikan gambar sudah terkompresi."
      );
    }
    if (!ALLOWED_SUBMISSION_MIME_TYPES.has(contentType)) {
      throw new Error(
        "Tipe file gambar tidak didukung. Gunakan format WebP, JPEG, atau PNG."
      );
    }

    if (isVercelBlobConfigured()) {
      const uploaded = await put(pendingPathname, input.buffer, {
        access: "public",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      blobUrl = uploaded.url;
      finalPathname = uploaded.pathname;
    } else {
      if (process.env.VERCEL === "1") {
        throw new Error(
          "BLOB_READ_WRITE_TOKEN belum dikonfigurasi di Environment Variables Vercel."
        );
      }
      blobUrl = `data:${contentType};base64,${input.buffer.toString("base64")}`;
    }
  }

  if (!blobUrl) {
    throw new Error("Berkas foto atau gambar wajib disertakan.");
  }

  const { manifest: currentPending, storage } = await readPendingMediaManifest();
  const nowIso = new Date().toISOString();

  const pendingItem: PendingSubmissionItem = {
    id: crypto.randomUUID(),
    senderName,
    title,
    caption,
    category,
    channel,
    phase,
    takenAt,
    blobUrl,
    pathname: finalPathname,
    ...(typeof sizeBytes === "number" ? { sizeBytes } : {}),
    ...(studentId ? { studentId } : {}),
    ...(studentName ? { studentName } : {}),
    ...(demoUrl ? { demoUrl } : {}),
    ...(repoUrl ? { repoUrl } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    status: "pending",
    createdAt: nowIso,
  };

  const nextPendingItems = [pendingItem, ...currentPending.items];
  const savedPending = await writePendingMediaManifest(nextPendingItems);

  return {
    item: pendingItem,
    manifest: savedPending,
    storage,
  };
}

/**
 * Pastikan URL gambar sudah berada di folder channel Vercel Blob (`hero3d/`, `gallery/`, `yearbook/`, `karya/`, `students/`).
 * Jika masih di `pending/` atau berupa base64 `data:image/...`, unggah ke folder channel tujuan agar rapi,
 * lalu hapus file lama di `pending/` bila perlu.
 */
async function ensureImageInTargetChannelBlob(params: {
  sourceUrl: string;
  sourcePathname?: string;
  targetChannel: MediaChannel;
  slugHint: string;
}): Promise<{ url: string; pathname: string; sizeBytes?: number }> {
  const { sourceUrl, sourcePathname, targetChannel, slugHint } = params;
  const prefix = MEDIA_CHANNEL_PREFIXES[targetChannel];
  const slug = slugifyFileSegment(slugHint);
  const timestamp = Date.now();

  if (sourceUrl.startsWith("data:image/")) {
    const parsed = parseImageDataUrl(sourceUrl);
    const targetPathname = `${prefix}${timestamp}-${slug}.${parsed.extension}`;
    if (isVercelBlobConfigured()) {
      const uploaded = await put(targetPathname, parsed.buffer, {
        access: "public",
        contentType: parsed.contentType,
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      return {
        url: uploaded.url,
        pathname: uploaded.pathname,
        sizeBytes: parsed.buffer.byteLength,
      };
    }
    return {
      url: sourceUrl,
      pathname: targetPathname,
      sizeBytes: parsed.buffer.byteLength,
    };
  }

  // Jika file sudah berada di Vercel Blob di bawah `pending/`, salin ke folder channel tujuan (`<channel>/...`) lalu hapus file `pending/`
  if (
    isVercelBlobConfigured() &&
    isVercelBlobUrl(sourceUrl) &&
    (sourcePathname?.startsWith("pending/") || sourceUrl.includes("/pending/"))
  ) {
    try {
      const res = await fetch(sourceUrl, { cache: "no-store" });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/webp";
        const ext = contentType.includes("png")
          ? "png"
          : contentType.includes("jpeg") || contentType.includes("jpg")
            ? "jpg"
            : "webp";
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const targetPathname = `${prefix}${timestamp}-${slug}.${ext}`;
        const uploaded = await put(targetPathname, buffer, {
          access: "public",
          contentType,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        });
        await del(sourceUrl).catch(() => {});
        return {
          url: uploaded.url,
          pathname: uploaded.pathname,
          sizeBytes: buffer.byteLength,
        };
      }
    } catch {
      // Jika penyalinan gagal karena jaringan sementara, tetap gunakan blobUrl asli di Vercel Blob
    }
  }

  return {
    url: sourceUrl,
    pathname: sourcePathname || `${prefix}${timestamp}-${slug}.webp`,
  };
}

/**
 * Tahap 2A — Admin Klik ACC (Approve) pada Item Antrean Pending:
 * 1) Pindahkan/salin item dari `pending-manifest.json` ke `manifest.json` utama sesuai channel tujuannya (`hero3d`, `gallery`, `yearbook`, `karya`, `students`).
 * 2) Hapus item tersebut dari `pending-manifest.json` agar antrean admin bersih.
 */
export async function approvePendingBlobSubmission(
  id: string,
  options?: {
    updatedCaption?: string;
    updatedTitle?: string;
    targetChannel?: MediaChannel;
    targetCategory?: string;
  }
): Promise<{
  approvedItem: MediaItem;
  manifest: MediaManifest;
  pendingManifest: PendingMediaManifest;
}> {
  const { manifest: pendingManifest } = await readPendingMediaManifest();
  const pendingIdx = pendingManifest.items.findIndex((item) => item.id === id);

  if (pendingIdx < 0) {
    // Cek apabila item berada di manifest.json utama dengan status pending
    const { manifest: mainManifest } = await readRawMediaManifest();
    const mainIdx = mainManifest.items.findIndex((item) => item.id === id);
    if (mainIdx < 0) {
      throw new Error("Kiriman tidak ditemukan di antrean pending-manifest.json.");
    }

    const existing = mainManifest.items[mainIdx]!;
    const targetChannel = options?.targetChannel || existing.channel;
    const ensured = await ensureImageInTargetChannelBlob({
      sourceUrl: existing.url,
      sourcePathname: existing.pathname,
      targetChannel,
      slugHint: existing.title || existing.caption,
    });

    const approvedMainItem: MediaItem = {
      ...existing,
      channel: targetChannel,
      url: ensured.url,
      blobUrl: ensured.url,
      pathname: ensured.pathname,
      ...(options?.updatedCaption
        ? { caption: cleanField(options.updatedCaption, 280) }
        : {}),
      ...(options?.updatedTitle
        ? { title: cleanField(options.updatedTitle, 140) }
        : {}),
      ...(options?.targetCategory
        ? { category: cleanField(options.targetCategory, 80) }
        : {}),
      status: "approved",
      featured: true,
    };

    const nextMainItems = [...mainManifest.items];
    nextMainItems[mainIdx] = approvedMainItem;
    const savedMain = await writeMediaManifest(nextMainItems);

    return {
      approvedItem: approvedMainItem,
      manifest: savedMain,
      pendingManifest,
    };
  }

  const pendingItem = pendingManifest.items[pendingIdx]!;
  const targetChannel =
    options?.targetChannel ||
    normalizeChannel(pendingItem.channel, pendingItem.category);
  const targetCategory = cleanField(
    options?.targetCategory ||
      pendingItem.category ||
      defaultCategoryForChannel(targetChannel),
    80
  );
  const finalCaption = cleanField(
    options?.updatedCaption || pendingItem.caption,
    280
  );
  const finalTitle = cleanField(
    options?.updatedTitle || pendingItem.title,
    140
  );

  const ensured = await ensureImageInTargetChannelBlob({
    sourceUrl: pendingItem.blobUrl,
    sourcePathname: pendingItem.pathname,
    targetChannel,
    slugHint: finalTitle || pendingItem.senderName,
  });

  const approvedItem: MediaItem = {
    id: pendingItem.id,
    channel: targetChannel,
    title: finalTitle,
    caption: finalCaption,
    category: targetCategory,
    phase: pendingItem.phase,
    takenAt: pendingItem.takenAt,
    uploaderName: pendingItem.senderName,
    ...(pendingItem.studentName ? { studentName: pendingItem.studentName } : {}),
    ...(pendingItem.studentId ? { studentId: pendingItem.studentId } : {}),
    ...(pendingItem.demoUrl ? { demoUrl: pendingItem.demoUrl } : {}),
    ...(pendingItem.repoUrl ? { repoUrl: pendingItem.repoUrl } : {}),
    ...(pendingItem.tags ? { tags: pendingItem.tags } : {}),
    featured: true,
    status: "approved",
    url: ensured.url,
    blobUrl: ensured.url,
    pathname: ensured.pathname,
    ...(typeof (ensured.sizeBytes ?? pendingItem.sizeBytes) === "number"
      ? { sizeBytes: ensured.sizeBytes ?? pendingItem.sizeBytes }
      : {}),
    createdAt: pendingItem.createdAt,
  };

  const { manifest: mainManifest } = await readRawMediaManifest();
  const filteredMain = mainManifest.items.filter((i) => i.id !== approvedItem.id);
  const nextMainItems = [approvedItem, ...filteredMain];
  const savedMain = await writeMediaManifest(nextMainItems);

  const nextPendingItems = pendingManifest.items.filter((i) => i.id !== id);
  const savedPending = await writePendingMediaManifest(nextPendingItems);

  return {
    approvedItem,
    manifest: savedMain,
    pendingManifest: savedPending,
  };
}

/**
 * Tahap 2B — Admin Klik Tolak (Reject) pada Item Antrean Pending:
 * 1) Hapus file gambar fisiknya dari Vercel Blob menggunakan `del(item.blobUrl)` agar tidak memenuhi kuota storage.
 * 2) Hapus item tersebut dari `pending-manifest.json`.
 */
export async function rejectPendingBlobSubmission(id: string): Promise<{
  rejectedItem: PendingSubmissionItem | MediaItem | null;
  pendingManifest: PendingMediaManifest;
}> {
  const { manifest: pendingManifest } = await readPendingMediaManifest();
  const target = pendingManifest.items.find((item) => item.id === id);

  if (target) {
    if (isVercelBlobConfigured() && isVercelBlobUrl(target.blobUrl)) {
      await del(target.blobUrl).catch(() => {});
    }
    const nextPendingItems = pendingManifest.items.filter((item) => item.id !== id);
    const savedPending = await writePendingMediaManifest(nextPendingItems);
    return {
      rejectedItem: target,
      pendingManifest: savedPending,
    };
  }

  // Jika item berada di manifest.json utama, hapus file blob dan hapus dari manifest.json
  const delRes = await deleteMediaFromBlob({ id });
  return {
    rejectedItem: delRes.removedItem,
    pendingManifest,
  };
}

/**
 * Ambil seluruh item media publik dari `manifest.json` dengan fallback PER-CHANNEL:
 * - Untuk setiap channel (`hero3d`, `yearbook`, `gallery`, `karya`, `students`), prioritaskan data dari `manifest.json` Vercel Blob.
 * - HANYA gunakan gambar placeholder default untuk suatu channel apabila array untuk channel tersebut di `manifest.json` benar-benar kosong (`length === 0`).
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
  const useFallback = options?.includeFallbackIfEmpty !== false;

  let baseItems = manifest.items;
  if (!options?.includePending) {
    baseItems = baseItems.filter((item) => item.status === "approved");
  }

  // Jika juga meminta item pending, gabungkan dengan pending-manifest.json
  if (options?.includePending) {
    const { manifest: pendingManifest } = await readPendingMediaManifest();
    const pendingAsMedia: MediaItem[] = pendingManifest.items.map(
      pendingSubmissionToMediaItem
    );
    const existingIds = new Set(baseItems.map((i) => i.id));
    for (const p of pendingAsMedia) {
      if (!existingIds.has(p.id)) {
        baseItems = [p, ...baseItems];
      }
    }
  }

  if (options?.channel) {
    const channelItems = baseItems.filter(
      (item) => item.channel === options.channel
    );
    if (channelItems.length > 0 || !useFallback) {
      return {
        items: channelItems,
        storage,
        isFallback: false,
      };
    }
    const channelFallbacks = DEFAULT_LOCAL_MEDIA_FALLBACK.filter(
      (item) => item.channel === options.channel
    );
    return {
      items: channelFallbacks,
      storage,
      isFallback: channelFallbacks.length > 0,
    };
  }

  // Tanpa filter channel tunggal: evaluasi fallback per masing-masing channel (`hero3d`, `yearbook`, `gallery`)
  if (!useFallback) {
    return {
      items: baseItems,
      storage,
      isFallback: false,
    };
  }

  const channelsWithFallback: MediaChannel[] = ["hero3d", "yearbook", "gallery"];
  let combined = [...baseItems];
  let usedAnyFallback = false;

  for (const ch of channelsWithFallback) {
    const hasChannelItem = baseItems.some((item) => item.channel === ch);
    if (!hasChannelItem) {
      const chFallback = DEFAULT_LOCAL_MEDIA_FALLBACK.filter(
        (item) => item.channel === ch
      );
      combined = [...combined, ...chFallback];
      if (chFallback.length > 0) usedAnyFallback = true;
    }
  }

  return {
    items: combined,
    storage,
    isFallback: usedAnyFallback && baseItems.length === 0,
  };
}

export function pendingSubmissionToMediaItem(
  item: PendingSubmissionItem
): MediaItem {
  return {
    id: item.id,
    channel: item.channel,
    title: item.title,
    caption: item.caption,
    category: item.category,
    phase: item.phase,
    takenAt: item.takenAt,
    uploaderName: item.senderName,
    ...(item.studentName ? { studentName: item.studentName } : {}),
    ...(item.studentId ? { studentId: item.studentId } : {}),
    ...(item.demoUrl ? { demoUrl: item.demoUrl } : {}),
    ...(item.repoUrl ? { repoUrl: item.repoUrl } : {}),
    ...(item.tags ? { tags: item.tags } : {}),
    featured: true,
    status: "pending",
    url: item.blobUrl,
    blobUrl: item.blobUrl,
    pathname: item.pathname,
    ...(typeof item.sizeBytes === "number" ? { sizeBytes: item.sizeBytes } : {}),
    createdAt: item.createdAt,
  };
}

/**
 * Ambil item media berdasarkan 1 kanal spesifik (`hero3d`, `yearbook`, `gallery`, `karya`, `students`).
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
 * Tahap 3 — Upload Langsung oleh Admin:
 * Menyimpan berkas langsung ke folder channel (`hero3d/`, `gallery/`, `yearbook/`, `karya/`, `students/`)
 * dan langsung menulis ke `manifest.json` utama tanpa lewat `pending-manifest.json`.
 */
export async function uploadMediaToBlob(
  input: UploadMediaInput
): Promise<{
  item: MediaItem;
  manifest: MediaManifest;
  storage: "vercel-blob" | "local-fallback";
}> {
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
  const demoUrl = input.demoUrl ? input.demoUrl.trim().slice(0, 300) : undefined;
  const repoUrl = input.repoUrl ? input.repoUrl.trim().slice(0, 300) : undefined;
  const tags = Array.isArray(input.tags)
    ? input.tags.map((t) => cleanField(t, 40)).filter(Boolean).slice(0, 8)
    : undefined;
  const status: ContentStatus = input.status || "approved";
  const featured = input.featured ?? true;

  // Jika status adalah pending, arahkan ke antrean pending-manifest.json (`pending/`)
  if (status === "pending") {
    const pendingRes = await createPendingBlobSubmission({
      channel,
      category,
      buffer: input.buffer,
      contentType: input.contentType,
      fileName: input.fileName,
      existingUrl: input.existingUrl,
      senderName: uploaderName,
      title,
      caption,
      phase,
      takenAt,
      studentId,
      studentName,
      demoUrl,
      repoUrl,
      tags,
    });
    const { manifest: mainManifest } = await readRawMediaManifest();
    return {
      item: pendingSubmissionToMediaItem(pendingRes.item),
      manifest: mainManifest,
      storage: pendingRes.storage,
    };
  }

  const { manifest: currentManifest, storage } = await readRawMediaManifest();
  const prefix = MEDIA_CHANNEL_PREFIXES[channel];
  const slug = slugifyFileSegment(
    input.fileName || studentName || title || category || caption
  );
  const timestamp = Date.now();
  const ext = input.contentType?.includes("png")
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
      if (process.env.VERCEL === "1") {
        throw new Error(
          "BLOB_READ_WRITE_TOKEN belum dikonfigurasi di Environment Variables Vercel."
        );
      }
      const mime = input.contentType || "image/webp";
      finalUrl = `data:${mime};base64,${input.buffer.toString("base64")}`;
      finalPathname = pathname;
    }
  } else if (finalUrl.startsWith("data:image/")) {
    const parsed = parseImageDataUrl(finalUrl);
    if (isVercelBlobConfigured()) {
      const uploaded = await put(pathname, parsed.buffer, {
        access: "public",
        contentType: parsed.contentType,
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      finalUrl = uploaded.url;
      finalPathname = uploaded.pathname;
      sizeBytes = parsed.buffer.byteLength;
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
    ...(demoUrl ? { demoUrl } : {}),
    ...(repoUrl ? { repoUrl } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    featured,
    status: "approved",
    url: finalUrl,
    blobUrl: finalUrl,
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
  if (
    (channel === "yearbook" || channel === "students") &&
    (studentId || studentName)
  ) {
    const targetNameLower = studentName?.toLowerCase();
    const prevStudentPhotos = nextItems.filter(
      (i) =>
        (i.channel === "yearbook" || i.channel === "students") &&
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
 * Perbarui status moderasi atau caption item di manifest.json / pending-manifest.json Vercel Blob.
 */
export async function updateMediaItemInManifest(
  id: string,
  patch: Partial<
    Pick<MediaItem, "status" | "caption" | "category" | "phase" | "featured">
  >
): Promise<boolean> {
  // Jika berasal dari pending-manifest.json:
  const { manifest: pendingManifest } = await readPendingMediaManifest();
  const inPending = pendingManifest.items.some((item) => item.id === id);

  if (inPending) {
    if (patch.status === "approved") {
      await approvePendingBlobSubmission(id, {
        updatedCaption: patch.caption,
        targetCategory: patch.category,
      });
      return true;
    }
    if (patch.status === "rejected") {
      await rejectPendingBlobSubmission(id);
      return true;
    }
    // Jika hanya mengedit caption selagi masih pending
    const nextPending = pendingManifest.items.map((item) =>
      item.id === id
        ? {
            ...item,
            ...(typeof patch.caption === "string"
              ? { caption: cleanField(patch.caption, 280) }
              : {}),
            ...(typeof patch.category === "string"
              ? { category: cleanField(patch.category, 80) }
              : {}),
            ...(patch.phase ? { phase: patch.phase } : {}),
          }
        : item
    );
    await writePendingMediaManifest(nextPending);
    return true;
  }

  // Jika item berada di manifest.json utama:
  const { manifest } = await readRawMediaManifest();
  const idx = manifest.items.findIndex((item) => item.id === id);
  if (idx < 0) return false;

  if (patch.status === "rejected") {
    await deleteMediaFromBlob({ id });
    return true;
  }

  const current = manifest.items[idx]!;
  let finalUrl = current.url;
  let finalPathname = current.pathname;

  if (patch.status === "approved") {
    const ensured = await ensureImageInTargetChannelBlob({
      sourceUrl: current.url,
      sourcePathname: current.pathname,
      targetChannel: current.channel,
      slugHint: current.title || current.caption,
    });
    finalUrl = ensured.url;
    finalPathname = ensured.pathname;
  }

  const updated: MediaItem = {
    ...current,
    url: finalUrl,
    blobUrl: finalUrl,
    pathname: finalPathname,
    ...(patch.status ? { status: patch.status } : {}),
    ...(typeof patch.caption === "string"
      ? { caption: cleanField(patch.caption, 260) }
      : {}),
    ...(typeof patch.category === "string"
      ? { category: cleanField(patch.category, 80) }
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
 * Hapus berkas gambar dari Vercel Blob (`del`) dan bersihkan entrinya dari manifest.json maupun pending-manifest.json.
 */
export async function deleteMediaFromBlob(
  idOrUrl: { id?: string; url?: string }
): Promise<{
  deleted: boolean;
  removedItem: MediaItem | null;
  manifest: MediaManifest;
}> {
  // 1. Cek apakah ada di pending-manifest.json terlebih dahulu
  const { manifest: pendingManifest } = await readPendingMediaManifest();
  const pendingTarget = pendingManifest.items.find(
    (item) =>
      (idOrUrl.id && item.id === idOrUrl.id) ||
      (idOrUrl.url && item.blobUrl === idOrUrl.url)
  );
  if (pendingTarget) {
    if (isVercelBlobConfigured() && isVercelBlobUrl(pendingTarget.blobUrl)) {
      await del(pendingTarget.blobUrl).catch(() => {});
    }
    const nextPending = pendingManifest.items.filter(
      (item) => item.id !== pendingTarget.id
    );
    await writePendingMediaManifest(nextPending);
    const { manifest: currentMain } = await readRawMediaManifest();
    return {
      deleted: true,
      removedItem: pendingSubmissionToMediaItem(pendingTarget),
      manifest: currentMain,
    };
  }

  // 2. Cek di manifest.json utama
  const { manifest } = await readRawMediaManifest();
  const target = manifest.items.find(
    (item) =>
      (idOrUrl.id && item.id === idOrUrl.id) ||
      (idOrUrl.url && item.url === idOrUrl.url)
  );

  if (!target) {
    if (idOrUrl.url && isVercelBlobConfigured() && isVercelBlobUrl(idOrUrl.url)) {
      await del(idOrUrl.url).catch(() => {});
      return { deleted: true, removedItem: null, manifest };
    }
    return { deleted: false, removedItem: null, manifest };
  }

  const nextItems = manifest.items.filter((item) => item.id !== target.id);

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
    category:
      item.channel === "hero3d" ? "Foto Hero 3D" : item.category,
    phase: item.phase,
    uploader_name: item.uploaderName,
    featured: item.featured,
    status: item.status,
    created_at: item.createdAt,
  };
}

/**
 * Konversi MediaItem channel `karya` menjadi WorkRow.
 */
export function mediaItemToWorkRow(item: MediaItem): WorkRow {
  return {
    id: item.id,
    student_id: item.studentId || item.id,
    student_name: item.studentName || item.uploaderName,
    title: item.title,
    description: item.caption,
    tags:
      Array.isArray(item.tags) && item.tags.length > 0
        ? item.tags
        : ["Full-Stack", "PPLG"],
    image_url: item.url,
    demo_url: item.demoUrl || "",
    repo_url: item.repoUrl || "",
    status: item.status,
  };
}

/**
 * Terapkan foto ID Card / Sahabat Istimewa dari channel `yearbook/` atau `students/` pada manifest.json
 * ke daftar StudentRow agar perubahan foto langsung terlihat di ID Card 3D/2D & Buku Kenangan.
 */
export function applyYearbookMediaToStudents(
  students: StudentRow[],
  mediaItems: MediaItem[]
): StudentRow[] {
  const yearbookPortraits = mediaItems.filter(
    (item) =>
      (item.channel === "yearbook" || item.channel === "students") &&
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
