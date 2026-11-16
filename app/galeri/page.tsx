import type { Metadata } from "next";
import { GaleriClient } from "@/components/galeri/galeri-client";
import { DbConnectionGuard } from "@/components/layout/db-connection-guard";
import { getPublicAppData } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galeri Momen — XII PPLG 1 MAKN Ende",
  description:
    "Arsip foto polaroid perjalanan tiga tahun Kelas X, XI, dan XII PPLG 1 MAKN Ende.",
};

export default async function GaleriPage() {
  const data = await getPublicAppData();
  return (
    <DbConnectionGuard
      dbConnected={data.dbConnected}
      missingTables={data.missingTables}
      dbError={data.dbError}
    >
      <GaleriClient initialMoments={data.moments} />
    </DbConnectionGuard>
  );
}
