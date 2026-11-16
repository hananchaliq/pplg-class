import "server-only";
import { Pool } from "pg";
import { AUTO_MIGRATE_SQL } from "@/lib/db-sql";

export { AUTO_MIGRATE_SQL };

declare global {
  var __xiiPplgSchemaMigrated: boolean | undefined;
  var __xiiPplgCustomDbUrl: string | undefined;
}

export function getConfiguredDatabaseUrl(): string {
  return (
    global.__xiiPplgCustomDbUrl ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    ""
  ).trim();
}

export function setRuntimeDatabaseUrl(dbUrl: string) {
  global.__xiiPplgCustomDbUrl = dbUrl.trim();
  global.__xiiPplgSchemaMigrated = false;
}

/**
 * Jalankan pembuatan tabel & relasi otomatis ke PostgreSQL (0 data dummy)
 * menggunakan koneksi DATABASE_URL jika tersedia.
 */
export async function ensureDatabaseSchema(
  customDatabaseUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  if (customDatabaseUrl && customDatabaseUrl.trim().length > 0) {
    setRuntimeDatabaseUrl(customDatabaseUrl);
  }

  const dbUrl = getConfiguredDatabaseUrl();
  if (!dbUrl) {
    return {
      ok: false,
      error:
        "Variabel DATABASE_URL belum dikonfigurasi untuk menjalankan DDL pembuatan tabel otomatis.",
    };
  }

  if (global.__xiiPplgSchemaMigrated && !customDatabaseUrl) {
    return { ok: true };
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    try {
      await client.query(AUTO_MIGRATE_SQL);
      global.__xiiPplgSchemaMigrated = true;
      return { ok: true };
    } finally {
      client.release();
    }
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "Gagal mengeksekusi DDL skema ke PostgreSQL.";
    return { ok: false, error: msg };
  } finally {
    await pool.end().catch(() => {});
  }
}
