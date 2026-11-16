import * as THREE from "three";

function applyTextureSettings(
  tex: THREE.CanvasTexture,
  renderer?: THREE.WebGLRenderer | null,
  isColor = true,
  repeat = false
) {
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }
  if (renderer) {
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  } else {
    tex.anisotropy = 4;
  }
  tex.needsUpdate = true;
  return tex;
}

function seededRandom(seed: number) {
  let a = seed || 1337;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tekstur kayu jati hangat (albedo + bump) untuk meja belajar, bingkai papan tulis, dan jepitan polaroid.
 */
export function createWoodTextures(
  renderer?: THREE.WebGLRenderer | null,
  tone: "warm" | "dark" | "light" = "warm"
) {
  const size = 512;
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext("2d")!;

  const baseColors = {
    warm: ["#7a4b2a", "#653b1e", "#8d5834"],
    dark: ["#462916", "#351e0f", "#58351e"],
    light: ["#b68656", "#9e6f42", "#c89968"],
  }[tone];

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, baseColors[0]);
  grad.addColorStop(0.5, baseColors[1]);
  grad.addColorStop(1, baseColors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, size, size);

  const rand = seededRandom(tone === "warm" ? 42 : tone === "dark" ? 99 : 17);
  for (let i = 0; i < 220; i++) {
    const y = rand() * size;
    const h = 1 + rand() * 4;
    const alpha = 0.05 + rand() * 0.12;
    ctx.fillStyle = rand() > 0.5 ? `rgba(32,16,6,${alpha})` : `rgba(235,195,150,${alpha * 0.6})`;
    ctx.fillRect(0, y, size, h);

    bCtx.fillStyle = rand() > 0.5 ? `rgba(60,60,60,0.22)` : `rgba(195,195,195,0.22)`;
    bCtx.fillRect(0, y, size, h);
  }

  // Serat melengkung halus
  ctx.strokeStyle = "rgba(35, 16, 5, 0.14)";
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 28; k++) {
    const baseY = (k / 28) * size;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= size; x += 32) {
      const wave = Math.sin(x * 0.02 + k) * 6;
      ctx.lineTo(x, baseY + wave);
    }
    ctx.stroke();
  }

  const map = applyTextureSettings(new THREE.CanvasTexture(colorCanvas), renderer, true, true);
  const bumpMap = applyTextureSettings(new THREE.CanvasTexture(bumpCanvas), renderer, false, true);
  return { map, bumpMap };
}

/**
 * Tekstur kain sampul Buku Kenangan dengan tenun ikat Ende & emboss judul
 */
export function createBookCoverTextures(renderer?: THREE.WebGLRenderer | null) {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext("2d")!;

  // Warna dasar kain merah bata tua / marun Kelimutu
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#63261d");
  grad.addColorStop(0.5, "#782f24");
  grad.addColorStop(1, "#521e16");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  bCtx.fillStyle = "#787878";
  bCtx.fillRect(0, 0, width, height);

  // Serat tenun silang
  ctx.strokeStyle = "rgba(255, 230, 195, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Pita motif tenun ikat Ende di sisi kiri punggung & bingkai
  ctx.strokeStyle = "#e0a958";
  ctx.lineWidth = 5;
  ctx.strokeRect(56, 56, width - 112, height - 112);
  ctx.lineWidth = 2;
  ctx.strokeRect(68, 68, width - 136, height - 136);

  // Ornamen berlian tenun ikat di atas dan bawah
  for (let x = 110; x < width - 110; x += 48) {
    ctx.fillStyle = "#d99b4e";
    ctx.beginPath();
    ctx.moveTo(x, 102);
    ctx.lineTo(x + 14, 114);
    ctx.lineTo(x, 126);
    ctx.lineTo(x - 14, 114);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, height - 126);
    ctx.lineTo(x + 14, height - 114);
    ctx.lineTo(x, height - 102);
    ctx.lineTo(x - 14, height - 114);
    ctx.closePath();
    ctx.fill();
  }

  // Judul emas timbul
  ctx.fillStyle = "#f3ca82";
  ctx.textAlign = "center";
  ctx.font = "600 32px Georgia, serif";
  ctx.fillText("ALBUM MEMORI MADRASAH", width / 2, 310);

  ctx.font = "bold 76px Georgia, serif";
  ctx.fillText("Kenangan", width / 2, 430);
  ctx.fillText("XII PPLG 1", width / 2, 525);

  ctx.font = "italic 34px Georgia, serif";
  ctx.fillStyle = "#ebd0a0";
  ctx.fillText("MAKN Ende · Flores, NTT", width / 2, 620);

  ctx.font = "500 26px sans-serif";
  ctx.fillText("2024 — 2027", width / 2, 820);

  // Emboss di bump map
  bCtx.fillStyle = "#ffffff";
  bCtx.textAlign = "center";
  bCtx.font = "bold 76px Georgia, serif";
  bCtx.fillText("Kenangan", width / 2, 430);
  bCtx.fillText("XII PPLG 1", width / 2, 525);
  bCtx.strokeStyle = "#ffffff";
  bCtx.lineWidth = 6;
  bCtx.strokeRect(56, 56, width - 112, height - 112);

  const map = applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
  const bumpMap = applyTextureSettings(new THREE.CanvasTexture(bumpCanvas), renderer, false, false);
  return { map, bumpMap };
}

/**
 * Tekstur papan tulis kapur (Chalkboard) dengan debu kapur & bekas hapus
 */
