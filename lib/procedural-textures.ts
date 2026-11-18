import * as THREE from "three";
import { decodeDeepText, decodeHtmlEntities } from "@/lib/domain-logic";
import {
  CLASS_META,
  ensureAlbumFontsLoaded,
  getAlbumArsipFont,
  getAlbumBodyFont,
  getAlbumDisplayFont,
  getAlbumTulisFont,
} from "@/lib/class-meta";

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
 * Tekstur kayu monokrom arsip (albedo + bump) untuk aksesoris buku & papan tulis darkroom.
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
    warm: ["#4A4843", "#3D3D3A", "#5C5A54"],
    dark: ["#2A2A28", "#1C1C1A", "#32322F"],
    light: ["#8E8B82", "#7D7A72", "#A8A49B"],
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
    ctx.fillStyle = rand() > 0.5 ? `rgba(22,22,20,${alpha})` : `rgba(232,229,220,${alpha * 0.55})`;
    ctx.fillRect(0, y, size, h);

    bCtx.fillStyle = rand() > 0.5 ? `rgba(60,60,60,0.22)` : `rgba(195,195,195,0.22)`;
    bCtx.fillRect(0, y, size, h);
  }

  // Serat melengkung halus
  ctx.strokeStyle = "rgba(22, 22, 20, 0.16)";
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
 * Tekstur kain sampul Buku Kenangan dengan tenun ikat Ende, emboss judul & 1 Foto Bersama XII PPLG 1
 */
