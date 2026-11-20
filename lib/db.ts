import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ensureDatabaseSchema, getConfiguredDatabaseUrl } from "@/lib/db-schema";
import { maskTimeCapsuleForPublic, sanitizeText, type SubmitPayload } from "@/lib/domain-logic";
import {
  applyYearbookMediaToStudents,
  approvePendingBlobSubmission,
  createPendingBlobSubmission,
  deleteMediaFromBlob,
  getMediaManifest,
  isVercelBlobConfigured,
  mediaItemToMomentRow,
  mediaItemToWorkRow,
  parseImageDataUrl,
  readPendingMediaManifest,
  readRawMediaManifest,
  rejectPendingBlobSubmission,
  updateMediaItemInManifest,
  uploadMediaToBlob,
  writeMediaManifest,
  type BlobClassRecords,
  type PendingSubmissionItem,
} from "@/lib/media-store";
import type {
  ContentStatus,
  DreamCheerRow,
  DreamRow,
  MemoryEntryRow,
  MomentRow,
  PollWithOptions,
  StudentRow,
  TeacherRow,
  ThanksRow,
  TimeCapsuleRow,
  WorkRow,
} from "@/lib/types";

export interface RawTimeCapsuleStoreRow {
  id: string;
  author_name: string;
  recipient_label: string;
  message: string;
  unlock_at: string;
  status: ContentStatus;
  created_at?: string;
}

interface DatabaseSnapshot {
  students: StudentRow[];
  teachers: TeacherRow[];
  moments: MomentRow[];
  dreams: DreamRow[];
  dreamCheers: DreamCheerRow[];
  memoryEntries: MemoryEntryRow[];
  rawTimeCapsules: RawTimeCapsuleStoreRow[];
  thanksList: ThanksRow[];
  works: WorkRow[];
  polls: PollWithOptions[];
  pendingSubmissions: PendingSubmissionItem[];
  settings: {
    graduation_date: string;
  };
  dbConnected: boolean;
  missingTables: boolean;
  dbError: string | null;
  updatedAt: number;
}

const DEFAULT_GRADUATION_DATE = "2026-05-15T08:00:00+08:00";

export function invalidatePublicDataCache() {
  // Data selalu diambil langsung secara real-time dari Vercel Blob (no-store)
}

export function getSupabaseConfig(): {
  url: string;
  key: string;
  configured: boolean;
} {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  const configured = Boolean(
    url &&
      key &&
      url.startsWith("https://") &&
      !url.includes("your-project-id") &&
      !key.includes("your-supabase")
  );

  return { url, key, configured };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().configured;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const { url, key, configured } = getSupabaseConfig();
  if (!configured) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

/**
 * Buat UUID deterministik dari string ID apabila input belum berformat UUID standar.
 */
export function toDeterministicUuid(input: string): string {
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input
    )
  ) {
    return input.toLowerCase();
  }
  const hash = crypto
    .createHash("sha256")
    .update(`xiipplg1:${input}`)
    .digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

function deterministicSeedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 900) + 100;
}

function getDefaultBlobRecords(
  existing?: Partial<BlobClassRecords>
): BlobClassRecords {
  return {
    students: Array.isArray(existing?.students) ? existing.students : [],
    teachers: Array.isArray(existing?.teachers) ? existing.teachers : [],
    dreams: Array.isArray(existing?.dreams) ? existing.dreams : [],
    dreamCheers: Array.isArray(existing?.dreamCheers)
      ? existing.dreamCheers
      : [],
    memoryEntries: Array.isArray(existing?.memoryEntries)
      ? existing.memoryEntries
      : [],
    rawTimeCapsules: Array.isArray(existing?.rawTimeCapsules)
      ? existing.rawTimeCapsules
      : [],
    thanksList: Array.isArray(existing?.thanksList) ? existing.thanksList : [],
    works: Array.isArray(existing?.works) ? existing.works : [],
    polls: Array.isArray(existing?.polls) ? existing.polls : [],
    settings: {
      graduation_date:
        existing?.settings?.graduation_date || DEFAULT_GRADUATION_DATE,
    },
  };
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of secondary) {
    map.set(item.id, item);
  }
  for (const item of primary) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

/**
 * Ambil seluruh media foto (Hero 3D, Yearbook / ID Card, Galeri, Karya) & data kelas
 * langsung dari Vercel Blob (manifest.json + pending-manifest.json) melalui lib/media-store.ts,
 * dengan sinkronisasi opsional dari Supabase bila tersedia.
 */
