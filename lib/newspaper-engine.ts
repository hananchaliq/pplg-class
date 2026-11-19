import { decodeHtmlEntities } from "@/lib/domain-logic";
import { SITE_CONTENT } from "@/lib/content";
import type { MomentPhase, MomentRow } from "@/lib/types";

export const NEWSPAPER_WIDTH = 960;
export const NEWSPAPER_HEIGHT = 1322; // Rasio standar 1 : 1.377 untuk Vanilla LeafThrough

export type NewspaperTemplate =
  | "chronicle-cover"
  | "phase-opener"
  | "chronicle-spotlight"
  | "village-editorial"
  | "urban-feature-solo"
  | "balanced-duo"
  | "phase-chronicle"
  | "toc"
  | "back-cover";

export interface MomentEditorialStory {
  moment: MomentRow;
  headline: string;
  deck: string;
  byline: string;
  body: string;
  frameTag: string;
}

export interface NewspaperPageSpec {
  pageNumber: number;
  index: number;
  template: NewspaperTemplate;
  phase?: MomentPhase;
  rubricTitle: string;
  headline: string;
  subheadline: string;
  stories: MomentEditorialStory[];
  moments: MomentRow[];
  quote: string;
  alt: string;
  text: string;
  tocItems?: Array<{
    phase: MomentPhase;
    title: string;
    subtitle: string;
    startPageIndex: number;
    printedPage: number;
    count: number;
  }>;
}

export interface NewspaperPlan {
  pages: NewspaperPageSpec[];
  phaseStartPages: Record<MomentPhase, number>;
  tocPageIndex: number;
  backCoverIndex: number;
  totalPhotos: number;
}

// ============================================================================
// PALET KORAN JADUL KECREAMAN & SKALA TIPOGRAFI STANDAR TERBACA
// ============================================================================
const PAPER_CREAM = "#EFE5CE";
const PAPER_WARM_ALT = "#E5D7B9";
const PAPER_FOXING = "#D4C29E";
const INK_DARK = "#1E1712";
const INK_BODY = "#2A211A";
const INK_MUTED = "#5A4B3C";
const INK_RULE = "#8A7864";
const BOX_INVERTED_BG = "#2D241C";
const BOX_INVERTED_FG = "#EFE5CE";

const PAD_X = 50;
const CONTENT_W = NEWSPAPER_WIDTH - PAD_X * 2; // 860px

const TYPE = {
  bodySolo: 22,
  lineSolo: 33,
  bodyDuo: 20.5,
  lineDuo: 31,
  bodyCompact: 19.5,
  lineCompact: 29,
  byline: 15,
  kicker: 15,
  quote: 22.5,
  quoteLine: 33,
} as const;

const PHASE_META: Record<
  MomentPhase,
  {
    editionTitle: string;
    rubric: string;
    headline: string;
    sub: string;
    phasePhrase: string;
    quotes: string[];
  }
> = {
  X: {
    editionTitle: "BAB I · EDISI KELAS X",
    rubric: "RUBRIK KELAS X · FASE AWAL",
    headline: "JEJAK PERTAMA DI BANGKU MADRASAH",
    sub: "Orientasi, baris kode perdana, dan perkenalan keluarga besar di MAKN Ende.",
    phasePhrase: "awal perjalanan kami di Kelas X PPLG 1",
    quotes: [
      "Di ruang lab lantai dua, satu titik koma pertama menyatukan tawa sekelas.",
      "Langkah canggung berseragam baru yang pelan-pelan menjadi rumah kedua.",
    ],
  },
  XI: {
    editionTitle: "BAB II · EDISI KELAS XI",
    rubric: "RUBRIK KELAS XI · REKAYASA & PKL",
    headline: "MUSIM PROYEK, LOMBA & KERJA LAPANGAN",
    sub: "Menembus praktik industri, kompetisi teknologi, dan lembur merakit karya.",
    phasePhrase: "masa padat praktik industri dan proyek Kelas XI",
    quotes: [
      "\"Tunggu sebentar, di laptopku tadi jalan kok!\" — kalimat paling sakti sebelum presentasi.",
      "Berpencar saat PKL mengajarkan kami arti rindu pulang ke kelas PPLG 1.",
    ],
  },
  XII: {
    editionTitle: "BAB III · EDISI KELAS XII",
    rubric: "RUBRIK KELAS XII · SENJA KELULUSAN",
    headline: "CATATAN AKHIR SEBELUM MELANGKAH JAUH",
    sub: "Ujian akhir, potret bersama, dan kenangan yang disimpan selamanya.",
    phasePhrase: "hari-hari terakhir yang berharga di Kelas XII",
    quotes: [
      "UNO Born to Win — selamat melangkah menuju babak hidup baru.",
      "Kelak jarak boleh memisahkan, namun lembaran koran ini selalu membawa kita pulang.",
    ],
  },
};

const CATEGORY_LEAD_ANGLE: Record<string, string> = {
  PKL: "Liputan Praktik Industri",
  Lomba: "Warta Prestasi & Kompetisi",
  "Study tour": "Catatan Perjalanan Angkatan",
  "Acara madrasah": "Berita Kegiatan Madrasah",
  "Momen lucu": "Kolom Tawa & Spontanitas",
  "Hari terakhir": "Edisi Senja & Perpisahan",
};

// Mayoritas 1 foto utama per halaman (~75%) + sesekali 2 foto seimbang (~25%)
const INTERIOR_TEMPLATES: Exclude<
  NewspaperTemplate,
  "chronicle-cover" | "phase-opener" | "phase-chronicle" | "toc" | "back-cover"
>[] = [
  "chronicle-spotlight",
  "village-editorial",
  "urban-feature-solo",
  "balanced-duo",
];

function templateCapacity(tpl: NewspaperTemplate): number {
  return tpl === "balanced-duo" ? 2 : 1;
}

function cleanMoment(m: MomentRow): MomentRow {
  return {
    ...m,
    caption: decodeHtmlEntities(m.caption || "Momen kebersamaan XII PPLG 1"),
    uploader_name: decodeHtmlEntities(m.uploader_name || "Warga XII PPLG 1"),
    category: decodeHtmlEntities(m.category || "Kenangan"),
    taken_at: decodeHtmlEntities(m.taken_at || "2024–2027"),
  };
}

function isRealMomentPhoto(url?: string): boolean {
  const clean = (url || "").trim();
  return clean.length > 0 && !clean.startsWith("/api/moment-illustration");
}

