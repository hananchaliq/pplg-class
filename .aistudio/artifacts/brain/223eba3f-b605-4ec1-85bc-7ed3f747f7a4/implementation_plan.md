# Rencana Implementasi: Perbaikan Alur Vercel Blob (`uploadMediaToBlob` & ACC) + Optimasi Loading Screen (2.5s) & Performa 3D

Rencana ini mengeksekusi seluruh perbaikan dan optimasi pada `hananchaliq/pplg-class` sesuai urutan prioritas yang diminta.

---

## Prioritas 1: Perbaikan Alur Upload, Submit Publik & ACC ke Vercel Blob

### 1. Perbaikan `app/api/submit/route.ts` & `lib/db.ts`
- Saat `payload.type === "moment"` atau `payload.type === "work"` dan `payload.imageDataUrl` berformat `data:image/...`:
  - **Tidak menyimpan string base64 mentah ke `lib/db.ts`**.
  - Di `app/api/submit/route.ts`, parse `payload.imageDataUrl` menggunakan `parseImageDataUrl` dari `@/lib/media-store`, lalu langsung unggah ke Vercel Blob menggunakan `uploadMediaToBlob` dengan parameter:
    - `status: "pending"`
    - `featured: false`
    - `channel`: disesuaikan dengan tipe & kategori (`"hero3d"` untuk Foto Hero 3D, `"yearbook"` untuk Buku Kenangan / ID Card, `"karya"` untuk karya proyek siswa, atau `"gallery"` untuk momen kelas).
  - Ganti `payload.imageDataUrl` dengan `uploaded.item.url` (URL publik `*.public.blob.vercel-storage.com`) sebelum diteruskan ke `createPendingSubmission(payload)` dan dikembalikan ke client.

### 2. Sinkronisasi `app/api/submissions/[id]/approve/route.ts` & `app/api/submissions/route.ts`
- **Saat Admin Klik ACC / Approve**:
  - Mengubah status item `"pending"` di `manifest.json` (maupun di `pending-manifest.json` bila berasal dari endpoint `/api/submissions`) menjadi `"approved"`, memastikan `featured: true`, dan menyimpan ulang `manifest.json` ke Vercel Blob (`put('manifest.json', ..., { access: 'public', allowOverwrite: true })`).
  - Memanggil `revalidateTag("media-manifest")` dan `revalidatePath("/")` beserta seluruh route terkait (`/galeri`, `/kenangan`, `/karya`, `/anggota`, `/guru`, `/dream-board`).
- **Saat Admin Klik Tolak / Hapus**:
  - Memanggil `deleteMediaFromBlob({ id })` yang menghapus file fisik gambar di Vercel Blob melalui `del(url)` dan membersihkan item dari `manifest.json` / `pending-manifest.json`.

### 3. Verifikasi Ketat `lib/media-store.ts`
- Memastikan seluruh pemanggilan `put()` dan `list()` secara eksplisit memakai `{ access: "public", token: process.env.BLOB_READ_WRITE_TOKEN }`.
- Di `uploadMediaToBlob`, ketika `status: "pending"` maupun `status: "approved"`, item disimpan langsung ke `manifest.json` (dan disinkronkan dengan `pending-manifest.json` untuk antrean moderasi).
- Jika `BLOB_READ_WRITE_TOKEN` tersedia di environment namun operasi `put()` / `list()` ke Vercel Blob gagal, wajib melempar error asli secara jelas ke pemanggil (tanpa *silent fallback* ke memori/lokal).

---

## Prioritas 2: Optimasi Loading Screen (2.5 Detik, Visual Tetap Sama) & Performa 3D

### 4. Percepat Halaman Loading TANPA Mengubah Tampilan Visualnya
- **Visual Tetap 100% Sama**: Tidak mengubah desain, layout, warna, maupun animasi titik-titik pada `app/loading.tsx`, `components/layout/vanishing-page-transition.tsx`, `components/three/stage-curtain-loader.tsx`, dan `lib/loading-context.tsx`.
- **Optimasi Logika Dismiss / Exit**:
  - Pangkas *artificial delay* di `lib/loading-context.tsx` (`MIN_HOLD_MS` dipercepat menjadi `180ms` untuk kunjungan pertama dan `100ms` untuk sesi berikutnya) serta di `components/layout/vanishing-page-transition.tsx` (hapus jeda tunggu tambahan setelah DOM siap).
  - Pangkas batas tunggu dekode gambar *above-the-fold* (`decodeVisibleImages`) menjadi maksimal `900ms` dan tunggu font maksimal `600ms`.
  - **Safety Timeout Otomatis 2.5 Detik (`2500ms`)**: Baik pada `SAFE_TIMEOUT_MS` di `lib/loading-context.tsx` maupun pada `VanishingPageTransition` (initial load dan route transition), jika dalam **2.5 detik** masih ada 1 aset lambat atau jaringan lemot, otomatis picu `fadeOutSlowly()` agar tirai loading langsung memudar mulus dan pengguna tidak pernah terjebak di layar loading.

### 5. Optimasi Web & 3D Model (`polaroid-camera-3d.tsx`, `buku-scene-hd.tsx`, `scene-shell.tsx`, `procedural-textures.ts`, `anggota-client.tsx`, `kenangan-client.tsx`)
- **Adaptive DPR (`[1, 1.75]` Desktop & `[1, 1.25]` Mobile)**:
  - Tambahkan helper `getAdaptiveDevicePixelRatio()` di `lib/visual-tier.tsx` yang mengembalikan `Math.min(window.devicePixelRatio || 1, isMobileOrCoarse ? 1.25 : 1.75)` (dan `1` pada software WebGL).
  - Terapkan adaptive DPR ini di `components/three/scene-shell.tsx` dan `components/beranda/polaroid-camera-3d.tsx`.
- **Pause Loop Animasi Saat di Luar Viewport / Tab Tidak Aktif**:
  - Di `components/beranda/polaroid-camera-3d.tsx` dan `components/three/scene-shell.tsx`, hentikan eksekusi `requestAnimationFrame` sepenuhnya saat `IntersectionObserver` mendeteksi kanvas tidak terlihat di layar (`!isIntersecting`) atau saat `document.hidden === true`, dan otomatis lanjutkan kembali saat elemen masuk ke viewport.
- **Caching & Memoization Tekstur Prosedural + `.dispose()` Bersih**:
  - Tambahkan LRU/Map cache pada `lib/procedural-textures.ts` untuk `CanvasTexture` agar tekstur kartu/kertas tidak dibuat ulang saat komponen re-render, dan pastikan `disposeSceneGraph` membersihkan geometri, material, dan tekstur saat unmount.
- **Lazy-Load `next/dynamic` (`ssr: false`) & `React.Suspense`**:
  - Gunakan `next/dynamic` (`ssr: false`) untuk komponen panggung 3D berat di `components/kenangan/kenangan-client.tsx` (`BukuKenanganSceneHD`) dan `components/anggota/anggota-client.tsx` (`SingleIronRailLanyard`), serta bungkus bagian *below-the-fold* dengan `React.Suspense` agar *above-the-fold* tampil instan.

---

## Verifikasi Akhir
- Menjalankan `compile_applet` (`npm run build`) dan `lint_applet` (`eslint`) untuk memastikan 0 error TypeScript, 0 broken import, dan seluruh route berjalan optimal.