async function fetchAllFromStorage(options?: {
  includePendingMedia?: boolean;
}): Promise<DatabaseSnapshot> {
  const [rawManifestRes, mediaRes, pendingRes] = await Promise.all([
    readRawMediaManifest(),
    getMediaManifest({
      includePending: options?.includePendingMedia ?? false,
      includeFallbackIfEmpty: !options?.includePendingMedia,
    }),
    options?.includePendingMedia
      ? readPendingMediaManifest()
      : Promise.resolve({
          manifest: { version: 1 as const, updatedAt: "", items: [] },
          storage: "vercel-blob" as const,
        }),
  ]);

  const blobRecords = getDefaultBlobRecords(rawManifestRes.manifest.records);

  const blobMomentItems = mediaRes.items.filter(
    (item) =>
      item.channel === "hero3d" ||
      item.channel === "yearbook" ||
      item.channel === "gallery" ||
      item.channel === "students"
  );
  const blobMoments: MomentRow[] = blobMomentItems.map(mediaItemToMomentRow);

  const blobKaryaItems = mediaRes.items.filter(
    (item) => item.channel === "karya"
  );
  const blobWorksFromItems: WorkRow[] = blobKaryaItems.map(mediaItemToWorkRow);
  const combinedBlobWorks = mergeById(blobWorksFromItems, blobRecords.works);

  const syncedBlobStudents = applyYearbookMediaToStudents(
    blobRecords.students,
    mediaRes.items
  );

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      students: syncedBlobStudents,
      teachers: blobRecords.teachers,
      moments: blobMoments,
      dreams: blobRecords.dreams,
      dreamCheers: blobRecords.dreamCheers,
      memoryEntries: blobRecords.memoryEntries,
      rawTimeCapsules: blobRecords.rawTimeCapsules,
      thanksList: blobRecords.thanksList,
      works: combinedBlobWorks,
      polls: blobRecords.polls,
      pendingSubmissions: pendingRes.manifest.items,
      settings: blobRecords.settings,
      dbConnected: true,
      missingTables: false,
      dbError: null,
      updatedAt: Date.now(),
    };
  }

  if (getConfiguredDatabaseUrl()) {
    await ensureDatabaseSchema();
  }

  try {
    const [
      stuRes,
      teaRes,
      drmRes,
      chrRes,
      memRes,
      capRes,
      thkRes,
      wrkRes,
      polRes,
      optRes,
      votRes,
      setRes,
    ] = await Promise.all([
      supabase
        .from("students")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("teachers")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("dreams")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("dream_cheers")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("memory_entries")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("time_capsules")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("thanks")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("polls").select("*").order("created_at", { ascending: true }),
      supabase.from("poll_options").select("*"),
      supabase.from("poll_votes").select("*"),
      supabase.from("site_settings").select("*").limit(1).maybeSingle(),
    ]);

    const firstError =
      stuRes.error ||
      teaRes.error ||
      drmRes.error ||
      chrRes.error ||
      memRes.error ||
      capRes.error ||
      thkRes.error ||
      wrkRes.error ||
      polRes.error ||
      optRes.error ||
      votRes.error;

    if (firstError) {
      return {
        students: syncedBlobStudents,
        teachers: blobRecords.teachers,
        moments: blobMoments,
        dreams: blobRecords.dreams,
        dreamCheers: blobRecords.dreamCheers,
        memoryEntries: blobRecords.memoryEntries,
        rawTimeCapsules: blobRecords.rawTimeCapsules,
        thanksList: blobRecords.thanksList,
        works: combinedBlobWorks,
        polls: blobRecords.polls,
        pendingSubmissions: pendingRes.manifest.items,
        settings: blobRecords.settings,
        dbConnected: true,
        missingTables: false,
        dbError: null,
        updatedAt: Date.now(),
      };
    }

    const sbStudents: StudentRow[] = (stuRes.data ?? []).map((s) => ({
      id: String(s.id),
      slug: String(s.slug || ""),
      full_name: String(s.full_name || ""),
      nickname: String(s.nickname || s.full_name?.split(" ")[0] || ""),
      gender: (s.gender === "P" ? "P" : "L") as StudentRow["gender"],
      is_active: Boolean(s.is_active ?? true),
      show_photo: Boolean(s.show_photo ?? true),
      photo_url: String(s.photo_url || ""),
      bio: String(s.bio || ""),
      tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
      links: Array.isArray(s.links) ? s.links : [],
      tone: Number(s.tone || 1) as 1 | 2 | 3 | 4 | 5,
      rail_group: (s.rail_group ||
        (s.is_active === false
          ? "moved"
          : s.gender === "P"
            ? "P1"
            : "L")) as StudentRow["rail_group"],
      sort_order: Number(s.sort_order ?? 0),
    }));

    const mergedRawStudents = mergeById(blobRecords.students, sbStudents);
    const students = applyYearbookMediaToStudents(
      mergedRawStudents,
      mediaRes.items
    );
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const sbTeachers: TeacherRow[] = (teaRes.data ?? []).map((t) => ({
      id: String(t.id),
      full_name: String(t.full_name || ""),
      title: String(t.title || ""),
      grp: (t.grp || "kejuruan") as TeacherRow["grp"],
      is_homeroom: Boolean(t.is_homeroom ?? false),
      photo_url: String(t.photo_url || ""),
      message: String(t.message || ""),
      tone: Number(t.tone || 1) as 1 | 2 | 3 | 4 | 5,
      sort_order: Number(t.sort_order ?? 0),
    }));
    const teachers = mergeById(blobRecords.teachers, sbTeachers);

    const sbDreamCheers: DreamCheerRow[] = (chrRes.data ?? []).map((c) => ({
      id: String(c.id),
      dream_id: String(c.dream_id || ""),
      author_name: String(c.sender_name || c.author_name || ""),
      message: String(c.message || ""),
      status: (c.status || "approved") as ContentStatus,
      created_at: c.created_at ? String(c.created_at) : undefined,
    }));
    const dreamCheers = mergeById(blobRecords.dreamCheers, sbDreamCheers);

    const sbDreams: DreamRow[] = (drmRes.data ?? []).map((d) => {
      const stu = d.student_id
        ? studentMap.get(String(d.student_id))
        : undefined;
      const authorFallback = String(d.author_name || "");
      return {
        id: String(d.id),
        student_id: String(d.student_id || d.id),
        student_name: stu?.full_name || authorFallback || "",
        student_nickname:
          stu?.nickname || authorFallback.split(" ")[0] || "",
        dream: String(d.dream_title ?? d.dream ?? ""),
        reason: String(d.reason ?? ""),
        paper_color: String(d.pin_color ?? d.paper_color ?? "#FFF7D6"),
        status: (d.status || "approved") as ContentStatus,
        cheers: dreamCheers.filter(
          (c) => c.dream_id === String(d.id) && c.status === "approved"
        ),
      };
    });
    const dreams = mergeById(blobRecords.dreams, sbDreams);

    const sbMemories: MemoryEntryRow[] = (memRes.data ?? []).map((m) => {
      const idStr = String(m.id);
      return {
        id: idStr,
        student_id: String(m.student_id || ""),
        author_name: String(m.author_name || ""),
        message: String(m.message || ""),
        decor_seed: Number(m.decor_seed ?? deterministicSeedFromId(idStr)),
        status: (m.status || "pending") as ContentStatus,
        created_at: m.created_at ? String(m.created_at) : undefined,
      };
    });
    const memoryEntries = mergeById(blobRecords.memoryEntries, sbMemories);

    const sbCapsules: RawTimeCapsuleStoreRow[] = (capRes.data ?? []).map(
      (c) => ({
        id: String(c.id),
        author_name: String(c.author_name || ""),
        recipient_label: String(c.recipient_label || ""),
        message: String(c.message || ""),
        unlock_at: String(c.unlock_at || new Date().toISOString()),
        status: (c.status || "pending") as ContentStatus,
        created_at: c.created_at ? String(c.created_at) : undefined,
      })
    );
    const rawTimeCapsules = mergeById(
      blobRecords.rawTimeCapsules,
      sbCapsules
    );

    const sbThanks: ThanksRow[] = (thkRes.data ?? []).map((th) => ({
      id: String(th.id),
      from_name: String(th.author_name ?? th.from_name ?? ""),
      to_name: String(th.to_target ?? th.to_name ?? ""),
      message: String(th.message || ""),
      status: (th.status || "pending") as ContentStatus,
      created_at: th.created_at ? String(th.created_at) : undefined,
    }));
    const thanksList = mergeById(blobRecords.thanksList, sbThanks);

    const sbWorks: WorkRow[] = (wrkRes.data ?? []).map((w) => {
      const stu = studentMap.get(String(w.student_id));
      return {
        id: String(w.id),
        student_id: String(w.student_id),
        student_name: stu?.full_name ?? "",
        title: String(w.title || ""),
        description: String(w.description || ""),
        tags: Array.isArray(w.tags) ? w.tags.map(String) : [],
        image_url: String(w.image_url || ""),
        demo_url: String(w.demo_url || ""),
        repo_url: String(w.repo_url || ""),
        status: (w.status || "approved") as ContentStatus,
      };
    });
    const works = mergeById(combinedBlobWorks, sbWorks);

    const voteRows = votRes.data ?? [];
    const optionRows = optRes.data ?? [];
    const pollRows = polRes.data ?? [];

    const sbPolls: PollWithOptions[] = pollRows.map((p) => {
      const pid = String(p.id);
      const opts = optionRows
        .filter((o) => String(o.poll_id) === pid)
        .map((o) => {
          const oid = String(o.id);
          const countFromVotes = voteRows.filter(
            (v) => String(v.option_id) === oid
          ).length;
          const countFromCol = Number(o.votes_count ?? 0);
          const count = Math.max(countFromVotes, countFromCol);
          return {
            id: oid,
            poll_id: pid,
            label: String(o.label || ""),
            votes: count,
          };
        });
      const totalVotes = opts.reduce((acc, o) => acc + o.votes, 0);
      return {
        id: pid,
        question: String(p.question || ""),
        is_open: Boolean(p.is_open ?? true),
        options: opts,
        total_votes: totalVotes,
      };
    });
    const polls = mergeById(blobRecords.polls, sbPolls);

    const rawSetData = setRes.data as Record<string, unknown> | null;
    const gradDateFromDb =
      blobRecords.settings.graduation_date !== DEFAULT_GRADUATION_DATE
        ? blobRecords.settings.graduation_date
        : (typeof rawSetData?.graduation_date === "string" &&
          rawSetData.graduation_date
            ? rawSetData.graduation_date
            : (rawSetData?.value as { graduation_date?: string } | null)
                ?.graduation_date) || DEFAULT_GRADUATION_DATE;

    return {
      students,
      teachers,
      moments: blobMoments,
      dreams,
      dreamCheers,
      memoryEntries,
      rawTimeCapsules,
      thanksList,
      works,
      polls,
      pendingSubmissions: pendingRes.manifest.items,
      settings: {
        graduation_date: gradDateFromDb,
      },
      dbConnected: true,
      missingTables: false,
      dbError: null,
      updatedAt: Date.now(),
    };
  } catch {
    return {
      students: syncedBlobStudents,
      teachers: blobRecords.teachers,
      moments: blobMoments,
      dreams: blobRecords.dreams,
      dreamCheers: blobRecords.dreamCheers,
      memoryEntries: blobRecords.memoryEntries,
      rawTimeCapsules: blobRecords.rawTimeCapsules,
      thanksList: blobRecords.thanksList,
      works: combinedBlobWorks,
      polls: blobRecords.polls,
      pendingSubmissions: pendingRes.manifest.items,
      settings: blobRecords.settings,
      dbConnected: true,
      missingTables: false,
      dbError: null,
      updatedAt: Date.now(),
    };
  }
}

