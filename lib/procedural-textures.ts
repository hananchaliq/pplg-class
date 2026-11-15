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
 * Tekstur kertas catatan tempel (Dream Board Note) dengan font tulisan tangan Caveat
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

  // Warna dasar kertas tempel
  ctx.fillStyle = opts.paperColor || "#fae6b1";
  ctx.fillRect(0, 0, size, size);

  // Pita header kontras di bagian atas kertas (tempat pin & nama siswa)
  ctx.fillStyle = "rgba(43, 24, 10, 0.14)";
  ctx.fillRect(0, 0, size, 96);

  // Garis buku tipis
  ctx.strokeStyle = "rgba(45, 28, 12, 0.16)";
  ctx.lineWidth = 2;
  for (let y = 152; y < size - 44; y += 56) {
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(size - 28, y);
    ctx.stroke();
  }

  // Pinggiran kertas tegas agar terpisah jelas dari papan tulis
  ctx.strokeStyle = "rgba(35, 20, 8, 0.35)";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  // Nama siswa di kiri atas (sangat jelas)
  ctx.fillStyle = "#1f1005";
  ctx.font = "800 34px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(opts.studentName.slice(0, 16), 28, 64);

  // Isi cita-cita dengan ukuran besar & kontras ekstra tinggi agar terbaca tanpa zoom
  ctx.fillStyle = "#0f0702";
  ctx.font = "bold 42px Georgia, serif";
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

  // Label kecil di sudut kanan bawah
  ctx.fillStyle = "rgba(168, 66, 50, 0.85)";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("XII PPLG 1 ★", size - 24, size - 22);

  return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
}

