import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { SubmitPayloadSchema, sanitizeText, verifyClassCode } from "@/lib/domain-logic";
import { createPendingSubmission } from "@/lib/db";
import {
  checkRateLimit,
  detectImageMimeFromMagicBytes,
  getClientIp,
} from "@/lib/security";
import { sanitizeSafeUrl } from "@/lib/url-safety";
import {
  MAX_PUBLIC_SUBMISSION_BYTES,
  normalizeChannel,
  parseImageDataUrl,
  uploadMediaToBlob,
  type MediaItem,
} from "@/lib/media-store";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`submit:${ip}`, 15, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Terlalu banyak kiriman dalam waktu singkat. Coba lagi sebentar ya.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
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

    // Verifikasi kode kelas di sisi server
    if (!verifyClassCode(payload.classCode)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kode kelas tidak sesuai. Periksa kembali kode akses XII PPLG 1.",
        },
        { status: 403 }
      );
    }

    let preUploadedBlobItem: MediaItem | undefined;

    if (
      (payload.type === "moment" || payload.type === "work") &&
      payload.imageDataUrl
    ) {
      const isDataImage = /^data:image\/(webp|jpeg|jpg|png);base64,/i.test(
        payload.imageDataUrl
      );
      const isHttpsUrl =
        payload.type === "work" && Boolean(sanitizeSafeUrl(payload.imageDataUrl));
      if (!isDataImage && !isHttpsUrl) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Format gambar harus berupa WebP, JPEG, PNG, atau tautan pratinjau valid.",
          },
          { status: 400 }
        );
      }
      if (payload.imageDataUrl.length > 2.85 * 1024 * 1024) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Ukuran file gambar melebihi batas maksimal 2 MB. Pastikan gambar sudah terkompresi.",
          },
          { status: 400 }
        );
      }

      if (payload.imageDataUrl.startsWith("data:image/")) {
        const parsedImg = parseImageDataUrl(payload.imageDataUrl);
        if (parsedImg.buffer.byteLength > MAX_PUBLIC_SUBMISSION_BYTES) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Ukuran file gambar melebihi batas maksimal 2 MB. Pastikan gambar sudah terkompresi.",
            },
            { status: 400 }
          );
        }

        const detectedMime = detectImageMimeFromMagicBytes(parsedImg.buffer);
        if (
          !detectedMime ||
          !["image/webp", "image/jpeg", "image/png"].includes(detectedMime)
        ) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Konten gambar tidak valid. Hanya menerima berkas WebP, JPEG, atau PNG asli.",
            },
            { status: 400 }
          );
        }

        if (payload.type === "moment") {
          const cleanCategory = sanitizeText(payload.category);
          const targetChannel = normalizeChannel(undefined, cleanCategory);
          const uploaded = await uploadMediaToBlob({
            channel: targetChannel,
            category: cleanCategory,
            buffer: parsedImg.buffer,
            contentType: detectedMime,
            uploaderName: sanitizeText(payload.uploaderName),
            caption: sanitizeText(payload.caption),
            phase: payload.phase,
            takenAt: payload.takenAt || new Date().toISOString().slice(0, 10),
            status: "pending",
            featured: false,
          });
          payload.imageDataUrl = uploaded.item.url;
          preUploadedBlobItem = uploaded.item;
        } else if (payload.type === "work") {
          const uploaded = await uploadMediaToBlob({
            channel: "karya",
            category: "Karya Siswa",
            buffer: parsedImg.buffer,
            contentType: detectedMime,
            studentId: payload.studentId,
            title: sanitizeText(payload.title),
            caption: sanitizeText(payload.description),
            demoUrl: sanitizeSafeUrl(payload.demoUrl),
            repoUrl: sanitizeSafeUrl(payload.repoUrl),
            tags: payload.tags.map((t) => sanitizeText(t)),
            status: "pending",
            featured: false,
          });
          payload.imageDataUrl = uploaded.item.url;
          preUploadedBlobItem = uploaded.item;
        }
      }
    }

    const created = await createPendingSubmission(payload, preUploadedBlobItem);

    try {
      revalidateTag("media-manifest");
      revalidateTag("pending-manifest");
    } catch {
      // Abaikan jika di luar konteks cache
    }
    revalidatePath("/");
    revalidatePath("/galeri");
    revalidatePath("/kenangan");
    revalidatePath("/karya");
    revalidatePath("/anggota");
    revalidatePath("/dream-board");
    revalidatePath("/admin");
    revalidatePath("/", "layout");

    return NextResponse.json({
      ok: true,
      submission: created,
      message:
        "Terima kasih! Kirimanmu sudah masuk ke antrean moderasi admin dan akan tampil setelah disetujui.",
    });
  } catch (err) {
    console.error("[api/submit] error:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan saat memproses kiriman." },
      { status: 500 }
    );
  }
}