/**
 * Ambil semua data publik yang sudah berstatus 'approved' dari Vercel Blob (manifest.json).
 */
export async function getPublicAppData(_bypassCache = false) {
  const store = await fetchAllFromStorage();
  const nowMs = Date.now();

  const approvedCheers = store.dreamCheers.filter(
    (c) => c.status === "approved"
  );
  const dreamsWithCheers: DreamRow[] = store.dreams
    .filter((d) => d.status === "approved")
    .map((d) => {
      const stu = store.students.find((s) => s.id === d.student_id);
      return {
        ...d,
        student_name: stu?.full_name || d.student_name || "",
        student_nickname: stu?.nickname || d.student_nickname || "",
        cheers: approvedCheers.filter((c) => c.dream_id === d.id),
      };
    });

  const maskedCapsules: TimeCapsuleRow[] = store.rawTimeCapsules
    .filter((c) => c.status === "approved")
    .map((c) => maskTimeCapsuleForPublic(c, nowMs));

  const approvedWorks: WorkRow[] = store.works
    .filter((w) => w.status === "approved")
    .map((w) => {
      const stu = store.students.find((s) => s.id === w.student_id);
      return {
        ...w,
        student_name: stu?.full_name || w.student_name || "",
      };
    });

  const sortedStudents = [...store.students].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const sortedTeachers = [...store.teachers].sort(
    (a, b) =>
      (b.is_homeroom ? 1 : 0) - (a.is_homeroom ? 1 : 0) ||
      a.sort_order - b.sort_order
  );

  return {
    students: sortedStudents,
    teachers: sortedTeachers,
    moments: store.moments.filter((m) => m.status === "approved"),
    dreams: dreamsWithCheers,
    memoryEntries: store.memoryEntries.filter((m) => m.status === "approved"),
    timeCapsules: maskedCapsules,
    thanksList: store.thanksList.filter((t) => t.status === "approved"),
    works: approvedWorks,
    polls: store.polls,
    settings: store.settings,
    supabaseConnected: store.dbConnected,
    dbConnected: store.dbConnected,
    missingTables: store.missingTables,
    dbError: store.dbError,
    updatedAt: store.updatedAt,
  };
}