export function createChalkboardTexture(renderer?: THREE.WebGLRenderer | null) {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    40,
    width * 0.5,
    height * 0.5,
    width * 0.65
  );
  grad.addColorStop(0, "#243b2e");
  grad.addColorStop(0.6, "#1b2e23");
  grad.addColorStop(1, "#14221a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Bekas sapuan penghapus kapur
  const rand = seededRandom(301);
  for (let i = 0; i < 45; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const rx = 40 + rand() * 120;
    const ry = 12 + rand() * 35;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.6);
    ctx.fillStyle = `rgba(235, 242, 232, ${0.015 + rand() * 0.03})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Tulisan kapur tipis di bagian atas papan
  ctx.fillStyle = "rgba(244, 238, 225, 0.35)";
  ctx.font = "italic 28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("Papan Cita-Cita & Harapan — XII PPLG 1 MAKN Ende", width / 2, 46);

  ctx.strokeStyle = "rgba(244, 238, 225, 0.2)";
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(120, 62);
  ctx.lineTo(width - 120, 62);
  ctx.stroke();

  return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
}

/**
 * Helper untuk mengambil font tulisan tangan asli (--font-caveat dari next/font)
 * agar teks yang digambar di HTML5 Canvas 2D benar-benar tampak seperti tulisan tangan pena/spidol, bukan ketikan.
 */
export function getHandwritingFont(): string {
  if (typeof document !== "undefined") {
    const cssVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-caveat")
      .trim();
    if (cssVar) {
      return `${cssVar}, "Caveat", "Segoe Print", "Bradley Hand", cursive`;
    }
  }
  return `"Caveat", "Segoe Print", "Bradley Hand", cursive`;
}

export interface FarewellMemeStickerDef {
  id: string;
  topText: string;
  bottomText: string;
  badge: string;
  bg: string;
  accent: string;
  ink: string;
  icon: "cat-cry" | "git-bye" | "tissue" | "coffee" | "ctrl-s" | "reuni" | "bug" | "uno";
}

export const FAREWELL_MEME_STICKERS: FarewellMemeStickerDef[] = [
  {
    id: "404-school",
    topText: "404: SEKOLAH NOT FOUND",
    bottomText: "Udah lulus bre, jangan ke kantin lagi 😭",
    badge: "ERR_RINDU_KELAS",
    bg: "#fff3c4",
    accent: "#d9534f",
    ink: "#23140b",
    icon: "cat-cry",
  },
  {
    id: "git-pamit",
    topText: "git commit -m 'Pamit dulu bre'",
    bottomText: "git push origin masa-depan 🚀",
    badge: "BRANCH: ALUMNI",
    bg: "#e8f6f3",
    accent: "#2d6a6e",
    ink: "#142628",
    icon: "git-bye",
  },
  {
    id: "tutorial-nangis",
    topText: "TUTORIAL GAK NANGIS PAS PISAH:",
    bottomText: "Step 1: Gagal total sejak pelukan pertama 🤧",
    badge: "100% BAPER",
    bg: "#fdebd0",
    accent: "#c86d3b",
    ink: "#2b190d",
    icon: "tissue",
  },
  {
    id: "doa-ibu-kopi",
    topText: "LULUS JALUR DOA IBU & KOPI",
    bottomText: "Plus warisan WiFi Lab PPLG 1 tercinta ☕",
    badge: "SURVIVOR PPLG",
    bg: "#f9ebea",
    accent: "#a84232",
    ink: "#2b1410",
    icon: "coffee",
  },
  {
    id: "ctrl-s-kenangan",
    topText: "CTRL + S KENANGAN KITA!",
    bottomText: "Awas jangan sampe ke-Ctrl+Z ya bre 💾",
    badge: "AUTO-SAVED ♥",
    bg: "#eaf2f8",
    accent: "#285582",
    ink: "#132438",
    icon: "ctrl-s",
  },
  {
    id: "info-reuni",
    topText: "INFO LOKER? INFO REUNI?",
    bottomText: "Awas grup WA cuma rame pas lebaran doang 😂",
    badge: "ANTI WACANA",
    bg: "#fef9e7",
    accent: "#b8732a",
    ink: "#2b1c0c",
    icon: "reuni",
  },
  {
    id: "satu-error",
    topText: "PERNAH SATU ERROR BARENG",
    bottomText: "Titip salam buat titik koma (;) yang hilang 🐛",
    badge: "DEBUG SQUAD",
    bg: "#eef6f0",
    accent: "#3b7a57",
    ink: "#152b1f",
    icon: "bug",
  },
  {
    id: "uno-forever",
    topText: "UNO FOREVER · XII PPLG 1",
    bottomText: "Tiga tahun satu atap, selamanya satu saudara ✨",
    badge: "MAKN ENDE",
    bg: "#fff0e6",
    accent: "#b84a27",
    ink: "#2b160e",
    icon: "uno",
  },
];

/**
 * Menggambar Stiker Meme Perpisahan Lucu bergaya Die-Cut Sticker (tepi putih tebal + ilustrasi doodle lucu + teks tulisan tangan)
 */
function drawFarewellMemeSticker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  rot: number,
  memeIdx: number
) {
  const meme = FAREWELL_MEME_STICKERS[Math.abs(memeIdx) % FAREWELL_MEME_STICKERS.length]!;
  const handFont = getHandwritingFont();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  const w = 276;
  const h = 118;

  // Bayangan stiker lembut
  ctx.fillStyle = "rgba(28, 18, 10, 0.22)";
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 5, -h / 2 + 7, w, h, 20);
  ctx.fill();

  // Die-cut white sticker border
  ctx.fillStyle = "#fffdf9";
  ctx.beginPath();
  ctx.roundRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(60, 42, 26, 0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Isi kartu stiker
  ctx.fillStyle = meme.bg;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = meme.accent;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Ilustrasi doodle meme lucu di sisi kiri
  const ix = -w / 2 + 44;
  const iy = 4;
  ctx.save();
  ctx.translate(ix, iy);

  // Lingkaran latar ikon
  ctx.fillStyle = "#fffdf9";
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = meme.accent;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Gambar ekspresi karakter doodle lucu sesuai tipe meme
  if (meme.icon === "cat-cry" || meme.icon === "tissue") {
    // Kucing mewek pakai toga wisuda
    ctx.fillStyle = "#f2c86b";
    ctx.beginPath();
    ctx.arc(0, 4, 18, 0, Math.PI * 2);
    ctx.fill();
    // Telinga kucing
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.lineTo(-18, -18);
    ctx.lineTo(-5, -11);
    ctx.moveTo(15, -4);
    ctx.lineTo(18, -18);
    ctx.lineTo(5, -11);
    ctx.fill();
    // Air mata banjir biru
    ctx.fillStyle = "#4ea3d8";
    ctx.fillRect(-12, 2, 5, 16);
    ctx.fillRect(7, 2, 5, 16);
    // Mata & mulut mewek
    ctx.strokeStyle = "#23140b";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-8, 0, 3, 0, Math.PI * 2);
    ctx.arc(8, 0, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 11, 5, Math.PI, 0, false);
    ctx.stroke();
    // Topi toga kecil
    ctx.fillStyle = "#1c1510";
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.lineTo(16, -16);
    ctx.lineTo(0, -10);
    ctx.lineTo(-16, -16);
    ctx.closePath();
    ctx.fill();
  } else if (meme.icon === "coffee" || meme.icon === "reuni") {
    // Gelas kopi begadang tersenyum bangga
    ctx.fillStyle = "#c86d3b";
    ctx.fillRect(-13, -6, 26, 24);
    ctx.strokeStyle = "#23140b";
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-13, -6, 26, 24);
    ctx.beginPath();
    ctx.arc(13, 6, 7, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // Uap hangat
    ctx.beginPath();
    ctx.moveTo(-5, -11);
    ctx.quadraticCurveTo(-8, -18, -3, -23);
    ctx.moveTo(5, -11);
    ctx.quadraticCurveTo(2, -18, 7, -23);
    ctx.stroke();
  } else {
    // Wajah sahabat kacamata cool / emotikon perpisahan
    ctx.fillStyle = "#ffd97d";
    ctx.beginPath();
    ctx.arc(0, 2, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#23140b";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Kacamata pixel cool
    ctx.fillStyle = "#1c1510";
    ctx.fillRect(-14, -5, 12, 8);
    ctx.fillRect(2, -5, 12, 8);
    ctx.fillRect(-2, -3, 4, 3);
    // Senyum lebar terharu
    ctx.beginPath();
    ctx.arc(0, 6, 8, 0.15, Math.PI - 0.15);
    ctx.stroke();
    // Setetes air mata haru
    ctx.fillStyle = "#4ea3d8";
    ctx.beginPath();
    ctx.arc(14, 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Pita badge atas
  ctx.fillStyle = meme.accent;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 84, -h / 2 + 10, 176, 22, 6);
  ctx.fill();
  ctx.fillStyle = "#fffdf9";
  ctx.font = `bold 13px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`★ ${meme.badge} ★`, -w / 2 + 172, -h / 2 + 25);

  // Teks meme atas (Handwriting Tebal)
  ctx.fillStyle = meme.ink;
  ctx.textAlign = "left";
  ctx.font = `700 22px ${handFont}`;
  ctx.fillText(meme.topText.slice(0, 28), -w / 2 + 82, 6);

  // Teks meme bawah (Handwriting Miring/Santai)
  ctx.fillStyle = meme.accent;
  ctx.font = `700 19px ${handFont}`;
  ctx.fillText(meme.bottomText.slice(0, 36), -w / 2 + 82, 34);

  ctx.restore();
}

/**
 * Tekstur kertas catatan tempel (Dream Board Note) dengan font tulisan tangan Caveat asli
 */
export function createDreamNoteTexture(
  opts: {
    studentName: string;
    dream: string;
    paperColor: string;
    seed: number;
  },
  renderer?: THREE.WebGLRenderer | null
) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const handFont = getHandwritingFont();
  const rand = seededRandom(opts.seed || 77);

  // Warna dasar kertas tempel dengan gradasi halus kertas asli
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, opts.paperColor || "#fae6b1");
  bgGrad.addColorStop(1, opts.paperColor || "#f3d58d");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Serat kertas tipis
  ctx.fillStyle = "rgba(80, 50, 20, 0.04)";
  for (let i = 0; i < 60; i++) {
    ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 8, 1.5);
  }

  // Pita header lipatan atas tempat paku pin menancap
  ctx.fillStyle = "rgba(43, 24, 10, 0.11)";
  ctx.fillRect(0, 0, size, 92);

  // Garis buku tulis tipis dengan goresan tangan
  ctx.strokeStyle = "rgba(45, 28, 12, 0.15)";
  ctx.lineWidth = 2;
  for (let y = 154; y < size - 44; y += 54) {
    ctx.beginPath();
    ctx.moveTo(26, y);
    ctx.lineTo(size - 26, y);
    ctx.stroke();
  }

  // Pinggiran kertas tegas
  ctx.strokeStyle = "rgba(35, 20, 8, 0.32)";
  ctx.lineWidth = 7;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  // Nama siswa di kiri atas dengan tulisan tangan spidol
  ctx.fillStyle = "#2b1608";
  ctx.font = `700 42px ${handFont}`;
  ctx.textAlign = "left";
  ctx.fillText(opts.studentName.slice(0, 18), 28, 64);

  // Isi cita-cita dengan tulisan tangan pena tebal & kontras tinggi
  ctx.fillStyle = "#140903";
  ctx.font = `700 48px ${handFont}`;
  const words = opts.dream.trim().split(/\s+/);
  let line = "";
  let y = 148;
  const maxWidth = size - 56;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, 28, y);
      line = word;
      y += 54;
      if (y > size - 56) break;
    } else {
      line = test;
    }
  }
  if (line && y <= size - 42) {
    ctx.fillText(line, 28, y);
  }

  // Tanda tangan kecil tulisan tangan di sudut kanan bawah
  ctx.fillStyle = "rgba(168, 66, 50, 0.9)";
  ctx.font = `700 30px ${handFont}`;
  ctx.textAlign = "right";
  ctx.fillText("~ UNO · XII PPLG 1 ★", size - 24, size - 20);

  return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
}