function buildHeadlineFromCaption(caption: string): string {
  const clean = caption.replace(/["“”]/g, "").trim();
  if (!clean) return "CATATAN KENANGAN KELUARGA UNO";
  const words = clean.split(/\s+/);
  return words.slice(0, Math.min(7, words.length)).join(" ").toUpperCase();
}

/**
 * Narasi ringkas editorial (caption asli + 2 kalimat padat & natural)
 * agar tulisan deskripsi tampil besar, lega, dan nyaman dibaca tanpa penuh basa-basi.
 */
function buildEditorialStory(
  moment: MomentRow,
  seqNumber: number
): MomentEditorialStory {
  const phaseInfo = PHASE_META[moment.phase] ?? PHASE_META.XII;
  const angle =
    CATEGORY_LEAD_ANGLE[moment.category] ?? `Arsip ${moment.category}`;
  const headline = buildHeadlineFromCaption(moment.caption);
  const deck = `${angle} · Kelas ${moment.phase} (${moment.taken_at})`;
  const byline = `Oleh ${moment.uploader_name} · ${moment.taken_at}`;
  const frameNo = String(seqNumber).padStart(2, "0");

  const captionClean = moment.caption.replace(/[.!?]+$/, "").trim();
  const body = `“${captionClean}.” Potret arsip #${frameNo} ini diabadikan oleh ${moment.uploader_name} pada ${moment.taken_at} sebagai bagian dari ${phaseInfo.phasePhrase}. Momen dalam rubrik ${moment.category} ini disimpan agar tawa dan kebersamaan XII PPLG 1 MAKN Ende selalu hangat dikenang.`;

  return {
    moment,
    headline,
    deck,
    byline,
    body,
    frameTag: `NO. ${frameNo} · KLS ${moment.phase}`,
  };
}

/**
 * Susun rencana halaman koran terbagi rapi per fase (Kelas X, XI, XII)
 * dengan proporsi mayoritas 1 foto per halaman & sesekali 2 foto seimbang.
 */
export function buildNewspaperPlan(
  rawMoments: MomentRow[],
  activeCategory: string
): NewspaperPlan {
  const cleaned = rawMoments.map(cleanMoment);
  const sortRealFirst = (list: MomentRow[]) =>
    [...list].sort(
      (a, b) =>
        (isRealMomentPhoto(b.image_url) ? 1 : 0) -
          (isRealMomentPhoto(a.image_url) ? 1 : 0) ||
        (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
    );

  const byPhase: Record<MomentPhase, MomentRow[]> = {
    X: sortRealFirst(cleaned.filter((m) => m.phase === "X")),
    XI: sortRealFirst(cleaned.filter((m) => m.phase === "XI")),
    XII: sortRealFirst(cleaned.filter((m) => m.phase === "XII")),
  };

  const allSorted = sortRealFirst(cleaned);
  const coverHero = allSorted.find((m) => m.featured) ?? allSorted[0];
  const coverSide = allSorted[1] ?? coverHero;
  const coverMoments = [coverHero, coverSide].filter(Boolean) as MomentRow[];

  const pages: NewspaperPageSpec[] = [];

  // Halaman 1: Sampul Depan Seimbang
  pages.push({
    pageNumber: 1,
    index: 0,
    template: "chronicle-cover",
    rubricTitle: "EDISI PERDANA · GALERI KENANGAN BERSAMA",
    headline: "Galeri Kenangan Bersama",
    subheadline:
      activeCategory === "Semua"
        ? "Surat kabar arsip perjalanan tiga tahun angkatan UNO XII PPLG 1 MAKN Ende."
        : `Edisi Pilihan “${activeCategory}” · Arsip Perjalanan XII PPLG 1 MAKN Ende.`,
    stories: coverMoments.map((m, idx) => buildEditorialStory(m, idx + 1)),
    moments: coverMoments,
    quote: "UNO Born to Win, selamat menjalani hidup baru.",
    alt: "Sampul Depan Koran Galeri Kenangan Bersama — XII PPLG 1 MAKN Ende",
    text: `Galeri Kenangan Bersama. Surat kabar arsip XII PPLG 1 MAKN Ende. ${SITE_CONTENT.school.tagline}`,
  });

  const phaseStartPages: Record<MomentPhase, number> = {
    X: 1,
    XI: 1,
    XII: 1,
  };
  const tocItems: NonNullable<NewspaperPageSpec["tocItems"]> = [];
  let globalPhotoSeq = 1;
  let globalTplIdx = 0;

  (["X", "XI", "XII"] as MomentPhase[]).forEach((phase) => {
    const meta = PHASE_META[phase];
    const phaseMoments = byPhase[phase];
    const startIdx = pages.length;
    phaseStartPages[phase] = startIdx;

    tocItems.push({
      phase,
      title: meta.editionTitle,
      subtitle: meta.headline,
      startPageIndex: startIdx,
      printedPage: startIdx + 1,
      count: phaseMoments.length,
    });

    if (phaseMoments.length === 0) {
      pages.push({
        pageNumber: pages.length + 1,
        index: pages.length,
        template: "phase-opener",
        phase,
        rubricTitle: meta.rubric,
        headline: meta.headline,
        subheadline:
          activeCategory === "Semua"
            ? meta.sub
            : `Belum ada foto kategori “${activeCategory}” pada fase Kelas ${phase}.`,
        stories: [],
        moments: [],
        quote: meta.quotes[0]!,
        alt: `${meta.editionTitle}: ${meta.headline}`,
        text: `${meta.rubric}. ${meta.headline}. ${meta.sub}`,
      });
      return;
    }

    // Halaman Pembuka Fase (1 foto utama besar)
    const openerMoment = phaseMoments[0]!;
    const openerStory = buildEditorialStory(openerMoment, globalPhotoSeq++);
    pages.push({
      pageNumber: pages.length + 1,
      index: pages.length,
      template: "phase-opener",
      phase,
      rubricTitle: meta.rubric,
      headline: meta.headline,
      subheadline: meta.sub,
      stories: [openerStory],
      moments: [openerMoment],
      quote: meta.quotes[0]!,
      alt: `Pembuka ${meta.editionTitle}: ${openerStory.headline}`,
      text: `${meta.editionTitle}\n\n${openerStory.headline}\n${openerStory.body}`,
    });

    // Sisa foto: mayoritas 1 foto/halaman, sesekali 2 foto seimbang
    let cursor = 1;
    let phaseSubPage = 1;
    const phaseStoriesAll: MomentEditorialStory[] = [openerStory];

    while (cursor < phaseMoments.length) {
      let tpl = INTERIOR_TEMPLATES[globalTplIdx % INTERIOR_TEMPLATES.length]!;
      const remaining = phaseMoments.length - cursor;
      // Jangan pakai template 2-foto jika tinggal 1 foto saja
      if (tpl === "balanced-duo" && remaining < 2) {
        tpl = "chronicle-spotlight";
      }

      const cap = templateCapacity(tpl);
      const slice = phaseMoments.slice(cursor, cursor + cap);
      cursor += slice.length;
      globalTplIdx += 1;
      phaseSubPage += 1;

      const stories = slice.map((m) =>
        buildEditorialStory(m, globalPhotoSeq++)
      );
      phaseStoriesAll.push(...stories);
      const primaryStory = stories[0]!;
      const q = meta.quotes[phaseSubPage % meta.quotes.length]!;

      pages.push({
        pageNumber: pages.length + 1,
        index: pages.length,
        template: tpl,
        phase,
        rubricTitle: `${meta.rubric} · LEMBAR ${String(phaseSubPage).padStart(2, "0")}`,
        headline: primaryStory.headline,
        subheadline: primaryStory.deck,
        stories,
        moments: slice,
        quote: q,
        alt: `${meta.editionTitle} halaman ${pages.length + 1}: ${stories.map((s) => s.headline).join(", ")}`,
        text: stories
          .map((s) => `${s.headline}\n${s.byline}\n${s.body}`)
          .join("\n\n"),
      });
    }

    if (phaseStoriesAll.length >= 2) {
      pages.push({
        pageNumber: pages.length + 1,
        index: pages.length,
        template: "phase-chronicle",
        phase,
        rubricTitle: `${meta.rubric} · KRONIK FASE`,
        headline: `KRONIK PERJALANAN KELAS ${phase}`,
        subheadline: `Daftar ringkas ${phaseStoriesAll.length} momen arsip beserta pengunggah dan tanggal peristiwa.`,
        stories: phaseStoriesAll,
        moments: [],
        quote: meta.quotes[1] ?? meta.quotes[0]!,
        alt: `Kronik Perjalanan Kelas ${phase} (${phaseStoriesAll.length} momen tercatat)`,
        text: phaseStoriesAll
          .map((s) => `${s.frameTag} — ${s.moment.caption} (${s.byline})`)
          .join("\n"),
      });
    }
  });

  pages[0]!.tocItems = tocItems;

  // Halaman Indeks
  const tocPageIndex = pages.length;
  pages.push({
    pageNumber: pages.length + 1,
    index: tocPageIndex,
    template: "toc",
    rubricTitle: "INDEKS & DAFTAR RUBRIK EDISI",
    headline: "Peta Lembaran Arsip UNO",
    subheadline: `Seluruh ${cleaned.length} foto tersusun dalam ${pages.length + 2} lembar koran per fase angkatan.`,
    stories: [],
    moments: [],
    tocItems,
    quote: SITE_CONTENT.school.subTagline,
    alt: "Halaman Indeks Rubrik Koran Galeri Kenangan Bersama",
    text: tocItems
      .map(
        (it) =>
          `Halaman ${it.printedPage}: ${it.title} (${it.count} foto) — ${it.subtitle}`
      )
      .join("\n"),
  });

  // Halaman Penutup
  const backCoverIndex = pages.length;
  pages.push({
    pageNumber: pages.length + 1,
    index: backCoverIndex,
    template: "back-cover",
    rubricTitle: "KOLOFON REDAKSI · AKHIR EDISI",
    headline: "TAMAT EDISI INI",
    subheadline:
      "Diterbitkan oleh arsip keluarga besar XII PPLG 1 — MAKN Ende.",
    stories: [],
    moments: [],
    quote: "UNO Born to Win, selamat menjalani hidup baru",
    alt: "Halaman Penutup Koran: TAMAT EDISI INI — UNO Born to Win",
    text: "TAMAT EDISI INI. UNO Born to Win, selamat menjalani hidup baru. XII PPLG 1 MAKN Ende 2024–2027.",
  });

  return {
    pages,
    phaseStartPages,
    tocPageIndex,
    backCoverIndex,
    totalPhotos: cleaned.length,
  };
}

export function createSkeletonNewspaperUrl(spec: NewspaperPageSpec): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const title = esc(spec.headline.slice(0, 40));
  const rubric = esc(spec.rubricTitle.slice(0, 44));
  const num = String(spec.pageNumber).padStart(2, "0");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NEWSPAPER_WIDTH} ${NEWSPAPER_HEIGHT}">
    <rect width="${NEWSPAPER_WIDTH}" height="${NEWSPAPER_HEIGHT}" fill="${PAPER_CREAM}"/>
    <rect x="28" y="28" width="${NEWSPAPER_WIDTH - 56}" height="${NEWSPAPER_HEIGHT - 56}" fill="none" stroke="${PAPER_FOXING}" stroke-width="2"/>
    <line x1="50" y1="92" x2="${NEWSPAPER_WIDTH - 50}" y2="92" stroke="${INK_DARK}" stroke-width="2.2"/>
    <text x="50" y="72" font-family="Courier New, monospace" font-size="16" fill="${INK_MUTED}">${rubric}</text>
    <text x="${NEWSPAPER_WIDTH - 50}" y="72" text-anchor="end" font-family="Courier New, monospace" font-size="16" fill="${INK_DARK}">HAL. ${num}</text>
    <text x="${NEWSPAPER_WIDTH / 2}" y="190" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="36" fill="${INK_DARK}">${title}</text>
    <rect x="66" y="246" width="${NEWSPAPER_WIDTH - 132}" height="460" fill="${PAPER_WARM_ALT}" stroke="${INK_RULE}" stroke-width="1.5"/>
    <text x="${NEWSPAPER_WIDTH / 2}" y="482" text-anchor="middle" font-family="Courier New, monospace" font-size="20" fill="${INK_MUTED}">MENCETAK LEMBAR HALAMAN ${num}...</text>
    <rect x="66" y="756" width="${NEWSPAPER_WIDTH - 132}" height="16" fill="${PAPER_FOXING}"/>
    <rect x="66" y="792" width="${NEWSPAPER_WIDTH - 210}" height="16" fill="${PAPER_FOXING}"/>
    <rect x="66" y="828" width="${NEWSPAPER_WIDTH - 170}" height="16" fill="${PAPER_FOXING}"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ============================================================================
// OPTIMASI PERFORMA: CACHE KERTAS DASAR TUNGGAL & KANVAS REUSABLE
// ============================================================================

export type LoadedImageResult =
  | { status: "ok"; image: HTMLImageElement }
  | { status: "cors-blocked" | "error" };

let cachedParchmentScale = 0;
let cachedParchmentCanvas: HTMLCanvasElement | null = null;
let scratchCanvas: HTMLCanvasElement | null = null;
let fontsReadyPromise: Promise<void> | null = null;

function getAdaptiveRasterScale(): number {
  if (typeof window === "undefined") return 1.5;
  const dpr = window.devicePixelRatio || 1;
  const isSmall = window.innerWidth < 768;
  if (isSmall) return 1.5;
  return dpr >= 1.5 ? 2 : 1.75;
}

function getCachedParchmentCanvas(scale: number): HTMLCanvasElement {
  if (cachedParchmentCanvas && cachedParchmentScale === scale) {
    return cachedParchmentCanvas;
  }

  const c = document.createElement("canvas");
  c.width = Math.round(NEWSPAPER_WIDTH * scale);
  c.height = Math.round(NEWSPAPER_HEIGHT * scale);
  const ctx = c.getContext("2d")!;
  ctx.scale(scale, scale);

  // Dasar kertas koran kecreaman hangat
  ctx.fillStyle = PAPER_CREAM;
  ctx.fillRect(0, 0, NEWSPAPER_WIDTH, NEWSPAPER_HEIGHT);

  // Gradien penuaan halus di pinggir kertas
  const grad = ctx.createRadialGradient(
    NEWSPAPER_WIDTH * 0.5,
    NEWSPAPER_HEIGHT * 0.48,
    220,
    NEWSPAPER_WIDTH * 0.5,
    NEWSPAPER_HEIGHT * 0.5,
    NEWSPAPER_WIDTH * 0.88
  );
  grad.addColorStop(0, "rgba(247, 240, 224, 0.32)");
  grad.addColorStop(0.76, "rgba(232, 219, 192, 0.14)");
  grad.addColorStop(1, "rgba(186, 165, 130, 0.34)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, NEWSPAPER_WIDTH, NEWSPAPER_HEIGHT);

  // Serat kertas deterministik ringan (digambar SEKALI lalu di-cache untuk seluruh edisi)
  for (let i = 0; i < 420; i++) {
    const x = (i * 227 + 41) % NEWSPAPER_WIDTH;
    const y = (i * 331 + 73) % NEWSPAPER_HEIGHT;
    ctx.fillStyle =
      i % 5 === 0 ? "rgba(107, 91, 75, 0.075)" : "rgba(38, 31, 24, 0.032)";
    ctx.fillRect(x, y, (i % 3) + 1, 1);
  }

  // Bingkai ganda klasik
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(24, 24, NEWSPAPER_WIDTH - 48, NEWSPAPER_HEIGHT - 48);
  ctx.strokeStyle = PAPER_FOXING;
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, NEWSPAPER_WIDTH - 60, NEWSPAPER_HEIGHT - 60);

  cachedParchmentCanvas = c;
  cachedParchmentScale = scale;
  return c;
}

function getScratchCanvas(scale: number): HTMLCanvasElement {
  const tw = Math.round(NEWSPAPER_WIDTH * scale);
  const th = Math.round(NEWSPAPER_HEIGHT * scale);
  if (!scratchCanvas) {
    scratchCanvas = document.createElement("canvas");
  }
  if (scratchCanvas.width !== tw || scratchCanvas.height !== th) {
    scratchCanvas.width = tw;
    scratchCanvas.height = th;
  }
  return scratchCanvas;
}

export function loadCorsSafeImage(
  url: string,
  cache: Map<string, LoadedImageResult>
): Promise<LoadedImageResult> {
  const cleanUrl = (url || "").trim();
  if (!cleanUrl) return Promise.resolve({ status: "error" });

  const cached = cache.get(cleanUrl);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    const isSameOriginOrData =
      cleanUrl.startsWith("data:") ||
      cleanUrl.startsWith("blob:") ||
      cleanUrl.startsWith("/");

    if (!isSameOriginOrData) {
      img.crossOrigin = "anonymous";
    }

    let settled = false;
    const finish = (res: LoadedImageResult) => {
      if (settled) return;
      settled = true;
      cache.set(cleanUrl, res);
      resolve(res);
    };

    const timeout = window.setTimeout(() => {
      finish({ status: "error" });
    }, 8500);

    img.onload = () => {
      window.clearTimeout(timeout);
      finish({ status: "ok", image: img });
    };

    img.onerror = () => {
      window.clearTimeout(timeout);
      finish({ status: isSameOriginOrData ? "error" : "cors-blocked" });
    };

    img.src = cleanUrl;
  });
}

