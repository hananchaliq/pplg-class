"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ChevronRight } from "lucide-react";
import { decodeHtmlEntities } from "@/lib/domain-logic";
import { isSoftwareWebGL, useVisualTier } from "@/lib/visual-tier";
import { disposeSceneGraph } from "@/components/three/scene-shell";
import type { MomentRow } from "@/lib/types";

interface PolaroidCamera3DProps {
  moments: MomentRow[];
}

const LOOP_DURATION_SEC = 7.2;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

function easeInOutCubic(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function loadImageCorsSafe(url: string): Promise<HTMLImageElement | null> {
  const clean = (url || "").trim();
  if (!clean) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    const isSameOrigin =
      clean.startsWith("data:") ||
      clean.startsWith("blob:") ||
      clean.startsWith("/");
    if (!isSameOrigin) {
      img.crossOrigin = "anonymous";
    }
    let settled = false;
    const done = (res: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      resolve(res);
    };
    const timer = window.setTimeout(() => done(null), 6500);
    img.onload = () => {
      window.clearTimeout(timer);
      done(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      done(null);
    };
    img.src = clean;
  });
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = decodeHtmlEntities(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = words[0]!;
  for (let i = 1; i < words.length; i++) {
    const candidate = `${line} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = words[i]!;
      if (lines.length >= maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1] ?? "";
    if (words.join(" ").length > lines.join(" ").length && last.length > 4) {
      lines[maxLines - 1] = `${last.slice(0, -3).trimEnd()}…`;
    }
  }
  return lines;
}

function buildPolaroidCanvasTexture(
  moment: MomentRow | null,
  img: HTMLImageElement | null,
  seqIndex: number
): THREE.CanvasTexture {
  const w = 640;
  const h = 768;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Kertas Polaroid matte kecreaman hangat (tidak terlalu putih silau saat terkena cahaya 3D)
  ctx.fillStyle = "#EFE7D4";
  ctx.fillRect(0, 0, w, h);

  // Tekstur serat halus kertas cetak foto matte
  for (let i = 0; i < 480; i++) {
    const px = (i * 173 + 29) % w;
    const py = (i * 251 + 61) % h;
    ctx.fillStyle =
      i % 3 === 0 ? "rgba(92, 76, 60, 0.055)" : "rgba(38, 30, 22, 0.025)";
    ctx.fillRect(px, py, 2, 1);
  }

  // Bingkai luar kertas cetak
  ctx.strokeStyle = "#C8B898";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  const photoX = 42;
  const photoY = 44;
  const photoW = w - photoX * 2;
  const photoH = 516;

  // Area foto utama
  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, photoY, photoW, photoH);
  ctx.clip();

  if (img && img.naturalWidth > 0) {
    const scale = Math.max(photoW / img.naturalWidth, photoH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = photoX + (photoW - dw) / 2;
    const dy = photoY + (photoH - dh) / 2;

    // Grading foto cetak film analog yang tajam, natural, tidak silau & nyaman dilihat lama
    ctx.filter = "saturate(78%) contrast(106%) brightness(93%) sepia(10%)";
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = "none";

    // Vignette tepi sangat halus + bayangan cekung bingkai cetak asli (tanpa lapisan putih silau)
    const vig = ctx.createRadialGradient(
      photoX + photoW / 2,
      photoY + photoH / 2,
      photoW * 0.28,
      photoX + photoW / 2,
      photoY + photoH / 2,
      photoW * 0.78
    );
    vig.addColorStop(0, "rgba(26, 20, 14, 0)");
    vig.addColorStop(1, "rgba(26, 20, 14, 0.14)");
    ctx.fillStyle = vig;
    ctx.fillRect(photoX, photoY, photoW, photoH);

    // Efek cekung tepi atas & kiri seperti kertas emulsi foto asli
    ctx.fillStyle = "rgba(24, 18, 12, 0.22)";
    ctx.fillRect(photoX, photoY, photoW, 3);
    ctx.fillRect(photoX, photoY, 3, photoH);
  } else {
    // Fallback ilustrasi arsip bila foto eksternal gagal/CORS
    const grad = ctx.createLinearGradient(
      photoX,
      photoY,
      photoX + photoW,
      photoY + photoH
    );
    grad.addColorStop(0, "#3D3124");
    grad.addColorStop(1, "#261F18");
    ctx.fillStyle = grad;
    ctx.fillRect(photoX, photoY, photoW, photoH);

    ctx.strokeStyle = "rgba(239, 229, 206, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(photoX + 20, photoY + 20, photoW - 40, photoH - 40);

    ctx.fillStyle = "#EFE5CE";
    ctx.textAlign = "center";
    ctx.font = 'bold 42px "Old Standard TT", Georgia, serif';
    ctx.fillText("UNO · XII PPLG 1", w / 2, photoY + photoH / 2 - 12);
    ctx.fillStyle = "#D4C29E";
    ctx.font = '18px "Special Elite", "Courier New", monospace';
    ctx.fillText("MAKN ENDE · 2024 — 2027", w / 2, photoY + photoH / 2 + 28);
  }
  ctx.restore();

  // Garis tepi dalam foto Polaroid
  ctx.strokeStyle = "#A99776";
  ctx.lineWidth = 2;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  // Teks tulisan editorial kontras tajam & nyaman dibaca pada dagu bawah Polaroid
  const caption = decodeHtmlEntities(
    moment?.caption || "Kenangan bersama keluarga besar XII PPLG 1 MAKN Ende"
  );
  const phaseLabel = moment?.phase ? `KELAS ${moment.phase}` : "XII PPLG 1";
  const takenAt = decodeHtmlEntities(moment?.taken_at || "2024 — 2027");
  const frameCode = `FRAME #${String(seqIndex + 1).padStart(2, "0")}`;

  ctx.textAlign = "center";
  ctx.fillStyle = "#1A140F";
  ctx.font = 'bold 26px "Old Standard TT", Georgia, serif';
  const capLines = wrapCanvasText(ctx, caption, photoW - 12, 2);
  capLines.forEach((ln, idx) => {
    ctx.fillText(ln, w / 2, 622 + idx * 34);
  });

  ctx.fillStyle = "#4B3E31";
  ctx.font = '16px "Special Elite", "Courier New", monospace';
  ctx.fillText(
    `${frameCode} · ${phaseLabel} · ${takenAt}`,
    w / 2,
    h - 36
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Membangun model 3D Kamera Polaroid Vintage multi-bagian (14+ komponen prosedural).
 */
function createVintagePolaroidCameraModel(): {
  group: THREE.Group;
  slotAnchor: THREE.Object3D;
  shutterButton: THREE.Mesh;
  flashBulbMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();

  // Bahan PBR bervariasi kekasaran & metalness sesuai panduan Three.js
  const creamBodyMat = new THREE.MeshStandardMaterial({
    color: 0xf0e6cf,
    roughness: 0.52,
    metalness: 0.05,
  });
  const warmLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x2d241c,
    roughness: 0.82,
    metalness: 0.04,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x382e24,
    roughness: 0.48,
    metalness: 0.55,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xdad4c6,
    roughness: 0.22,
    metalness: 0.88,
  });
  const lensGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x162228,
    roughness: 0.07,
    metalness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.8,
  });
  const flashBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d6,
    emissive: 0xffdca0,
    emissiveIntensity: 0.15,
    roughness: 0.25,
    metalness: 0.1,
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    color: 0xb5523d,
    roughness: 0.35,
    metalness: 0.32,
  });

  // 1. Bodi Bawah (Base Deck & Slot Cetak) — beveled ExtrudeGeometry
  const baseShape = new THREE.Shape();
  const bw = 1.15;
  const bd = 0.92;
  baseShape.moveTo(-bw, -0.35);
  baseShape.lineTo(bw, -0.35);
  baseShape.lineTo(bw, 0.05);
  baseShape.lineTo(-bw, 0.05);
  baseShape.closePath();

  const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
    depth: bd * 2,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  baseGeo.translate(0, 0, -bd);
  const baseMesh = new THREE.Mesh(baseGeo, warmLeatherMat);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Kaki karet kecil di dasar kamera agar kokoh & berjarak bersih dari meja
  const footGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.04, 16);
  [
    [-0.92, -0.405, 0.72],
    [0.92, -0.405, 0.72],
    [-0.92, -0.405, -0.72],
    [0.92, -0.405, -0.72],
  ].forEach(([fx, fy, fz]) => {
    const foot = new THREE.Mesh(footGeo, darkMetalMat);
    foot.position.set(fx!, fy!, fz!);
    foot.castShadow = true;
    group.add(foot);
  });

  // 2. Bodi Atas Miring Klasik Polaroid (Cream Housing)
  const upperShape = new THREE.Shape();
  upperShape.moveTo(-0.92, -0.45);
  upperShape.lineTo(0.92, -0.45);
  upperShape.lineTo(0.75, 0.72);
  upperShape.lineTo(-0.55, 0.72);
  upperShape.closePath();

  const upperGeo = new THREE.ExtrudeGeometry(upperShape, {
    depth: 2.16,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.045,
    bevelSegments: 3,
  });
  upperGeo.rotateY(Math.PI / 2);
  upperGeo.translate(-1.08, 0.48, 0.02);
  const upperMesh = new THREE.Mesh(upperGeo, creamBodyMat);
  upperMesh.castShadow = true;
  upperMesh.receiveShadow = true;
  group.add(upperMesh);

  // 3. Pelat Wajah Depan (Front Faceplate)
  const facePlate = new THREE.Mesh(
    new THREE.BoxGeometry(2.14, 0.88, 0.08),
    warmLeatherMat
  );
  facePlate.position.set(0, 0.44, 0.86);
  facePlate.rotation.x = -0.14;
  facePlate.castShadow = true;
  group.add(facePlate);

  // 4. Garis Retro 4-Warna Khas Kamera Polaroid (berhenti rapi di atas bibir slot cetak)
  const stripeColors = [0xa95a42, 0xb5843f, 0x4e6e52, 0x2d6366];
  stripeColors.forEach((hex, idx) => {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.24, 0.02),
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.42,
        metalness: 0.08,
      })
    );
    strip.position.set((idx - 1.5) * 0.072, -0.02, 0.962);
    group.add(strip);
  });

  // 5. Celah Slot Pengeluaran Foto Nyata (Cavity Gelap Lega + Bibir Rol Atas & Bawah bebas tabrakan)
  const slotCavity = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.09, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x0e0c0a,
      roughness: 0.98,
      metalness: 0.0,
    })
  );
  slotCavity.position.set(0, -0.215, 0.935);
  group.add(slotCavity);

  // Bibir rol chrome atas & bibir penopang bawah memberi celah vertikal 0.091 unit agar foto 0.012 tak terpotong
  const rollerLipTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.64, 0.028, 0.075),
    chromeMat
  );
  rollerLipTop.position.set(0, -0.156, 0.985);
  group.add(rollerLipTop);

  const rollerLipBottom = new THREE.Mesh(
    new THREE.BoxGeometry(1.64, 0.026, 0.072),
    darkMetalMat
  );
  rollerLipBottom.position.set(0, -0.274, 0.982);
  group.add(rollerLipBottom);

  // Anchor eksak mulut celah pengeluaran film tepat di depan bibir rol
  const slotAnchor = new THREE.Object3D();
  slotAnchor.position.set(0, -0.215, 1.005);
  group.add(slotAnchor);

  // 6. Rakitan Lensa Bertingkat (Outer Collar + Chrome Ring + Inner Baffle + Glass)
  const lensGroup = new THREE.Group();
  lensGroup.position.set(0.02, 0.44, 0.93);
  lensGroup.rotation.x = -0.14;

  const outerBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.39, 0.43, 0.24, 36),
    darkMetalMat
  );
  outerBarrel.rotation.x = Math.PI / 2;
  outerBarrel.castShadow = true;
  lensGroup.add(outerBarrel);

  const chromeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.355, 0.028, 16, 42),
    chromeMat
  );
  chromeRing.position.z = 0.11;
  lensGroup.add(chromeRing);

  const innerRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.31, 0.16, 32),
    warmLeatherMat
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.z = 0.07;
  lensGroup.add(innerRing);

  const opticGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.45),
    lensGlassMat
  );
  opticGlass.rotation.x = Math.PI / 2;
  opticGlass.position.z = 0.01;
  opticGlass.scale.set(1, 0.55, 1);
  lensGroup.add(opticGlass);

  group.add(lensGroup);

  // 7. Modul Flash Strobe Klasik di Kiri Atas
  const flashHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.46, 0.42),
    creamBodyMat
  );
  flashHousing.position.set(-0.62, 1.32, 0.18);
  flashHousing.castShadow = true;
  group.add(flashHousing);

  const flashFace = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.32, 0.04),
    flashBulbMat
  );
  flashFace.position.set(-0.62, 1.32, 0.39);
  group.add(flashFace);

  const flashFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.38, 0.03),
    chromeMat
  );
  flashFrame.position.set(-0.62, 1.32, 0.375);
  group.add(flashFrame);

  // 8. Jendela Bidik (Viewfinder) di Kanan Atas
  const viewfinderBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.34, 0.48),
    darkMetalMat
  );
  viewfinderBox.position.set(0.72, 1.24, 0.22);
  viewfinderBox.castShadow = true;
  group.add(viewfinderBox);

  const vfLens = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.22, 0.04),
    lensGlassMat
  );
  vfLens.position.set(0.72, 1.24, 0.46);
  group.add(vfLens);

  // 9. Tombol Rana (Shutter Button) Merah-Terracotta
  const shutterCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.135, 0.145, 0.05, 24),
    chromeMat
  );
  shutterCollar.rotation.x = Math.PI / 2 - 0.14;
  shutterCollar.position.set(-0.74, 0.36, 0.91);
  group.add(shutterCollar);

  const shutterButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.11, 0.09, 24),
    shutterMat
  );
  shutterButton.rotation.x = Math.PI / 2 - 0.14;
  shutterButton.position.set(-0.74, 0.36, 0.94);
  group.add(shutterButton);

  // 10. Pengait Tali Samping (Strap Lugs) & Dial Pengatur Cahaya
  const leftLug = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 10, 20),
    chromeMat
  );
  leftLug.rotation.y = Math.PI / 2;
  leftLug.position.set(-1.18, 0.34, 0);
  group.add(leftLug);

  const rightLug = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 10, 20),
    chromeMat
  );
  rightLug.rotation.y = Math.PI / 2;
  rightLug.position.set(1.18, 0.34, 0);
  group.add(rightLug);

  const exposureDial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.06, 20),
    chromeMat
  );
  exposureDial.rotation.x = Math.PI / 2 - 0.14;
  exposureDial.position.set(0.72, 0.42, 0.91);
  group.add(exposureDial);

  return { group, slotAnchor, shutterButton, flashBulbMat };
}

