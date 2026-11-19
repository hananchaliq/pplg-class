import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

export async function GET() {
  const { url, configured } = getSupabaseConfig();
  const data = await getPublicAppData(true);
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
    const customDatabaseUrl =
      typeof body?.databaseUrl === "string" ? body.databaseUrl.trim() : "";

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
    const msg =
      err instanceof Error
        ? err.message
        : "Gagal menginisialisasi tabel database.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