// ============================================================================
// PEMBANTU TIPOGRAFI & BINGKAI FOTO EDITORIAL
// ============================================================================

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = decodeHtmlEntities(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0] ?? "";

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i]!;
      if (lines.length >= maxLines) break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const last = lines[maxLines - 1] ?? "";
    if (words.join(" ").length > lines.join(" ").length && last.length > 4) {
      lines[maxLines - 1] = `${last.slice(0, -3).trimEnd()}…`;
    }
  }
  return lines;
}

function drawRunningHeaderAndFooter(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec
) {
  const rightX = NEWSPAPER_WIDTH - PAD_X;

  ctx.fillStyle = INK_MUTED;
  ctx.font = '15px "Special Elite", "Courier New", monospace';
  ctx.textAlign = "left";
  ctx.fillText("GALERI KENANGAN BERSAMA · XII PPLG 1", PAD_X, 62);

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 16px "Old Standard TT", Georgia, serif';
  ctx.fillText("MAKN ENDE · EDISI ARSIP", NEWSPAPER_WIDTH / 2, 62);

  ctx.textAlign = "right";
  ctx.font = '15px "Special Elite", "Courier New", monospace';
  ctx.fillText(`HAL. ${String(spec.pageNumber).padStart(2, "0")}`, rightX, 62);

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(PAD_X, 74);
  ctx.lineTo(rightX, 74);
  ctx.stroke();

  ctx.strokeStyle = INK_MUTED;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_X, 80);
  ctx.lineTo(rightX, 80);
  ctx.stroke();

  const footY = NEWSPAPER_HEIGHT - 44;
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(PAD_X, footY - 22);
  ctx.lineTo(rightX, footY - 22);
  ctx.stroke();

  ctx.fillStyle = INK_MUTED;
  ctx.font = '13.5px "Special Elite", "Courier New", monospace';
  ctx.textAlign = "left";
  ctx.fillText(spec.rubricTitle, PAD_X, footY);

  ctx.textAlign = "right";
  ctx.fillText("ARSIP KORAN UNO · 2024–2027", rightX, footY);
}

