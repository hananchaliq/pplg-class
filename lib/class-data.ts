import type { DreamRow, StudentRow } from "@/lib/types";
import { createAvatarPlaceholderDataUri } from "@/lib/domain-logic";

export interface DreamPaperPaletteItem {
  name: string;
  hex: string;
  pinHex: string;
}

export const DREAM_PAPER_PALETTE: DreamPaperPaletteItem[] = [
  { name: "Kuning Hangat", hex: "#FFF3B0", pinHex: "#D6453A" },
  { name: "Mint Segar", hex: "#D9F2DF", pinHex: "#1F7A6E" },
  { name: "Biru Langit", hex: "#DCEEFF", pinHex: "#2B5EA8" },
  { name: "Persik Pastel", hex: "#FFE4D6", pinHex: "#D96831" },
  { name: "Lavender Lembut", hex: "#EAE4FF", pinHex: "#6B4DB8" },
  { name: "Merah Muda", hex: "#FFE0E9", pinHex: "#C73866" },
  { name: "Krem Vanilla", hex: "#FBF5DF", pinHex: "#B57A25" },
  { name: "Hijau Lemon", hex: "#ECF7C8", pinHex: "#3E8242" },
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
