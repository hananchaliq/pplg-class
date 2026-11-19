import { NextResponse } from "next/server";
import { getPublicAppData } from "@/lib/db";
import { decodeDeepText } from "@/lib/domain-logic";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPublicAppData();
  return NextResponse.json(decodeDeepText(data), {
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
