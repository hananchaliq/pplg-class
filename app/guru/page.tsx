import { getPublicAppData } from "@/lib/db";
import { GuruClient } from "@/components/guru/guru-client";

export const dynamic = "force-dynamic";

export default async function GuruPage() {
  const data = await getPublicAppData();
  return <GuruClient teachers={data.teachers} />;
}
