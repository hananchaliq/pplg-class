import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  ADMIN_COOKIE,
  getAdminSessionCookieOptions,
  isAuthorizedAdmin,
  issueAdminSessionToken,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import {
  checkRateLimit,
  detectImageMimeFromMagicBytes,
  getClientIp,
} from "@/lib/security";
import { sanitizeSafeUrl } from "@/lib/url-safety";
import {
  createPollAdmin,
  deleteModeratedItem,
  deletePollAdmin,
  deleteStudentAdmin,
  deleteTeacherAdmin,
  getAdminDashboardData,
  moderateItem,
  syncAllDataToVercelBlob,
  updateSiteSettings,
  upsertStudentAdmin,
  upsertTeacherAdmin,
  type ModeratableTable,
} from "@/lib/db";
import {
  normalizeChannel,
  parseImageDataUrl,
  uploadMediaToBlob,
} from "@/lib/media-store";
import { decodeDeepText } from "@/lib/domain-logic";
import type { ContentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function revalidateAllRoutes() {
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

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json(
      {
        ok: true,
        authenticated: false,
        error: "Belum masuk sebagai admin.",
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
  const data = decodeDeepText(await getAdminDashboardData());
  return NextResponse.json(
    { ok: true, authenticated: true, data },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === "login") {
      const ip = getClientIp(req);
      const rl = checkRateLimit(`admin-login:${ip}`, 8, 15 * 60 * 1000);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            ok: false,
            error: "Terlalu banyak percobaan masuk admin. Silakan coba lagi beberapa saat.",
          },
          {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfterSec) },
          }
        );
      }

      const email = String(body?.email || "").trim();
      const password = String(body?.password || "").trim();

      if (verifyAdminCredentials(email, password)) {
        const token = issueAdminSessionToken();
        const data = await getAdminDashboardData();
        const res = NextResponse.json({
          ok: true,
          authenticated: true,
          token,
          data,
        });
        setAdminSessionCookie(res, token);
        return res;
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Kredensial admin tidak valid. Periksa kembali kode sandi admin.",
        },
        { status: 401 }
      );
    }

    if (action === "logout") {
      const res = NextResponse.json({ ok: true, authenticated: false });
      res.cookies.set(ADMIN_COOKIE, "", getAdminSessionCookieOptions(0));
      return res;
    }

    if (!isAuthorizedAdmin(req, body?.sessionToken)) {
      return NextResponse.json(
        { ok: false, error: "Akses ditolak. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    if (action === "moderate") {
      const table = body.table as ModeratableTable;
      const id = String(body.id || "");
      const status = body.status as ContentStatus;
      const updatedText =
        typeof body.updatedText === "string" ? body.updatedText : undefined;

      const success = await moderateItem(table, id, status, updatedText);
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: success, data });
    }

    if (action === "upsert_moment") {
      const category = String(body.category || "Momen Kelas").trim();
      const channel = normalizeChannel(
        typeof body.channel === "string" ? body.channel : "",
        category
      );
      const uploaderName = String(
        body.uploaderName || "Admin XII PPLG 1"
      ).trim();
      const caption = String(
        body.caption || "Dokumentasi Kenangan XII PPLG 1"
      ).trim();
      const phase = (["X", "XI", "XII"].includes(String(body.phase))
        ? String(body.phase)
        : "XII") as "X" | "XI" | "XII";
      const takenAt = String(
        body.takenAt || new Date().toISOString().slice(0, 10)
      ).trim();
      const imageUrl = String(body.imageUrl || "").trim();
      if (!imageUrl) {
        return NextResponse.json(
          { ok: false, error: "Berkas foto atau URL gambar wajib diisi." },
          { status: 400 }
        );
      }

      let buffer: Buffer | undefined;
      let contentType = "image/webp";
      let existingUrl: string | undefined;

      if (imageUrl.startsWith("data:image/")) {
        const parsed = parseImageDataUrl(imageUrl);
        const detectedMime = detectImageMimeFromMagicBytes(parsed.buffer);
        if (
          !detectedMime ||
          !["image/webp", "image/jpeg", "image/png"].includes(detectedMime)
        ) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Isi berkas gambar tidak valid. Hanya menerima berkas PNG, JPEG, atau WebP asli.",
            },
            { status: 400 }
          );
        }
        buffer = parsed.buffer;
        contentType = detectedMime;
      } else {
        const safeUrl = sanitizeSafeUrl(imageUrl, { allowRelative: true });
        if (!safeUrl) {
          return NextResponse.json(
            {
              ok: false,
              error: "URL gambar harus berupa jalur lokal atau http(s) yang valid.",
            },
            { status: 400 }
          );
        }
        existingUrl = safeUrl;
      }

      await uploadMediaToBlob({
        channel,
        buffer,
        contentType,
        existingUrl,
        category,
        caption,
        uploaderName,
        phase,
        takenAt,
        studentName:
          typeof body.studentName === "string" ? body.studentName : undefined,
        studentId:
          typeof body.studentId === "string" ? body.studentId : undefined,
        replaceExistingCategory: Boolean(body.replaceExistingCategory),
        status: "approved",
        featured: true,
      });

      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "delete_moderated_item") {
      const table = body.table as ModeratableTable;
      const id = String(body.id || "");
      const success = await deleteModeratedItem(table, id);
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: success, data });
    }

    if (action === "settings") {
      const graduationDate = String(body.graduationDate || "");
      await updateSiteSettings(graduationDate);
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "upsert_student") {
      const stuInput =
        body?.student && typeof body.student === "object"
          ? {
              ...body.student,
              ...(typeof body.student.photo_url === "string" &&
              !body.student.photo_url.startsWith("data:image/")
                ? {
                    photo_url: sanitizeSafeUrl(body.student.photo_url, {
                      allowRelative: true,
                    }),
                  }
                : {}),
              ...(Array.isArray(body.student.links)
                ? {
                    links: body.student.links
                      .map((l: { label?: string; href?: string }) => ({
                        label: String(l?.label || "").trim(),
                        href: sanitizeSafeUrl(l?.href),
                      }))
                      .filter((l: { label: string; href: string }) => l.label && l.href),
                  }
                : {}),
            }
          : body.student;
      await upsertStudentAdmin(stuInput);
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "delete_student") {
      const id = String(body.id || "");
      const ok = await deleteStudentAdmin(id);
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok, data });
    }

    if (action === "upsert_teacher") {
      const teaInput =
        body?.teacher && typeof body.teacher === "object"
          ? {
              ...body.teacher,
              ...(typeof body.teacher.photo_url === "string" &&
              !body.teacher.photo_url.startsWith("data:image/")
                ? {
                    photo_url: sanitizeSafeUrl(body.teacher.photo_url, {
                      allowRelative: true,
                    }),
                  }
                : {}),
            }
          : body.teacher;
      await upsertTeacherAdmin(teaInput);
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "delete_teacher") {
      const id = String(body.id || "");
      const ok = await deleteTeacherAdmin(id);
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok, data });
    }

    if (action === "create_poll") {
      const question = String(body.question || "");
      const options = Array.isArray(body.options)
        ? body.options.map(String)
        : [];
      await createPollAdmin(question, options);
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "delete_poll") {
      const id = String(body.id || "");
      const ok = await deletePollAdmin(id);
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok, data });
    }

    if (action === "sync_blob") {
      await syncAllDataToVercelBlob();
      revalidateAllRoutes();
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json(
      { ok: false, error: "Aksi admin tidak dikenali." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[api/admin] error:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server admin." },
      { status: 500 }
    );
  }
}
