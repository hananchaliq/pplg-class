import { decodeHtmlEntities } from "@/lib/domain-logic";
import { SITE_CONTENT } from "@/lib/content";
import type { MomentPhase, MomentRow } from "@/lib/types";

export const NEWSPAPER_WIDTH = 960;
export const NEWSPAPER_HEIGHT = 1322; // 1 : 1.377 (rasio standar LeafThrough)

export type NewspaperTemplate =
  | "chronicle-cover"
  | "phase-opener"
  | "chronicle-spotlight"
  | "village-editorial"
  | "urban-feature-solo"
  | "village-times"
  | "london-news"
  | "daily-chronicle"
  | "miami-news"
  | "daily-prophet"
  | "urban-feature"
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

// Palet Koran Jadul Kecreaman (Aged Cream Parchment & Espresso-Sepia Ink)
const PAPER_CREAM = "#EFE5CE";
const PAPER_WARM_ALT = "#E5D7B9";
const PAPER_FOXING = "#D4C29E";
const INK_DARK = "#261F18";
const INK_BODY = "#382E24";
const INK_MUTED = "#6B5B4B";
const INK_RULE = "#8A7864";
const BOX_INVERTED_BG = "#2D241C";
const BOX_INVERTED_FG = "#EFE5CE";

const PHASE_META: Record<
  MomentPhase,
  {
    editionTitle: string;
    rubric: string;
    headline: string;
    sub: string;
    contextClause: string;
    quotes: string[];
  }
> = {
  X: {
    editionTitle: "BAB I · EDISI KELAS X",
    rubric: "RUBRIK KELAS X · FASE AWAL",
    headline: "JEJAK PERTAMA DI BANGKU MADRASAH",
    sub: "Orientasi, baris kode perdana, dan perkenalan keluarga besar di MAKN Ende.",
    contextClause:
      "pada masa awal di Kelas X PPLG 1 ketika langkah-langkah pertama masih penuh rasa ingin tahu di ruang laboratorium madrasah",
    quotes: [
      "Di ruang lab lantai dua, kami pertama kali belajar bahwa satu titik koma bisa menyatukan tawa satu kelas.",
      "Seragam baru, nama-nama baru, dan langkah canggung yang pelan-pelan berubah menjadi rumah kedua.",
    ],
  },
  XI: {
    editionTitle: "BAB II · EDISI KELAS XI",
    rubric: "RUBRIK KELAS XI · REKAYASA & PKL",
    headline: "MUSIM PROYEK, LOMBA & KERJA LAPANGAN",
    sub: "Menembus deadline praktik industri, kompetisi teknologi, dan lembur bersama.",
    contextClause:
      "di tengah kesibukan Kelas XI saat praktik kerja lapangan, lomba kejuruan, dan proyek perangkat lunak menuntut kekompakan",
    quotes: [
      "\"Tunggu sebentar, di laptopku tadi jalan kok!\" — kalimat paling sakti sebelum presentasi di depan meja guru.",
      "Berpencar saat PKL mengajarkan kami arti rindu pulang ke bangku kelas XII PPLG 1.",
    ],
  },
  XII: {
    editionTitle: "BAB III · EDISI KELAS XII",
    rubric: "RUBRIK KELAS XII · SENJA KELULUSAN",
    headline: "CATATAN AKHIR SEBELUM MELANGKAH JAUH",
    sub: "Ujian akhir, foto bersama, dan kenangan yang diarsipkan selamanya.",
    contextClause:
      "menjelang hari-hari terakhir di Kelas XII ketika setiap pertemuan terasa lebih berharga untuk dikenang bersama",
    quotes: [
      "UNO Born to Win, selamat menjalani hidup baru.",
      "Kelak jarak boleh memisahkan, namun arsip halaman koran ini akan selalu membawa kita pulang.",
    ],
  },
};

const CATEGORY_LEAD_ANGLE: Record<string, string> = {
  PKL: "Liputan Lapangan Industri",
  Lomba: "Warta Prestasi & Kompetisi",
  "Study tour": "Catatan Perjalanan Angkatan",
  "Acara madrasah": "Berita Kegiatan Madrasah",
  "Momen lucu": "Kolom Tawa & Spontanitas",
  "Hari terakhir": "Edisi Senja & Perpisahan",
};

const INTERIOR_TEMPLATES: Exclude<
  NewspaperTemplate,
  "chronicle-cover" | "phase-opener" | "phase-chronicle" | "toc" | "back-cover"
>[] = [
  "chronicle-spotlight",
  "village-editorial",
  "village-times",
  "urban-feature-solo",
  "chronicle-spotlight",
  "daily-chronicle",
  "village-editorial",
  "london-news",
  "urban-feature-solo",
  "miami-news",
  "daily-prophet",
  "urban-feature",
];

function templateCapacity(tpl: NewspaperTemplate): number {
  switch (tpl) {
    case "phase-opener":
    case "chronicle-spotlight":
    case "village-editorial":
    case "urban-feature-solo":
      return 1;
    case "village-times":
    case "london-news":
    case "daily-chronicle":
    case "miami-news":
    case "daily-prophet":
    case "urban-feature":
      return 2;
    default:
      return 1;
  }
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
  const picked = words.slice(0, Math.min(8, words.length)).join(" ");
  return picked.toUpperCase();
}

/**
 * Bangun cerita berita editorial yang unik untuk setiap foto berdasarkan data asli gambar tersebut.
 */
function buildEditorialStory(
  moment: MomentRow,
  seqNumber: number
): MomentEditorialStory {
  const phaseInfo = PHASE_META[moment.phase] ?? PHASE_META.XII;
  const angle = CATEGORY_LEAD_ANGLE[moment.category] ?? `Arsip ${moment.category}`;
  const headline = buildHeadlineFromCaption(moment.caption);
  const deck = `${angle} · Fase Kelas ${moment.phase} (${moment.taken_at})`;
  const byline = `Oleh ${moment.uploader_name} · ${moment.taken_at}`;

  const body = `Diabadikan oleh ${moment.uploader_name} pada ${moment.taken_at}, potret ini merekam peristiwa "${moment.caption}". Rekaman visual dalam kategori ${moment.category} tersebut lahir ${phaseInfo.contextClause}. Bagi keluarga besar XII PPLG 1 MAKN Ende, bingkai arsip nomor ${String(seqNumber).padStart(2, "0")} ini menjadi saksi kebersamaan yang tidak lekang oleh waktu — pengingat bahwa tawa, kerja keras, dan solidaritas di bangku madrasah selalu layak diabadikan di lembar cetak.`;

  return {
    moment,
    headline,
    deck,
    byline,
    body,
    frameTag: `NO. ${String(seqNumber).padStart(2, "0")} · KLS ${moment.phase}`,
  };
}

