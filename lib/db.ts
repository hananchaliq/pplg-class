import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ensureDatabaseSchema, getConfiguredDatabaseUrl } from "@/lib/db-schema";
import { maskTimeCapsuleForPublic, sanitizeText, type SubmitPayload } from "@/lib/domain-logic";
import {
   applyYearbookMediaToStudents,
   deleteMediaFromBlob,
   getMediaManifest,
   isVercelBlobConfigured,
   mediaItemToMomentRow,
   parseImageDataUrl,
   updateMediaItemInManifest,
   uploadMediaToBlob,
} from "@/lib/media-store";
import type { ContentStatus, DreamCheerRow, DreamRow, MemoryEntryRow, MomentRow, PollWithOptions, StudentRow, TeacherRow, ThanksRow, TimeCapsuleRow, WorkRow } from "@/lib/types";

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
   // Data selalu diambil langsung secara real-time dari Supabase PostgreSQL (no-store)
}

export function getSupabaseConfig(): {
   url: string;
   key: string;
   configured: boolean;
} {
   const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
   const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

   const configured = Boolean(url && key && url.startsWith("https://") && !url.includes("your-project-id") && !key.includes("your-supabase"));

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
   if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input)) {
      return input.toLowerCase();
   }
   const hash = crypto.createHash("sha256").update(`xiipplg1:${input}`).digest("hex");
   return [hash.slice(0, 8), hash.slice(8, 12), `4${hash.slice(13, 16)}`, `a${hash.slice(17, 20)}`, hash.slice(20, 32)].join("-");
}

function deterministicSeedFromId(id: string): number {
   let h = 0;
   for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) >>> 0;
   }
   return (h % 900) + 100;
}

/**
 * Ambil media foto (Hero 3D, Yearbook / ID Card, dan Galeri) langsung dari Vercel Blob (manifest.json)
 * melalui lib/media-store.ts, tanpa ketergantungan ke Supabase Storage/DB untuk alur media.
 */
