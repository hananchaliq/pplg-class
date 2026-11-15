/**
 * Skrip Seed Lengkap Website Kenangan Kelas XII PPLG 1 — MAKN Ende
 * Cara menjalankan: npx tsx scripts/seed.ts
 */
import { generateInitialSeedData } from "../lib/seed-data";
import {
  ensureSupabaseSeeded,
  getSupabaseAdminClient,
  isSupabaseConfigured,
} from "../lib/db";

async function main() {
  const data = generateInitialSeedData();

  console.log("=== Seed Data Kelas XII PPLG 1 — MAKN Ende ===");
  console.log(`- Siswa Aktif: ${data.students.filter((s) => s.is_active).length}`);
  console.log(`- Pernah Bersama Kita: ${data.students.filter((s) => !s.is_active).length}`);
  console.log(`- Guru & Wali Kelas: ${data.teachers.length}`);
  console.log(`- Foto Galeri Momen: ${data.moments.length}`);
  console.log(`- Catatan Dream Board: ${data.dreams.length}`);
  console.log(`- Entri Buku Kenangan: ${data.memoryEntries.length}`);
  console.log(`- Kapsul Waktu: ${data.rawTimeCapsules.length}`);
  console.log(`- Karya Siswa: ${data.works.length}`);

  if (!isSupabaseConfigured()) {
    console.log(
      "\n[Info] Variabel NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur."
    );
    console.log(
      "Data seed telah disiapkan otomatis pada penyimpanan persisten aplikasi (.data/xii-pplg1-makn-ende-store.json)."
    );
    return;
  }

  const supabase = getSupabaseAdminClient()!;
  console.log("\nMenyimpan seluruh tabel data awal ke Supabase PostgreSQL...");
  const ok = await ensureSupabaseSeeded(supabase);
  if (!ok) {
    console.error("Gagal melakukan seed ke Supabase PostgreSQL.");
    process.exit(1);
  }

  console.log("Seed seluruh tabel Supabase selesai dengan sukses!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
