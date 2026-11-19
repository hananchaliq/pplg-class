import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import {
  deleteMediaFromBlob,
  getMediaManifest,
  isVercelBlobConfigured,
  normalizeChannel,
  parseImageDataUrl,
  uploadMediaToBlob,
  type MediaChannel,
} from "@/lib/media-store";
import type { MomentPhase } from "@/lib/types";

export const dynamic = "force-dynamic";

function revalidateAllPublicMediaPages() {
  try {
    revalidateTag("media-manifest");
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
 * GET /api/upload?channel=hero3d|yearbook|gallery
 * Mengembalikan daftar media dari manifest.json Vercel Blob.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelParam = searchParams.get("channel");
    const includePending =
      searchParams.get("includePending") === "1" && isAuthorizedAdmin(req);

    const channel: MediaChannel | undefined = channelParam
      ? normalizeChannel(channelParam)
      : undefined;

    const result = await getMediaManifest({
      channel,
      includeFallbackIfEmpty: !includePending,
      includePending,
    });

    return NextResponse.json(
      {
        ok: true,
        storage: result.storage,
        blobConfigured: isVercelBlobConfigured(),
        isFallback: result.isFallback,
        items: result.items,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membaca manifest media.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/upload
 * Dilindungi autentikasi sesi admin.
 * Menerima multipart/form-data (file WebP terkompresi) ATAU JSON (imageDataUrl / existingUrl).
 * Mengunggah ke Vercel Blob sesuai channel (`hero3d/`, `yearbook/`, `gallery/`),
 * memperbarui `manifest.json`, dan menjalankan `revalidatePath('/')`.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const bodyToken = String(formData.get("sessionToken") || "");
      if (!isAuthorizedAdmin(req, bodyToken)) {
        return NextResponse.json(
          { ok: false, error: "Akses ditolak. Silakan masuk sebagai admin terlebih dahulu." },
          { status: 401 }
        );
      }

      const fileEntry = formData.get("file");
      const existingUrl = String(formData.get("existingUrl") || "").trim();
      const category = String(formData.get("category") || "").trim();
      const channel = normalizeChannel(
        String(formData.get("channel") || ""),
        category
      );
      const title = String(formData.get("title") || "").trim();
      const caption = String(formData.get("caption") || "").trim();
      const phase = parsePhase(formData.get("phase"));
      const takenAt = String(formData.get("takenAt") || "").trim();
      const uploaderName = String(
        formData.get("uploaderName") || "Admin XII PPLG 1"
      ).trim();
      const studentName = String(formData.get("studentName") || "").trim();
      const studentId = String(formData.get("studentId") || "").trim();
      const replaceExistingCategory =
        String(formData.get("replaceExistingCategory") || "") === "true";

      let buffer: Buffer | undefined;
      let fileContentType = "image/webp";
      let fileName = "foto-kelas.webp";

      if (fileEntry && typeof fileEntry !== "string") {
        if (fileEntry.size > 6 * 1024 * 1024) {
          return NextResponse.json(
            { ok: false, error: "Ukuran berkas gambar melebihi batas maksimal 6 MB." },
            { status: 400 }
          );
        }
        const arrayBuf = await fileEntry.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
        fileContentType = fileEntry.type || "image/webp";
        fileName = fileEntry.name || "foto-kelas.webp";
      } else if (!existingUrl) {
        return NextResponse.json(
          { ok: false, error: "Berkas foto atau tautan gambar wajib disertakan." },
          { status: 400 }
        );
      }

      const uploaded = await uploadMediaToBlob({
        channel,
        buffer,
        contentType: fileContentType,
        fileName,
        existingUrl: existingUrl || undefined,
        title: title || undefined,
        caption: caption || "Dokumentasi Kenangan XII PPLG 1",
        category: category || undefined,
        phase,
        takenAt: takenAt || undefined,
        uploaderName,
        studentName: studentName || undefined,
        studentId: studentId || undefined,
        replaceExistingCategory,
        status: "approved",
        featured: true,
      });

      revalidateAllPublicMediaPages();

      return NextResponse.json({
        ok: true,
        storage: uploaded.storage,
        item: uploaded.item,
        url: uploaded.item.url,
        totalItems: uploaded.manifest.items.length,
      });
    }

    // Mode JSON (imageDataUrl atau existingUrl)
    const body = await req.json();
    if (!isAuthorizedAdmin(req, typeof body?.sessionToken === "string" ? body.sessionToken : undefined)) {
      return NextResponse.json(
        { ok: false, error: "Akses ditolak. Silakan masuk sebagai admin terlebih dahulu." },
        { status: 401 }
      );
    }

    const category = String(body?.category || "").trim();
    const channel = normalizeChannel(
      typeof body?.channel === "string" ? body.channel : "",
      category
    );
    const rawImage = String(body?.imageDataUrl || body?.imageUrl || "").trim();
    const existingUrl = String(body?.existingUrl || "").trim();

    let buffer: Buffer | undefined;
    let fileContentType = "image/webp";
    let finalExistingUrl = existingUrl;

    if (rawImage.startsWith("data:image/")) {
      const parsed = parseImageDataUrl(rawImage);
      buffer = parsed.buffer;
      fileContentType = parsed.contentType;
    } else if (rawImage) {
      finalExistingUrl = rawImage;
    }

    if (!buffer && !finalExistingUrl) {
      return NextResponse.json(
        { ok: false, error: "Data gambar atau URL foto wajib diisi." },
        { status: 400 }
      );
    }

    const uploaded = await uploadMediaToBlob({
      channel,
      buffer,
      contentType: fileContentType,
      fileName: typeof body?.fileName === "string" ? body.fileName : undefined,
      existingUrl: finalExistingUrl || undefined,
      title: typeof body?.title === "string" ? body.title : undefined,
      caption: String(body?.caption || "Dokumentasi Kenangan XII PPLG 1"),
      category: category || undefined,
      phase: parsePhase(body?.phase),
      takenAt: typeof body?.takenAt === "string" ? body.takenAt : undefined,
      uploaderName: String(body?.uploaderName || "Admin XII PPLG 1"),
      studentName:
        typeof body?.studentName === "string" ? body.studentName : undefined,
      studentId:
        typeof body?.studentId === "string" ? body.studentId : undefined,
      replaceExistingCategory: Boolean(body?.replaceExistingCategory),
      status: "approved",
      featured: body?.featured !== false,
    });

    revalidateAllPublicMediaPages();

    return NextResponse.json({
      ok: true,
      storage: uploaded.storage,
      item: uploaded.item,
      url: uploaded.item.url,
      totalItems: uploaded.manifest.items.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal mengunggah foto ke Vercel Blob.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/upload?id=... (atau body JSON { id, url })
 * Dilindungi autentikasi sesi admin.
 * Menghapus berkas di Vercel Blob, memperbarui manifest.json, dan menjalankan revalidatePath('/').
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id")?.trim() || "";
    let url = searchParams.get("url")?.trim() || "";
    let bodyToken = "";

    if (!id && !url) {
      try {
        const body = await req.json();
        id = String(body?.id || "").trim();
        url = String(body?.url || "").trim();
        bodyToken = String(body?.sessionToken || "");
      } catch {
        // Tanpa body JSON
      }
    }

    if (!isAuthorizedAdmin(req, bodyToken)) {
      return NextResponse.json(
        { ok: false, error: "Akses ditolak. Silakan masuk sebagai admin terlebih dahulu." },
        { status: 401 }
      );
    }

    if (!id && !url) {
      return NextResponse.json(
        { ok: false, error: "Parameter id atau url foto yang akan dihapus wajib diisi." },
        { status: 400 }
      );
    }

    const result = await deleteMediaFromBlob({
      id: id || undefined,
      url: url || undefined,
    });

    revalidateAllPublicMediaPages();

    return NextResponse.json({
      ok: result.deleted,
      removedItem: result.removedItem,
      totalItems: result.manifest.items.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus foto dari Vercel Blob.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
