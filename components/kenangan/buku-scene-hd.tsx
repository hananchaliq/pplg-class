"use client";

import * as React from "react";
import * as THREE from "three";
import { SceneShell } from "@/components/three/scene-shell";
import {
  createBookCoverTextures,
  createBookPageTexture,
  createWoodTextures,
  type BookPageData,
} from "@/lib/procedural-textures";
import { gsap } from "@/lib/gsap-utils";

export interface BookSpread {
  spreadIndex: number;
  leftPage: BookPageData;
  rightPage: BookPageData;
}

interface BukuKenanganSceneHDProps {
  spreads: BookSpread[];
  isBookOpen: boolean;
  activeSpreadIndex: number;
  coverPhotoUrl?: string;
  coverCaption?: string;
  onOpenBook: () => void;
  onChangeSpread: (nextIndex: number) => void;
}

const PAGE_W = 2.18;
const PAGE_H = 2.82;

/**
 * Tekstur tepi tumpukan kertas buku nyata (lapisan lembaran tipis berwarna krem-gading)
 */
function createPageEdgeTexture(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#EAE4D3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 3) {
    const tone = y % 6 === 0 ? "rgba(110, 96, 76, 0.16)" : "rgba(255, 252, 245, 0.35)";
    ctx.fillStyle = tone;
    ctx.fillRect(0, y, canvas.width, 1);
  }

  // Sedikit bayangan lembut ke arah punggung buku
  const shade = ctx.createLinearGradient(0, 0, canvas.width, 0);
  shade.addColorStop(0, "rgba(70, 58, 42, 0.14)");
  shade.addColorStop(0.5, "rgba(70, 58, 42, 0)");
  shade.addColorStop(1, "rgba(70, 58, 42, 0.18)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

/**
 * Buat geometri lembaran halaman statis yang memiliki lengkungan buku nyata
 * (mengalir turun di lembah punggung buku & melengkung lembut di tengah)
 * Pivot berada tepat di punggung buku (x = 0).
 */
function createCurvedSpreadPageGeometry(side: "left" | "right"): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 42, 16);
  geo.rotateX(-Math.PI / 2);
  geo.translate(side === "right" ? PAGE_W / 2 : -PAGE_W / 2, 0, 0);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const t = THREE.MathUtils.clamp(Math.abs(lx) / PAGE_W, 0, 1);
    // Lengkungan S-curve kertas buku: turun rapi di lipatan tengah, membusur lembut di bagian baca
    const archY =
      Math.sin(Math.pow(t, 0.72) * Math.PI) * 0.088 -
      Math.pow(1 - t, 3) * 0.022;
    pos.setY(i, archY);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Buat geometri sisi depan (+Y saat progress=0) atau belakang (-Y saat progress=0, +Y saat progress=1)
 * untuk lembar halaman yang membalik ala `shiarauzo/book-flip` tanpa membalik teks.
 */
