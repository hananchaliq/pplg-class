import type { DreamRow, StudentRow } from "@/lib/types";
import { createAvatarPlaceholderDataUri } from "@/lib/domain-logic";

export interface DreamPaperPaletteItem {
  name: string;
  hex: string;
  pinHex: string;
}

export const DREAM_PAPER_PALETTE: DreamPaperPaletteItem[] = [
  { name: "Mentega", hex: "#FFF7D6", pinHex: "#6E78E8" },
  { name: "Sakura", hex: "#FFE4EC", pinHex: "#E0709A" },
  { name: "Mint", hex: "#DFF7EE", pinHex: "#3FB8A5" },
  { name: "Langit", hex: "#E2ECFF", pinHex: "#4F6BED" },
  { name: "Lavender", hex: "#EFE4FF", pinHex: "#8B5CF6" },
  { name: "Peach", hex: "#FFEAD7", pinHex: "#F08C4B" },
  { name: "Sage", hex: "#E6F4DC", pinHex: "#4D9E5B" },
  { name: "Krem", hex: "#F9EFE0", pinHex: "#C86D3B" },
];

export interface StudentRecord {
  id: string;
  dream_id?: string;
  roll_no: number;
  name: string;
  nickname?: string;
  role: string;
  avatar_url: string;
  dream_title: string;
  dream_reason: string;
  dream_description: string;
  tags: string[];
  nis?: string;
  dream_paper_color?: string;
  capsule_message?: string;
}

/**
 * Memetakan murni dari baris tabel `dreams` di database Supabase (tanpa data statis JS).
 * Jika tabel `dreams` di database kosong (0 baris), kembalikan array kosong `[]`.
 */
export function mapToExtendedStudentRecords(
  students: StudentRow[],
  dreams: DreamRow[]
): StudentRecord[] {
  if (!dreams || dreams.length === 0) {
    return [];
  }

  const studentById = new Map(students.map((s) => [s.id, s]));

  return dreams.map((d, idx) => {
    const stu = studentById.get(d.student_id);
    const rollNo = idx + 1;
    const palette =
      DREAM_PAPER_PALETTE[idx % DREAM_PAPER_PALETTE.length] ??
      DREAM_PAPER_PALETTE[0]!;

    const tone = (stu?.tone ?? (((idx % 5) + 1) as 1 | 2 | 3 | 4 | 5));
    const displayName = stu?.full_name || d.student_name || "Siswa";
    const avatarUrl =
      stu?.photo_url && stu.photo_url.trim().length > 0
        ? stu.photo_url
        : createAvatarPlaceholderDataUri(displayName, tone, true);

    return {
      id: stu?.id || d.student_id || d.id,
      dream_id: d.id,
      roll_no: rollNo,
      name: displayName,
      nickname: stu?.nickname || d.student_nickname || displayName.split(" ")[0],
      role: stu?.tags?.[0] ? `Peminatan ${stu.tags[0]}` : "",
      avatar_url: avatarUrl,
      dream_title: d.dream,
      dream_reason: d.reason,
      dream_description: "",
      tags: stu?.tags ?? [],
      dream_paper_color: d.paper_color || palette.hex,
    };
  });
}