/**
 * Susun halaman koran sebanyak jumlah foto yang ada tanpa batas 12 halaman,
 * terbagi rapi per fase (Kelas X, Kelas XI, Kelas XII) dan setiap foto memiliki ceritanya sendiri.
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
  const coverLeft = allSorted[1] ?? coverHero;
  const coverMoments = [coverHero, coverLeft].filter(Boolean) as MomentRow[];

  const pages: NewspaperPageSpec[] = [];

  // Halaman 0: Sampul Depan Kreatif (Chronicle Cover)
  pages.push({
    pageNumber: 1,
    index: 0,
    template: "chronicle-cover",
    rubricTitle: "EDISI PERDANA · GALERI KENANGAN BERSAMA",
    headline: "Galeri Kenangan Bersama",
    subheadline:
      activeCategory === "Semua"
        ? "Surat kabar arsip perjalanan tiga tahun angkatan UNO XII PPLG 1 di MAKN Ende."
        : `Edisi Pilihan "${activeCategory}" · Arsip Perjalanan XII PPLG 1 MAKN Ende.`,
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
            : `Belum ada liputan foto kategori "${activeCategory}" pada fase Kelas ${phase}.`,
        stories: [],
        moments: [],
        quote: meta.quotes[0]!,
        alt: `${meta.editionTitle}: ${meta.headline}`,
        text: `${meta.rubric}. ${meta.headline}. ${meta.sub}`,
      });
      return;
    }

    // Halaman Pembuka Fase (1 foto utama fase + esai pembuka bab)
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

    // Sisa foto dalam fase dibagi habis ke campuran layout 1-foto & 2-foto tanpa batas halaman
    let cursor = 1;
    let phaseSubPage = 1;
    const phaseStoriesAll: MomentEditorialStory[] = [openerStory];

    while (cursor < phaseMoments.length) {
      const tpl =
        INTERIOR_TEMPLATES[globalTplIdx % INTERIOR_TEMPLATES.length]!;
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

    // Lembar Kronik & Daftar Arsip Fase (menggenapkan edisi tiap fase menjadi catatan bersejarah)
    if (phaseStoriesAll.length >= 2) {
      pages.push({
        pageNumber: pages.length + 1,
        index: pages.length,
        template: "phase-chronicle",
        phase,
        rubricTitle: `${meta.rubric} · KRONIK FASE`,
        headline: `KRONIK & CATATAN PERJALANAN KELAS ${phase}`,
        subheadline: `Rangkuman ${phaseStoriesAll.length} rekaman arsip beserta pengunggah dan tanggal peristiwa.`,
        stories: phaseStoriesAll,
        moments: phaseStoriesAll.slice(0, 1).map((s) => s.moment),
        quote: meta.quotes[1] ?? meta.quotes[0]!,
        alt: `Kronik Perjalanan Kelas ${phase} (${phaseStoriesAll.length} momen tercatat)`,
        text: phaseStoriesAll
          .map((s) => `${s.frameTag} — ${s.moment.caption} (${s.byline})`)
          .join("\n"),
      });
    }
  });

  // Perbarui metadata Halaman Sampul agar menampilkan nomor halaman fase yang akurat
  pages[0]!.tocItems = tocItems;

  // Halaman Indeks Rubrik
  const tocPageIndex = pages.length;
  pages.push({
    pageNumber: pages.length + 1,
    index: tocPageIndex,
    template: "toc",
    rubricTitle: "INDEKS & DAFTAR RUBRIK EDISI",
    headline: "Peta Lembaran Arsip UNO",
    subheadline: `Seluruh ${cleaned.length} foto terbagi dalam ${pages.length + 2} halaman koran per fase angkatan.`,
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

  // Halaman Penutup / Back Cover
  const backCoverIndex = pages.length;
  pages.push({
    pageNumber: pages.length + 1,
    index: backCoverIndex,
    template: "back-cover",
    rubricTitle: "KOLOFON REDAKSI · AKHIR EDISI",
    headline: "TAMAT EDISI INI",
    subheadline:
      "Diterbitkan oleh arsip keluarga besar XII PPLG 1 — Madrasah Aliyah Kejuruan Negeri Ende.",
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

  const title = esc(spec.headline.slice(0, 42));
  const rubric = esc(spec.rubricTitle.slice(0, 46));
  const num = String(spec.pageNumber).padStart(2, "0");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NEWSPAPER_WIDTH} ${NEWSPAPER_HEIGHT}">
    <rect width="${NEWSPAPER_WIDTH}" height="${NEWSPAPER_HEIGHT}" fill="${PAPER_CREAM}"/>
    <rect x="30" y="30" width="${NEWSPAPER_WIDTH - 60}" height="${NEWSPAPER_HEIGHT - 60}" fill="none" stroke="${PAPER_FOXING}" stroke-width="2"/>
    <line x1="52" y1="98" x2="${NEWSPAPER_WIDTH - 52}" y2="98" stroke="${INK_DARK}" stroke-width="2.2"/>
    <line x1="52" y1="104" x2="${NEWSPAPER_WIDTH - 52}" y2="104" stroke="${INK_MUTED}" stroke-width="1"/>
    <text x="52" y="80" font-family="Courier New, monospace" font-size="17" fill="${INK_MUTED}">${rubric}</text>
    <text x="${NEWSPAPER_WIDTH - 52}" y="80" text-anchor="end" font-family="Courier New, monospace" font-size="17" fill="${INK_DARK}">HAL. ${num}</text>
    <text x="${NEWSPAPER_WIDTH / 2}" y="196" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="34" fill="${INK_DARK}">${title}</text>
    <rect x="68" y="250" width="${NEWSPAPER_WIDTH - 136}" height="480" fill="${PAPER_WARM_ALT}" stroke="${INK_RULE}" stroke-width="1.5"/>
    <text x="${NEWSPAPER_WIDTH / 2}" y="490" text-anchor="middle" font-family="Courier New, monospace" font-size="20" fill="${INK_MUTED}">MENCETAK LEMBAR KORAN HALAMAN ${num}...</text>
    <rect x="68" y="775" width="${NEWSPAPER_WIDTH - 136}" height="12" fill="${PAPER_FOXING}"/>
    <rect x="68" y="804" width="${NEWSPAPER_WIDTH - 210}" height="12" fill="${PAPER_FOXING}"/>
    <rect x="68" y="833" width="${NEWSPAPER_WIDTH - 165}" height="12" fill="${PAPER_FOXING}"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ============================================================================
// PEMUAT GAMBAR AMAN CORS & PENGGAMBAR KANVAS KORAN KECREAMAN VINTAGE
// ============================================================================

export type LoadedImageResult =
  | { status: "ok"; image: HTMLImageElement }
  | { status: "cors-blocked" | "error" };

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
    }, 9000);

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

function drawCreamNewsprintBase(ctx: CanvasRenderingContext2D) {
  // Kertas koran jadul kecreaman hangat
  ctx.fillStyle = PAPER_CREAM;
  ctx.fillRect(0, 0, NEWSPAPER_WIDTH, NEWSPAPER_HEIGHT);

  // Gradien penuaan pinggiran kertas (vintage parchment aging)
  const grad = ctx.createRadialGradient(
    NEWSPAPER_WIDTH * 0.5,
    NEWSPAPER_HEIGHT * 0.48,
    200,
    NEWSPAPER_WIDTH * 0.5,
    NEWSPAPER_HEIGHT * 0.5,
    NEWSPAPER_WIDTH * 0.88
  );
  grad.addColorStop(0, "rgba(247, 240, 224, 0.35)");
  grad.addColorStop(0.75, "rgba(232, 219, 192, 0.15)");
  grad.addColorStop(1, "rgba(186, 165, 130, 0.36)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, NEWSPAPER_WIDTH, NEWSPAPER_HEIGHT);

  // Serat & bintik kertas tua deterministik
  for (let i = 0; i < 650; i++) {
    const x = (i * 199 + 41) % NEWSPAPER_WIDTH;
    const y = (i * 317 + 73) % NEWSPAPER_HEIGHT;
    const size = (i % 3) + 1;
    ctx.fillStyle =
      i % 5 === 0 ? "rgba(107, 91, 75, 0.08)" : "rgba(38, 31, 24, 0.035)";
    ctx.fillRect(x, y, size, 1);
  }

  // Bingkai luar kertas koran klasik
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(24, 24, NEWSPAPER_WIDTH - 48, NEWSPAPER_HEIGHT - 48);
  ctx.strokeStyle = PAPER_FOXING;
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, NEWSPAPER_WIDTH - 60, NEWSPAPER_HEIGHT - 60);
}

function drawRunningHeaderAndFooter(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec
) {
  const padX = 48;
  const rightX = NEWSPAPER_WIDTH - padX;

  ctx.fillStyle = INK_MUTED;
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.textAlign = "left";
  ctx.fillText("GALERI KENANGAN BERSAMA · XII PPLG 1", padX, 62);

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 15px "Old Standard TT", Georgia, serif';
  ctx.fillText("MAKN ENDE · EDISI ARSIP", NEWSPAPER_WIDTH / 2, 62);

  ctx.textAlign = "right";
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.fillText(
    `HAL. ${String(spec.pageNumber).padStart(2, "0")}`,
    rightX,
    62
  );

  // Double rule
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(padX, 74);
  ctx.lineTo(rightX, 74);
  ctx.stroke();

  ctx.strokeStyle = INK_MUTED;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, 80);
  ctx.lineTo(rightX, 80);
  ctx.stroke();

  // Footer colophon
  const footY = NEWSPAPER_HEIGHT - 46;
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(padX, footY - 20);
  ctx.lineTo(rightX, footY - 20);
  ctx.stroke();

  ctx.fillStyle = INK_MUTED;
  ctx.font = '12px "Special Elite", "Courier New", monospace';
  ctx.textAlign = "left";
  ctx.fillText(spec.rubricTitle, padX, footY);

  ctx.textAlign = "right";
  ctx.fillText("ARSIP KORAN UNO · 2024–2027", rightX, footY);
}

/**
 * Gambar foto dalam nuansa pucat/faded vintage film (bukan hitam-putih pekat),
 * mendukung bentuk kotak maupun lingkaran seperti di The Daily Chronicle.
 */
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
  ctx.save();
  if (shape === "circle") {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fill();
    ctx.clip();
  } else {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(x, y, w, h);
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, w - 4, h - 4);
    ctx.clip();
  }

  if (imgResult && imgResult.status === "ok") {
    const img = imgResult.image;
    const iw = img.naturalWidth || w;
    const ih = img.naturalHeight || h;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;

    // Pucat ala foto cetak koran jadul (bukan hitam putih pekat)
    ctx.filter = "saturate(42%) contrast(90%) brightness(105%) sepia(24%)";
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = "none";

    // Lapisan tipis warna kertas cream agar menyatu dengan kertas koran
    ctx.fillStyle = "rgba(239, 229, 206, 0.14)";
    ctx.fillRect(x, y, w, h);
  } else {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = INK_MUTED;
    ctx.textAlign = "center";
    ctx.font = '14px "Special Elite", "Courier New", monospace';
    ctx.fillText(
      imgResult?.status === "cors-blocked"
        ? "ARSIP EKSTERNAL · BUKA GRID"
        : "REKAMAN FOTO VINTAGE",
      x + w / 2,
      y + h / 2
    );
    ctx.textAlign = "left";
  }
  ctx.restore();

  // Garis bingkai cetak koran
  if (shape === "circle") {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = PAPER_CREAM;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = INK_MUTED;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

    if (frameLabel) {
      const badgeW = Math.min(w - 14, ctx.measureText(frameLabel).width + 24);
      ctx.fillStyle = "rgba(38, 31, 24, 0.84)";
      ctx.fillRect(x + 8, y + 8, Math.max(96, badgeW), 22);
      ctx.fillStyle = PAPER_CREAM;
      ctx.font = '11px "Special Elite", "Courier New", monospace';
      ctx.textAlign = "left";
      ctx.fillText(frameLabel, x + 14, y + 23);
    }
  }
}

/**
 * Gambar paragraf artikel koran lengkap dengan Drop Cap klasik di huruf pertama.
 */
function drawDropCapParagraph(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  lineHeight: number,
  maxLines: number,
  color: string = INK_BODY
): number {
  const clean = decodeHtmlEntities(text).trim();
  if (!clean) return y;

  const firstChar = clean[0]!.toUpperCase();
  const restText = clean.slice(1);

  // Kotak Drop Cap
  const dropSize = 44;
  ctx.fillStyle = INK_DARK;
  ctx.fillRect(x, y - 4, dropSize, dropSize);
  ctx.fillStyle = PAPER_CREAM;
  ctx.textAlign = "center";
  ctx.font = 'bold 34px "Old Standard TT", Georgia, serif';
  ctx.fillText(firstChar, x + dropSize / 2, y + 28);

  ctx.textAlign = "left";
  ctx.fillStyle = color;
  ctx.font = '15.5px "Source Serif 4", Georgia, serif';

  // 2 baris pertama di samping drop cap
  const sideIndent = dropSize + 10;
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

  sideLines.forEach((ln, r) => {
    ctx.fillText(ln, x + sideIndent, y + 14 + r * lineHeight);
  });

  // Sisa baris selebar penuh kolom
  const remainingText = words.slice(idx).join(" ");
  const bodyLines = remainingText
    ? wrapTextLines(ctx, remainingText, w, Math.max(1, maxLines - 2))
    : [];

  bodyLines.forEach((ln, r) => {
    ctx.fillText(ln, x, y + 14 + (r + 2) * lineHeight);
  });

  const totalRendered = sideLines.length + bodyLines.length;
  return y + 18 + Math.max(2, totalRendered) * lineHeight;
}

