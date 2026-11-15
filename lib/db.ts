import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateInitialSeedData } from "@/lib/seed-data";
import {
  maskTimeCapsuleForPublic,
  sanitizeText,
  type SubmitPayload,
} from "@/lib/domain-logic";
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

interface StoreShape {
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
  pollVoterHashes: Record<string, string[]>;
  settings: {
    graduation_date: string;
  };
  updatedAt?: number;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const PRIMARY_STORE_PATH = path.join(DATA_DIR, "xii-pplg1-makn-ende-store.json");
const FALLBACK_STORE_PATH = "/tmp/xii-pplg1-makn-ende-store.json";

declare global {
  var __xiiPplgStore: StoreShape | undefined;
  var __xiiPplgStoreMtime: number | undefined;
  var __xiiPplgSupabaseSeeded: boolean | undefined;
}

function getStorePath(): string {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return PRIMARY_STORE_PATH;
  } catch {
    return FALLBACK_STORE_PATH;
  }
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  return Boolean(
    url &&
      key &&
      url.startsWith("https://") &&
      !url.includes("your-project-id") &&
      !key.includes("your-supabase")
  );
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ).trim(),
    {
      auth: { persistSession: false },
    }
  );
}

/**
 * Buat UUID deterministik dari string ID agar ID seed (mis. "student-l-1") kompatibel
 * dengan kolom bertipe UUID di PostgreSQL Supabase.
 */