/**
 * Perbarui records di manifest.json Vercel Blob.
 */
async function mutateBlobClassRecords(
  mutator: (records: BlobClassRecords) => void
): Promise<BlobClassRecords> {
  const { manifest } = await readRawMediaManifest();
  const records = getDefaultBlobRecords(manifest.records);
  mutator(records);
  await writeMediaManifest(manifest.items, records);
  return records;
}

/**
 * Simpan kiriman publik baru ke Vercel Blob (`manifest.json` & `pending-manifest.json` untuk foto/karya dan `manifest.json` untuk teks).
 */
export async function createPendingSubmission(
  payload: SubmitPayload,
  preUploadedBlobItem?: { id: string; url: string; blobUrl?: string }
) {
  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  // 1. Unggahan foto momen publik langsung disimpan ke Vercel Blob (manifest.json + pending-manifest.json)
  if (payload.type === "moment") {
    if (preUploadedBlobItem) {
      return {
        id: preUploadedBlobItem.id,
        type: payload.type,
        status: "pending" as const,
        blobUrl: preUploadedBlobItem.blobUrl || preUploadedBlobItem.url,
      };
    }

    const seedNum = Math.floor(Math.random() * 99) + 1;
    let buffer: Buffer | undefined;
    let contentType = "image/webp";
    let existingUrl: string | undefined;

    if (
      payload.imageDataUrl &&
      payload.imageDataUrl.startsWith("data:image/")
    ) {
      const parsed = parseImageDataUrl(payload.imageDataUrl);
      buffer = parsed.buffer;
      contentType = parsed.contentType;
    } else if (
      payload.imageDataUrl &&
      /^https?:\/\//i.test(payload.imageDataUrl)
    ) {
      existingUrl = payload.imageDataUrl;
    } else {
      existingUrl = `/api/moment-illustration?seed=${seedNum}`;
    }

    const uploaded = await uploadMediaToBlob({
      channel: "gallery",
      category: sanitizeText(payload.category),
      buffer,
      contentType,
      existingUrl,
      uploaderName: sanitizeText(payload.uploaderName),
      caption: sanitizeText(payload.caption),
      phase: payload.phase,
      takenAt: payload.takenAt || nowIso.slice(0, 10),
      status: "pending",
      featured: false,
    });

    return {
      id: uploaded.item.id,
      type: payload.type,
      status: "pending" as const,
      blobUrl: uploaded.item.url,
    };
  }

  // 2. Kiriman karya siswa (dengan foto terkompresi atau auto-screenshot demoUrl) disimpan ke Vercel Blob (`karya`)
  if (payload.type === "work") {
    if (preUploadedBlobItem) {
      return {
        id: preUploadedBlobItem.id,
        type: payload.type,
        status: "pending" as const,
        blobUrl: preUploadedBlobItem.blobUrl || preUploadedBlobItem.url,
      };
    }

    const stuUuid = toDeterministicUuid(payload.studentId);
    const store = await fetchAllFromStorage();
    const stu = store.students.find(
      (s) => s.id === payload.studentId || s.id === stuUuid
    );
    const studentName = stu?.full_name || "Siswa XII PPLG 1";

    let buffer: Buffer | undefined;
    let contentType = "image/webp";
    let existingUrl: string | undefined;

    if (
      payload.imageDataUrl &&
      payload.imageDataUrl.startsWith("data:image/")
    ) {
      const parsed = parseImageDataUrl(payload.imageDataUrl);
      buffer = parsed.buffer;
      contentType = parsed.contentType;
    } else if (
      payload.imageDataUrl &&
      /^https?:\/\//i.test(payload.imageDataUrl)
    ) {
      existingUrl = payload.imageDataUrl;
    } else if (payload.demoUrl && /^https?:\/\//i.test(payload.demoUrl.trim())) {
      existingUrl = `https://api.microlink.io/?url=${encodeURIComponent(
        payload.demoUrl.trim()
      )}&screenshot=true&meta=false&embed=screenshot.url`;
    } else {
      existingUrl = `/api/moment-illustration?title=${encodeURIComponent(
        payload.title
      )}&phase=XII&category=Karya+Siswa&seed=404`;
    }

    const uploaded = await uploadMediaToBlob({
      channel: "karya",
      category: "Karya Siswa",
      buffer,
      contentType,
      existingUrl,
      uploaderName: studentName,
      studentId: payload.studentId,
      studentName,
      title: sanitizeText(payload.title),
      caption: sanitizeText(payload.description),
      demoUrl: payload.demoUrl || "",
      repoUrl: payload.repoUrl || "",
      tags: payload.tags.map((t) => sanitizeText(t)),
      status: "pending",
      featured: false,
    });

    return {
      id: uploaded.item.id,
      type: payload.type,
      status: "pending" as const,
      blobUrl: uploaded.item.url,
    };
  }

  // 3. Kiriman teks (memory, dream, dream_cheer, time_capsule, thanks) disimpan ke records manifest.json di Vercel Blob
  switch (payload.type) {
    case "memory": {
      await mutateBlobClassRecords((records) => {
        records.memoryEntries = [
          {
            id,
            student_id: payload.studentId,
            author_name: sanitizeText(payload.authorName),
            message: sanitizeText(payload.message),
            decor_seed: deterministicSeedFromId(id),
            status: "pending",
            created_at: nowIso,
          },
          ...records.memoryEntries,
        ];
      });
      return { id, type: payload.type, status: "pending" as const };
    }

    case "dream": {
      const store = await fetchAllFromStorage();
      const stu = store.students.find((s) => s.id === payload.studentId);
      const authorName = stu?.full_name || "Siswa XII PPLG 1";
      const authorNick =
        stu?.nickname || authorName.split(" ")[0] || "Siswa";

      await mutateBlobClassRecords((records) => {
        const idx = records.dreams.findIndex(
          (d) => d.student_id === payload.studentId
        );
        const newDream: DreamRow = {
          id: idx >= 0 ? records.dreams[idx]!.id : id,
          student_id: payload.studentId,
          student_name: authorName,
          student_nickname: authorNick,
          dream: sanitizeText(payload.dream),
          reason: sanitizeText(payload.reason),
          paper_color: payload.paperColor || "#FFF7D6",
          status: "pending",
          cheers: idx >= 0 ? records.dreams[idx]!.cheers : [],
        };
        if (idx >= 0) {
          records.dreams[idx] = newDream;
        } else {
          records.dreams = [newDream, ...records.dreams];
        }
      });
      return { id, type: payload.type, status: "pending" as const };
    }

    case "dream_cheer": {
      await mutateBlobClassRecords((records) => {
        records.dreamCheers = [
          {
            id,
            dream_id: payload.dreamId,
            author_name: sanitizeText(payload.authorName),
            message: sanitizeText(payload.message),
            status: "pending",
            created_at: nowIso,
          },
          ...records.dreamCheers,
        ];
      });
      return { id, type: payload.type, status: "pending" as const };
    }

    case "time_capsule": {
      const unlockIso = new Date(payload.unlockAt).toISOString();
      const recipientLabel = sanitizeText(
        payload.recipientLabel || "Untuk Kelas XII PPLG 1"
      );
      await mutateBlobClassRecords((records) => {
        records.rawTimeCapsules = [
          {
            id,
            author_name: sanitizeText(payload.authorName),
            recipient_label: recipientLabel,
            message: sanitizeText(payload.message),
            unlock_at: unlockIso,
            status: "pending",
            created_at: nowIso,
          },
          ...records.rawTimeCapsules,
        ];
      });
      return { id, type: payload.type, status: "pending" as const };
    }

    case "thanks": {
      await mutateBlobClassRecords((records) => {
        records.thanksList = [
          {
            id,
            from_name: sanitizeText(payload.fromName),
            to_name: sanitizeText(payload.toName),
            message: sanitizeText(payload.message),
            status: "pending",
            created_at: nowIso,
          },
          ...records.thanksList,
        ];
      });
      return { id, type: payload.type, status: "pending" as const };
    }
  }
}