function createFlipLeafSideGeometry(face: "front" | "back"): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 44, 18);
  geo.rotateX(-Math.PI / 2);
  if (face === "back") {
    geo.rotateZ(Math.PI);
    geo.translate(PAGE_W / 2, -0.0012, 0);
  } else {
    geo.translate(PAGE_W / 2, 0.0012, 0);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Suntikkan deformasi vertex & normal melengkung 3D ala shiarauzo/book-flip
 * ke MeshStandardMaterial agar lembar halaman membalik mulus mengikuti tarikan sudut & gravitasi kertas.
 */
function createCurvedFlipMaterial(
  face: "front" | "back",
  progressUniform: { value: number }
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf6f3ea,
    roughness: 0.76,
    metalness: 0.0,
    emissive: 0x161410,
    emissiveIntensity: 0.14,
  });

  mat.customProgramCacheKey = () => `kenangan-book-flip-${face}-v2`;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFlipProgress = progressUniform;
    shader.uniforms.uPageW = { value: PAGE_W };
    shader.uniforms.uPageH = { value: PAGE_H };

    const uniformDecl = `
      uniform float uFlipProgress;
      uniform float uPageW;
      uniform float uPageH;

      float computeLeafAngle(float rx, float rz) {
        float r = clamp(abs(rx) / uPageW, 0.0, 1.0);
        float zNorm = clamp((rz / (uPageH * 0.5)) * 0.5 + 0.5, 0.0, 1.0);
        float sinP = sin(uFlipProgress * 3.14159265);
        // Sudut kanan-bawah bergerak lebih dulu + kelenturan tepi luar kertas
        float leadLag = sinP * (0.14 * r * (0.35 + 0.65 * zNorm) - 0.15 * pow(r, 1.35));
        float eff = clamp(uFlipProgress + leadLag, 0.0, 1.0);
        return eff * 3.14159265;
      }
    `;

    shader.vertexShader = uniformDecl + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      `
      #include <beginnormal_vertex>
      float nAngle = computeLeafAngle(position.x, position.z);
      float nCos = cos(nAngle);
      float nSin = sin(nAngle);
      float nr = clamp(abs(position.x) / uPageW, 0.0, 1.0);
      float slopeTilt = cos(nr * 3.14159265) * 0.16 * (1.0 - sin(uFlipProgress * 3.14159265) * 0.5);
      vec3 bentNorm = normalize(vec3(objectNormal.x - slopeTilt, objectNormal.y, objectNormal.z));
      objectNormal = vec3(
        bentNorm.x * nCos - bentNorm.y * nSin,
        bentNorm.x * nSin + bentNorm.y * nCos,
        bentNorm.z
      );
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      float rDist = clamp(abs(position.x) / uPageW, 0.0, 1.0);
      float flipAng = computeLeafAngle(position.x, position.z);
      float cAng = cos(flipAng);
      float sAng = sin(flipAng);
      float sinTurn = sin(uFlipProgress * 3.14159265);

      float restArch = sin(pow(rDist, 0.72) * 3.14159265) * 0.088 - pow(1.0 - rDist, 3.0) * 0.022;
      float midAirBelly = sinTurn * sin(rDist * 3.14159265) * 0.22;

      float sSpine = position.x;
      float ny = position.y;
      float rxPos = sSpine * cAng - ny * sAng;
      float ryPos = sSpine * sAng + ny * cAng;

      // Tambahkan lengkungan lembah buku (menghadap +Y) dan belly tengah saat di udara
      ryPos += restArch * (1.0 - 0.35 * sinTurn) + midAirBelly;
      rxPos += (-sAng) * (sinTurn * sin(rDist * 3.14159265) * 0.075);

      transformed = vec3(rxPos, ryPos, position.z);
      `
    );
  };

  return mat;
}

