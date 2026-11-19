import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import {
  ALLOWED_SUBMISSION_MIME_TYPES,
  MAX_PUBLIC_SUBMISSION_BYTES,
  approvePendingBlobSubmission,
  createPendingBlobSubmission,
  isVercelBlobConfigured,
  normalizeChannel,
  parseImageDataUrl,
  readPendingMediaManifest,
  rejectPendingBlobSubmission,
  type MediaChannel,
} from "@/lib/media-store";
import type { MomentPhase } from "@/lib/types";

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

function parsePhase(raw: unknown): MomentPhase {
  const s = String(raw || "XII").toUpperCase();
  if (s === "X" || s === "XI" || s === "XII") return s;
  return "XII";
}

/**
 * GET /api/submissions
 * Dilindungi sesi admin.
 * Membaca daftar kiriman berstatus `pending` dari `pending-manifest.json` di Vercel Blob.
 */
export async function GET(req: NextRequest) {
  try {
    if (!isAuthorizedAdmin(req)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Akses ditolak. Silakan masuk sebagai admin terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    const { manifest, storage } = await readPendingMediaManifest();
    return NextResponse.json(
      {
        ok: true,
        storage,
        blobConfigured: isVercelBlobConfigured(),
        items: manifest.items,
        totalPending: manifest.items.length,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal membaca antrean pending-manifest.json dari Vercel Blob.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/submissions
 * Tanpa butuh login admin (untuk pengunjung/siswa), namun dengan validasi ukuran file maks 2MB
 * dan tipe `image/webp`, `image/jpeg`, atau `image/png`.
 * a) Menyimpan file gambar ke Vercel Blob dengan prefix `pending/` menggunakan `put('pending/<timestamp>-<slug>.webp', file, { access: 'public' })`.
 * b) Menyimpan metadata kiriman ke dalam `pending-manifest.json` di Vercel Blob (`allowOverwrite: true`).
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const honeypot = String(formData.get("honeypot") || "").trim();
      if (honeypot.length > 0) {
        return NextResponse.json(
          { ok: false, error: "Permintaan ditolak oleh filter keamanan." },
          { status: 400 }
        );
      }

      const fileEntry = formData.get("file");
      const existingUrl = String(formData.get("existingUrl") || "").trim();
      const category = String(formData.get("category") || "").trim();
      const channel = normalizeChannel(
        String(formData.get("channel") || ""),
        category
      );
      const senderName = String(
        formData.get("senderName") ||
          formData.get("uploaderName") ||
          formData.get("studentName") ||
          "Siswa XII PPLG 1"
      ).trim();
      const title = String(formData.get("title") || "").trim();
      const caption = String(
        formData.get("caption") || formData.get("description") || ""
      ).trim();
      const phase = parsePhase(formData.get("phase"));
      const takenAt = String(formData.get("takenAt") || "").trim();
      const studentId = String(formData.get("studentId") || "").trim();
      const studentName = String(formData.get("studentName") || "").trim();
      const demoUrl = String(formData.get("demoUrl") || "").trim();
      const repoUrl = String(formData.get("repoUrl") || "").trim();
      const rawTags = String(formData.get("tags") || "").trim();
      const tags = rawTags
        ? rawTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      let buffer: Buffer | undefined;
      let fileContentType = "image/webp";
      let fileName = "kiriman-kelas.webp";

      if (fileEntry && typeof fileEntry !== "string") {
        if (fileEntry.size > MAX_PUBLIC_SUBMISSION_BYTES) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Ukuran file gambar melebihi batas maksimal 2 MB. Pastikan gambar sudah dikompresi.",
            },
            { status: 400 }
          );
        }
        const mime = (fileEntry.type || "image/webp").toLowerCase();
        if (!ALLOWED_SUBMISSION_MIME_TYPES.has(mime)) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Tipe file tidak valid. Hanya menerima image/webp, image/jpeg, atau image/png.",
            },
            { status: 400 }
          );
        }
        const arrayBuf = await fileEntry.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
        fileContentType = mime;
        fileName = fileEntry.name || "kiriman-kelas.webp";
      } else if (!existingUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: "Berkas foto wajib dipilih untuk dikirim ke antrean moderasi.",
          },
          { status: 400 }
        );
      }

      const created = await createPendingBlobSubmission({
        channel,
        category: category || undefined,
        buffer,
        contentType: fileContentType,
        fileName,
        existingUrl: existingUrl || undefined,
        senderName,
        title: title || undefined,
        caption: caption || "Kiriman Kenangan XII PPLG 1 MAKN Ende",
        phase,
        takenAt: takenAt || undefined,
        studentId: studentId || undefined,
        studentName: studentName || undefined,
        demoUrl: demoUrl || undefined,
        repoUrl: repoUrl || undefined,
        tags,
      });

      revalidatePath("/admin");

      return NextResponse.json({
        ok: true,
        storage: created.storage,
        item: created.item,
        blobUrl: created.item.blobUrl,
        message:
          "Foto berhasil dikirim ke antrean moderasi admin (pending-manifest.json)!",
      });
    }

    // Mode JSON (imageDataUrl atau existingUrl)
    const body = await req.json();
    if (typeof body?.honeypot === "string" && body.honeypot.trim().length > 0) {
      return NextResponse.json(
        { ok: false, error: "Permintaan ditolak oleh filter keamanan." },
        { status: 400 }
      );
    }

    const category = String(body?.category || "").trim();
    const channel = normalizeChannel(
      typeof body?.channel === "string" ? body.channel : "",
      category
    );
    const senderName = String(
      body?.senderName ||
        body?.uploaderName ||
        body?.studentName ||
        "Siswa XII PPLG 1"
    ).trim();
    const title = String(body?.title || "").trim();
    const caption = String(
      body?.caption || body?.description || "Kiriman Kenangan XII PPLG 1"
    ).trim();
    const rawImage = String(body?.imageDataUrl || body?.imageUrl || "").trim();
    const existingUrl = String(body?.existingUrl || "").trim();

    let buffer: Buffer | undefined;
    let fileContentType = "image/webp";
    let finalExistingUrl = existingUrl;

    if (rawImage.startsWith("data:image/")) {
      const parsed = parseImageDataUrl(rawImage);
      if (parsed.buffer.byteLength > MAX_PUBLIC_SUBMISSION_BYTES) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Ukuran file gambar melebihi batas maksimal 2 MB. Pastikan gambar sudah dikompresi.",
          },
          { status: 400 }
        );
      }
      if (!ALLOWED_SUBMISSION_MIME_TYPES.has(parsed.contentType)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Tipe file tidak valid. Hanya menerima image/webp, image/jpeg, atau image/png.",
          },
          { status: 400 }
        );
      }
      buffer = parsed.buffer;
      fileContentType = parsed.contentType;
    } else if (rawImage) {
      finalExistingUrl = rawImage;
    }

    if (!buffer && !finalExistingUrl) {
      return NextResponse.json(
        { ok: false, error: "Data gambar atau file foto wajib disertakan." },
        { status: 400 }
      );
    }

    const created = await createPendingBlobSubmission({
      channel,
      category: category || undefined,
      buffer,
      contentType: fileContentType,
      fileName: typeof body?.fileName === "string" ? body.fileName : undefined,
      existingUrl: finalExistingUrl || undefined,
      senderName,
      title: title || undefined,
      caption,
      phase: parsePhase(body?.phase),
      takenAt: typeof body?.takenAt === "string" ? body.takenAt : undefined,
      studentId:
        typeof body?.studentId === "string" ? body.studentId : undefined,
      studentName:
        typeof body?.studentName === "string" ? body.studentName : undefined,
      demoUrl: typeof body?.demoUrl === "string" ? body.demoUrl : undefined,
      repoUrl: typeof body?.repoUrl === "string" ? body.repoUrl : undefined,
      tags: Array.isArray(body?.tags) ? body.tags.map(String) : undefined,
    });

    revalidatePath("/admin");

    return NextResponse.json({
      ok: true,
      storage: created.storage,
      item: created.item,
      blobUrl: created.item.blobUrl,
      message:
        "Foto berhasil dikirim ke antrean moderasi admin (pending-manifest.json)!",
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal menyimpan kiriman foto ke antrean Vercel Blob.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/submissions
 * Dilindungi sesi admin.
 * Menangani aksi moderasi Admin:
 * - action: "approve" (ACC) -> pindahkan item dari `pending-manifest.json` ke `manifest.json` utama, hapus dari `pending-manifest.json`, dan revalidate seluruh halaman publik.
 * - action: "reject" (Tolak) -> hapus file gambar fisik dari Vercel Blob menggunakan `del(item.blobUrl)` dan hapus item dari `pending-manifest.json`.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
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

    const id = String(body?.id || "").trim();
    const action = String(body?.action || body?.status || "")
      .trim()
      .toLowerCase();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "ID kiriman wajib disertakan." },
        { status: 400 }
      );
    }

    if (action === "approve" || action === "approved" || action === "acc") {
      const targetChannel: MediaChannel | undefined = body?.channel
        ? normalizeChannel(String(body.channel), body?.category)
        : undefined;
      const result = await approvePendingBlobSubmission(id, {
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
          "Kiriman berhasil di-ACC, dipindahkan ke manifest.json publik, dan langsung tampil di halaman publik!",
      });
    }

    if (action === "reject" || action === "rejected" || action === "tolak") {
      const result = await rejectPendingBlobSubmission(id);

      revalidateAllSubmissionPages();

      return NextResponse.json({
        ok: true,
        action: "rejected",
        rejectedItem: result.rejectedItem,
        remainingPending: result.pendingManifest.items.length,
        message:
          "Kiriman ditolak. File gambar fisik telah dihapus dari Vercel Blob dan antrean dibersihkan.",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Aksi moderasi tidak dikenali. Gunakan 'approve' atau 'reject'.",
      },
      { status: 400 }
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal memproses moderasi kiriman di Vercel Blob.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