function drawStoryColumn(
  ctx: CanvasRenderingContext2D,
  story: MomentEditorialStory,
  x: number,
  y: number,
  w: number,
  opts?: {
    headlineSize?: number;
    maxHeadlineLines?: number;
    maxBodyLines?: number;
    lineHeight?: number;
    withDropCap?: boolean;
  }
): number {
  const headlineSize = opts?.headlineSize ?? 23;
  const maxHeadlineLines = opts?.maxHeadlineLines ?? 3;
  const maxBodyLines = opts?.maxBodyLines ?? 7;
  const lineHeight = opts?.lineHeight ?? 21;
  const withDropCap = opts?.withDropCap ?? true;

  let curY = y;
  ctx.textAlign = "left";
  ctx.fillStyle = INK_DARK;
  ctx.font = `bold ${headlineSize}px "Old Standard TT", Georgia, serif`;
  const hLines = wrapTextLines(ctx, story.headline, w, maxHeadlineLines);
  hLines.forEach((ln, i) => {
    ctx.fillText(ln, x, curY + i * (headlineSize + 4));
  });
  curY += hLines.length * (headlineSize + 4) + 2;

  // Byline
  ctx.fillStyle = INK_MUTED;
  ctx.font = '12px "Special Elite", "Courier New", monospace';
  const byLines = wrapTextLines(ctx, story.byline.toUpperCase(), w, 1);
  if (byLines[0]) {
    ctx.fillText(byLines[0], x, curY + 12);
    curY += 20;
  }

  // Garis tipis pemisah judul & isi
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x, curY);
  ctx.lineTo(x + Math.min(w, 110), curY);
  ctx.stroke();
  curY += 16;

  if (withDropCap) {
    curY = drawDropCapParagraph(ctx, story.body, x, curY, w, lineHeight, maxBodyLines);
  } else {
    ctx.fillStyle = INK_BODY;
    ctx.font = '15.5px "Source Serif 4", Georgia, serif';
    const bLines = wrapTextLines(ctx, story.body, w, maxBodyLines);
    bLines.forEach((ln, i) => {
      ctx.fillText(ln, x, curY + 10 + i * lineHeight);
    });
    curY += 14 + bLines.length * lineHeight;
  }

  return curY;
}

// ============================================================================
// TEMPLATE 1: SAMPUL DEPAN KREATIF (THE DAILY CHRONICLE + LONDON NEWS)
// ============================================================================
function drawChronicleCover(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;

  // "Ears" Pojok Kiri & Kanan Atas (seperti London News & Village Times)
  const earW = 152;
  const earH = 66;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.4;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(padX, 46, earW, earH);
  ctx.strokeRect(padX, 46, earW, earH);
  ctx.fillRect(NEWSPAPER_WIDTH - padX - earW, 46, earW, earH);
  ctx.strokeRect(NEWSPAPER_WIDTH - padX - earW, 46, earW, earH);

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = '11px "Special Elite", "Courier New", monospace';
  ctx.fillText("EDISI ARSIP NO. 01", padX + earW / 2, 68);
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 13px "Source Serif 4", Georgia, serif';
  ctx.fillText("XII PPLG 1 · MAKN Ende", padX + earW / 2, 92);

  ctx.fillStyle = INK_DARK;
  ctx.font = '11px "Special Elite", "Courier New", monospace';
  ctx.fillText("ANGKATAN 2024–2027", NEWSPAPER_WIDTH - padX - earW / 2, 68);
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 13px "Source Serif 4", Georgia, serif';
  ctx.fillText("Harga: Satu Kenangan", NEWSPAPER_WIDTH - padX - earW / 2, 92);

  // Ornamen Lambang UNO di Tengah Masthead (gaya The Daily Chronicle)
  const midX = NEWSPAPER_WIDTH / 2;
  ctx.beginPath();
  ctx.arc(midX, 78, 28, 0, Math.PI * 2);
  ctx.fillStyle = INK_DARK;
  ctx.fill();
  ctx.strokeStyle = PAPER_CREAM;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(midX, 78, 23, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PAPER_CREAM;
  ctx.font = 'bold 16px "Old Standard TT", Georgia, serif';
  ctx.fillText("UNO", midX, 84);

  // Judul Besar Masthead
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 52px "Old Standard TT", Georgia, serif';
  ctx.fillText("GALERI KENANGAN BERSAMA", midX, 166);

  ctx.fillStyle = INK_MUTED;
  ctx.font = '13px "Special Elite", "Courier New", monospace';
  ctx.fillText(
    "LAPORAN KHUSUS · PENGEMBANGAN PERANGKAT LUNAK DAN GIM · MAKN ENDE",
    midX,
    192
  );

  // Pita Gelap Edisi (Inverted Banner Bar seperti London News)
  ctx.fillStyle = BOX_INVERTED_BG;
  ctx.fillRect(padX, 208, contentW, 34);
  ctx.fillStyle = BOX_INVERTED_FG;
  ctx.font = '13px "Special Elite", "Courier New", monospace';
  ctx.textAlign = "left";
  ctx.fillText("NO. 01 · KORAN ANGKATAN", padX + 16, 230);
  ctx.textAlign = "center";
  ctx.fillText("EDISI LENGKAP KELAS X · XI · XII", midX, 230);
  ctx.textAlign = "right";
  ctx.fillText("FLORES — NTT", NEWSPAPER_WIDTH - padX - 16, 230);

  // Tata Letak 3 Kolom Halaman Muka (Daily Chronicle Style)
  const topY = 264;
  const col1W = 216;
  const col3W = 222;
  const gap = 20;
  const col2X = padX + col1W + gap;
  const col2W = contentW - col1W - col3W - gap * 2;
  const col3X = col2X + col2W + gap;

  // Pembatas kolom vertikal
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(col2X - gap / 2, topY);
  ctx.lineTo(col2X - gap / 2, NEWSPAPER_HEIGHT - 64);
  ctx.moveTo(col3X - gap / 2, topY);
  ctx.lineTo(col3X - gap / 2, NEWSPAPER_HEIGHT - 64);
  ctx.stroke();

  const mainStory = spec.stories[0];
  const sideStory = spec.stories[1] ?? spec.stories[0];

  // KOLOM KIRI: Foto Lingkaran + Profil Cerita
  if (sideStory) {
    drawVintagePhotoFrame(
      ctx,
      sideStory.moment,
      images.get(sideStory.moment.image_url),
      padX + (col1W - 166) / 2,
      topY + 4,
      166,
      166,
      "",
      "circle"
    );
    drawStoryColumn(ctx, sideStory, padX, topY + 194, col1W, {
      headlineSize: 21,
      maxHeadlineLines: 3,
      maxBodyLines: 14,
      lineHeight: 21,
      withDropCap: true,
    });
  }

  // Kotak Arsip Kecil di Kiri Bawah
  const stampY = 980;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(padX, stampY, col1W, 250);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(padX, stampY, col1W, 250);
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 20px "Old Standard TT", Georgia, serif';
  ctx.fillText("SUARA ANGKATAN", padX + col1W / 2, stampY + 38);
  ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
  const qLines = wrapTextLines(ctx, `“${spec.quote}”`, col1W - 28, 4);
  qLines.forEach((ln, i) => {
    ctx.fillText(ln, padX + col1W / 2, stampY + 84 + i * 24);
  });
  ctx.fillStyle = INK_MUTED;
  ctx.font = '12px "Special Elite", "Courier New", monospace';
  ctx.fillText("XII PPLG 1 · MAKN ENDE", padX + col1W / 2, stampY + 216);

  // KOLOM TENGAH: Tajuk Utama + Foto Besar + 2 Sub-kolom Berita
  if (mainStory) {
    drawVintagePhotoFrame(
      ctx,
      mainStory.moment,
      images.get(mainStory.moment.image_url),
      col2X,
      topY,
      col2W,
      310,
      "TAJUK UTAMA"
    );

    ctx.textAlign = "center";
    ctx.fillStyle = INK_MUTED;
    ctx.font = 'italic 14px "Source Serif 4", Georgia, serif';
    ctx.fillText(mainStory.byline, col2X + col2W / 2, topY + 332);

    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 28px "Old Standard TT", Georgia, serif';
    const cHead = wrapTextLines(ctx, mainStory.headline, col2W, 2);
    cHead.forEach((ln, i) => {
      ctx.fillText(ln, col2X + col2W / 2, topY + 368 + i * 33);
    });

    const subColY = topY + 368 + cHead.length * 33 + 12;
    const subColW = (col2W - 14) / 2;
    const bodyWords = mainStory.body.split(/\s+/);
    const half = Math.ceil(bodyWords.length / 2);
    const part1 = bodyWords.slice(0, half).join(" ");
    const part2 = bodyWords.slice(half).join(" ");

    drawDropCapParagraph(ctx, part1, col2X, subColY, subColW, 20, 12);
    ctx.fillStyle = INK_BODY;
    ctx.font = '15px "Source Serif 4", Georgia, serif';
    const part2Lines = wrapTextLines(ctx, part2, subColW, 12);
    part2Lines.forEach((ln, i) => {
      ctx.fillText(ln, col2X + subColW + 14, subColY + 14 + i * 20);
    });
  }

  // Strip Sorotan Bawah di Kolom Tengah (Daftar Fase Edisi Ini)
  const teaserY = 934;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(col2X, teaserY);
  ctx.lineTo(col2X + col2W, teaserY);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 20px "Old Standard TT", Georgia, serif';
  ctx.fillText("SOROTAN RUBRIK PER FASE", col2X, teaserY + 32);

  const items = spec.tocItems ?? [
    { phase: "X", title: "BAB I · KELAS X", printedPage: 2, count: 0 },
    { phase: "XI", title: "BAB II · KELAS XI", printedPage: 8, count: 0 },
    { phase: "XII", title: "BAB III · KELAS XII", printedPage: 16, count: 0 },
  ];
  items.forEach((it, idx) => {
    const iy = teaserY + 62 + idx * 72;
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(col2X, iy, col2W, 58);
    ctx.strokeStyle = INK_RULE;
    ctx.lineWidth = 1;
    ctx.strokeRect(col2X, iy, col2W, 58);

    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 16px "Old Standard TT", Georgia, serif';
    ctx.fillText(it.title, col2X + 14, iy + 25);

    ctx.fillStyle = INK_MUTED;
    ctx.font = '12px "Special Elite", "Courier New", monospace';
    ctx.fillText(
      `HALAMAN ${String(it.printedPage).padStart(2, "0")} · ${it.count} FOTO KENANGAN`,
      col2X + 14,
      iy + 46
    );
  });

  // KOLOM KANAN: Kotak Gelap Inverted ("LIGHTS STUN LONDON" dari Daily Chronicle!)
  const darkBoxH = 560;
  ctx.fillStyle = BOX_INVERTED_BG;
  ctx.fillRect(col3X, topY, col3W, darkBoxH);
  ctx.strokeStyle = PAPER_CREAM;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(col3X + 8, topY + 8, col3W - 16, darkBoxH - 16);

  ctx.textAlign = "center";
  ctx.fillStyle = BOX_INVERTED_FG;
  ctx.font = 'bold 28px "Old Standard TT", Georgia, serif';
  ctx.fillText("CATATAN", col3X + col3W / 2, topY + 52);
  ctx.fillText("KELUARGA", col3X + col3W / 2, topY + 84);
  ctx.fillText("UNO", col3X + col3W / 2, topY + 116);

  ctx.font = 'italic 14px "Source Serif 4", Georgia, serif';
  ctx.fillText("22 Siswa Aktif · 2 Sahabat", col3X + col3W / 2, topY + 148);

  ctx.strokeStyle = "rgba(239, 229, 206, 0.45)";
  ctx.beginPath();
  ctx.moveTo(col3X + 26, topY + 164);
  ctx.lineTo(col3X + col3W - 26, topY + 164);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = '15px "Source Serif 4", Georgia, serif';
  const darkCopy =
    "Setiap potret dalam surat kabar ini adalah potongan waktu yang kami simpan dari bangku Kelas X, masa PKL di Kelas XI, hingga detik perpisahan di Kelas XII. Tidak ada momen yang terlalu kecil untuk dilupakan.";
  const darkLines = wrapTextLines(ctx, darkCopy, col3W - 36, 13);
  darkLines.forEach((ln, i) => {
    ctx.fillText(ln, col3X + 18, topY + 194 + i * 24);
  });

  // Kotak Dekoratif Kamera Analog di Kanan Bawah
  const camY = topY + darkBoxH + 22;
  const camH = NEWSPAPER_HEIGHT - 64 - camY;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(col3X, camY, col3W, camH);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(col3X, camY, col3W, camH);

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 21px "Old Standard TT", Georgia, serif';
  ctx.fillText("ARSIP 35MM", col3X + col3W / 2, camY + 42);
  ctx.font = '12px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = INK_MUTED;
  ctx.fillText("ISO 400 · CETAK VINTAGE", col3X + col3W / 2, camY + 66);

  // Ikon Kamera Analog Minimalis di Kanvas
  const camCx = col3X + col3W / 2;
  const camCy = camY + 146;
  ctx.fillStyle = INK_DARK;
  ctx.fillRect(camCx - 54, camCy - 34, 108, 68);
  ctx.fillRect(camCx - 22, camCy - 46, 44, 14);
  ctx.beginPath();
  ctx.arc(camCx, camCy, 24, 0, Math.PI * 2);
  ctx.fillStyle = PAPER_CREAM;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(camCx, camCy, 16, 0, Math.PI * 2);
  ctx.fillStyle = INK_DARK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(camCx - 4, camCy - 4, 4, 0, Math.PI * 2);
  ctx.fillStyle = PAPER_CREAM;
  ctx.fill();

  ctx.fillStyle = INK_DARK;
  ctx.font = 'italic 15px "Source Serif 4", Georgia, serif';
  ctx.fillText("Balik halaman untuk membaca →", camCx, camY + camH - 36);
}

// ============================================================================
// TEMPLATE 2: PEMBUKA FASE RUBRIK (BAB X / XI / XII)
// ============================================================================
function drawPhaseOpenerPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const midX = NEWSPAPER_WIDTH / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = INK_MUTED;
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.fillText(spec.rubricTitle, midX, 118);

  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 42px "Old Standard TT", Georgia, serif';
  const hLines = wrapTextLines(ctx, spec.headline, contentW, 2);
  hLines.forEach((ln, i) => {
    ctx.fillText(ln, midX, 168 + i * 48);
  });

  const subY = 168 + hLines.length * 48 + 4;
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 19px "Source Serif 4", Georgia, serif';
  const sLines = wrapTextLines(ctx, spec.subheadline, contentW - 80, 2);
  sLines.forEach((ln, i) => {
    ctx.fillText(ln, midX, subY + i * 25);
  });

  const divY = subY + sLines.length * 25 + 14;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, divY);
  ctx.lineTo(NEWSPAPER_WIDTH - padX, divY);
  ctx.stroke();

  const story = spec.stories[0];
  if (story) {
    const imgY = divY + 22;
    const imgH = 440;
    drawVintagePhotoFrame(
      ctx,
      story.moment,
      images.get(story.moment.image_url),
      padX,
      imgY,
      contentW,
      imgH,
      story.frameTag
    );

    const storyY = imgY + imgH + 34;
    const colW = (contentW - 28) / 2;
    drawStoryColumn(ctx, story, padX, storyY, colW, {
      headlineSize: 25,
      maxHeadlineLines: 3,
      maxBodyLines: 11,
      lineHeight: 22,
      withDropCap: true,
    });

    // Kotak Manifesto Fase di Kolom Kanan
    const boxX = padX + colW + 28;
    ctx.fillStyle = BOX_INVERTED_BG;
    ctx.fillRect(boxX, storyY, colW, 330);
    ctx.strokeStyle = PAPER_CREAM;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(boxX + 10, storyY + 10, colW - 20, 310);

    ctx.textAlign = "center";
    ctx.fillStyle = BOX_INVERTED_FG;
    ctx.font = '13px "Special Elite", "Courier New", monospace';
    ctx.fillText(
      `MANIFEST · KELAS ${spec.phase ?? "XII"}`,
      boxX + colW / 2,
      storyY + 48
    );

    ctx.font = 'italic 22px "Old Standard TT", Georgia, serif';
    const qLines = wrapTextLines(ctx, `“${spec.quote}”`, colW - 48, 6);
    qLines.forEach((ln, i) => {
      ctx.fillText(ln, boxX + colW / 2, storyY + 104 + i * 32);
    });
  } else {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(padX, divY + 36, contentW, 380);
    ctx.strokeStyle = INK_RULE;
    ctx.strokeRect(padX, divY + 36, contentW, 380);
    ctx.fillStyle = INK_MUTED;
    ctx.font = '18px "Special Elite", "Courier New", monospace';
    ctx.fillText("BELUM ADA FOTO PADA RUBRIK INI", midX, divY + 230);
  }
}

