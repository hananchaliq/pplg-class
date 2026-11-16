import type { Metadata } from "next";
import { KenanganClient } from "@/components/kenangan/kenangan-client";
import { DbConnectionGuard } from "@/components/layout/db-connection-guard";
import { getPublicAppData } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buku Kenangan & Kapsul Waktu — XII PPLG 1 MAKN Ende",
  description:
    "Buku kenangan digital tulisan tangan, kapsul waktu tersegel server, dan dinding ucapan terima kasih.",
};

export default async function KenanganPage() {
  const data = await getPublicAppData();
  return (
    <DbConnectionGuard
      dbConnected={data.dbConnected}
      missingTables={data.missingTables}
      dbError={data.dbError}
    >
      <KenanganClient
        students={data.students}
        memoryEntries={data.memoryEntries}
        timeCapsules={data.timeCapsules}
        thanksList={data.thanksList}
      />
    </DbConnectionGuard>
  );
}