/**
 * Tekstur Polaroid 3D (margin atas ekstra lega agar jepitan kayu tidak pernah menutupi foto/tulisan)
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

  // Kertas Polaroid krem hangat
  ctx.fillStyle = "#fbf6ec";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#d4c0a3";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  if (opts.isBack) {
    // Sisi belakang Polaroid: beri ruang aman di atas (y >= 115) agar jepitan di bibir atas tidak menghalangi teks
    ctx.strokeStyle = "rgba(110, 90, 71, 0.28)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(32, 68, width - 64, height - 100);

    ctx.fillStyle = "#8c3b2b";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(
      `FASE KELAS ${opts.phase} · ${opts.category.toUpperCase()}`,
      54,
      118
    );

    ctx.fillStyle = "#170e06";
    ctx.font = "bold 38px Georgia, serif";
    const words = (opts.caption || "Kenangan manis bersama XII PPLG 1").split(" ");
    let line = "";
    let y = 185;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > width - 108) {
        ctx.fillText(line, 54, y);
        line = w;
        y += 50;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 54, y);

    ctx.fillStyle = "#5c4735";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(`MAKN Ende · ${opts.dateStr || "2026"}`, 54, height - 58);

    return applyTextureSettings(new THREE.CanvasTexture(canvas), renderer, true, false);
  }

  // Area foto Polaroid (mulai di topPad = 58 agar jepitan kayu di bibir atas tidak menyentuh foto)
  const sidePad = 32;
  const topPad = 58;
  const photoW = width - sidePad * 2;
  const photoH = 400;
  const rand = seededRandom(opts.seed);

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

  // Matahari / cahaya sore
  ctx.fillStyle = "rgba(255, 243, 214, 0.78)";
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

  // Siluet 3-4 teman berfoto bersama
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

  // Garis cetak tua di tepi foto
  ctx.strokeStyle = "rgba(43, 33, 24, 0.38)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(sidePad, topPad, photoW, photoH);

  // Caption jelas di bagian bawah Polaroid (jauh dari jepitan atas)
  ctx.fillStyle = "#170e06";
  ctx.font = "bold 30px Georgia, serif";
  ctx.textAlign = "center";
  const shortCap =
    opts.caption.length > 32 ? `${opts.caption.slice(0, 30)}...` : opts.caption;
  ctx.fillText(shortCap, width / 2, topPad + photoH + 68);

  ctx.fillStyle = "#6e4e32";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(
    `Kelas ${opts.phase} · ${opts.category}`,
    width / 2,
    topPad + photoH + 112
  );

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
  ctx.fillText("PPLG", 0, 1);
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
  ctx.fillText("XII", 0, 8);

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
 * Tekstur halaman Buku Kenangan 1024x1280 bergaya DIY Scrapbook Ring-Binder Kreatif
 * Memiliki 12 Tema Visual Berbeda + 5 Variasi Tata Letak Bingkai Foto + 4 Variasi Tata Letak Pesan Sahabat
 * sehingga setiap siswa memiliki halaman buku kenangan yang unik dan hidup seperti dunia nyata.
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

  const isLeftPage = page.pageNumber % 2 === 1;
  const rand = seededRandom(page.decorSeed || page.pageNumber * 97);
  const spreadNumber = Math.floor((page.pageNumber - 1) / 2);

  // 12 Tema DIY Scrapbook Berbeda (setiap lembar & sisi punya nuansa unik)
  const themeIdx = (spreadNumber + (isLeftPage ? 0 : 1)) % 12;
  const photoLayout = (spreadNumber + Math.floor((page.decorSeed || 1) / 13)) % 5;
  const msgLayout = (spreadNumber + Math.floor((page.decorSeed || 1) / 7)) % 4;

  // 1. Latar Kertas Berdasarkan 12 Tema Scrapbook
  switch (themeIdx) {
    case 0: {
      // Tema 1: Kraft Vintage Herbarium + Bercak Gesso Putih
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
      // Tema 2: Kertas Kuning Polka-Dot Ceria + Lembar Kertas Krem Sobek
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
      // Tema 3: Midnight Navy Starlight + Kertas Kotak-Kotak (Graph Paper)
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
      // Tema 4: Sage Botanical Herbarium (Hijau Daun Kering & Kertas Linen)
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
      // Tema 5: Sunset Terracotta Ende & Ornamen Tenun Ikat
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
      // Tema 6: Kartu Pos Airmail Vintage (Garis Merah-Biru Diagonal di Pinggir)
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
      // Tema 7: Darkroom 35mm Film Strip & Sepia Collage
      ctx.fillStyle = "#221c18";
      ctx.fillRect(0, 0, width, height);
      // Perforasi film 35mm di tepi atas & bawah
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
      // Tema 8: Picnic Gingham Checkered & Pastel Rose
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
      // Tema 9: Buku Catatan Sekolah Bergaris & Margin Merah
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
      // Tema 10: Coastal Teal Ende & Gelombang Laut
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
      // Tema 11: Archival Parchment & Noda Cangkir Kopi Hangat
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
      // Coffee ring stain di pojok
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
      // Tema 12: Festival Bunting Banner & Dot Grid Journal
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
      isLeftPage ? "MEMORIES" : "FRIENDS",
      isLeftPage ? 225 : 250,
      128,
      46
    );

    ctx.fillStyle = "#1f1208";
    ctx.font = "bold 44px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Daftar Isi Scrapbook XII PPLG 1", width / 2, 202);

    ctx.fillStyle = "#8c3b2b";
    ctx.font = "bold 26px Georgia, serif";
    ctx.fillText("MAKN Ende · Angkatan 2024—2027", width / 2, 242);

    ctx.textAlign = "left";
    const entries = page.tocEntries ?? [];
    entries.forEach((entry, idx) => {
      const y = 306 + idx * 68;
      if (y > height - 125) return;

      ctx.fillStyle =
        idx % 2 === 0 ? "rgba(255, 252, 245, 0.94)" : "rgba(244, 232, 209, 0.94)";
      ctx.fillRect(84, y - 42, width - 168, 54);
      ctx.strokeStyle = "rgba(92, 64, 38, 0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(84, y - 42, width - 168, 54);

      ctx.fillStyle = "#170d05";
      ctx.font = "bold 30px Georgia, serif";
      ctx.fillText(
        `${String(entry.spreadIndex).padStart(2, "0")}. ${entry.name.slice(0, 24)}`,
        104,
        y - 6
      );

      ctx.textAlign = "right";
      ctx.fillStyle = "#a84232";
      ctx.font = "bold 25px sans-serif";
      ctx.fillText(`Lembar #${entry.spreadIndex}`, width - 104, y - 6);
      ctx.textAlign = "left";
    });

    drawPressedFlower(ctx, 118, 134, 34, "#f7f3e8", "#d99b4e", 8);
    drawScrapbookButterfly(ctx, width - 122, 138, 0.95, 0.28, "#d99b4e", "#8c4a27");
  } else if (page.type === "student-left") {
    // Ornamen atas sesuai variasi layout siswa (5 gaya berbeda)
    if (photoLayout === 0) {
      // Gaya 1: Mini Music Player Card + Ribbon Bow
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
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("XII PPLG 1 Track", -46, -10);
      ctx.font = "15px sans-serif";
      ctx.fillStyle = "#d6c7b2";
      ctx.fillText("MAKN Ende — Memories", -46, 12);
      ctx.fillStyle = "#fbf6ec";
      ctx.fillRect(-46, 24, 150, 4);
      ctx.restore();
      drawRibbonBow(ctx, 210, 130, 0.95, "#f09cb0");
    } else if (photoLayout === 1) {
      // Gaya 2: Stiker Kaset Pita Retro + Ransom "US CORE"
      drawCassetteSticker(
        ctx,
        215,
        136,
        -0.08,
        (page.studentNickname || "PPLG").toUpperCase()
      );
      drawRansomWord(ctx, "US CORE", width - 365, 126, 36);
    } else if (photoLayout === 2) {
      // Gaya 3: Perangko Pos Ende + Segel Lilin Merah
      drawPostageStamp(ctx, width - 170, 148, 0.1, "#2d6a6e", `ABSEN #${spreadNumber}`);
      drawWaxSeal(ctx, 168, 142, 38, "#9e2a2b");
    } else if (photoLayout === 3) {
      // Gaya 4: Bunting Bendera Kecil + Kupu-kupu Kembar
      drawBuntingFlags(ctx, width, 72);
      drawScrapbookButterfly(ctx, 165, 158, 0.9, -0.22, "#e0a958", "#8c3b2b");
    } else {
      // Gaya 5: Stiker "FAVORITE PERSON" Oval Kraft (seperti Ref 1) + Pita Biru
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
      ctx.font = "bold 24px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("★ Favorite Friend ★", 0, 8);
      ctx.restore();
      drawRibbonBow(ctx, 195, 132, 0.92, "#7ab8c8");
    }

    // BINGKAI FOTO POTRET SISWA (5 Variasi Bentuk Berbeda!)
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

    ctx.save();
    ctx.translate(width / 2 - 10, 355);
    ctx.rotate(((spreadNumber % 2 === 0 ? 1 : -1) * 0.03));

    if (photoLayout === 1) {
      // Variasi Bingkai 1: Bingkai Cermin Oval Klasik Berulir (seperti gambar Ref 1)
      ctx.fillStyle = "#fcf6e8";
      ctx.beginPath();
      ctx.ellipse(0, -10, 210, 218, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3a2415";
      ctx.beginPath();
      ctx.ellipse(0, -10, 196, 204, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = portraitBg;
      ctx.beginPath();
      ctx.ellipse(0, -10, 168, 176, 0, 0, Math.PI * 2);
      ctx.fill();

      // Siluet potret siswa di dalam oval
      ctx.fillStyle = "rgba(243, 202, 130, 0.3)";
      ctx.beginPath();
      ctx.arc(0, -35, 84, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fbf6ec";
      ctx.beginPath();
      ctx.arc(0, -56, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 74, 86, 72, 0, Math.PI, 0, false);
      ctx.fill();

      // Pita nama di bawah oval
      ctx.fillStyle = "#fffdf7";
      ctx.fillRect(-165, 148, 330, 56);
      ctx.strokeStyle = "#2b190d";
      ctx.lineWidth = 3;
      ctx.strokeRect(-165, 148, 330, 56);
      ctx.fillStyle = "#170d05";
      ctx.textAlign = "center";
      ctx.font = "bold 36px Georgia, serif";
      ctx.fillText(`✦ ${page.studentNickname || "Sahabat"} ✦`, 0, 187);
    } else if (photoLayout === 2) {
      // Variasi Bingkai 2: 35mm Darkroom Film Frame dengan Lubang Sprocket
      ctx.fillStyle = "#181412";
      ctx.fillRect(-215, -205, 430, 415);
      ctx.strokeStyle = "#e0a958";
      ctx.lineWidth = 3;
      ctx.strokeRect(-215, -205, 430, 415);

      // Lubang sprocket kiri & kanan
      ctx.fillStyle = "#fbf5e8";
      for (let sy = -182; sy <= 178; sy += 36) {
        ctx.fillRect(-202, sy, 18, 22);
        ctx.fillRect(184, sy, 18, 22);
      }

      ctx.fillStyle = portraitBg;
      ctx.fillRect(-166, -176, 332, 294);

      ctx.fillStyle = "#fbf6ec";
      ctx.beginPath();
      ctx.arc(0, -64, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 76, 94, 80, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#f3ca82";
      ctx.textAlign = "center";
      ctx.font = "bold 34px monospace";
      ctx.fillText(`KODAK 400 · ${page.studentNickname || "PPLG"}`, 0, 172);
    } else if (photoLayout === 3) {
      // Variasi Bingkai 3: Vintage Archival Photo dengan Siku Photo-Corners Hitam
      ctx.fillStyle = "#f6ebd8";
      ctx.fillRect(-200, -202, 400, 415);
      ctx.strokeStyle = "#6e4e32";
      ctx.lineWidth = 3;
      ctx.strokeRect(-200, -202, 400, 415);

      ctx.fillStyle = portraitBg;
      ctx.fillRect(-170, -174, 340, 292);

      // 4 Siku Photo-Corner Hitam Klasik
      ctx.fillStyle = "#1c1510";
      const corners: [number, number, number, number][] = [
        [-176, -180, 1, 1],
        [176, -180, -1, 1],
        [-176, 124, 1, -1],
        [176, 124, -1, -1],
      ];
      corners.forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + sx * 44, cy);
        ctx.lineTo(cx, cy + sy * 44);
        ctx.closePath();
        ctx.fill();
      });

      ctx.fillStyle = "#fbf6ec";
      ctx.beginPath();
      ctx.arc(0, -62, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 78, 96, 82, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#170d05";
      ctx.textAlign = "center";
      ctx.font = "italic bold 38px Georgia, serif";
      ctx.fillText(`"${page.studentNickname || "Sahabat"}"`, 0, 176);
    } else {
      // Variasi Bingkai 0 & 4: Polaroid Tebal dengan Washi Tape Polkadot / Silang
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-195, -202, 390, 415);
      ctx.strokeStyle = "#8c6d46";
      ctx.lineWidth = 4;
      ctx.strokeRect(-195, -202, 390, 415);

      // Washi tape di bagian atas
      ctx.fillStyle =
        photoLayout === 0 ? "rgba(200, 109, 59, 0.8)" : "rgba(45, 106, 110, 0.78)";
      ctx.fillRect(-105, -228, 210, 38);
      ctx.fillStyle = "rgba(255, 250, 240, 0.55)";
      for (let wx = -85; wx <= 85; wx += 28) {
        ctx.beginPath();
        ctx.arc(wx, -209, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = portraitBg;
      ctx.fillRect(-168, -176, 336, 290);

      ctx.fillStyle = "rgba(243, 202, 130, 0.28)";
      ctx.beginPath();
      ctx.arc(0, -45, 92, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fbf6ec";
      ctx.beginPath();
      ctx.arc(0, -64, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 78, 96, 82, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#170d05";
      ctx.textAlign = "center";
      ctx.font = "bold 40px Georgia, serif";
      ctx.fillText(`★ ${page.studentNickname || "Sahabat"} ★`, 0, 174);
    }
    ctx.restore();

    // Stiker Bunga & Kupu-Kupu dengan warna bervariasi per siswa
    const flowerPalette = ["#d9534f", "#e08499", "#e5a93c", "#6ba38b", "#c86d3b"];
    drawPressedFlower(
      ctx,
      144,
      495,
      42,
      flowerPalette[spreadNumber % flowerPalette.length]!,
      "#f9d466",
      6 + (spreadNumber % 4)
    );
    drawScrapbookButterfly(
      ctx,
      width - 144,
      470,
      1.05,
      -0.25,
      flowerPalette[(spreadNumber + 2) % flowerPalette.length]!,
      "#2d6a6e"
    );

    // Strip Kertas Nama Lengkap Siswa
    ctx.fillStyle = themeIdx % 2 === 0 ? "#fffdf7" : "#231912";
    ctx.fillRect(92, 580, width - 184, 118);
    ctx.strokeStyle = "#d99b4e";
    ctx.lineWidth = 4;
    ctx.strokeRect(92, 580, width - 184, 118);

    ctx.textAlign = "center";
    ctx.fillStyle = themeIdx % 2 === 0 ? "#140b04" : "#fbf5e8";
    ctx.font = "bold 45px Georgia, serif";
    ctx.fillText(page.studentName || "Siswa XII PPLG 1", width / 2, 636);

    ctx.fillStyle = themeIdx % 2 === 0 ? "#a84232" : "#f3ca82";
    ctx.font = "bold 27px sans-serif";
    ctx.fillText(
      page.studentRole || "Pengembangan Perangkat Lunak & Gim",
      width / 2,
      680
    );

    // Kotak Bio Siswa
    ctx.fillStyle = "#fffaf0";
    ctx.strokeStyle = "#6e4e32";
    ctx.lineWidth = 3.5;
    ctx.fillRect(86, 725, width - 172, 310);
    ctx.strokeRect(86, 725, width - 172, 310);

    ctx.fillStyle = "rgba(200, 109, 59, 0.52)";
    ctx.fillRect(72, 712, 78, 26);
    ctx.fillRect(width - 150, 712, 78, 26);

    ctx.fillStyle = "#170d05";
    ctx.font = "bold 35px Georgia, serif";
    const bioWords = (
      page.studentBio ||
      "Terima kasih untuk tiga tahun cerita dan persaudaraan hangat di MAKN Ende."
    ).split(" ");
    let line = "";
    let y = 792;
    for (const w of bioWords) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > width - 224) {
        ctx.fillText(line, width / 2, y);
        line = w;
        y += 52;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, width / 2, y);

    if (page.studentTags && page.studentTags.length > 0) {
      ctx.fillStyle = "#1c1613";
      ctx.fillRect(140, 1064, width - 280, 56);
      ctx.fillStyle = "#f7efe2";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(
        `✦ ${page.studentTags.join("  ·  ")} ✦`,
        width / 2,
        1100
      );
    }
  } else {
    // Halaman Kanan: Surat & Catatan Sahabat dengan 4 Variasi Header & Kartu
    const headerWords = ["FRIENDS", "MEMORIES", "OUR CORE", "FOREVER"];
    drawRansomWord(
      ctx,
      headerWords[msgLayout % headerWords.length]!,
      108,
      108,
      39
    );

    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(425, 78, width - 510, 62);
    ctx.strokeStyle = "#2b190d";
    ctx.lineWidth = 3;
    ctx.strokeRect(425, 78, width - 510, 62);

    ctx.fillStyle = "#1f1208";
    ctx.font = "bold 31px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `Untuk ${page.studentNickname || page.studentName || "Sahabat"}`,
      425 + (width - 510) / 2,
      118
    );

    const msgs = page.messages ?? [];
    let curY = 178;
    msgs.slice(0, 3).forEach((m, idx) => {
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
      ctx.save();

      ctx.translate(width / 2, curY + 148);
      ctx.rotate(((idx % 2 === 0 ? 1 : -1) * (0.01 + (msgLayout % 3) * 0.005)));

      ctx.fillStyle = boxColors[idx % boxColors.length]!;
      ctx.strokeStyle = "#5c4026";
      ctx.lineWidth = 3.5;
      ctx.fillRect(-(width - 172) / 2, -144, width - 172, 288);
      ctx.strokeRect(-(width - 172) / 2, -144, width - 172, 288);

      // Garis buku tipis pada kartu pesan bila msgLayout ganjil
      if (msgLayout % 2 === 1) {
        ctx.strokeStyle = "rgba(110, 86, 60, 0.14)";
        ctx.lineWidth = 1.5;
        for (let ly = -90; ly <= 90; ly += 45) {
          ctx.beginPath();
          ctx.moveTo(-(width - 210) / 2, ly);
          ctx.lineTo((width - 210) / 2, ly);
          ctx.stroke();
        }
      }

      // Washi tape atau segel lilin di atas kartu pesan
      if (msgLayout === 2 && idx === 0) {
        drawWaxSeal(ctx, 0, -142, 26, "#9e2a2b");
      } else {
        ctx.fillStyle = tapeColors[(idx + msgLayout) % tapeColors.length]!;
        ctx.fillRect(-75, -158, 150, 28);
      }

      ctx.textAlign = "left";
      ctx.fillStyle = "#140b04";
      ctx.font = "bold 35px Georgia, serif";
      const words = m.text.split(" ");
      let line = "";
      let ly = -82;
      const maxLineW = width - 235;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxLineW) {
          ctx.fillText(line, -(width - 220) / 2, ly);
          line = w;
          ly += 48;
          if (ly > 64) break;
        } else {
          line = test;
        }
      }
      if (line && ly <= 64) ctx.fillText(line, -(width - 220) / 2, ly);

      ctx.fillStyle = "#a84232";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`— Dari: ${m.author} ♥`, (width - 220) / 2, 114);
      ctx.restore();

      curY += 326;
    });

    if (msgLayout % 2 === 0) {
      drawScrapbookButterfly(ctx, width - 116, 195, 0.88, 0.32, "#d99b4e", "#2d6a6e");
      drawPressedFlower(ctx, 118, height - 122, 34, "#fff9e6", "#d9822b", 9);
    } else {
      drawPostageStamp(ctx, width - 132, height - 148, -0.12, "#8c3b2b", `PAGE #${page.pageNumber}`);
      drawRibbonBow(ctx, 126, height - 120, 0.85, "#e5a93c");
    }
  }

  // Lubang 6 Ring Binder di tepi punggung tengah
  drawBinderHoles(ctx, isLeftPage, height);

  // Nomor halaman + Badge Tema Unik di bagian bawah
  ctx.fillStyle = "#2b190d";
  ctx.fillRect(width / 2 - 175, height - 96, 350, 44);
  ctx.fillStyle = "#fbf5e8";
  ctx.font = "bold 23px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `— Hal ${page.pageNumber} · Template #${themeIdx + 1} —`,
    width / 2,
    height - 66
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

