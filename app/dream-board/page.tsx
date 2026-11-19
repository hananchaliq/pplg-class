import type { Metadata } from "next";
import { DreamBoardClient } from "@/components/dream-board/dream-client";
import { DbConnectionGuard } from "@/components/layout/db-connection-guard";
import { getPublicAppData } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dream Board — XII PPLG 1 MAKN Ende",
  description:
    "Papan tulis cita-cita dan doa semangat seluruh siswa XII PPLG 1 MAKN Ende.",
};

export default async function DreamBoardPage() {
  const data = await getPublicAppData();
  return (
    <DbConnectionGuard
      dbConnected={data.dbConnected}
      missingTables={data.missingTables}
      dbError={data.dbError}
    >
      <DreamBoardClient dreams={data.dreams} students={data.students} />
    </DbConnectionGuard>
  );
}
