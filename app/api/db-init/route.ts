import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { isSafePostgresConnectionUrl } from "@/lib/security";
import {
  AUTO_MIGRATE_SQL,
  ensureDatabaseSchema,
  getConfiguredDatabaseUrl,
} from "@/lib/db-schema";
import {
  getPublicAppData,
  getSupabaseConfig,
  invalidatePublicDataCache,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const isAdmin = isAuthorizedAdmin(req);
  const { url, configured } = getSupabaseConfig();
  const data = await getPublicAppData(true);

  if (!isAdmin) {
    return NextResponse.json(
      {
        ok: true,
        supabaseConfigured: configured,
        dbConnected: data.dbConnected,
        missingTables: data.missingTables,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      supabaseUrl: url,
      supabaseConfigured: configured,
      hasDatabaseUrl: Boolean(getConfiguredDatabaseUrl()),
      dbConnected: data.dbConnected,
      missingTables: data.missingTables,
      dbError: data.dbError,
      schemaSql: AUTO_MIGRATE_SQL,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bodyToken =
      typeof body?.sessionToken === "string" ? body.sessionToken : undefined;

    if (!isAuthorizedAdmin(req, bodyToken)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Akses ditolak. Hanya admin terautentikasi yang dapat menginisialisasi skema database.",
        },
        { status: 401 }
      );
    }

    const customDatabaseUrl =
      typeof body?.databaseUrl === "string" ? body.databaseUrl.trim() : "";

    if (customDatabaseUrl) {
      const check = isSafePostgresConnectionUrl(customDatabaseUrl);
      if (!check.ok) {
        return NextResponse.json(
          { ok: false, error: check.error || "URL database tidak valid." },
          { status: 400 }
        );
      }
    }

    let migrationResult: { ok: boolean; error?: string } | null = null;
    if (customDatabaseUrl || getConfiguredDatabaseUrl()) {
      migrationResult = await ensureDatabaseSchema(
        customDatabaseUrl || undefined
      );
    }

    invalidatePublicDataCache();
    revalidatePath("/", "layout");
    const data = await getPublicAppData(true);

    if (data.dbConnected) {
      return NextResponse.json({
        ok: true,
        dbConnected: true,
        missingTables: false,
        message:
          "Berhasil terkoneksi ke Supabase PostgreSQL! Seluruh tabel & relasi siap digunakan (0 data dummy).",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        dbConnected: false,
        missingTables: data.missingTables,
        error:
          migrationResult?.error ||
          data.dbError ||
          "Tabel belum tersedia di database Supabase.",
      },
      { status: 400 }
    );
  } catch (err) {
    console.error("[api/db-init] error:", err);
    return NextResponse.json(
      { ok: false, error: "Gagal menginisialisasi tabel database." },
      { status: 500 }
    );
  }
}
