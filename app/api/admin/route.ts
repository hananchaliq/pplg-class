import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  deleteStudentAdmin,
  deleteTeacherAdmin,
  getAdminDashboardData,
  getSupabaseAdminClient,
  isSupabaseConfigured,
  moderateItem,
  updateSiteSettings,
  upsertStudentAdmin,
  upsertTeacherAdmin,
  type ModeratableTable,
} from "@/lib/db";
import type { ContentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const ADMIN_COOKIE = "xii_pplg1_admin_session";

function getExpectedPasscode(): string {
  return (process.env.ADMIN_PASSCODE || "ADMIN-MAKN-ENDE").trim();
}

function isAuthorizedAdmin(req: NextRequest): boolean {
  const cookieVal = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookieVal === "authenticated_admin_xiipplg1") return true;
  const headerCode = req.headers.get("x-admin-passcode");
  if (headerCode && headerCode.trim() === getExpectedPasscode()) return true;
  return false;
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
  const data = await getAdminDashboardData();
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
      const email = String(body?.email || "").trim();
      const password = String(body?.password || "").trim();

      // 1. Jika Supabase Auth dikonfigurasi dan user mengirim email + password
      if (isSupabaseConfigured() && email && password) {
        const supabase = getSupabaseAdminClient();
        if (supabase) {
          const { data: authData, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!error && authData.user) {
            const res = NextResponse.json({ ok: true, authenticated: true });
            res.cookies.set(ADMIN_COOKIE, "authenticated_admin_xiipplg1", {
              httpOnly: true,
              path: "/",
              sameSite: "lax",
              maxAge: 60 * 60 * 12,
            });
            return res;
          }
        }
      }

      // 2. Verifikasi kode admin server
      if (password === getExpectedPasscode()) {
        const res = NextResponse.json({ ok: true, authenticated: true });
        res.cookies.set(ADMIN_COOKIE, "authenticated_admin_xiipplg1", {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          maxAge: 60 * 60 * 12,
        });
        return res;
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "Kredensial admin tidak valid. Untuk mode pratinjau gunakan kode sandi admin (default: ADMIN-MAKN-ENDE).",
        },
        { status: 401 }
      );
    }

    if (action === "logout") {
      const res = NextResponse.json({ ok: true, authenticated: false });
      res.cookies.delete(ADMIN_COOKIE);
      return res;
    }

    // Semua aksi di bawah wajib terautentikasi sebagai Admin
    if (!isAuthorizedAdmin(req)) {
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
      revalidatePath("/", "layout");
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: success, data });
    }

    if (action === "settings") {
      const graduationDate = String(body.graduationDate || "");
      await updateSiteSettings(graduationDate);
      revalidatePath("/", "layout");
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "upsert_student") {
      await upsertStudentAdmin(body.student);
      revalidatePath("/", "layout");
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "delete_student") {
      const id = String(body.id || "");
      const ok = await deleteStudentAdmin(id);
      revalidatePath("/", "layout");
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok, data });
    }

    if (action === "upsert_teacher") {
      await upsertTeacherAdmin(body.teacher);
      revalidatePath("/", "layout");
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "delete_teacher") {
      const id = String(body.id || "");
      const ok = await deleteTeacherAdmin(id);
      revalidatePath("/", "layout");
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok, data });
    }

    return NextResponse.json(
      { ok: false, error: "Aksi admin tidak dikenali." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server admin." },
      { status: 500 }
    );
  }
}
