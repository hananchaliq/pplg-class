import { getPublicAppData } from "@/lib/db";
import { MainClient } from "@/components/main/main-client";

export const dynamic = "force-dynamic";

export default async function MainPage() {
  const data = await getPublicAppData();
  return <MainClient initialPolls={data.polls} />;
}
