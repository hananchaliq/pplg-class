import type { Metadata } from "next";
import { MainClient } from "@/components/main/main-client";
import { DbConnectionGuard } from "@/components/layout/db-connection-guard";
import { getPublicAppData } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kuis & Polling Kelas — XII PPLG 1 MAKN Ende",
  description:
    "Uji seberapa kenal kamu dengan kebiasaan unik XII PPLG 1 dan pilih momen terbaik kita.",
};

export default async function MainPage() {
  const data = await getPublicAppData();
  return (
    <DbConnectionGuard
      dbConnected={data.dbConnected}
      missingTables={data.missingTables}
      dbError={data.dbError}
    >
      <MainClient initialPolls={data.polls} />
    </DbConnectionGuard>
  );
}
