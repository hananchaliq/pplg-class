import { getPublicAppData } from "@/lib/db";
import { DreamBoardClient } from "@/components/dream-board/dream-client";

export const dynamic = "force-dynamic";

export default async function DreamBoardPage() {
  const data = await getPublicAppData();
  return <DreamBoardClient dreams={data.dreams} students={data.students} />;
}