export function PolaroidCamera3D({ moments }: PolaroidCamera3DProps) {
  const { tier, reducedMotion, webglSupported } = useVisualTier();
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const pointerRef = React.useRef({ x: 0, y: 0 });
  const skipRequestedRef = React.useRef(false);

  const realMoments = React.useMemo(() => {
    const reals = moments.filter(
      (m) =>
        Boolean(m.image_url) &&
        !m.image_url.startsWith("/api/moment-illustration")
    );
    const heroFirst = [...reals].sort(
      (a, b) =>
        (b.category === "Foto Hero 3D" ? 1 : 0) -
          (a.category === "Foto Hero 3D" ? 1 : 0) ||
        (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
    );
    return heroFirst.length > 0 ? heroFirst : moments.slice(0, 6);
  }, [moments]);

  const [activeIdx, setActiveIdx] = React.useState(0);
  const [stagePhaseLabel, setStagePhaseLabel] = React.useState(
    "Mengokang lensa 35mm..."
  );

  const is2DFallback = tier === "simple" || reducedMotion || !webglSupported;

  // Fallback siklus 2D otomatis bila perangkat dalam mode Simple / Reduced Motion
  React.useEffect(() => {
    if (!is2DFallback || realMoments.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % realMoments.length);
    }, 4800);
    return () => window.clearInterval(id);
  }, [is2DFallback, realMoments.length]);

  React.useEffect(() => {
    if (is2DFallback) return;
    const container = mountRef.current;
    if (!container) return;

    let isDisposed = false;
    let rafId = 0;
    const isSoftwareGl = isSoftwareWebGL();

    const width = Math.max(320, container.clientWidth || 620);
    const height = Math.max(380, container.clientHeight || 500);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 45);
    camera.position.set(0, 0.86, 7.25);
    camera.lookAt(0, 0.24, 0.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.localClippingEnabled = true;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Mandatory Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // Pencahayaan studio sepia seimbang (tanpa glare berlebih agar foto & bodi kamera tetap detail terbaca)
    const hemiLight = new THREE.HemisphereLight(0xf5ecd8, 0x463a2e, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3dd, 1.42);
    keyLight.position.set(4.2, 5.4, 3.6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe2d4b7, 0.78);
    rimLight.position.set(-4.2, 2.8, -3.5);
    scene.add(rimLight);

    const flashLight = new THREE.PointLight(0xfff1cf, 0, 12, 1.6);
    flashLight.position.set(-0.62, 1.32, 0.8);
    scene.add(flashLight);

    // Alas bayangan studio dipusatkan persis di bawah kamera (radius 2.15, z=-0.05) sehingga mustahil memotong foto saat zoom
    const shadowPlaneMat = new THREE.ShadowMaterial({
      opacity: 0.18,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(
      new THREE.CircleGeometry(2.15, 48),
      shadowPlaneMat
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -0.52, -0.05);
    shadowPlane.receiveShadow = true;
    shadowPlane.renderOrder = -1;
    scene.add(shadowPlane);

    // Rakit Kamera Polaroid 3D di atas alas studio
    const cameraRig = new THREE.Group();
    const {
      group: polaroidModel,
      slotAnchor,
      shutterButton,
      flashBulbMat,
    } = createVintagePolaroidCameraModel();
    polaroidModel.position.set(0, -0.04, 0);
    cameraRig.add(polaroidModel);
    scene.add(cameraRig);

    // Lembar Foto Polaroid + bidang potong tepat di dalam mulut slot gelap (z = 0.975)
    const slotClipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.975);
    const localSlotPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.975);
    const slotClipList = [slotClipPlane];
    const emptyClipList: THREE.Plane[] = [];

    const CARD_H = 1.63;
    const EJECT_SCALE = 0.92;
    const cardGeo = new THREE.BoxGeometry(1.36, CARD_H, 0.012);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xe9dfc9,
      roughness: 0.78,
      metalness: 0.0,
      envMapIntensity: 0.25,
      transparent: true,
      opacity: 0,
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x2d241c,
      roughness: 0.88,
      envMapIntensity: 0.2,
      transparent: true,
      opacity: 0,
    });
    // Kertas foto matte-satin rendah pantulan agar isi gambar & teks caption bebas silau dan nyaman dibaca
    const frontMat = new THREE.MeshStandardMaterial({
      color: 0xe6e1d7,
      roughness: 0.88,
      metalness: 0.0,
      envMapIntensity: 0.18,
      transparent: true,
      opacity: 0,
    });

    const photoMesh = new THREE.Mesh(cardGeo, [
      edgeMat,
      edgeMat,
      edgeMat,
      edgeMat,
      frontMat, // +Z face
      backMat,
    ]);
    photoMesh.castShadow = !isSoftwareGl;
    photoMesh.visible = false;
    scene.add(photoMesh);

    // Pre-allocated zero-GC math helpers untuk tick()
    const _slotWorldPos = new THREE.Vector3();
    const _slotWorldQuat = new THREE.Quaternion();
    const _ejectDir = new THREE.Vector3();
    const _localTiltQuat = new THREE.Quaternion();
    const _xAxis = new THREE.Vector3(1, 0, 0);
    const _startEjectPos = new THREE.Vector3();
    const _startEjectQuat = new THREE.Quaternion();
    const _targetZoomPos = new THREE.Vector3();
    const _targetZoomQuat = new THREE.Quaternion();
    const _targetZoomEuler = new THREE.Euler(0, 0, 0, "XYZ");

    // Cache gambar yang telah dimuat agar pergantian loop berikutnya instan
    const loadedImgs = new Map<number, HTMLImageElement | null>();
    let currentTexture: THREE.CanvasTexture | null = null;
    let appliedIdx = -1;

    const applyPhotoForIndex = async (targetIdx: number) => {
      if (isDisposed || realMoments.length === 0) return;
      const safeIdx =
        ((targetIdx % realMoments.length) + realMoments.length) %
        realMoments.length;
      const moment = realMoments[safeIdx] ?? null;

      let img = loadedImgs.get(safeIdx);
      if (img === undefined && moment?.image_url) {
        img = await loadImageCorsSafe(moment.image_url);
        if (isDisposed) return;
        loadedImgs.set(safeIdx, img);
      }

      const nextTex = buildPolaroidCanvasTexture(moment, img ?? null, safeIdx);
      if (isDisposed) {
        nextTex.dispose();
        return;
      }
      if (currentTexture) {
        currentTexture.dispose();
      }
      currentTexture = nextTex;
      frontMat.map = nextTex;
      frontMat.needsUpdate = true;
      appliedIdx = safeIdx;
    };

    // Preload foto pertama dan kedua di latar belakang
    void applyPhotoForIndex(0).then(() => {
      if (!isDisposed) {
        window.dispatchEvent(new CustomEvent("app:scene-ready"));
      }
    });
    if (realMoments.length > 1 && realMoments[1]?.image_url) {
      void loadImageCorsSafe(realMoments[1].image_url).then((img) => {
        if (!isDisposed) loadedImgs.set(1, img);
      });
    }

    let loopIdx = 0;
    let cycleElapsed = 0;
    let lastReportedPhase = "";
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            rafId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            rafId = window.setTimeout(cb, 80);
          }
        };
        rafId = window.setTimeout(poll, 5);
      } catch {
        rafId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (isDisposed) return;
      const dt = Math.min(0.06, clock.getDelta());

      if (!document.hidden) {
        if (skipRequestedRef.current) {
          skipRequestedRef.current = false;
          cycleElapsed = 0.05;
          loopIdx =
            realMoments.length > 0 ? (loopIdx + 1) % realMoments.length : 0;
          setActiveIdx(loopIdx);
          void applyPhotoForIndex(loopIdx);
        } else {
          cycleElapsed += dt;
        }

        if (cycleElapsed >= LOOP_DURATION_SEC) {
          cycleElapsed = cycleElapsed % LOOP_DURATION_SEC;
          if (realMoments.length > 0) {
            loopIdx = (loopIdx + 1) % realMoments.length;
            setActiveIdx(loopIdx);
            void applyPhotoForIndex(loopIdx);
          }
        }

        // Pastikan foto berikutnya selalu siap di cache sebelum akhir siklus
        const nextIdx =
          realMoments.length > 0 ? (loopIdx + 1) % realMoments.length : 0;
        if (
          cycleElapsed > 4.2 &&
          !loadedImgs.has(nextIdx) &&
          realMoments[nextIdx]?.image_url
        ) {
          loadedImgs.set(nextIdx, null);
          void loadImageCorsSafe(realMoments[nextIdx]!.image_url).then(
            (img) => {
              if (!isDisposed) loadedImgs.set(nextIdx, img);
            }
          );
        }
        if (appliedIdx !== loopIdx && cycleElapsed < 0.4) {
          void applyPhotoForIndex(loopIdx);
        }

        const t = cycleElapsed;
        const px = pointerRef.current.x;
        const py = pointerRef.current.y;

        // 1. Gerak Kamera Polaroid 3D + Kilat Flash + Mundur Halus Saat Foto Zoom
        const shutterPress =
          smoothstep(0.62, 0.78, t) * (1 - smoothstep(0.84, 1.04, t));
        shutterButton.position.z = 0.94 - shutterPress * 0.05;

        const flashBurst =
          smoothstep(0.74, 0.82, t) * (1 - smoothstep(0.84, 1.18, t));
        flashLight.intensity = flashBurst * 4.5;
        flashBulbMat.emissiveIntensity = 0.18 + flashBurst * 3.8;

        const recoil =
          smoothstep(0.76, 0.84, t) * (1 - smoothstep(0.86, 1.15, t));

        // Kamera sedikit mundur ke kiri saat foto men-zoom agar lega & tak pernah menyentuh lantai
        const camStepBack =
          smoothstep(3.05, 4.1, t) * (1 - smoothstep(5.9, 7.05, t));

        cameraRig.position.x = THREE.MathUtils.lerp(
          cameraRig.position.x,
          -camStepBack * 0.48 + px * 0.16,
          0.1
        );
        cameraRig.position.y = THREE.MathUtils.lerp(
          cameraRig.position.y,
          0.02 + camStepBack * 0.04 + Math.sin(t * 1.6) * 0.022 + py * 0.06,
          0.1
        );
        cameraRig.position.z = THREE.MathUtils.lerp(
          cameraRig.position.z,
          -recoil * 0.08 - camStepBack * 0.92,
          0.12
        );
        cameraRig.rotation.y = THREE.MathUtils.lerp(
          cameraRig.rotation.y,
          -0.24 + Math.sin(t * 0.9) * 0.05 - camStepBack * 0.18 + px * 0.2,
          0.08
        );
        cameraRig.rotation.x = THREE.MathUtils.lerp(
          cameraRig.rotation.x,
          0.06 - recoil * 0.04 + py * 0.08,
          0.08
        );

        cameraRig.updateMatrixWorld(true);

        // 2. Lembar Polaroid: Keluar Akurat Tepat dari Celah Mulut Slot -> Zoom Mendekat -> Pudar Pelan -> Reset
        const setPhotoClipping = (planes: THREE.Plane[]) => {
          if (frontMat.clippingPlanes !== planes) {
            frontMat.clippingPlanes = planes;
            edgeMat.clippingPlanes = planes;
            backMat.clippingPlanes = planes;
          }
        };

        const computeSlotEjectPose = (
          pVal: number,
          outPos: THREE.Vector3,
          outQuat: THREE.Quaternion
        ) => {
          slotAnchor.getWorldPosition(_slotWorldPos);
          slotAnchor.getWorldQuaternion(_slotWorldQuat);

          // Keluar lurus sejajar celah rol (-91.7° sedikit mendongak) sehingga tidak menabrak bibir rol atas maupun turun ke lantai
          const pitchRad = -Math.PI / 2 - 0.03;
          _localTiltQuat.setFromAxisAngle(_xAxis, pitchRad);
          outQuat.copy(_slotWorldQuat).multiply(_localTiltQuat);

          // Arah dorong persis sejajar bidang lembar foto (sumbu -Y kartu menuju +Z mulut slot)
          _ejectDir.set(0, -1, 0).applyQuaternion(outQuat).normalize();

          // Jarak terukur persis berdasarkan ukuran kartu terskala: p=0 tersembunyi penuh di dalam slot, p=1 seluruh bingkai bebas dari rol
          const halfLen = CARD_H * 0.5 * EJECT_SCALE;
          const distFromSlot = THREE.MathUtils.lerp(
            -halfLen - 0.012,
            halfLen + 0.085,
            pVal
          );
          outPos.copy(_slotWorldPos).addScaledVector(_ejectDir, distFromSlot);
        };

        if (t < 1.08) {
          photoMesh.visible = false;
          setPhotoClipping(emptyClipList);
          frontMat.opacity = 0;
          edgeMat.opacity = 0;
          backMat.opacity = 0;
          if (lastReportedPhase !== "bidik") {
            lastReportedPhase = "bidik";
            setStagePhaseLabel("Membidik momen & menekan rana...");
          }
        } else if (t < 3.05) {
          // Fase cetak keluar lurus bersih dari mulut rol depan tanpa memotong tepi bawah/atas foto
          const p = easeOutCubic((t - 1.08) / (3.05 - 1.08));
          photoMesh.visible = true;

          slotClipPlane
            .copy(localSlotPlane)
            .applyMatrix4(polaroidModel.matrixWorld);
          setPhotoClipping(slotClipList);

          computeSlotEjectPose(p, photoMesh.position, photoMesh.quaternion);
          photoMesh.scale.set(EJECT_SCALE, EJECT_SCALE, EJECT_SCALE);

          // Efek foto Polaroid perlahan matang warnanya hingga tingkat kecerahan nyaman (bebas silau)
          const dev = smoothstep(1.15, 2.75, t);
          const shade = THREE.MathUtils.lerp(0.32, 0.9, dev);
          frontMat.color.setRGB(shade, shade * 0.98, shade * 0.94);

          const fadeStart = smoothstep(1.08, 1.22, t);
          frontMat.opacity = fadeStart;
          edgeMat.opacity = fadeStart;
          backMat.opacity = fadeStart;

          if (lastReportedPhase !== "cetak") {
            lastReportedPhase = "cetak";
            setStagePhaseLabel("Mencetak lembar Polaroid kelas...");
          }
        } else if (t < 5.45) {
          // Fase terangkat melengkung ke atas & zoom mendekat penuh di atas lantai (clearance lantai aman > 0.10 unit)
          setPhotoClipping(emptyClipList);
          const p = easeInOutCubic((t - 3.05) / 1.15);
          computeSlotEjectPose(1, _startEjectPos, _startEjectQuat);

          _targetZoomPos.set(px * 0.08, 0.44 + py * 0.05, 3.18);
          _targetZoomEuler.set(0.03, px * 0.12, 0.012, "XYZ");
          _targetZoomQuat.setFromEuler(_targetZoomEuler);

          photoMesh.visible = true;
          photoMesh.position.lerpVectors(_startEjectPos, _targetZoomPos, p);
          // Busur angkat saat kartu berputar tegak agar sudut bawah kertas tak pernah mendekati alas studio
          photoMesh.position.y += Math.sin(p * Math.PI) * 0.24;
          photoMesh.quaternion.slerpQuaternions(
            _startEjectQuat,
            _targetZoomQuat,
            p
          );

          const zoomScale = THREE.MathUtils.lerp(EJECT_SCALE, 1.05, p);
          photoMesh.scale.set(zoomScale, zoomScale, zoomScale);
          frontMat.color.setRGB(0.9, 0.882, 0.846);
          frontMat.opacity = 1;
          edgeMat.opacity = 1;
          backMat.opacity = 1;

          if (lastReportedPhase !== "zoom") {
            lastReportedPhase = "zoom";
            setStagePhaseLabel("Menampilkan hasil cetakan kenangan...");
          }
        } else {
          // Fase pudar pelan-pelan sebelum looping ulang
          setPhotoClipping(emptyClipList);
          const fadeOutP = smoothstep(5.45, 6.75, t);
          const op = Math.max(0, 1 - fadeOutP);
          photoMesh.visible = op > 0.01;
          photoMesh.position.set(
            px * 0.08,
            0.44 + fadeOutP * 0.14,
            3.18 + fadeOutP * 0.22
          );
          const driftScale = 1.05 + fadeOutP * 0.08;
          photoMesh.scale.set(driftScale, driftScale, driftScale);
          photoMesh.rotation.set(0.03, px * 0.12, 0.012);
          frontMat.color.setRGB(0.9, 0.882, 0.846);
          frontMat.opacity = op;
          edgeMat.opacity = op;
          backMat.opacity = op;

          if (lastReportedPhase !== "fade") {
            lastReportedPhase = "fade";
            setStagePhaseLabel("Menyiapkan gulungan film berikutnya...");
          }
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      rafId = requestAnimationFrame(tick);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (isDisposed || !container) return;
      const nw = Math.max(300, container.clientWidth);
      const nh = Math.max(340, container.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      window.clearTimeout(rafId);
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      if (currentTexture) currentTexture.dispose();
      envTexture.dispose();
      disposeSceneGraph(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [is2DFallback, realMoments]);

  const activeMoment =
    realMoments[activeIdx % Math.max(1, realMoments.length)] ?? null;
  const activeCaption = decodeHtmlEntities(
    activeMoment?.caption || "XII PPLG 1 · MAKN Ende — Satu Angkatan, Satu Cerita"
  );
  const activeDate = decodeHtmlEntities(
    activeMoment?.taken_at || "2024 — 2027"
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * -2;
  };

  const handlePointerLeave = () => {
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
  };

  const handleNextPhoto = () => {
    if (is2DFallback) {
      setActiveIdx((prev) =>
        realMoments.length > 0 ? (prev + 1) % realMoments.length : 0
      );
      return;
    }
    skipRequestedRef.current = true;
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full overflow-visible"
    >
      {/* Panggung WebGL 3D Terbuka atau Tumpukan Kertas Cetak Foto Asli 2D */}
      {is2DFallback ? (
        <div className="relative flex min-h-[400px] sm:min-h-[470px] w-full items-center justify-center py-8 px-4">
          <div className="relative mx-auto w-[286px] sm:w-[336px]">
            {/* Lembar foto tumpukan belakang kanan (kedalaman kertas cetak fisik) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 translate-x-3 translate-y-2 rotate-[4.5deg] rounded-[3px] border border-[#CBBBA0] bg-[#EAE0C8] shadow-[0_14px_30px_-12px_rgba(24,18,12,0.28)]"
            />
            {/* Lembar foto tumpukan belakang kiri */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-3 translate-y-1.5 -rotate-[4deg] rounded-[3px] border border-[#D4C5AA] bg-[#F1E8D3] shadow-[0_16px_32px_-12px_rgba(24,18,12,0.3)]"
            />

            {/* Selotip kertas transparan tipis di sisi atas seperti tempelan foto asli */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-3.5 left-1/2 z-20 h-7 w-24 -translate-x-1/2 -rotate-2 border border-[#C8B99B]/60 bg-[#F5EDD6]/75 shadow-xs backdrop-blur-[1px]"
            />

            {/* Kertas Cetak Foto Polaroid Utama yang Otentik */}
            <AnimatePresence mode="wait">
              <motion.figure
                key={`${activeMoment?.id ?? "fallback"}-${activeIdx}`}
                initial={{ opacity: 0, y: 18, rotate: -2.2, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, rotate: -1.1, scale: 1 }}
                exit={{ opacity: 0, y: -14, rotate: 1.5, scale: 0.98 }}
                whileHover={{ rotate: 0, y: -4, scale: 1.015 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="relative z-10 rounded-[3px] border border-[#D2C3A6] bg-[#F6EFE0] p-3.5 pb-6 text-[#1E1712] shadow-[0_24px_48px_-16px_rgba(24,18,12,0.38),0_4px_12px_-4px_rgba(24,18,12,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]"
              >
                {/* Tekstur serat kertas cetak sangat halus */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[3px] opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(82,66,48,0.16) 0.55px, transparent 0.55px)",
                    backgroundSize: "9px 9px",
                  }}
                />

                {/* Bidang Foto Emulsi Cekung dengan Bingkai Tipis Asli */}
                <div className="relative aspect-[4/3.45] w-full overflow-hidden rounded-[2px] border border-[#B8A789] bg-[#241C16] shadow-[inset_0_2px_6px_rgba(0,0,0,0.28)]">
                  {activeMoment?.image_url &&
                  !activeMoment.image_url.startsWith(
                    "/api/moment-illustration"
                  ) ? (
                    <img
                      src={activeMoment.image_url}
                      alt={activeCaption}
                      referrerPolicy="no-referrer"
                      className="public-film-photo size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center p-4 text-center text-[#EFE5CE]">
                      <p className="font-serif text-2xl font-bold">UNO</p>
                      <p className="mt-1 font-mono text-[11px] tracking-widest">
                        XII PPLG 1 · MAKN ENDE
                      </p>
                    </div>
                  )}
                  {/* Vignette tipis alami di tepi cetakan */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 shadow-[inset_0_0_24px_rgba(24,18,12,0.18)]"
                  />
                </div>

                {/* Dagu Bawah Kertas Polaroid dengan Tulisan Tangan & Cap Frame */}
                <figcaption className="relative mt-4 px-1 text-center">
                  <p className="line-clamp-2 font-hand text-[22px] sm:text-[24px] font-semibold leading-[1.2] text-[#1F1812]">
                    {activeCaption}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-[#D8CBB2]/80 pt-2 font-mono text-[10px] tracking-[0.12em] text-[#5C4E3E]">
                    <span>
                      NO. {String(activeIdx + 1).padStart(2, "0")} ·{" "}
                      {activeMoment?.phase
                        ? `KLS ${activeMoment.phase}`
                        : "XII PPLG 1"}
                    </span>
                    <span className="tabular-nums">{activeDate}</span>
                  </div>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div
          ref={mountRef}
          aria-label="Model 3D Kamera Polaroid Jadul mencetak foto kenangan XII PPLG 1"
          className="relative h-[420px] sm:h-[500px] lg:h-[540px] w-full cursor-grab active:cursor-grabbing"
        />
      )}

      {/* Keterangan Tipis Foto Sedang Dicetak + Tombol Cetak Berikutnya */}
      <div className="relative z-10 mt-1 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Camera className="size-3 shrink-0" />
            <span className="truncate">{stagePhaseLabel}</span>
            <span className="shrink-0 tabular-nums font-bold text-foreground">
              · {String(activeIdx + 1).padStart(2, "0")}/
              {String(Math.max(1, realMoments.length)).padStart(2, "0")}
            </span>
          </p>
          <p className="mt-0.5 truncate font-serif text-sm font-bold text-foreground">
            {activeCaption}
          </p>
        </div>

        <button
          type="button"
          onClick={handleNextPhoto}
          className="inline-flex min-h-[34px] shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-card/85 px-3 py-1.5 font-sans text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <span>Cetak Foto Lain</span>
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
