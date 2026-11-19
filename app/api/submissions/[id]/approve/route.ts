import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import {
  approvePendingBlobSubmission,
  normalizeChannel,
  type MediaChannel,
} from "@/lib/media-store";

export const dynamic = "force-dynamic";

function revalidateAllSubmissionPages() {
  try {
    revalidateTag("media-manifest");
    revalidateTag("pending-manifest");
  } catch {
    // Abaikan jika revalidateTag dipanggil di luar konteks cache
  }
  revalidatePath("/");
  revalidatePath("/galeri");
  revalidatePath("/kenangan");
  revalidatePath("/karya");
  revalidatePath("/anggota");
  revalidatePath("/guru");
  revalidatePath("/dream-board");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

/**
 * POST /api/submissions/[id]/approve
 * Dilindungi sesi admin.
 * 1. Memindahkan/menyalin item dari `pending-manifest.json` ke file indeks publik utama `manifest.json` di Vercel Blob sesuai channel tujuannya (`hero3d`, `gallery`, `yearbook`, `karya`, `students`).
 * 2. Menghapus item tersebut dari `pending-manifest.json` agar antrean admin bersih.
 * 3. Menjalankan `revalidateTag('media-manifest')` dan `revalidatePath('/')` beserta route terkait (`/galeri`, `/kenangan`, `/karya`, `/anggota`).
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      // Body opsional
    }

    const bodyToken =
      typeof body?.sessionToken === "string" ? body.sessionToken : undefined;

    if (!isAuthorizedAdmin(req, bodyToken)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Akses ditolak. Silakan masuk sebagai admin terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    const cleanId = (id || "").trim();
    if (!cleanId) {
      return NextResponse.json(
        { ok: false, error: "Parameter ID kiriman wajib diisi." },
        { status: 400 }
      );
    }

    const targetChannel: MediaChannel | undefined =
      typeof body?.channel === "string" && body.channel.trim()
        ? normalizeChannel(
            body.channel,
            typeof body?.category === "string" ? body.category : undefined
          )
        : undefined;

    const result = await approvePendingBlobSubmission(cleanId, {
      updatedCaption:
        typeof body?.updatedText === "string"
          ? body.updatedText
          : typeof body?.caption === "string"
            ? body.caption
            : undefined,
      updatedTitle:
        typeof body?.title === "string" ? body.title : undefined,
      targetChannel,
      targetCategory:
        typeof body?.category === "string" ? body.category : undefined,
    });

    revalidateAllSubmissionPages();

    return NextResponse.json({
      ok: true,
      action: "approved",
      approvedItem: result.approvedItem,
      remainingPending: result.pendingManifest.items.length,
      message:
        "Kiriman berhasil di-ACC, dipindahkan ke manifest.json utama, dan langsung tampil di halaman publik!",
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal menyetujui (ACC) kiriman ke Vercel Blob.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
