import type { Metadata } from "next";
import { KaryaClient } from "@/components/karya/karya-client";
import { DbConnectionGuard } from "@/components/layout/db-connection-guard";
import { getPublicAppData } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Karya & Skill Map — XII PPLG 1 MAKN Ende",
  description:
    "Etalase karya aplikasi dan gim terbaik siswa XII PPLG 1 MAKN Ende beserta visualisasi jaringan keahlian kelas.",
};

export default async function KaryaPage() {
  const data = await getPublicAppData();
  return (
    <DbConnectionGuard
      dbConnected={data.dbConnected}
      missingTables={data.missingTables}
      dbError={data.dbError}
    >
      <KaryaClient works={data.works} students={data.students} />
    </DbConnectionGuard>
  );
}
