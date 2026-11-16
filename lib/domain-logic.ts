import { z } from "zod";
import type { LanyardMember } from "@/components/ui/team-lanyard-rail";
import type {
  StudentRow,
  TeacherRow,
  TimeCapsuleRow,
  WorkRow,
} from "@/lib/types";

/**
 * Sanitasi teks untuk mencegah injeksi HTML/XSS pada semua input pengguna.
 */
export function sanitizeText(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .trim();
}

const AVATAR_COLOR_PALETTE_16 = [
  "#c85a32", // Terracotta
  "#2d6a6e", // Teal Kelimutu
  "#b84357", // Rose Berry
  "#3b6e52", // Forest Emerald
  "#7b4b94", // Royal Plum
  "#c47d2b", // Amber Honey
  "#2b5b84", // Ocean Cobalt
  "#9e473b", // Crimson Clay
  "#4f6d3a", // Moss Olive
  "#8c4a70", // Mulberry Wine
  "#c76542", // Sunset Coral
  "#2f6f7a", // Deep Lagoon
  "#635294", // Indigo Dusk
  "#a6632c", // Cinnamon Bronze
  "#3d6b5e", // Pine Sage
  "#9c3d4c", // Ruby Garnet
];

function hashNameIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % AVATAR_COLOR_PALETTE_16.length;
}

/**
 * Buat SVG Data URI siluet hangat untuk avatar placeholder dengan 16 warna beragam agar tidak pernah gagal dimuat (0 broken image).
 */
export function createAvatarPlaceholderDataUri(
  name: string,
  tone: 1 | 2 | 3 | 4 | 5 = 1,
  showPhoto = true
): string {
  if (!showPhoto) {
    // Jika show_photo = false, kembalikan string kosong agar komponen memakai <Silhouette /> bawaan
    return "";
  }
  const colorIdx = (hashNameIndex(name) + tone) % AVATAR_COLOR_PALETTE_16.length;
  const bg = AVATAR_COLOR_PALETTE_16[colorIdx] ?? "#2d6a6e";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="${bg}"/><circle cx="80" cy="60" r="28" fill="#fbf6ec" fill-opacity="0.86"/><path d="M28 152c6-30 26-46 52-46s46 16 52 46z" fill="#fbf6ec" fill-opacity="0.86"/><text x="80" y="144" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="${bg}">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Adapter toLanyardMember() untuk memetakan baris siswa dari Supabase ke LanyardMember.
 * - Setiap siswa mendapat variasi warna yang beragam.
 * - "Pernah Bersama Kita" (is_active = false) memakai tone 5 dan label sahabat istimewa.
 * - Jika show_photo = false, image dikosongkan sehingga siluet bawaan tampil.
 */
export function studentToLanyardMember(
  student: StudentRow,
  index = 0
): LanyardMember {
  const cycledActiveTone = (((index % 4) + 1) as 1 | 2 | 3 | 4);
  const isMoved = !student.is_active || student.rail_group === "moved";
  const tone: 1 | 2 | 3 | 4 | 5 = isMoved
    ? 5
    : student.tone && student.tone < 5
      ? student.tone
      : cycledActiveTone;

  const roleLabel = isMoved
    ? "Sahabat yang pernah di sini"
    : student.tags[0]
      ? `Peminatan ${student.tags[0]}`
      : "Siswa XII PPLG 1";

  const image =
    !student.show_photo
      ? ""
      : student.photo_url && student.photo_url.trim().length > 0
        ? student.photo_url
        : createAvatarPlaceholderDataUri(student.full_name, tone, true);

  return {
    id: student.id,
    name: student.full_name,
    role: roleLabel,
    team: isMoved ? "✦ SAHABAT ISTIMEWA SELAMANYA" : "XII PPLG 1 · MAKN Ende",
    image,
    bio: student.bio,
    tags: student.tags.slice(0, 3),
    links: (student.links ?? []).slice(0, 3),
    tone,
  };
}

/**
 * Adapter toLanyardMember() untuk memetakan baris guru ke LanyardMember.
 */
export function teacherToLanyardMember(teacher: TeacherRow): LanyardMember {
  const groupTone: Record<TeacherRow["grp"], 1 | 2 | 3 | 4 | 5> = {
    kejuruan: 1,
    agama: 2,
    akademik: 4,
  };
  const tone = teacher.is_homeroom ? 3 : teacher.tone ?? groupTone[teacher.grp];
  const groupLabel: Record<TeacherRow["grp"], string> = {
    kejuruan: "Guru Kejuruan PPLG",
    agama: "Guru Bidang Agama",
    akademik: "Guru Bidang Akademik",
  };

  const image =
    teacher.photo_url && teacher.photo_url.trim().length > 0
      ? teacher.photo_url
      : createAvatarPlaceholderDataUri(teacher.full_name, tone, true);

  return {
    id: teacher.id,
    name: teacher.full_name,
    role: teacher.title,
    team: teacher.is_homeroom ? "Wali Kelas XII PPLG 1" : groupLabel[teacher.grp],
    image,
    bio: teacher.message,
    tags: [teacher.is_homeroom ? "Wali Kelas" : groupLabel[teacher.grp], "MAKN Ende"],
    links: [],
    tone,
  };
}

/**
 * Potong array menjadi beberapa rail dengan maksimal ukuran per potongan (default 8 kartu per rail).
 */
export function chunkIntoRails<T>(items: T[], maxPerRail = 8): T[][] {
  const safeMax = Math.max(1, Math.min(8, maxPerRail));
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeMax) {
    chunks.push(items.slice(i, i + safeMax));
  }
  return chunks;
}

/**
 * Pastikan pesan Kapsul Waktu TIDAK pernah bocor bila unlock_at > now.
 */
