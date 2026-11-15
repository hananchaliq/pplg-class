# Progress Pengerjaan Website Kelas XII PPLG 1 — MAKN Ende

Dokumen ini melacak status pengerjaan setiap fase sesuai spesifikasi bagian 11 dan 14.

## Daftar Fase & Status

| Fase | Nama Fase | Status | Catatan |
| :--- | :--- | :--- | :--- |
| **11.1 / 14.1** | Fondasi, Token Desain & Infrastruktur Dua Tingkat (`useVisualTier`, `Adaptive`, `SceneShell`, `useGsap`, Tekstur Prosedural, `WarmLightRig`, `FilmEffects`) | `selesai` | Desain hangat Kelimutu & sistem 3D/Simple lengkap dengan deteksi software-WebGL dan pembersihan GPU |
| **11.2** | Supabase: Migrasi SQL, RLS, Seed Data Placeholder (22 Siswa Aktif + 2 Pindah, 50 Guru, 100 Foto, Karya, Dream, Buku Kenangan), Route Handler & Moderasi | `selesai` | Skema SQL `supabase/migrations/0001_init.sql`, `scripts/seed.ts`, dan fallback persisten lokal otomatis |
| **11.3** | Halaman Anggota & Guru (`TeamLanyardRail` + `FlatIdCard` Mobile + Wali Kelas + "Pernah Bersama Kita" + Lazy Rail) | `selesai` | 3 rail siswa (8 L, 7 P1, 7 P2) + 2 pindah (`show_photo=false` siluet); 50 guru terbagi maks 8/rail dengan `IntersectionObserver` |
| **11.4 / 14.4** | Galeri Momen (Tali Polaroid 3D Verlet Catenary, 3 Rak Fase X/XI/XII, Filter, Grid Masonry, Lightbox, Kompresi WebP Klien) | `selesai` | HD WebGL tali Polaroid + SimpleView scroll-snap horizontal + kompresi kanvas WebP maks 1600px |
| **11.5 / 14.2** | Kenangan: Buku Kenangan 3D (Sampul Kain, Halaman Melengkung Shader, 2-Spread Pool Tekstur Kanvas Caveat, Daftar Isi), Kapsul Waktu, Wall of Thanks | `selesai` | Kapsul waktu menyembunyikan isi di server sebelum `unlock_at` (`public_time_capsules` & `maskTimeCapsuleForPublic`) |
| **11.6 / 14.5** | Dream Board 3D (Papan Tulis Kapur Prosedural, 22 Note Kertas Melengkung & Pin 3D, Raycast Hover/Zoom, Panel Semangat) | `selesai` | HD WebGL papan kapur + SimpleView sticky note grid & detail modal |
| **11.7 / 14.6** | Karya Siswa (1 Siswa = 1 Karya, Tilt 3D Ringan, Skill Map SVG Otomatis) & Halaman Main (Kuis + Polling Batang 3D) | `selesai` | Pencegahan duplikat suara `voter_hash` dan Skill Map dihitung otomatis dari tag karya & anggota |
| **11.8 / 14.3** | Beranda (Hero 3D "Meja Belajar Saat Senja" Prosedural, Hitung Mundur Kelulusan, Statistik, Peta Kartu Menu) | `selesai` | HD WebGL meja kayu + lampu + laptop + uap cangkir + SimpleView Ilustrasi SVG Berlapis |
| **11.9** | Dasbor Admin (`/admin`) & Antrean Moderasi (Setujui, Tolak, Edit, CRUD Siswa/Guru/Momen/Karya, Pengaturan Tanggal Lulus) | `selesai` | Dilindungi autentikasi & bekerja ujung ke ujung dari kirim form publik -> moderasi -> tampil live |
| **11.10 / 14.7** | Pass Terakhir: Unit Test, Performa, Mobile 360px, Aksesibilitas WCAG AA, Verifikasi Browser, dan Dokumentasi `README.md` | `selesai` | Seluruh unit test, build produksi, lint, dan verifikasi browser lulus |