// ============================================================================
// TEMPLATE 3: THE VILLAGE TIMES (image_97344494.png)
// ============================================================================
function drawVillageTimesPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;
  const leftW = 248;
  const rightX = padX + leftW + 22;
  const rightW = contentW - leftW - 22;

  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightX - 11, topY);
  ctx.lineTo(rightX - 11, NEWSPAPER_HEIGHT - 70);
  ctx.stroke();

  const s0 = spec.stories[0];
  const s1 = spec.stories[1];

  // Kolom Kiri Atas: Kotak Tajuk Kecil + Cerita Singkat
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(padX, topY, leftW, 108);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, topY, leftW, 108);
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'italic bold 19px "Old Standard TT", Georgia, serif';
  ctx.fillText("Catatan Redaksi", padX + leftW / 2, topY + 38);
  ctx.fillStyle = INK_BODY;
  ctx.font = '13.5px "Source Serif 4", Georgia, serif';
  const noteLines = wrapTextLines(ctx, spec.quote, leftW - 24, 2);
  noteLines.forEach((ln, i) => {
    ctx.fillText(ln, padX + leftW / 2, topY + 66 + i * 20);
  });

  if (s1) {
    drawStoryColumn(ctx, s1, padX, topY + 136, leftW, {
      headlineSize: 21,
      maxHeadlineLines: 3,
      maxBodyLines: 14,
      lineHeight: 21,
      withDropCap: true,
    });
  } else if (s0) {
    drawStoryColumn(ctx, s0, padX, topY + 136, leftW, {
      headlineSize: 21,
      maxHeadlineLines: 3,
      maxBodyLines: 14,
      lineHeight: 21,
      withDropCap: true,
    });
  }

  // Kolom Kiri Bawah: Kotak Vintage "ARSIP FOTO"
  const adY = 740;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(padX, adY, leftW, 470);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2.4;
  ctx.strokeRect(padX, adY, leftW, 470);
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1;
  ctx.strokeRect(padX + 6, adY + 6, leftW - 12, 458);

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 34px "Old Standard TT", Georgia, serif';
  ctx.fillText("UNO", padX + leftW / 2, adY + 58);
  ctx.font = '12px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = INK_MUTED;
  ctx.fillText("EDISI KHUSUS KENANGAN", padX + leftW / 2, adY + 82);

  if (s1) {
    drawVintagePhotoFrame(
      ctx,
      s1.moment,
      images.get(s1.moment.image_url),
      padX + 18,
      adY + 102,
      leftW - 36,
      230,
      s1.frameTag
    );
    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 16px "Old Standard TT", Georgia, serif';
    const adCap = wrapTextLines(ctx, s1.moment.caption, leftW - 36, 3);
    adCap.forEach((ln, i) => {
      ctx.fillText(ln, padX + leftW / 2, adY + 362 + i * 22);
    });
    ctx.fillStyle = INK_MUTED;
    ctx.font = '11px "Special Elite", "Courier New", monospace';
    ctx.fillText(s1.moment.taken_at, padX + leftW / 2, adY + 440);
  }

  // Kanan Atas: Headline Besar + Foto Utama + Kolom Berita
  if (s0) {
    ctx.textAlign = "left";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 32px "Old Standard TT", Georgia, serif';
    const bigH = wrapTextLines(ctx, s0.headline, rightW, 2);
    bigH.forEach((ln, i) => {
      ctx.fillText(ln, rightX, topY + 26 + i * 36);
    });

    const photoTop = topY + 26 + bigH.length * 36;
    const subColW = (rightW - 18) / 2;

    // Kanan Bawah Foto + Kolom Teks Kiri
    drawVintagePhotoFrame(
      ctx,
      s0.moment,
      images.get(s0.moment.image_url),
      rightX + subColW + 18,
      photoTop,
      subColW,
      360,
      s0.frameTag
    );

    drawStoryColumn(ctx, s0, rightX, photoTop + 6, subColW, {
      headlineSize: 19,
      maxHeadlineLines: 2,
      maxBodyLines: 14,
      lineHeight: 20,
      withDropCap: true,
    });

    // Bagian Bawah Kanan: Strip Berita Lanjutan & Kotak Kutipan
    const lowerY = photoTop + 390;
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(rightX, lowerY);
    ctx.lineTo(rightX + rightW, lowerY);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 24px "Old Standard TT", Georgia, serif';
    ctx.fillText("REKAMAN LENGKAP DI ARSIP KELAS", rightX, lowerY + 34);

    ctx.fillStyle = INK_BODY;
    ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
    const extStory = s1 ? s1.body : s0.body;
    const extLines = wrapTextLines(ctx, extStory, rightW, 7);
    extLines.forEach((ln, i) => {
      ctx.fillText(ln, rightX, lowerY + 68 + i * 24);
    });
  }
}