/**
 * Rekam suara polling kelas ke manifest.json Vercel Blob.
 */
export async function voteOnPoll(
  pollId: string,
  optionId: string,
  _voterHash: string
): Promise<{ ok: boolean; error?: string; poll?: PollWithOptions }> {
  let updatedPoll: PollWithOptions | undefined;

  await mutateBlobClassRecords((records) => {
    const poll = records.polls.find((p) => p.id === pollId);
    if (!poll || !poll.is_open) return;
    const opt = poll.options.find((o) => o.id === optionId);
    if (!opt) return;
    opt.votes += 1;
    poll.total_votes = poll.options.reduce((acc, o) => acc + o.votes, 0);
    updatedPoll = { ...poll };
  });

  if (!updatedPoll) {
    return { ok: false, error: "Polling tidak ditemukan atau sudah ditutup." };
  }

  return { ok: true, poll: updatedPoll };
}

/**
 * Data lengkap untuk dasbor Admin langsung dari Vercel Blob (manifest.json + pending-manifest.json).
 */
export async function getAdminDashboardData() {
  const store = await fetchAllFromStorage({ includePendingMedia: true });
  return {
    students: [...store.students].sort((a, b) => a.sort_order - b.sort_order),
    teachers: [...store.teachers].sort(
      (a, b) =>
        (b.is_homeroom ? 1 : 0) - (a.is_homeroom ? 1 : 0) ||
        a.sort_order - b.sort_order
    ),
    moments: store.moments,
    dreams: store.dreams,
    dreamCheers: store.dreamCheers,
    memoryEntries: store.memoryEntries,
    timeCapsules: store.rawTimeCapsules,
    thanksList: store.thanksList,
    works: store.works,
    polls: store.polls,
    pendingSubmissions: store.pendingSubmissions,
    settings: store.settings,
    blobConnected: isVercelBlobConfigured(),
    supabaseConnected: isSupabaseConfigured(),
    dbConnected: true,
    missingTables: false,
    dbError: null,
  };
}