export function toDeterministicUuid(input: string): string {
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input
    )
  ) {
    return input.toLowerCase();
  }
  const hash = crypto.createHash("sha256").update(`xiipplg1:${input}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

/**
 * Selalu muat data terbaru dari disk jika file berubah (menghindari bug stale cache antar worker Next.js).
 */
function loadStore(): StoreShape {
  const storePath = getStorePath();
  try {
    if (fs.existsSync(storePath)) {
      const stat = fs.statSync(storePath);
      if (
        global.__xiiPplgStore &&
        global.__xiiPplgStoreMtime !== undefined &&
        global.__xiiPplgStoreMtime >= stat.mtimeMs
      ) {
        return global.__xiiPplgStore;
      }
      const raw = fs.readFileSync(storePath, "utf8");
      const parsed = JSON.parse(raw) as StoreShape;
      global.__xiiPplgStore = parsed;
      global.__xiiPplgStoreMtime = stat.mtimeMs;
      return parsed;
    }
    if (storePath !== FALLBACK_STORE_PATH && fs.existsSync(FALLBACK_STORE_PATH)) {
      const stat = fs.statSync(FALLBACK_STORE_PATH);
      const raw = fs.readFileSync(FALLBACK_STORE_PATH, "utf8");
      const parsed = JSON.parse(raw) as StoreShape;
      global.__xiiPplgStore = parsed;
      global.__xiiPplgStoreMtime = stat.mtimeMs;
      return parsed;
    }
  } catch {
    if (global.__xiiPplgStore) return global.__xiiPplgStore;
  }

  const seed = generateInitialSeedData();
  const initial: StoreShape = {
    students: seed.students,
    teachers: seed.teachers,
    moments: seed.moments,
    dreams: seed.dreams,
    dreamCheers: seed.dreamCheers,
    memoryEntries: seed.memoryEntries,
    rawTimeCapsules: seed.rawTimeCapsules.map((c) => ({ ...c })),
    thanksList: seed.thanksList,
    works: seed.works,
    polls: seed.polls,
    pollVoterHashes: {},
    settings: seed.settings,
    updatedAt: Date.now(),
  };
  saveStore(initial);
  return initial;
}

function saveStore(store: StoreShape) {
  store.updatedAt = Date.now();
  global.__xiiPplgStore = store;
  const serialized = JSON.stringify(store, null, 2);
  const storePath = getStorePath();
  try {
    fs.writeFileSync(storePath, serialized, "utf8");
    const stat = fs.statSync(storePath);
    global.__xiiPplgStoreMtime = stat.mtimeMs;
  } catch {
    try {
      fs.writeFileSync(FALLBACK_STORE_PATH, serialized, "utf8");
      const stat = fs.statSync(FALLBACK_STORE_PATH);
      global.__xiiPplgStoreMtime = stat.mtimeMs;
    } catch {
      // Ignore read-only filesystem errors
    }
  }
}

/**
 * Pastikan database Supabase sudah memiliki data awal bila tabel students masih kosong.
 */
export async function ensureSupabaseSeeded(
  supabase: SupabaseClient
): Promise<boolean> {
  if (global.__xiiPplgSupabaseSeeded) return true;
  try {
    const { count, error } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true });
    if (error) {
      return false;
    }
    if (count && count > 0) {
      global.__xiiPplgSupabaseSeeded = true;
      return true;
    }

    const store = loadStore();

    // 1. Seed Students
    const studentRows = store.students.map((s) => ({
      id: toDeterministicUuid(s.id),
      slug: s.slug,
      full_name: s.full_name,
      nickname: s.nickname,
      gender: s.gender,
      is_active: s.is_active,
      show_photo: s.show_photo,
      photo_url: s.photo_url,
      bio: s.bio,
      tags: s.tags,
      links: s.links,
      tone: s.tone,
      rail_group: s.rail_group,
      sort_order: s.sort_order,
    }));
    await supabase.from("students").upsert(studentRows, { onConflict: "id" });

    // 2. Seed Teachers
    const teacherRows = store.teachers.map((t) => ({
      id: toDeterministicUuid(t.id),
      full_name: t.full_name,
      title: t.title,
      grp: t.grp,
      is_homeroom: t.is_homeroom,
      photo_url: t.photo_url,
      message: t.message,
      tone: t.tone,
      sort_order: t.sort_order,
    }));
    await supabase.from("teachers").upsert(teacherRows, { onConflict: "id" });

    // 3. Seed Moments
    const momentRows = store.moments.map((m) => ({
      id: toDeterministicUuid(m.id),
      image_url: m.image_url,
      caption: m.caption,
      taken_at: m.taken_at,
      category: m.category,
      phase: m.phase,
      uploader_name: m.uploader_name,
      featured: m.featured,
      status: m.status,
    }));
    await supabase.from("moments").upsert(momentRows, { onConflict: "id" });

    // 4. Seed Dreams
    const dreamRows = store.dreams.map((d) => ({
      id: toDeterministicUuid(d.id),
      student_id: toDeterministicUuid(d.student_id),
      dream: d.dream,
      reason: d.reason,
      paper_color: d.paper_color,
      status: d.status,
    }));
    await supabase.from("dreams").upsert(dreamRows, { onConflict: "student_id" });

    // 5. Seed Dream Cheers
    const cheerRows = store.dreamCheers.map((c) => ({
      id: toDeterministicUuid(c.id),
      dream_id: toDeterministicUuid(c.dream_id),
      author_name: c.author_name,
      message: c.message,
      status: c.status,
    }));
    await supabase.from("dream_cheers").upsert(cheerRows, { onConflict: "id" });

    // 6. Seed Memory Entries
    const memoryRows = store.memoryEntries.map((m) => ({
      id: toDeterministicUuid(m.id),
      student_id: toDeterministicUuid(m.student_id),
      author_name: m.author_name,
      message: m.message,
      decor_seed: m.decor_seed,
      status: m.status,
    }));
    await supabase.from("memory_entries").upsert(memoryRows, { onConflict: "id" });

    // 7. Seed Time Capsules
    const capsuleRows = store.rawTimeCapsules.map((c) => ({
      id: toDeterministicUuid(c.id),
      author_name: c.author_name,
      recipient_label: c.recipient_label,
      message: c.message,
      unlock_at: c.unlock_at,
      status: c.status,
    }));
    await supabase.from("time_capsules").upsert(capsuleRows, { onConflict: "id" });

    // 8. Seed Thanks
    const thanksRows = store.thanksList.map((th) => ({
      id: toDeterministicUuid(th.id),
      from_name: th.from_name,
      to_name: th.to_name,
      message: th.message,
      status: th.status,
    }));
    await supabase.from("thanks").upsert(thanksRows, { onConflict: "id" });

    // 9. Seed Works
    const workRows = store.works.map((w) => ({
      id: toDeterministicUuid(w.id),
      student_id: toDeterministicUuid(w.student_id),
      title: w.title,
      description: w.description,
      tags: w.tags,
      image_url: w.image_url,
      demo_url: w.demo_url,
      repo_url: w.repo_url || "",
      status: w.status,
    }));
    await supabase.from("works").upsert(workRows, { onConflict: "student_id" });

    // 10. Seed Polls & Options
    for (const poll of store.polls) {
      const pollUuid = toDeterministicUuid(poll.id);
      await supabase.from("polls").upsert(
        {
          id: pollUuid,
          question: poll.question,
          is_open: poll.is_open,
        },
        { onConflict: "id" }
      );
      for (const opt of poll.options) {
        const optUuid = toDeterministicUuid(opt.id);
        await supabase.from("poll_options").upsert(
          {
            id: optUuid,
            poll_id: pollUuid,
            label: opt.label,
          },
          { onConflict: "id" }
        );
      }
    }

    // 11. Seed Site Settings
    await supabase.from("site_settings").upsert(
      {
        key: "graduation_date",
        value: { graduation_date: store.settings.graduation_date },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    global.__xiiPplgSupabaseSeeded = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Ambil seluruh data dari Supabase PostgreSQL bila terhubung.
 * Mengembalikan null bila Supabase belum dikonfigurasi atau tabel belum dimigrasi.
 */
async function fetchAllFromSupabase(): Promise<StoreShape | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const ready = await ensureSupabaseSeeded(supabase);
  if (!ready) return null;

  try {
    const [
      stuRes,
      teaRes,
      momRes,
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
      supabase.from("students").select("*").order("sort_order", { ascending: true }),
      supabase.from("teachers").select("*").order("sort_order", { ascending: true }),
      supabase.from("moments").select("*").order("created_at", { ascending: false }),
      supabase.from("dreams").select("*").order("created_at", { ascending: false }),
      supabase.from("dream_cheers").select("*").order("created_at", { ascending: false }),
      supabase.from("memory_entries").select("*").order("created_at", { ascending: false }),
      supabase.from("time_capsules").select("*").order("created_at", { ascending: false }),
      supabase.from("thanks").select("*").order("created_at", { ascending: false }),
      supabase.from("works").select("*").order("created_at", { ascending: false }),
      supabase.from("polls").select("*").order("created_at", { ascending: true }),
      supabase.from("poll_options").select("*"),
      supabase.from("poll_votes").select("*"),
      supabase.from("site_settings").select("*").eq("key", "graduation_date").maybeSingle(),
    ]);

    if (stuRes.error || teaRes.error) {
      return null;
    }

    const students: StudentRow[] = (stuRes.data ?? []).map((s) => ({
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
      tone: (Number(s.tone || 1) as 1 | 2 | 3 | 4 | 5),
      rail_group: (s.rail_group || (s.is_active === false ? "moved" : s.gender === "P" ? "P1" : "L")) as StudentRow["rail_group"],
      sort_order: Number(s.sort_order ?? 0),
    }));

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const teachers: TeacherRow[] = (teaRes.data ?? []).map((t) => ({
      id: String(t.id),
      full_name: String(t.full_name || ""),
      title: String(t.title || ""),
      grp: (t.grp || "kejuruan") as TeacherRow["grp"],
      is_homeroom: Boolean(t.is_homeroom ?? false),
      photo_url: String(t.photo_url || ""),
      message: String(t.message || ""),
      tone: (Number(t.tone || 1) as 1 | 2 | 3 | 4 | 5),
      sort_order: Number(t.sort_order ?? 0),
    }));

    const moments: MomentRow[] = (momRes.data ?? []).map((m) => ({
      id: String(m.id),
      image_url: String(m.image_url || ""),
      caption: String(m.caption || ""),
      taken_at: String(m.taken_at || ""),
      category: String(m.category || "Momen lucu"),
      phase: (m.phase || "XII") as MomentRow["phase"],
      uploader_name: String(m.uploader_name || "Siswa"),
      featured: Boolean(m.featured ?? true),
      status: (m.status || "pending") as ContentStatus,
      created_at: m.created_at ? String(m.created_at) : undefined,
    }));

    const dreamCheers: DreamCheerRow[] = (chrRes.data ?? []).map((c) => ({
      id: String(c.id),
      dream_id: String(c.dream_id || ""),
      author_name: String(c.author_name || "Sahabat"),
      message: String(c.message || ""),
      status: (c.status || "pending") as ContentStatus,
      created_at: c.created_at ? String(c.created_at) : undefined,
    }));

    const dreams: DreamRow[] = (drmRes.data ?? []).map((d) => {
      const stu = studentMap.get(String(d.student_id));
      return {
        id: String(d.id),
        student_id: String(d.student_id),
        student_name: stu?.full_name ?? "Siswa XII PPLG 1",
        student_nickname: stu?.nickname ?? "Sahabat",
        dream: String(d.dream || ""),
        reason: String(d.reason || ""),
        paper_color: String(d.paper_color || "#FFF7D6"),
        status: (d.status || "pending") as ContentStatus,
        cheers: dreamCheers.filter(
          (c) => c.dream_id === String(d.id) && c.status === "approved"
        ),
      };
    });

    const memoryEntries: MemoryEntryRow[] = (memRes.data ?? []).map((m) => ({
      id: String(m.id),
      student_id: String(m.student_id || ""),
      author_name: String(m.author_name || "Sahabat"),
      message: String(m.message || ""),
      decor_seed: Number(m.decor_seed ?? 100),
      status: (m.status || "pending") as ContentStatus,
      created_at: m.created_at ? String(m.created_at) : undefined,
    }));

    const rawTimeCapsules: RawTimeCapsuleStoreRow[] = (capRes.data ?? []).map((c) => ({
      id: String(c.id),
      author_name: String(c.author_name || "Sahabat"),
      recipient_label: String(c.recipient_label || "Untuk Kelas XII PPLG 1"),
      message: String(c.message || ""),
      unlock_at: String(c.unlock_at || new Date().toISOString()),
      status: (c.status || "pending") as ContentStatus,
      created_at: c.created_at ? String(c.created_at) : undefined,
    }));

    const thanksList: ThanksRow[] = (thkRes.data ?? []).map((th) => ({
      id: String(th.id),
      from_name: String(th.from_name || "Sahabat"),
      to_name: String(th.to_name || "Keluarga XII PPLG 1"),
      message: String(th.message || ""),
      status: (th.status || "pending") as ContentStatus,
      created_at: th.created_at ? String(th.created_at) : undefined,
    }));

    const works: WorkRow[] = (wrkRes.data ?? []).map((w) => {
      const stu = studentMap.get(String(w.student_id));
      return {
        id: String(w.id),
        student_id: String(w.student_id),
        student_name: stu?.full_name ?? "Siswa XII PPLG 1",
        title: String(w.title || ""),
        description: String(w.description || ""),
        tags: Array.isArray(w.tags) ? w.tags.map(String) : [],
        image_url: String(w.image_url || ""),
        demo_url: String(w.demo_url || ""),
        repo_url: String(w.repo_url || ""),
        status: (w.status || "pending") as ContentStatus,
      };
    });

    const localFallback = loadStore();
    const voteRows = votRes.data ?? [];
    const optionRows = optRes.data ?? [];
    const pollRows = polRes.data ?? [];

    const polls: PollWithOptions[] =
      pollRows.length > 0
        ? pollRows.map((p) => {
            const pid = String(p.id);
            const opts = optionRows
              .filter((o) => String(o.poll_id) === pid)
              .map((o) => {
                const oid = String(o.id);
                const count = voteRows.filter((v) => String(v.option_id) === oid).length;
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
          })
        : localFallback.polls;

    const gradDateFromDb =
      (setRes.data?.value as { graduation_date?: string } | null)?.graduation_date ||
      localFallback.settings.graduation_date;

    return {
      students,
      teachers,
      moments,
      dreams,
      dreamCheers,
      memoryEntries,
      rawTimeCapsules,
      thanksList,
      works,
      polls,
      pollVoterHashes: localFallback.pollVoterHashes,
      settings: {
        graduation_date: gradDateFromDb,
      },
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Ambil semua data publik yang sudah berstatus 'approved' (dan sembunyikan pesan kapsul waktu yang belum terbuka).
 * Semua halaman Frontend mengandalkan fungsi ini sebagai Single Source of Truth.
 */
export async function getPublicAppData() {
  const supabaseStore = await fetchAllFromSupabase();
  const store = supabaseStore ?? loadStore();
  const nowMs = Date.now();

  const approvedCheers = store.dreamCheers.filter((c) => c.status === "approved");
  const dreamsWithCheers: DreamRow[] = store.dreams
    .filter((d) => d.status === "approved")
    .map((d) => {
      const stu = store.students.find((s) => s.id === d.student_id);
      return {
        ...d,
        student_name: stu?.full_name ?? d.student_name ?? "Siswa XII PPLG 1",
        student_nickname: stu?.nickname ?? d.student_nickname ?? "Sahabat",
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
        student_name: stu?.full_name ?? w.student_name ?? "Siswa XII PPLG 1",
      };
    });

  const sortedStudents = [...store.students].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const sortedTeachers = [...store.teachers].sort(
    (a, b) => (b.is_homeroom ? 1 : 0) - (a.is_homeroom ? 1 : 0) || a.sort_order - b.sort_order
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
    supabaseConnected: Boolean(supabaseStore) || isSupabaseConfigured(),
    updatedAt: store.updatedAt ?? nowMs,
  };
}

/**
 * Simpan kiriman publik baru dengan status = 'pending' agar dimoderasi admin terlebih dahulu.
 */
export async function createPendingSubmission(payload: SubmitPayload) {
  const store = loadStore();
  const supabase = getSupabaseAdminClient();
  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  switch (payload.type) {
    case "memory": {
      const entry: MemoryEntryRow = {
        id,
        student_id: payload.studentId,
        author_name: sanitizeText(payload.authorName),
        message: sanitizeText(payload.message),
        decor_seed: Math.floor(Math.random() * 900) + 100,
        status: "pending",
        created_at: nowIso,
      };
      store.memoryEntries.unshift(entry);
      saveStore(store);

      if (supabase) {
        await supabase.from("memory_entries").insert({
          id,
          student_id: toDeterministicUuid(payload.studentId),
          author_name: entry.author_name,
          message: entry.message,
          decor_seed: entry.decor_seed,
          status: "pending",
        });
      }
      return { id, type: payload.type, status: "pending" as const };
    }

    case "dream": {
      const stu = store.students.find((s) => s.id === payload.studentId);
      const existingIdx = store.dreams.findIndex(
        (d) => d.student_id === payload.studentId && d.status === "pending"
      );
      const dreamEntry: DreamRow = {
        id,
        student_id: payload.studentId,
        student_name: stu?.full_name ?? "Siswa XII PPLG 1",
        student_nickname: stu?.nickname ?? "Sahabat",
        dream: sanitizeText(payload.dream),
        reason: sanitizeText(payload.reason),
        paper_color: payload.paperColor || "#FFF7D6",
        status: "pending",
        cheers: [],
      };
      if (existingIdx >= 0) {
        store.dreams[existingIdx] = dreamEntry;
      } else {
        store.dreams.unshift(dreamEntry);
      }
      saveStore(store);

      if (supabase) {
        await supabase.from("dreams").upsert(
          {
            id,
            student_id: toDeterministicUuid(payload.studentId),
            dream: dreamEntry.dream,
            reason: dreamEntry.reason,
            paper_color: dreamEntry.paper_color,
            status: "pending",
          },
          { onConflict: "student_id" }
        );
      }
      return { id, type: payload.type, status: "pending" as const };
    }

    case "dream_cheer": {
      const cheer: DreamCheerRow = {
        id,
        dream_id: payload.dreamId,
        author_name: sanitizeText(payload.authorName),
        message: sanitizeText(payload.message),
        status: "pending",
        created_at: nowIso,
      };
      store.dreamCheers.unshift(cheer);
      saveStore(store);

      if (supabase) {
        await supabase.from("dream_cheers").insert({
          id,
          dream_id: toDeterministicUuid(payload.dreamId),
          author_name: cheer.author_name,
          message: cheer.message,
          status: "pending",
        });
      }
      return { id, type: payload.type, status: "pending" as const };
    }

    case "time_capsule": {
      const unlockIso = new Date(payload.unlockAt).toISOString();
      const recipientLabel = sanitizeText(
        payload.recipientLabel || "Untuk Kelas XII PPLG 1"
      );
      const cleanAuthor = sanitizeText(payload.authorName);
      const cleanMessage = sanitizeText(payload.message);

      store.rawTimeCapsules.unshift({
        id,
        author_name: cleanAuthor,
        recipient_label: recipientLabel,
        message: cleanMessage,
        unlock_at: unlockIso,
        status: "pending",
        created_at: nowIso,
      });
      saveStore(store);

      if (supabase) {
        await supabase.from("time_capsules").insert({
          id,
          author_name: cleanAuthor,
          recipient_label: recipientLabel,
          message: cleanMessage,
          unlock_at: unlockIso,
          status: "pending",
        });
      }
      return { id, type: payload.type, status: "pending" as const };
    }

    case "thanks": {
      const item: ThanksRow = {
        id,
        from_name: sanitizeText(payload.fromName),
        to_name: sanitizeText(payload.toName),
        message: sanitizeText(payload.message),
        status: "pending",
        created_at: nowIso,
      };
      store.thanksList.unshift(item);
      saveStore(store);

      if (supabase) {
        await supabase.from("thanks").insert({
          id,
          from_name: item.from_name,
          to_name: item.to_name,
          message: item.message,
          status: "pending",
        });
      }
      return { id, type: payload.type, status: "pending" as const };
    }

    case "moment": {
      const seedNum = (store.moments.length % 100) + 1;
      const imageUrl =
        payload.imageDataUrl && payload.imageDataUrl.startsWith("data:image/")
          ? payload.imageDataUrl
          : `/api/moment-illustration?seed=${seedNum}`;
      const moment: MomentRow = {
        id,
        image_url: imageUrl,
        caption: sanitizeText(payload.caption),
        taken_at: payload.takenAt || nowIso.slice(0, 10),
        category: sanitizeText(payload.category),
        phase: payload.phase,
        uploader_name: sanitizeText(payload.uploaderName),
        featured: true,
        status: "pending",
        created_at: nowIso,
      };
      store.moments.unshift(moment);
      saveStore(store);

      if (supabase) {
        await supabase.from("moments").insert({
          id,
          image_url: moment.image_url,
          caption: moment.caption,
          taken_at: moment.taken_at,
          category: moment.category,
          phase: moment.phase,
          uploader_name: moment.uploader_name,
          featured: true,
          status: "pending",
        });
      }
      return { id, type: payload.type, status: "pending" as const };
    }

    case "work": {
      const stu = store.students.find((s) => s.id === payload.studentId);
      const work: WorkRow = {
        id,
        student_id: payload.studentId,
        student_name: stu?.full_name ?? "Siswa XII PPLG 1",
        title: sanitizeText(payload.title),
        description: sanitizeText(payload.description),
        tags: payload.tags.map((t) => sanitizeText(t)),
        image_url: "",
        demo_url: payload.demoUrl || "",
        repo_url: payload.repoUrl || "",
        status: "pending",
      };
      store.works.unshift(work);
      saveStore(store);

      if (supabase) {
        await supabase.from("works").upsert(
          {
            id,
            student_id: toDeterministicUuid(payload.studentId),
            title: work.title,
            description: work.description,
            tags: work.tags,
            image_url: work.image_url,
            demo_url: work.demo_url,
            repo_url: work.repo_url,
            status: "pending",
          },
          { onConflict: "student_id" }
        );
      }
      return { id, type: payload.type, status: "pending" as const };
    }
  }
}

/**
 * Rekam suara polling kelas dengan pencegahan duplikat (1 perangkat 1 suara per poll via voter_hash).
 */
export async function voteOnPoll(
  pollId: string,
  optionId: string,
  voterHash: string
): Promise<{ ok: boolean; error?: string; poll?: PollWithOptions }> {
  const store = loadStore();
  const supabase = getSupabaseAdminClient();

  const poll = store.polls.find(
    (p) => p.id === pollId || toDeterministicUuid(p.id) === pollId
  );
  if (!poll || !poll.is_open) {
    return { ok: false, error: "Polling tidak ditemukan atau sudah ditutup." };
  }
  const opt = poll.options.find(
    (o) => o.id === optionId || toDeterministicUuid(o.id) === optionId
  );
  if (!opt) {
    return { ok: false, error: "Pilihan suara tidak valid." };
  }

  const existingVoters = store.pollVoterHashes[poll.id] ?? [];
  if (existingVoters.includes(voterHash)) {
    return {
      ok: false,
      error: "Perangkat ini sudah memberikan suara pada polling ini.",
      poll,
    };
  }

  if (supabase) {
    const optUuid = toDeterministicUuid(opt.id);
    const { error: voteErr } = await supabase.from("poll_votes").insert({
      option_id: optUuid,
      voter_hash: voterHash,
    });
    if (voteErr && voteErr.code === "23505") {
      return {
        ok: false,
        error: "Perangkat ini sudah memberikan suara pada polling ini.",
        poll,
      };
    }
  }

  opt.votes += 1;
  poll.total_votes += 1;
  store.pollVoterHashes[poll.id] = [...existingVoters, voterHash];
  saveStore(store);

  return { ok: true, poll };
}

/**
 * Data lengkap untuk dasbor Admin (termasuk antrean moderasi 'pending' dan 'rejected').
 */
export async function getAdminDashboardData() {
  const supabaseStore = await fetchAllFromSupabase();
  const store = supabaseStore ?? loadStore();
  return {
    students: [...store.students].sort((a, b) => a.sort_order - b.sort_order),
    teachers: [...store.teachers].sort(
      (a, b) => (b.is_homeroom ? 1 : 0) - (a.is_homeroom ? 1 : 0) || a.sort_order - b.sort_order
    ),
    moments: store.moments,
    dreams: store.dreams,
    dreamCheers: store.dreamCheers,
    memoryEntries: store.memoryEntries,
    timeCapsules: store.rawTimeCapsules,
    thanksList: store.thanksList,
    works: store.works,
    settings: store.settings,
    supabaseConnected: Boolean(supabaseStore) || isSupabaseConfigured(),
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

const SUPABASE_TABLE_MAP: Record<ModeratableTable, string> = {
  moments: "moments",
  dreams: "dreams",
  dreamCheers: "dream_cheers",
  memoryEntries: "memory_entries",
  timeCapsules: "time_capsules",
  thanksList: "thanks",
  works: "works",
};

export async function moderateItem(
  table: ModeratableTable,
  id: string,
  status: ContentStatus,
  updatedText?: string
) {
  const store = loadStore();
  const supabase = getSupabaseAdminClient();

  const listMap: Record<ModeratableTable, Array<{ id: string; status: ContentStatus }>> = {
    moments: store.moments,
    dreams: store.dreams,
    dreamCheers: store.dreamCheers,
    memoryEntries: store.memoryEntries,
    timeCapsules: store.rawTimeCapsules,
    thanksList: store.thanksList,
    works: store.works,
  };

  const list = listMap[table];
  const item = list?.find(
    (x) => x.id === id || toDeterministicUuid(x.id) === id
  ) as Record<string, unknown> | undefined;

  const cleanText =
    updatedText !== undefined && updatedText.trim().length > 0
      ? sanitizeText(updatedText)
      : undefined;

  if (item) {
    item.status = status;
    if (cleanText !== undefined) {
      if ("message" in item) item.message = cleanText;
      else if ("caption" in item) item.caption = cleanText;
      else if ("dream" in item) item.dream = cleanText;
      else if ("description" in item) item.description = cleanText;
    }

    // Jika work atau dream disetujui untuk student_id yang sama, arsipkan yang lama agar 1 siswa = 1 karya/dream utama
    if (status === "approved" && (table === "works" || table === "dreams")) {
      const studentId = item.student_id as string;
      for (const other of list as Array<Record<string, unknown>>) {
        if (
          other.id !== item.id &&
          (other.student_id === studentId ||
            toDeterministicUuid(String(other.student_id)) ===
              toDeterministicUuid(studentId)) &&
          other.status === "approved"
        ) {
          other.status = "rejected";
        }
      }
    }
    saveStore(store);
  }

  if (supabase) {
    const sbTable = SUPABASE_TABLE_MAP[table];
    const targetUuid = toDeterministicUuid(id);
    const updatePayload: Record<string, unknown> = { status };
    if (cleanText !== undefined) {
      if (
        table === "memoryEntries" ||
        table === "dreamCheers" ||
        table === "timeCapsules" ||
        table === "thanksList"
      ) {
        updatePayload.message = cleanText;
      } else if (table === "moments") {
        updatePayload.caption = cleanText;
      } else if (table === "dreams") {
        updatePayload.dream = cleanText;
      } else if (table === "works") {
        updatePayload.description = cleanText;
      }
    }
    await supabase.from(sbTable).update(updatePayload).eq("id", targetUuid);
    return true;
  }

  return Boolean(item);
}

export async function updateSiteSettings(graduationDate: string) {
  const store = loadStore();
  store.settings.graduation_date = graduationDate;
  saveStore(store);

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    await supabase.from("site_settings").upsert(
      {
        key: "graduation_date",
        value: { graduation_date: graduationDate },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  }

  return store.settings;
}

export async function upsertStudentAdmin(
  student: Partial<StudentRow> & { full_name: string }
) {
  const store = loadStore();
  const supabase = getSupabaseAdminClient();

  const cleanFullName = sanitizeText(student.full_name);
  const cleanNickname = sanitizeText(
    student.nickname || student.full_name.split(" ")[0] || "Siswa"
  );
  const cleanBio = sanitizeText(
    student.bio || "Keluarga besar XII PPLG 1 MAKN Ende."
  );
  const cleanTags =
    student.tags && student.tags.length > 0
      ? student.tags.map((t) => sanitizeText(t)).filter(Boolean)
      : ["Frontend", "PPLG"];
  const railGroup =
    student.rail_group ?? (student.gender === "P" ? "P1" : "L");
  const isActive =
    student.is_active !== undefined ? student.is_active : railGroup !== "moved";
  const gender: StudentRow["gender"] =
    student.gender || (railGroup === "P1" || railGroup === "P2" ? "P" : "L");

  let savedStudent: StudentRow;

  if (student.id) {
    const idx = store.students.findIndex(
      (s) =>
        s.id === student.id ||
        toDeterministicUuid(s.id) === toDeterministicUuid(student.id!)
    );
    if (idx >= 0) {
      const existing = store.students[idx]!;
      savedStudent = {
        ...existing,
        ...student,
        full_name: cleanFullName,
        nickname: cleanNickname,
        bio: cleanBio,
        tags: cleanTags,
        gender,
        is_active: isActive,
        rail_group: railGroup,
        show_photo: student.show_photo ?? existing.show_photo,
        photo_url:
          student.photo_url !== undefined ? student.photo_url : existing.photo_url,
      };
      store.students[idx] = savedStudent;

      // Sinkronkan nama siswa pada Dream Board dan Karya Siswa
      for (const d of store.dreams) {
        if (
          d.student_id === existing.id ||
          toDeterministicUuid(d.student_id) === toDeterministicUuid(existing.id)
        ) {
          d.student_name = savedStudent.full_name;
          d.student_nickname = savedStudent.nickname;
        }
      }
      for (const w of store.works) {
        if (
          w.student_id === existing.id ||
          toDeterministicUuid(w.student_id) === toDeterministicUuid(existing.id)
        ) {
          w.student_name = savedStudent.full_name;
        }
      }
    } else {
      savedStudent = {
        id: student.id,
        slug: `${cleanNickname.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36).slice(-4)}`,
        full_name: cleanFullName,
        nickname: cleanNickname,
        gender,
        is_active: isActive,
        show_photo: student.show_photo ?? true,
        photo_url: student.photo_url || "",
        bio: cleanBio,
        tags: cleanTags,
        links: student.links ?? [{ label: "Karya Kelas", href: "/karya" }],
        tone: student.tone ?? (isActive ? 1 : 5),
        rail_group: railGroup,
        sort_order: store.students.length + 1,
      };
      store.students.push(savedStudent);
    }
  } else {
    const newId = crypto.randomUUID();
    savedStudent = {
      id: newId,
      slug: `${cleanNickname.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36).slice(-4)}`,
      full_name: cleanFullName,
      nickname: cleanNickname,
      gender,
      is_active: isActive,
      show_photo: student.show_photo ?? true,
      photo_url: student.photo_url || "",
      bio: cleanBio,
      tags: cleanTags,
      links: student.links ?? [{ label: "Karya Kelas", href: "/karya" }],
      tone: student.tone ?? (isActive ? 1 : 5),
      rail_group: railGroup,
      sort_order: store.students.length + 1,
    };
    store.students.push(savedStudent);

    // Jika siswa aktif baru belum punya kartu Dream Board, buatkan otomatis agar langsung tampil di Dream Board
    if (isActive) {
      store.dreams.push({
        id: `dream-${newId}`,
        student_id: newId,
        student_name: savedStudent.full_name,
        student_nickname: savedStudent.nickname,
        dream: `Inovator Teknologi & Spesialis ${cleanTags[0] || "PPLG"}`,
        reason: cleanBio,
        paper_color: "#FFF7D6",
        status: "approved",
        cheers: [],
      });
    }
  }

  saveStore(store);

  if (supabase) {
    const stuUuid = toDeterministicUuid(savedStudent.id);
    await supabase.from("students").upsert(
      {
        id: stuUuid,
        slug: savedStudent.slug,
        full_name: savedStudent.full_name,
        nickname: savedStudent.nickname,
        gender: savedStudent.gender,
        is_active: savedStudent.is_active,
        show_photo: savedStudent.show_photo,
        photo_url: savedStudent.photo_url,
        bio: savedStudent.bio,
        tags: savedStudent.tags,
        links: savedStudent.links,
        tone: savedStudent.tone,
        rail_group: savedStudent.rail_group,
        sort_order: savedStudent.sort_order,
      },
      { onConflict: "id" }
    );
  }

  return savedStudent;
}

export async function deleteStudentAdmin(id: string) {
  const store = loadStore();
  const supabase = getSupabaseAdminClient();

  const targetUuid = toDeterministicUuid(id);
  store.students = store.students.filter(
    (s) => s.id !== id && toDeterministicUuid(s.id) !== targetUuid
  );
  store.dreams = store.dreams.filter(
    (d) =>
      d.student_id !== id && toDeterministicUuid(d.student_id) !== targetUuid
  );
  store.works = store.works.filter(
    (w) =>
      w.student_id !== id && toDeterministicUuid(w.student_id) !== targetUuid
  );
  store.memoryEntries = store.memoryEntries.filter(
    (m) =>
      m.student_id !== id && toDeterministicUuid(m.student_id) !== targetUuid
  );
  saveStore(store);

  if (supabase) {
    await supabase.from("students").delete().eq("id", targetUuid);
  }
  return true;
}

export async function upsertTeacherAdmin(
  teacher: Partial<TeacherRow> & { full_name: string; title: string }
) {
  const store = loadStore();
  const supabase = getSupabaseAdminClient();

  const cleanFullName = sanitizeText(teacher.full_name);
  const cleanTitle = sanitizeText(teacher.title);
  const cleanMessage = sanitizeText(
    teacher.message ||
      "Terima kasih atas bimbingan dan doa untuk kelas XII PPLG 1."
  );
  const isHomeroom = Boolean(teacher.is_homeroom ?? false);

  // Jika guru ini dijadikan Wali Kelas, nonaktifkan flag is_homeroom pada guru lain agar tidak ganda
  if (isHomeroom) {
    for (const t of store.teachers) {
      t.is_homeroom = false;
    }
    if (supabase) {
      await supabase
        .from("teachers")
        .update({ is_homeroom: false })
        .eq("is_homeroom", true);
    }
  }

  let savedTeacher: TeacherRow;

  if (teacher.id) {
    const idx = store.teachers.findIndex(
      (t) =>
        t.id === teacher.id ||
        toDeterministicUuid(t.id) === toDeterministicUuid(teacher.id!)
    );
    if (idx >= 0) {
      const existing = store.teachers[idx]!;
      savedTeacher = {
        ...existing,
        ...teacher,
        full_name: cleanFullName,
        title: cleanTitle,
        message: cleanMessage,
        is_homeroom: isHomeroom,
        grp: teacher.grp || existing.grp,
        photo_url:
          teacher.photo_url !== undefined
            ? teacher.photo_url
            : existing.photo_url,
      };
      store.teachers[idx] = savedTeacher;
    } else {
      savedTeacher = {
        id: teacher.id,
        full_name: cleanFullName,
        title: cleanTitle,
        grp: teacher.grp || "kejuruan",
        is_homeroom: isHomeroom,
        photo_url: teacher.photo_url || "",
        message: cleanMessage,
        tone: teacher.tone ?? (isHomeroom ? 3 : 1),
        sort_order: isHomeroom ? 0 : store.teachers.length + 1,
      };
      store.teachers.push(savedTeacher);
    }
  } else {
    savedTeacher = {
      id: crypto.randomUUID(),
      full_name: cleanFullName,
      title: cleanTitle,
      grp: teacher.grp || "kejuruan",
      is_homeroom: isHomeroom,
      photo_url: teacher.photo_url || "",
      message: cleanMessage,
      tone: teacher.tone ?? (isHomeroom ? 3 : 1),
      sort_order: isHomeroom ? 0 : store.teachers.length + 1,
    };
    store.teachers.push(savedTeacher);
  }

  saveStore(store);

  if (supabase) {
    const teaUuid = toDeterministicUuid(savedTeacher.id);
    await supabase.from("teachers").upsert(
      {
        id: teaUuid,
        full_name: savedTeacher.full_name,
        title: savedTeacher.title,
        grp: savedTeacher.grp,
        is_homeroom: savedTeacher.is_homeroom,
        photo_url: savedTeacher.photo_url,
        message: savedTeacher.message,
        tone: savedTeacher.tone,
        sort_order: savedTeacher.sort_order,
      },
      { onConflict: "id" }
    );
  }

  return savedTeacher;
}

export async function deleteTeacherAdmin(id: string) {
  const store = loadStore();
  const supabase = getSupabaseAdminClient();

  const targetUuid = toDeterministicUuid(id);
  store.teachers = store.teachers.filter(
    (t) => t.id !== id && toDeterministicUuid(t.id) !== targetUuid
  );
  saveStore(store);

  if (supabase) {
    await supabase.from("teachers").delete().eq("id", targetUuid);
  }
  return true;
}
