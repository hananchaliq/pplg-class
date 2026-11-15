import { getPublicAppData } from "@/lib/db";
import { KaryaClient } from "@/components/karya/karya-client";

export const dynamic = "force-dynamic";

export default async function KaryaPage() {
  const data = await getPublicAppData();
  return <KaryaClient works={data.works} students={data.students} />;
}