// ============================================================================
// TEMPLATE 4: LONDON NEWS NEWSPAPER (image_2b954846.png)
// ============================================================================
function drawLondonNewsPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;

  const s0 = spec.stories[0];
  const s1 = spec.stories[1];
  const s2 = spec.stories[2];

  const col1W = 240;
  const col2X = padX + col1W + 20;
  const col2W = contentW - col1W - 20;

  // Kiri: Cerita 1 + Foto Vertikal + Kolom Bawah
  if (s0) {
    ctx.textAlign = "left";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 26px "Old Standard TT", Georgia, serif';
    const h0 = wrapTextLines(ctx, s0.headline, col1W, 3);
    h0.forEach((ln, i) => {
      ctx.fillText(ln, padX, topY + 24 + i * 30);
    });
    const p0Y = topY + 24 + h0.length * 30 + 6;
    drawVintagePhotoFrame(
      ctx,
      s0.moment,
      images.get(s0.moment.image_url),
      padX,
      p0Y,
      col1W,
      300,
      s0.frameTag
    );
    drawDropCapParagraph(
      ctx,
      s0.body,
      padX,
      p0Y + 324,
      col1W,
      20.5,
      14
    );
  }

  // Kanan Atas: Kotak Berita Ringkas + Kolom Tengah
  const boxW = col2W - 10;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(col2X, topY, boxW, 134);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(col2X, topY, boxW, 134);

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 24px "Old Standard TT", Georgia, serif';
  ctx.fillText(
    s1 ? s1.headline.slice(0, 36) : "SOROTAN XII PPLG 1",
    col2X + boxW / 2,
    topY + 42
  );
  ctx.fillStyle = INK_BODY;
  ctx.font = '15px "Source Serif 4", Georgia, serif';
  const boxDesc = wrapTextLines(
    ctx,
    s1 ? s1.body : spec.quote,
    boxW - 36,
    3
  );
  boxDesc.forEach((ln, i) => {
    ctx.fillText(ln, col2X + boxW / 2, topY + 72 + i * 21);
  });

  // Foto Tengah Lebar (seperti foto penunggang kuda di London News)
  const midPhotoY = topY + 158;
  const focusStory = s1 ?? s0;
  if (focusStory) {
    drawVintagePhotoFrame(
      ctx,
      focusStory.moment,
      images.get(focusStory.moment.image_url),
      col2X,
      midPhotoY,
      col2W,
      290,
      focusStory.frameTag
    );
    ctx.textAlign = "left";
    ctx.fillStyle = INK_MUTED;
    ctx.font = '12px "Special Elite", "Courier New", monospace';
    ctx.fillText(focusStory.byline.toUpperCase(), col2X, midPhotoY + 312);
  }

  // Bawah Kanan: 2 Sub-kolom untuk Cerita Kedua + Kotak Kutipan / Cerita Tambahan
  const lowY = midPhotoY + 332;
  const subW = (col2W - 18) / 2;
  const detailStory = s2 ?? s1 ?? s0;
  if (detailStory) {
    drawStoryColumn(ctx, detailStory, col2X, lowY, subW, {
      headlineSize: 20,
      maxHeadlineLines: 3,
      maxBodyLines: 14,
      lineHeight: 20,
      withDropCap: true,
    });
    if (s2) {
      drawVintagePhotoFrame(
        ctx,
        s2.moment,
        images.get(s2.moment.image_url),
        col2X + subW + 18,
        lowY,
        subW,
        270,
        s2.frameTag
      );
      ctx.fillStyle = INK_DARK;
      ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
      const qLines = wrapTextLines(ctx, `“${s2.moment.caption}”`, subW, 4);
      qLines.forEach((ln, i) => {
        ctx.fillText(ln, col2X + subW + 18, lowY + 298 + i * 22);
      });
    } else {
      const cardX = col2X + subW + 18;
      const cardH = 380;
      ctx.fillStyle = PAPER_WARM_ALT;
      ctx.fillRect(cardX, lowY, subW, cardH);
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 1.8;
      ctx.strokeRect(cardX, lowY, subW, cardH);
      ctx.strokeStyle = INK_RULE;
      ctx.lineWidth = 0.9;
      ctx.strokeRect(cardX + 7, lowY + 7, subW - 14, cardH - 14);

      ctx.textAlign = "center";
      ctx.fillStyle = INK_DARK;
      ctx.font = 'bold 20px "Old Standard TT", Georgia, serif';
      ctx.fillText("ARSIP REDAKSI", cardX + subW / 2, lowY + 48);
      ctx.font = '12px "Special Elite", "Courier New", monospace';
      ctx.fillStyle = INK_MUTED;
      ctx.fillText(detailStory.frameTag, cardX + subW / 2, lowY + 74);

      ctx.fillStyle = INK_BODY;
      ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
      const qLines = wrapTextLines(
        ctx,
        `“${detailStory.moment.caption}”`,
        subW - 32,
        5
      );
      qLines.forEach((ln, i) => {
        ctx.fillText(ln, cardX + subW / 2, lowY + 124 + i * 24);
      });

      ctx.fillStyle = INK_MUTED;
      ctx.font = '12px "Special Elite", "Courier New", monospace';
      ctx.fillText(
        `${detailStory.moment.category.toUpperCase()} · ${detailStory.moment.taken_at}`,
        cardX + subW / 2,
        lowY + cardH - 36
      );
    }
  }
}

// ============================================================================
// TEMPLATE 5: THE DAILY CHRONICLE INTERIOR (image_b10cdc2c.png)
// ============================================================================
function drawDailyChroniclePage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;

  const col1W = 216;
  const col3W = 220;
  const gap = 18;
  const col2X = padX + col1W + gap;
  const col2W = contentW - col1W - col3W - gap * 2;
  const col3X = col2X + col2W + gap;

  const s0 = spec.stories[0];
  const s1 = spec.stories[1] ?? spec.stories[0];

  // Kiri: Lingkaran Foto + Artikel
  if (s1) {
    drawVintagePhotoFrame(
      ctx,
      s1.moment,
      images.get(s1.moment.image_url),
      padX + (col1W - 168) / 2,
      topY + 4,
      168,
      168,
      "",
      "circle"
    );
    drawStoryColumn(ctx, s1, padX, topY + 196, col1W, {
      headlineSize: 21,
      maxHeadlineLines: 3,
      maxBodyLines: 22,
      lineHeight: 21,
      withDropCap: true,
    });
  }

  // Tengah: Foto Utama Persegi Panjang + Tajuk + 2 Kolom Cerita
  if (s0) {
    drawVintagePhotoFrame(
      ctx,
      s0.moment,
      images.get(s0.moment.image_url),
      col2X,
      topY,
      col2W,
      360,
      s0.frameTag
    );

    ctx.textAlign = "center";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 28px "Old Standard TT", Georgia, serif';
    const midH = wrapTextLines(ctx, s0.headline, col2W, 2);
    midH.forEach((ln, i) => {
      ctx.fillText(ln, col2X + col2W / 2, topY + 400 + i * 33);
    });

    ctx.fillStyle = INK_MUTED;
    ctx.font = '12px "Special Elite", "Courier New", monospace';
    ctx.fillText(
      s0.byline.toUpperCase(),
      col2X + col2W / 2,
      topY + 400 + midH.length * 33 + 4
    );

    const textY = topY + 400 + midH.length * 33 + 30;
    const subW = (col2W - 14) / 2;
    const words = s0.body.split(/\s+/);
    const half = Math.ceil(words.length / 2);

    drawDropCapParagraph(
      ctx,
      words.slice(0, half).join(" "),
      col2X,
      textY,
      subW,
      20,
      14
    );
    ctx.fillStyle = INK_BODY;
    ctx.font = '15px "Source Serif 4", Georgia, serif';
    wrapTextLines(ctx, words.slice(half).join(" "), subW, 14).forEach(
      (ln, i) => {
        ctx.fillText(ln, col2X + subW + 14, textY + 14 + i * 20);
      }
    );

    // Strip Kaki Tengah
    const boxY = 930;
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(col2X, boxY, col2W, 280);
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(col2X, boxY, col2W, 280);

    drawVintagePhotoFrame(
      ctx,
      s0.moment,
      images.get(s0.moment.image_url),
      col2X + 14,
      boxY + 14,
      160,
      252,
      "DETAIL"
    );
    ctx.textAlign = "left";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 20px "Old Standard TT", Georgia, serif';
    ctx.fillText("KUTIPAN MOMEN", col2X + 190, boxY + 46);
    ctx.fillStyle = INK_BODY;
    ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
    wrapTextLines(ctx, `“${s0.moment.caption}”`, col2W - 208, 7).forEach(
      (ln, i) => {
        ctx.fillText(ln, col2X + 190, boxY + 84 + i * 24);
      }
    );
  }

  // Kanan: Kolom Gelap Inverted + Kotak Mesin Tik Bawah
  ctx.fillStyle = BOX_INVERTED_BG;
  ctx.fillRect(col3X, topY, col3W, 560);
  ctx.strokeStyle = PAPER_CREAM;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(col3X + 8, topY + 8, col3W - 16, 544);

  ctx.textAlign = "center";
  ctx.fillStyle = BOX_INVERTED_FG;
  ctx.font = 'bold 24px "Old Standard TT", Georgia, serif';
  ctx.fillText("SOROTAN", col3X + col3W / 2, topY + 48);
  ctx.fillText(`KELAS ${spec.phase ?? "XII"}`, col3X + col3W / 2, topY + 78);

  ctx.textAlign = "left";
  ctx.font = '15px "Source Serif 4", Georgia, serif';
  wrapTextLines(ctx, `${spec.quote} ${s1 ? s1.body : ""}`, col3W - 34, 15).forEach(
    (ln, i) => {
      ctx.fillText(ln, col3X + 17, topY + 126 + i * 24);
    }
  );

  const lowerBoxY = topY + 584;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(col3X, lowerBoxY, col3W, 520);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(col3X, lowerBoxY, col3W, 520);
  if (s1) {
    drawStoryColumn(ctx, s1, col3X + 14, lowerBoxY + 26, col3W - 28, {
      headlineSize: 20,
      maxHeadlineLines: 3,
      maxBodyLines: 14,
      lineHeight: 20,
      withDropCap: false,
    });
  }
}