function drawVintagePhotoFrame(
  ctx: CanvasRenderingContext2D,
  moment: MomentRow | undefined,
  imgResult: LoadedImageResult | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  frameLabel: string,
  shape: "rect" | "circle" = "rect"
) {
  const seedStr = `${moment?.id || ""}|${frameLabel}|${Math.round(x)}|${Math.round(y)}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) | 0;
  }
  const tiltSign = hash % 2 === 0 ? 1 : -1;
  const tiltDeg = 0.8 + (Math.abs(hash) % 8) * 0.1;
  const tiltRad = shape === "circle" ? 0 : (tiltSign * tiltDeg * Math.PI) / 180;

  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  if (tiltRad !== 0) ctx.rotate(tiltRad);
  const lx = -w / 2;
  const ly = -h / 2;

  if (shape === "rect") {
    ctx.fillStyle = "rgba(38, 31, 24, 0.14)";
    ctx.fillRect(lx + 4, ly + 5, w, h);
  }

  ctx.save();
  if (shape === "circle") {
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fill();
    ctx.clip();
  } else {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(lx, ly, w, h);
    ctx.beginPath();
    ctx.rect(lx + 2, ly + 2, w - 4, h - 4);
    ctx.clip();
  }

  if (imgResult && imgResult.status === "ok") {
    const img = imgResult.image;
    const iw = img.naturalWidth || w;
    const ih = img.naturalHeight || h;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = lx + (w - dw) / 2;
    const dy = ly + (h - dh) / 2;

    ctx.filter = "saturate(76%) contrast(106%) brightness(95%) sepia(11%)";
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = "none";

    const vig = ctx.createRadialGradient(
      0,
      0,
      Math.min(w, h) * 0.34,
      0,
      0,
      Math.max(w, h) * 0.72
    );
    vig.addColorStop(0, "rgba(30, 23, 18, 0)");
    vig.addColorStop(1, "rgba(30, 23, 18, 0.13)");
    ctx.fillStyle = vig;
    ctx.fillRect(lx, ly, w, h);
  } else {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(lx, ly, w, h);
    ctx.fillStyle = INK_MUTED;
    ctx.textAlign = "center";
    ctx.font = '15px "Special Elite", "Courier New", monospace';
    ctx.fillText(
      imgResult?.status === "cors-blocked"
        ? "ARSIP EKSTERNAL · BUKA GRID"
        : "REKAMAN FOTO VINTAGE",
      0,
      4
    );
    ctx.textAlign = "left";
  }
  ctx.restore();

  if (shape === "circle") {
    const r = Math.min(w, h) / 2;
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = PAPER_CREAM;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 2;
    ctx.strokeRect(lx, ly, w, h);
    ctx.strokeStyle = INK_MUTED;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(lx + 3, ly + 3, w - 6, h - 6);

    if (frameLabel) {
      ctx.font = '13px "Special Elite", "Courier New", monospace';
      const badgeW = Math.min(w - 16, ctx.measureText(frameLabel).width + 24);
      ctx.fillStyle = "rgba(38, 31, 24, 0.88)";
      ctx.fillRect(lx + 9, ly + 9, Math.max(108, badgeW), 26);
      ctx.fillStyle = PAPER_CREAM;
      ctx.textAlign = "left";
      ctx.fillText(frameLabel, lx + 16, ly + 27);
    }
  }

  ctx.restore();
}

/**
 * Paragraf deskripsi dengan Drop Cap proporsional & ukuran baca editorial standar (20px–22px).
 */
function drawDropCapParagraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  opts?: {
    fontSize?: number;
    lineHeight?: number;
    maxLines?: number;
    color?: string;
  }
): number {
  const clean = decodeHtmlEntities(text).trim();
  if (!clean) return y;

  const fontSize = opts?.fontSize ?? TYPE.bodySolo;
  const lineHeight = opts?.lineHeight ?? TYPE.lineSolo;
  const maxLines = opts?.maxLines ?? 8;
  const color = opts?.color ?? INK_BODY;

  // Jika diawali tanda kutip pembuka, ambil huruf pertama sebagai Drop Cap agar rapi
  const stripped = clean.replace(/^[“"]+/, "");
  const firstChar = (stripped[0] ?? clean[0]!).toUpperCase();
  const restText = stripped.slice(1);

  const dropSize = Math.round(fontSize * 2.55); // ~56px untuk body 22px
  ctx.fillStyle = INK_DARK;
  ctx.fillRect(x, y - 4, dropSize, dropSize);
  ctx.fillStyle = PAPER_CREAM;
  ctx.textAlign = "center";
  ctx.font = `bold ${Math.round(dropSize * 0.72)}px "Old Standard TT", Georgia, serif`;
  ctx.fillText(firstChar, x + dropSize / 2, y + Math.round(dropSize * 0.68));

  ctx.textAlign = "left";
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px "Source Serif 4", Georgia, serif`;

  const sideIndent = dropSize + 14;
  const words = restText.split(/\s+/).filter(Boolean);
  let idx = 0;
  const sideLines: string[] = [];

  for (let row = 0; row < 2 && idx < words.length; row++) {
    let line = words[idx++]!;
    while (
      idx < words.length &&
      ctx.measureText(`${line} ${words[idx]}`).width <= w - sideIndent
    ) {
      line += ` ${words[idx++]}`;
    }
    sideLines.push(line);
  }

  const firstBaseline = y + Math.round(fontSize * 0.85);
  sideLines.forEach((ln, r) => {
    ctx.fillText(ln, x + sideIndent, firstBaseline + r * lineHeight);
  });

  const remainingText = words.slice(idx).join(" ");
  const bodyLines = remainingText
    ? wrapTextLines(ctx, remainingText, w, Math.max(1, maxLines - 2))
    : [];

  bodyLines.forEach((ln, r) => {
    ctx.fillText(ln, x, firstBaseline + (r + 2) * lineHeight);
  });

  const totalRendered = sideLines.length + bodyLines.length;
  return y + 12 + Math.max(2, totalRendered) * lineHeight;
}

function drawEditorialArticle(
  ctx: CanvasRenderingContext2D,
  story: MomentEditorialStory,
  x: number,
  y: number,
  w: number,
  opts?: {
    headlineSize?: number;
    maxHeadlineLines?: number;
    bodySize?: number;
    lineHeight?: number;
    maxBodyLines?: number;
    withDropCap?: boolean;
  }
): number {
  const headlineSize = opts?.headlineSize ?? 28;
  const maxHeadlineLines = opts?.maxHeadlineLines ?? 2;
  const bodySize = opts?.bodySize ?? TYPE.bodySolo;
  const lineHeight = opts?.lineHeight ?? TYPE.lineSolo;
  const maxBodyLines = opts?.maxBodyLines ?? 8;
  const withDropCap = opts?.withDropCap ?? true;

  let curY = y;
  ctx.textAlign = "left";
  ctx.fillStyle = INK_DARK;
  ctx.font = `bold ${headlineSize}px "Old Standard TT", Georgia, serif`;
  const hLines = wrapTextLines(ctx, story.headline, w, maxHeadlineLines);
  hLines.forEach((ln, i) => {
    ctx.fillText(ln, x, curY + headlineSize + i * (headlineSize + 6));
  });
  curY += hLines.length * (headlineSize + 6) + 12;

  ctx.fillStyle = INK_MUTED;
  ctx.font = `${TYPE.byline}px "Special Elite", "Courier New", monospace`;
  const byLines = wrapTextLines(ctx, story.byline.toUpperCase(), w, 1);
  if (byLines[0]) {
    ctx.fillText(byLines[0], x, curY + 12);
    curY += 24;
  }

  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x, curY);
  ctx.lineTo(x + Math.min(w, 128), curY);
  ctx.stroke();
  curY += 20;

  if (withDropCap) {
    return drawDropCapParagraph(ctx, story.body, x, curY, w, {
      fontSize: bodySize,
      lineHeight,
      maxLines: maxBodyLines,
    });
  }

  ctx.fillStyle = INK_BODY;
  ctx.font = `${bodySize}px "Source Serif 4", Georgia, serif`;
  const bLines = wrapTextLines(ctx, story.body, w, maxBodyLines);
  bLines.forEach((ln, i) => {
    ctx.fillText(ln, x, curY + bodySize + i * lineHeight);
  });
  return curY + 14 + bLines.length * lineHeight;
}