export type ModeratableTable =
  | "moments"
  | "dreams"
  | "dreamCheers"
  | "memoryEntries"
  | "timeCapsules"
  | "thanksList"
  | "works";

export async function moderateItem(
  table: ModeratableTable,
  id: string,
  status: ContentStatus,
  updatedText?: string
) {
  // 1. Moderasi foto momen atau karya siswa di pending-manifest.json / manifest.json Vercel Blob
  if (table === "moments" || table === "works") {
    const { manifest: pendingManifest } = await readPendingMediaManifest();
    const inPending = pendingManifest.items.some((i) => i.id === id);

    if (inPending) {
      if (status === "approved") {
        await approvePendingBlobSubmission(id, {
          updatedCaption:
            updatedText && updatedText.trim().length > 0
              ? updatedText
              : undefined,
        });
        return true;
      }
      if (status === "rejected") {
        await rejectPendingBlobSubmission(id);
        return true;
      }
    }

    const updatedInMedia = await updateMediaItemInManifest(id, {
      status,
      ...(updatedText !== undefined && updatedText.trim().length > 0
        ? { caption: updatedText }
        : {}),
    });
    if (updatedInMedia) return true;
  }

  // 2. Moderasi records di manifest.json Vercel Blob
  let foundInBlob = false;
  const cleanText =
    updatedText !== undefined && updatedText.trim().length > 0
      ? sanitizeText(updatedText)
      : undefined;

  await mutateBlobClassRecords((records) => {
    if (table === "memoryEntries") {
      const item = records.memoryEntries.find((m) => m.id === id);
      if (item) {
        item.status = status;
        if (cleanText) item.message = cleanText;
        foundInBlob = true;
      }
    } else if (table === "dreams") {
      const item = records.dreams.find((d) => d.id === id);
      if (item) {
        item.status = status;
        if (cleanText) item.dream = cleanText;
        foundInBlob = true;
      }
    } else if (table === "dreamCheers") {
      const item = records.dreamCheers.find((c) => c.id === id);
      if (item) {
        item.status = status;
        if (cleanText) item.message = cleanText;
        foundInBlob = true;
      }
    } else if (table === "timeCapsules") {
      const item = records.rawTimeCapsules.find((c) => c.id === id);
      if (item) {
        item.status = status;
        if (cleanText) item.message = cleanText;
        foundInBlob = true;
      }
    } else if (table === "thanksList") {
      const item = records.thanksList.find((t) => t.id === id);
      if (item) {
        item.status = status;
        if (cleanText) item.message = cleanText;
        foundInBlob = true;
      }
    } else if (table === "works") {
      const item = records.works.find((w) => w.id === id);
      if (item) {
        item.status = status;
        if (cleanText) item.description = cleanText;
        foundInBlob = true;
      }
    }
  });

  return foundInBlob;
}