/**
 * Tekstur Polaroid 3D Bervisual Kertas Foto Fisik Asli (Silver-Halide Glossy/Satin Photo Paper)
 * & Font Tulisan Tangan Spidol Permanen Asli
 */
export function createPolaroidTexture(
  opts: {
    caption: string;
    category: string;
    phase: string;
    dateStr: string;
    seed: number;
    isBack?: boolean;
  },
  renderer?: THREE.WebGLRenderer | null
) {
  const width = 512;
  const height = 640;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const handFont = getHandwritingFont();
  const rand = seededRandom(opts.seed || 101);

  // Dasar Kertas Foto Asli (Warm Pearl Photo Paper Base dengan gradasi halus & bevel)
  const paperGrad = ctx.createLinearGradient(0, 0, width, height);
  paperGrad.addColorStop(0, "#fffdf9");
  paperGrad.addColorStop(0.55, "#faf3e6");
  paperGrad.addColorStop(1, "#f0e4ce");
  ctx.fillStyle = paperGrad;
  ctx.fillRect(0, 0, width, height);

  // Serat halus kertas cetak foto
  ctx.fillStyle = "rgba(92, 68, 42, 0.035)";
  for (let i = 0; i < 90; i++) {
    ctx.fillRect(rand() * width, rand() * height, 2 + rand() * 5, 1.5);
  }

  // Bevel tepi luar kertas foto asli
  ctx.strokeStyle = "#d4c0a3";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  if (opts.isBack) {
    // Sisi Belakang Kertas Foto Asli (Watermark Diagonal Archival Paper + Stempel + Tulisan Tangan Pena)
    ctx.save();
    ctx.strokeStyle = "rgba(140, 112, 82, 0.11)";
    ctx.fillStyle = "rgba(140, 112, 82, 0.13)";
    ctx.font = "bold 16px monospace";
    for (let wy = -120; wy < height + 120; wy += 95) {
      ctx.save();
      ctx.translate(width / 2, wy);
      ctx.rotate(-0.28);
      ctx.textAlign = "center";
      ctx.fillText(
        "UNO · ARCHIVAL PHOTO PAPER · KODAK ROYAL · XII PPLG 1 · UNO",
        0,
        0
      );
      ctx.restore();
    }
    ctx.restore();

    // Bingkai kartu pos belakang foto
    ctx.strokeStyle = "rgba(110, 86, 62, 0.34)";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 72, width - 68, height - 106);

    // Kotak perangko / cap tanggal di kanan atas
    ctx.strokeStyle = "rgba(168, 66, 50, 0.55)";
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(width - 134, 90, 80, 92);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(168, 66, 50, 0.78)";
    ctx.font = `700 22px ${handFont}`;
    ctx.textAlign = "center";
    ctx.fillText("UNO", width - 94, 130);
    ctx.fillText(opts.phase || "XII", width - 94, 158);

    // Header tulisan tangan di kiri atas
    ctx.textAlign = "left";
    ctx.fillStyle = "#8c3b2b";
    ctx.font = `700 32px ${handFont}`;
    ctx.fillText(
      `Fase Kelas ${opts.phase} ~ ${opts.category}`,
      54,
      124
    );

    // Garis buku tipis untuk catatan di balik foto
    ctx.strokeStyle = "rgba(110, 86, 62, 0.2)";
    ctx.lineWidth = 1.5;
    for (let ly = 210; ly <= height - 120; ly += 54) {
      ctx.beginPath();
      ctx.moveTo(54, ly);
      ctx.lineTo(width - 54, ly);
      ctx.stroke();
    }

    // Catatan di balik foto dengan tulisan tangan pena biru/sepia asli
    ctx.fillStyle = "#1b2845";
    ctx.font = `700 44px ${handFont}`;
    const words = (opts.caption || "Kenangan manis bersama keluarga UNO XII PPLG 1").split(" ");
    let line = "";
    let y = 202;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > width - 120) {
        ctx.fillText(line, 54, y);
        line = w;
        y += 54;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 54, y);

    // Tanda tangan tanggal di bawah dengan tulisan tangan
    ctx.fillStyle = "#6e4e32";
    ctx.font = `700 30px ${handFont}`;
    ctx.fillText(`Abadi di MAKN Ende · ${opts.dateStr || "2026"} ♥`, 54, height - 56);

    return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
  }

  // Area Emulsi Foto Polaroid (mulai di topPad = 56 agar jepitan kayu tidak menutupi gambar)
  const sidePad = 32;
  const topPad = 56;
  const photoW = width - sidePad * 2;
  const photoH = 396;

  // Bayangan cekung tipis di sekeliling jendela emulsi foto
  ctx.fillStyle = "#dfd1bc";
  ctx.fillRect(sidePad - 3, topPad - 3, photoW + 6, photoH + 6);

  const palettes = [
    ["#c86d3b", "#e8a568", "#2d6a6e"],
    ["#2d6a6e", "#6da89b", "#d98a4f"],
    ["#3b593f", "#84a37c", "#e09f4c"],
    ["#a84232", "#d9825b", "#3d312a"],
  ];
  const pal = palettes[opts.seed % palettes.length]!;

  const grad = ctx.createLinearGradient(sidePad, topPad, sidePad, topPad + photoH);
  grad.addColorStop(0, pal[0]!);
  grad.addColorStop(0.65, pal[1]!);
  grad.addColorStop(1, pal[2]!);
  ctx.fillStyle = grad;
  ctx.fillRect(sidePad, topPad, photoW, photoH);

  // Matahari / cahaya sore hangat
  ctx.fillStyle = "rgba(255, 243, 214, 0.82)";
  ctx.beginPath();
  ctx.arc(
    sidePad + photoW * (0.3 + rand() * 0.4),
    topPad + photoH * 0.34,
    46,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Siluet bukit Ende
  ctx.fillStyle = "rgba(38, 26, 18, 0.48)";
  ctx.beginPath();
  ctx.moveTo(sidePad, topPad + photoH);
  ctx.quadraticCurveTo(
    sidePad + photoW * 0.35,
    topPad + photoH * 0.62,
    sidePad + photoW,
    topPad + photoH * 0.78
  );
  ctx.lineTo(sidePad + photoW, topPad + photoH);
  ctx.closePath();
  ctx.fill();

  // Siluet 3-4 sahabat berfoto bersama
  const peopleCount = 3 + (opts.seed % 3);
  for (let p = 0; p < peopleCount; p++) {
    const px =
      sidePad + 85 + (p * (photoW - 170)) / Math.max(1, peopleCount - 1);
    const py = topPad + photoH - 60;
    ctx.fillStyle = "#241911";
    ctx.beginPath();
    ctx.arc(px, py - 50, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px, py + 15, 35, 50, 0, Math.PI, 0, false);
    ctx.fill();
  }

  // Efek Kilau Satin Kertas Foto Asli (Diagonal Gloss Reflection Sheen)
  const sheenGrad = ctx.createLinearGradient(
    sidePad,
    topPad,
    sidePad + photoW,
    topPad + photoH
  );
  sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
  sheenGrad.addColorStop(0.42, "rgba(255, 255, 255, 0.02)");
  sheenGrad.addColorStop(0.5, "rgba(255, 252, 245, 0.22)");
  sheenGrad.addColorStop(0.58, "rgba(255, 255, 255, 0.03)");
  sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(sidePad, topPad, photoW, photoH);

  // Garis tepi dalam emulsi foto
  ctx.strokeStyle = "rgba(43, 33, 24, 0.42)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(sidePad, topPad, photoW, photoH);

  // Caption Tulisan Tangan Spidol Asli di dagu bawah kertas Polaroid (sedikit miring alami)
  ctx.save();
  ctx.translate(width / 2, topPad + photoH + 68);
  ctx.rotate(((opts.seed % 5) - 2) * 0.012);

  ctx.fillStyle = "#1c130b";
  ctx.font = `700 42px ${handFont}`;
  ctx.textAlign = "center";
  const shortCap =
    opts.caption.length > 34 ? `${opts.caption.slice(0, 32)}...` : opts.caption;
  ctx.fillText(shortCap, 0, 0);

  ctx.fillStyle = "#8c4a27";
  ctx.font = `700 28px ${handFont}`;
  ctx.fillText(
    `~ Kelas ${opts.phase} · ${opts.category} (${opts.dateStr || "2026"}) ~`,
    0,
    46
  );
  ctx.restore();

  return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
}