export function maskTimeCapsuleForPublic(
  capsule: {
    id: string;
    author_name: string;
    recipient_label?: string;
    message: string | null;
    unlock_at: string;
    status: "pending" | "approved" | "rejected";
    created_at?: string;
  },
  nowMs: number = Date.now()
): TimeCapsuleRow {
  const unlockMs = new Date(capsule.unlock_at).getTime();
  const isUnlocked = !Number.isNaN(unlockMs) && unlockMs <= nowMs;
  return {
    id: capsule.id,
    author_name: capsule.author_name,
    recipient_label: capsule.recipient_label || "Untuk Kelas XII PPLG 1",
    message: isUnlocked ? capsule.message : null,
    unlock_at: capsule.unlock_at,
    is_unlocked: isUnlocked,
    status: capsule.status,
    created_at: capsule.created_at,
  };
}

export interface SkillNode {
  skill: string;
  studentCount: number;
  workCount: number;
  totalWeight: number;
  students: string[];
}

/**
 * Hitung Skill Map otomatis dari tag karya dan tag anggota (tanpa input ganda).
 */
export function computeClassSkillMap(
  students: StudentRow[],
  works: WorkRow[]
): SkillNode[] {
  const map = new Map<
    string,
    { studentSet: Set<string>; workCount: number; studentNames: Set<string> }
  >();

  const studentById = new Map(students.map((s) => [s.id, s]));

  for (const s of students) {
    if (!s.is_active) continue;
    for (const rawTag of s.tags) {
      const tag = rawTag.trim();
      if (!tag) continue;
      const entry = map.get(tag) ?? {
        studentSet: new Set<string>(),
        workCount: 0,
        studentNames: new Set<string>(),
      };
      entry.studentSet.add(s.id);
      entry.studentNames.add(s.nickname || s.full_name);
      map.set(tag, entry);
    }
  }

  for (const w of works) {
    if (w.status !== "approved") continue;
    const owner = studentById.get(w.student_id);
    for (const rawTag of w.tags) {
      const tag = rawTag.trim();
      if (!tag) continue;
      const entry = map.get(tag) ?? {
        studentSet: new Set<string>(),
        workCount: 0,
        studentNames: new Set<string>(),
      };
      entry.workCount += 1;
      if (owner) {
        entry.studentSet.add(owner.id);
        entry.studentNames.add(owner.nickname || owner.full_name);
      }
      map.set(tag, entry);
    }
  }

  return Array.from(map.entries())
    .map(([skill, data]) => ({
      skill,
      studentCount: data.studentSet.size,
      workCount: data.workCount,
      totalWeight: data.studentSet.size + data.workCount,
      students: Array.from(data.studentNames),
    }))
    .sort((a, b) => b.totalWeight - a.totalWeight || a.skill.localeCompare(b.skill));
}

/**
 * Verifikasi kode kelas sederhana di sisi server.
 */
export function verifyClassCode(inputCode: string, expectedSecret?: string): boolean {
  const secret = (expectedSecret || process.env.CLASS_SECRET_CODE || "XIIPPLG1")
    .trim()
    .toUpperCase();
  return inputCode.trim().toUpperCase() === secret;
}

// Skema Validasi Zod untuk Semua Kiriman Publik
export const SubmitPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("memory"),
    classCode: z.string().min(3).max(24),
    honeypot: z.string().max(0).optional(),
    studentId: z.string().min(1),
    authorName: z.string().min(2).max(60),
    message: z.string().min(5).max(500),
  }),
  z.object({
    type: z.literal("dream"),
    classCode: z.string().min(3).max(24),
    honeypot: z.string().max(0).optional(),
    studentId: z.string().min(1),
    dream: z.string().min(4).max(180),
    reason: z.string().min(4).max(320),
    paperColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  z.object({
    type: z.literal("dream_cheer"),
    classCode: z.string().min(3).max(24),
    honeypot: z.string().max(0).optional(),
    dreamId: z.string().min(1),
    authorName: z.string().min(2).max(60),
    message: z.string().min(3).max(280),
  }),
  z.object({
    type: z.literal("time_capsule"),
    classCode: z.string().min(3).max(24),
    honeypot: z.string().max(0).optional(),
    authorName: z.string().min(2).max(60),
    recipientLabel: z.string().min(2).max(80).optional(),
    message: z.string().min(5).max(600),
    unlockAt: z.string().min(8),
  }),
  z.object({
    type: z.literal("thanks"),
    classCode: z.string().min(3).max(24),
    honeypot: z.string().max(0).optional(),
    fromName: z.string().min(2).max(60),
    toName: z.string().min(2).max(60),
    message: z.string().min(4).max(320),
  }),
  z.object({
    type: z.literal("moment"),
    classCode: z.string().min(3).max(24),
    honeypot: z.string().max(0).optional(),
    uploaderName: z.string().min(2).max(60),
    caption: z.string().min(4).max(220),
    category: z.string().min(2).max(40),
    phase: z.enum(["X", "XI", "XII"]),
    takenAt: z.string().optional(),
    imageDataUrl: z.string().optional(),
  }),
  z.object({
    type: z.literal("work"),
    classCode: z.string().min(3).max(24),
    honeypot: z.string().max(0).optional(),
    studentId: z.string().min(1),
    title: z.string().min(3).max(90),
    description: z.string().min(10).max(280),
    tags: z.array(z.string().min(1).max(24)).min(1).max(5),
    demoUrl: z.string().url().optional().or(z.literal("")),
    repoUrl: z.string().url().optional().or(z.literal("")),
    imageDataUrl: z.string().optional(),
  }),
]);

export type SubmitPayload = z.infer<typeof SubmitPayloadSchema>;
