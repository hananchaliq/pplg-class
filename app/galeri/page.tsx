import { getPublicAppData } from "@/lib/db";
import { GaleriClient } from "@/components/galeri/galeri-client";

export const dynamic = "force-dynamic";

export default async function GaleriPage() {
  const data = await getPublicAppData();
  return <GaleriClient initialMoments={data.moments} />;
}
