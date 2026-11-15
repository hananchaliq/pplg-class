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

const SPECIFIC_PLANS: string[] = [
  "Membangun fondasi arsitektur sistem terdistribusi, mengambil sertifikasi cloud, dan berkontribusi pada proyek open-source pendidikan di Nusa Tenggara Timur.",
  "Mendalami rekayasa antarmuka interaktif berbasis WebGL & 3D, menyusun portofolio aplikasi kreatif, dan berkolaborasi dengan studio teknologi nasional.",
  "Mengembangkan gim edukasi bertema budaya lokal Flores & tenun ikat, lalu mempublikasikannya agar dikenal oleh generasi muda.",
  "Memperkuat kompetensi keamanan siber, basis data skala besar, dan arsitektur finansial yang aman serta bermanfaat bagi masyarakat luas.",
  "Merancang aplikasi mobile lintas platform yang ringan untuk membantu layanan kesehatan dan logistik masyarakat kepulauan.",
  "Menjadi pendidik teknologi dan mentor koding yang inklusif bagi adik-adik madrasah serta komunitas pemuda di Ende.",
];

export function mapToExtendedStudentRecords(
  students: StudentRow[],
  dreams: DreamRow[]
): StudentRecord[] {
  const activeStudents = students.filter((s) => s.is_active);
  const sourceList = activeStudents.length > 0 ? activeStudents : students;

  return sourceList.map((stu, idx) => {
    const rollNo = idx + 1;
    const matchedDream = dreams.find((d) => d.student_id === stu.id);
    const palette =
      DREAM_PAPER_PALETTE[idx % DREAM_PAPER_PALETTE.length] ??
      DREAM_PAPER_PALETTE[0]!;

    const tone = (((idx % 5) + 1) as 1 | 2 | 3 | 4 | 5);
    const avatarUrl =
      stu.photo_url && stu.photo_url.trim().length > 0
        ? stu.photo_url
        : createAvatarPlaceholderDataUri(stu.full_name, tone, true);

    const dreamTitle =
      matchedDream?.dream ||
      `Software Engineer & Inovator Digital (${stu.tags[0] || "PPLG"})`;
    const dreamReason =
      matchedDream?.reason ||
      stu.bio ||
      "Ingin menghadirkan karya teknologi yang bermanfaat nyata bagi keluarga, madrasah, dan masyarakat di Ende.";
    const dreamDescription =
      SPECIFIC_PLANS[idx % SPECIFIC_PLANS.length]!;

    return {
      id: stu.id,
      roll_no: rollNo,
      name: stu.full_name,
      nickname: stu.nickname,
      role: stu.tags[0] ? `Spesialis ${stu.tags[0]}` : "Rekayasa Perangkat Lunak",
      avatar_url: avatarUrl,
      dream_title: dreamTitle,
      dream_reason: dreamReason,
      dream_description: dreamDescription,
      tags: stu.tags.length > 0 ? stu.tags : ["PPLG", "MAKNEnde", "ClassOf2027"],
      nis: `202410${String(rollNo).padStart(2, "0")}`,
      dream_paper_color: matchedDream?.paper_color || palette.hex,
      capsule_message: `Kapsul Waktu XII PPLG 1 — Bismillah, semoga beberapa tahun lagi ${stu.nickname || stu.full_name} benar-benar sukses sebagai ${dreamTitle}!`,
    };
  });
}
