"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
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

  // Kertas Polaroid kecreaman vintage
  ctx.fillStyle = "#F5EDD8";
  ctx.fillRect(0, 0, w, h);

  // Tekstur serat halus kertas Polaroid
  for (let i = 0; i < 420; i++) {
    const px = (i * 173 + 29) % w;
    const py = (i * 251 + 61) % h;
    ctx.fillStyle =
      i % 3 === 0 ? "rgba(107, 91, 75, 0.06)" : "rgba(45, 36, 28, 0.025)";
    ctx.fillRect(px, py, 2, 1);
  }

  // Bingkai luar kertas
  ctx.strokeStyle = "#D4C29E";
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

    // Filter foto jadul pucat & pudar hangat
    ctx.filter = "saturate(46%) contrast(92%) brightness(104%) sepia(20%)";
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = "none";

    // Lapisan tipis warna kertas cream agar senada
    ctx.fillStyle = "rgba(239, 229, 206, 0.12)";
    ctx.fillRect(photoX, photoY, photoW, photoH);
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
  ctx.strokeStyle = "#B8A582";
  ctx.lineWidth = 2;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  // Teks tulisan tangan/editorial pada dagu bawah Polaroid
  const caption = decodeHtmlEntities(
    moment?.caption || "Kenangan bersama keluarga besar XII PPLG 1 MAKN Ende"
  );
  const phaseLabel = moment?.phase ? `KELAS ${moment.phase}` : "XII PPLG 1";
  const takenAt = decodeHtmlEntities(moment?.taken_at || "2024 — 2027");
  const frameCode = `FRAME #${String(seqIndex + 1).padStart(2, "0")}`;

  ctx.textAlign = "center";
  ctx.fillStyle = "#261F18";
  ctx.font = 'bold 26px "Old Standard TT", Georgia, serif';
  const capLines = wrapCanvasText(ctx, caption, photoW - 12, 2);
  capLines.forEach((ln, idx) => {
    ctx.fillText(ln, w / 2, 622 + idx * 34);
  });

  ctx.fillStyle = "#6B5B4B";
  ctx.font = '16px "Special Elite", "Courier New", monospace';
  ctx.fillText(
    `${frameCode} · ${phaseLabel} · ${takenAt}`,
    w / 2,
    h - 38
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Membangun model 3D Kamera Polaroid Vintage multi-bagian (14+ komponen prosedural).
 */
function createVintagePolaroidCameraModel(): {
  group: THREE.Group;
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
  // Putar agar profil miring menghadap ke sumbu Z depan
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

  // 4. Garis Retro 4-Warna Khas Kamera Polaroid Jadul
  const stripeColors = [0xa95a42, 0xb5843f, 0x4e6e52, 0x2d6366];
  stripeColors.forEach((hex, idx) => {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.62, 0.02),
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.42,
        metalness: 0.08,
      })
    );
    strip.position.set((idx - 1.5) * 0.072, -0.05, 0.94);
    group.add(strip);
  });

  // 5. Celah Slot Pengeluaran Foto & Bibir Chrome
  const slotMouth = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.065, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x16120e,
      roughness: 0.95,
      metalness: 0.0,
    })
  );
  slotMouth.position.set(0, -0.22, 0.92);
  group.add(slotMouth);

  const rollerLip = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.032, 0.08),
    chromeMat
  );
  rollerLip.position.set(0, -0.165, 0.96);
  group.add(rollerLip);

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

  return { group, shutterButton, flashBulbMat };
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
    camera.position.set(0, 0.36, 7.15);
    camera.lookAt(0, 0.08, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
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

    // Pencahayaan studio sepia hangat
    const hemiLight = new THREE.HemisphereLight(0xfaf0dc, 0x463a2e, 1.35);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4df, 2.2);
    keyLight.position.set(3.5, 5.2, 4.6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0004;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe5d7b9, 1.15);
    rimLight.position.set(-4.2, 2.8, -3.5);
    scene.add(rimLight);

    const flashLight = new THREE.PointLight(0xfff1cf, 0, 12, 1.6);
    flashLight.position.set(-0.62, 1.32, 0.8);
    scene.add(flashLight);

    // Alas meja studio tipis sebagai contact shadow
    const shadowPlane = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      new THREE.ShadowMaterial({ opacity: 0.22 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.82;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Rakit Kamera Polaroid 3D
    const cameraRig = new THREE.Group();
    const { group: polaroidModel, shutterButton, flashBulbMat } =
      createVintagePolaroidCameraModel();
    polaroidModel.position.set(0, -0.35, 0);
    cameraRig.add(polaroidModel);
    scene.add(cameraRig);

    // Lembar Foto Polaroid + bidang potong celah slot depan
    const slotClipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.95);
    const localSlotPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.95);
    const slotClipList = [slotClipPlane];
    const emptyClipList: THREE.Plane[] = [];

    const cardGeo = new THREE.BoxGeometry(1.36, 1.63, 0.014);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xf5edd8,
      roughness: 0.65,
      metalness: 0.02,
      transparent: true,
      opacity: 0,
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x2d241c,
      roughness: 0.85,
      transparent: true,
      opacity: 0,
    });
    const frontMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.04,
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

        // Kamera sedikit mundur ke kiri bawah saat foto men-zoom agar foto lega di tengah
        const camStepBack =
          smoothstep(3.05, 4.1, t) * (1 - smoothstep(5.9, 7.05, t));

        cameraRig.position.x = THREE.MathUtils.lerp(
          cameraRig.position.x,
          -camStepBack * 0.48 + px * 0.16,
          0.1
        );
        cameraRig.position.y = THREE.MathUtils.lerp(
          cameraRig.position.y,
          -camStepBack * 0.14 + Math.sin(t * 1.6) * 0.025 + py * 0.08,
          0.1
        );
        cameraRig.position.z = THREE.MathUtils.lerp(
          cameraRig.position.z,
          -recoil * 0.08 - camStepBack * 0.95,
          0.12
        );
        cameraRig.rotation.y = THREE.MathUtils.lerp(
          cameraRig.rotation.y,
          -0.26 + Math.sin(t * 0.9) * 0.05 - camStepBack * 0.18 + px * 0.22,
          0.08
        );
        cameraRig.rotation.x = THREE.MathUtils.lerp(
          cameraRig.rotation.x,
          0.08 - recoil * 0.05 + py * 0.12,
          0.08
        );

        cameraRig.updateMatrixWorld(true);

        // 2. Lembar Polaroid: Cetak Keluar Tepat dari Mulut Slot -> Zoom Mendekat -> Pudar Pelan -> Reset
        const setPhotoClipping = (planes: THREE.Plane[]) => {
          if (frontMat.clippingPlanes !== planes) {
            frontMat.clippingPlanes = planes;
            edgeMat.clippingPlanes = planes;
            backMat.clippingPlanes = planes;
          }
        };

        const computeEjectPose = (pVal: number) => {
          const rxLocal = -1.23 + pVal * 0.16;
          const forwardDir = new THREE.Vector3(
            0,
            -Math.cos(rxLocal),
            -Math.sin(rxLocal)
          );
          const slotOrigin = new THREE.Vector3(0, -0.565, 0.96);
          const localCenter = slotOrigin.addScaledVector(
            forwardDir,
            pVal * 1.6 - 0.78
          );
          const worldCenter = localCenter.clone();
          cameraRig.localToWorld(worldCenter);
          return { worldCenter, rxLocal };
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
          // Fase cetak keluar tepat dari celah bibir slot depan dengan clipping bidang slot
          const p = easeOutCubic((t - 1.08) / (3.05 - 1.08));
          photoMesh.visible = true;

          slotClipPlane.copy(localSlotPlane).applyMatrix4(cameraRig.matrixWorld);
          setPhotoClipping(slotClipList);

          const { worldCenter, rxLocal } = computeEjectPose(p);
          photoMesh.position.copy(worldCenter);
          photoMesh.rotation.set(
            cameraRig.rotation.x + rxLocal,
            cameraRig.rotation.y,
            cameraRig.rotation.z
          );
          const s = 0.9 + p * 0.06;
          photoMesh.scale.set(s, s, s);

          // Efek foto Polaroid perlahan matang warnanya saat keluar
          const dev = smoothstep(1.15, 2.75, t);
          const shade = THREE.MathUtils.lerp(0.32, 1.0, dev);
          frontMat.color.setRGB(shade, shade * 0.99, shade * 0.96);

          const fadeStart = smoothstep(1.08, 1.24, t);
          frontMat.opacity = fadeStart;
          edgeMat.opacity = fadeStart;
          backMat.opacity = fadeStart;

          if (lastReportedPhase !== "cetak") {
            lastReportedPhase = "cetak";
            setStagePhaseLabel("Mencetak lembar Polaroid kelas...");
          }
        } else if (t < 5.45) {
          // Fase terlepas dari slot & zoom mendekat tanpa terpotong
          setPhotoClipping(emptyClipList);
          const p = easeInOutCubic((t - 3.05) / 1.15);
          const { worldCenter: startPos, rxLocal: startRx } = computeEjectPose(1);
          const targetPos = new THREE.Vector3(
            px * 0.08,
            0.16 + py * 0.05,
            3.35
          );

          photoMesh.visible = true;
          photoMesh.position.lerpVectors(startPos, targetPos, p);
          photoMesh.rotation.set(
            THREE.MathUtils.lerp(cameraRig.rotation.x + startRx, 0.02, p),
            THREE.MathUtils.lerp(cameraRig.rotation.y, px * 0.12, p),
            THREE.MathUtils.lerp(cameraRig.rotation.z, 0.015, p)
          );
          const zoomScale = THREE.MathUtils.lerp(0.96, 1.18, p);
          photoMesh.scale.set(zoomScale, zoomScale, zoomScale);
          frontMat.color.setRGB(1, 1, 1);
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
            0.16 + fadeOutP * 0.16,
            3.35 + fadeOutP * 0.24
          );
          const driftScale = 1.18 + fadeOutP * 0.1;
          photoMesh.scale.set(driftScale, driftScale, driftScale);
          photoMesh.rotation.set(0.02, px * 0.12, 0.015);
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
      {/* Panggung WebGL 3D Terbuka Menyatu dengan Halaman (Tanpa Kontainer Kotak) */}
      {is2DFallback ? (
        <div className="relative flex h-[380px] sm:h-[460px] w-full flex-col items-center justify-center py-4">
          <div className="relative mx-auto w-64 rounded-xl border-2 border-[#2D241C] bg-[#F5EDD8] p-3 pb-5 text-[#261F18] shadow-lg transition-all duration-700">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded border border-[#C9B794] bg-[#2D241C]">
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
                  <p className="font-serif text-xl font-bold">UNO</p>
                  <p className="font-mono text-[10px]">XII PPLG 1</p>
                </div>
              )}
            </div>
            <p className="mt-3 line-clamp-2 text-center font-serif text-sm font-bold text-[#261F18]">
              {activeCaption}
            </p>
            <p className="mt-1 text-center font-mono text-[10px] text-[#6B5B4B]">
              {activeDate}
            </p>
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