function drawQuotePanel(
  ctx: CanvasRenderingContext2D,
  label: string,
  quote: string,
  footer: string,
  x: number,
  y: number,
  w: number,
  h: number,
  inverted: boolean
) {
  ctx.fillStyle = inverted ? BOX_INVERTED_BG : PAPER_WARM_ALT;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = inverted ? PAPER_CREAM : INK_DARK;
  ctx.lineWidth = inverted ? 1.3 : 1.8;
  ctx.strokeRect(
    x + (inverted ? 10 : 0),
    y + (inverted ? 10 : 0),
    w - (inverted ? 20 : 0),
    h - (inverted ? 20 : 0)
  );

  const cx = x + w / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = inverted ? BOX_INVERTED_FG : INK_MUTED;
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.fillText(label, cx, y + 46);

  ctx.strokeStyle = inverted ? "rgba(239, 229, 206, 0.4)" : INK_RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 36, y + 64);
  ctx.lineTo(x + w - 36, y + 64);
  ctx.stroke();

  ctx.fillStyle = inverted ? BOX_INVERTED_FG : INK_DARK;
  ctx.font = `italic ${TYPE.quote}px "Old Standard TT", Georgia, serif`;
  const qLines = wrapTextLines(ctx, `“${quote}”`, w - 52, 5);
  const blockH = qLines.length * TYPE.quoteLine;
  const startY = y + Math.max(108, Math.round((h - blockH) / 2) + 22);
  qLines.forEach((ln, i) => {
    ctx.fillText(ln, cx, startY + i * TYPE.quoteLine);
  });

  if (footer) {
    ctx.fillStyle = inverted ? "rgba(239, 229, 206, 0.78)" : INK_MUTED;
    ctx.font = '13.5px "Special Elite", "Courier New", monospace';
    ctx.fillText(footer, cx, y + h - 30);
  }
}

// ============================================================================
// TEMPLATE 1: SAMPUL DEPAN SEIMBANG & MUDAH DIBACA
// ============================================================================
function drawChronicleCover(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const midX = NEWSPAPER_WIDTH / 2;
  const earW = 166;
  const earH = 62;

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.4;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(PAD_X, 44, earW, earH);
  ctx.strokeRect(PAD_X, 44, earW, earH);
  ctx.fillRect(NEWSPAPER_WIDTH - PAD_X - earW, 44, earW, earH);
  ctx.strokeRect(NEWSPAPER_WIDTH - PAD_X - earW, 44, earW, earH);

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = '12.5px "Special Elite", "Courier New", monospace';
  ctx.fillText("EDISI ARSIP NO. 01", PAD_X + earW / 2, 68);
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 15px "Source Serif 4", Georgia, serif';
  ctx.fillText("XII PPLG 1 · MAKN Ende", PAD_X + earW / 2, 92);

  ctx.fillStyle = INK_DARK;
  ctx.font = '12.5px "Special Elite", "Courier New", monospace';
  ctx.fillText("ANGKATAN 2024–2027", NEWSPAPER_WIDTH - PAD_X - earW / 2, 68);
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 15px "Source Serif 4", Georgia, serif';
  ctx.fillText("Harga: Satu Kenangan", NEWSPAPER_WIDTH - PAD_X - earW / 2, 92);

  // Emblem UNO
  ctx.beginPath();
  ctx.arc(midX, 75, 28, 0, Math.PI * 2);
  ctx.fillStyle = INK_DARK;
  ctx.fill();
  ctx.strokeStyle = PAPER_CREAM;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(midX, 75, 23, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PAPER_CREAM;
  ctx.font = 'bold 17px "Old Standard TT", Georgia, serif';
  ctx.fillText("UNO", midX, 81);

  // Masthead Besar
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 50px "Old Standard TT", Georgia, serif';
  ctx.fillText("GALERI KENANGAN BERSAMA", midX, 162);

  ctx.fillStyle = INK_MUTED;
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.fillText(
    "LAPORAN KHUSUS · PENGEMBANGAN PERANGKAT LUNAK DAN GIM · MAKN ENDE",
    midX,
    190
  );

  // Pita Gelap Edisi
  ctx.fillStyle = BOX_INVERTED_BG;
  ctx.fillRect(PAD_X, 206, CONTENT_W, 36);
  ctx.fillStyle = BOX_INVERTED_FG;
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.textAlign = "left";
  ctx.fillText("NO. 01 · KORAN ANGKATAN", PAD_X + 16, 229);
  ctx.textAlign = "center";
  ctx.fillText("EDISI LENGKAP KELAS X · XI · XII", midX, 229);
  ctx.textAlign = "right";
  ctx.fillText("FLORES — NTT", NEWSPAPER_WIDTH - PAD_X - 16, 229);

  // Grid Utama Sampul: 2 Kolom Lebar & Lega (536px + 300px)
  const topY = 262;
  const leftW = 536;
  const gap = 24;
  const rightX = PAD_X + leftW + gap;
  const rightW = CONTENT_W - leftW - gap; // 300px

  const mainStory = spec.stories[0];
  const sideStory = spec.stories[1] ?? mainStory;

  if (mainStory) {
    drawVintagePhotoFrame(
      ctx,
      mainStory.moment,
      images.get(mainStory.moment.image_url),
      PAD_X,
      topY,
      leftW,
      382,
      "TAJUK UTAMA"
    );

    drawEditorialArticle(ctx, mainStory, PAD_X, topY + 402, leftW, {
      headlineSize: 30,
      maxHeadlineLines: 2,
      bodySize: 21,
      lineHeight: 31,
      maxBodyLines: 7,
      withDropCap: true,
    });
  }

  // Kolom Kanan: Kotak Catatan UNO (teks 19.5px mudah dibaca) + Potret Lingkaran
  ctx.fillStyle = BOX_INVERTED_BG;
  ctx.fillRect(rightX, topY, rightW, 382);
  ctx.strokeStyle = PAPER_CREAM;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(rightX + 10, topY + 10, rightW - 20, 362);

  ctx.textAlign = "center";
  ctx.fillStyle = BOX_INVERTED_FG;
  ctx.font = 'bold 26px "Old Standard TT", Georgia, serif';
  ctx.fillText("CATATAN UNO", rightX + rightW / 2, topY + 54);

  ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
  ctx.fillText("22 Siswa Aktif · 2 Sahabat", rightX + rightW / 2, topY + 84);

  ctx.strokeStyle = "rgba(239, 229, 206, 0.45)";
  ctx.beginPath();
  ctx.moveTo(rightX + 28, topY + 102);
  ctx.lineTo(rightX + rightW - 28, topY + 102);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = `${TYPE.bodyCompact}px "Source Serif 4", Georgia, serif`;
  const coverNote =
    "Setiap potret di koran ini menyimpan potongan waktu dari bangku Kelas X, masa PKL Kelas XI, hingga perpisahan di Kelas XII.";
  wrapTextLines(ctx, coverNote, rightW - 44, 7).forEach((ln, i) => {
    ctx.fillText(ln, rightX + 22, topY + 138 + i * TYPE.lineCompact);
  });

  // Kanan Bawah: Foto Lingkaran + Kutipan Angkatan
  const quoteTop = topY + 402;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(rightX, quoteTop, rightW, 370);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(rightX, quoteTop, rightW, 370);

  if (sideStory) {
    drawVintagePhotoFrame(
      ctx,
      sideStory.moment,
      images.get(sideStory.moment.image_url),
      rightX + (rightW - 146) / 2,
      quoteTop + 20,
      146,
      146,
      "",
      "circle"
    );
  }

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 18px "Old Standard TT", Georgia, serif';
  ctx.fillText("SUARA ANGKATAN", rightX + rightW / 2, quoteTop + 204);

  ctx.font = 'italic 20px "Source Serif 4", Georgia, serif';
  ctx.fillStyle = INK_BODY;
  wrapTextLines(ctx, `“${spec.quote}”`, rightW - 36, 4).forEach((ln, i) => {
    ctx.fillText(ln, rightX + rightW / 2, quoteTop + 238 + i * 28);
  });

  // Strip Bawah: 3 Kartu Indeks Fase Seimbang
  const stripY = 1068;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(PAD_X, stripY);
  ctx.lineTo(PAD_X + CONTENT_W, stripY);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 21px "Old Standard TT", Georgia, serif';
  ctx.fillText("SOROTAN RUBRIK PER FASE", PAD_X, stripY + 34);

  const items = spec.tocItems ?? [
    { phase: "X", title: "BAB I · KELAS X", printedPage: 2, count: 0 },
    { phase: "XI", title: "BAB II · KELAS XI", printedPage: 8, count: 0 },
    { phase: "XII", title: "BAB III · KELAS XII", printedPage: 16, count: 0 },
  ];

  const cardGap = 18;
  const cardW = (CONTENT_W - cardGap * 2) / 3;
  items.slice(0, 3).forEach((it, idx) => {
    const cx = PAD_X + idx * (cardW + cardGap);
    const cy = stripY + 52;
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(cx, cy, cardW, 118);
    ctx.strokeStyle = INK_RULE;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx, cy, cardW, 118);

    ctx.textAlign = "left";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 19px "Old Standard TT", Georgia, serif';
    ctx.fillText(it.title, cx + 16, cy + 40);

    ctx.fillStyle = INK_MUTED;
    ctx.font = '14px "Special Elite", "Courier New", monospace';
    ctx.fillText(
      `HAL. ${String(it.printedPage).padStart(2, "0")} · ${it.count} FOTO`,
      cx + 16,
      cy + 74
    );

    ctx.fillStyle = INK_BODY;
    ctx.font = 'italic 15px "Source Serif 4", Georgia, serif';
    ctx.fillText(`Arsip Fase Kelas ${it.phase}`, cx + 16, cy + 100);
  });
}

