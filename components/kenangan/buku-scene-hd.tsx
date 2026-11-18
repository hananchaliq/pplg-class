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

const PAGE_W = 2.24;
const PAGE_H = 2.86;

/**
 * Buat geometri halaman buku yang terletak mendatar di atas meja (bidang XZ, menghadap +Y ke atas)
 * dengan lengkungan alami buku terbuka tanpa membalik UV teks.
 */
function createTopDownPageGeometry(side: "left" | "right"): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 32, 12);
  // Putar agar bidang halaman terletak mendatar di meja (XZ) dan menghadap ke atas (+Y)
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i); // -PAGE_W/2 .. +PAGE_W/2
    // Hitung jarak ternormalisasi (0 di punggung tengah buku -> 1 di tepi luar)
    const distFromSpine =
      side === "left"
        ? (PAGE_W / 2 - lx) / PAGE_W
        : (lx + PAGE_W / 2) / PAGE_W;
    const t = Math.min(1, Math.max(0, distFromSpine));

    // Lengkungan kertas alami ke atas (+Y) tanpa mengubah koordinat X/UV
    const archY = Math.sin(t * Math.PI) * 0.048;
    pos.setY(i, archY);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
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
    pageFlipProgress: 0,
  });

  const syncSpreadTexturesRef = React.useRef<((idx: number) => void) | null>(null);
  const syncCoverTextureRef = React.useRef<
    ((photoUrl?: string, caption?: string) => void) | null
  >(null);
  const prevSpreadIndexRef = React.useRef(activeSpreadIndex);

  React.useEffect(() => {
    gsap.to(animStateRef.current, {
      coverOpenProgress: isBookOpen ? 1 : 0,
      duration: 0.75,
      ease: "power3.inOut",
    });
  }, [isBookOpen]);

  React.useEffect(() => {
    syncSpreadTexturesRef.current?.(activeSpreadIndex);
    if (prevSpreadIndexRef.current !== activeSpreadIndex) {
      prevSpreadIndexRef.current = activeSpreadIndex;
      animStateRef.current.pageFlipProgress = 1;
      gsap.to(animStateRef.current, {
        pageFlipProgress: 0,
        duration: 0.5,
        ease: "power2.out",
      });
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
      const coverTex = createBookCoverTextures(
        renderer,
        coverPhotoUrlRef.current,
        coverCaptionRef.current
      );

      // 1. Permukaan Meja Belajar Kayu Jati (Dilihat dari Atas)
      const deskMesh = new THREE.Mesh(
        new THREE.BoxGeometry(8.6, 0.24, 5.4),
        new THREE.MeshStandardMaterial({
          map: wood.map,
          bumpMap: wood.bumpMap,
          bumpScale: 0.015,
          roughness: 0.65,
          metalness: 0.06,
        })
      );
      deskMesh.position.set(0, -0.14, 0);
      deskMesh.receiveShadow = true;
      scene.add(deskMesh);

      // Lis Tepi Meja Kayu Gelap
      const deskFrame = new THREE.Mesh(
        new THREE.BoxGeometry(8.8, 0.2, 5.6),
        new THREE.MeshStandardMaterial({
          map: darkWood.map,
          roughness: 0.55,
          metalness: 0.1,
        })
      );
      deskFrame.position.set(0, -0.18, 0);
      scene.add(deskFrame);

      // Bayangan Lembut di Bawah Buku
      const bookShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(5.05, 3.35),
        new THREE.MeshBasicMaterial({
          color: 0x121211,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        })
      );
      bookShadow.rotation.x = -Math.PI / 2;
      bookShadow.position.set(0, -0.01, 0.04);
      scene.add(bookShadow);

      // Properti Meja Ruang Gelap Fotografi: Cangkir Keramik Monokrom, Pulpen Perak, & Lampu Pijar Lembut
      const mugGroup = new THREE.Group();
      mugGroup.position.set(-2.92, 0.02, -1.05);
      const coasterMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.44, 0.03, 24),
        new THREE.MeshStandardMaterial({
          color: 0x3d3d3a,
          roughness: 0.75,
        })
      );
      const mugCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.27, 0.36, 24),
        new THREE.MeshStandardMaterial({
          color: 0xece9e1,
          roughness: 0.28,
          metalness: 0.05,
        })
      );
      mugCup.position.y = 0.18;
      const coffeeLiquid = new THREE.Mesh(
        new THREE.CircleGeometry(0.28, 24),
        new THREE.MeshBasicMaterial({ color: 0x222220 })
      );
      coffeeLiquid.rotation.x = -Math.PI / 2;
      coffeeLiquid.position.y = 0.365;
      const mugHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.028, 10, 18, Math.PI),
        new THREE.MeshStandardMaterial({
          color: 0xece9e1,
          roughness: 0.28,
        })
      );
      mugHandle.rotation.z = -Math.PI / 2;
      mugHandle.position.set(-0.31, 0.19, 0);
      mugGroup.add(coasterMesh, mugCup, coffeeLiquid, mugHandle);
      scene.add(mugGroup);

      const penGroup = new THREE.Group();
      penGroup.position.set(2.74, 0.04, 0.35);
      penGroup.rotation.y = 0.14;
      const penBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.028, 1.65, 16),
        new THREE.MeshStandardMaterial({
          color: 0x222220,
          roughness: 0.35,
          metalness: 0.25,
        })
      );
      penBody.rotation.x = Math.PI / 2;
      const penTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.028, 0.16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xc9c4b8,
          roughness: 0.25,
          metalness: 0.85,
        })
      );
      penTip.rotation.x = -Math.PI / 2;
      penTip.position.z = -0.9;
      const penClip = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.025, 0.42),
        new THREE.MeshStandardMaterial({
          color: 0xc9c4b8,
          roughness: 0.25,
          metalness: 0.85,
        })
      );
      penClip.position.set(0, 0.032, 0.45);
      penGroup.add(penBody, penTip, penClip);
      scene.add(penGroup);

      // Untaian Lampu Studio Monokrom Lembut di tepi meja
      const fairyGroup = new THREE.Group();
      const fairyBulbs: THREE.Mesh[] = [];
      const bulbPositions: [number, number, number][] = [
        [-2.75, 0.04, -1.55],
        [-1.85, 0.04, -1.66],
        [-0.95, 0.04, -1.62],
        [0, 0.04, -1.68],
        [0.95, 0.04, -1.62],
        [1.85, 0.04, -1.66],
        [2.75, 0.04, -1.55],
        [-2.82, 0.04, -0.45],
        [-2.78, 0.04, 0.55],
        [-2.72, 0.04, 1.42],
        [2.82, 0.04, -0.65],
        [2.78, 0.04, 1.38],
      ];
      const bulbGeo = new THREE.SphereGeometry(0.055, 12, 12);
      const haloGeo = new THREE.CircleGeometry(0.19, 16);
      haloGeo.rotateX(-Math.PI / 2);

      bulbPositions.forEach(([bx, by, bz]) => {
        const bulbMat = new THREE.MeshBasicMaterial({
          color: 0xe8e5dc,
          fog: false,
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(bx, by, bz);
        fairyGroup.add(bulb);
        fairyBulbs.push(bulb);

        const haloMat = new THREE.MeshBasicMaterial({
          color: 0x8c8980,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.set(bx, 0.005, bz);
        fairyGroup.add(halo);
      });
      scene.add(fairyGroup);

      // 2. Grup Utama Album Arsip Ring-Binder 3D Monokrom di Atas Meja
      const bookRoot = new THREE.Group();
      bookRoot.position.set(0, 0, 0);
      scene.add(bookRoot);

      const clothMat = new THREE.MeshStandardMaterial({
        color: 0x252523,
        roughness: 0.68,
        metalness: 0.12,
      });

      const leatherTrimMat = new THREE.MeshStandardMaterial({
        color: 0x191917,
        roughness: 0.52,
        metalness: 0.18,
      });

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xc9c4b8,
        roughness: 0.28,
        metalness: 0.72,
      });

      const chromeRingMat = new THREE.MeshStandardMaterial({
        color: 0xd6d2c9,
        roughness: 0.2,
        metalness: 0.9,
      });

      const paperBlockMat = new THREE.MeshStandardMaterial({
        color: 0xece9e1,
        roughness: 0.84,
        metalness: 0.02,
      });

      const paperBlockAltMat = new THREE.MeshStandardMaterial({
        color: 0xdcd8ce,
        roughness: 0.86,
        metalness: 0.02,
      });

      // Sampul Belakang Kanan & Kiri (Terbuka Mendatar di Atas Meja dengan Sudut Pelindung Kuningan/Kulit)
      const rightHardcover = new THREE.Mesh(
        new THREE.BoxGeometry(PAGE_W + 0.22, 0.05, PAGE_H + 0.24),
        clothMat
      );
      rightHardcover.position.set(PAGE_W / 2 + 0.05, 0.024, 0);
      bookRoot.add(rightHardcover);

      const leftHardcover = new THREE.Mesh(
        new THREE.BoxGeometry(PAGE_W + 0.22, 0.05, PAGE_H + 0.24),
        clothMat
      );
      leftHardcover.position.set(-(PAGE_W / 2 + 0.05), 0.024, 0);
      bookRoot.add(leftHardcover);

      // Pelindung Sudut Kuningan Emas (Brass Corner Protectors) pada Keempat Sudut Buku Fisik
      const cornerProtectorsGroup = new THREE.Group();
      const cornerGeo = new THREE.BoxGeometry(0.22, 0.056, 0.22);
      const outerX = PAGE_W + 0.06;
      const outerZ = PAGE_H / 2 + 0.02;
      [
        [-outerX, 0.026, -outerZ],
        [-outerX, 0.026, outerZ],
        [outerX, 0.026, -outerZ],
        [outerX, 0.026, outerZ],
      ].forEach(([cx, cy, cz]) => {
        const cornerMesh = new THREE.Mesh(cornerGeo, goldMat);
        cornerMesh.position.set(cx!, cy!, cz!);
        cornerProtectorsGroup.add(cornerMesh);
      });
      bookRoot.add(cornerProtectorsGroup);

      // Punggung Buku Tengah (Spine) & Plat Besi Binder
      const spineCenter = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.064, PAGE_H + 0.26),
        leatherTrimMat
      );
      spineCenter.position.set(0, 0.032, 0);
      bookRoot.add(spineCenter);

      const binderSpinePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.02, PAGE_H - 0.14),
        chromeRingMat
      );
      binderSpinePlate.position.set(0, 0.12, 0);
      bookRoot.add(binderSpinePlate);

      // 6 Ring Besi Binder 3D (TorusGeometry) + Baut Rivet di Tengah Buku
      const binderRingsGroup = new THREE.Group();
      const ringZOffsets = [-1.05, -0.78, -0.51, 0.51, 0.78, 1.05];
      const ringGeo = new THREE.TorusGeometry(0.098, 0.015, 14, 26, Math.PI * 1.18);
      ringZOffsets.forEach((rz) => {
        const ringMesh = new THREE.Mesh(ringGeo, chromeRingMat);
        ringMesh.position.set(0, 0.128, rz);
        ringMesh.rotation.y = Math.PI / 2;
        ringMesh.rotation.x = -0.18;
        binderRingsGroup.add(ringMesh);
      });
      bookRoot.add(binderRingsGroup);

      // Tab Indeks Monokrom di Tepi Kiri & Kanan Buku Arsip
      const indexTabsGroup = new THREE.Group();
      const tabColors = [0xd6d2c9, 0x9e9b92, 0x6e6b64, 0x4a4843, 0xb5b1a7];
      const tabGeo = new THREE.BoxGeometry(0.18, 0.014, 0.34);
      for (let t = 0; t < 5; t++) {
        const tz = -1.02 + t * 0.51;
        const leftTab = new THREE.Mesh(
          tabGeo,
          new THREE.MeshStandardMaterial({
            color: tabColors[t % tabColors.length],
            roughness: 0.6,
          })
        );
        leftTab.position.set(-(PAGE_W + 0.07), 0.095, tz);
        indexTabsGroup.add(leftTab);

        const rightTab = new THREE.Mesh(
          tabGeo,
          new THREE.MeshStandardMaterial({
            color: tabColors[(t + 2) % tabColors.length],
            roughness: 0.6,
          })
        );
        rightTab.position.set(PAGE_W + 0.07, 0.095, tz + 0.12);
        indexTabsGroup.add(rightTab);
      }
      bookRoot.add(indexTabsGroup);

      // Klip Penjepit Besi (Binder Clip) di Tepi Kanan Buku
      const sideClipGroup = new THREE.Group();
      sideClipGroup.position.set(PAGE_W + 0.12, 0.11, 0.12);
      const clipBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.06, 0.28),
        chromeRingMat
      );
      const clipWireGeo = new THREE.TorusGeometry(0.09, 0.01, 8, 18);
      const clipWire = new THREE.Mesh(clipWireGeo, chromeRingMat);
      clipWire.rotation.x = Math.PI / 2;
      clipWire.position.set(0.09, 0.01, 0);
      sideClipGroup.add(clipBody, clipWire);
      bookRoot.add(sideClipGroup);

      const ribbonBookmark = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.012, PAGE_H + 0.48),
        goldMat
      );
      ribbonBookmark.position.set(0.05, 0.116, 0.18);
      bookRoot.add(ribbonBookmark);

      // Blok Ketebalan Kertas Berlapis (Multi-Layered Stepped Paper Edges agar terlihat seperti tumpukan lembaran kertas asli!)
      const leftPaperStack = new THREE.Group();
      const rightPaperStack = new THREE.Group();
      for (let layer = 0; layer < 4; layer++) {
        const inset = layer * 0.018;
        const layerY = 0.048 + layer * 0.014;
        const mat = layer % 2 === 0 ? paperBlockMat : paperBlockAltMat;

        const lSheet = new THREE.Mesh(
          new THREE.BoxGeometry(PAGE_W - inset, 0.013, PAGE_H - inset * 0.7),
          mat
        );
        lSheet.position.set(-(PAGE_W / 2 + 0.025 - inset * 0.5), layerY, 0);
        leftPaperStack.add(lSheet);

        const rSheet = new THREE.Mesh(
          new THREE.BoxGeometry(PAGE_W - inset, 0.013, PAGE_H - inset * 0.7),
          mat
        );
        rSheet.position.set(PAGE_W / 2 + 0.025 - inset * 0.5, layerY, 0);
        rightPaperStack.add(rSheet);
      }
      bookRoot.add(leftPaperStack);
      bookRoot.add(rightPaperStack);

      // Lembaran Aktif Kiri & Kanan (Menghadap Kamera di Atas Meja, Bebas Silau & Tidak Terbalik)
      const leftPageGeo = createTopDownPageGeometry("left");
      const rightPageGeo = createTopDownPageGeometry("right");

      const leftPageMat = new THREE.MeshBasicMaterial({
        color: 0xf3f1ea,
        fog: false,
        toneMapped: false,
      });
      const rightPageMat = new THREE.MeshBasicMaterial({
        color: 0xf3f1ea,
        fog: false,
        toneMapped: false,
      });

      const leftPageMesh = new THREE.Mesh(leftPageGeo, leftPageMat);
      leftPageMesh.position.set(-(PAGE_W / 2 + 0.02), 0.118, 0);
      bookRoot.add(leftPageMesh);

      const rightPageMesh = new THREE.Mesh(rightPageGeo, rightPageMat);
      rightPageMesh.position.set(PAGE_W / 2 + 0.02, 0.118, 0);
      bookRoot.add(rightPageMesh);

      // Bayangan Lipatan Tengah Buku (Spine Crease Valley Shadow)
      const spineShadowStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, PAGE_H - 0.04),
        new THREE.MeshBasicMaterial({
          color: 0x161614,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        })
      );
      spineShadowStrip.rotation.x = -Math.PI / 2;
      spineShadowStrip.position.set(0, 0.123, 0);
      bookRoot.add(spineShadowStrip);

      // Lembar Animasi Balik Halaman (Berputar mulus saat ganti halaman)
      const flipPivot = new THREE.Group();
      flipPivot.position.set(0, 0.145, 0);
      const flipGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 16, 4);
      flipGeo.rotateX(-Math.PI / 2);
      flipGeo.translate(PAGE_W / 2, 0, 0);
      const flipMat = new THREE.MeshBasicMaterial({
        color: 0xf3f1ea,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        fog: false,
      });
      const flipMesh = new THREE.Mesh(flipGeo, flipMat);
      flipPivot.add(flipMesh);
      flipPivot.visible = false;
      bookRoot.add(flipPivot);

      // Sampul Depan Berengsel (Saat Buku Ditutup)
      const closedCoverHinge = new THREE.Group();
      closedCoverHinge.position.set(0, 0.16, 0);
      const closedFrontCoverBoard = new THREE.Mesh(
        new THREE.BoxGeometry(PAGE_W + 0.18, 0.042, PAGE_H + 0.2),
        clothMat
      );
      closedFrontCoverBoard.position.set((PAGE_W + 0.18) / 2, -0.022, 0);
      closedCoverHinge.add(closedFrontCoverBoard);

      const closedFrontCoverGeo = new THREE.PlaneGeometry(PAGE_W + 0.14, PAGE_H + 0.16);
      closedFrontCoverGeo.rotateX(-Math.PI / 2);
      closedFrontCoverGeo.translate((PAGE_W + 0.14) / 2, 0, 0);
      const closedFrontCoverMat = new THREE.MeshBasicMaterial({
        map: coverTex.map,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false,
      });
      const closedFrontCoverMesh = new THREE.Mesh(
        closedFrontCoverGeo,
        closedFrontCoverMat
      );
      closedFrontCoverMesh.position.y = 0.002;
      closedCoverHinge.add(closedFrontCoverMesh);
      bookRoot.add(closedCoverHinge);

      syncCoverTextureRef.current = (photoUrl?: string, caption?: string) => {
        const nextCover = createBookCoverTextures(renderer, photoUrl, caption);
        if (closedFrontCoverMat.map) {
          closedFrontCoverMat.map.dispose();
        }
        closedFrontCoverMat.map = nextCover.map;
        closedFrontCoverMat.needsUpdate = true;
      };

      // Cache Tekstur Spread
      const textureCache = new Map<
        number,
        { left: THREE.CanvasTexture; right: THREE.CanvasTexture }
      >();

      const updateSpreadTextures = (centerIdx: number) => {
        const list = spreadsRef.current;
        if (!list.length) return;
        const safeIdx = Math.max(0, Math.min(list.length - 1, centerIdx));

        for (const [k, texPair] of textureCache.entries()) {
          if (Math.abs(k - safeIdx) > 1) {
            texPair.left.dispose();
            texPair.right.dispose();
            textureCache.delete(k);
          }
        }

        for (
          let s = Math.max(0, safeIdx - 1);
          s <= Math.min(list.length - 1, safeIdx + 1);
          s++
        ) {
          if (!textureCache.has(s)) {
            const sp = list[s]!;
            textureCache.set(s, {
              left: createBookPageTexture(sp.leftPage, renderer),
              right: createBookPageTexture(sp.rightPage, renderer),
            });
          }
        }

        const activeTex = textureCache.get(safeIdx);
        if (activeTex) {
          leftPageMat.map = activeTex.left;
          leftPageMat.needsUpdate = true;
          rightPageMat.map = activeTex.right;
          rightPageMat.needsUpdate = true;
        }
      };

      syncSpreadTexturesRef.current = updateSpreadTextures;
      updateSpreadTextures(activeSpreadRef.current);

      // Interaksi Klik & Geser Halaman dari Atas Meja (TANPA rotasi/goyangan kamera)
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let dragStartX = 0;
      let isDragging = false;

      const onPointerDown = (ev: PointerEvent) => {
        dragStartX = ev.clientX;
        isDragging = true;
      };

      const onPointerUp = (ev: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;
        const dx = ev.clientX - dragStartX;

        if (!isOpenRef.current) {
          onOpenRef.current();
          return;
        }

        if (Math.abs(dx) > 40) {
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

        const hits = raycaster.intersectObjects([leftPageMesh, rightPageMesh], false);
        if (hits.length > 0) {
          const hitObj = hits[0]!.object;
          if (
            hitObj === rightPageMesh &&
            activeSpreadRef.current < spreadsRef.current.length - 1
          ) {
            onChangeSpreadRef.current(activeSpreadRef.current + 1);
          } else if (hitObj === leftPageMesh && activeSpreadRef.current > 0) {
            onChangeSpreadRef.current(activeSpreadRef.current - 1);
          }
        }
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointerup", onPointerUp);

      // Kunci posisi kamera dari awal agar statis & tidak pernah bergoyang
      camera.position.set(0, 4.68, 0.18);
      camera.lookAt(0, 0.05, 0);

      let elapsed = 0;

      return {
        onTick: (dt: number) => {
          elapsed += dt;
          const openProg = animStateRef.current.coverOpenProgress;
          const flipProg = animStateRef.current.pageFlipProgress;

          // Tampilkan bagian kiri buku & ring binder ketika sampul terbuka
          const isMostlyOpen = openProg > 0.25;
          leftHardcover.visible = isMostlyOpen;
          leftPaperStack.visible = isMostlyOpen;
          leftPageMesh.visible = isMostlyOpen;
          rightPageMesh.visible = isMostlyOpen;
          ribbonBookmark.visible = isMostlyOpen;
          binderRingsGroup.visible = isMostlyOpen;
          binderSpinePlate.visible = isMostlyOpen;
          indexTabsGroup.visible = isMostlyOpen;
          cornerProtectorsGroup.visible = isMostlyOpen;

          // Kedipan lembut lampu fairy lights di tepi meja
          fairyBulbs.forEach((b, i) => {
            const s = 0.92 + Math.sin(elapsed * 2.4 + i * 0.9) * 0.12;
            b.scale.setScalar(s);
          });

          // Engsel sampul depan saat buku ditutup vs dibuka
          closedCoverHinge.visible = openProg < 0.98;
          closedCoverHinge.rotation.z = openProg * Math.PI * 0.98;

          // Animasi lembar halaman yang membalik
          if (flipProg > 0.02 && isMostlyOpen) {
            flipPivot.visible = true;
            flipPivot.rotation.z = (1 - flipProg) * Math.PI;
          } else {
            flipPivot.visible = false;
          }

          // Posisi buku tepat di tengah meja saat tertutup maupun terbuka
          const targetBookX = THREE.MathUtils.lerp(-1.12, 0, openProg);
          bookRoot.position.x = THREE.MathUtils.damp(
            bookRoot.position.x,
            targetBookX,
            6,
            dt
          );

          // Kamera 100% STATIS menghadap langsung ke buku dari atas meja (tidak ikut kursor mouse agar tidak pusing)
          const targetCamY = THREE.MathUtils.lerp(4.82, 4.68, openProg);
          const targetCamZ = THREE.MathUtils.lerp(0.42, 0.18, openProg);

          camera.position.x = 0;
          camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 6, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 6, dt);
          camera.lookAt(0, 0.05, 0);
        },
        onDispose: () => {
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          leftPageGeo.dispose();
          rightPageGeo.dispose();
          flipGeo.dispose();
          closedFrontCoverGeo.dispose();
          ringGeo.dispose();
          tabGeo.dispose();
          clipWireGeo.dispose();
          bulbGeo.dispose();
          haloGeo.dispose();
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
      cameraPosition={[0, 4.68, 0.18]}
      cameraFov={42}
      continuous={true}
      ariaLabel="Buku Kenangan Scrapbook 3D di Atas Meja Belajar (Kamera Statis dari Atas)"
      className="relative w-full h-[430px] sm:h-[650px]"
    />
  );
}

