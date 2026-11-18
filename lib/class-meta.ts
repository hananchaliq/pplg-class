/**
 * SUMBER KEBENARAN TUNGGAL IDENTITAS KELAS & FONT KANVAS
 * XII PPLG 1 · MAKN Ende (2024 — 2027)
 * Sistem 3 Font Monokrom Film & Koran: Old Standard TT + Source Serif 4 + Special Elite
 */

export const CLASS_META = {
  className: "XII PPLG 1",
  shortCode: "UNO · XII PPLG 1",
  majorFull: "Pengembangan Perangkat Lunak dan Gim",
  schoolName: "Madrasah Aliyah Kejuruan Negeri Ende",
  shortSchool: "MAKN Ende",
  city: "Ende, Flores, Nusa Tenggara Timur",
  yearPlaceholder: "2024 — 2027",
  cohortLabel: "Angkatan 2024 — 2027",
  archiveCode: "ARSIP-XII-PPLG-1",
  homeroomDefault: "Ibu Hajra, S.Pd.",
  farewellQuote: "UNO Born to Win, selamat menjalani hidup baru",
  newspaperMasthead: "Galeri Kenangan Bersama",
  colophon:
    "XII PPLG 1 · Madrasah Aliyah Kejuruan Negeri Ende · Angkatan 2024 — 2027",
  loaderLines: [
    "KELAS XII PPLG 1",
    "MAKN ENDE",
    "ANGKATAN 2024 — 2027",
  ] as const,
  loaderMicrocopy: [
    "Memasang gulungan film 35mm…",
    "Menyesuaikan fokus ruang gelap…",
    "Mencetak edisi arsip kelas…",
    "Membuka galeri kenangan…",
  ] as const,
} as const;

export function deterministicTilt(
  seedInput: string | number,
  maxDeg = 1.4
): number {
  const str = String(seedInput || "uno-album");
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = ((hash >>> 0) % 1000) / 1000;
  const deg = (normalized * 2 - 1) * maxDeg;
  return Number(deg.toFixed(2));
}

export function deterministicWashiTone(
  seedInput: string | number
): "sage" | "rose" | "gold" {
  const str = String(seedInput || "uno");
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum = (sum + str.charCodeAt(i) * (i + 1)) % 997;
  }
  const tones = ["sage", "rose", "gold"] as const;
  return tones[sum % tones.length]!;
}

export function formatArchiveNumber(
  indexOneBased: number,
  total?: number
): string {
  const num = String(Math.max(1, indexOneBased)).padStart(3, "0");
  if (typeof total === "number" && total > 0) {
    const tot = String(total).padStart(3, "0");
    return `NO. ${num} / ${tot}`;
  }
  return `NO. ${num}`;
}

export function formatAlbumPage(
  page: number,
  style: "dash" | "label" | boolean = "dash"
): string {
  const p = String(Math.max(1, page)).padStart(2, "0");
  return style === "label" || style === true ? `Hal. ${p}` : `${p}`;
}

function resolveCssFontVar(varName: string, fallbackFamily: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallbackFamily;
  }
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return val.length > 0 ? `${val}, ${fallbackFamily}` : fallbackFamily;
}

export function getAlbumDisplayFont(): string {
  return resolveCssFontVar(
    "--font-serif",
    `"Old Standard TT", Georgia, serif`
  );
}

export function getAlbumBodyFont(): string {
  return resolveCssFontVar(
    "--font-sans",
    `"Source Serif 4", Georgia, serif`
  );
}

export function getAlbumArsipFont(): string {
  return resolveCssFontVar(
    "--font-mono",
    `"Special Elite", "Courier New", monospace`
  );
}

export function getAlbumTulisFont(): string {
  return resolveCssFontVar(
    "--font-serif",
    `"Old Standard TT", Georgia, serif`
  );
}

let fontsLoadPromise: Promise<void> | null = null;

/**
 * Memastikan 3 font cetak koran & film (Old Standard TT + Source Serif 4 + Special Elite)
 * selesai dimuat sebelum teks digambar ke kanvas 2D/3D.
 */
export async function ensureAlbumFontsLoaded(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  if (!fontsLoadPromise) {
    fontsLoadPromise = (async () => {
      try {
        const displayFam = getAlbumDisplayFont();
        const bodyFam = getAlbumBodyFont();
        const arsipFam = getAlbumArsipFont();

        await Promise.allSettled([
          document.fonts.load(`700 32px ${displayFam}`),
          document.fonts.load(`400 24px ${displayFam}`),
          document.fonts.load(`italic 400 24px ${displayFam}`),
          document.fonts.load(`500 24px ${bodyFam}`),
          document.fonts.load(`700 24px ${bodyFam}`),
          document.fonts.load(`400 20px ${arsipFam}`),
        ]);
        await document.fonts.ready;
      } catch {
        // Fallback aman jika browser membatasi Font Loading API
      }
    })();
  }
  return fontsLoadPromise;
}