// ============================================================================
// TEMPLATE 6: THE MIAMI NEWS BOLD BANNER (image_9c5e2ebc.png)
// ============================================================================
function drawMiamiNewsPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;

  const s0 = spec.stories[0];
  const s1 = spec.stories[1];

  // Banner Judul Ultra Bold Melintang di Atas
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 42px "Old Standard TT", Georgia, serif';
  const bannerLines = wrapTextLines(ctx, spec.headline, contentW, 2);
  bannerLines.forEach((ln, i) => {
    ctx.fillText(ln, NEWSPAPER_WIDTH / 2, topY + 34 + i * 44);
  });

  const bodyTop = topY + 34 + bannerLines.length * 44 + 8;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, bodyTop);
  ctx.lineTo(NEWSPAPER_WIDTH - padX, bodyTop);
  ctx.stroke();

  const leftW = Math.round(contentW * 0.44);
  const rightX = padX + leftW + 24;
  const rightW = contentW - leftW - 24;
  const gridY = bodyTop + 22;

  // Kiri: 2 Kolom Cerita + Foto Sekunder + Kotak "DI DALAM ARSIP"
  if (s0) {
    drawStoryColumn(ctx, s0, padX, gridY, leftW, {
      headlineSize: 22,
      maxHeadlineLines: 3,
      maxBodyLines: 10,
      lineHeight: 21,
      withDropCap: true,
    });
  }

  if (s1) {
    drawVintagePhotoFrame(
      ctx,
      s1.moment,
      images.get(s1.moment.image_url),
      padX,
      gridY + 410,
      leftW,
      260,
      s1.frameTag
    );
    ctx.textAlign = "left";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 17px "Old Standard TT", Georgia, serif';
    wrapTextLines(ctx, s1.moment.caption, leftW, 2).forEach((ln, i) => {
      ctx.fillText(ln, padX, gridY + 696 + i * 22);
    });
  }

  // Kotak Kecil "INSIDE THE ARCHIVE" di Kiri Bawah
  const insideY = gridY + 760;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(padX, insideY, leftW, 170);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(padX, insideY, leftW, 170);
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 18px "Old Standard TT", Georgia, serif';
  ctx.fillText("DI DALAM ARSIP UNO", padX + leftW / 2, insideY + 34);
  ctx.fillStyle = INK_BODY;
  ctx.font = 'italic 15px "Source Serif 4", Georgia, serif';
  wrapTextLines(ctx, spec.quote, leftW - 28, 4).forEach((ln, i) => {
    ctx.fillText(ln, padX + leftW / 2, insideY + 72 + i * 22);
  });

  // Kanan: Foto Utama Besar + Cerita Kedua di Bawah
  if (s0) {
    drawVintagePhotoFrame(
      ctx,
      s0.moment,
      images.get(s0.moment.image_url),
      rightX,
      gridY,
      rightW,
      440,
      s0.frameTag
    );
    ctx.textAlign = "left";
    ctx.fillStyle = INK_MUTED;
    ctx.font = 'italic 14px "Source Serif 4", Georgia, serif';
    ctx.fillText(s0.deck, rightX, gridY + 464);
  }

  if (s1) {
    drawStoryColumn(ctx, s1, rightX, gridY + 498, rightW, {
      headlineSize: 25,
      maxHeadlineLines: 3,
      maxBodyLines: 12,
      lineHeight: 22,
      withDropCap: true,
    });
  }
}

// ============================================================================
// TEMPLATE 7: DAILY PROPHET MOSAIC CLIPPINGS (2 FOTO BESAR & DETAIL)
// ============================================================================
function drawDailyProphetPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;
  const stories = spec.stories.slice(0, 2);
  const blockGap = 24;
  const blockH = Math.floor(
    (NEWSPAPER_HEIGHT - 84 - topY - blockGap * Math.max(0, stories.length - 1)) /
      Math.max(1, stories.length)
  );

  stories.forEach((story, idx) => {
    const by = topY + idx * (blockH + blockGap);
    ctx.fillStyle = idx % 2 === 1 ? PAPER_WARM_ALT : PAPER_CREAM;
    ctx.fillRect(padX, by, contentW, blockH);
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 2;
    ctx.strokeRect(padX, by, contentW, blockH);

    // Mini-masthead bar per kliping
    ctx.fillStyle = INK_DARK;
    ctx.fillRect(padX + 14, by + 14, contentW - 28, 30);
    ctx.fillStyle = PAPER_CREAM;
    ctx.font = '13px "Special Elite", "Courier New", monospace';
    ctx.textAlign = "left";
    ctx.fillText(`HARIAN UNO · ${story.frameTag}`, padX + 24, by + 34);
    ctx.textAlign = "right";
    ctx.fillText(story.moment.category.toUpperCase(), padX + contentW - 24, by + 34);

    const innerY = by + 62;
    const innerH = blockH - 80;
    const photoOnLeft = idx % 2 === 0;
    const photoW = Math.round(contentW * 0.46);
    const textW = contentW - photoW - 50;
    const photoX = photoOnLeft ? padX + 16 : padX + contentW - photoW - 16;
    const textX = photoOnLeft ? padX + photoW + 34 : padX + 16;

    drawVintagePhotoFrame(
      ctx,
      story.moment,
      images.get(story.moment.image_url),
      photoX,
      innerY,
      photoW,
      innerH,
      ""
    );

    drawStoryColumn(ctx, story, textX, innerY + 14, textW, {
      headlineSize: 24,
      maxHeadlineLines: 3,
      maxBodyLines: 14,
      lineHeight: 22,
      withDropCap: true,
    });
  });
}

// ============================================================================
// TEMPLATE 8: URBAN FEATURE & TEKA-TEKI ARSIP (image_751f6138.png)
// ============================================================================
function drawUrbanFeaturePage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;

  const s0 = spec.stories[0];
  const s1 = spec.stories[1];

  // Baris Atas: Judul Fitur Lebar + Kotak Crossword-Style Arsip di Pojok Kanan
  const crossSize = 156;
  const headerW = contentW - crossSize - 24;

  ctx.textAlign = "left";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 34px "Old Standard TT", Georgia, serif';
  const hLines = wrapTextLines(ctx, spec.headline, headerW, 3);
  hLines.forEach((ln, i) => {
    ctx.fillText(ln, padX, topY + 34 + i * 38);
  });
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
  ctx.fillText(spec.subheadline, padX, topY + 34 + hLines.length * 38 + 6);

  // Ornamen Grid Kotak Hitam-Putih Mini (terinspirasi Crossword di image_751f6138.png)
  const cx = padX + contentW - crossSize;
  const cy = topY;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx, cy, crossSize, crossSize);
  const cell = crossSize / 6;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const darkCell = (r * 7 + c * 3 + spec.pageNumber) % 4 === 0;
      ctx.fillStyle = darkCell ? INK_DARK : PAPER_CREAM;
      ctx.fillRect(cx + c * cell, cy + r * cell, cell, cell);
      ctx.strokeStyle = INK_RULE;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(cx + c * cell, cy + r * cell, cell, cell);
    }
  }

  // Foto Panoramik Tengah
  const midY = topY + Math.max(crossSize + 18, 178);
  if (s0) {
    drawVintagePhotoFrame(
      ctx,
      s0.moment,
      images.get(s0.moment.image_url),
      padX,
      midY,
      contentW,
      360,
      s0.frameTag
    );

    const splitY = midY + 388;
    const colW = (contentW - 24) / 2;
    drawStoryColumn(ctx, s0, padX, splitY, colW, {
      headlineSize: 22,
      maxHeadlineLines: 3,
      maxBodyLines: 14,
      lineHeight: 21,
      withDropCap: true,
    });

    if (s1) {
      drawVintagePhotoFrame(
        ctx,
        s1.moment,
        images.get(s1.moment.image_url),
        padX + colW + 24,
        splitY,
        colW,
        240,
        s1.frameTag
      );
      drawStoryColumn(ctx, s1, padX + colW + 24, splitY + 266, colW, {
        headlineSize: 20,
        maxHeadlineLines: 2,
        maxBodyLines: 9,
        lineHeight: 20,
        withDropCap: false,
      });
    } else {
      ctx.fillStyle = PAPER_WARM_ALT;
      ctx.fillRect(padX + colW + 24, splitY, colW, 380);
      ctx.strokeStyle = INK_DARK;
      ctx.strokeRect(padX + colW + 24, splitY, colW, 380);
      ctx.textAlign = "center";
      ctx.fillStyle = INK_DARK;
      ctx.font = 'italic 22px "Old Standard TT", Georgia, serif';
      wrapTextLines(ctx, `“${spec.quote}”`, colW - 48, 6).forEach((ln, i) => {
        ctx.fillText(ln, padX + colW + 24 + colW / 2, splitY + 120 + i * 32);
      });
    }
  }
}