// ============================================================================
// TEMPLATE 2: PEMBUKA FASE RUBRIK (1 FOTO UTAMA BESAR + KOLOM LEGA)
// ============================================================================
function drawPhaseOpenerPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const midX = NEWSPAPER_WIDTH / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = INK_MUTED;
  ctx.font = `${TYPE.kicker}px "Special Elite", "Courier New", monospace`;
  ctx.fillText(spec.rubricTitle, midX, 116);

  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 40px "Old Standard TT", Georgia, serif';
  const hLines = wrapTextLines(ctx, spec.headline, CONTENT_W, 2);
  hLines.forEach((ln, i) => {
    ctx.fillText(ln, midX, 166 + i * 46);
  });

  const subY = 166 + hLines.length * 46 + 6;
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 20px "Source Serif 4", Georgia, serif';
  const sLines = wrapTextLines(ctx, spec.subheadline, CONTENT_W - 60, 2);
  sLines.forEach((ln, i) => {
    ctx.fillText(ln, midX, subY + i * 28);
  });

  const divY = subY + sLines.length * 28 + 14;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD_X, divY);
  ctx.lineTo(PAD_X + CONTENT_W, divY);
  ctx.stroke();

  const story = spec.stories[0];
  if (!story) {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(PAD_X, divY + 36, CONTENT_W, 420);
    ctx.strokeStyle = INK_RULE;
    ctx.strokeRect(PAD_X, divY + 36, CONTENT_W, 420);
    ctx.fillStyle = INK_MUTED;
    ctx.font = '20px "Special Elite", "Courier New", monospace';
    ctx.fillText("BELUM ADA FOTO PADA RUBRIK INI", midX, divY + 252);
    return;
  }

  const imgY = divY + 22;
  const imgH = 436;
  drawVintagePhotoFrame(
    ctx,
    story.moment,
    images.get(story.moment.image_url),
    PAD_X,
    imgY,
    CONTENT_W,
    imgH,
    story.frameTag
  );

  const storyY = imgY + imgH + 34;
  const colW = 512;
  const gap = 28;
  const boxX = PAD_X + colW + gap;
  const boxW = CONTENT_W - colW - gap; // 320px
  const availH = Math.max(280, NEWSPAPER_HEIGHT - 84 - storyY);

  drawEditorialArticle(ctx, story, PAD_X, storyY, colW, {
    headlineSize: 28,
    maxHeadlineLines: 2,
    bodySize: TYPE.bodySolo,
    lineHeight: TYPE.lineSolo,
    maxBodyLines: 8,
    withDropCap: true,
  });

  drawQuotePanel(
    ctx,
    `MANIFEST · KELAS ${spec.phase ?? "XII"}`,
    spec.quote,
    "XII PPLG 1 · MAKN ENDE",
    boxX,
    storyY,
    boxW,
    Math.min(390, availH),
    true
  );
}

// ============================================================================
// TEMPLATE 3: SPOTLIGHT 1 FOTO LEBAR (BESAR, NYAMAN & SEIMBANG)
// ============================================================================
function drawChronicleSpotlightPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const story = spec.stories[0];
  if (!story) return;

  const midX = NEWSPAPER_WIDTH / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 36px "Old Standard TT", Georgia, serif';
  const hLines = wrapTextLines(ctx, story.headline, CONTENT_W - 24, 2);
  hLines.forEach((ln, i) => {
    ctx.fillText(ln, midX, 134 + i * 44);
  });

  const deckY = 134 + hLines.length * 44 + 4;
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 20px "Source Serif 4", Georgia, serif';
  ctx.fillText(story.deck, midX, deckY);

  const ruleY = deckY + 20;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(PAD_X, ruleY);
  ctx.lineTo(PAD_X + CONTENT_W, ruleY);
  ctx.stroke();

  // Foto Utama Lebar & Lega
  const photoY = ruleY + 24;
  const photoH = 472;
  drawVintagePhotoFrame(
    ctx,
    story.moment,
    images.get(story.moment.image_url),
    PAD_X,
    photoY,
    CONTENT_W,
    photoH,
    story.frameTag
  );

  // Bagian Bawah: Deskripsi Lebar (524px, body 22px) + Kartu Data & Kutipan (308px)
  const lowerY = photoY + photoH + 34;
  const leftW = 524;
  const gap = 28;
  const rightX = PAD_X + leftW + gap;
  const rightW = CONTENT_W - leftW - gap; // 308px
  const availH = Math.max(280, NEWSPAPER_HEIGHT - 84 - lowerY);

  ctx.textAlign = "left";
  ctx.fillStyle = INK_MUTED;
  ctx.font = `${TYPE.byline}px "Special Elite", "Courier New", monospace`;
  ctx.fillText(story.byline.toUpperCase(), PAD_X, lowerY + 14);

  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_X, lowerY + 28);
  ctx.lineTo(PAD_X + 148, lowerY + 28);
  ctx.stroke();

  drawDropCapParagraph(ctx, story.body, PAD_X, lowerY + 46, leftW, {
    fontSize: TYPE.bodySolo,
    lineHeight: TYPE.lineSolo,
    maxLines: 9,
  });

  // Kartu Info Bingkai & Kutipan di Kanan
  const metaH = 128;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(rightX, lowerY, rightW, metaH);
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(rightX, lowerY, rightW, metaH);

  ctx.textAlign = "left";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 16px "Special Elite", "Courier New", monospace';
  ctx.fillText("DATA BINGKAI", rightX + 20, lowerY + 34);
  ctx.fillStyle = INK_BODY;
  ctx.font = '16px "Source Serif 4", Georgia, serif';
  ctx.fillText(`Kategori: ${story.moment.category}`, rightX + 20, lowerY + 66);
  ctx.fillText(`Tanggal: ${story.moment.taken_at}`, rightX + 20, lowerY + 96);

  const qY = lowerY + metaH + 20;
  const qH = Math.max(180, availH - metaH - 20);
  drawQuotePanel(
    ctx,
    `CATATAN KELAS ${story.moment.phase}`,
    spec.quote,
    "",
    rightX,
    qY,
    rightW,
    Math.min(268, qH),
    true
  );
}

