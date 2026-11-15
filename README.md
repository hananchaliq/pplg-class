# Album Kenangan Digital 3D — Kelas XII PPLG 1 (MAKN Ende)

Website album kenangan digital interaktif untuk **Kelas XII PPLG 1 (Pengembangan Perangkat Lunak dan Gim), Madrasah Aliyah Kejuruan Negeri Ende (MAKN Ende)**, Kabupaten Ende, Nusa Tenggara Timur.

Dirancang dengan estetika **nostalgia hangat sore hari** (kertas buku tahunan, kayu meja belajar, tenun ikat Ende, dan aksen tiga warna Danau Kelimutu) serta **arsitektur visual dua tingkat (`useVisualTier`)**:
- **Tier `hd` (Desktop Mampu)**: Adegan 3D prosedural murni menggunakan Three.js + GSAP (Meja Belajar Saat Senja, Tali Polaroid Catenary dengan pegas, Buku Kenangan Bersampul Kain dengan halaman melengkung dan tulisan tangan *Caveat*, serta Papan Tulis Kapur Dream Board dengan 22 sticky note melengkung & pin 3D).
- **Tier `simple` (Mobile / Hemat Daya / Reduced Motion)**: Tampilan 2D/SVG hangat yang ringan, cepat, dan ramah sentuhan, dilengkapi sakelar manual **"Aktifkan 3D" / "Mode ringan"** di bilah navigasi dan footer.

---

## 1. Cara Menjalankan Proyek Secara Lokal

```bash
# 1. Instal dependensi
npm install

# 2. Jalankan server pengembangan (port 3000)
npm run dev

# 3. Jalankan unit test logika domain
npx tsx --test lib/domain-logic.test.ts

# 4. Build produksi
npm run build
```

---

## 2. Konfigurasi Variabel Lingkungan (`.env.local`)

Salin `.env.example` menjadi `.env.local` dan sesuaikan nilainya:

```env
# Opsional: Jika dikosongkan, aplikasi otomatis menggunakan penyimpanan persisten lokal (/tmp/xii-pplg1-makn-ende-store.json)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_ADMIN_UID="00000000-0000-0000-0000-000000000000"

# Kode rahasia kelas untuk mengirim pesan/momen/karya dari form publik (diverifikasi di server)
CLASS_SECRET_CODE="XIIPPLG1"

# Kode sandi pengurus kelas untuk masuk ke dasbor /admin
ADMIN_PASSCODE="ADMIN-MAKN-ENDE"
```

---

## 3. Cara Menyiapkan Supabase & Menjalankan Migrasi + Seed

1. Buat proyek baru di [Supabase](https://supabase.com).
2. Buka **SQL Editor** di dasbor Supabase, lalu salin dan jalankan seluruh isi file:
   - `supabase/migrations/0001_init.sql`
   File ini membuat seluruh tabel (`students`, `teachers`, `moments`, `dreams`, `dream_cheers`, `memory_entries`, `time_capsules`, `thanks`, `works`, `polls`, `poll_options`, `poll_votes`, `site_settings`), view aman `public_time_capsules` (yang menyembunyikan `message` di server sebelum `unlock_at <= now()`), serta kebijakan Row Level Security (RLS).
3. Buat bucket **Supabase Storage**:
   - `avatars` (publik, maks 2MB, khusus foto profil siswa & guru)
   - `moments` (publik, maks 4MB, untuk unggahan foto galeri yang sudah dikompresi WebP di browser)
   - `works` (publik, maks 2MB, untuk cuplikan karya siswa)
4. Isi data awal (seed) ke Supabase:
   ```bash
   npx tsx scripts/seed.ts
   ```

---

## 4. Cara Mengganti Data Placeholder dengan Data Asli Kelas XII PPLG 1

Seluruh data awal berada di `lib/seed-data.ts` dan dapat diubah langsung atau dikelola melalui **Dasbor Admin (`/admin`)**:
- **22 Siswa Aktif (8 Laki-laki + 14 Perempuan) & 2 Siswa Pindah ("Pernah Bersama Kita")**:
  - Masuk ke `/admin` -> tab **Data Siswa** untuk mengubah nama lengkap, nama panggilan, bio, grup rail (`L`, `P1`, `P2`, `moved`), atau mengatur opsi `show_photo` (jika dimatikan, kartu otomatis menampilkan siluet hangat tanpa wajah).
- **1 Wali Kelas + 49 Guru (Kejuruan, Agama, Akademik)**:
  - Masuk ke `/admin` -> tab **Data Guru** untuk memperbarui nama, gelar, mata pelajaran, dan pesan untuk kelas.
- **Moderasi Kiriman Publik**:
  - Semua kiriman dari form publik (menggunakan kode kelas `XIIPPLG1`) masuk dengan status `pending`.
  - Buka `/admin` (kode sandi default: `ADMIN-MAKN-ENDE`) -> tab **Antrean Moderasi** untuk mengedit teks, menyetujui (**Setujui**), atau menolak (**Tolak**) kiriman agar langsung tampil di halaman publik.
- **Teks & Copywriting**:
  - Seluruh label antarmuka, sambutan, pertanyaan kuis kenangan, dan keterangan bagian terpusat di `lib/content.ts`.