export async function deleteModeratedItem(
  table: ModeratableTable,
  id: string
) {
  if (table === "moments" || table === "works") {
    const res = await deleteMediaFromBlob({ id });
    if (res.deleted) return true;
  }

  let deleted = false;
  await mutateBlobClassRecords((records) => {
    if (table === "memoryEntries") {
      const before = records.memoryEntries.length;
      records.memoryEntries = records.memoryEntries.filter((m) => m.id !== id);
      deleted = records.memoryEntries.length < before;
    } else if (table === "dreams") {
      const before = records.dreams.length;
      records.dreams = records.dreams.filter((d) => d.id !== id);
      deleted = records.dreams.length < before;
    } else if (table === "dreamCheers") {
      const before = records.dreamCheers.length;
      records.dreamCheers = records.dreamCheers.filter((c) => c.id !== id);
      deleted = records.dreamCheers.length < before;
    } else if (table === "timeCapsules") {
      const before = records.rawTimeCapsules.length;
      records.rawTimeCapsules = records.rawTimeCapsules.filter(
        (c) => c.id !== id
      );
      deleted = records.rawTimeCapsules.length < before;
    } else if (table === "thanksList") {
      const before = records.thanksList.length;
      records.thanksList = records.thanksList.filter((t) => t.id !== id);
      deleted = records.thanksList.length < before;
    } else if (table === "works") {
      const before = records.works.length;
      records.works = records.works.filter((w) => w.id !== id);
      deleted = records.works.length < before;
    }
  });

  return deleted;
}

export async function updateSiteSettings(graduationDate: string) {
  await mutateBlobClassRecords((records) => {
    records.settings.graduation_date = graduationDate;
  });
  return { graduation_date: graduationDate };
}

export async function upsertStudentAdmin(
  student: Partial<StudentRow> & { full_name: string }
) {
  const currentStore = await fetchAllFromStorage();
  const existing = student.id
    ? currentStore.students.find((s) => s.id === student.id)
    : undefined;

  const cleanFullName = sanitizeText(student.full_name);
  const cleanNickname = sanitizeText(
    student.nickname || student.full_name.split(" ")[0] || ""
  );
  const cleanBio = sanitizeText(student.bio ?? existing?.bio ?? "");
  const cleanTags =
    student.tags !== undefined
      ? student.tags.map((t) => sanitizeText(t)).filter(Boolean)
      : (existing?.tags ?? []);
  const railGroup =
    student.rail_group ??
    existing?.rail_group ??
    (student.gender === "P" ? "P1" : "L");
  const isActive =
    student.is_active !== undefined ? student.is_active : railGroup !== "moved";
  const gender: StudentRow["gender"] =
    student.gender ||
    existing?.gender ||
    (railGroup === "P1" || railGroup === "P2" ? "P" : "L");

  const stuUuid = student.id || crypto.randomUUID();
  const slug =
    existing?.slug ||
    student.slug ||
    `${cleanNickname.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${stuUuid.slice(0, 6)}`;

  let finalPhotoUrl =
    student.photo_url !== undefined
      ? student.photo_url
      : (existing?.photo_url ?? "");

  // Jika foto siswa masih berupa data URL base64, unggah ke Vercel Blob (students/) terlebih dahulu
  if (finalPhotoUrl.startsWith("data:image/")) {
    const parsed = parseImageDataUrl(finalPhotoUrl);
    const uploaded = await uploadMediaToBlob({
      channel: "students",
      buffer: parsed.buffer,
      contentType: parsed.contentType,
      category: isActive ? "ID Card Siswa" : "ID Card Sahabat Istimewa",
      caption: `Potret ID Card ${cleanFullName}`,
      studentId: stuUuid,
      studentName: cleanFullName,
      status: "approved",
      featured: true,
    });
    finalPhotoUrl = uploaded.item.url;
  }

  const payload: StudentRow = {
    id: stuUuid,
    slug,
    full_name: cleanFullName,
    nickname: cleanNickname,
    gender,
    is_active: isActive,
    show_photo: student.show_photo ?? existing?.show_photo ?? true,
    photo_url: finalPhotoUrl,
    bio: cleanBio,
    tags: cleanTags,
    links: student.links ?? existing?.links ?? [],
    tone: (student.tone ?? existing?.tone ?? (isActive ? 1 : 5)) as
      | 1
      | 2
      | 3
      | 4
      | 5,
    rail_group: railGroup,
    sort_order: existing?.sort_order ?? currentStore.students.length + 1,
  };

  await mutateBlobClassRecords((records) => {
    const idx = records.students.findIndex((s) => s.id === stuUuid);
    if (idx >= 0) {
      records.students[idx] = payload;
    } else {
      records.students.push(payload);
    }
  });

  return payload;
}