// ============================================================================
// TEMPLATE 4: EDITORIAL 1 FOTO VERTIKAL + ARTIKEL LEBAR
// ============================================================================
function drawVillageEditorialPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const story = spec.stories[0];
  if (!story) return;

  const topY = 110;
  const leftW = 424;
  const gap = 30;
  const rightX = PAD_X + leftW + gap;
  const rightW = CONTENT_W - leftW - gap; // 406px

  // Kolom Kiri: Foto Vertikal Proporsional + Kutipan Gelap di Bawah
  drawVintagePhotoFrame(
    ctx,
    story.moment,
    images.get(story.moment.image_url),
    PAD_X,
    topY,
    leftW,
    590,
    story.frameTag
  );

  // Keterangan Bingkai di Bawah Foto
  const capY = topY + 616;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(PAD_X, capY, leftW, 130);
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(PAD_X, capY, leftW, 130);

  ctx.textAlign = "left";
  ctx.fillStyle = INK_MUTED;
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.fillText(`${story.frameTag} · ${story.moment.category.toUpperCase()}`, PAD_X + 20, capY + 34);
  ctx.fillStyle = INK_DARK;
  ctx.font = 'italic 19px "Source Serif 4", Georgia, serif';
  wrapTextLines(ctx, story.moment.caption, leftW - 40, 2).forEach((ln, i) => {
    ctx.fillText(ln, PAD_X + 20, capY + 68 + i * 28);
  });

  drawQuotePanel(
    ctx,
    `SUARA KELAS ${story.moment.phase}`,
    spec.quote,
    "ARSIP UNO · MAKN ENDE",
    PAD_X,
    capY + 154,
    leftW,
    330,
    true
  );

  // Kolom Kanan: Kicker + Judul Besar + Artikel Deskripsi 22px Lega
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightX - gap / 2, topY);
  ctx.lineTo(rightX - gap / 2, NEWSPAPER_HEIGHT - 84);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = INK_MUTED;
  ctx.font = `${TYPE.kicker}px "Special Elite", "Courier New", monospace`;
  ctx.fillText(
    `${story.moment.category.toUpperCase()} · FASE KELAS ${story.moment.phase}`,
    rightX,
    topY + 20
  );

  const afterArticleY = drawEditorialArticle(
    ctx,
    story,
    rightX,
    topY + 42,
    rightW,
    {
      headlineSize: 32,
      maxHeadlineLines: 3,
      bodySize: TYPE.bodySolo,
      lineHeight: TYPE.lineSolo,
      maxBodyLines: 14,
      withDropCap: true,
    }
  );

  // Kotak Stempel Arsip Rapi di Sisa Ruang Bawah Kanan
  const stampY = Math.max(afterArticleY + 34, 894);
  const stampH = Math.min(290, NEWSPAPER_HEIGHT - 96 - stampY);
  if (stampH >= 150) {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(rightX, stampY, rightW, stampH);
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(rightX, stampY, rightW, stampH);
    ctx.strokeStyle = INK_RULE;
    ctx.lineWidth = 1;
    ctx.strokeRect(rightX + 8, stampY + 8, rightW - 16, stampH - 16);

    const cx = rightX + rightW / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 28px "Old Standard TT", Georgia, serif';
    ctx.fillText("ARSIP 35MM", cx, stampY + 64);

    ctx.fillStyle = INK_MUTED;
    ctx.font = '14.5px "Special Elite", "Courier New", monospace';
    ctx.fillText(`DIABADIKAN OLEH ${story.moment.uploader_name.toUpperCase()}`, cx, stampY + 104);
    ctx.fillText(`TANGGAL ${story.moment.taken_at.toUpperCase()}`, cx, stampY + 134);

    if (stampH >= 210) {
      ctx.fillStyle = INK_BODY;
      ctx.font = 'italic 18px "Source Serif 4", Georgia, serif';
      ctx.fillText("XII PPLG 1 · MAKN Ende", cx, stampY + stampH - 36);
    }
  }
}

// ============================================================================
// TEMPLATE 5: FEATURE SOLO TERPUSAT (FOTO BESAR + TEKS LEGA SATU BLOK)
// ============================================================================
function drawUrbanFeatureSoloPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const story = spec.stories[0];
  if (!story) return;

  const midX = NEWSPAPER_WIDTH / 2;
  const innerW = 796;
  const innerX = (NEWSPAPER_WIDTH - innerW) / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = INK_MUTED;
  ctx.font = `${TYPE.kicker}px "Special Elite", "Courier New", monospace`;
  ctx.fillText(story.deck.toUpperCase(), midX, 118);

  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 38px "Old Standard TT", Georgia, serif';
  const hLines = wrapTextLines(ctx, story.headline, innerW, 2);
  hLines.forEach((ln, i) => {
    ctx.fillText(ln, midX, 166 + i * 44);
  });

  const byY = 166 + hLines.length * 44 + 4;
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 18px "Source Serif 4", Georgia, serif';
  ctx.fillText(story.byline, midX, byY);

  const photoY = byY + 26;
  const photoH = 468;
  drawVintagePhotoFrame(
    ctx,
    story.moment,
    images.get(story.moment.image_url),
    innerX,
    photoY,
    innerW,
    photoH,
    story.frameTag
  );

  // Blok Bacaan Lebar Satu Kolom Nyaman (796px, body 23px, leading 35px!)
  const bodyY = photoY + photoH + 38;
  const afterBody = drawDropCapParagraph(ctx, story.body, innerX, bodyY, innerW, {
    fontSize: 23,
    lineHeight: 35,
    maxLines: 7,
  });

  // Pita Kutipan Horisontal Rapi di Bawah
  const qY = Math.max(afterBody + 26, 1044);
  const qH = Math.min(168, NEWSPAPER_HEIGHT - 84 - qY);
  if (qH >= 112) {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(innerX, qY, innerW, qH);
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(innerX, qY, innerW, qH);

    ctx.textAlign = "center";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'italic 22px "Old Standard TT", Georgia, serif';
    const qLines = wrapTextLines(ctx, `“${spec.quote}”`, innerW - 72, 2);
    const baseTextY = qY + (qLines.length === 1 ? qH / 2 + 6 : qH / 2 - 10);
    qLines.forEach((ln, i) => {
      ctx.fillText(ln, midX, baseTextY + i * 32);
    });
  }
}

// ============================================================================
// TEMPLATE 6: BALANCED DUO (SESEKALI 2 FOTO — MASING-MASING KOLOM 446PX LEGA)
// ============================================================================
function drawBalancedDuoPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const s0 = spec.stories[0];
  const s1 = spec.stories[1];
  if (!s0) return;

  if (!s1) {
    drawChronicleSpotlightPage(ctx, spec, images);
    return;
  }

  const photoW = 386;
  const gap = 28;
  const textW = CONTENT_W - photoW - gap; // 446px lebar — body 20.5px lega & enak dibaca!

  // BLOK ATAS: Foto Kiri + Artikel Kanan
  const row1Y = 108;
  const row1H = 516;
  drawVintagePhotoFrame(
    ctx,
    s0.moment,
    images.get(s0.moment.image_url),
    PAD_X,
    row1Y,
    photoW,
    row1H,
    s0.frameTag
  );

  drawEditorialArticle(ctx, s0, PAD_X + photoW + gap, row1Y + 4, textW, {
    headlineSize: 27,
    maxHeadlineLines: 2,
    bodySize: TYPE.bodyDuo,
    lineHeight: TYPE.lineDuo,
    maxBodyLines: 10,
    withDropCap: true,
  });

  // Garis Pemisah Ganda Antar 2 Cerita
  const midDivY = row1Y + row1H + 34;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD_X, midDivY);
  ctx.lineTo(PAD_X + CONTENT_W, midDivY);
  ctx.stroke();
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_X, midDivY + 5);
  ctx.lineTo(PAD_X + CONTENT_W, midDivY + 5);
  ctx.stroke();

  // BLOK BAWAH (Silang): Artikel Kiri + Foto Kanan
  const row2Y = midDivY + 30;
  const row2H = Math.min(520, NEWSPAPER_HEIGHT - 84 - row2Y);

  drawEditorialArticle(ctx, s1, PAD_X, row2Y + 4, textW, {
    headlineSize: 27,
    maxHeadlineLines: 2,
    bodySize: TYPE.bodyDuo,
    lineHeight: TYPE.lineDuo,
    maxBodyLines: 10,
    withDropCap: true,
  });

  drawVintagePhotoFrame(
    ctx,
    s1.moment,
    images.get(s1.moment.image_url),
    PAD_X + textW + gap,
    row2Y,
    photoW,
    row2H,
    s1.frameTag
  );
}

