import type { Metadata } from "next";
import { GuruClient } from "@/components/guru/guru-client";
import { DbConnectionGuard } from "@/components/layout/db-connection-guard";
import { getPublicAppData } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guru & Wali Kelas — XII PPLG 1 MAKN Ende",
  description:
    "Penghormatan dan ucapan terima kasih untuk Wali Kelas serta seluruh guru MAKN Ende.",
};

export default async function GuruPage() {
  const data = await getPublicAppData();
  return (
    <DbConnectionGuard
      dbConnected={data.dbConnected}
      missingTables={data.missingTables}
      dbError={data.dbError}
    >
      <GuruClient teachers={data.teachers} />
    </DbConnectionGuard>
  );
}
