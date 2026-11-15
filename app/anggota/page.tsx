import { getPublicAppData } from "@/lib/db";
import { AnggotaClient } from "@/components/anggota/anggota-client";

export const dynamic = "force-dynamic";

export default async function AnggotaPage() {
  const data = await getPublicAppData();
  return <AnggotaClient students={data.students} />;
}