export async function deleteStudentAdmin(id: string) {
  let deleted = false;
  await mutateBlobClassRecords((records) => {
    const before = records.students.length;
    records.students = records.students.filter((s) => s.id !== id);
    deleted = records.students.length < before;
  });
  return deleted;
}

export async function upsertTeacherAdmin(
  teacher: Partial<TeacherRow> & { full_name: string; title: string }
) {
  const currentStore = await fetchAllFromStorage();
  const existing = teacher.id
    ? currentStore.teachers.find((t) => t.id === teacher.id)
    : undefined;

  const cleanFullName = sanitizeText(teacher.full_name);
  const cleanTitle = sanitizeText(teacher.title);
  const cleanMessage = sanitizeText(
    teacher.message ?? existing?.message ?? ""
  );
  const isHomeroom = Boolean(
    teacher.is_homeroom ?? existing?.is_homeroom ?? false
  );
  const teaUuid = teacher.id || crypto.randomUUID();

  let finalPhotoUrl =
    teacher.photo_url !== undefined
      ? teacher.photo_url
      : (existing?.photo_url ?? "");

  if (finalPhotoUrl.startsWith("data:image/")) {
    const parsed = parseImageDataUrl(finalPhotoUrl);
    const uploaded = await uploadMediaToBlob({
      channel: "students",
      buffer: parsed.buffer,
      contentType: parsed.contentType,
      category: "Foto ID Card Guru",
      caption: `Potret Pendidik ${cleanFullName}`,
      studentId: teaUuid,
      studentName: cleanFullName,
      status: "approved",
      featured: true,
    });
    finalPhotoUrl = uploaded.item.url;
  }

  const payload: TeacherRow = {
    id: teaUuid,
    full_name: cleanFullName,
    title: cleanTitle,
    grp: (teacher.grp || existing?.grp || "kejuruan") as TeacherRow["grp"],
    is_homeroom: isHomeroom,
    photo_url: finalPhotoUrl,
    message: cleanMessage,
    tone: (teacher.tone ?? existing?.tone ?? (isHomeroom ? 3 : 1)) as
      | 1
      | 2
      | 3
      | 4
      | 5,
    sort_order: isHomeroom
      ? 0
      : (existing?.sort_order ?? currentStore.teachers.length + 1),
  };

  await mutateBlobClassRecords((records) => {
    if (isHomeroom) {
      for (const t of records.teachers) {
        t.is_homeroom = false;
      }
    }
    const idx = records.teachers.findIndex((t) => t.id === teaUuid);
    if (idx >= 0) {
      records.teachers[idx] = payload;
    } else {
      records.teachers.push(payload);
    }
  });

  return payload;
}

export async function deleteTeacherAdmin(id: string) {
  let deleted = false;
  await mutateBlobClassRecords((records) => {
    const before = records.teachers.length;
    records.teachers = records.teachers.filter((t) => t.id !== id);
    deleted = records.teachers.length < before;
  });
  return deleted;
}

export async function createPollAdmin(question: string, options: string[]) {
  const cleanQuestion = sanitizeText(question);
  const cleanOptions = options
    .map((o) => sanitizeText(o))
    .filter((o) => o.length > 0);
  if (!cleanQuestion || cleanOptions.length < 2) {
    throw new Error("Pertanyaan dan minimal 2 pilihan jawaban wajib diisi.");
  }

  const pollId = crypto.randomUUID();
  const poll: PollWithOptions = {
    id: pollId,
    question: cleanQuestion,
    is_open: true,
    options: cleanOptions.map((label) => ({
      id: crypto.randomUUID(),
      poll_id: pollId,
      label,
      votes: 0,
    })),
    total_votes: 0,
  };

  await mutateBlobClassRecords((records) => {
    records.polls.push(poll);
  });

  return pollId;
}

export async function deletePollAdmin(pollId: string) {
  let deleted = false;
  await mutateBlobClassRecords((records) => {
    const before = records.polls.length;
    records.polls = records.polls.filter((p) => p.id !== pollId);
    deleted = records.polls.length < before;
  });
  return deleted;
}
