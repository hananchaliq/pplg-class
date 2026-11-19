"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ChevronRight } from "lucide-react";
import { gsap } from "@/lib/gsap-utils";
import { decodeHtmlEntities } from "@/lib/domain-logic";
import { isSoftwareWebGL, useVisualTier } from "@/lib/visual-tier";
import { disposeSceneGraph } from "@/components/three/scene-shell";
import { MOTION_EASE } from "@/lib/motion-tokens";
import type { MomentRow } from "@/lib/types";

interface PolaroidCamera3DProps {
  moments: MomentRow[];
}

const FLOOR_Y = -0.52;
const PHOTO_W = 1.36;
const PHOTO_H = 1.63;
const PHOTO_THICKNESS = 0.014;
const FLOOR_EPSILON = 0.0025;
const PHOTO_LAND_Y = FLOOR_Y + PHOTO_THICKNESS * 0.5 + FLOOR_EPSILON;
const FLOOR_MIN_BOUND_Y = FLOOR_Y + FLOOR_EPSILON;
const EJECT_SCALE = 0.9;

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

/**
 * Tekstur bayangan kontak lembut di lantai khusus untuk foto Polaroid agar terasa menyentuh permukaan.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.49
  );
  grad.addColorStop(0, "rgba(22, 18, 14, 0.44)");
  grad.addColorStop(0.55, "rgba(22, 18, 14, 0.22)");
  grad.addColorStop(0.82, "rgba(22, 18, 14, 0.06)");
  grad.addColorStop(1, "rgba(22, 18, 14, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildPolaroidCanvasTexture(
  moment: MomentRow | null,
  img: HTMLImageElement | null,
  seqIndex: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const w = 640;
  const h = 768;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Kertas Polaroid matte kecreaman hangat (tidak silau, nyaman dibaca lama)
  ctx.fillStyle = "#EFE7D4";
  ctx.fillRect(0, 0, w, h);

  // Serat halus kertas cetak foto matte
  for (let i = 0; i < 480; i++) {
    const px = (i * 173 + 29) % w;
    const py = (i * 251 + 61) % h;
    ctx.fillStyle =
      i % 3 === 0 ? "rgba(92, 76, 60, 0.05)" : "rgba(38, 30, 22, 0.025)";
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

  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, photoY, photoW, photoH);
  ctx.clip();

  if (img && img.naturalWidth > 0) {
    const scale = Math.max(
      photoW / img.naturalWidth,
      photoH / img.naturalHeight
    );
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = photoX + (photoW - dw) / 2;
    const dy = photoY + (photoH - dh) / 2;

    ctx.filter = "saturate(78%) contrast(106%) brightness(93%) sepia(10%)";
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = "none";

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

    ctx.fillStyle = "rgba(24, 18, 12, 0.22)";
    ctx.fillRect(photoX, photoY, photoW, 3);
    ctx.fillRect(photoX, photoY, 3, photoH);
  } else {
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

  ctx.strokeStyle = "#A99776";
  ctx.lineWidth = 2;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

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
  ctx.fillText(`${frameCode} · ${phaseLabel} · ${takenAt}`, w / 2, h - 36);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Membangun model 3D Kamera Polaroid Vintage multi-bagian dengan slotAnchor
 * tepat di mulut celah pengeluaran foto (mengikuti rotasi/posisi/skala kamera secara penuh).
 */