async function fetchAllFromSupabase(options?: {
   includePendingMedia?: boolean;
}): Promise<DatabaseSnapshot> {
   const mediaRes = await getMediaManifest({
      includePending: options?.includePendingMedia ?? false,
      includeFallbackIfEmpty: !options?.includePendingMedia,
   });
   const blobMoments: MomentRow[] = mediaRes.items.map(mediaItemToMomentRow);

   const supabase = getSupabaseAdminClient();
   if (!supabase) {
      // Mode native Vercel Blob aktif sepenuhnya tanpa memblokir halaman dengan error Supabase
      return {
         students: [],
         teachers: [],
         moments: blobMoments,
         dreams: [],
         dreamCheers: [],
         memoryEntries: [],
         rawTimeCapsules: [],
         thanksList: [],
         works: [],
         polls: [],
         settings: {
            graduation_date: DEFAULT_GRADUATION_DATE,
         },
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
      const [stuRes, teaRes, drmRes, chrRes, memRes, capRes, thkRes, wrkRes, polRes, optRes, votRes, setRes] = await Promise.all([
         supabase.from("students").select("*").order("sort_order", { ascending: true }),
         supabase.from("teachers").select("*").order("sort_order", { ascending: true }),
         supabase.from("dreams").select("*").order("created_at", { ascending: false }),
         supabase.from("dream_cheers").select("*").order("created_at", { ascending: false }),
         supabase.from("memory_entries").select("*").order("created_at", { ascending: false }),
         supabase.from("time_capsules").select("*").order("created_at", { ascending: false }),
         supabase.from("thanks").select("*").order("created_at", { ascending: false }),
         supabase.from("works").select("*").order("created_at", { ascending: false }),
         supabase.from("polls").select("*").order("created_at", { ascending: true }),
         supabase.from("poll_options").select("*"),
         supabase.from("poll_votes").select("*"),
         supabase.from("site_settings").select("*").limit(1).maybeSingle(),
      ]);

      const firstError = stuRes.error || teaRes.error || drmRes.error || chrRes.error || memRes.error || capRes.error || thkRes.error || wrkRes.error || polRes.error || optRes.error || votRes.error;

      if (firstError) {
         // Tetap layani seluruh media Vercel Blob walaupun tabel non-media Supabase belum tersedia
         return {
            students: [],
            teachers: [],
            moments: blobMoments,
            dreams: [],
            dreamCheers: [],
            memoryEntries: [],
            rawTimeCapsules: [],
            thanksList: [],
            works: [],
            polls: [],
            settings: {
               graduation_date: DEFAULT_GRADUATION_DATE,
            },
            dbConnected: true,
            missingTables: false,
            dbError: null,
            updatedAt: Date.now(),
         };
      }

      const rawStudents: StudentRow[] = (stuRes.data ?? []).map(s => ({
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
         rail_group: (s.rail_group || (s.is_active === false ? "moved" : s.gender === "P" ? "P1" : "L")) as StudentRow["rail_group"],
         sort_order: Number(s.sort_order ?? 0),
      }));

      // Sinkronkan foto ID Card / Sahabat Istimewa yang diunggah ke kanal `yearbook/` di Vercel Blob
      const students = applyYearbookMediaToStudents(rawStudents, mediaRes.items);
      const studentMap = new Map(students.map(s => [s.id, s]));

      const teachers: TeacherRow[] = (teaRes.data ?? []).map(t => ({
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

      // Seluruh foto Hero 3D, Buku Kenangan, dan Galeri bersumber murni dari Vercel Blob manifest.json
      const moments: MomentRow[] = blobMoments;

      // Mendukung kedua skema kolom dream_cheers (sender_name maupun author_name)
      const dreamCheers: DreamCheerRow[] = (chrRes.data ?? []).map(c => ({
         id: String(c.id),
         dream_id: String(c.dream_id || ""),
         author_name: String(c.sender_name || c.author_name || ""),
         message: String(c.message || ""),
         status: (c.status || "approved") as ContentStatus,
         created_at: c.created_at ? String(c.created_at) : undefined,
      }));

      // Mendukung kedua skema kolom dreams (dream_title/author_name/pin_color maupun dream/paper_color)
      const dreams: DreamRow[] = (drmRes.data ?? []).map(d => {
         const stu = d.student_id ? studentMap.get(String(d.student_id)) : undefined;
         const authorFallback = String(d.author_name || "");
         return {
            id: String(d.id),
            student_id: String(d.student_id || d.id),
            student_name: stu?.full_name || authorFallback || "",
            student_nickname: stu?.nickname || authorFallback.split(" ")[0] || "",
            dream: String(d.dream_title ?? d.dream ?? ""),
            reason: String(d.reason ?? ""),
            paper_color: String(d.pin_color ?? d.paper_color ?? "#FFF7D6"),
            status: (d.status || "approved") as ContentStatus,
            cheers: dreamCheers.filter(c => c.dream_id === String(d.id) && c.status === "approved"),
         };
      });

      const memoryEntries: MemoryEntryRow[] = (memRes.data ?? []).map(m => {
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

      const rawTimeCapsules: RawTimeCapsuleStoreRow[] = (capRes.data ?? []).map(c => ({
         id: String(c.id),
         author_name: String(c.author_name || ""),
         recipient_label: String(c.recipient_label || ""),
         message: String(c.message || ""),
         unlock_at: String(c.unlock_at || new Date().toISOString()),
         status: (c.status || "pending") as ContentStatus,
         created_at: c.created_at ? String(c.created_at) : undefined,
      }));

      // Mendukung kedua skema kolom thanks (author_name/to_target maupun from_name/to_name)
      const thanksList: ThanksRow[] = (thkRes.data ?? []).map(th => ({
         id: String(th.id),
         from_name: String(th.author_name ?? th.from_name ?? ""),
         to_name: String(th.to_target ?? th.to_name ?? ""),
         message: String(th.message || ""),
         status: (th.status || "pending") as ContentStatus,
         created_at: th.created_at ? String(th.created_at) : undefined,
      }));

      const works: WorkRow[] = (wrkRes.data ?? []).map(w => {
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

      const voteRows = votRes.data ?? [];
      const optionRows = optRes.data ?? [];
      const pollRows = polRes.data ?? [];

      const polls: PollWithOptions[] = pollRows.map(p => {
         const pid = String(p.id);
         const opts = optionRows
            .filter(o => String(o.poll_id) === pid)
            .map(o => {
               const oid = String(o.id);
               const countFromVotes = voteRows.filter(v => String(v.option_id) === oid).length;
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

      const rawSetData = setRes.data as Record<string, unknown> | null;
      const gradDateFromDb = (typeof rawSetData?.graduation_date === "string" && rawSetData.graduation_date ? rawSetData.graduation_date : (rawSetData?.value as { graduation_date?: string } | null)?.graduation_date) || DEFAULT_GRADUATION_DATE;

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
         students: [],
         teachers: [],
         moments: blobMoments,
         dreams: [],
         dreamCheers: [],
         memoryEntries: [],
         rawTimeCapsules: [],
         thanksList: [],
         works: [],
         polls: [],
         settings: {
            graduation_date: DEFAULT_GRADUATION_DATE,
         },
         dbConnected: true,
         missingTables: false,
         dbError: null,
         updatedAt: Date.now(),
      };
   }
}

/**
 * Ambil semua data publik yang sudah berstatus 'approved' langsung dari Supabase.
 */
export async function getPublicAppData(_bypassCache = false) {
   const store = await fetchAllFromSupabase();
   const nowMs = Date.now();

   const approvedCheers = store.dreamCheers.filter(c => c.status === "approved");
   const dreamsWithCheers: DreamRow[] = store.dreams
      .filter(d => d.status === "approved")
      .map(d => {
         const stu = store.students.find(s => s.id === d.student_id);
         return {
            ...d,
            student_name: stu?.full_name || d.student_name || "",
            student_nickname: stu?.nickname || d.student_nickname || "",
            cheers: approvedCheers.filter(c => c.dream_id === d.id),
         };
      });

   const maskedCapsules: TimeCapsuleRow[] = store.rawTimeCapsules.filter(c => c.status === "approved").map(c => maskTimeCapsuleForPublic(c, nowMs));

   const approvedWorks: WorkRow[] = store.works
      .filter(w => w.status === "approved")
      .map(w => {
         const stu = store.students.find(s => s.id === w.student_id);
         return {
            ...w,
            student_name: stu?.full_name || w.student_name || "",
         };
      });

   const sortedStudents = [...store.students].sort((a, b) => a.sort_order - b.sort_order);
   const sortedTeachers = [...store.teachers].sort((a, b) => (b.is_homeroom ? 1 : 0) - (a.is_homeroom ? 1 : 0) || a.sort_order - b.sort_order);

   return {
      students: sortedStudents,
      teachers: sortedTeachers,
      moments: store.moments.filter(m => m.status === "approved"),
      dreams: dreamsWithCheers,
      memoryEntries: store.memoryEntries.filter(m => m.status === "approved"),
      timeCapsules: maskedCapsules,
      thanksList: store.thanksList.filter(t => t.status === "approved"),
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
 * Simpan kiriman publik baru ke Supabase sesuai skema tabel database.
 */
export async function createPendingSubmission(payload: SubmitPayload) {
   const id = crypto.randomUUID();
   const nowIso = new Date().toISOString();

   // Unggahan foto momen publik langsung disimpan ke Vercel Blob (`gallery/`) + manifest.json (status pending)
   if (payload.type === "moment") {
      const seedNum = Math.floor(Math.random() * 99) + 1;
      let buffer: Buffer | undefined;
      let contentType = "image/webp";
      let existingUrl: string | undefined;

      if (payload.imageDataUrl && payload.imageDataUrl.startsWith("data:image/")) {
         const parsed = parseImageDataUrl(payload.imageDataUrl);
         buffer = parsed.buffer;
         contentType = parsed.contentType;
      } else {
         existingUrl = `/api/moment-illustration?seed=${seedNum}`;
      }

      const uploaded = await uploadMediaToBlob({
         channel: "gallery",
         buffer,
         contentType,
         existingUrl,
         category: sanitizeText(payload.category),
         caption: sanitizeText(payload.caption),
         uploaderName: sanitizeText(payload.uploaderName),
         phase: payload.phase,
         takenAt: payload.takenAt || nowIso.slice(0, 10),
         status: "pending",
         featured: true,
      });

      return { id: uploaded.item.id, type: payload.type, status: "pending" as const };
   }

   const supabase = getSupabaseAdminClient();
   if (!supabase) {
      throw new Error("Penyimpanan data non-media belum dikonfigurasi.");
   }

   switch (payload.type) {
      case "memory": {
         const { error } = await supabase.from("memory_entries").insert({
            id,
            student_id: toDeterministicUuid(payload.studentId),
            author_name: sanitizeText(payload.authorName),
            message: sanitizeText(payload.message),
            status: "pending",
         });
         if (error) throw new Error(error.message);
         return { id, type: payload.type, status: "pending" as const };
      }

      case "dream": {
         const stuUuid = toDeterministicUuid(payload.studentId);
         const { data: stuRow } = await supabase.from("students").select("full_name").eq("id", stuUuid).maybeSingle();
         const authorName = stuRow?.full_name || "Siswa XII PPLG 1";

         const { data: existingDream } = await supabase.from("dreams").select("id").eq("student_id", stuUuid).maybeSingle();

         if (existingDream?.id) {
            const { error } = await supabase
               .from("dreams")
               .update({
                  author_name: authorName,
                  dream_title: sanitizeText(payload.dream),
                  reason: sanitizeText(payload.reason),
                  pin_color: payload.paperColor || "#FFF7D6",
                  status: "pending",
               })
               .eq("id", existingDream.id);
            if (error) throw new Error(error.message);
            return {
               id: String(existingDream.id),
               type: payload.type,
               status: "pending" as const,
            };
         }

         const { error } = await supabase.from("dreams").insert({
            id,
            student_id: stuUuid,
            author_name: authorName,
            dream_title: sanitizeText(payload.dream),
            reason: sanitizeText(payload.reason),
            target_place: "MAKN Ende",
            pin_color: payload.paperColor || "#FFF7D6",
            status: "pending",
         });
         if (error) throw new Error(error.message);
         return { id, type: payload.type, status: "pending" as const };
      }

      case "dream_cheer": {
         const { error } = await supabase.from("dream_cheers").insert({
            id,
            dream_id: toDeterministicUuid(payload.dreamId),
            sender_name: sanitizeText(payload.authorName),
            message: sanitizeText(payload.message),
            status: "pending",
         });
         if (error) throw new Error(error.message);
         return { id, type: payload.type, status: "pending" as const };
      }

      case "time_capsule": {
         const unlockIso = new Date(payload.unlockAt).toISOString();
         const recipientLabel = sanitizeText(payload.recipientLabel || "Untuk Kelas XII PPLG 1");
         const { error } = await supabase.from("time_capsules").insert({
            id,
            author_name: sanitizeText(payload.authorName),
            recipient_label: recipientLabel,
            message: sanitizeText(payload.message),
            unlock_at: unlockIso,
            status: "pending",
         });
         if (error) throw new Error(error.message);
         return { id, type: payload.type, status: "pending" as const };
      }

      case "thanks": {
         const { error } = await supabase.from("thanks").insert({
            id,
            author_name: sanitizeText(payload.fromName),
            to_target: sanitizeText(payload.toName),
            message: sanitizeText(payload.message),
            status: "pending",
         });
         if (error) throw new Error(error.message);
         return { id, type: payload.type, status: "pending" as const };
      }

      case "work": {
         const stuUuid = toDeterministicUuid(payload.studentId);
         const { data: existingWork } = await supabase.from("works").select("id").eq("student_id", stuUuid).maybeSingle();

         if (existingWork?.id) {
            const { error } = await supabase
               .from("works")
               .update({
                  title: sanitizeText(payload.title),
                  description: sanitizeText(payload.description),
                  tags: payload.tags.map(t => sanitizeText(t)),
                  demo_url: payload.demoUrl || "",
                  repo_url: payload.repoUrl || "",
                  status: "pending",
               })
               .eq("id", existingWork.id);
            if (error) throw new Error(error.message);
            return {
               id: String(existingWork.id),
               type: payload.type,
               status: "pending" as const,
            };
         }

         const { error } = await supabase.from("works").insert({
            id,
            student_id: stuUuid,
            title: sanitizeText(payload.title),
            description: sanitizeText(payload.description),
            tags: payload.tags.map(t => sanitizeText(t)),
            image_url: "",
            demo_url: payload.demoUrl || "",
            repo_url: payload.repoUrl || "",
            status: "pending",
         });
         if (error) throw new Error(error.message);
         return { id, type: payload.type, status: "pending" as const };
      }
   }
}

/**
 * Rekam suara polling kelas langsung ke Supabase dengan pencegahan duplikat (1 perangkat 1 suara per poll).
 */
export async function voteOnPoll(pollId: string, optionId: string, voterHash: string): Promise<{ ok: boolean; error?: string; poll?: PollWithOptions }> {
   const supabase = getSupabaseAdminClient();
   if (!supabase) {
      return { ok: false, error: "Database Supabase belum terhubung." };
   }

   const store = await fetchAllFromSupabase();
   const poll = store.polls.find(p => p.id === pollId || toDeterministicUuid(p.id) === pollId);
   if (!poll || !poll.is_open) {
      return { ok: false, error: "Polling tidak ditemukan atau sudah ditutup." };
   }
   const opt = poll.options.find(o => o.id === optionId || toDeterministicUuid(o.id) === optionId);
   if (!opt) {
      return { ok: false, error: "Pilihan suara tidak valid." };
   }

   const { data: existingVotes } = await supabase.from("poll_votes").select("id").eq("poll_id", poll.id).eq("voter_fingerprint", voterHash);

   if (existingVotes && existingVotes.length > 0) {
      return {
         ok: false,
         error: "Perangkat ini sudah memberikan suara pada polling ini.",
         poll,
      };
   }

   const { error: voteErr } = await supabase.from("poll_votes").insert({
      poll_id: poll.id,
      option_id: opt.id,
      voter_fingerprint: voterHash,
   });

   if (voteErr) {
      if (voteErr.code === "23505") {
         return {
            ok: false,
            error: "Perangkat ini sudah memberikan suara pada polling ini.",
            poll,
         };
      }
      return { ok: false, error: `Gagal menyimpan suara: ${voteErr.message}` };
   }

   await supabase
      .from("poll_options")
      .update({ votes_count: opt.votes + 1 })
      .eq("id", opt.id);

   const updatedStore = await fetchAllFromSupabase();
   const updatedPoll = updatedStore.polls.find(p => p.id === poll.id) ?? poll;

   return { ok: true, poll: updatedPoll };
}

/**
 * Data lengkap untuk dasbor Admin langsung dari Supabase.
 */
export async function getAdminDashboardData() {
   const store = await fetchAllFromSupabase({ includePendingMedia: true });
   return {
      students: [...store.students].sort((a, b) => a.sort_order - b.sort_order),
      teachers: [...store.teachers].sort((a, b) => (b.is_homeroom ? 1 : 0) - (a.is_homeroom ? 1 : 0) || a.sort_order - b.sort_order),
      moments: store.moments,
      dreams: store.dreams,
      dreamCheers: store.dreamCheers,
      memoryEntries: store.memoryEntries,
      timeCapsules: store.rawTimeCapsules,
      thanksList: store.thanksList,
      works: store.works,
      polls: store.polls,
      settings: store.settings,
      blobConnected: isVercelBlobConfigured(),
      supabaseConnected: isSupabaseConfigured(),
      dbConnected: true,
      missingTables: false,
      dbError: null,
   };
}

export type ModeratableTable = "moments" | "dreams" | "dreamCheers" | "memoryEntries" | "timeCapsules" | "thanksList" | "works";

const SUPABASE_TABLE_MAP: Record<ModeratableTable, string> = {
   moments: "moments",
   dreams: "dreams",
   dreamCheers: "dream_cheers",
   memoryEntries: "memory_entries",
   timeCapsules: "time_capsules",
   thanksList: "thanks",
   works: "works",
};

export async function moderateItem(table: ModeratableTable, id: string, status: ContentStatus, updatedText?: string) {
   // Moderasi foto momen langsung memperbarui manifest.json di Vercel Blob
   if (table === "moments") {
      return updateMediaItemInManifest(id, {
         status,
         ...(updatedText !== undefined && updatedText.trim().length > 0
            ? { caption: updatedText }
            : {}),
      });
   }

   const supabase = getSupabaseAdminClient();
   if (!supabase) return false;

   const sbTable = SUPABASE_TABLE_MAP[table];
   const targetUuid = toDeterministicUuid(id);
   const updatePayload: Record<string, unknown> = { status };

   const cleanText = updatedText !== undefined && updatedText.trim().length > 0 ? sanitizeText(updatedText) : undefined;

   if (cleanText !== undefined) {
      if (table === "memoryEntries" || table === "dreamCheers" || table === "timeCapsules" || table === "thanksList") {
         updatePayload.message = cleanText;
      } else if (table === "dreams") {
         updatePayload.dream_title = cleanText;
      } else if (table === "works") {
         updatePayload.description = cleanText;
      }
   }

   const { error } = await supabase.from(sbTable).update(updatePayload).eq("id", targetUuid);

   return !error;
}

export async function deleteModeratedItem(table: ModeratableTable, id: string) {
   // Penghapusan foto momen langsung memanggil Vercel Blob `del` + perbarui manifest.json
   if (table === "moments") {
      const res = await deleteMediaFromBlob({ id });
      return res.deleted;
   }

   const supabase = getSupabaseAdminClient();
   if (!supabase) return false;
   const sbTable = SUPABASE_TABLE_MAP[table];
   const targetUuid = toDeterministicUuid(id);
   const { error } = await supabase.from(sbTable).delete().eq("id", targetUuid);
   return !error;
}

export async function updateSiteSettings(graduationDate: string) {
   const supabase = getSupabaseAdminClient();
   if (!supabase) {
      throw new Error("Database Supabase belum terhubung.");
   }

   const dateOnly = graduationDate.slice(0, 10);
   const { error } = await supabase.from("site_settings").upsert(
      {
         id: 1,
         graduation_date: dateOnly,
         updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
   );

   if (error) {
      throw new Error(error.message);
   }

   return { graduation_date: graduationDate };
}

export async function upsertStudentAdmin(student: Partial<StudentRow> & { full_name: string }) {
   const supabase = getSupabaseAdminClient();
   if (!supabase) {
      throw new Error("Database Supabase belum terhubung.");
   }

   const currentStore = await fetchAllFromSupabase();
   const existing = student.id ? currentStore.students.find(s => s.id === student.id || toDeterministicUuid(s.id) === toDeterministicUuid(student.id!)) : undefined;

   const cleanFullName = sanitizeText(student.full_name);
   const cleanNickname = sanitizeText(student.nickname || student.full_name.split(" ")[0] || "");
   const cleanBio = sanitizeText(student.bio ?? existing?.bio ?? "");
   const cleanTags = student.tags !== undefined ? student.tags.map(t => sanitizeText(t)).filter(Boolean) : (existing?.tags ?? []);
   const railGroup = student.rail_group ?? existing?.rail_group ?? (student.gender === "P" ? "P1" : "L");
   const isActive = student.is_active !== undefined ? student.is_active : railGroup !== "moved";
   const gender: StudentRow["gender"] = student.gender || existing?.gender || (railGroup === "P1" || railGroup === "P2" ? "P" : "L");

   const stuUuid = student.id ? toDeterministicUuid(student.id) : crypto.randomUUID();

   const slug = existing?.slug || student.slug || `${cleanNickname.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${stuUuid.slice(0, 6)}`;

   const payload = {
      id: stuUuid,
      slug,
      full_name: cleanFullName,
      nickname: cleanNickname,
      gender,
      is_active: isActive,
      show_photo: student.show_photo ?? existing?.show_photo ?? true,
      photo_url: student.photo_url !== undefined ? student.photo_url : (existing?.photo_url ?? ""),
      bio: cleanBio,
      tags: cleanTags,
      links: student.links ?? existing?.links ?? [],
      tone: (student.tone ?? existing?.tone ?? (isActive ? 1 : 5)) as 1 | 2 | 3 | 4 | 5,
      rail_group: railGroup,
      sort_order: existing?.sort_order ?? currentStore.students.length + 1,
   };

   const { error } = await supabase.from("students").upsert(payload, { onConflict: "id" });

   if (error) {
      throw new Error(error.message);
   }

   return payload;
}

export async function deleteStudentAdmin(id: string) {
   const supabase = getSupabaseAdminClient();
   if (!supabase) return false;
   const targetUuid = toDeterministicUuid(id);
   const { error } = await supabase.from("students").delete().eq("id", targetUuid);
   return !error;
}

export async function upsertTeacherAdmin(teacher: Partial<TeacherRow> & { full_name: string; title: string }) {
   const supabase = getSupabaseAdminClient();
   if (!supabase) {
      throw new Error("Database Supabase belum terhubung.");
   }

   const currentStore = await fetchAllFromSupabase();
   const existing = teacher.id ? currentStore.teachers.find(t => t.id === teacher.id || toDeterministicUuid(t.id) === toDeterministicUuid(teacher.id!)) : undefined;

   const cleanFullName = sanitizeText(teacher.full_name);
   const cleanTitle = sanitizeText(teacher.title);
   const cleanMessage = sanitizeText(teacher.message ?? existing?.message ?? "");
   const isHomeroom = Boolean(teacher.is_homeroom ?? existing?.is_homeroom ?? false);

   if (isHomeroom) {
      await supabase.from("teachers").update({ is_homeroom: false }).eq("is_homeroom", true);
   }

   const teaUuid = teacher.id ? toDeterministicUuid(teacher.id) : crypto.randomUUID();

   const payload = {
      id: teaUuid,
      full_name: cleanFullName,
      title: cleanTitle,
      grp: (teacher.grp || existing?.grp || "kejuruan") as TeacherRow["grp"],
      is_homeroom: isHomeroom,
      photo_url: teacher.photo_url !== undefined ? teacher.photo_url : (existing?.photo_url ?? ""),
      message: cleanMessage,
      tone: (teacher.tone ?? existing?.tone ?? (isHomeroom ? 3 : 1)) as 1 | 2 | 3 | 4 | 5,
      sort_order: isHomeroom ? 0 : (existing?.sort_order ?? currentStore.teachers.length + 1),
   };

   const { error } = await supabase.from("teachers").upsert(payload, { onConflict: "id" });

   if (error) {
      throw new Error(error.message);
   }

   return payload;
}

export async function deleteTeacherAdmin(id: string) {
   const supabase = getSupabaseAdminClient();
   if (!supabase) return false;
   const targetUuid = toDeterministicUuid(id);
   const { error } = await supabase.from("teachers").delete().eq("id", targetUuid);
   return !error;
}

export async function createPollAdmin(question: string, options: string[]) {
   const supabase = getSupabaseAdminClient();
   if (!supabase) {
      throw new Error("Database Supabase belum terhubung.");
   }
   const cleanQuestion = sanitizeText(question);
   const cleanOptions = options.map(o => sanitizeText(o)).filter(o => o.length > 0);
   if (!cleanQuestion || cleanOptions.length < 2) {
      throw new Error("Pertanyaan dan minimal 2 pilihan jawaban wajib diisi.");
   }

   const pollId = crypto.randomUUID();
   const { error: pollErr } = await supabase.from("polls").insert({
      id: pollId,
      question: cleanQuestion,
      category: "Momen Kelas",
      sort_order: 0,
   });
   if (pollErr) throw new Error(pollErr.message);

   const optionRows = cleanOptions.map(label => ({
      id: crypto.randomUUID(),
      poll_id: pollId,
      label,
      votes_count: 0,
   }));
   const { error: optErr } = await supabase.from("poll_options").insert(optionRows);
   if (optErr) throw new Error(optErr.message);

   return pollId;
}

export async function deletePollAdmin(pollId: string) {
   const supabase = getSupabaseAdminClient();
   if (!supabase) return false;
   const targetUuid = toDeterministicUuid(pollId);
   const { error } = await supabase.from("polls").delete().eq("id", targetUuid);
   return !error;
}
