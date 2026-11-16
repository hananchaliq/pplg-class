import type { Metadata } from "next";
import { AnggotaClient } from "@/components/anggota/anggota-client";
import { DbConnectionGuard } from "@/components/layout/db-connection-guard";
import { getPublicAppData } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anggota Kelas — XII PPLG 1 MAKN Ende",
  description:
    "Kartu ID gantung interaktif seluruh anggota kelas XII PPLG 1 MAKN Ende.",
};

export default async function AnggotaPage() {
  const data = await getPublicAppData();
  return (
    <DbConnectionGuard
      dbConnected={data.dbConnected}
      missingTables={data.missingTables}
      dbError={data.dbError}
    >
      <AnggotaClient students={data.students} />
    </DbConnectionGuard>
  );
}