function createVintagePolaroidCameraModel(): {
  group: THREE.Group;
  slotAnchor: THREE.Object3D;
  shutterButton: THREE.Mesh;
  flashBulbMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();

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

  // 1. Bodi Bawah (Base Deck & Slot Cetak)
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

  // Kaki karet di dasar kamera (menyentuh tepat lantai y = FLOOR_Y saat model diletakkan)
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

  // 2. Bodi Atas Miring Klasik Polaroid
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

  // 3. Pelat Wajah Depan
  const facePlate = new THREE.Mesh(
    new THREE.BoxGeometry(2.14, 0.88, 0.08),
    warmLeatherMat
  );
  facePlate.position.set(0, 0.44, 0.86);
  facePlate.rotation.x = -0.14;
  facePlate.castShadow = true;
  group.add(facePlate);

  // 4. Garis Retro 4-Warna Khas Polaroid
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

  // 5. Celah Slot Pengeluaran Foto Nyata + Anchor Dunia Presisi
  const slotCavity = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.095, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x0e0c0a,
      roughness: 0.98,
      metalness: 0.0,
    })
  );
  slotCavity.position.set(0, -0.215, 0.935);
  group.add(slotCavity);

  const rollerLipTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.64, 0.028, 0.075),
    chromeMat
  );
  rollerLipTop.position.set(0, -0.154, 0.985);
  group.add(rollerLipTop);

  const rollerLipBottom = new THREE.Mesh(
    new THREE.BoxGeometry(1.64, 0.026, 0.072),
    darkMetalMat
  );
  rollerLipBottom.position.set(0, -0.276, 0.982);
  group.add(rollerLipBottom);

  // Anchor eksak di mulut slot keluar kamera (+Z menghadap keluar celah rol)
  const slotAnchor = new THREE.Object3D();
  slotAnchor.name = "polaroid_slot_anchor";
  slotAnchor.position.set(0, -0.215, 0.996);
  group.add(slotAnchor);

  // 6. Rakitan Lensa Bertingkat
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

  // 7. Modul Flash Strobe
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

  // 8. Jendela Bidik (Viewfinder)
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

  // 9. Tombol Rana (Shutter Button)
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

  // 10. Pengait Tali & Dial Exposure
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
  const skipCycleFnRef = React.useRef<(() => void) | null>(null);

  const realMoments = React.useMemo(() => {
    const heroChannelMoments = moments.filter(
      (m) => m.category === "Foto Hero 3D"
    );
    const realHeroPhotos = heroChannelMoments.filter(
      (m) =>
        Boolean(m.image_url) &&
        !m.image_url.startsWith("/api/moment-illustration")
    );
    if (realHeroPhotos.length > 0) {
      return realHeroPhotos;
    }
    if (heroChannelMoments.length > 0) {
      return heroChannelMoments;
    }
    return [
      {
        id: "fallback-hero-1",
        image_url:
          "/api/moment-illustration?title=Kebersamaan+XII+PPLG+1&phase=XII&category=Foto+Hero+3D&seed=101",
        caption: "Kebersamaan Keluarga Besar XII PPLG 1 di MAKN Ende",
        taken_at: "2026-03-10",
        category: "Foto Hero 3D",
        phase: "XII" as const,
        uploader_name: "Arsip XII PPLG 1",
        featured: true,
        status: "approved" as const,
      },
    ];
  }, [moments]);

  // Ref stabil agar pembaruan data live tidak membongkar ulang WebGLRenderer atau menggandakan loop
  const momentsRef = React.useRef<MomentRow[]>(realMoments);
  React.useEffect(() => {
    momentsRef.current = realMoments;
  }, [realMoments]);

  const [activeIdx, setActiveIdx] = React.useState(0);
  const [stagePhaseLabel, setStagePhaseLabel] = React.useState(
    "Mengokang lensa 35mm..."
  );

  const is2DFallback = tier === "simple" || reducedMotion || !webglSupported;

  // Fallback siklus 2D otomatis bila dalam mode Simple / Reduced Motion
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

    const width = Math.max(300, container.clientWidth || 620);
    const height = Math.max(340, container.clientHeight || 500);

    const scene = new THREE.Scene();
    // Near/Far rapat untuk presisi depth buffer optimal (anti z-fighting)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.25, 36);

    const applyResponsiveCameraFraming = (w: number, h: number) => {
      const aspect = Math.max(0.55, w / Math.max(1, h));
      camera.aspect = aspect;
      // Tarik jarak kamera sedikit pada viewport potret/sempit agar foto mendarat & zoom selalu muat utuh
      const portraitBoost = aspect < 1 ? (1 - aspect) * 2.15 : 0;
      camera.fov = aspect < 0.85 ? 42 : 38;
      camera.position.set(
        0,
        0.92 + portraitBoost * 0.26,
        7.35 + portraitBoost
      );
      camera.lookAt(0, 0.18, 0.38);
      camera.updateProjectionMatrix();
    };
    applyResponsiveCameraFraming(width, height);

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

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // Tata cahaya studio monokrom-hangat seimbang (tanpa glare berlebih)
    const hemiLight = new THREE.HemisphereLight(0xf5ecd8, 0x463a2e, 0.96);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3dd, 1.38);
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

    // Lantai penerima bayangan kamera (di y = FLOOR_Y, polygonOffset & renderOrder = 0)
    const floorShadowMat = new THREE.ShadowMaterial({
      opacity: 0.17,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    });
    const floorShadowPlane = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      floorShadowMat
    );
    floorShadowPlane.rotation.x = -Math.PI / 2;
    floorShadowPlane.position.set(0, FLOOR_Y, 0.45);
    floorShadowPlane.receiveShadow = true;
    floorShadowPlane.renderOrder = 0;
    scene.add(floorShadowPlane);

    // Bayangan kontak lembut khusus lembar foto di lantai (renderOrder = 1, bebas z-fighting)
    const contactShadowTex = createContactShadowTexture();
    const photoContactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const photoContactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(PHOTO_W * 1.24, PHOTO_H * 1.24),
      photoContactShadowMat
    );
    photoContactShadow.rotation.x = -Math.PI / 2;
    photoContactShadow.position.set(0, FLOOR_Y + 0.001, 1.6);
    photoContactShadow.renderOrder = 1;
    photoContactShadow.visible = false;
    scene.add(photoContactShadow);

    // Kamera Polaroid 3D berdiri kokoh di atas lantai (kaki karet di y = -0.425 + -0.095 = -0.52 = FLOOR_Y)
    const cameraRig = new THREE.Group();
    const {
      group: polaroidModel,
      slotAnchor,
      shutterButton,
      flashBulbMat,
    } = createVintagePolaroidCameraModel();
    polaroidModel.position.set(0, FLOOR_Y + 0.425, 0);
    cameraRig.add(polaroidModel);
    scene.add(cameraRig);

    // Bidang potong dunia yang selalu dihitung ulang dari slotAnchor (getWorldPosition/Quaternion)
    const slotClipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const slotClipList = [slotClipPlane];
    const emptyClipList: THREE.Plane[] = [];

    // Pivot foto tepat di pusat geometri agar rotasi, landing, dan Box3 clamp akurat
    const cardGeo = new THREE.BoxGeometry(PHOTO_W, PHOTO_H, PHOTO_THICKNESS);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xe9dfc9,
      roughness: 0.78,
      metalness: 0.0,
      envMapIntensity: 0.22,
      transparent: true,
      opacity: 0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x2d241c,
      roughness: 0.88,
      envMapIntensity: 0.18,
      transparent: true,
      opacity: 0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const frontMat = new THREE.MeshStandardMaterial({
      color: 0xe6e1d7,
      roughness: 0.88,
      metalness: 0.0,
      envMapIntensity: 0.16,
      transparent: true,
      opacity: 0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const photoMesh = new THREE.Mesh(cardGeo, [
      edgeMat,
      edgeMat,
      edgeMat,
      edgeMat,
      frontMat,
      backMat,
    ]);
    photoMesh.castShadow = !isSoftwareGl;
    photoMesh.receiveShadow = false;
    photoMesh.renderOrder = 2;
    photoMesh.visible = false;
    scene.add(photoMesh);

    // Pre-allocated zero-GC math helpers
    const _slotWorldPos = new THREE.Vector3();
    const _slotWorldQuat = new THREE.Quaternion();
    const _slotForward = new THREE.Vector3();
    const _ejectDir = new THREE.Vector3();
    const _localPitchQuat = new THREE.Quaternion();
    const _xAxis = new THREE.Vector3(1, 0, 0);
    const _ejectEndPos = new THREE.Vector3();
    const _ejectEndQuat = new THREE.Quaternion();
    const _landPos = new THREE.Vector3();
    const _landQuat = new THREE.Quaternion();
    const _landEuler = new THREE.Euler(-Math.PI / 2, 0.08, 0, "YXZ");
    const _zoomPos = new THREE.Vector3();
    const _zoomQuat = new THREE.Quaternion();
    const _zoomEuler = new THREE.Euler(0.025, 0, 0.01, "XYZ");
    const _photoBox = new THREE.Box3();

    // Cache gambar & manajemen pembuangan tekstur lama
    const loadedImgs = new Map<string, HTMLImageElement | null>();
    let currentTexture: THREE.CanvasTexture | null = null;
    let loopIdx = 0;

    const applyPhotoForIndex = async (targetIdx: number) => {
      if (isDisposed) return;
      const list = momentsRef.current;
      if (list.length === 0) return;
      const safeIdx = ((targetIdx % list.length) + list.length) % list.length;
      const moment = list[safeIdx] ?? null;
      const cacheKey = moment?.id || moment?.image_url || `idx-${safeIdx}`;

      let img = loadedImgs.get(cacheKey);
      if (img === undefined && moment?.image_url) {
        img = await loadImageCorsSafe(moment.image_url);
        if (isDisposed) return;
        loadedImgs.set(cacheKey, img);
      }

      const nextTex = buildPolaroidCanvasTexture(
        moment,
        img ?? null,
        safeIdx,
        renderer.capabilities.getMaxAnisotropy()
      );
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

      // Preload gambar berikutnya agar bebas jeda di siklus selanjutnya
      const nextIdx = (safeIdx + 1) % list.length;
      const nextMoment = list[nextIdx];
      const nextKey =
        nextMoment?.id || nextMoment?.image_url || `idx-${nextIdx}`;
      if (nextMoment?.image_url && !loadedImgs.has(nextKey)) {
        loadedImgs.set(nextKey, null);
        void loadImageCorsSafe(nextMoment.image_url).then((loaded) => {
          if (!isDisposed) loadedImgs.set(nextKey, loaded);
        });
      }
    };

    void applyPhotoForIndex(0).then(() => {
      if (!isDisposed) {
        window.dispatchEvent(new CustomEvent("app:scene-ready"));
      }
    });

    // =========================================================================
    // SATU TIMELINE GSAP DETERMINISTIK:
    // Anticipation -> Ejeksi Slot (Clipped) -> Arc & Mendarat Rebah di Lantai ->
    // Settle -> Naik & Zoom agar Terbaca -> Pudar Halus -> Foto Berikutnya
    // =========================================================================
    const animState = {
      shutterPress: 0,
      flashBurst: 0,
      recoil: 0,
      camStepBack: 0,
      photoVisible: 0,
      clipActive: 0,
      ejectP: 0,
      landP: 0,
      zoomP: 0,
      fadeOutP: 0,
      developP: 0,
      photoOpacity: 0,
    };

    const reportPhase = (label: string) => {
      if (!isDisposed) setStagePhaseLabel(label);
    };

    const advanceToNextPhoto = () => {
      const list = momentsRef.current;
      if (list.length > 0) {
        loopIdx = (loopIdx + 1) % list.length;
        setActiveIdx(loopIdx);
        void applyPhotoForIndex(loopIdx);
      }
    };

    const masterTl = gsap.timeline({
      repeat: -1,
      defaults: { ease: "power2.out" },
      onRepeat: () => {
        advanceToNextPhoto();
      },
    });

    // 0. Reset bersih di dalam bodi kamera (tanpa pop / teleport di frame pertama)
    masterTl.set(animState, {
      shutterPress: 0,
      flashBurst: 0,
      recoil: 0,
      camStepBack: 0,
      photoVisible: 0,
      clipActive: 1,
      ejectP: 0,
      landP: 0,
      zoomP: 0,
      fadeOutP: 0,
      developP: 0,
      photoOpacity: 0,
    });

    // 1. Anticipation kecil & rana kamera + kilat flash (0.00s -> 0.85s)
    masterTl.call(() => reportPhase("Membidik momen & menekan rana..."), [], 0.02);
    masterTl.to(animState, { shutterPress: 1, duration: 0.16, ease: "power2.in" }, 0.36);
    masterTl.to(animState, { shutterPress: 0, duration: 0.22, ease: "power2.out" }, 0.52);
    masterTl.to(animState, { flashBurst: 1, recoil: 1, duration: 0.09, ease: "power4.out" }, 0.44);
    masterTl.to(animState, { flashBurst: 0, recoil: 0, duration: 0.34, ease: "power3.out" }, 0.54);

    // 2. Foto meluncur deterministik tepat dari slot kamera (bagian dalam terpotong clipping plane)
    masterTl.call(() => reportPhase("Mencetak lembar Polaroid dari slot..."), [], 0.86);
    masterTl.set(animState, { photoVisible: 1, clipActive: 1 }, 0.86);
    masterTl.to(animState, { photoOpacity: 1, duration: 0.14, ease: "power1.out" }, 0.86);
    masterTl.to(
      animState,
      { ejectP: 1, duration: 1.52, ease: "power2.out" },
      0.88
    );
    masterTl.to(
      animState,
      { developP: 1, duration: 1.65, ease: "power1.inOut" },
      0.95
    );

    // 3. Lengkung halus -> mendarat REBAH RATA di atas lantai (y = FLOOR_Y + tebal/2 + epsilon)
    masterTl.call(() => reportPhase("Lembar foto mendarat di atas meja..."), [], 2.42);
    masterTl.set(animState, { clipActive: 0 }, 2.42);
    masterTl.to(
      animState,
      { landP: 1, duration: 0.92, ease: "power3.out" },
      2.42
    );

    // Jeda tenang saat foto rebah di lantai dengan bayangan kontak lembut (3.34s -> 4.02s)

    // 4. Kamera mundur ringan, foto terangkat halus & zoom menghadap pembaca agar jernih terbaca
    masterTl.call(() => reportPhase("Mengangkat hasil cetakan agar terbaca..."), [], 4.02);
    masterTl.to(
      animState,
      { camStepBack: 1, duration: 0.86, ease: "power3.inOut" },
      4.02
    );
    masterTl.to(
      animState,
      { zoomP: 1, duration: 0.94, ease: "power3.out" },
      4.05
    );

    // Tahan agar pengguna bisa membaca foto & caption dengan nyaman (4.99s -> 6.65s)

    // 5. Pudar lembut & kembalikan kamera untuk gulungan film berikutnya
    masterTl.call(() => reportPhase("Menyiapkan gulungan film berikutnya..."), [], 6.65);
    masterTl.to(
      animState,
      { fadeOutP: 1, photoOpacity: 0, duration: 0.78, ease: "power2.inOut" },
      6.65
    );
    masterTl.to(
      animState,
      { camStepBack: 0, duration: 0.72, ease: "power2.inOut" },
      6.75
    );
    masterTl.set(animState, { photoVisible: 0 }, 7.45);
    // Sedikit jeda tenang sebelum repeat
    masterTl.to({}, { duration: 0.25 }, 7.45);

    skipCycleFnRef.current = () => {
      if (isDisposed) return;
      advanceToNextPhoto();
      masterTl.restart(false);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        masterTl.pause();
      } else if (!isDisposed) {
        masterTl.resume();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const setPhotoClipping = (planes: THREE.Plane[]) => {
      if (frontMat.clippingPlanes !== planes) {
        frontMat.clippingPlanes = planes;
        edgeMat.clippingPlanes = planes;
        backMat.clippingPlanes = planes;
      }
    };

    const computeSlotPose = (
      pVal: number,
      outPos: THREE.Vector3,
      outQuat: THREE.Quaternion
    ) => {
      slotAnchor.getWorldPosition(_slotWorldPos);
      slotAnchor.getWorldQuaternion(_slotWorldQuat);

      // Muka foto (+Z) menghadap ke atas saat keluar dari celah horizontal (-Math.PI / 2)
      _localPitchQuat.setFromAxisAngle(_xAxis, -Math.PI / 2);
      outQuat.copy(_slotWorldQuat).multiply(_localPitchQuat);

      // Arah dorong lurus sejajar sumbu +Z slotAnchor
      _ejectDir.set(0, 0, 1).applyQuaternion(_slotWorldQuat).normalize();

      // p=0: tepi depan foto tepat di dalam mulut slot; p=1: tepi belakang foto bebas bersih dari bibir rol
      const halfLen = PHOTO_H * 0.5 * EJECT_SCALE;
      const distFromSlot = THREE.MathUtils.lerp(
        -halfLen - 0.018,
        halfLen + 0.095,
        pVal
      );
      outPos.copy(_slotWorldPos).addScaledVector(_ejectDir, distFromSlot);
    };

    const syncSlotClipPlane = () => {
      slotAnchor.getWorldPosition(_slotWorldPos);
      slotAnchor.getWorldQuaternion(_slotWorldQuat);
      _slotForward.set(0, 0, 1).applyQuaternion(_slotWorldQuat).normalize();
      // Geser sedikit 0.012 ke dalam mulut slot gelap agar tepi yang muncul selalu utuh keluar dari celah
      _slotWorldPos.addScaledVector(_slotForward, -0.012);
      slotClipPlane.setFromNormalAndCoplanarPoint(_slotForward, _slotWorldPos);
    };

    const clock = new THREE.Clock();
    let elapsed = 0;

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
      const dt = Math.min(0.05, clock.getDelta());

      if (!document.hidden) {
        elapsed += dt;
        const px = pointerRef.current.x;
        const py = pointerRef.current.y;

        // 1. Update Kamera Rig (diikat erat ke lantai FLOOR_Y tanpa pernah menenggelamkan kaki kamera)
        shutterButton.position.z = 0.94 - animState.shutterPress * 0.048;
        flashLight.intensity = animState.flashBurst * 4.4;
        flashBulbMat.emissiveIntensity = 0.16 + animState.flashBurst * 3.6;

        // Saat foto sedang keluar dari slot, redam goyangan rig agar slot sangat presisi & kokoh
        const swayDamp = animState.clipActive > 0.5 ? 0.25 : 1.0;

        cameraRig.position.x = THREE.MathUtils.damp(
          cameraRig.position.x,
          -animState.camStepBack * 0.52 + px * 0.14 * swayDamp,
          6.5,
          dt
        );
        cameraRig.position.y = THREE.MathUtils.damp(
          cameraRig.position.y,
          animState.camStepBack * 0.03 +
            Math.max(0, Math.sin(elapsed * 1.4) * 0.012 * swayDamp),
          6.5,
          dt
        );
        cameraRig.position.z = THREE.MathUtils.damp(
          cameraRig.position.z,
          -animState.recoil * 0.075 - animState.camStepBack * 0.95,
          7.0,
          dt
        );
        cameraRig.rotation.y = THREE.MathUtils.damp(
          cameraRig.rotation.y,
          -0.2 +
            Math.sin(elapsed * 0.85) * 0.04 * swayDamp -
            animState.camStepBack * 0.16 +
            px * 0.18 * swayDamp,
          6.0,
          dt
        );
        cameraRig.rotation.x = THREE.MathUtils.damp(
          cameraRig.rotation.x,
          0.03 - animState.recoil * 0.032 + py * 0.05 * swayDamp,
          6.0,
          dt
        );

        cameraRig.updateMatrixWorld(true);

        // 2. Update Foto Polaroid berdasarkan state timeline GSAP deterministik
        const op = animState.photoOpacity;
        const isPhotoShown = animState.photoVisible > 0.5 && op > 0.008;
        photoMesh.visible = isPhotoShown;

        if (!isPhotoShown) {
          setPhotoClipping(emptyClipList);
          photoContactShadow.visible = false;
          photoContactShadowMat.opacity = 0;
        } else {
          // Matangkan warna emulsi Polaroid tanpa silau
          const shade = THREE.MathUtils.lerp(0.36, 0.9, animState.developP);
          frontMat.color.setRGB(shade, shade * 0.985, shade * 0.955);

          const isOpaque = op > 0.96;
          frontMat.opacity = op;
          edgeMat.opacity = op;
          backMat.opacity = op;
          frontMat.depthWrite = isOpaque;
          edgeMat.depthWrite = isOpaque;
          backMat.depthWrite = isOpaque;

          // Hitung titik ujung slot terkini secara dinamis dari slotAnchor
          computeSlotPose(1, _ejectEndPos, _ejectEndQuat);

          // Target posisi mendarat rebah rata di depan kamera tepat di atas lantai
          _landPos.set(
            _ejectEndPos.x + 0.04,
            PHOTO_LAND_Y,
            _ejectEndPos.z + 0.42
          );
          _landQuat.setFromEuler(_landEuler);

          // Target posisi naik & zoom agar terbaca jelas tanpa menyentuh lantai
          _zoomPos.set(px * 0.07, 0.48 + py * 0.04, 3.22);
          _zoomEuler.set(0.025, px * 0.1, 0.01, "XYZ");
          _zoomQuat.setFromEuler(_zoomEuler);

          if (animState.landP <= 0.0001) {
            // FASE 1: Keluar tepat dari slot anchor (bagian dalam body disembunyikan oleh clipping plane)
            syncSlotClipPlane();
            setPhotoClipping(slotClipList);
            computeSlotPose(
              animState.ejectP,
              photoMesh.position,
              photoMesh.quaternion
            );
            photoMesh.scale.setScalar(EJECT_SCALE);
          } else if (animState.zoomP <= 0.0001) {
            // FASE 2: Busur lembut dari mulut slot menuju pendaratan rebah rata di atas lantai
            setPhotoClipping(emptyClipList);
            const lp = animState.landP;
            photoMesh.position.lerpVectors(_ejectEndPos, _landPos, lp);
            // Lengkung naik tipis sebelum mendarat mulus (anticipation & soft settle)
            photoMesh.position.y += Math.sin(lp * Math.PI) * 0.16;
            photoMesh.quaternion.slerpQuaternions(_ejectEndQuat, _landQuat, lp);
            const landScale = THREE.MathUtils.lerp(EJECT_SCALE, 0.95, lp);
            photoMesh.scale.setScalar(landScale);
          } else {
            // FASE 3 & 4: Terangkat melengkung dari lantai -> zoom menghadap kamera -> pudar halus
            setPhotoClipping(emptyClipList);
            const zp = animState.zoomP;
            photoMesh.position.lerpVectors(_landPos, _zoomPos, zp);
            // Busur angkat ekstra agar sisi bawah kertas selalu jauh di atas lantai saat berputar tegak
            photoMesh.position.y += Math.sin(zp * Math.PI) * 0.36;
            photoMesh.quaternion.slerpQuaternions(_landQuat, _zoomQuat, zp);
            const curScale =
              THREE.MathUtils.lerp(0.95, 1.05, zp) + animState.fadeOutP * 0.06;
            photoMesh.scale.setScalar(curScale);

            if (animState.fadeOutP > 0.001) {
              photoMesh.position.y += animState.fadeOutP * 0.12;
              photoMesh.position.z += animState.fadeOutP * 0.18;
            }
          }

          // ANTI-FLOOR-PENETRATION GUARANTEE:
          // Ukur Box3 dunia di setiap frame & jepit y agar titik terbawah foto >= FLOOR_MIN_BOUND_Y
          photoMesh.updateMatrixWorld(true);
          _photoBox.setFromObject(photoMesh);
          if (_photoBox.min.y < FLOOR_MIN_BOUND_Y) {
            photoMesh.position.y += FLOOR_MIN_BOUND_Y - _photoBox.min.y;
            photoMesh.updateMatrixWorld(true);
            _photoBox.setFromObject(photoMesh);
          }

          // Update bayangan kontak lembut di lantai mengikuti X/Z foto & ketinggiannya
          const clearance = Math.max(0, _photoBox.min.y - FLOOR_Y);
          const groundProximity = Math.max(0, 1 - clearance / 0.85);
          const shadowAlpha = groundProximity * groundProximity * op * 0.78;
          photoContactShadow.visible = shadowAlpha > 0.015;
          photoContactShadowMat.opacity = shadowAlpha;
          photoContactShadow.position.set(
            photoMesh.position.x,
            FLOOR_Y + 0.001,
            photoMesh.position.z
          );
          const spreadScale =
            (0.94 + clearance * 0.45) * photoMesh.scale.x;
          photoContactShadow.scale.set(spreadScale, spreadScale, 1);
          photoContactShadow.rotation.z = -_landEuler.y * animState.landP;
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
      const nw = Math.max(280, container.clientWidth);
      const nh = Math.max(320, container.clientHeight);
      applyResponsiveCameraFraming(nw, nh);
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      skipCycleFnRef.current = null;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      masterTl.kill();
      window.clearTimeout(rafId);
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      if (currentTexture) currentTexture.dispose();
      contactShadowTex.dispose();
      envTexture.dispose();
      disposeSceneGraph(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [is2DFallback]);

  React.useEffect(() => {
    if (!is2DFallback) {
      window.dispatchEvent(
        new CustomEvent("app:scene-loading", {
          detail: { label: "Menyiapkan kamera Polaroid 3D..." },
        })
      );
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("app:scene-ready"));
    });
    return () => window.cancelAnimationFrame(raf);
  }, [is2DFallback]);

  const activeMoment =
    realMoments[activeIdx % Math.max(1, realMoments.length)] ?? null;
  const activeCaption = decodeHtmlEntities(
    activeMoment?.caption ||
      "XII PPLG 1 · MAKN Ende — Satu Angkatan, Satu Cerita"
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
    skipCycleFnRef.current?.();
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full overflow-visible"
    >
      {is2DFallback ? (
        <div className="relative flex min-h-[400px] sm:min-h-[470px] w-full items-center justify-center py-8 px-4">
          <div className="relative mx-auto w-[286px] sm:w-[336px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 translate-x-3 translate-y-2 rotate-[4.5deg] rounded-[3px] border border-[#CBBBA0] bg-[#EAE0C8] shadow-[0_14px_30px_-12px_rgba(24,18,12,0.28)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-3 translate-y-1.5 -rotate-[4deg] rounded-[3px] border border-[#D4C5AA] bg-[#F1E8D3] shadow-[0_16px_32px_-12px_rgba(24,18,12,0.3)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-3.5 left-1/2 z-20 h-7 w-24 -translate-x-1/2 -rotate-2 border border-[#C8B99B]/60 bg-[#F5EDD6]/75 shadow-xs backdrop-blur-[1px]"
            />

            <AnimatePresence mode="wait">
              <motion.figure
                key={`${activeMoment?.id ?? "fallback"}-${activeIdx}`}
                initial={{ opacity: 0, y: 16, rotate: -2.2, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, rotate: -1.1, scale: 1 }}
                exit={{ opacity: 0, y: -12, rotate: 1.4, scale: 0.98 }}
                whileHover={{ rotate: 0, y: -4, scale: 1.015 }}
                transition={MOTION_EASE.springTactile}
                className="relative z-10 rounded-[3px] border border-[#D2C3A6] bg-[#F6EFE0] p-3.5 pb-6 text-[#1E1712] shadow-[0_24px_48px_-16px_rgba(24,18,12,0.38),0_4px_12px_-4px_rgba(24,18,12,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[3px] opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(82,66,48,0.16) 0.55px, transparent 0.55px)",
                    backgroundSize: "9px 9px",
                  }}
                />

                <div className="relative aspect-[4/3.45] w-full overflow-hidden rounded-[2px] border border-[#B8A789] bg-[#241C16] shadow-[inset_0_2px_6px_rgba(0,0,0,0.28)]">
                  {activeMoment?.image_url &&
                  !activeMoment.image_url.startsWith(
                    "/api/moment-illustration"
                  ) ? (
                    <img
                      src={activeMoment.image_url}
                      alt={activeCaption}
                      crossOrigin="anonymous"
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
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 shadow-[inset_0_0_24px_rgba(24,18,12,0.18)]"
                  />
                </div>

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
          data-scene-canvas="polaroid"
          aria-label="Model 3D Kamera Polaroid Jadul mencetak foto kenangan XII PPLG 1"
          className="relative h-[420px] sm:h-[500px] lg:h-[540px] w-full cursor-grab active:cursor-grabbing"
        />
      )}

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

        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={MOTION_EASE.springTactile}
          onClick={handleNextPhoto}
          className="group relative inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1 overflow-hidden rounded-lg border border-border bg-card/85 px-3 py-1.5 font-sans text-xs font-semibold text-foreground transition-colors hover:border-foreground/45"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-foreground/[0.06] transition-transform duration-300 ease-out group-hover:translate-x-0"
          />
          <span className="relative z-10">Cetak Foto Lain</span>
          <ChevronRight className="relative z-10 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </motion.button>
      </div>
    </div>
  );
}
