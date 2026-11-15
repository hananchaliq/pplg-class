import { getPublicAppData } from "@/lib/db";
import { KenanganClient } from "@/components/kenangan/kenangan-client";

export const dynamic = "force-dynamic";

export default async function KenanganPage() {
  const data = await getPublicAppData();
  return (
    <KenanganClient
      students={data.students}
      memoryEntries={data.memoryEntries}
      timeCapsules={data.timeCapsules}
      thanksList={data.thanksList}
    />
  );
}