// ============================================================================
// TEMPLATE 9: FOKUS 1 FOTO — CHRONICLE SPOTLIGHT BROADSHEET
// ============================================================================
function drawChronicleSpotlightPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;
  const story = spec.stories[0];
  if (!story) return;

  // Tajuk utama selebar halaman
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 38px "Old Standard TT", Georgia, serif';
  const hLines = wrapTextLines(ctx, story.headline, contentW, 2);
  hLines.forEach((ln, i) => {
    ctx.fillText(ln, NEWSPAPER_WIDTH / 2, topY + 32 + i * 42);
  });

  const subY = topY + 32 + hLines.length * 42 + 4;
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 17px "Source Serif 4", Georgia, serif';
  ctx.fillText(story.deck, NEWSPAPER_WIDTH / 2, subY);

  const frameTop = subY + 20;
  const leftW = 216;
  const rightW = 218;
  const gap = 18;
  const midX = padX + leftW + gap;
  const midW = contentW - leftW - rightW - gap * 2;
  const rightX = midX + midW + gap;

  // Kolom Kiri: Lingkaran Potret Close-up + Metadata Arsip
  drawVintagePhotoFrame(
    ctx,
    story.moment,
    images.get(story.moment.image_url),
    padX + (leftW - 166) / 2,
    frameTop + 6,
    166,
    166,
    "",
    "circle"
  );

  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(padX, frameTop + 194, leftW, 220);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, frameTop + 194, leftW, 220);
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 18px "Old Standard TT", Georgia, serif';
  ctx.fillText("DATA BINGKAI", padX + leftW / 2, frameTop + 230);
  ctx.font = '12px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = INK_MUTED;
  ctx.fillText(story.frameTag, padX + leftW / 2, frameTop + 264);
  ctx.fillText(story.moment.category.toUpperCase(), padX + leftW / 2, frameTop + 290);
  ctx.fillText(story.moment.taken_at, padX + leftW / 2, frameTop + 316);
  ctx.fillStyle = INK_DARK;
  ctx.font = 'italic 14px "Source Serif 4", Georgia, serif';
  wrapTextLines(ctx, `Oleh ${story.moment.uploader_name}`, leftW - 24, 2).forEach(
    (ln, i) => {
      ctx.fillText(ln, padX + leftW / 2, frameTop + 356 + i * 20);
    }
  );

  // Kolom Tengah: Foto Utama Lebar + 2 Kolom Cerita Lengkap
  drawVintagePhotoFrame(
    ctx,
    story.moment,
    images.get(story.moment.image_url),
    midX,
    frameTop,
    midW,
    380,
    story.frameTag
  );

  const colTextY = frameTop + 408;
  const subColW = (midW - 14) / 2;
  const words = story.body.split(/\s+/);
  const half = Math.ceil(words.length / 2);

  drawDropCapParagraph(
    ctx,
    words.slice(0, half).join(" "),
    midX,
    colTextY,
    subColW,
    21,
    18
  );

  ctx.textAlign = "left";
  ctx.fillStyle = INK_BODY;
  ctx.font = '15.5px "Source Serif 4", Georgia, serif';
  wrapTextLines(ctx, words.slice(half).join(" "), subColW, 18).forEach((ln, i) => {
    ctx.fillText(ln, midX + subColW + 14, colTextY + 14 + i * 21);
  });

  // Kolom Kanan: Box Gelap Sepia + Kutipan Kelas
  const boxH = 540;
  ctx.fillStyle = BOX_INVERTED_BG;
  ctx.fillRect(rightX, frameTop, rightW, boxH);
  ctx.strokeStyle = PAPER_CREAM;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(rightX + 8, frameTop + 8, rightW - 16, boxH - 16);

  ctx.textAlign = "center";
  ctx.fillStyle = BOX_INVERTED_FG;
  ctx.font = 'bold 24px "Old Standard TT", Georgia, serif';
  ctx.fillText("SOROTAN", rightX + rightW / 2, frameTop + 52);
  ctx.fillText(`KELAS ${story.moment.phase}`, rightX + rightW / 2, frameTop + 84);

  ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
  wrapTextLines(ctx, `“${story.moment.caption}”`, rightW - 34, 7).forEach(
    (ln, i) => {
      ctx.fillText(ln, rightX + rightW / 2, frameTop + 142 + i * 26);
    }
  );

  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(padX, frameTop + 438, leftW, 560);
  ctx.strokeStyle = INK_DARK;
  ctx.strokeRect(padX, frameTop + 438, leftW, 560);
  ctx.textAlign = "left";
  drawStoryColumn(ctx, story, padX + 12, frameTop + 464, leftW - 24, {
    headlineSize: 18,
    maxHeadlineLines: 3,
    maxBodyLines: 14,
    lineHeight: 20,
    withDropCap: false,
  });

  // Kotak kutipan kanan bawah
  const qBoxY = frameTop + boxH + 20;
  const qBoxH = NEWSPAPER_HEIGHT - 84 - qBoxY;
  if (qBoxH > 120) {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(rightX, qBoxY, rightW, qBoxH);
    ctx.strokeStyle = INK_DARK;
    ctx.strokeRect(rightX, qBoxY, rightW, qBoxH);
    ctx.textAlign = "center";
    ctx.fillStyle = INK_DARK;
    ctx.font = 'italic 18px "Old Standard TT", Georgia, serif';
    wrapTextLines(ctx, `“${spec.quote}”`, rightW - 30, 6).forEach((ln, i) => {
      ctx.fillText(ln, rightX + rightW / 2, qBoxY + 56 + i * 26);
    });
  }
}

// ============================================================================
// TEMPLATE 10: FOKUS 1 FOTO — VILLAGE EDITORIAL SPREAD
// ============================================================================
function drawVillageEditorialPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;
  const story = spec.stories[0];
  if (!story) return;

  const leftW = 360;
  const rightX = padX + leftW + 24;
  const rightW = contentW - leftW - 24;

  // Kiri Atas: Judul Kolom Besar + Byline + Cerita Panjang Ber-Drop-Cap
  drawStoryColumn(ctx, story, padX, topY + 8, leftW, {
    headlineSize: 30,
    maxHeadlineLines: 4,
    maxBodyLines: 18,
    lineHeight: 22,
    withDropCap: true,
  });

  // Kanan Atas: Foto Vertikal Besar Berbingkai Ganda
  drawVintagePhotoFrame(
    ctx,
    story.moment,
    images.get(story.moment.image_url),
    rightX,
    topY,
    rightW,
    540,
    story.frameTag
  );

  // Kanan Tengah: Kotak Vintage Caption & Lokasi
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(rightX, topY + 560, rightW, 130);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(rightX, topY + 560, rightW, 130);
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 20px "Old Standard TT", Georgia, serif';
  ctx.fillText("CATATAN BINGKAI FOTO", rightX + rightW / 2, topY + 596);
  ctx.fillStyle = INK_BODY;
  ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
  wrapTextLines(ctx, `“${story.moment.caption}”`, rightW - 36, 2).forEach(
    (ln, i) => {
      ctx.fillText(ln, rightX + rightW / 2, topY + 630 + i * 24);
    }
  );

  // Bawah Lebar Penuh: Kotak Iklan/Klise Vintage UNO + Kutipan
  const footBoxY = 820;
  const footBoxH = NEWSPAPER_HEIGHT - 84 - footBoxY;
  ctx.fillStyle = PAPER_WARM_ALT;
  ctx.fillRect(padX, footBoxY, contentW, footBoxH);
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2.2;
  ctx.strokeRect(padX, footBoxY, contentW, footBoxH);
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1;
  ctx.strokeRect(padX + 8, footBoxY + 8, contentW - 16, footBoxH - 16);

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 34px "Old Standard TT", Georgia, serif';
  ctx.fillText("ARSIP KENANGAN XII PPLG 1", NEWSPAPER_WIDTH / 2, footBoxY + 62);
  ctx.font = '13px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = INK_MUTED;
  ctx.fillText(
    `${story.frameTag} · KATEGORI ${story.moment.category.toUpperCase()} · ${story.moment.taken_at}`,
    NEWSPAPER_WIDTH / 2,
    footBoxY + 94
  );
  ctx.fillStyle = INK_BODY;
  ctx.font = 'italic 20px "Source Serif 4", Georgia, serif';
  wrapTextLines(ctx, `“${spec.quote}”`, contentW - 96, 3).forEach((ln, i) => {
    ctx.fillText(ln, NEWSPAPER_WIDTH / 2, footBoxY + 152 + i * 30);
  });
}

