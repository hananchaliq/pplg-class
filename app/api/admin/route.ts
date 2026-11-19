import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TOKEN,
  getExpectedAdminPasscode,
  isAuthorizedAdmin,
  setAdminSessionCookie,
} from "@/lib/admin-auth";
import {
  createPollAdmin,
  deleteModeratedItem,
  deletePollAdmin,
  deleteStudentAdmin,
  deleteTeacherAdmin,
  getAdminDashboardData,
  moderateItem,
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
  revalidatePath("/");
  revalidatePath("/galeri");
  revalidatePath("/kenangan");
  revalidatePath("/anggota");
  revalidatePath("/guru");
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
      const password = String(body?.password || "").trim();

      if (password === getExpectedAdminPasscode()) {
        const data = await getAdminDashboardData();
        const res = NextResponse.json({
          ok: true,
          authenticated: true,
          token: ADMIN_SESSION_TOKEN,
          data,
        });
        setAdminSessionCookie(res);
        return res;
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kredensial admin tidak valid. Gunakan kode sandi admin (default: ADMIN-MAKN-ENDE).",
        },
        { status: 401 }
      );
    }

    if (action === "logout") {
      const res = NextResponse.json({ ok: true, authenticated: false });
      res.cookies.delete(ADMIN_COOKIE);
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
        buffer = parsed.buffer;
        contentType = parsed.contentType;
      } else {
        existingUrl = imageUrl;
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
      await upsertStudentAdmin(body.student);
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
      await upsertTeacherAdmin(body.teacher);
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

    return NextResponse.json(
      { ok: false, error: "Aksi admin tidak dikenali." },
      { status: 400 }
    );
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan pada server admin.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