export function createBookCoverTextures(
  renderer?: THREE.WebGLRenderer | null,
  coverPhotoUrl?: string,
  coverCaption?: string
) {
  const width = 1024;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const handFont = getHandwritingFont();

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext("2d")!;

  // Warna dasar kain linen arang / monokrom film jadul
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#242422");
  grad.addColorStop(0.5, "#2C2C29");
  grad.addColorStop(1, "#181816");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  bCtx.fillStyle = "#787878";
  bCtx.fillRect(0, 0, width, height);

  // Serat tenun silang perak lembut
  ctx.strokeStyle = "rgba(232, 229, 220, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < Math.max(width, height); i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Bingkai cetak perak ganda sampul
  ctx.strokeStyle = "#C9C4B8";
  ctx.lineWidth = 6;
  ctx.strokeRect(52, 52, width - 104, height - 104);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(66, 66, width - 132, height - 132);

  // Ornamen berlian arsip di atas dan bawah
  for (let x = 106; x < width - 106; x += 48) {
    ctx.fillStyle = "#A8A49B";
    ctx.beginPath();
    ctx.moveTo(x, 96);
    ctx.lineTo(x + 14, 108);
    ctx.lineTo(x, 120);
    ctx.lineTo(x - 14, 108);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, height - 120);
    ctx.lineTo(x + 14, height - 108);
    ctx.lineTo(x, height - 96);
    ctx.lineTo(x - 14, height - 108);
    ctx.closePath();
    ctx.fill();
  }

  // Judul timbul di bagian atas sampul (Old Standard TT + Source Serif 4 + Special Elite)
  ctx.fillStyle = "#E8E5DC";
  ctx.textAlign = "center";
  ctx.font = `700 22px ${getMonoFont()}`;
  ctx.fillText("✦ ALBUM MEMORI MADRASAH · UNO ✦", width / 2, 185);

  ctx.font = `700 72px ${handFont}`;
  ctx.fillText("Kenangan", width / 2, 275);
  ctx.fillText("XII PPLG 1", width / 2, 362);

  ctx.font = `600 28px ${getSansFont()}`;
  ctx.fillStyle = "#C9C4B8";
  ctx.fillText(`MAKN Ende · Flores, NTT (${CLASS_META.yearPlaceholder})`, width / 2, 415);

  // BINGKAI 1 FOTO BERSAMA DI TENGAH SAMPUL DEPAN
  const frameW = 680;
  const frameH = 560;
  const frameX = (width - frameW) / 2;
  const frameY = 468;
  const photoPad = 28;
  const photoX = frameX + photoPad;
  const photoY = frameY + photoPad;
  const photoW = frameW - photoPad * 2;
  const photoH = 415;

  const drawCoverPhotoFrame = (loadedImg?: HTMLImageElement) => {
    ctx.save();
    // Bayangan kertas foto di sampul
    ctx.fillStyle = "rgba(18, 18, 17, 0.45)";
    ctx.fillRect(frameX + 10, frameY + 14, frameW, frameH);

    // Kertas foto arsip off-white
    ctx.fillStyle = "#F3F1EA";
    ctx.fillRect(frameX, frameY, frameW, frameH);
    ctx.strokeStyle = "#8E8B82";
    ctx.lineWidth = 4;
    ctx.strokeRect(frameX + 4, frameY + 4, frameW - 8, frameH - 8);

    // Area Foto Bersama (filter monokrom film jadul)
    if (loadedImg) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(photoX, photoY, photoW, photoH);
      ctx.clip();
      const iw = loadedImg.naturalWidth || loadedImg.width || photoW;
      const ih = loadedImg.naturalHeight || loadedImg.height || photoH;
      const sc = Math.max(photoW / iw, photoH / ih);
      const dw = iw * sc;
      const dh = ih * sc;
      ctx.filter = "saturate(46%) contrast(92%) brightness(104%) sepia(20%)";
      ctx.drawImage(
        loadedImg,
        photoX + (photoW - dw) / 2,
        photoY + (photoH - dh) / 2,
        dw,
        dh
      );
      ctx.filter = "none";
      ctx.restore();
    } else {
      // Ilustrasi silver-gelatin Foto Bersama Satu Kelas XII PPLG 1 bila belum ada foto diupload
      const pGrad = ctx.createLinearGradient(photoX, photoY, photoX, photoY + photoH);
      pGrad.addColorStop(0, "#7D7A72");
      pGrad.addColorStop(0.55, "#A8A49B");
      pGrad.addColorStop(1, "#3D3D3A");
      ctx.fillStyle = pGrad;
      ctx.fillRect(photoX, photoY, photoW, photoH);

      // Cahaya film analog
      ctx.fillStyle = "rgba(243, 241, 234, 0.85)";
      ctx.beginPath();
      ctx.arc(photoX + photoW * 0.5, photoY + photoH * 0.34, 62, 0, Math.PI * 2);
      ctx.fill();

      // Barisan siluet kebersamaan siswa-siswi XII PPLG 1
      const count = 9;
      for (let i = 0; i < count; i++) {
        const px = photoX + 68 + (i * (photoW - 136)) / (count - 1);
        const py = photoY + photoH - 58 - (i % 2) * 14;
        ctx.fillStyle = i % 2 === 0 ? "#1B1B1A" : "#2A2A28";
        ctx.beginPath();
        ctx.arc(px, py - 52, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px, py + 18, 34, 52, 0, Math.PI, 0, false);
        ctx.fill();
      }
    }

    // Bingkai dalam foto & siku foto arsip di 4 sudut
    ctx.strokeStyle = "#5C5A54";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(photoX, photoY, photoW, photoH);

    ctx.fillStyle = "#4A4843";
    const corners: [number, number, number, number][] = [
      [photoX - 4, photoY - 4, 1, 1],
      [photoX + photoW + 4, photoY - 4, -1, 1],
      [photoX - 4, photoY + photoH + 4, 1, -1],
      [photoX + photoW + 4, photoY + photoH + 4, -1, -1],
    ];
    corners.forEach(([cx, cy, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + sx * 36, cy);
      ctx.lineTo(cx, cy + sy * 36);
      ctx.closePath();
      ctx.fill();
    });

    // Selotip arsip di atas bingkai foto bersama
    ctx.save();
    ctx.translate(width / 2, frameY - 4);
    ctx.rotate(-0.03);
    ctx.fillStyle = "rgba(168, 164, 155, 0.78)";
    ctx.fillRect(-115, -16, 230, 32);
    ctx.restore();

    // Caption Editorial di bawah Foto Bersama pada Sampul (Old Standard TT + Source Serif 4)
    ctx.fillStyle = "#1B1B1A";
    ctx.font = `700 30px ${handFont}`;
    ctx.textAlign = "center";
    const cap =
      coverCaption && coverCaption.trim().length > 0
        ? coverCaption.trim().slice(0, 42)
        : "Keluarga Besar UNO · XII PPLG 1";
    ctx.fillText(`★ ${cap} ★`, width / 2, photoY + photoH + 54);

    ctx.fillStyle = "#5C5A54";
    ctx.font = `600 22px ${getSansFont()}`;
    ctx.fillText(
      "Satu Atap, Satu Cerita, Selamanya Saudara ♥",
      width / 2,
      photoY + photoH + 92
    );
    ctx.restore();
  };

  drawCoverPhotoFrame();

  // Petunjuk buka sampul di bagian bawah sampul (Special Elite)
  ctx.fillStyle = "#E8E5DC";
  ctx.font = `700 20px ${getMonoFont()}`;
  ctx.textAlign = "center";
  ctx.fillText("✦ KETUK SAMPUL UNTUK MEMBUKA BUKU KENANGAN ✦", width / 2, 1118);

  // Emboss di bump map
  bCtx.fillStyle = "#e8e8e8";
  bCtx.textAlign = "center";
  bCtx.font = `700 72px ${handFont}`;
  bCtx.fillText("Kenangan", width / 2, 275);
  bCtx.fillText("XII PPLG 1", width / 2, 362);
  bCtx.strokeStyle = "#e8e8e8";
  bCtx.lineWidth = 6;
  bCtx.strokeRect(52, 52, width - 104, height - 104);
  bCtx.strokeRect(frameX, frameY, frameW, frameH);

  const map = applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
  const bumpMap = applyTextureSettings(new THREE.CanvasTexture(bumpCanvas), renderer, false, false);

  if (typeof window !== "undefined") {
    void ensureAlbumFontsLoaded().then(() => {
      drawCoverPhotoFrame();
      map.needsUpdate = true;
    });
  }

  const cleanCoverUrl = (coverPhotoUrl || "").trim();
  if (
    typeof window !== "undefined" &&
    cleanCoverUrl.length > 0 &&
    !cleanCoverUrl.startsWith("/api/moment-illustration")
  ) {
    const img = new window.Image();
    if (cleanCoverUrl.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      drawCoverPhotoFrame(img);
      map.needsUpdate = true;
    };
    img.src = cleanCoverUrl;
  }

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
  grad.addColorStop(0, "#232321");
  grad.addColorStop(0.6, "#1A1A18");
  grad.addColorStop(1, "#141413");
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
    ctx.fillStyle = `rgba(232, 229, 220, ${0.015 + rand() * 0.03})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Tulisan kapur tipis di bagian atas papan
  ctx.fillStyle = "rgba(232, 229, 220, 0.42)";
  ctx.font = `400 28px ${getAlbumDisplayFont()}`;
  ctx.textAlign = "center";
  ctx.fillText("Papan Cita-Cita & Harapan — XII PPLG 1 MAKN Ende", width / 2, 46);

  ctx.strokeStyle = "rgba(232, 229, 220, 0.22)";
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(120, 62);
  ctx.lineTo(width - 120, 62);
  ctx.stroke();

  return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
}

/**
 * Helper tipografi 3 hierarki "Monokrom Film Jadul" (Old Standard TT, Source Serif 4, Special Elite)
 * untuk seluruh tekstur kanvas 3D agar konsisten dengan CSS variables next/font/google.
 */
export function getHandwritingFont(): string {
  return getAlbumDisplayFont();
}

export function getSansFont(): string {
  return getAlbumBodyFont();
}

export function getMonoFont(): string {
  return getAlbumArsipFont();
}

export function getTulisFont(): string {
  return getAlbumTulisFont();
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
    bg: "#F3F1EA",
    accent: "#2A2A28",
    ink: "#1B1B1A",
    icon: "cat-cry",
  },
  {
    id: "git-pamit",
    topText: "git commit -m 'Pamit dulu bre'",
    bottomText: "git push origin masa-depan 🚀",
    badge: "BRANCH: ALUMNI",
    bg: "#ECE9E1",
    accent: "#3D3D3A",
    ink: "#1B1B1A",
    icon: "git-bye",
  },
  {
    id: "tutorial-nangis",
    topText: "TUTORIAL GAK NANGIS PAS PISAH:",
    bottomText: "Step 1: Gagal total sejak pelukan pertama 🤧",
    badge: "100% BAPER",
    bg: "#E2DED4",
    accent: "#4A4843",
    ink: "#1B1B1A",
    icon: "tissue",
  },
  {
    id: "doa-ibu-kopi",
    topText: "LULUS JALUR DOA IBU & KOPI",
    bottomText: "Plus warisan WiFi Lab PPLG 1 tercinta ☕",
    badge: "SURVIVOR PPLG",
    bg: "#F3F1EA",
    accent: "#5C5A54",
    ink: "#1B1B1A",
    icon: "coffee",
  },
  {
    id: "ctrl-s-kenangan",
    topText: "CTRL + S KENANGAN KITA!",
    bottomText: "Awas jangan sampe ke-Ctrl+Z ya bre 💾",
    badge: "AUTO-SAVED ♥",
    bg: "#E8E5DC",
    accent: "#2A2A28",
    ink: "#1B1B1A",
    icon: "ctrl-s",
  },
  {
    id: "info-reuni",
    topText: "INFO LOKER? INFO REUNI?",
    bottomText: "Awas grup WA cuma rame pas lebaran doang 😂",
    badge: "ANTI WACANA",
    bg: "#ECE9E1",
    accent: "#4A4843",
    ink: "#1B1B1A",
    icon: "reuni",
  },
  {
    id: "satu-error",
    topText: "PERNAH SATU ERROR BARENG",
    bottomText: "Titip salam buat titik koma (;) yang hilang 🐛",
    badge: "DEBUG SQUAD",
    bg: "#E2DED4",
    accent: "#3D3D3A",
    ink: "#1B1B1A",
    icon: "bug",
  },
  {
    id: "uno-forever",
    topText: "UNO FOREVER · XII PPLG 1",
    bottomText: "Tiga tahun satu atap, selamanya satu saudara ✨",
    badge: "MAKN ENDE",
    bg: "#F3F1EA",
    accent: "#1B1B1A",
    ink: "#1B1B1A",
    icon: "uno",
  },
];

/**
 * Menggambar Stiker Meme Perpisahan Lucu bergaya Die-Cut Sticker Monokrom (tepi kertas foto + doodle + teks arsip)
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
  ctx.fillStyle = "rgba(22, 22, 20, 0.22)";
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 5, -h / 2 + 7, w, h, 20);
  ctx.fill();

  // Die-cut paper sticker border
  ctx.fillStyle = "#F3F1EA";
  ctx.beginPath();
  ctx.roundRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(42, 42, 40, 0.32)";
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
  ctx.fillStyle = "#F3F1EA";
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = meme.accent;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Gambar ekspresi karakter doodle monokrom sesuai tipe meme
  if (meme.icon === "cat-cry" || meme.icon === "tissue") {
    ctx.fillStyle = "#C9C4B8";
    ctx.beginPath();
    ctx.arc(0, 4, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.lineTo(-18, -18);
    ctx.lineTo(-5, -11);
    ctx.moveTo(15, -4);
    ctx.lineTo(18, -18);
    ctx.lineTo(5, -11);
    ctx.fill();
    ctx.fillStyle = "#7D7A72";
    ctx.fillRect(-12, 2, 5, 16);
    ctx.fillRect(7, 2, 5, 16);
    ctx.strokeStyle = "#1B1B1A";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-8, 0, 3, 0, Math.PI * 2);
    ctx.arc(8, 0, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 11, 5, Math.PI, 0, false);
    ctx.stroke();
    ctx.fillStyle = "#1B1B1A";
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.lineTo(16, -16);
    ctx.lineTo(0, -10);
    ctx.lineTo(-16, -16);
    ctx.closePath();
    ctx.fill();
  } else if (meme.icon === "coffee" || meme.icon === "reuni") {
    ctx.fillStyle = "#5C5A54";
    ctx.fillRect(-13, -6, 26, 24);
    ctx.strokeStyle = "#1B1B1A";
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-13, -6, 26, 24);
    ctx.beginPath();
    ctx.arc(13, 6, 7, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, -11);
    ctx.quadraticCurveTo(-8, -18, -3, -23);
    ctx.moveTo(5, -11);
    ctx.quadraticCurveTo(2, -18, 7, -23);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#D6D2C9";
    ctx.beginPath();
    ctx.arc(0, 2, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1B1B1A";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1B1B1A";
    ctx.fillRect(-14, -5, 12, 8);
    ctx.fillRect(2, -5, 12, 8);
    ctx.fillRect(-2, -3, 4, 3);
    ctx.beginPath();
    ctx.arc(0, 6, 8, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.fillStyle = "#7D7A72";
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
  ctx.fillStyle = "#F3F1EA";
  ctx.font = `700 12px ${getMonoFont()}`;
  ctx.textAlign = "center";
  ctx.fillText(`★ ${meme.badge} ★`, -w / 2 + 172, -h / 2 + 25);

  // Teks meme atas (Display Serif)
  ctx.fillStyle = meme.ink;
  ctx.textAlign = "left";
  ctx.font = `700 17px ${handFont}`;
  ctx.fillText(meme.topText.slice(0, 28), -w / 2 + 82, 6);

  // Teks meme bawah (Body Serif)
  ctx.fillStyle = meme.accent;
  ctx.font = `600 14px ${getSansFont()}`;
  ctx.fillText(meme.bottomText.slice(0, 36), -w / 2 + 82, 32);

  ctx.restore();
}

/**
 * Tekstur kertas catatan tempel (Dream Board Note) bergaya arsip monokrom
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

  // Warna dasar kertas tempel monokrom
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, opts.paperColor || "#F3F1EA");
  bgGrad.addColorStop(1, opts.paperColor || "#ECE9E1");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Serat kertas tipis
  ctx.fillStyle = "rgba(42, 42, 40, 0.04)";
  for (let i = 0; i < 60; i++) {
    ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 8, 1.5);
  }

  // Pita header lipatan atas tempat paku pin menancap
  ctx.fillStyle = "rgba(27, 27, 26, 0.1)";
  ctx.fillRect(0, 0, size, 92);

  // Garis buku tulis tipis
  ctx.strokeStyle = "rgba(42, 42, 40, 0.16)";
  ctx.lineWidth = 2;
  for (let y = 154; y < size - 44; y += 54) {
    ctx.beginPath();
    ctx.moveTo(26, y);
    ctx.lineTo(size - 26, y);
    ctx.stroke();
  }

  // Pinggiran kertas tegas
  ctx.strokeStyle = "rgba(27, 27, 26, 0.34)";
  ctx.lineWidth = 7;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  // Nama siswa di kiri atas (Old Standard TT)
  ctx.fillStyle = "#1B1B1A";
  ctx.font = `700 28px ${handFont}`;
  ctx.textAlign = "left";
  ctx.fillText(decodeHtmlEntities(opts.studentName).slice(0, 20), 28, 60);

  // Isi cita-cita pada note Dream Board dengan Source Serif 4
  ctx.fillStyle = "#2A2A28";
  ctx.font = `600 26px ${getSansFont()}`;
  const words = decodeHtmlEntities(opts.dream).trim().split(/\s+/);
  let line = "";
  let y = 148;
  const maxWidth = size - 56;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, 28, y);
      line = word;
      y += 52;
      if (y > size - 56) break;
    } else {
      line = test;
    }
  }
  if (line && y <= size - 42) {
    ctx.fillText(line, 28, y);
  }

  // Stamp metadata arsip di sudut kanan bawah (Special Elite)
  ctx.fillStyle = "#4A4843";
  ctx.font = `700 16px ${getMonoFont()}`;
  ctx.textAlign = "right";
  ctx.fillText("UNO · XII PPLG 1 ★", size - 24, size - 20);

  return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
}



export interface GroupPhotoBookItem {
  imageUrl: string;
  caption: string;
  category: string;
  dateStr: string;
  uploaderName?: string;
  seed: number;
}

export interface BookPageData {
  type: "group-photo" | "toc" | "student-left" | "student-right";
  pageNumber: number;
  groupTitle?: string;
  groupSubtitle?: string;
  groupPhotos?: GroupPhotoBookItem[];
  studentName?: string;
  studentNickname?: string;
  studentRole?: string;
  studentBio?: string;
  studentTags?: string[];
  studentPhotoUrl?: string;
  showPhoto?: boolean;
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

  // Stiker kertas tepi luar (die-cut sticker border)
  ctx.fillStyle = "#F3F1EA";
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

  // Detail bintik tinta di sayap
  ctx.fillStyle = "#1B1B1A";
  ctx.beginPath();
  ctx.arc(-26, -16, 4, 0, Math.PI * 2);
  ctx.arc(26, -16, 4, 0, Math.PI * 2);
  ctx.fill();

  // Tubuh kupu-kupu
  ctx.fillStyle = "#161614";
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

  // Tangkai kering monokrom
  ctx.strokeStyle = "#4A4843";
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
    ctx.strokeStyle = "rgba(27,27,26,0.22)";
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
  color = "#C9C4B8"
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Border kertas stiker
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#F3F1EA";
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
  ctx.fillStyle = "#5C5A54";
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
    ctx.fillStyle = "#7D7A72";
    ctx.beginPath();
    ctx.arc(holeX, hy, 18, 0, Math.PI * 2);
    ctx.fill();

    // Lubang kertas gelap
    ctx.fillStyle = "#1B1B1A";
    ctx.beginPath();
    ctx.arc(holeX, hy, 11, 0, Math.PI * 2);
    ctx.fill();

    // Garis celah tepi buku
    ctx.strokeStyle = "rgba(27, 27, 26, 0.45)";
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
  const bgColors = ["#1B1B1A", "#ECE9E1", "#3D3D3A", "#5C5A54", "#C9C4B8"];
  const fgColors = ["#F3F1EA", "#1B1B1A", "#F3F1EA", "#F3F1EA", "#1B1B1A"];
  let cx = startX;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]!;
    const idx = i % bgColors.length;
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(((i % 3) - 1) * 0.07);
    ctx.fillStyle = bgColors[idx]!;
    ctx.fillRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
    ctx.strokeStyle = "#1B1B1A";
    ctx.lineWidth = 2;
    ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
    ctx.fillStyle = fgColors[idx]!;
    ctx.font = `400 ${Math.round(boxSize * 0.66)}px ${getAlbumDisplayFont()}`;
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
  color = "#2A2A28"
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

  ctx.strokeStyle = "rgba(232, 229, 220, 0.55)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ECE9E1";
  ctx.font = `400 18px ${getAlbumDisplayFont()}`;
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
  accentColor = "#3D3D3A",
  code = "ENDE-ARSIP"
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // Scalloped stamp edge
  ctx.fillStyle = "#F3F1EA";
  ctx.fillRect(-58, -70, 116, 140);
  ctx.strokeStyle = "#5C5A54";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(-54, -66, 108, 132);
  ctx.setLineDash([]);

  ctx.fillStyle = accentColor;
  ctx.fillRect(-44, -54, 88, 86);

  ctx.fillStyle = "#F3F1EA";
  ctx.font = `400 15px ${getAlbumDisplayFont()}`;
  ctx.textAlign = "center";
  ctx.fillText("MAKN", 0, -20);
  ctx.font = `400 20px ${getAlbumDisplayFont()}`;
  ctx.fillText("UNO", 0, 8);

  ctx.fillStyle = "#1B1B1A";
  ctx.font = `400 14px ${getAlbumArsipFont()}`;
  ctx.fillText(code, 0, 50);

  // Wavy postmark cancellation lines
  ctx.strokeStyle = "rgba(27, 27, 26, 0.45)";
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

  ctx.fillStyle = "#1B1B1A";
  ctx.fillRect(-115, -68, 230, 136);
  ctx.strokeStyle = "#ECE9E1";
  ctx.lineWidth = 4;
  ctx.strokeRect(-115, -68, 230, 136);

  // Cassette label strip
  ctx.fillStyle = "#D6D2C9";
  ctx.fillRect(-98, -50, 196, 78);
  ctx.fillStyle = "#3D3D3A";
  ctx.fillRect(-98, -50, 196, 24);

  ctx.fillStyle = "#F3F1EA";
  ctx.font = `400 14px ${getAlbumArsipFont()}`;
  ctx.textAlign = "center";
  ctx.fillText(`SIDE A · ${label}`, 0, -33);

  // Two tape reels
  ctx.fillStyle = "#1B1B1A";
  ctx.beginPath();
  ctx.arc(-46, 2, 18, 0, Math.PI * 2);
  ctx.arc(46, 2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#F3F1EA";
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
  ctx.strokeStyle = "#2A2A28";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, y - 12);
  ctx.quadraticCurveTo(width / 2, y + 26, width - 64, y - 12);
  ctx.stroke();

  const colors = ["#2A2A28", "#5C5A54", "#A8A49B", "#3D3D3A", "#7D7A72", "#C9C4B8"];
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
    ctx.strokeStyle = "#F3F1EA";
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
  ctx.fillStyle = "rgba(22, 22, 20, 0.16)";
  ctx.fillRect(-w / 2 + 6, -h / 2 + 8, w, h);

  ctx.fillStyle = paperColor;
  ctx.strokeStyle = "#4A4843";
  ctx.lineWidth = 3;

  const v = Math.abs(styleVariant) % 5;

  if (v === 0) {
    // Gaya 0: Kertas Buku Spiral Sobek di Tepi Atas + Selotip Miring
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
    ctx.strokeStyle = "rgba(74, 72, 67, 0.18)";
    ctx.lineWidth = 1.5;
    for (let ly = -h / 2 + 54; ly < h / 2 - 22; ly += 42) {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 24, ly);
      ctx.lineTo(w / 2 - 24, ly);
      ctx.stroke();
    }

    // Selotip miring di kiri atas
    ctx.save();
    ctx.translate(-w / 2 + 42, -h / 2 + 8);
    ctx.rotate(-0.24);
    ctx.fillStyle = tapeColor;
    ctx.fillRect(-46, -13, 92, 26);
    ctx.restore();
  } else if (v === 1) {
    // Gaya 1: Dog-Eared Index Card (Sudut Kanan Atas Terlipat) + Pin Arsip
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
    ctx.fillStyle = "#D6D2C9";
    ctx.beginPath();
    ctx.moveTo(w / 2 - fold, -h / 2);
    ctx.lineTo(w / 2 - fold, -h / 2 + fold);
    ctx.lineTo(w / 2, -h / 2 + fold);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Paku pin bulat di tengah atas
    ctx.fillStyle = "#2A2A28";
    ctx.beginPath();
    ctx.arc(0, -h / 2 + 12, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(243,241,234,0.65)";
    ctx.beginPath();
    ctx.arc(-4, -h / 2 + 8, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (v === 2) {
    // Gaya 2: Grid Engineer Memo + Selotip Tengah
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    ctx.strokeStyle = "rgba(74, 72, 67, 0.14)";
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
    // Gaya 3: Kertas Arsip Berbingkai Ganda + Paperclip Metalik di Kiri Atas
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "rgba(42, 42, 40, 0.32)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
    ctx.setLineDash([]);

    // Paperclip di atas kiri
    ctx.strokeStyle = "#5C5A54";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 48, -h / 2 - 18, 22, 52, 10);
    ctx.stroke();
  } else {
    // Gaya 4: Kartu Pos Vintage + Segel Lilin Kecil
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    drawWaxSeal(ctx, w / 2 - 42, -h / 2 + 12, 22, "#2A2A28");
  }
}

/**
 * Tekstur halaman Buku Kenangan 1024x1280 bergaya Monokrom Film Jadul & Arsip Ring-Binder
 * Memiliki 12 Tema Visual Monokrom Berbeda + Tata Letak Kotak Teks Acak +
 * Sistem Tipografi 3 Hierarki (Old Standard TT, Source Serif 4, Special Elite).
 */
export function createBookPageTexture(
  rawPage: BookPageData,
  renderer?: THREE.WebGLRenderer | null
) {
  const page = decodeDeepText(rawPage);
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

  // 12 Tema Monokrom Arsip Berbeda
  const themeIdx = (spreadNumber + (isLeftPage ? 0 : 1)) % 12;
  const photoLayout = (spreadNumber + Math.floor((page.decorSeed || 1) / 13)) % 5;
  const msgLayout = (spreadNumber + Math.floor((page.decorSeed || 1) / 7)) % 4;

  // Warna tinta arang & grafit untuk tulisan di halaman Buku Kenangan
  const penInks = ["#1B1B1A", "#2A2A28", "#1B1B1A", "#3D3D3A"];

  // 1. Latar Kertas Berdasarkan 12 Tema Monokrom Film Jadul
  switch (themeIdx) {
    case 0: {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#D6D2C9");
      grad.addColorStop(0.5, "#C9C4B8");
      grad.addColorStop(1, "#B5B1A7");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(243, 241, 234, 0.36)";
      for (let i = 0; i < 45; i++) {
        ctx.beginPath();
        ctx.arc(rand() * width, rand() * height, 2 + rand() * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 1: {
      ctx.fillStyle = "#C9C4B8";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(243, 241, 234, 0.6)";
      for (let py = 44; py < height; py += 68) {
        for (let px = 44; px < width; px += 68) {
          const offset = (Math.floor(py / 68) % 2) * 34;
          ctx.beginPath();
          ctx.arc(px + offset, py, 20, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(68, 92, width - 136, height - 184);
      break;
    }
    case 2: {
      ctx.fillStyle = "#1B1B1A";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(66, 88, width - 132, height - 176);
      ctx.strokeStyle = "rgba(74, 72, 67, 0.2)";
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
      ctx.strokeStyle = "rgba(232, 229, 220, 0.72)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(36, 36, width - 72, height - 72);
      ctx.setLineDash([]);
      break;
    }
    case 3: {
      ctx.fillStyle = "#8E8B82";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(64, 84, width - 128, height - 168);
      ctx.strokeStyle = "rgba(42, 42, 40, 0.24)";
      ctx.lineWidth = 2;
      ctx.strokeRect(78, 98, width - 156, height - 196);
      break;
    }
    case 4: {
      ctx.fillStyle = "#4A4843";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(68, 92, width - 136, height - 184);
      for (let x = 96; x < width - 96; x += 48) {
        ctx.fillStyle = "#C9C4B8";
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
      ctx.fillStyle = "#ECE9E1";
      ctx.fillRect(0, 0, width, height);
      const stripeW = 36;
      for (let i = 0; i < (width + height) / stripeW; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#2A2A28" : "#7D7A72";
        ctx.fillRect(i * stripeW, 0, stripeW * 0.55, 24);
        ctx.fillRect(i * stripeW, height - 24, stripeW * 0.55, 24);
        ctx.fillRect(0, i * stripeW, 24, stripeW * 0.55);
        ctx.fillRect(width - 24, i * stripeW, 24, stripeW * 0.55);
      }
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(58, 58, width - 116, height - 116);
      break;
    }
    case 6: {
      ctx.fillStyle = "#161614";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#E8E5DC";
      for (let fx = 48; fx < width - 48; fx += 46) {
        ctx.fillRect(fx, 18, 26, 18);
        ctx.fillRect(fx, height - 36, 26, 18);
      }
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(62, 68, width - 124, height - 136);
      break;
    }
    case 7: {
      ctx.fillStyle = "#ECE9E1";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(92, 90, 84, 0.14)";
      for (let x = 0; x < width; x += 48) {
        ctx.fillRect(x, 0, 24, height);
      }
      for (let y = 0; y < height; y += 48) {
        ctx.fillRect(0, y, width, 24);
      }
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(70, 88, width - 140, height - 176);
      break;
    }
    case 8: {
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(74, 72, 67, 0.22)";
      ctx.lineWidth = 2;
      for (let y = 140; y < height - 90; y += 46) {
        ctx.beginPath();
        ctx.moveTo(56, y);
        ctx.lineTo(width - 56, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(42, 42, 40, 0.42)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(124, 56);
      ctx.lineTo(124, height - 56);
      ctx.stroke();
      break;
    }
    case 9: {
      ctx.fillStyle = "#2A2A28";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(66, 86, width - 132, height - 172);
      ctx.strokeStyle = "rgba(42, 42, 40, 0.18)";
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
      grad.addColorStop(0, "#F3F1EA");
      grad.addColorStop(0.7, "#E2DED4");
      grad.addColorStop(1, "#C9C4B8");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(74, 72, 67, 0.16)";
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
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(92, 90, 84, 0.28)";
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
      ? "#A8A49B"
      : "rgba(42, 42, 40, 0.42)";
  ctx.lineWidth = 3;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  const groupSlots: Array<{
    cx: number;
    cy: number;
    rot: number;
    pw: number;
    ph: number;
    caption: string;
    dateStr: string;
    category: string;
    imageUrl: string;
  }> = [];

  if (page.type === "group-photo") {
    drawBuntingFlags(ctx, width, 64);
    drawRansomWord(
      ctx,
      isLeftPage ? "OUR STORY" : "TOGETHER",
      isLeftPage ? 195 : 210,
      122,
      42
    );

    ctx.fillStyle = "#1B1B1A";
    ctx.font = `700 36px ${handFont}`;
    ctx.textAlign = "center";
    ctx.fillText(
      page.groupTitle || "Album Foto Bersama UNO · XII PPLG 1",
      width / 2,
      194
    );

    ctx.fillStyle = "#5C5A54";
    ctx.font = `600 22px ${getSansFont()}`;
    ctx.fillText(
      page.groupSubtitle || "Kenangan Satu Angkatan Sebelum Memasuki Daftar Isi ♥",
      width / 2,
      232
    );

    const items = page.groupPhotos && page.groupPhotos.length > 0
      ? page.groupPhotos.slice(0, 2)
      : [
          {
            imageUrl: "",
            caption: "Kebersamaan Keluarga Besar XII PPLG 1 di MAKN Ende",
            category: "Foto Bersama Kelas",
            dateStr: "2026",
            seed: page.pageNumber * 13,
          },
          {
            imageUrl: "",
            caption: "Tawa & Cerita di Laboratorium PPLG Tercinta",
            category: "Momen Kelas",
            dateStr: "2027",
            seed: page.pageNumber * 29,
          },
        ];

    items.forEach((item, idx) => {
      const slotY = idx === 0 ? 455 : 855;
      const slotShiftX = ((idx % 2 === 0 ? -1 : 1) * (18 + (page.pageNumber % 3) * 8));
      const slotRot = (idx % 2 === 0 ? -1 : 1) * (0.032 + (idx * 0.015));
      const cardW = 680;
      const cardH = 355;
      const pw = 624;
      const ph = 248;

      groupSlots.push({
        cx: width / 2 + slotShiftX,
        cy: slotY,
        rot: slotRot,
        pw,
        ph,
        caption: item.caption,
        dateStr: item.dateStr,
        category: item.category,
        imageUrl: item.imageUrl,
      });

      ctx.save();
      ctx.translate(width / 2 + slotShiftX, slotY);
      ctx.rotate(slotRot);

      // Bayangan bingkai foto bersama
      ctx.fillStyle = "rgba(22, 22, 20, 0.22)";
      ctx.fillRect(-cardW / 2 + 8, -cardH / 2 + 10, cardW, cardH);

      // Kertas Foto Arsip Lebar
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
      ctx.strokeStyle = "#5C5A54";
      ctx.lineWidth = 3.5;
      ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);

      // Ilustrasi silver-gelatin dasar sebelum foto asli selesai dimuat
      const pGrad = ctx.createLinearGradient(-pw / 2, -cardH / 2 + 22, -pw / 2, -cardH / 2 + 22 + ph);
      pGrad.addColorStop(0, idx % 2 === 0 ? "#7D7A72" : "#5C5A54");
      pGrad.addColorStop(0.6, idx % 2 === 0 ? "#A8A49B" : "#8E8B82");
      pGrad.addColorStop(1, "#2A2A28");
      ctx.fillStyle = pGrad;
      ctx.fillRect(-pw / 2, -cardH / 2 + 22, pw, ph);

      // Siluet barisan sahabat berfoto bersama
      const pCount = 7;
      for (let p = 0; p < pCount; p++) {
        const px = -pw / 2 + 65 + (p * (pw - 130)) / (pCount - 1);
        const py = -cardH / 2 + 22 + ph - 42;
        ctx.fillStyle = "#1B1B1A";
        ctx.beginPath();
        ctx.arc(px, py - 38, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px, py + 14, 26, 38, 0, Math.PI, 0, false);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(27, 27, 26, 0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-pw / 2, -cardH / 2 + 22, pw, ph);

      // Selotip arsip di sudut atas foto bersama
      ctx.fillStyle = idx % 2 === 0 ? "rgba(142, 139, 130, 0.72)" : "rgba(92, 90, 84, 0.72)";
      ctx.fillRect(-95, -cardH / 2 - 14, 190, 28);

      // Caption di bagian bawah bingkai foto bersama
      ctx.fillStyle = "#1B1B1A";
      ctx.font = `600 25px ${getSansFont()}`;
      ctx.textAlign = "center";
      const capText = item.caption.length > 52 ? `${item.caption.slice(0, 50)}...` : item.caption;
      ctx.fillText(`"${capText}"`, 0, cardH / 2 - 44);

      ctx.fillStyle = "#4A4843";
      ctx.font = `700 18px ${getMonoFont()}`;
      ctx.fillText(`✦ ${item.category.toUpperCase()} · ${item.dateStr || "2026"} ✦`, 0, cardH / 2 - 14);
      ctx.restore();
    });

    // Stiker Meme Perpisahan Lucu di sudut bawah halaman foto bersama
    drawFarewellMemeSticker(
      ctx,
      isLeftPage ? 240 : width - 240,
      1112,
      0.88,
      isLeftPage ? -0.05 : 0.05,
      page.pageNumber + 2
    );
    drawPressedFlower(
      ctx,
      isLeftPage ? width - 140 : 140,
      1105,
      34,
      "#D6D2C9",
      "#8E8B82",
      8
    );
  } else if (page.type === "toc") {
    drawBuntingFlags(ctx, width, 64);
    drawRansomWord(
      ctx,
      isLeftPage ? "MEMORIES" : "UNO PPLG",
      isLeftPage ? 225 : 235,
      128,
      46
    );

    ctx.fillStyle = "#1B1B1A";
    ctx.font = `700 38px ${handFont}`;
    ctx.textAlign = "center";
    ctx.fillText("Daftar Isi Buku Kenangan UNO · XII PPLG 1", width / 2, 204);

    ctx.fillStyle = "#5C5A54";
    ctx.font = `700 22px ${getMonoFont()}`;
    ctx.fillText("MAKN ENDE · ANGKATAN 2024—2027", width / 2, 244);

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
        idx % 2 === 0 ? "rgba(243, 241, 234, 0.95)" : "rgba(226, 222, 212, 0.95)";
      ctx.fillRect(-(width - 180) / 2, -26, width - 180, 52);
      ctx.strokeStyle = "rgba(42, 42, 40, 0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-(width - 180) / 2, -26, width - 180, 52);

      ctx.fillStyle = penInks[idx % penInks.length]!;
      ctx.font = `700 26px ${getSansFont()}`;
      ctx.textAlign = "left";
      ctx.fillText(
        `${String(entry.spreadIndex).padStart(2, "0")}. ${entry.name.slice(0, 28)}`,
        -(width - 216) / 2,
        9
      );

      ctx.textAlign = "right";
      ctx.fillStyle = "#4A4843";
      ctx.font = `700 22px ${getMonoFont()}`;
      ctx.fillText(`HAL. ${entry.spreadIndex * 2} →`, (width - 216) / 2, 9);
      ctx.restore();
    });

    drawPressedFlower(ctx, 118, 134, 34, "#ECE9E1", "#7D7A72", 8);
    drawScrapbookButterfly(ctx, width - 122, 138, 0.95, 0.28, "#A8A49B", "#4A4843");

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
      ctx.fillStyle = "#1B1B1A";
      ctx.fillRect(-130, -48, 260, 96);
      ctx.strokeStyle = "#ECE9E1";
      ctx.lineWidth = 3;
      ctx.strokeRect(-130, -48, 260, 96);
      ctx.fillStyle = "#5C5A54";
      ctx.fillRect(-114, -32, 56, 56);
      ctx.fillStyle = "#F3F1EA";
      ctx.font = `700 24px ${handFont}`;
      ctx.textAlign = "left";
      ctx.fillText("UNO · XII PPLG 1 Track", -46, -8);
      ctx.font = `700 20px ${handFont}`;
      ctx.fillStyle = "#C9C4B8";
      ctx.fillText("MAKN Ende — Memories", -46, 16);
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(-46, 26, 150, 4);
      ctx.restore();
      drawRibbonBow(ctx, 210, 130, 0.95, "#C9C4B8");
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
      drawPostageStamp(ctx, width - 170, 148, 0.1, "#3D3D3A", `ABSEN #${spreadNumber}`);
      drawWaxSeal(ctx, 168, 142, 38, "#2A2A28");
    } else if (photoLayout === 3) {
      drawBuntingFlags(ctx, width, 72);
      drawScrapbookButterfly(ctx, 165, 158, 0.9, -0.22, "#A8A49B", "#4A4843");
    } else {
      ctx.save();
      ctx.translate(width - 220, 134);
      ctx.rotate(0.08);
      ctx.fillStyle = "#D6D2C9";
      ctx.beginPath();
      ctx.ellipse(0, 0, 132, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1B1B1A";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#1B1B1A";
      ctx.font = `700 32px ${handFont}`;
      ctx.textAlign = "center";
      ctx.fillText("★ Sahabat Sejati ★", 0, 10);
      ctx.restore();
      drawRibbonBow(ctx, 195, 132, 0.92, "#A8A49B");
    }

    // BINGKAI FOTO POTRET SISWA (5 Variasi Bentuk + Posisi & Kemiringan Acak per Siswa)
    const portraitPalettes = [
      "#3D3D3A",
      "#4A4843",
      "#5C5A54",
      "#2A2A28",
      "#6E6B64",
      "#32322F",
    ];
    const portraitBg =
      portraitPalettes[(spreadNumber + photoLayout) % portraitPalettes.length]!;

    const photoShiftX = (rand() - 0.5) * 76;
    const photoRot = (rand() - 0.5) * 0.11;
    (canvas as unknown as { __photoShiftX?: number; __photoRot?: number }).__photoShiftX = photoShiftX;
    (canvas as unknown as { __photoShiftX?: number; __photoRot?: number }).__photoRot = photoRot;

    ctx.save();
    ctx.translate(width / 2 + photoShiftX, 345);
    ctx.rotate(photoRot);

    if (photoLayout === 1) {
      ctx.fillStyle = "#F3F1EA";
      ctx.beginPath();
      ctx.ellipse(0, -10, 200, 208, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#2A2A28";
      ctx.beginPath();
      ctx.ellipse(0, -10, 186, 194, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = portraitBg;
      ctx.beginPath();
      ctx.ellipse(0, -10, 160, 168, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(232, 229, 220, 0.25)";
      ctx.beginPath();
      ctx.arc(0, -35, 80, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#F3F1EA";
      ctx.beginPath();
      ctx.arc(0, -54, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 70, 82, 68, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(-160, 140, 320, 54);
      ctx.strokeStyle = "#1B1B1A";
      ctx.lineWidth = 3;
      ctx.strokeRect(-160, 140, 320, 54);
      ctx.fillStyle = "#1B1B1A";
      ctx.textAlign = "center";
      ctx.font = `700 32px ${handFont}`;
      ctx.fillText(`✦ ${page.studentNickname || "Sahabat"} ✦`, 0, 176);
    } else if (photoLayout === 2) {
      ctx.fillStyle = "#161614";
      ctx.fillRect(-205, -195, 410, 395);
      ctx.strokeStyle = "#A8A49B";
      ctx.lineWidth = 3;
      ctx.strokeRect(-205, -195, 410, 395);

      ctx.fillStyle = "#ECE9E1";
      for (let sy = -172; sy <= 168; sy += 36) {
        ctx.fillRect(-192, sy, 16, 20);
        ctx.fillRect(176, sy, 16, 20);
      }

      ctx.fillStyle = portraitBg;
      ctx.fillRect(-158, -168, 316, 280);

      ctx.fillStyle = "#F3F1EA";
      ctx.beginPath();
      ctx.arc(0, -60, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 72, 90, 76, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#E8E5DC";
      ctx.textAlign = "center";
      ctx.font = `700 26px ${getMonoFont()}`;
      ctx.fillText(`TRI-X 400 · ${(page.studentNickname || "UNO").toUpperCase()}`, 0, 162);
    } else if (photoLayout === 3) {
      ctx.fillStyle = "#ECE9E1";
      ctx.fillRect(-192, -195, 384, 395);
      ctx.strokeStyle = "#5C5A54";
      ctx.lineWidth = 3;
      ctx.strokeRect(-192, -195, 384, 395);

      ctx.fillStyle = portraitBg;
      ctx.fillRect(-162, -168, 324, 280);

      ctx.fillStyle = "#1B1B1A";
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

      ctx.fillStyle = "#F3F1EA";
      ctx.beginPath();
      ctx.arc(0, -58, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 74, 92, 78, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#1B1B1A";
      ctx.textAlign = "center";
      ctx.font = `700 34px ${handFont}`;
      ctx.fillText(`"${page.studentNickname || "Sahabat"}"`, 0, 166);
    } else {
      ctx.fillStyle = "#F3F1EA";
      ctx.fillRect(-188, -195, 376, 395);
      ctx.strokeStyle = "#5C5A54";
      ctx.lineWidth = 4;
      ctx.strokeRect(-188, -195, 376, 395);

      ctx.fillStyle =
        photoLayout === 0 ? "rgba(142, 139, 130, 0.8)" : "rgba(92, 90, 84, 0.78)";
      ctx.fillRect(-100, -220, 200, 36);

      ctx.fillStyle = portraitBg;
      ctx.fillRect(-160, -168, 320, 278);

      ctx.fillStyle = "rgba(232, 229, 220, 0.25)";
      ctx.beginPath();
      ctx.arc(0, -45, 88, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#F3F1EA";
      ctx.beginPath();
      ctx.arc(0, -60, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 74, 92, 78, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#1B1B1A";
      ctx.textAlign = "center";
      ctx.font = `700 34px ${handFont}`;
      ctx.fillText(`★ ${page.studentNickname || "Sahabat"} ★`, 0, 164);
    }
    ctx.restore();

    // KOTAK NAMA SISWA DENGAN POSISI & KEMIRINGAN ACAK (Old Standard TT + Source Serif 4)
    const nameShiftX = (rand() - 0.5) * 68;
    const nameRot = (rand() - 0.5) * 0.065;
    ctx.save();
    ctx.translate(width / 2 + nameShiftX, 622);
    ctx.rotate(nameRot);

    const nameBoxW = width - 210 - Math.floor(rand() * 50);
    ctx.fillStyle = themeIdx % 2 === 0 ? "#F3F1EA" : "#1C1C1A";
    ctx.fillRect(-nameBoxW / 2, -54, nameBoxW, 108);
    ctx.strokeStyle = "#8E8B82";
    ctx.lineWidth = 3.5;
    ctx.strokeRect(-nameBoxW / 2, -54, nameBoxW, 108);

    ctx.textAlign = "center";
    ctx.fillStyle = themeIdx % 2 === 0 ? "#1B1B1A" : "#ECE9E1";
    ctx.font = `700 38px ${handFont}`;
    ctx.fillText(page.studentName || "Siswa XII PPLG 1", 0, -4);

    ctx.fillStyle = themeIdx % 2 === 0 ? "#5C5A54" : "#C9C4B8";
    ctx.font = `600 22px ${getSansFont()}`;
    ctx.fillText(
      page.studentRole || "Pengembangan Perangkat Lunak & Gim",
      0,
      36
    );
    ctx.restore();

    // KOTAK BIO SISWA DENGAN SOURCE SERIF 4 YANG BERSIH & NYAMAN DIBACA
    const bioShiftX = (rand() - 0.5) * 74;
    const bioRot = (rand() - 0.5) * 0.075;
    const bioW = width - 190 - Math.floor(rand() * 65);
    const bioH = 268;
    const bioVariant = spreadNumber + Math.floor(rand() * 5);
    const bioPapers = ["#F3F1EA", "#ECE9E1", "#E8E5DC", "#E2DED4", "#F3F1EA"];

    ctx.save();
    ctx.translate(width / 2 + bioShiftX, 845);
    ctx.rotate(bioRot);

    drawRandomScrapbookBox(
      ctx,
      bioW,
      bioH,
      bioVariant,
      bioPapers[bioVariant % bioPapers.length]!,
      "rgba(142, 139, 130, 0.65)"
    );

    ctx.fillStyle = penInks[spreadNumber % penInks.length]!;
    ctx.font = `600 30px ${getSansFont()}`;
    ctx.textAlign = "center";
    const bioWords = (
      page.studentBio ||
      "Terima kasih untuk tiga tahun cerita dan persaudaraan hangat di MAKN Ende."
    ).split(" ");
    let line = "";
    let y = -56;
    for (const w of bioWords) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > bioW - 72) {
        ctx.fillText(line, 0, y);
        line = w;
        y += 48;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 0, y);

    if (page.studentTags && page.studentTags.length > 0) {
      ctx.fillStyle = "#4A4843";
      ctx.font = `700 20px ${getMonoFont()}`;
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

    // Bunga kering monokrom di sudut berlawanan dari meme sticker
    drawPressedFlower(
      ctx,
      spreadNumber % 2 === 0 ? width - 145 : 145,
      1085,
      36,
      "#D6D2C9",
      "#8E8B82",
      7
    );
  } else {
    // HALAMAN KANAN: SURAT & CATATAN SAHABAT DENGAN KOTAK TEKS ACAK + STIKER MEME
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
    ctx.fillStyle = "#F3F1EA";
    ctx.fillRect(-210, -32, 420, 64);
    ctx.strokeStyle = "#1B1B1A";
    ctx.lineWidth = 3;
    ctx.strokeRect(-210, -32, 420, 64);

    ctx.fillStyle = "#1B1B1A";
    ctx.font = `700 28px ${handFont}`;
    ctx.textAlign = "center";
    ctx.fillText(
      `Surat Sahabat utk ${page.studentNickname || page.studentName || "Kamu"} ♥`,
      0,
      10
    );
    ctx.restore();

    const msgs = page.messages ?? [];
    const boxPalettes = [
      ["#F3F1EA", "#ECE9E1", "#E8E5DC"],
      ["#ECE9E1", "#E2DED4", "#F3F1EA"],
      ["#E8E5DC", "#F3F1EA", "#ECE9E1"],
      ["#F3F1EA", "#E8E5DC", "#E2DED4"],
    ];
    const boxColors = boxPalettes[msgLayout % boxPalettes.length]!;
    const tapeColors = [
      "rgba(142, 139, 130, 0.68)",
      "rgba(92, 90, 84, 0.64)",
      "rgba(74, 72, 67, 0.64)",
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
      ctx.fillStyle = "#5C5A54";
      ctx.font = `600 28px ${getSansFont()}`;
      ctx.fillText(
        "Belum ada pesan kenangan di database",
        0,
        -10
      );
      ctx.fillText(
        "untuk halaman sahabat ini.",
        0,
        36
      );
      ctx.restore();
    }
    msgs.slice(0, 3).forEach((m, idx) => {
      const mRand = seededRandom((m.seed || 101) + idx * 53 + page.pageNumber * 17);
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

      // Teks Pesan Sahabat pada Buku Kenangan dengan Source Serif 4
      ctx.textAlign = "left";
      ctx.fillStyle = penInks[(idx + spreadNumber) % penInks.length]!;
      ctx.font = `600 28px ${getSansFont()}`;
      const words = m.text.split(" ");
      let line = "";
      let ly = -boxH / 2 + 64;
      const maxLineW = boxW - 68;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxLineW) {
          ctx.fillText(line, -boxW / 2 + 34, ly);
          line = w;
          ly += 44;
          if (ly > boxH / 2 - 54) break;
        } else {
          line = test;
        }
      }
      if (line && ly <= boxH / 2 - 54) {
        ctx.fillText(line, -boxW / 2 + 34, ly);
      }

      // Tanda tangan / Nama Pengirim di Sudut Kanan Bawah Kotak (Old Standard TT)
      ctx.fillStyle = "#4A4843";
      ctx.font = `700 22px ${handFont}`;
      ctx.textAlign = "right";
      ctx.fillText(`— Dari: ${m.author} ♥`, boxW / 2 - 28, boxH / 2 - 22);
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
        "#A8A49B",
        "#4A4843"
      );
    } else {
      drawPostageStamp(
        ctx,
        spreadNumber % 2 === 0 ? 150 : width - 150,
        1085,
        -0.1,
        "#3D3D3A",
        `HAL #${page.pageNumber}`
      );
    }
  }

  // Lubang 6 Ring Binder di tepi punggung tengah
  drawBinderHoles(ctx, isLeftPage, height);

  // Nomor halaman dengan Special Elite di bagian bawah
  ctx.fillStyle = "#1B1B1A";
  ctx.fillRect(width / 2 - 165, height - 92, 330, 42);
  ctx.fillStyle = "#ECE9E1";
  ctx.font = `700 20px ${getMonoFont()}`;
  ctx.textAlign = "center";
  ctx.fillText(
    `LEMBAR ${page.pageNumber} · UNO SCRAPBOOK`,
    width / 2,
    height - 64
  );

  const bookTex = applyTextureSettings(
    new THREE.CanvasTexture(canvas),
    renderer,
    true,
    false
  );

  // Jika halaman kiri siswa memiliki foto dari database (studentPhotoUrl) dan showPhoto aktif, gambar foto aslinya dalam filter monokrom film jadul
  if (
    typeof window !== "undefined" &&
    page.type === "student-left" &&
    page.showPhoto !== false &&
    page.studentPhotoUrl &&
    page.studentPhotoUrl.trim().length > 0
  ) {
    const stuImgUrl = page.studentPhotoUrl.trim();
    const savedShiftX = (canvas as unknown as { __photoShiftX?: number }).__photoShiftX ?? 0;
    const savedRot = (canvas as unknown as { __photoRot?: number }).__photoRot ?? 0;
    const img = new window.Image();
    if (stuImgUrl.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      ctx.save();
      ctx.translate(width / 2 + savedShiftX, 345);
      ctx.rotate(savedRot);
      if (photoLayout === 1) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, -10, 158, 166, 0, 0, Math.PI * 2);
        ctx.clip();
        const scale = Math.max(320 / (img.naturalWidth || 320), 336 / (img.naturalHeight || 336));
        const dw = (img.naturalWidth || 320) * scale;
        const dh = (img.naturalHeight || 336) * scale;
        ctx.filter = "saturate(46%) contrast(92%) brightness(104%) sepia(20%)";
        ctx.drawImage(img, -dw / 2, -10 - dh / 2, dw, dh);
        ctx.filter = "none";
        ctx.restore();

        ctx.fillStyle = "#F3F1EA";
        ctx.fillRect(-160, 140, 320, 54);
        ctx.strokeStyle = "#1B1B1A";
        ctx.lineWidth = 3;
        ctx.strokeRect(-160, 140, 320, 54);
        ctx.fillStyle = "#1B1B1A";
        ctx.textAlign = "center";
        ctx.font = `700 32px ${handFont}`;
        ctx.fillText(`✦ ${page.studentNickname || "Sahabat"} ✦`, 0, 176);
      } else {
        const boxX = -158;
        const boxY = -168;
        const boxW = 316;
        const boxH = 278;
        ctx.save();
        ctx.beginPath();
        ctx.rect(boxX, boxY, boxW, boxH);
        ctx.clip();
        const scale = Math.max(boxW / (img.naturalWidth || boxW), boxH / (img.naturalHeight || boxH));
        const dw = (img.naturalWidth || boxW) * scale;
        const dh = (img.naturalHeight || boxH) * scale;
        ctx.filter = "saturate(46%) contrast(92%) brightness(104%) sepia(20%)";
        ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);
        ctx.filter = "none";
        ctx.restore();
      }
      ctx.restore();
      bookTex.needsUpdate = true;
    };
    img.src = stuImgUrl;
  }

  // Jika halaman adalah halaman Foto Bersama ("group-photo"), muat dan gambar foto-foto bersama dalam filter monokrom film jadul
  if (
    typeof window !== "undefined" &&
    page.type === "group-photo" &&
    groupSlots.length > 0
  ) {
    groupSlots.forEach((slot) => {
      const cleanUrl = (slot.imageUrl || "").trim();
      if (
        !cleanUrl ||
        cleanUrl.startsWith("/api/moment-illustration")
      ) {
        return;
      }
      const img = new window.Image();
      if (cleanUrl.startsWith("http")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        const cardH = 355;
        const boxX = -slot.pw / 2;
        const boxY = -cardH / 2 + 22;
        ctx.save();
        ctx.translate(slot.cx, slot.cy);
        ctx.rotate(slot.rot);
        ctx.beginPath();
        ctx.rect(boxX, boxY, slot.pw, slot.ph);
        ctx.clip();
        const iw = img.naturalWidth || img.width || slot.pw;
        const ih = img.naturalHeight || img.height || slot.ph;
        const sc = Math.max(slot.pw / iw, slot.ph / ih);
        const dw = iw * sc;
        const dh = ih * sc;
        ctx.filter = "saturate(46%) contrast(92%) brightness(104%) sepia(20%)";
        ctx.drawImage(
          img,
          boxX + (slot.pw - dw) / 2,
          boxY + (slot.ph - dh) / 2,
          dw,
          dh
        );
        ctx.filter = "none";
        ctx.restore();
        bookTex.needsUpdate = true;
      };
      img.src = cleanUrl;
    });
  }

  return bookTex;
}