export interface BookPageData {
  type: "toc" | "student-left" | "student-right";
  pageNumber: number;
  studentName?: string;
  studentNickname?: string;
  studentRole?: string;
  studentBio?: string;
  studentTags?: string[];
  messages?: { author: string; text: string; seed: number }[];
  tocEntries?: { name: string; spreadIndex: number }[];
  decorSeed: number;
}

function drawScrapbookButterfly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  rot: number,
  wingColor: string,
  accentColor: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  // Stiker putih tepi luar (die-cut sticker border)
  ctx.fillStyle = "#fcf6e8";
  ctx.beginPath();
  ctx.ellipse(-22, -14, 28, 20, -0.45, 0, Math.PI * 2);
  ctx.ellipse(22, -14, 28, 20, 0.45, 0, Math.PI * 2);
  ctx.ellipse(-16, 16, 20, 15, 0.35, 0, Math.PI * 2);
  ctx.ellipse(16, 16, 20, 15, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Sayap atas
  ctx.fillStyle = wingColor;
  ctx.beginPath();
  ctx.ellipse(-21, -13, 24, 16, -0.45, 0, Math.PI * 2);
  ctx.ellipse(21, -13, 24, 16, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Sayap bawah
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.ellipse(-15, 15, 16, 12, 0.35, 0, Math.PI * 2);
  ctx.ellipse(15, 15, 16, 12, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Detail bintik emas di sayap
  ctx.fillStyle = "#2b190d";
  ctx.beginPath();
  ctx.arc(-26, -16, 4, 0, Math.PI * 2);
  ctx.arc(26, -16, 4, 0, Math.PI * 2);
  ctx.fill();

  // Tubuh kupu-kupu
  ctx.fillStyle = "#1f1209";
  ctx.beginPath();
  ctx.ellipse(0, 2, 4, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPressedFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  petalColor: string,
  centerColor: string,
  petalCount = 8
) {
  ctx.save();
  ctx.translate(x, y);

  // Tangkai & daun kering bila bunga di tepi
  ctx.strokeStyle = "#4d5e3a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(8, radius * 1.4, -6, radius * 2.2);
  ctx.stroke();

  for (let i = 0; i < petalCount; i++) {
    const ang = (i / petalCount) * Math.PI * 2;
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = petalColor;
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.62, radius * 0.32, radius * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(43,24,10,0.18)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRibbonBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  color = "#f2a7b8"
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Border putih stiker
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#fff9f5";
  ctx.fillStyle = color;

  // Simpul kiri & kanan
  ctx.beginPath();
  ctx.ellipse(-28, -4, 28, 16, -0.3, 0, Math.PI * 2);
  ctx.ellipse(28, -4, 28, 16, 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();

  // Pita menjuntai
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.lineTo(-26, 42);
  ctx.lineTo(-10, 38);
  ctx.closePath();
  ctx.moveTo(6, 4);
  ctx.lineTo(26, 42);
  ctx.lineTo(10, 38);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  // Simpul tengah
  ctx.fillStyle = "#e08499";
  ctx.beginPath();
  ctx.arc(0, -2, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBinderHoles(ctx: CanvasRenderingContext2D, isLeftPage: boolean, height: number) {
  const holeX = isLeftPage ? 1024 - 38 : 38;
  const ringPositions = [170, 290, 410, 870, 990, 1110];
  for (const hy of ringPositions) {
    if (hy > height - 80) continue;
    // Ring eyelet metalik
    ctx.fillStyle = "#8c7a68";
    ctx.beginPath();
    ctx.arc(holeX, hy, 18, 0, Math.PI * 2);
    ctx.fill();

    // Lubang kertas gelap
    ctx.fillStyle = "#2b1c11";
    ctx.beginPath();
    ctx.arc(holeX, hy, 11, 0, Math.PI * 2);
    ctx.fill();

    // Garis celah tepi buku
    ctx.strokeStyle = "rgba(43, 28, 17, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(holeX, hy);
    ctx.lineTo(isLeftPage ? 1024 : 0, hy);
    ctx.stroke();
  }
}

function drawRansomWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  startX: number,
  y: number,
  boxSize = 44
) {
  const bgColors = ["#1c1613", "#f7efe2", "#a84232", "#2d6a6e", "#e5a93c"];
  const fgColors = ["#f7efe2", "#1c1613", "#fbf6ec", "#fbf6ec", "#1c1613"];
  let cx = startX;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]!;
    const idx = i % bgColors.length;
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(((i % 3) - 1) * 0.07);
    ctx.fillStyle = bgColors[idx]!;
    ctx.fillRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
    ctx.strokeStyle = "#2b1b10";
    ctx.lineWidth = 2;
    ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
    ctx.fillStyle = fgColors[idx]!;
    ctx.font = `bold ${Math.round(boxSize * 0.68)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, 0, 2);
    ctx.restore();
    cx += boxSize + 6;
  }
}

function drawWaxSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius = 34,
  color = "#9e2a2b"
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const r = radius * (i % 2 === 0 ? 1.06 : 0.94);
    const px = Math.cos(ang) * r;
    const py = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 225, 185, 0.55)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#f7d996";
  ctx.font = "bold 20px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("UNO", 0, 1);
  ctx.restore();
}

function drawPostageStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  accentColor = "#2d6a6e",
  code = "ENDE-2027"
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // Scalloped stamp edge
  ctx.fillStyle = "#fcf6e8";
  ctx.fillRect(-58, -70, 116, 140);
  ctx.strokeStyle = "#8c6d46";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(-54, -66, 108, 132);
  ctx.setLineDash([]);

  ctx.fillStyle = accentColor;
  ctx.fillRect(-44, -54, 88, 86);

  ctx.fillStyle = "#fbf6ec";
  ctx.font = "bold 16px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("MAKN", 0, -20);
  ctx.font = "bold 22px Georgia, serif";
  ctx.fillText("UNO", 0, 8);

  ctx.fillStyle = "#2b190d";
  ctx.font = "bold 14px monospace";
  ctx.fillText(code, 0, 50);

  // Wavy postmark cancellation lines
  ctx.strokeStyle = "rgba(35, 20, 10, 0.45)";
  ctx.lineWidth = 2;
  for (let wy = -12; wy <= 24; wy += 12) {
    ctx.beginPath();
    ctx.moveTo(10, wy);
    ctx.bezierCurveTo(32, wy - 8, 52, wy + 8, 76, wy - 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCassetteSticker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  label = "MIX #12"
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  ctx.fillStyle = "#231c18";
  ctx.fillRect(-115, -68, 230, 136);
  ctx.strokeStyle = "#fbf5e8";
  ctx.lineWidth = 4;
  ctx.strokeRect(-115, -68, 230, 136);

  // Cassette label strip
  ctx.fillStyle = "#f2c86b";
  ctx.fillRect(-98, -50, 196, 78);
  ctx.fillStyle = "#a84232";
  ctx.fillRect(-98, -50, 196, 24);

  ctx.fillStyle = "#fbf6ec";
  ctx.font = "bold 15px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`SIDE A · ${label}`, 0, -33);

  // Two tape reels
  ctx.fillStyle = "#231c18";
  ctx.beginPath();
  ctx.arc(-46, 2, 18, 0, Math.PI * 2);
  ctx.arc(46, 2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fbf6ec";
  ctx.beginPath();
  ctx.arc(-46, 2, 8, 0, Math.PI * 2);
  ctx.arc(46, 2, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBuntingFlags(
  ctx: CanvasRenderingContext2D,
  width: number,
  y = 64
) {
  ctx.save();
  ctx.strokeStyle = "#4a321f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, y - 12);
  ctx.quadraticCurveTo(width / 2, y + 26, width - 64, y - 12);
  ctx.stroke();

  const colors = ["#c86d3b", "#2d6a6e", "#e5a93c", "#a84232", "#4e7a58", "#d96b43"];
  const count = 9;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const fx = 86 + t * (width - 172);
    const fy = y - 10 + Math.sin(t * Math.PI) * 18;
    ctx.fillStyle = colors[i % colors.length]!;
    ctx.beginPath();
    ctx.moveTo(fx - 34, fy);
    ctx.lineTo(fx + 34, fy);
    ctx.lineTo(fx, fy + 54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fcf6e8";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Menggambar kotak kertas catatan dengan 5 gaya bentuk acak (Torn Spiral, Dog-Eared Card, Pinned Note, Dual Washi Memo, Postcard Cutout)
 */
function drawRandomScrapbookBox(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  styleVariant: number,
  paperColor: string,
  tapeColor: string
) {
  // Bayangan kertas timbul
  ctx.fillStyle = "rgba(35, 22, 12, 0.16)";
  ctx.fillRect(-w / 2 + 6, -h / 2 + 8, w, h);

  ctx.fillStyle = paperColor;
  ctx.strokeStyle = "#5c4026";
  ctx.lineWidth = 3;

  const v = Math.abs(styleVariant) % 5;

  if (v === 0) {
    // Gaya 0: Kertas Buku Spiral Sobek di Tepi Atas + Washi Tape Miring
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2 + 12);
    for (let tx = -w / 2; tx < w / 2; tx += 22) {
      ctx.lineTo(tx + 11, -h / 2 + 4);
      ctx.lineTo(Math.min(w / 2, tx + 22), -h / 2 + 12);
    }
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Garis buku tipis
    ctx.strokeStyle = "rgba(66, 118, 168, 0.18)";
    ctx.lineWidth = 1.5;
    for (let ly = -h / 2 + 54; ly < h / 2 - 22; ly += 42) {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 24, ly);
      ctx.lineTo(w / 2 - 24, ly);
      ctx.stroke();
    }

    // Washi tape miring di kiri & kanan atas
    ctx.save();
    ctx.translate(-w / 2 + 42, -h / 2 + 8);
    ctx.rotate(-0.24);
    ctx.fillStyle = tapeColor;
    ctx.fillRect(-46, -13, 92, 26);
    ctx.restore();
  } else if (v === 1) {
    // Gaya 1: Dog-Eared Index Card (Sudut Kanan Atas Terlipat) + Peniti Merah
    const fold = 38;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2 - fold, -h / 2);
    ctx.lineTo(w / 2, -h / 2 + fold);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Segitiga lipatan sudut
    ctx.fillStyle = "#e6d5bc";
    ctx.beginPath();
    ctx.moveTo(w / 2 - fold, -h / 2);
    ctx.lineTo(w / 2 - fold, -h / 2 + fold);
    ctx.lineTo(w / 2, -h / 2 + fold);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Paku pin bulat di tengah atas
    ctx.fillStyle = "#c83e32";
    ctx.beginPath();
    ctx.arc(0, -h / 2 + 12, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(-4, -h / 2 + 8, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (v === 2) {
    // Gaya 2: Grid Engineer Memo + Dua Selotip Sudut
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    ctx.strokeStyle = "rgba(45, 106, 110, 0.13)";
    ctx.lineWidth = 1.2;
    for (let gx = -w / 2 + 28; gx < w / 2; gx += 32) {
      ctx.beginPath();
      ctx.moveTo(gx, -h / 2 + 10);
      ctx.lineTo(gx, h / 2 - 10);
      ctx.stroke();
    }
    for (let gy = -h / 2 + 28; gy < h / 2; gy += 32) {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 10, gy);
      ctx.lineTo(w / 2 - 10, gy);
      ctx.stroke();
    }

    ctx.fillStyle = tapeColor;
    ctx.fillRect(-72, -h / 2 - 14, 144, 28);
  } else if (v === 3) {
    // Gaya 3: Kertas Diary Berbingkai Ganda + Paperclip Metalik di Kiri Atas
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "rgba(168, 66, 50, 0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
    ctx.setLineDash([]);

    // Paperclip di atas kiri
    ctx.strokeStyle = "#6e7681";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 48, -h / 2 - 18, 22, 52, 10);
    ctx.stroke();
  } else {
    // Gaya 4: Kartu Pos Kraft Vintage + Segel Lilin Kecil
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    drawWaxSeal(ctx, w / 2 - 42, -h / 2 + 12, 22, "#9e2a2b");
  }
}

/**
 * Tekstur halaman Buku Kenangan 1024x1280 bergaya DIY Scrapbook Ring-Binder Kreatif
 * Memiliki 12 Tema Visual Berbeda + Tata Letak Kotak Teks Acak di Setiap Halaman +
 * Font Tulisan Tangan Asli (Caveat) + Stiker Meme Perpisahan Lucu di Setiap Lembar.
 */
export function createBookPageTexture(
  page: BookPageData,
  renderer?: THREE.WebGLRenderer | null
) {
  const width = 1024;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const handFont = getHandwritingFont();

  const isLeftPage = page.pageNumber % 2 === 1;
  const rand = seededRandom(page.decorSeed || page.pageNumber * 97);
  const spreadNumber = Math.floor((page.pageNumber - 1) / 2);

  // 12 Tema DIY Scrapbook Berbeda
  const themeIdx = (spreadNumber + (isLeftPage ? 0 : 1)) % 12;
  const photoLayout = (spreadNumber + Math.floor((page.decorSeed || 1) / 13)) % 5;
  const msgLayout = (spreadNumber + Math.floor((page.decorSeed || 1) / 7)) % 4;

  // Warna tinta pena tulisan tangan yang bervariasi alami
  const penInks = ["#182542", "#241409", "#3b1712", "#142e24"];

  // 1. Latar Kertas Berdasarkan 12 Tema Scrapbook
  switch (themeIdx) {
    case 0: {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#c89f72");
      grad.addColorStop(0.5, "#be9364");
      grad.addColorStop(1, "#b08455");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(252, 246, 236, 0.34)";
      for (let i = 0; i < 45; i++) {
        ctx.beginPath();
        ctx.arc(rand() * width, rand() * height, 2 + rand() * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 1: {
      ctx.fillStyle = "#f2c86b";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 244, 212, 0.58)";
      for (let py = 44; py < height; py += 68) {
        for (let px = 44; px < width; px += 68) {
          const offset = (Math.floor(py / 68) % 2) * 34;
          ctx.beginPath();
          ctx.arc(px + offset, py, 20, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = "#fcf7ec";
      ctx.fillRect(68, 92, width - 136, height - 184);
      break;
    }
    case 2: {
      ctx.fillStyle = "#1a2b42";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#f5efe2";
      ctx.fillRect(66, 88, width - 132, height - 176);
      ctx.strokeStyle = "rgba(70, 108, 145, 0.2)";
      ctx.lineWidth = 1.5;
      for (let gx = 66; gx < width - 66; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 88);
        ctx.lineTo(gx, height - 88);
        ctx.stroke();
      }
      for (let gy = 88; gy < height - 88; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(66, gy);
        ctx.lineTo(width - 66, gy);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(250, 243, 228, 0.75)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(36, 36, width - 72, height - 72);
      ctx.setLineDash([]);
      break;
    }
    case 3: {
      ctx.fillStyle = "#7a9478";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#faf6ec";
      ctx.fillRect(64, 84, width - 128, height - 168);
      ctx.strokeStyle = "rgba(78, 107, 76, 0.25)";
      ctx.lineWidth = 2;
      ctx.strokeRect(78, 98, width - 156, height - 196);
      break;
    }
    case 4: {
      ctx.fillStyle = "#cb6a47";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#fdf7ed";
      ctx.fillRect(68, 92, width - 136, height - 184);
      for (let x = 96; x < width - 96; x += 48) {
        ctx.fillStyle = "#f2c86b";
        ctx.beginPath();
        ctx.moveTo(x, 46);
        ctx.lineTo(x + 14, 62);
        ctx.lineTo(x, 78);
        ctx.lineTo(x - 14, 62);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 5: {
      ctx.fillStyle = "#f7eedb";
      ctx.fillRect(0, 0, width, height);
      const stripeW = 36;
      for (let i = 0; i < (width + height) / stripeW; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#b83b32" : "#284b7a";
        ctx.fillRect(i * stripeW, 0, stripeW * 0.55, 24);
        ctx.fillRect(i * stripeW, height - 24, stripeW * 0.55, 24);
        ctx.fillRect(0, i * stripeW, 24, stripeW * 0.55);
        ctx.fillRect(width - 24, i * stripeW, 24, stripeW * 0.55);
      }
      ctx.fillStyle = "#fdf8ee";
      ctx.fillRect(58, 58, width - 116, height - 116);
      break;
    }
    case 6: {
      ctx.fillStyle = "#221c18";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#f2e5ce";
      for (let fx = 48; fx < width - 48; fx += 46) {
        ctx.fillRect(fx, 18, 26, 18);
        ctx.fillRect(fx, height - 36, 26, 18);
      }
      ctx.fillStyle = "#f6ecdc";
      ctx.fillRect(62, 68, width - 124, height - 136);
      break;
    }
    case 7: {
      ctx.fillStyle = "#f4e1dc";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(212, 128, 136, 0.24)";
      for (let x = 0; x < width; x += 48) {
        ctx.fillRect(x, 0, 24, height);
      }
      for (let y = 0; y < height; y += 48) {
        ctx.fillRect(0, y, width, 24);
      }
      ctx.fillStyle = "#fffdf9";
      ctx.fillRect(70, 88, width - 140, height - 176);
      break;
    }
    case 8: {
      ctx.fillStyle = "#fcf7eb";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(66, 118, 168, 0.24)";
      ctx.lineWidth = 2;
      for (let y = 140; y < height - 90; y += 46) {
        ctx.beginPath();
        ctx.moveTo(56, y);
        ctx.lineTo(width - 56, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(204, 68, 68, 0.48)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(124, 56);
      ctx.lineTo(124, height - 56);
      ctx.stroke();
      break;
    }
    case 9: {
      ctx.fillStyle = "#26595c";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#faf3e3";
      ctx.fillRect(66, 86, width - 132, height - 172);
      ctx.strokeStyle = "rgba(38, 89, 92, 0.22)";
      ctx.lineWidth = 2;
      for (let y = 130; y < height - 110; y += 64) {
        ctx.beginPath();
        ctx.moveTo(86, y);
        ctx.quadraticCurveTo(width / 2, y + 14, width - 86, y);
        ctx.stroke();
      }
      break;
    }
    case 10: {
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        80,
        width / 2,
        height / 2,
        width * 0.75
      );
      grad.addColorStop(0, "#fdf6e6");
      grad.addColorStop(0.7, "#ecd9b8");
      grad.addColorStop(1, "#d9bf96");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(128, 78, 36, 0.18)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(width - 170, 210, 78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width - 166, 214, 84, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    default: {
      ctx.fillStyle = "#faf4e6";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(110, 86, 60, 0.26)";
      for (let gy = 130; gy < height - 96; gy += 36) {
        for (let gx = 84; gx < width - 84; gx += 36) {
          ctx.beginPath();
          ctx.arc(gx, gy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      drawBuntingFlags(ctx, width, 68);
      break;
    }
  }

  // Bingkai dalam dekoratif
  ctx.strokeStyle =
    themeIdx === 2 || themeIdx === 6 || themeIdx === 9
      ? "#d99b4e"
      : "rgba(92, 64, 38, 0.42)";
  ctx.lineWidth = 3;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  if (page.type === "toc") {
    drawBuntingFlags(ctx, width, 64);
    drawRansomWord(
      ctx,
      isLeftPage ? "MEMORIES" : "UNO PPLG",
      isLeftPage ? 225 : 235,
      128,
      46
    );

    ctx.fillStyle = "#1f1208";
    ctx.font = `700 50px ${handFont}`;
    ctx.textAlign = "center";
    ctx.fillText("Daftar Isi Buku Kenangan UNO · XII PPLG 1", width / 2, 204);

    ctx.fillStyle = "#8c3b2b";
    ctx.font = `700 32px ${handFont}`;
    ctx.fillText("MAKN Ende · Angkatan 2024—2027", width / 2, 246);

    ctx.textAlign = "left";
    const entries = page.tocEntries ?? [];
    entries.forEach((entry, idx) => {
      const y = 304 + idx * 64;
      if (y > height - 220) return;

      const rowTilt = ((idx % 3) - 1) * 0.008;
      const rowShiftX = ((idx * 17) % 24) - 12;

      ctx.save();
      ctx.translate(width / 2 + rowShiftX, y - 16);
      ctx.rotate(rowTilt);

      ctx.fillStyle =
        idx % 2 === 0 ? "rgba(255, 252, 245, 0.94)" : "rgba(244, 232, 209, 0.94)";
      ctx.fillRect(-(width - 180) / 2, -26, width - 180, 52);
      ctx.strokeStyle = "rgba(92, 64, 38, 0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-(width - 180) / 2, -26, width - 180, 52);

      ctx.fillStyle = penInks[idx % penInks.length]!;
      ctx.font = `700 35px ${handFont}`;
      ctx.textAlign = "left";
      ctx.fillText(
        `${String(entry.spreadIndex).padStart(2, "0")}. ${entry.name.slice(0, 26)}`,
        -(width - 216) / 2,
        10
      );

      ctx.textAlign = "right";
      ctx.fillStyle = "#a84232";
      ctx.font = `700 30px ${handFont}`;
      ctx.fillText(`Hal. ${entry.spreadIndex * 2} →`, (width - 216) / 2, 10);
      ctx.restore();
    });

    drawPressedFlower(ctx, 118, 134, 34, "#f7f3e8", "#d99b4e", 8);
    drawScrapbookButterfly(ctx, width - 122, 138, 0.95, 0.28, "#d99b4e", "#8c4a27");

    // Stiker Meme Perpisahan Lucu di bagian bawah Daftar Isi
    drawFarewellMemeSticker(
      ctx,
      isLeftPage ? width - 250 : 250,
      height - 168,
      0.92,
      isLeftPage ? -0.05 : 0.05,
      isLeftPage ? 0 : 7
    );
  } else if (page.type === "student-left") {
    // Ornamen atas sesuai variasi layout siswa (5 gaya berbeda)
    if (photoLayout === 0) {
      ctx.save();
      ctx.translate(width - 235, 138);
      ctx.rotate(0.06);
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(-130, -48, 260, 96);
      ctx.strokeStyle = "#f5efe2";
      ctx.lineWidth = 3;
      ctx.strokeRect(-130, -48, 260, 96);
      ctx.fillStyle = "#c86d3b";
      ctx.fillRect(-114, -32, 56, 56);
      ctx.fillStyle = "#fbf6ec";
      ctx.font = `700 24px ${handFont}`;
      ctx.textAlign = "left";
      ctx.fillText("UNO · XII PPLG 1 Track", -46, -8);
      ctx.font = `700 20px ${handFont}`;
      ctx.fillStyle = "#d6c7b2";
      ctx.fillText("MAKN Ende — Memories", -46, 16);
      ctx.fillStyle = "#fbf6ec";
      ctx.fillRect(-46, 26, 150, 4);
      ctx.restore();
      drawRibbonBow(ctx, 210, 130, 0.95, "#f09cb0");
    } else if (photoLayout === 1) {
      drawCassetteSticker(
        ctx,
        215,
        136,
        -0.08,
        (page.studentNickname || "UNO").toUpperCase()
      );
      drawRansomWord(ctx, "US CORE", width - 365, 126, 36);
    } else if (photoLayout === 2) {
      drawPostageStamp(ctx, width - 170, 148, 0.1, "#2d6a6e", `ABSEN #${spreadNumber}`);
      drawWaxSeal(ctx, 168, 142, 38, "#9e2a2b");
    } else if (photoLayout === 3) {
      drawBuntingFlags(ctx, width, 72);
      drawScrapbookButterfly(ctx, 165, 158, 0.9, -0.22, "#e0a958", "#8c3b2b");
    } else {
      ctx.save();
      ctx.translate(width - 220, 134);
      ctx.rotate(0.08);
      ctx.fillStyle = "#b08455";
      ctx.beginPath();
      ctx.ellipse(0, 0, 132, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2b190d";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#2b190d";
      ctx.font = `700 32px ${handFont}`;
      ctx.textAlign = "center";
      ctx.fillText("★ Sahabat Sejati ★", 0, 10);
      ctx.restore();
      drawRibbonBow(ctx, 195, 132, 0.92, "#7ab8c8");
    }

    // BINGKAI FOTO POTRET SISWA (5 Variasi Bentuk + Posisi & Kemiringan Acak per Siswa)
    const portraitPalettes = [
      "#2d6a6e",
      "#8c3b2b",
      "#3b593f",
      "#6b4c35",
      "#3a4f7a",
      "#944e3b",
    ];
    const portraitBg =
      portraitPalettes[(spreadNumber + photoLayout) % portraitPalettes.length]!;

    const photoShiftX = (rand() - 0.5) * 76;
    const photoRot = (rand() - 0.5) * 0.11;

    ctx.save();
    ctx.translate(width / 2 + photoShiftX, 345);
    ctx.rotate(photoRot);

    if (photoLayout === 1) {
      ctx.fillStyle = "#fcf6e8";
      ctx.beginPath();
      ctx.ellipse(0, -10, 200, 208, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3a2415";
      ctx.beginPath();
      ctx.ellipse(0, -10, 186, 194, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = portraitBg;
      ctx.beginPath();
      ctx.ellipse(0, -10, 160, 168, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(243, 202, 130, 0.3)";
      ctx.beginPath();
      ctx.arc(0, -35, 80, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fbf6ec";
      ctx.beginPath();
      ctx.arc(0, -54, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 70, 82, 68, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#fffdf7";
      ctx.fillRect(-160, 140, 320, 54);
      ctx.strokeStyle = "#2b190d";
      ctx.lineWidth = 3;
      ctx.strokeRect(-160, 140, 320, 54);
      ctx.fillStyle = "#170d05";
      ctx.textAlign = "center";
      ctx.font = `700 42px ${handFont}`;
      ctx.fillText(`✦ ${page.studentNickname || "Sahabat"} ✦`, 0, 179);
    } else if (photoLayout === 2) {
      ctx.fillStyle = "#181412";
      ctx.fillRect(-205, -195, 410, 395);
      ctx.strokeStyle = "#e0a958";
      ctx.lineWidth = 3;
      ctx.strokeRect(-205, -195, 410, 395);

      ctx.fillStyle = "#fbf5e8";
      for (let sy = -172; sy <= 168; sy += 36) {
        ctx.fillRect(-192, sy, 16, 20);
        ctx.fillRect(176, sy, 16, 20);
      }

      ctx.fillStyle = portraitBg;
      ctx.fillRect(-158, -168, 316, 280);

      ctx.fillStyle = "#fbf6ec";
      ctx.beginPath();
      ctx.arc(0, -60, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 72, 90, 76, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#f3ca82";
      ctx.textAlign = "center";
      ctx.font = `700 38px ${handFont}`;
      ctx.fillText(`KODAK 400 · ${page.studentNickname || "UNO"}`, 0, 164);
    } else if (photoLayout === 3) {
      ctx.fillStyle = "#f6ebd8";
      ctx.fillRect(-192, -195, 384, 395);
      ctx.strokeStyle = "#6e4e32";
      ctx.lineWidth = 3;
      ctx.strokeRect(-192, -195, 384, 395);

      ctx.fillStyle = portraitBg;
      ctx.fillRect(-162, -168, 324, 280);

      ctx.fillStyle = "#1c1510";
      const corners: [number, number, number, number][] = [
        [-168, -174, 1, 1],
        [168, -174, -1, 1],
        [-168, 118, 1, -1],
        [168, 118, -1, -1],
      ];
      corners.forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + sx * 42, cy);
        ctx.lineTo(cx, cy + sy * 42);
        ctx.closePath();
        ctx.fill();
      });

      ctx.fillStyle = "#fbf6ec";
      ctx.beginPath();
      ctx.arc(0, -58, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 74, 92, 78, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#170d05";
      ctx.textAlign = "center";
      ctx.font = `700 44px ${handFont}`;
      ctx.fillText(`"${page.studentNickname || "Sahabat"}"`, 0, 168);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-188, -195, 376, 395);
      ctx.strokeStyle = "#8c6d46";
      ctx.lineWidth = 4;
      ctx.strokeRect(-188, -195, 376, 395);

      ctx.fillStyle =
        photoLayout === 0 ? "rgba(200, 109, 59, 0.8)" : "rgba(45, 106, 110, 0.78)";
      ctx.fillRect(-100, -220, 200, 36);

      ctx.fillStyle = portraitBg;
      ctx.fillRect(-160, -168, 320, 278);

      ctx.fillStyle = "rgba(243, 202, 130, 0.28)";
      ctx.beginPath();
      ctx.arc(0, -45, 88, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fbf6ec";
      ctx.beginPath();
      ctx.arc(0, -60, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 74, 92, 78, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#170d05";
      ctx.textAlign = "center";
      ctx.font = `700 44px ${handFont}`;
      ctx.fillText(`★ ${page.studentNickname || "Sahabat"} ★`, 0, 166);
    }
    ctx.restore();

    // KOTAK NAMA SISWA DENGAN POSISI & KEMIRINGAN ACAK
    const nameShiftX = (rand() - 0.5) * 68;
    const nameRot = (rand() - 0.5) * 0.065;
    ctx.save();
    ctx.translate(width / 2 + nameShiftX, 622);
    ctx.rotate(nameRot);

    const nameBoxW = width - 210 - Math.floor(rand() * 50);
    ctx.fillStyle = themeIdx % 2 === 0 ? "#fffdf7" : "#231912";
    ctx.fillRect(-nameBoxW / 2, -54, nameBoxW, 108);
    ctx.strokeStyle = "#d99b4e";
    ctx.lineWidth = 3.5;
    ctx.strokeRect(-nameBoxW / 2, -54, nameBoxW, 108);

    ctx.textAlign = "center";
    ctx.fillStyle = themeIdx % 2 === 0 ? "#140b04" : "#fbf5e8";
    ctx.font = `700 50px ${handFont}`;
    ctx.fillText(page.studentName || "Siswa XII PPLG 1", 0, -4);

    ctx.fillStyle = themeIdx % 2 === 0 ? "#a84232" : "#f3ca82";
    ctx.font = `700 31px ${handFont}`;
    ctx.fillText(
      page.studentRole || "Pengembangan Perangkat Lunak & Gim",
      0,
      38
    );
    ctx.restore();

    // KOTAK BIO SISWA DENGAN TATA LETAK, BENTUK KERTAS & KEMIRINGAN ACAK
    const bioShiftX = (rand() - 0.5) * 74;
    const bioRot = (rand() - 0.5) * 0.075;
    const bioW = width - 190 - Math.floor(rand() * 65);
    const bioH = 268;
    const bioVariant = spreadNumber + Math.floor(rand() * 5);
    const bioPapers = ["#fffaf0", "#fef9e7", "#f4fbf7", "#fdf2e9", "#f8f4ec"];

    ctx.save();
    ctx.translate(width / 2 + bioShiftX, 845);
    ctx.rotate(bioRot);

    drawRandomScrapbookBox(
      ctx,
      bioW,
      bioH,
      bioVariant,
      bioPapers[bioVariant % bioPapers.length]!,
      "rgba(200, 109, 59, 0.65)"
    );

    ctx.fillStyle = penInks[spreadNumber % penInks.length]!;
    ctx.font = `700 42px ${handFont}`;
    ctx.textAlign = "center";
    const bioWords = (
      page.studentBio ||
      "Terima kasih untuk tiga tahun cerita dan persaudaraan hangat di MAKN Ende."
    ).split(" ");
    let line = "";
    let y = -58;
    for (const w of bioWords) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > bioW - 72) {
        ctx.fillText(line, 0, y);
        line = w;
        y += 50;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 0, y);

    if (page.studentTags && page.studentTags.length > 0) {
      ctx.fillStyle = "#a84232";
      ctx.font = `700 28px ${handFont}`;
      ctx.fillText(
        `#${page.studentTags.join("   #")}`,
        0,
        bioH / 2 - 24
      );
    }
    ctx.restore();

    // STIKER MEME PERPISAHAN LUCU DI SETIAP HALAMAN KIRI
    const leftMemeX = spreadNumber % 2 === 0 ? 235 : width - 235;
    const leftMemeRot = spreadNumber % 2 === 0 ? -0.065 : 0.065;
    drawFarewellMemeSticker(
      ctx,
      leftMemeX,
      1088,
      0.92,
      leftMemeRot,
      spreadNumber * 2 + 1
    );

    // Bunga & Kupu-kupu di sudut berlawanan dari meme sticker
    drawPressedFlower(
      ctx,
      spreadNumber % 2 === 0 ? width - 145 : 145,
      1085,
      36,
      "#e08499",
      "#f9d466",
      7
    );
  } else {
    // HALAMAN KANAN: SURAT & CATATAN SAHABAT DENGAN KOTAK TEKS ACAK + TULISAN TANGAN + STIKER MEME
    const headerWords = ["FRIENDS", "MEMORIES", "OUR CORE", "UNO PPLG"];
    const hdrShift = (rand() - 0.5) * 40;
    drawRansomWord(
      ctx,
      headerWords[msgLayout % headerWords.length]!,
      104 + hdrShift,
      106,
      38
    );

    ctx.save();
    ctx.translate(650, 108);
    ctx.rotate((rand() - 0.5) * 0.06);
    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(-210, -32, 420, 64);
    ctx.strokeStyle = "#2b190d";
    ctx.lineWidth = 3;
    ctx.strokeRect(-210, -32, 420, 64);

    ctx.fillStyle = "#1f1208";
    ctx.font = `700 38px ${handFont}`;
    ctx.textAlign = "center";
    ctx.fillText(
      `Surat Sahabat utk ${page.studentNickname || page.studentName || "Kamu"} ♥`,
      0,
      11
    );
    ctx.restore();

    const msgs = page.messages ?? [];
    const boxPalettes = [
      ["#fffdf5", "#f3faf7", "#fdf4ed"],
      ["#fef9e7", "#f5eef8", "#e8f8f5"],
      ["#fdf2e9", "#eaf2f8", "#f9ebea"],
      ["#fcf8e8", "#eef6f0", "#f8efe6"],
    ];
    const boxColors = boxPalettes[msgLayout % boxPalettes.length]!;
    const tapeColors = [
      "rgba(200, 109, 59, 0.68)",
      "rgba(45, 106, 110, 0.64)",
      "rgba(168, 66, 50, 0.64)",
    ];

    let curY = 172;
    if (msgs.length === 0) {
      const boxW = width - 230;
      const boxH = 248;
      ctx.save();
      ctx.translate(width / 2, curY + boxH / 2 + 40);
      ctx.rotate((rand() - 0.5) * 0.05);
      drawRandomScrapbookBox(
        ctx,
        boxW,
        boxH,
        msgLayout,
        boxColors[0]!,
        tapeColors[0]!
      );
      ctx.textAlign = "center";
      ctx.fillStyle = "#6e5a47";
      ctx.font = `700 40px ${handFont}`;
      ctx.fillText(
        "Belum ada pesan kenangan di database",
        0,
        -12
      );
      ctx.fillText(
        "untuk halaman sahabat ini.",
        0,
        42
      );
      ctx.restore();
    }
    msgs.slice(0, 3).forEach((m, idx) => {
      const mRand = seededRandom((m.seed || 101) + idx * 53 + page.pageNumber * 17);
      // Setiap kotak teks memiliki lebar, posisi horizontal, dan sudut kemiringan acak yang unik!
      const boxW = width - 210 - Math.floor(mRand() * 90);
      const boxH = 248;
      const offsetX = (mRand() - 0.5) * 110;
      const rot = (mRand() - 0.5) * 0.095;
      const styleVariant = Math.floor(mRand() * 5) + idx;

      ctx.save();
      ctx.translate(width / 2 + offsetX, curY + boxH / 2);
      ctx.rotate(rot);

      drawRandomScrapbookBox(
        ctx,
        boxW,
        boxH,
        styleVariant,
        boxColors[idx % boxColors.length]!,
        tapeColors[(idx + msgLayout) % tapeColors.length]!
      );

      // Teks Pesan Sahabat dengan Font Tulisan Tangan Asli (Bukan Ketikan)
      ctx.textAlign = "left";
      ctx.fillStyle = penInks[(idx + spreadNumber) % penInks.length]!;
      ctx.font = `700 40px ${handFont}`;
      const words = m.text.split(" ");
      let line = "";
      let ly = -boxH / 2 + 66;
      const maxLineW = boxW - 68;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxLineW) {
          ctx.fillText(line, -boxW / 2 + 34, ly);
          line = w;
          ly += 46;
          if (ly > boxH / 2 - 54) break;
        } else {
          line = test;
        }
      }
      if (line && ly <= boxH / 2 - 54) {
        ctx.fillText(line, -boxW / 2 + 34, ly);
      }

      // Nama Pengirim dengan Tulisan Tangan Miring di Sudut Kanan Bawah Kotak
      ctx.fillStyle = "#a84232";
      ctx.font = `700 32px ${handFont}`;
      ctx.textAlign = "right";
      ctx.fillText(`~ Dari: ${m.author} ♥`, boxW / 2 - 28, boxH / 2 - 22);
      ctx.restore();

      curY += 282;
    });

    // STIKER MEME PERPISAHAN LUCU DI SETIAP HALAMAN KANAN
    const rightMemeX = spreadNumber % 2 === 0 ? width - 245 : 245;
    const rightMemeRot = spreadNumber % 2 === 0 ? 0.055 : -0.055;
    drawFarewellMemeSticker(
      ctx,
      rightMemeX,
      1092,
      0.94,
      rightMemeRot,
      spreadNumber * 2 + 2
    );

    if (msgLayout % 2 === 0) {
      drawScrapbookButterfly(
        ctx,
        spreadNumber % 2 === 0 ? 140 : width - 140,
        1088,
        0.9,
        0.28,
        "#d99b4e",
        "#2d6a6e"
      );
    } else {
      drawPostageStamp(
        ctx,
        spreadNumber % 2 === 0 ? 150 : width - 150,
        1085,
        -0.1,
        "#8c3b2b",
        `HAL #${page.pageNumber}`
      );
    }
  }

  // Lubang 6 Ring Binder di tepi punggung tengah
  drawBinderHoles(ctx, isLeftPage, height);

  // Nomor halaman dengan tulisan tangan di bagian bawah
  ctx.fillStyle = "#2b190d";
  ctx.fillRect(width / 2 - 165, height - 92, 330, 42);
  ctx.fillStyle = "#fbf5e8";
  ctx.font = `700 28px ${handFont}`;
  ctx.textAlign = "center";
  ctx.fillText(
    `~ Lembar ${page.pageNumber} · UNO Scrapbook ~`,
    width / 2,
    height - 62
  );

  return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
}


/**
 * Tekstur layar laptop anti-silau resolusi tinggi (1024x640) di scene Hero
 */
export function createLaptopScreenTexture(
  cursorOn: boolean,
  renderer?: THREE.WebGLRenderer | null
) {
  const width = 1024;
  const height = 640;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Latar belakang editor gelap pekat (anti-silau)
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, width, height);

  // Bingkai dalam tipis
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Header bar IDE
  ctx.fillStyle = "#161b22";
  ctx.fillRect(4, 4, width - 8, 64);

  // Tiga tombol jendela
  ctx.fillStyle = "#ff5f56";
  ctx.beginPath();
  ctx.arc(38, 36, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffbd2e";
  ctx.beginPath();
  ctx.arc(72, 36, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#27c93f";
  ctx.beginPath();
  ctx.arc(106, 36, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 26px monospace";
  ctx.fillText("kenangan-xii-pplg-1.tsx — MAKN Ende", 148, 45);

  const lines = [
    { color: "#ffab70", text: "const kelas = 'XII PPLG 1';" },
    { color: "#79c0ff", text: "const madrasah = 'MAKN Ende';" },
    { color: "#a5d6ff", text: "const waliKelas = 'Ibu Hajra, S.Pd.';" },
    { color: "#f0f6fc", text: "const anggota = { aktif: 22, sahabat: 2 };" },
    { color: "#8b949e", text: "// Terima kasih untuk 3 tahun cerita" },
    { color: "#7ee787", text: "function simpanKenangan(momen) {" },
    { color: "#f0f6fc", text: "  return momen.filter(m => m.hangat);" },
    { color: "#7ee787", text: "}" },
    {
      color: "#ffa657",
      text: `export default simpanKenangan(kita);${cursorOn ? " █" : ""}`,
    },
  ];

  ctx.font = "bold 31px monospace";
  lines.forEach((l, i) => {
    const y = 128 + i * 56;
    ctx.fillStyle = "#6e7681";
    ctx.fillText(String(i + 1).padStart(2, "0"), 32, y);
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, 96, y);
  });

  return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
}

