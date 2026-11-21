import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { voteOnPoll } from "@/lib/db";
import {
  checkRateLimit,
  getClientIp,
  hashWithServerSalt,
} from "@/lib/security";

const VoteSchema = z.object({
  pollId: z.string().min(1).max(120),
  optionId: z.string().min(1).max(120),
  deviceToken: z.string().min(4).max(120),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`poll-vote:${ip}`, 20, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Terlalu banyak permintaan suara. Coba lagi sebentar ya.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }

    const body = await req.json();
    const parsed = VoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Data pilihan polling tidak valid." },
        { status: 400 }
      );
    }

    const voterHash = hashWithServerSalt(
      `${ip}::${parsed.data.deviceToken}`,
      "poll-vote"
    );

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
  } catch (err) {
    console.error("[api/polls/vote] error:", err);
    return NextResponse.json(
      { ok: false, error: "Gagal menyimpan suara polling." },
      { status: 500 }
    );
  }
}