// ============================================================================
// TEMPLATE 11: FOKUS 1 FOTO — URBAN FEATURE SOLO + CROSSWORD ARSIP
// ============================================================================
function drawUrbanFeatureSoloPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec,
  images: Map<string, LoadedImageResult>
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;
  const story = spec.stories[0];
  if (!story) return;

  const crossSize = 148;
  const headerW = contentW - crossSize - 24;

  ctx.textAlign = "left";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 34px "Old Standard TT", Georgia, serif';
  const hLines = wrapTextLines(ctx, story.headline, headerW, 3);
  hLines.forEach((ln, i) => {
    ctx.fillText(ln, padX, topY + 32 + i * 38);
  });
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
  ctx.fillText(story.deck, padX, topY + 32 + hLines.length * 38 + 6);

  // Mini grid crossword dekoratif
  const cx = padX + contentW - crossSize;
  const cy = topY;
  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx, cy, crossSize, crossSize);
  const cell = crossSize / 6;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const darkCell = (r * 5 + c * 7 + spec.pageNumber) % 4 === 0;
      ctx.fillStyle = darkCell ? INK_DARK : PAPER_CREAM;
      ctx.fillRect(cx + c * cell, cy + r * cell, cell, cell);
      ctx.strokeStyle = INK_RULE;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(cx + c * cell, cy + r * cell, cell, cell);
    }
  }

  // Foto Panoramik Fokus Besar
  const midY = topY + Math.max(crossSize + 20, 174);
  drawVintagePhotoFrame(
    ctx,
    story.moment,
    images.get(story.moment.image_url),
    padX,
    midY,
    contentW,
    460,
    story.frameTag
  );

  // 2 Kolom Cerita Bawah + Kotak Kutipan
  const splitY = midY + 492;
  const colW = (contentW - 24) / 2;
  drawStoryColumn(ctx, story, padX, splitY, colW, {
    headlineSize: 22,
    maxHeadlineLines: 3,
    maxBodyLines: 14,
    lineHeight: 21,
    withDropCap: true,
  });

  ctx.fillStyle = BOX_INVERTED_BG;
  ctx.fillRect(padX + colW + 24, splitY, colW, 380);
  ctx.strokeStyle = PAPER_CREAM;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(padX + colW + 34, splitY + 10, colW - 20, 360);
  ctx.textAlign = "center";
  ctx.fillStyle = BOX_INVERTED_FG;
  ctx.font = '13px "Special Elite", "Courier New", monospace';
  ctx.fillText(
    `EDISI KELAS ${story.moment.phase} · ${story.moment.taken_at}`,
    padX + colW + 24 + colW / 2,
    splitY + 56
  );
  ctx.font = 'italic 22px "Old Standard TT", Georgia, serif';
  wrapTextLines(ctx, `“${story.moment.caption}”`, colW - 54, 6).forEach(
    (ln, i) => {
      ctx.fillText(ln, padX + colW + 24 + colW / 2, splitY + 114 + i * 32);
    }
  );
  ctx.font = '13px "Special Elite", "Courier New", monospace';
  ctx.fillText(
    `Diabadikan oleh ${story.moment.uploader_name}`,
    padX + colW + 24 + colW / 2,
    splitY + 334
  );
}

// ============================================================================
// TEMPLATE 12: LEMBAR KRONIK & INDEKS ARSIP PER FASE
// ============================================================================
function drawPhaseChroniclePage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  const topY = 104;

  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 34px "Old Standard TT", Georgia, serif';
  ctx.fillText(spec.headline, NEWSPAPER_WIDTH / 2, topY + 32);
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 16px "Source Serif 4", Georgia, serif';
  ctx.fillText(spec.subheadline, NEWSPAPER_WIDTH / 2, topY + 64);

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(padX, topY + 84);
  ctx.lineTo(NEWSPAPER_WIDTH - padX, topY + 84);
  ctx.stroke();

  const colW = (contentW - 24) / 2;
  const items = spec.stories.slice(0, 14);
  const perCol = Math.ceil(items.length / 2);

  items.forEach((st, idx) => {
    const col = idx < perCol ? 0 : 1;
    const row = col === 0 ? idx : idx - perCol;
    const bx = padX + col * (colW + 24);
    const by = topY + 104 + row * 136;
    if (by + 122 > NEWSPAPER_HEIGHT - 84) return;

    ctx.fillStyle = idx % 2 === 0 ? PAPER_WARM_ALT : PAPER_CREAM;
    ctx.fillRect(bx, by, colW, 120);
    ctx.strokeStyle = INK_RULE;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, colW, 120);

    ctx.textAlign = "left";
    ctx.fillStyle = INK_MUTED;
    ctx.font = '11px "Special Elite", "Courier New", monospace';
    ctx.fillText(
      `${st.frameTag} · ${st.moment.category.toUpperCase()}`,
      bx + 14,
      by + 24
    );

    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 17px "Old Standard TT", Georgia, serif';
    wrapTextLines(ctx, st.moment.caption, colW - 28, 2).forEach((ln, lIdx) => {
      ctx.fillText(ln, bx + 14, by + 52 + lIdx * 22);
    });

    ctx.fillStyle = INK_MUTED;
    ctx.font = 'italic 13px "Source Serif 4", Georgia, serif';
    ctx.fillText(st.byline, bx + 14, by + 104);
  });
}

// ============================================================================
// HALAMAN INDEKS & HALAMAN PENUTUP
// ============================================================================
function drawTocPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec
) {
  const padX = 48;
  const contentW = NEWSPAPER_WIDTH - padX * 2;
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 38px "Old Standard TT", Georgia, serif';
  ctx.fillText(spec.headline, NEWSPAPER_WIDTH / 2, 148);
  ctx.fillStyle = INK_MUTED;
  ctx.font = 'italic 18px "Source Serif 4", Georgia, serif';
  ctx.fillText(spec.subheadline, NEWSPAPER_WIDTH / 2, 184);

  let y = 224;
  (spec.tocItems ?? []).forEach((item) => {
    ctx.fillStyle = PAPER_WARM_ALT;
    ctx.fillRect(padX, y, contentW, 200);
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(padX, y, contentW, 200);

    ctx.fillStyle = INK_MUTED;
    ctx.font = '14px "Special Elite", "Courier New", monospace';
    ctx.textAlign = "left";
    ctx.fillText(
      `HALAMAN ${String(item.printedPage).padStart(2, "0")} · ${item.count} FOTO KENANGAN`,
      padX + 28,
      y + 42
    );

    ctx.fillStyle = INK_DARK;
    ctx.font = 'bold 30px "Old Standard TT", Georgia, serif';
    ctx.fillText(item.title, padX + 28, y + 88);

    ctx.fillStyle = INK_BODY;
    ctx.font = '18px "Source Serif 4", Georgia, serif';
    wrapTextLines(ctx, item.subtitle, contentW - 56, 2).forEach((ln, i) => {
      ctx.fillText(ln, padX + 28, y + 128 + i * 26);
    });

    y += 226;
  });

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(padX, y + 12, contentW, 180);
  ctx.textAlign = "center";
  ctx.fillStyle = INK_DARK;
  ctx.font = 'italic 22px "Old Standard TT", Georgia, serif';
  ctx.fillText(
    "“22 siswa aktif, 2 sahabat istimewa, dan para guru yang menjaga langkah kami.”",
    NEWSPAPER_WIDTH / 2,
    y + 88
  );
  ctx.fillStyle = INK_MUTED;
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.fillText(
    "MAKN ENDE · PENGEMBANGAN PERANGKAT LUNAK DAN GIM",
    NEWSPAPER_WIDTH / 2,
    y + 134
  );
}

function drawBackCoverPage(
  ctx: CanvasRenderingContext2D,
  spec: NewspaperPageSpec
) {
  const padX = 48;
  const cx = NEWSPAPER_WIDTH / 2;

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 2.6;
  ctx.strokeRect(padX, 130, NEWSPAPER_WIDTH - padX * 2, NEWSPAPER_HEIGHT - 240);
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 1;
  ctx.strokeRect(padX + 8, 138, NEWSPAPER_WIDTH - padX * 2 - 16, NEWSPAPER_HEIGHT - 256);

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
  ctx.font = '12px "Special Elite", "Courier New", monospace';
  ctx.fillText("XII PPLG 1", cx, 424);

  ctx.fillStyle = INK_DARK;
  ctx.font = 'bold 48px "Old Standard TT", Georgia, serif';
  ctx.fillText("TAMAT EDISI INI", cx, 574);

  ctx.strokeStyle = INK_DARK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 170, 604);
  ctx.lineTo(cx + 170, 604);
  ctx.stroke();

  ctx.fillStyle = INK_BODY;
  ctx.font = 'italic 26px "Source Serif 4", Georgia, serif';
  ctx.fillText(
    `“${spec.quote || "UNO Born to Win, selamat menjalani hidup baru"}”`,
    cx,
    672
  );

  ctx.fillStyle = INK_MUTED;
  ctx.font = '15px "Special Elite", "Courier New", monospace';
  ctx.fillText("MADRASAH ALIYAH KEJURUAN NEGERI ENDE", cx, 790);
  ctx.fillText("ANGKATAN 2024 — 2027 · ENDE, FLORES — NTT", cx, 824);
  ctx.fillText("ARSIP DIGITAL KELUARGA BESAR XII PPLG 1", cx, 858);
}

/**
 * Render satu halaman koran ke Blob URL WebP (atau PNG fallback).
 */
export async function renderNewspaperPageToBlobUrl(
  spec: NewspaperPageSpec,
  imageCache: Map<string, LoadedImageResult>
): Promise<{ url: string; corsBlockedCount: number }> {
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Abaikan jika font api tidak tersedia
    }
  }

  const imageMap = new Map<string, LoadedImageResult>();
  let corsBlockedCount = 0;

  await Promise.all(
    spec.moments.map(async (m) => {
      const res = await loadCorsSafeImage(m.image_url, imageCache);
      imageMap.set(m.image_url, res);
      if (res.status === "cors-blocked") {
        corsBlockedCount += 1;
      }
    })
  );

  const canvas = document.createElement("canvas");
  canvas.width = NEWSPAPER_WIDTH;
  canvas.height = NEWSPAPER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { url: createSkeletonNewspaperUrl(spec), corsBlockedCount };
  }

  drawCreamNewsprintBase(ctx);

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
    case "village-times":
      drawVillageTimesPage(ctx, spec, imageMap);
      break;
    case "london-news":
      drawLondonNewsPage(ctx, spec, imageMap);
      break;
    case "daily-chronicle":
      drawDailyChroniclePage(ctx, spec, imageMap);
      break;
    case "miami-news":
      drawMiamiNewsPage(ctx, spec, imageMap);
      break;
    case "daily-prophet":
      drawDailyProphetPage(ctx, spec, imageMap);
      break;
    case "urban-feature":
      drawUrbanFeaturePage(ctx, spec, imageMap);
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
    canvas.toBlob((b) => resolve(b), "image/webp", 0.88);
  });

  if (blob) {
    return { url: URL.createObjectURL(blob), corsBlockedCount };
  }

  return { url: canvas.toDataURL("image/png"), corsBlockedCount };
}