// ============================================================================
// TEMPLATE 7: KRONIK FASE, INDEKS & HALAMAN PENUTUP
// ============================================================================
function drawPhaseChroniclePage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec
) {
  const midX = NEWSPAPER_WIDTH / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 34px "Old Standard TT", Georgia, serif';
  ctx.fillText(spec.headline, midX, 138);

  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 19px "Source Serif 4", Georgia, serif';
  ctx.fillText(spec.subheadline, midX, 174);

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(PAD_X, 194);
  ctx.lineTo(PAD_X + CONTENT_W, 194);
  ctx.stroke();

  const colW = (CONTENT_W - 24) / 2;
  const items = spec.stories.slice(0, 12);
  const perCol = Math.ceil(items.length / 2);

  items.forEach((st, idx) => {
    const col = idx < perCol ? 0 : 1;
    const row = col === 0 ? idx : idx - perCol;
    const bx = PAD_X + col * (colW + 24);
    const by = 220 + row * 164;
    if (by + 148 > NEWSPAPER_HEIGHT - 80) return;

    ctx.fillStyle = idx % 2 === 0 ? PAPER_WARM_ALT : PAPER_CREAM;
    ctx.fillRect(bx, by, colW, 146);
    ctx.strokeStyle = INK_RULE;
    ctx.lineWidth = 1.1;
    ctx.strokeRect(bx, by, colW, 146);

    ctx.textAlign = "left";
    ctx.fillStyle = INK_MUTED;
    ctx.font = '13.5px "Special Elite", "Courier New", monospace';
    ctx.fillText(
      `${st.frameTag} · ${st.moment.category.toUpperCase()}`,
      bx + 18,
      by + 30
    );

    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 20px "Old Standard TT", Georgia, serif';
    wrapTextLines(ctx, st.moment.caption, colW - 36, 2).forEach((ln, lIdx) => {
      ctx.fillText(ln, bx + 18, by + 64 + lIdx * 26);
    });

    ctx.fillStyle = INK_MUTED;
    ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
    ctx.fillText(st.byline, bx + 18, by + 126);
  });
}

function drawTocPage(ctx: CanvasRenderingContext2D, spec: NewspaperPageSpec) {
  const midX = NEWSPAPER_WIDTH / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 40px "Old Standard TT", Georgia, serif';
  ctx.fillText(spec.headline, midX, 148);
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 20px "Source Serif 4", Georgia, serif';
  ctx.fillText(spec.subheadline, midX, 188);

  let y = 230;
  (spec.tocItems ?? []).forEach((item) => {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(PAD_X, y, CONTENT_W, 206);
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(PAD_X, y, CONTENT_W, 206);

    ctx.fillStyle = INK_MUTED;
    ctx.font = '15px "Special Elite", "Courier New", monospace';
    ctx.textAlign = "left";
    ctx.fillText(
      `HALAMAN ${String(item.printedPage).padStart(2, "0")} · ${item.count} FOTO KENANGAN`,
      PAD_X + 30,
      y + 44
    );

    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 32px "Old Standard TT", Georgia, serif';
    ctx.fillText(item.title, PAD_X + 30, y + 92);

    ctx.fillStyle = INK_BODY;
    ctx.font = '21px "Source Serif 4", Georgia, serif';
    wrapTextLines(ctx, item.subtitle, CONTENT_W - 60, 2).forEach((ln, i) => {
      ctx.fillText(ln, PAD_X + 30, y + 136 + i * 30);
    });

    y += 232;
  });

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(PAD_X, y + 10, CONTENT_W, 180);
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'italic 23px "Old Standard TT", Georgia, serif';
  ctx.fillText(
    "“22 siswa aktif, 2 sahabat istimewa, dan para guru yang menjaga langkah kami.”",
    midX,
    y + 88
  );
  ctx.fillStyle = INK_MUTED;
  ctx.font = '15px "Special Elite", "Courier New", monospace';
  ctx.fillText(
    "MAKN ENDE · PENGEMBANGAN PERANGKAT LUNAK DAN GIM",
    midX,
    y + 136
  );
}

function drawBackCoverPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec
) {
  const cx = NEWSPAPER_WIDTH / 2;

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2.6;
  ctx.strokeRect(PAD_X, 130, CONTENT_W, NEWSPAPER_HEIGHT - 240);
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD_X + 8, 138, CONTENT_W - 16, NEWSPAPER_HEIGHT - 256);

  ctx.beginPath();
  ctx.arc(cx, 380, 96, 0, Math.PI * 2);
  ctx.fillStyle = INK_DARK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, 380, 84, 0, Math.PI * 2);
  ctx.strokeStyle = PAPER_CREAM;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = PAPER_CREAM;
  ctx.textAlign = "center";
  ctx.font = 'bold 46px "Old Standard TT", Georgia, serif';
  ctx.fillText("UNO", cx, 392);
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.fillText("XII PPLG 1", cx, 426);

  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 48px "Old Standard TT", Georgia, serif';
  ctx.fillText("TAMAT EDISI INI", cx, 576);

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 170, 606);
  ctx.lineTo(cx + 170, 606);
  ctx.stroke();

  ctx.fillStyle = INK_BODY;
  ctx.font = 'italic 27px "Source Serif 4", Georgia, serif';
  ctx.fillText(
    `“${spec.quote || "UNO Born to Win, selamat menjalani hidup baru"}”`,
    cx,
    676
  );

  ctx.fillStyle = INK_MUTED;
  ctx.font = '16px "Special Elite", "Courier New", monospace';
  ctx.fillText("MADRASAH ALIYAH KEJURUAN NEGERI ENDE", cx, 792);
  ctx.fillText("ANGKATAN 2024 — 2027 · ENDE, FLORES — NTT", cx, 828);
  ctx.fillText("ARSIP DIGITAL KELUARGA BESAR XII PPLG 1", cx, 864);
}

/**
 * Render satu halaman koran ke Blob URL WebP kompak menggunakan
 * cache latar kertas tunggal + satu kanvas reusable (hemat RAM & CPU).
 */
export async function renderNewspaperPageToBlobUrl(
  spec: NewspaperPageSpec,
  imageCache: Map<string, LoadedImageResult>
): Promise<{ url: string; corsBlockedCount: number }> {
  if (typeof document !== "undefined" && "fonts" in document) {
    if (!fontsReadyPromise) {
      fontsReadyPromise = document.fonts.ready.then(() => undefined).catch(() => undefined);
    }
    await fontsReadyPromise;
  }

  const imageMap = new Map<string, LoadedImageResult>();
  let corsBlockedCount = 0;

  if (spec.moments.length > 0) {
    await Promise.all(
      spec.moments.map(async (m) => {
        const res = await loadCorsSafeImage(m.image_url, imageCache);
        imageMap.set(m.image_url, res);
        if (res.status === "cors-blocked") {
          corsBlockedCount += 1;
        }
      })
    );
  }

  const rasterScale = getAdaptiveRasterScale();
  const canvas = getScratchCanvas(rasterScale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { url: createSkeletonNewspaperUrl(spec), corsBlockedCount };
  }

  // Salin latar kertas koran dari cache tunggal (1 operasi drawImage, tanpa loop serat ulang)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const parchmentBase = getCachedParchmentCanvas(rasterScale);
  ctx.drawImage(parchmentBase, 0, 0);

  ctx.scale(rasterScale, rasterScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (spec.template !== "chronicle-cover") {
    drawRunningHeaderAndFooter(ctx, spec);
  }

  switch (spec.template) {
    case "chronicle-cover":
      drawChronicleCover(ctx, spec, imageMap);
      break;
    case "phase-opener":
      drawPhaseOpenerPage(ctx, spec, imageMap);
      break;
    case "chronicle-spotlight":
      drawChronicleSpotlightPage(ctx, spec, imageMap);
      break;
    case "village-editorial":
      drawVillageEditorialPage(ctx, spec, imageMap);
      break;
    case "urban-feature-solo":
      drawUrbanFeatureSoloPage(ctx, spec, imageMap);
      break;
    case "balanced-duo":
      drawBalancedDuoPage(ctx, spec, imageMap);
      break;
    case "phase-chronicle":
      drawPhaseChroniclePage(ctx, spec);
      break;
    case "toc":
      drawTocPage(ctx, spec);
      break;
    case "back-cover":
      drawBackCoverPage(ctx, spec);
      break;
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/webp", 0.9);
  });

  if (blob) {
    return { url: URL.createObjectURL(blob), corsBlockedCount };
  }

  return { url: canvas.toDataURL("image/png"), corsBlockedCount };
}
