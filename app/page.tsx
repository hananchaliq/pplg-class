import { getPublicAppData } from "@/lib/db";
import { BerandaClient } from "@/components/beranda/beranda-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getPublicAppData();
  const activeStudents = data.students.filter((s) => s.is_active).length;
  const movedStudents = data.students.filter((s) => !s.is_active).length;
  const homeroomTeacher =
    data.teachers.find((t) => t.is_homeroom) ?? data.teachers[0];

  return (
    <BerandaClient
      graduationDate={data.settings.graduation_date}
      homeroomTeacherName={homeroomTeacher?.full_name || "Ibu Hajra, S.Pd."}
      stats={{
        activeStudents,
        movedStudents,
        totalTeachers: data.teachers.length,
        totalMoments: data.moments.length,
        totalDreams: data.dreams.length,
        totalWorks: data.works.length,
        totalMemories: data.memoryEntries.length,
        totalCapsules: data.timeCapsules.length,
        totalThanks: data.thanksList.length,
      }}
    />
  );
}