export function BukuKenanganSceneHD({
  spreads,
  isBookOpen,
  activeSpreadIndex,
  coverPhotoUrl,
  coverCaption,
  onOpenBook,
  onChangeSpread,
}: BukuKenanganSceneHDProps) {
  const spreadsRef = React.useRef(spreads);
  const isOpenRef = React.useRef(isBookOpen);
  const activeSpreadRef = React.useRef(activeSpreadIndex);
  const coverPhotoUrlRef = React.useRef(coverPhotoUrl);
  const coverCaptionRef = React.useRef(coverCaption);
  const onOpenRef = React.useRef(onOpenBook);
  const onChangeSpreadRef = React.useRef(onChangeSpread);

  React.useEffect(() => {
    spreadsRef.current = spreads;
    isOpenRef.current = isBookOpen;
    activeSpreadRef.current = activeSpreadIndex;
    coverPhotoUrlRef.current = coverPhotoUrl;
    coverCaptionRef.current = coverCaption;
    onOpenRef.current = onOpenBook;
    onChangeSpreadRef.current = onChangeSpread;
  }, [
    spreads,
    isBookOpen,
    activeSpreadIndex,
    coverPhotoUrl,
    coverCaption,
    onOpenBook,
    onChangeSpread,
  ]);

  const animStateRef = React.useRef({
    coverOpenProgress: isBookOpen ? 1 : 0,
    flipProgress: 0,
    isFlipping: false,
    flipDir: 1 as 1 | -1,
    targetSpread: activeSpreadIndex,
  });

  const syncCoverTextureRef = React.useRef<
    ((photoUrl?: string, caption?: string) => void) | null
  >(null);
  const triggerFlipRef = React.useRef<
    ((fromIdx: number, toIdx: number) => void) | null
  >(null);
  const applyRestingSpreadRef = React.useRef<((idx: number) => void) | null>(null);
  const prevSpreadIndexRef = React.useRef(activeSpreadIndex);

  React.useEffect(() => {
    gsap.to(animStateRef.current, {
      coverOpenProgress: isBookOpen ? 1 : 0,
      duration: 0.92,
      ease: "power3.inOut",
    });
  }, [isBookOpen]);

  React.useEffect(() => {
    const prev = prevSpreadIndexRef.current;
    if (prev !== activeSpreadIndex) {
      prevSpreadIndexRef.current = activeSpreadIndex;
      triggerFlipRef.current?.(prev, activeSpreadIndex);
    } else {
      applyRestingSpreadRef.current?.(activeSpreadIndex);
    }
  }, [activeSpreadIndex, spreads]);

  React.useEffect(() => {
    syncCoverTextureRef.current?.(coverPhotoUrl, coverCaption);
  }, [coverPhotoUrl, coverCaption]);

  const handleSetup = React.useCallback(
    ({
      scene,
      camera,
      renderer,
    }: {
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
    }) => {
      const wood = createWoodTextures(renderer, "warm");
      const darkWood = createWoodTextures(renderer, "dark");
      const pageEdgeTex = createPageEdgeTexture(renderer);
      const coverTex = createBookCoverTextures(
        renderer,
        coverPhotoUrlRef.current,
        coverCaptionRef.current
      );

      // Pencahayaan studio reading desk yang hangat & nyata (diperkuat dari sisi atas-depan)
      const readingKeySpot = new THREE.SpotLight(0xfff1d6, 2.8, 18, Math.PI * 0.28, 0.55, 1.2);
      readingKeySpot.position.set(1.8, 5.2, 3.6);
      readingKeySpot.target.position.set(0, 0, 0);
      scene.add(readingKeySpot, readingKeySpot.target);

      // 1. Meja Kayu Jati Reading Desk
      const deskMesh = new THREE.Mesh(
        new THREE.BoxGeometry(10.4, 0.24, 6.8),
        new THREE.MeshStandardMaterial({
          map: wood.map,
          bumpMap: wood.bumpMap,
          bumpScale: 0.018,
          roughness: 0.62,
          metalness: 0.05,
        })
      );
      deskMesh.position.set(0, -0.14, 0);
      deskMesh.receiveShadow = true;
      scene.add(deskMesh);

      const deskMat = new THREE.MeshStandardMaterial({
        color: 0x26231f,
        roughness: 0.88,
        metalness: 0.02,
      });
      // Alas meja kulit (Leather Desk Blotter) memberi kontras nyata di bawah buku
      const deskBlotter = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 0.016, 3.9),
        deskMat
      );
      deskBlotter.position.set(0, -0.012, 0.04);
      deskBlotter.receiveShadow = true;
      scene.add(deskBlotter);

      const deskFrame = new THREE.Mesh(
        new THREE.BoxGeometry(10.65, 0.2, 7.05),
        new THREE.MeshStandardMaterial({
          map: darkWood.map,
          roughness: 0.55,
          metalness: 0.1,
        })
      );
      deskFrame.position.set(0, -0.18, 0);
      scene.add(deskFrame);

      // Bayangan kontak buku di atas alas meja
      const bookShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 3.45),
        new THREE.MeshBasicMaterial({
          color: 0x0f0e0c,
          transparent: true,
          opacity: 0.48,
          depthWrite: false,
        })
      );
      bookShadow.rotation.x = -Math.PI / 2;
      bookShadow.position.set(0, -0.002, 0.05);
      scene.add(bookShadow);

      // Properti Meja Belajar: Cangkir Keramik, Pulpen Klasik, & Lampu Pijar Hangat
      const mugGroup = new THREE.Group();
      mugGroup.position.set(-3.12, 0.0, -1.12);
      const coasterMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.42, 0.028, 24),
        new THREE.MeshStandardMaterial({ color: 0x4b3b2c, roughness: 0.72 })
      );
      const mugCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.25, 0.34, 24),
        new THREE.MeshStandardMaterial({ color: 0xeee9dd, roughness: 0.26, metalness: 0.04 })
      );
      mugCup.position.y = 0.17;
      mugCup.castShadow = true;
      const coffeeLiquid = new THREE.Mesh(
        new THREE.CircleGeometry(0.26, 24),
        new THREE.MeshStandardMaterial({ color: 0x261810, roughness: 0.15 })
      );
      coffeeLiquid.rotation.x = -Math.PI / 2;
      coffeeLiquid.position.y = 0.345;
      const mugHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.026, 10, 18, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xeee9dd, roughness: 0.26 })
      );
      mugHandle.rotation.z = -Math.PI / 2;
      mugHandle.position.set(-0.29, 0.18, 0);
      mugGroup.add(coasterMesh, mugCup, coffeeLiquid, mugHandle);
      scene.add(mugGroup);

      const penGroup = new THREE.Group();
      penGroup.position.set(2.96, 0.028, 0.38);
      penGroup.rotation.y = 0.18;
      const penBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.026, 1.55, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e2022, roughness: 0.32, metalness: 0.32 })
      );
      penBody.rotation.x = Math.PI / 2;
      penBody.castShadow = true;
      const penTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.026, 0.15, 16),
        new THREE.MeshStandardMaterial({ color: 0xd6b572, roughness: 0.22, metalness: 0.88 })
      );
      penTip.rotation.x = -Math.PI / 2;
      penTip.position.z = -0.84;
      const penClip = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.022, 0.38),
        new THREE.MeshStandardMaterial({ color: 0xd6b572, roughness: 0.22, metalness: 0.88 })
      );
      penClip.position.set(0, 0.028, 0.42);
      penGroup.add(penBody, penTip, penClip);
      scene.add(penGroup);

      // Untaian Lampu Pijar Hangat di bagian belakang meja
      const fairyGroup = new THREE.Group();
      const fairyBulbs: THREE.Mesh[] = [];
      const bulbPositions: [number, number, number][] = [
        [-3.0, 0.035, -1.78],
        [-2.05, 0.035, -1.88],
        [-1.05, 0.035, -1.84],
        [0, 0.035, -1.9],
        [1.05, 0.035, -1.84],
        [2.05, 0.035, -1.88],
        [3.0, 0.035, -1.78],
      ];
      const bulbGeo = new THREE.SphereGeometry(0.048, 12, 12);
      const haloGeo = new THREE.CircleGeometry(0.18, 16);
      haloGeo.rotateX(-Math.PI / 2);

      bulbPositions.forEach(([bx, by, bz]) => {
        const bulb = new THREE.Mesh(
          bulbGeo,
          new THREE.MeshBasicMaterial({ color: 0xffe6a3, fog: false })
        );
        bulb.position.set(bx, by, bz);
        fairyGroup.add(bulb);
        fairyBulbs.push(bulb);

        const halo = new THREE.Mesh(
          haloGeo,
          new THREE.MeshBasicMaterial({
            color: 0xd9a441,
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
          })
        );
        halo.position.set(bx, 0.004, bz);
        fairyGroup.add(halo);
      });
      scene.add(fairyGroup);

      // ================================================================
      // 2. GRUP BUKU FISIK 3D REALISTIS (ALA SHIARAUZO/BOOK-FLIP)
      // ================================================================
      const bookRoot = new THREE.Group();
      bookRoot.position.set(0, 0.004, 0);
      scene.add(bookRoot);

      const clothCoverMat = new THREE.MeshStandardMaterial({
        color: 0x262523,
        roughness: 0.72,
        metalness: 0.08,
      });

      const leatherSpineMat = new THREE.MeshStandardMaterial({
        color: 0x1b1a18,
        roughness: 0.54,
        metalness: 0.14,
      });

      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xcab07a,
        roughness: 0.28,
        metalness: 0.78,
      });

      const pageBlockMat = new THREE.MeshStandardMaterial({
        color: 0xf0ebe0,
        map: pageEdgeTex,
        roughness: 0.85,
        metalness: 0.02,
      });

      const ribbonMat = new THREE.MeshStandardMaterial({
        color: 0x8f2929,
        roughness: 0.62,
        metalness: 0.04,
      });

      // Sampul Kanan & Kiri (Hardcover dengan sedikit bukaan alami saat terbaring)
      const rightHardcover = new THREE.Mesh(
        new THREE.BoxGeometry(PAGE_W + 0.16, 0.045, PAGE_H + 0.18),
        clothCoverMat
      );
      rightHardcover.position.set(PAGE_W / 2 + 0.06, 0.022, 0);
      rightHardcover.castShadow = true;
      rightHardcover.receiveShadow = true;
      bookRoot.add(rightHardcover);

      const leftHardcover = new THREE.Mesh(
        new THREE.BoxGeometry(PAGE_W + 0.16, 0.045, PAGE_H + 0.18),
        clothCoverMat
      );
      leftHardcover.position.set(-(PAGE_W / 2 + 0.06), 0.022, 0);
      leftHardcover.castShadow = true;
      leftHardcover.receiveShadow = true;
      bookRoot.add(leftHardcover);

      // Pelindung Sudut Kuningan Nyata
      const cornerProtectorsGroup = new THREE.Group();
      const cornerGeo = new THREE.BoxGeometry(0.18, 0.052, 0.18);
      const outerX = PAGE_W + 0.065;
      const outerZ = PAGE_H / 2 + 0.015;
      [
        [-outerX, 0.024, -outerZ],
        [-outerX, 0.024, outerZ],
        [outerX, 0.024, -outerZ],
        [outerX, 0.024, outerZ],
      ].forEach(([cx, cy, cz]) => {
        const cm = new THREE.Mesh(cornerGeo, brassMat);
        cm.position.set(cx!, cy!, cz!);
        cornerProtectorsGroup.add(cm);
      });
      bookRoot.add(cornerProtectorsGroup);

      // Punggung Buku Tengah Lengkung (Spine Saddle + 5 Raised Binding Ribs)
      const spineGroup = new THREE.Group();
      const spineCenter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, PAGE_H + 0.18, 18, 1, false, 0, Math.PI),
        leatherSpineMat
      );
      spineCenter.rotation.x = Math.PI / 2;
      spineCenter.rotation.z = Math.PI / 2;
      spineCenter.position.set(0, 0.04, 0);
      spineGroup.add(spineCenter);

      const spinePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.048, PAGE_H + 0.18),
        leatherSpineMat
      );
      spinePlate.position.set(0, 0.022, 0);
      spineGroup.add(spinePlate);

      const ribGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.036, 14);
      [-1.08, -0.54, 0, 0.54, 1.08].forEach((rz) => {
        const rib = new THREE.Mesh(ribGeo, leatherSpineMat);
        rib.rotation.x = Math.PI / 2;
        rib.position.set(0, 0.024, rz);
        spineGroup.add(rib);
      });

      // Headband & Tailband tenun merah-emas di ujung atas & bawah jilid
      const headbandGeo = new THREE.BoxGeometry(0.11, 0.032, 0.028);
      const topBand = new THREE.Mesh(headbandGeo, ribbonMat);
      topBand.position.set(0, 0.068, -(PAGE_H / 2 - 0.01));
      const bottomBand = new THREE.Mesh(headbandGeo, ribbonMat);
      bottomBand.position.set(0, 0.068, PAGE_H / 2 - 0.01);
      spineGroup.add(topBand, bottomBand);

      bookRoot.add(spineGroup);

      // Pita Pembatas Halaman Satin (Ribbon Bookmark) keluar di bagian bawah buku
      const ribbonTail = new THREE.Mesh(
        new THREE.BoxGeometry(0.052, 0.008, 0.68),
        ribbonMat
      );
      ribbonTail.position.set(0.05, 0.012, PAGE_H / 2 + 0.24);
      ribbonTail.rotation.y = 0.09;
      bookRoot.add(ribbonTail);

      // Blok Ketebalan Kertas Dinamis (Kiri & Kanan menyesuaikan halaman aktif!)
      const leftBlockMesh = new THREE.Mesh(
        new THREE.BoxGeometry(PAGE_W, 0.12, PAGE_H),
        pageBlockMat
      );
      leftBlockMesh.castShadow = true;
      leftBlockMesh.receiveShadow = true;
      bookRoot.add(leftBlockMesh);

      const rightBlockMesh = new THREE.Mesh(
        new THREE.BoxGeometry(PAGE_W, 0.12, PAGE_H),
        pageBlockMat
      );
      rightBlockMesh.castShadow = true;
      rightBlockMesh.receiveShadow = true;
      bookRoot.add(rightBlockMesh);

      // Lembaran Kertas Statis Kiri & Kanan (Melengkung 3D realistis)
      const leftPageGeo = createCurvedSpreadPageGeometry("left");
      const rightPageGeo = createCurvedSpreadPageGeometry("right");

      const leftPageMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.0,
        emissive: 0x161410,
        emissiveIntensity: 0.15,
      });
      const rightPageMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.0,
        emissive: 0x161410,
        emissiveIntensity: 0.15,
      });

      const leftPageMesh = new THREE.Mesh(leftPageGeo, leftPageMat);
      leftPageMesh.receiveShadow = true;
      bookRoot.add(leftPageMesh);

      const rightPageMesh = new THREE.Mesh(rightPageGeo, rightPageMat);
      rightPageMesh.receiveShadow = true;
      bookRoot.add(rightPageMesh);

      // Bayangan Lembah Lipatan Tengah (Center Gutter Valley Shadow)
      const spineShadowStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, PAGE_H - 0.02),
        new THREE.MeshBasicMaterial({
          color: 0x14120f,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
        })
      );
      spineShadowStrip.rotation.x = -Math.PI / 2;
      spineShadowStrip.position.set(0, 0.156, 0);
      bookRoot.add(spineShadowStrip);

      // ================================================================
      // 3. LEMBAR PEMBALIK HALAMAN 3D BERLENGKUNG (BOOK-FLIP SHADER)
      // ================================================================
      const flipProgressUniform = { value: 0 };
      const flipFrontGeo = createFlipLeafSideGeometry("front");
      const flipBackGeo = createFlipLeafSideGeometry("back");
      const flipFrontMat = createCurvedFlipMaterial("front", flipProgressUniform);
      const flipBackMat = createCurvedFlipMaterial("back", flipProgressUniform);

      const flipLeafGroup = new THREE.Group();
      const flipFrontMesh = new THREE.Mesh(flipFrontGeo, flipFrontMat);
      const flipBackMesh = new THREE.Mesh(flipBackGeo, flipBackMat);
      flipFrontMesh.castShadow = true;
      flipBackMesh.castShadow = true;
      flipLeafGroup.add(flipFrontMesh, flipBackMesh);
      flipLeafGroup.visible = false;
      bookRoot.add(flipLeafGroup);

      // ================================================================
      // 4. SAMPUL DEPAN BERENGSEL (SAAT BUKU TERTUTUP -> TERBUKA)
      // ================================================================
      const closedCoverHinge = new THREE.Group();
      closedCoverHinge.position.set(0, 0.21, 0);

      const closedCoverBoard = new THREE.Mesh(
        new THREE.BoxGeometry(PAGE_W + 0.16, 0.046, PAGE_H + 0.18),
        clothCoverMat
      );
      closedCoverBoard.position.set((PAGE_W + 0.16) / 2, -0.023, 0);
      closedCoverBoard.castShadow = true;
      closedCoverHinge.add(closedCoverBoard);

      const closedFrontCoverGeo = new THREE.PlaneGeometry(PAGE_W + 0.1, PAGE_H + 0.12);
      closedFrontCoverGeo.rotateX(-Math.PI / 2);
      closedFrontCoverGeo.translate((PAGE_W + 0.12) / 2, 0, 0);
      const closedFrontCoverMat = new THREE.MeshStandardMaterial({
        map: coverTex.map,
        roughness: 0.62,
        metalness: 0.06,
        emissive: 0x141210,
        emissiveIntensity: 0.12,
      });
      const closedFrontCoverMesh = new THREE.Mesh(
        closedFrontCoverGeo,
        closedFrontCoverMat
      );
      closedFrontCoverMesh.position.y = 0.0015;
      closedCoverHinge.add(closedFrontCoverMesh);

      // Sisi dalam sampul depan (terlihat saat membuka cover)
      const innerCoverGeo = new THREE.PlaneGeometry(PAGE_W + 0.1, PAGE_H + 0.12);
      innerCoverGeo.rotateX(Math.PI / 2);
      innerCoverGeo.translate((PAGE_W + 0.12) / 2, 0, 0);
      const innerCoverMesh = new THREE.Mesh(
        innerCoverGeo,
        new THREE.MeshStandardMaterial({ color: 0xe6dfd0, roughness: 0.88 })
      );
      innerCoverMesh.position.y = -0.047;
      closedCoverHinge.add(innerCoverMesh);

      bookRoot.add(closedCoverHinge);

      // Hit-proxy datar tak terlihat untuk raycast klik kiri / kanan yang akurat 100%
      const hitProxyGeo = new THREE.PlaneGeometry(PAGE_W * 2.05, PAGE_H * 1.04);
      hitProxyGeo.rotateX(-Math.PI / 2);
      const hitProxyMesh = new THREE.Mesh(
        hitProxyGeo,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitProxyMesh.position.set(0, 0.16, 0);
      bookRoot.add(hitProxyMesh);

      syncCoverTextureRef.current = (photoUrl?: string, caption?: string) => {
        const nextCover = createBookCoverTextures(renderer, photoUrl, caption);
        if (closedFrontCoverMat.map) {
          closedFrontCoverMat.map.dispose();
        }
        closedFrontCoverMat.map = nextCover.map;
        closedFrontCoverMat.needsUpdate = true;
      };

      // Cache Tekstur Spread + Helper Aman
      const textureCache = new Map<
        number,
        { left: THREE.CanvasTexture; right: THREE.CanvasTexture }
      >();

      const getSpreadTextures = (idx: number) => {
        const list = spreadsRef.current;
        if (!list.length) return null;
        const safeIdx = Math.max(0, Math.min(list.length - 1, idx));
        if (!textureCache.has(safeIdx)) {
          const sp = list[safeIdx]!;
          textureCache.set(safeIdx, {
            left: createBookPageTexture(sp.leftPage, renderer),
            right: createBookPageTexture(sp.rightPage, renderer),
          });
        }
        return textureCache.get(safeIdx)!;
      };

      const pruneTextureCache = (centerIdx: number) => {
        for (const [k, texPair] of textureCache.entries()) {
          if (Math.abs(k - centerIdx) > 2) {
            texPair.left.dispose();
            texPair.right.dispose();
            textureCache.delete(k);
          }
        }
      };

      const applyRestingSpread = (idx: number) => {
        const list = spreadsRef.current;
        if (!list.length) return;
        const safeIdx = Math.max(0, Math.min(list.length - 1, idx));
        pruneTextureCache(safeIdx);
        getSpreadTextures(safeIdx - 1);
        const cur = getSpreadTextures(safeIdx);
        getSpreadTextures(safeIdx + 1);
        if (cur) {
          leftPageMat.map = cur.left;
          leftPageMat.needsUpdate = true;
          rightPageMat.map = cur.right;
          rightPageMat.needsUpdate = true;
        }
        animStateRef.current.isFlipping = false;
        flipLeafGroup.visible = false;
      };

      applyRestingSpreadRef.current = applyRestingSpread;

      let flipTween: gsap.core.Tween | null = null;

      triggerFlipRef.current = (fromIdx: number, toIdx: number) => {
        const list = spreadsRef.current;
        if (!list.length) return;
        const safeFrom = Math.max(0, Math.min(list.length - 1, fromIdx));
        const safeTo = Math.max(0, Math.min(list.length - 1, toIdx));
        const fromTex = getSpreadTextures(safeFrom);
        const toTex = getSpreadTextures(safeTo);
        if (!fromTex || !toTex) return;

        flipTween?.kill();
        const isForward = safeTo > safeFrom;
        animStateRef.current.isFlipping = true;
        animStateRef.current.flipDir = isForward ? 1 : -1;
        animStateRef.current.targetSpread = safeTo;

        if (isForward) {
          // Lembar kanan terangkat membalik ke kiri
          leftPageMat.map = fromTex.left;
          leftPageMat.needsUpdate = true;
          rightPageMat.map = toTex.right;
          rightPageMat.needsUpdate = true;
          flipFrontMat.map = fromTex.right;
          flipFrontMat.needsUpdate = true;
          flipBackMat.map = toTex.left;
          flipBackMat.needsUpdate = true;

          animStateRef.current.flipProgress = 0;
          flipProgressUniform.value = 0;
          flipLeafGroup.visible = true;

          flipTween = gsap.to(animStateRef.current, {
            flipProgress: 1,
            duration: 0.72,
            ease: "power2.inOut",
            onComplete: () => {
              applyRestingSpread(safeTo);
            },
          });
        } else {
          // Lembar kiri terangkat membalik kembali ke kanan
          leftPageMat.map = toTex.left;
          leftPageMat.needsUpdate = true;
          rightPageMat.map = fromTex.right;
          rightPageMat.needsUpdate = true;
          flipFrontMat.map = toTex.right;
          flipFrontMat.needsUpdate = true;
          flipBackMat.map = fromTex.left;
          flipBackMat.needsUpdate = true;

          animStateRef.current.flipProgress = 1;
          flipProgressUniform.value = 1;
          flipLeafGroup.visible = true;

          flipTween = gsap.to(animStateRef.current, {
            flipProgress: 0,
            duration: 0.72,
            ease: "power2.inOut",
            onComplete: () => {
              applyRestingSpread(safeTo);
            },
          });
        }
      };

      applyRestingSpread(activeSpreadRef.current);

      // Interaksi Klik Kiri/Kanan, Swipe, & Parallax 3/4 Ringan
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let dragStartX = 0;
      let isDragging = false;
      let targetParallaxX = 0;
      let targetParallaxY = 0;
      let curParallaxX = 0;
      let curParallaxY = 0;

      const onPointerDown = (ev: PointerEvent) => {
        dragStartX = ev.clientX;
        isDragging = true;
      };

      const onPointerMove = (ev: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((ev.clientY - rect.top) / rect.height) * 2 - 1;
        targetParallaxX = THREE.MathUtils.clamp(nx, -1, 1) * 0.18;
        targetParallaxY = THREE.MathUtils.clamp(ny, -1, 1) * 0.09;
      };

      const onPointerLeave = () => {
        targetParallaxX = 0;
        targetParallaxY = 0;
      };

      const onPointerUp = (ev: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;
        const dx = ev.clientX - dragStartX;

        if (!isOpenRef.current) {
          onOpenRef.current();
          return;
        }

        if (Math.abs(dx) > 36) {
          const next =
            dx < 0
              ? Math.min(spreadsRef.current.length - 1, activeSpreadRef.current + 1)
              : Math.max(0, activeSpreadRef.current - 1);
          if (next !== activeSpreadRef.current) {
            onChangeSpreadRef.current(next);
          }
          return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const hits = raycaster.intersectObject(hitProxyMesh, false);
        if (hits.length > 0) {
          const localPt = bookRoot.worldToLocal(hits[0]!.point.clone());
          if (
            localPt.x >= 0 &&
            activeSpreadRef.current < spreadsRef.current.length - 1
          ) {
            onChangeSpreadRef.current(activeSpreadRef.current + 1);
          } else if (localPt.x < 0 && activeSpreadRef.current > 0) {
            onChangeSpreadRef.current(activeSpreadRef.current - 1);
          }
        }
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerleave", onPointerLeave);
      renderer.domElement.addEventListener("pointerup", onPointerUp);

      // Posisi Awal Kamera Sudut 3/4 Nyaman (ala book-flip)
      camera.position.set(0, 3.25, 3.35);
      camera.lookAt(0, 0.08, 0.08);

      let elapsed = 0;

      return {
        onTick: (dt: number) => {
          elapsed += dt;
          const openProg = animStateRef.current.coverOpenProgress;
          const isMostlyOpen = openProg > 0.18;

          // Update uniform shader kurva lipatan halaman
          flipProgressUniform.value = animStateRef.current.flipProgress;

          // Ketebalan tumpukan kertas kiri & kanan berubah dinamis mengikuti posisi halaman
          const totalSpreads = Math.max(1, spreadsRef.current.length - 1);
          const readRatio = THREE.MathUtils.clamp(
            activeSpreadRef.current / totalSpreads,
            0.05,
            0.95
          );
          const maxStackH = 0.165;
          const leftH = Math.max(0.022, maxStackH * readRatio) * openProg;
          const rightH = isOpenRef.current
            ? Math.max(0.022, maxStackH * (1 - readRatio))
            : maxStackH;

          leftBlockMesh.visible = isMostlyOpen;
          leftBlockMesh.scale.y = Math.max(0.15, leftH / 0.12);
          leftBlockMesh.position.set(-(PAGE_W / 2 + 0.01), 0.045 + leftH / 2, 0);

          rightBlockMesh.scale.y = Math.max(0.15, rightH / 0.12);
          rightBlockMesh.position.set(PAGE_W / 2 + 0.01, 0.045 + rightH / 2, 0);

          // Ketinggian permukaan halaman statis & lembar flip duduk tepat di atas tumpukan kertas
          const leftTopY = 0.046 + leftH;
          const rightTopY = 0.046 + rightH;
          const midTopY = Math.max(leftTopY, rightTopY) + 0.005;

          leftPageMesh.visible = openProg > 0.32;
          leftPageMesh.position.set(-0.01, leftTopY, 0);

          rightPageMesh.visible = isMostlyOpen;
          rightPageMesh.position.set(0.01, rightTopY, 0);

          spineShadowStrip.visible = isMostlyOpen;
          spineShadowStrip.position.y = midTopY - 0.002;

          flipLeafGroup.position.set(0, midTopY + 0.004, 0);
          if (!isMostlyOpen) {
            flipLeafGroup.visible = false;
          }

          leftHardcover.visible = isMostlyOpen;
          cornerProtectorsGroup.visible = isMostlyOpen;
          ribbonTail.visible = true;

          // Sampul Depan saat ditutup vs dibuka berengsel
          closedCoverHinge.visible = openProg < 0.985;
          closedCoverHinge.position.y = 0.048 + rightH + 0.022;
          closedCoverHinge.rotation.z = openProg * Math.PI * 0.992;

          // Geser buku agar simetris saat tertutup maupun terbuka lebar
          const targetBookX = THREE.MathUtils.lerp(-PAGE_W * 0.52, 0, openProg);
          bookRoot.position.x = THREE.MathUtils.damp(
            bookRoot.position.x,
            targetBookX,
            6.5,
            dt
          );

          // Kemiringan lembut papan sampul saat terbaring terbuka
          leftHardcover.rotation.z = THREE.MathUtils.lerp(0, -0.016, openProg);
          rightHardcover.rotation.z = THREE.MathUtils.lerp(0, 0.016, openProg);

          // Kedipan halus lampu pijar hangat di belakang meja
          fairyBulbs.forEach((b, i) => {
            const s = 0.92 + Math.sin(elapsed * 2.2 + i * 0.85) * 0.1;
            b.scale.setScalar(s);
          });

          // Kamera sudut baca 3/4 yang elegan dengan parallax kursor super lembut
          curParallaxX = THREE.MathUtils.damp(curParallaxX, targetParallaxX, 4.5, dt);
          curParallaxY = THREE.MathUtils.damp(curParallaxY, targetParallaxY, 4.5, dt);

          const baseCamY = THREE.MathUtils.lerp(3.25, 3.05, openProg);
          const baseCamZ = THREE.MathUtils.lerp(3.15, 3.32, openProg);

          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            curParallaxX,
            6,
            dt
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            baseCamY + curParallaxY,
            6,
            dt
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            baseCamZ,
            6,
            dt
          );
          camera.lookAt(0, 0.06, 0.12);
        },
        onDispose: () => {
          flipTween?.kill();
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          leftPageGeo.dispose();
          rightPageGeo.dispose();
          flipFrontGeo.dispose();
          flipBackGeo.dispose();
          closedFrontCoverGeo.dispose();
          innerCoverGeo.dispose();
          hitProxyGeo.dispose();
          cornerGeo.dispose();
          ribGeo.dispose();
          headbandGeo.dispose();
          bulbGeo.dispose();
          haloGeo.dispose();
          pageEdgeTex.dispose();
          for (const pair of textureCache.values()) {
            pair.left.dispose();
            pair.right.dispose();
          }
          textureCache.clear();
        },
      };
    },
    []
  );

  return (
    <SceneShell
      onSetup={handleSetup}
      cameraPosition={[0, 3.25, 3.35]}
      cameraFov={38}
      continuous={true}
      ariaLabel="Buku Kenangan Scrapbook 3D Sudut Baca 3/4"
      className="relative w-full h-[430px] sm:h-[650px]"
    />
  );
}
