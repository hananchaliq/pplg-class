import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createPollAdmin,
  deleteModeratedItem,
  deletePollAdmin,
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
const ADMIN_SESSION_TOKEN = "authenticated_admin_xiipplg1";

function getExpectedPasscode(): string {
  return (process.env.ADMIN_PASSCODE || "ADMIN-MAKN-ENDE").trim();
}

function isAuthorizedAdmin(req: NextRequest, bodyToken?: string): boolean {
  const cookieVal = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookieVal === ADMIN_SESSION_TOKEN) return true;

  const sessionHeader = req.headers.get("x-admin-session")?.trim();
  if (sessionHeader === ADMIN_SESSION_TOKEN) return true;

  const authHeader = req.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${ADMIN_SESSION_TOKEN}`) return true;

  const headerCode = req.headers.get("x-admin-passcode")?.trim();
  if (headerCode && headerCode === getExpectedPasscode()) return true;

  if (bodyToken && bodyToken.trim() === ADMIN_SESSION_TOKEN) return true;

  return false;
}

function setAdminSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 60 * 12,
  });
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
          const { data: authData, error } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });
          if (!error && authData.user) {
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
        }
      }

      // 2. Verifikasi kode admin server
      if (password === getExpectedPasscode()) {
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
      if (success && table === "moments" && status === "approved") {
        const supabase = getSupabaseAdminClient();
        if (supabase) {
          await supabase.from("moments").update({ sort_order: 0 }).eq("id", id);
        }
      }
      revalidatePath("/", "layout");
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: success, data });
    }

    if (action === "upsert_moment") {
      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        return NextResponse.json(
          { ok: false, error: "Database Supabase belum terhubung." },
          { status: 500 }
        );
      }
      const category = String(body.category || "Momen Kelas").trim();
      const uploaderName = String(body.uploaderName || "Admin XII PPLG 1").trim();
      const caption = String(body.caption || "Dokumentasi Kenangan XII PPLG 1").trim();
      const phase = (["X", "XI", "XII"].includes(String(body.phase))
        ? String(body.phase)
        : "XII") as "X" | "XI" | "XII";
      const dateLabel = String(
        body.takenAt || new Date().toISOString().slice(0, 10)
      ).trim();
      const imageUrl = String(body.imageUrl || "").trim();
      if (!imageUrl) {
        return NextResponse.json(
          { ok: false, error: "Berkas foto atau URL gambar wajib diisi." },
          { status: 400 }
        );
      }

      const title = `${category} | ${uploaderName}`;

      // Jika kategori adalah Foto Sampul Buku dan replaceSingle aktif, perbarui yang sudah ada bila ditemukan
      if (body.replaceExistingCategory && category) {
        const { data: existingRows } = await supabase
          .from("moments")
          .select("id, title")
          .ilike("title", `${category} |%`);
        if (existingRows && existingRows.length > 0) {
          const targetId = existingRows[0]!.id;
          const { error: updErr } = await supabase
            .from("moments")
            .update({
              grade: phase,
              title,
              caption,
              date_label: dateLabel,
              image_url: imageUrl,
              sort_order: 0,
            })
            .eq("id", targetId);
          if (updErr) throw new Error(updErr.message);
          revalidatePath("/", "layout");
          const data = await getAdminDashboardData();
          return NextResponse.json({ ok: true, data });
        }
      }

      const id = body.id ? String(body.id) : crypto.randomUUID();
      const { error } = await supabase.from("moments").upsert(
        {
          id,
          grade: phase,
          title,
          caption,
          date_label: dateLabel,
          image_url: imageUrl,
          sort_order: 0,
        },
        { onConflict: "id" }
      );
      if (error) throw new Error(error.message);

      revalidatePath("/", "layout");
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "delete_moderated_item") {
      const table = body.table as ModeratableTable;
      const id = String(body.id || "");
      const success = await deleteModeratedItem(table, id);
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

    if (action === "create_poll") {
      const question = String(body.question || "");
      const options = Array.isArray(body.options)
        ? body.options.map(String)
        : [];
      await createPollAdmin(question, options);
      revalidatePath("/", "layout");
      const data = await getAdminDashboardData();
      return NextResponse.json({ ok: true, data });
    }

    if (action === "delete_poll") {
      const id = String(body.id || "");
      const ok = await deletePollAdmin(id);
      revalidatePath("/", "layout");
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
