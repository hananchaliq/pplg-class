import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { SubmitPayloadSchema, verifyClassCode } from "@/lib/domain-logic";
import { createPendingSubmission } from "@/lib/db";

// Rate limit sederhana per IP / perangkat di memori server
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxPerMinute = 15): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "local-client";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Terlalu banyak kiriman dalam waktu singkat. Coba lagi sebentar ya.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Anti-bot honeypot check
    if (body && typeof body.honeypot === "string" && body.honeypot.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Permintaan ditolak oleh pelindung spam." },
        { status: 400 }
      );
    }

    const parsed = SubmitPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Data kiriman belum lengkap atau melebihi batas karakter. Periksa kembali isianmu ya.",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Verifikasi kode kelas di sisi server (tidak pernah bocor ke klien)
    if (!verifyClassCode(payload.classCode)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kode kelas tidak sesuai. Gunakan kode kelas XII PPLG 1 (default: XIIPPLG1).",
        },
        { status: 403 }
      );
    }

    // Validasi tipe MIME dan ukuran untuk unggahan gambar momen
    if (payload.type === "moment" && payload.imageDataUrl) {
      const validMime = /^data:image\/(webp|jpeg|jpg|png);base64,/i.test(
        payload.imageDataUrl
      );
      if (!validMime) {
        return NextResponse.json(
          {
            ok: false,
            error: "Format gambar harus berupa WebP, JPEG, atau PNG.",
          },
          { status: 400 }
        );
      }
      if (payload.imageDataUrl.length > 4 * 1024 * 1024) {
        return NextResponse.json(
          {
            ok: false,
            error: "Ukuran gambar terkompresi maksimal 3 MB.",
          },
          { status: 400 }
        );
      }
    }

    const created = await createPendingSubmission(payload);
    revalidatePath("/", "layout");

    return NextResponse.json({
      ok: true,
      submission: created,
      message:
        "Terima kasih! Kirimanmu sudah masuk ke antrean moderasi admin dan akan tampil setelah disetujui.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan saat memproses kiriman." },
      { status: 500 }
    );
  }
}
