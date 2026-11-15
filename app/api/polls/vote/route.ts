import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { voteOnPoll } from "@/lib/db";

const VoteSchema = z.object({
  pollId: z.string().min(1),
  optionId: z.string().min(1),
  deviceToken: z.string().min(4).max(120),
});

function hashDeviceVoter(ip: string, deviceToken: string): string {
  const raw = `${ip}::${deviceToken}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `vh_${(h >>> 0).toString(16)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Data pilihan polling tidak valid." },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local-ip";
    const voterHash = hashDeviceVoter(ip, parsed.data.deviceToken);

    const result = await voteOnPoll(
      parsed.data.pollId,
      parsed.data.optionId,
      voterHash
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Gagal menyimpan suara polling." },
      { status: 500 }
    );
  }
}
