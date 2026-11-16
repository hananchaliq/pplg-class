/**
 * Skrip Inisialisasi Skema Tabel & Relasi Kosong (0 Data Dummy) — XII PPLG 1 MAKN Ende
 * Cara menjalankan: npx tsx scripts/seed.ts
 */
import { Pool } from "pg";
import { AUTO_MIGRATE_SQL } from "../lib/db-sql";

async function main() {
  const dbUrl = (
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    ""
  ).trim();

  if (!dbUrl) {
    console.error(
      "[Peringatan] Variabel DATABASE_URL belum dikonfigurasi untuk membuat tabel otomatis."
    );
    process.exit(1);
  }

  console.log("=== Membuat Seluruh 12 Tabel & Relasi Kosong (0 Data Dummy) di PostgreSQL ===");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    try {
      await client.query(AUTO_MIGRATE_SQL);
      console.log("Seluruh tabel, foreign key, view, dan RLS berhasil dibuat (0 data)!");
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
