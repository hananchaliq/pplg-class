import { NextResponse } from "next/server";
import { getPublicAppData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPublicAppData();
  return NextResponse.json(data, {
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
