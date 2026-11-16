"use client";

import * as React from "react";
import * as THREE from "three";
import { ChevronLeft, ChevronRight, RotateCw, Maximize2, X } from "lucide-react";
import { SceneShell } from "@/components/three/scene-shell";
import {
  createPolaroidTexture,
  createWoodTextures,
} from "@/lib/procedural-textures";
import { gsap } from "@/lib/gsap-utils";
import type { MomentPhase, MomentRow } from "@/lib/types";

interface GaleriSceneHDProps {
  moments: MomentRow[];
  activePhase: MomentPhase;
  selectedMoment: MomentRow | null;
  onSelectMoment: (m: MomentRow | null) => void;
  onOpenLightbox?: (m: MomentRow) => void;
}

interface PolaroidNode {
  group: THREE.Group;
  cardGroup: THREE.Group;
  moment: MomentRow;
  phase: MomentPhase;
  basePos: THREE.Vector3;
  angleZ: number;
  velZ: number;
  angleX: number;
  velX: number;
  naturalCurlY: number;
}

/**
 * Membentuk geometri kertas foto 3D asli yang tidak kaku/rata:
 * - Melengkung alami karena gravitasi dari titik jepitan atas
 * - Sedikit cekungan jepitan (pinch dimple) di bagian atas tempat penjepit kayu menekan kertas
 * - Lengkungan halus di sudut-sudut bawah kertas cetak silver-halide
 */
function createCurvedPhotoPaperGeometry(
  width: number,
  height: number,
  seed: number,
  zOffset = 0,
  invertBack = false
): THREE.BufferGeometry {
  const segX = 18;
  const segY = 24;
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const curlDir = seed % 2 === 0 ? 1 : -1;
  const wavePhase = (seed % 7) * 0.45;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const nx = vx / (width * 0.5); // -1 .. 1
    const ny = vy / (height * 0.5); // -1 (bawah) .. +1 (atas)

    // 1. Lengkungan perut kertas akibat gravitasi dari engsel atas (ny = 1 tetap dekat 0)
    const hangProgress = (1 - ny) * 0.5; // 0 di atas -> 1 di bawah
    const gravityBelly = Math.sin(hangProgress * Math.PI) * 0.028;

    // 2. Lengkungan sudut bawah kertas foto (natural silver-halide paper curl)
    const bottomFactor = Math.pow(Math.max(0, hangProgress), 1.65);
    const cornerCurl =
      (nx * nx) * 0.024 * bottomFactor * curlDir +
      Math.sin(nx * Math.PI * 0.8 + wavePhase) * 0.008 * bottomFactor;

    // 3. Cekungan halus tepat di bawah jepitan kayu di tepi atas tengah
    const clipPinch =
      ny > 0.68
        ? -Math.exp(-nx * nx * 16) * ((ny - 0.68) / 0.32) * 0.011
        : 0;

    // 4. Gelombang serat kertas mikro agar pantulan cahaya tampak hidup dan organik
    const microRipple =
      Math.cos(ny * Math.PI * 1.5 + wavePhase) *
      Math.sin(nx * Math.PI) *
      0.0045;

    const curvedZ = gravityBelly + cornerCurl + clipPinch + microRipple + zOffset;
    pos.setZ(i, curvedZ);
  }

  if (invertBack) {
    // Balik urutan indeks segitiga dan koordinat U agar tekstur belakang tampil benar mengikuti lengkungan yang sama
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, 1 - uv.getX(i));
    }
    const index = geo.getIndex();
    if (index) {
      const arr = index.array as Uint16Array | Uint32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const tmp = arr[i + 1]!;
        arr[i + 1] = arr[i + 2]!;
        arr[i + 2] = tmp;
      }
      index.needsUpdate = true;
    }
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function GaleriSceneHD({
  moments,
  activePhase,
  selectedMoment,
  onSelectMoment,
  onOpenLightbox,
}: GaleriSceneHDProps) {
  const activePhaseRef = React.useRef(activePhase);
  const selectedRef = React.useRef(selectedMoment);
  const onSelectRef = React.useRef(onSelectMoment);

  React.useEffect(() => {
    activePhaseRef.current = activePhase;
    selectedRef.current = selectedMoment;
    onSelectRef.current = onSelectMoment;
  }, [activePhase, selectedMoment, onSelectMoment]);

  // Hitung jumlah foto dan batas geser horizontal (pan X) untuk masing-masing fase secara terpisah
  const phaseStats = React.useMemo(() => {
    const isRealUploaded = (url?: string) => {
      const clean = (url || "").trim();
      return clean.length > 0 && !clean.startsWith("/api/moment-illustration");
    };

    const result: Record<
      MomentPhase,
      {
        items: MomentRow[];
        cols: number;
        rowCount: number;
        minPanX: number;
        maxPanX: number;
        ropeStartX: number;
        ropeEndX: number;
      }
    > = {
      X: { items: [], cols: 1, rowCount: 1, minPanX: -1.2, maxPanX: 1.2, ropeStartX: -5.5, ropeEndX: 5.5 },
      XI: { items: [], cols: 1, rowCount: 1, minPanX: -1.2, maxPanX: 1.2, ropeStartX: -5.5, ropeEndX: 5.5 },
      XII: { items: [], cols: 1, rowCount: 1, minPanX: -1.2, maxPanX: 1.2, ropeStartX: -5.5, ropeEndX: 5.5 },
    };

    (["X", "XI", "XII"] as MomentPhase[]).forEach((ph) => {
      // Pisahkan tiap fase sendiri-sendiri tanpa mencampur fase lain & tanpa batas jumlah foto
      const inPhase = moments.filter(
        (m) => String(m.phase || "XII").trim().toUpperCase() === ph
      );
      const sorted = [
        ...inPhase.filter((m) => isRealUploaded(m.image_url)),
        ...inPhase.filter((m) => !isRealUploaded(m.image_url)),
      ];

      // Gunakan 1 baris jika <= 8 foto, atau 2 baris jika lebih banyak, lalu memanjang ke kanan tanpa batas
      const rowCount = sorted.length > 8 ? 2 : 1;
      const cols = Math.max(1, Math.ceil(sorted.length / rowCount));
      const spacingX = 0.86; // Jarak antar foto dibuat agak rapat
      const firstPhotoX = -3.45;
      const lastPhotoX = firstPhotoX + Math.max(0, cols - 1) * spacingX;

      const minPanX = -1.35;
      const maxPanX = Math.max(1.35, lastPhotoX - 1.6);
      const ropeStartX = firstPhotoX - 1.8;
      const ropeEndX = Math.max(5.5, lastPhotoX + 2.2);

      result[ph] = {
        items: sorted,
        cols,
        rowCount,
        minPanX,
        maxPanX,
        ropeStartX,
        ropeEndX,
      };
    });

    return result;
  }, [moments]);

  const currentBounds = phaseStats[activePhase];

  // Rebuild key saat daftar foto atau fase berubah
  const sceneKey = React.useMemo(
    () =>
      moments
        .map((m) => `${m.id}:${m.phase}:${(m.image_url || "").length}`)
        .join("|") || "empty",
    [moments]
  );

  const initialCameraY =
    activePhase === "X" ? 3.05 : activePhase === "XI" ? -0.15 : -3.35;
  const cameraTargetYRef = React.useRef(initialCameraY);
  const cameraTargetXRef = React.useRef(0);
  const phasePanMemoryRef = React.useRef<Record<MomentPhase, number>>({
    X: 0,
    XI: 0,
    XII: 0,
  });
  const [panXUi, setPanXUi] = React.useState(0);
  const flipStateRef = React.useRef({ flipped: false });
  const triggerFlipRef = React.useRef<(() => void) | null>(null);
  const closeZoomRef = React.useRef<(() => void) | null>(null);

  const setPanPosition = React.useCallback(
    (nextX: number) => {
      const bounds = phaseStats[activePhaseRef.current];
      const clamped = THREE.MathUtils.clamp(
        nextX,
        bounds.minPanX,
        bounds.maxPanX
      );
      cameraTargetXRef.current = clamped;
      phasePanMemoryRef.current[activePhaseRef.current] = clamped;
      setPanXUi(clamped);
    },
    [phaseStats]
  );

  const nudgePan = React.useCallback(
    (delta: number) => {
      setPanPosition(cameraTargetXRef.current + delta);
    },
    [setPanPosition]
  );

  React.useEffect(() => {
    // Tiga rak vertikal: Kelas X (atas: +3.05), Kelas XI (tengah: -0.15), Kelas XII (bawah: -3.35)
    const targetY =
      activePhase === "X" ? 3.05 : activePhase === "XI" ? -0.15 : -3.35;
    const savedX = THREE.MathUtils.clamp(
      phasePanMemoryRef.current[activePhase] ?? 0,
      phaseStats[activePhase].minPanX,
      phaseStats[activePhase].maxPanX
    );
    cameraTargetXRef.current = savedX;
    setPanXUi(savedX);

    if (closeZoomRef.current) {
      closeZoomRef.current();
    }

    gsap.to(cameraTargetYRef, {
      current: targetY,
      duration: 0.85,
      ease: "power3.out",
    });
  }, [activePhase, phaseStats]);

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

      // Cari bentang terlebar di seluruh fase agar dinding kayu dan balok atas menutupi seluruh panjang gantungan
      const maxRopeEnd = Math.max(
        phaseStats.X.ropeEndX,
        phaseStats.XI.ropeEndX,
        phaseStats.XII.ropeEndX,
        8
      );
      const wallStartX = -7.5;
      const wallEndX = maxRopeEnd + 3.5;
      const wallWidth = wallEndX - wallStartX;
      const wallCenterX = (wallStartX + wallEndX) * 0.5;

      // Dinding tiga nuansa (X: krem hangat, XI: hijau redup, XII: marun senja)
      const wallColors = [
        { y: 3.2, color: 0x3a2b20 },
        { y: 0, color: 0x243026 },
        { y: -3.2, color: 0x38201b },
      ];

      wallColors.forEach((w) => {
        const wallGeo = new THREE.PlaneGeometry(wallWidth, 3.15);
        const wallMat = new THREE.MeshStandardMaterial({
          color: w.color,
          roughness: 0.9,
          metalness: 0.05,
        });
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.set(wallCenterX, w.y, -0.6);
        wallMesh.receiveShadow = true;
        scene.add(wallMesh);

        // Balok kayu pembatas rak sepanjang gantungan
        const beamGeo = new THREE.BoxGeometry(wallWidth, 0.14, 0.35);
        const beamMat = new THREE.MeshStandardMaterial({
          map: darkWood.map,
          bumpMap: darkWood.bumpMap,
          bumpScale: 0.02,
          roughness: 0.65,
          metalness: 0.1,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(wallCenterX, w.y + 1.48, -0.42);
        scene.add(beam);
      });

      const clipWoodMat = new THREE.MeshStandardMaterial({
        map: wood.map,
        bumpMap: wood.bumpMap,
        bumpScale: 0.015,
        roughness: 0.6,
        metalness: 0.08,
      });

      const metalRingMat = new THREE.MeshStandardMaterial({
        color: 0xd8c3a5,
        roughness: 0.25,
        metalness: 0.85,
      });

      const stringMat = new THREE.MeshStandardMaterial({
        color: 0xc8a97e,
        roughness: 0.85,
        metalness: 0.05,
      });

      const paperEdgeMat = new THREE.MeshStandardMaterial({
        color: 0xefe3ce,
        roughness: 0.78,
        metalness: 0.02,
      });

      const polaroidNodes: PolaroidNode[] = [];
      const interactableMeshes: THREE.Object3D[] = [];

      const phases: MomentPhase[] = ["X", "XI", "XII"];
      const spacingX = 0.86; // Jarak antar foto dibuat agak rapat dan rapi
      const firstPhotoX = -3.45;

      phases.forEach((ph) => {
        const shelfY = ph === "X" ? 3.2 : ph === "XI" ? 0 : -3.2;
        const stat = phaseStats[ph];
        const phaseMoments = stat.items;
        const rowCount = stat.rowCount;
        const ropeSpan = stat.ropeEndX - stat.ropeStartX;

        for (let row = 0; row < 2; row++) {
          // Jika fase hanya 1 baris, baris ke-2 tetap digambar talinya agar estetika ruang pamer utuh
          const ropeY =
            rowCount === 1
              ? shelfY + (row === 0 ? 0.52 : -0.68)
              : shelfY + (row === 0 ? 0.92 : -0.44);

          const curvePoints: THREE.Vector3[] = [];
          const segs = Math.max(28, Math.ceil(ropeSpan * 3));
          for (let s = 0; s <= segs; s++) {
            const t = s / segs;
            const x = stat.ropeStartX + t * ropeSpan;
            // Buat lengkungan tali berulang halus setiap ~8.5 unit agar tali panjang tetap stabil
            const localWave = Math.sin(t * Math.PI) * 0.14 + Math.sin(t * Math.PI * Math.max(1, Math.round(ropeSpan / 9))) * 0.04;
            curvePoints.push(new THREE.Vector3(x, ropeY - Math.abs(localWave), -0.15));
          }
          const catenaryCurve = new THREE.CatmullRomCurve3(curvePoints);
          const ropeGeo = new THREE.TubeGeometry(
            catenaryCurve,
            segs * 2,
            0.018,
            6,
            false
          );
          const ropeMesh = new THREE.Mesh(ropeGeo, stringMat);
          scene.add(ropeMesh);

          if (row >= rowCount) continue;

          // Ambil foto untuk baris ini (jika 2 baris: baris atas indeks genap / paruh pertama, baris bawah paruh kedua)
          const rowItems =
            rowCount === 1
              ? phaseMoments
              : phaseMoments.filter((_, i) => i % 2 === row);

          rowItems.forEach((m, colIdx) => {
            const x = firstPhotoX + colIdx * spacingX;
            const tRope = THREE.MathUtils.clamp(
              (x - stat.ropeStartX) / Math.max(0.001, ropeSpan),
              0,
              1
            );
            const anchorPoint = catenaryCurve.getPointAt(tRope);
            const anchorY = anchorPoint.y;

            // Grup engsel di titik jepitan tali
            const pivotGroup = new THREE.Group();
            pivotGroup.position.set(x, anchorY, -0.12);

            // Jepitan kayu prosedural di tepi atas kertas foto
            const jawGeo = new THREE.BoxGeometry(0.075, 0.2, 0.042);
            const jawFront = new THREE.Mesh(jawGeo, clipWoodMat);
            jawFront.position.set(0, 0.085, 0.025);
            const jawBack = new THREE.Mesh(jawGeo, clipWoodMat);
            jawBack.position.set(0, 0.085, -0.025);
            const springRing = new THREE.Mesh(
              new THREE.TorusGeometry(0.032, 0.008, 8, 16),
              metalRingMat
            );
            springRing.rotation.y = Math.PI / 2;
            springRing.position.set(0, 0.085, 0);
            pivotGroup.add(jawFront, jawBack, springRing);

            // Grup Kartu Kertas Foto 3D Melengkung Alami
            const cardGroup = new THREE.Group();
            cardGroup.position.set(0, -0.49, 0);

            const seedNum =
              Number(m.id.replace(/\D/g, "")) ||
              (colIdx + 1) * 13 + row * 7;

            const frontTex = createPolaroidTexture(
              {
                caption: m.caption,
                category: m.category,
                phase: m.phase,
                dateStr: m.taken_at,
                seed: seedNum,
                imageUrl: m.image_url,
                isBack: false,
              },
              renderer
            );
            const backTex = createPolaroidTexture(
              {
                caption: m.caption,
                category: m.category,
                phase: m.phase,
                dateStr: m.taken_at,
                seed: seedNum,
                isBack: true,
              },
              renderer
            );

            const cardW = 0.78;
            const cardH = 0.94;

            // Geometri kertas foto 3D bervolume & melengkung organik
            const frontGeo = createCurvedPhotoPaperGeometry(
              cardW,
              cardH,
              seedNum,
              0.0045,
              false
            );
            const backGeo = createCurvedPhotoPaperGeometry(
              cardW,
              cardH,
              seedNum,
              -0.0045,
              true
            );
            const midCoreGeo = createCurvedPhotoPaperGeometry(
              cardW - 0.006,
              cardH - 0.006,
              seedNum,
              0,
              false
            );

            // Gunakan MeshStandardMaterial dengan kilau satin kertas foto agar lekukan 3D menangkap cahaya
            const frontMat = new THREE.MeshStandardMaterial({
              map: frontTex,
              roughness: 0.36,
              metalness: 0.04,
              emissive: new THREE.Color(0xffffff),
              emissiveMap: frontTex,
              emissiveIntensity: 0.24,
            });
            const backMat = new THREE.MeshStandardMaterial({
              map: backTex,
              roughness: 0.58,
              metalness: 0.02,
              emissive: new THREE.Color(0xffffff),
              emissiveMap: backTex,
              emissiveIntensity: 0.2,
            });

            const frontMesh = new THREE.Mesh(frontGeo, frontMat);
            frontMesh.castShadow = true;
            frontMesh.receiveShadow = true;

            const backMesh = new THREE.Mesh(backGeo, backMat);
            backMesh.castShadow = true;

            const coreMesh = new THREE.Mesh(midCoreGeo, paperEdgeMat);

            frontMesh.userData.polaroidIndex = polaroidNodes.length;
            backMesh.userData.polaroidIndex = polaroidNodes.length;
            interactableMeshes.push(frontMesh, backMesh);

            cardGroup.add(frontMesh, backMesh, coreMesh);

            // Beri sedikit rotasi Y natural agar tiap kertas foto tampak punya dimensi ruang 3D
            const naturalCurlY =
              ((colIdx % 2 === 0 ? 1 : -1) * (0.045 + (colIdx % 3) * 0.02));
            cardGroup.rotation.y = naturalCurlY;

            pivotGroup.add(cardGroup);
            scene.add(pivotGroup);

            const initialTilt =
              (colIdx % 2 === 0 ? 1 : -1) * (0.024 + (colIdx % 3) * 0.012);
            pivotGroup.rotation.z = initialTilt;

            polaroidNodes.push({
              group: pivotGroup,
              cardGroup,
              moment: m,
              phase: ph,
              basePos: pivotGroup.position.clone(),
              angleZ: initialTilt,
              velZ: (colIdx % 2 === 0 ? 1 : -1) * 0.22,
              angleX: 0,
              velX: 0,
              naturalCurlY,
            });
          });
        }
      });

      // Interaksi Raycaster + Geser Horizontal (Drag Kiri/Kanan & Roda Scroll)
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let lastHoverIdx = -1;
      let zoomedIdx = -1;
      let lastPointerMove = 0;

      let isDraggingRack = false;
      let dragMovedDistance = 0;
      let dragStartX = 0;
      let dragStartCameraX = 0;

      const restoreZoomedNode = (idx: number) => {
        const prev = polaroidNodes[idx];
        if (!prev) return;
        gsap.to(prev.group.position, {
          x: prev.basePos.x,
          y: prev.basePos.y,
          z: prev.basePos.z,
          duration: 0.48,
          ease: "power2.out",
        });
        gsap.to(prev.cardGroup.position, {
          y: -0.49,
          duration: 0.45,
        });
        gsap.to(prev.cardGroup.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.45,
        });
        gsap.to(prev.cardGroup.rotation, {
          y: prev.naturalCurlY,
          duration: 0.45,
        });
      };

      closeZoomRef.current = () => {
        if (zoomedIdx >= 0) {
          restoreZoomedNode(zoomedIdx);
          zoomedIdx = -1;
          flipStateRef.current.flipped = false;
          onSelectRef.current(null);
        }
      };

      triggerFlipRef.current = () => {
        if (zoomedIdx >= 0 && polaroidNodes[zoomedIdx]) {
          const node = polaroidNodes[zoomedIdx]!;
          flipStateRef.current.flipped = !flipStateRef.current.flipped;
          gsap.to(node.cardGroup.rotation, {
            y: flipStateRef.current.flipped ? Math.PI : 0,
            duration: 0.6,
            ease: "back.out(1.4)",
          });
        }
      };

      const updatePointer = (ev: PointerEvent | MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onPointerDown = (ev: PointerEvent) => {
        isDraggingRack = true;
        dragMovedDistance = 0;
        dragStartX = ev.clientX;
        dragStartCameraX = cameraTargetXRef.current;
        renderer.domElement.style.cursor = "grabbing";
      };

      const onPointerMove = (ev: PointerEvent) => {
        if (isDraggingRack) {
          const dx = ev.clientX - dragStartX;
          dragMovedDistance = Math.max(dragMovedDistance, Math.abs(dx));
          if (dragMovedDistance > 5) {
            const rect = renderer.domElement.getBoundingClientRect();
            const worldDeltaX = -(dx / Math.max(320, rect.width)) * 7.2;
            const bounds = phaseStats[activePhaseRef.current];
            const clamped = THREE.MathUtils.clamp(
              dragStartCameraX + worldDeltaX,
              bounds.minPanX,
              bounds.maxPanX
            );
            cameraTargetXRef.current = clamped;
            phasePanMemoryRef.current[activePhaseRef.current] = clamped;
            setPanXUi(clamped);

            // Jika sedang ada foto yang di-zoom, ikutkan posisinya di tengah kamera saat digeser
            if (zoomedIdx >= 0 && polaroidNodes[zoomedIdx]) {
              polaroidNodes[zoomedIdx]!.group.position.x = clamped;
            }
            return;
          }
        }

        const now = performance.now();
        if (now - lastPointerMove < 40) return;
        lastPointerMove = now;
        updatePointer(ev);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(interactableMeshes, false);
        if (hits.length > 0) {
          const idx = hits[0]!.object.userData.polaroidIndex as number;
          renderer.domElement.style.cursor = "pointer";
          if (idx !== lastHoverIdx && idx !== zoomedIdx) {
            const node = polaroidNodes[idx];
            if (node) {
              node.velZ += (Math.random() > 0.5 ? 1 : -1) * 0.75;
              node.velX += 0.45;
            }
            lastHoverIdx = idx;
          }
        } else {
          renderer.domElement.style.cursor = isDraggingRack ? "grabbing" : "grab";
          lastHoverIdx = -1;
        }
      };

      const onPointerUp = () => {
        isDraggingRack = false;
        renderer.domElement.style.cursor = "grab";
      };

      const onWheel = (ev: WheelEvent) => {
        // Dukung geser horizontal dengan touchpad (deltaX) atau Shift+Wheel
        const delta =
          Math.abs(ev.deltaX) > Math.abs(ev.deltaY)
            ? ev.deltaX
            : ev.shiftKey
              ? ev.deltaY
              : 0;
        if (Math.abs(delta) > 1) {
          ev.preventDefault();
          const bounds = phaseStats[activePhaseRef.current];
          const next = THREE.MathUtils.clamp(
            cameraTargetXRef.current + delta * 0.008,
            bounds.minPanX,
            bounds.maxPanX
          );
          cameraTargetXRef.current = next;
          phasePanMemoryRef.current[activePhaseRef.current] = next;
          setPanXUi(next);
        }
      };

      const onClick = (ev: MouseEvent) => {
        // Abaikan klik jika pengguna baru saja menggeser (drag) gantungan foto
        if (dragMovedDistance > 6) {
          dragMovedDistance = 0;
          return;
        }

        updatePointer(ev);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(interactableMeshes, false);
        if (hits.length > 0) {
          const idx = hits[0]!.object.userData.polaroidIndex as number;
          const node = polaroidNodes[idx];
          if (!node) return;

          if (zoomedIdx === idx) {
            // Klik kedua membalik kartu Polaroid antara sisi depan dan catatan belakang
            flipStateRef.current.flipped = !flipStateRef.current.flipped;
            gsap.to(node.cardGroup.rotation, {
              y: flipStateRef.current.flipped ? Math.PI : 0,
              duration: 0.6,
              ease: "back.out(1.4)",
            });
            return;
          }

          if (zoomedIdx >= 0) {
            restoreZoomedNode(zoomedIdx);
          }

          zoomedIdx = idx;
          flipStateRef.current.flipped = false;
          onSelectRef.current(node.moment);

          // Kalibrasi jarak pop-up 3D agar TIDAK terlalu dekat: seluruh bingkai foto DAN teks bawah terbaca utuh 100%
          const targetCamX = cameraTargetXRef.current;
          const targetCamY = cameraTargetYRef.current;
          gsap.to(node.group.position, {
            x: targetCamX,
            y: targetCamY + 0.5,
            z: camera.position.z - 2.68,
            duration: 0.62,
            ease: "power3.out",
          });
          gsap.to(node.cardGroup.position, {
            y: -0.49,
            duration: 0.62,
            ease: "power3.out",
          });
          gsap.to(node.cardGroup.scale, {
            x: 1.18,
            y: 1.18,
            z: 1.18,
            duration: 0.62,
            ease: "power3.out",
          });
          gsap.to(node.cardGroup.rotation, {
            y: 0,
            duration: 0.5,
            ease: "power2.out",
          });
        } else if (zoomedIdx >= 0) {
          restoreZoomedNode(zoomedIdx);
          zoomedIdx = -1;
          flipStateRef.current.flipped = false;
          onSelectRef.current(null);
        }
      };

      renderer.domElement.style.cursor = "grab";
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
      renderer.domElement.addEventListener("click", onClick);

      return {
        onTick: (dt: number, elapsed: number) => {
          // Kamera bergeser halus mengikuti pan X dan rak fase Y
          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            cameraTargetXRef.current,
            6.5,
            dt
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            cameraTargetYRef.current,
            5,
            dt
          );
          camera.lookAt(camera.position.x, camera.position.y, 0);

          // Simulasi bandul pegas ringan untuk setiap kertas foto Polaroid
          for (let i = 0; i < polaroidNodes.length; i++) {
            const p = polaroidNodes[i]!;
            if (i === zoomedIdx) {
              p.group.rotation.z = THREE.MathUtils.damp(
                p.group.rotation.z,
                0,
                8,
                dt
              );
              p.group.rotation.x = THREE.MathUtils.damp(
                p.group.rotation.x,
                0,
                8,
                dt
              );
              continue;
            }
            const breeze = Math.sin(elapsed * 1.4 + i * 0.7) * 0.014;
            const restZ = (i % 2 === 0 ? 1 : -1) * 0.024 + breeze;
            const accZ = -18 * (p.angleZ - restZ) - 2.6 * p.velZ;
            p.velZ += accZ * dt;
            p.angleZ = THREE.MathUtils.clamp(
              p.angleZ + p.velZ * dt,
              -0.32,
              0.32
            );

            const accX = -22 * p.angleX - 3.0 * p.velX;
            p.velX += accX * dt;
            p.angleX = THREE.MathUtils.clamp(
              p.angleX + p.velX * dt,
              -0.22,
              0.22
            );

            p.group.rotation.z = p.angleZ;
            p.group.rotation.x = p.angleX;
          }
        },
        onDispose: () => {
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          renderer.domElement.removeEventListener("wheel", onWheel);
          renderer.domElement.removeEventListener("click", onClick);
        },
      };
    },
    [phaseStats]
  );

  return (
    <SceneShell
      key={sceneKey}
      onSetup={handleSetup}
      cameraPosition={[0, initialCameraY, 5.1]}
      cameraFov={42}
      continuous={true}
      ariaLabel="Rak Tali Polaroid 3D Galeri Momen XII PPLG 1"
      className="relative w-full h-[560px] sm:h-[630px]"
    >
      {/* Bar Info Fase di Kiri Atas */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 z-10 flex items-center gap-2 rounded-xl border border-[#463629] bg-[#231912]/90 px-3.5 py-2 text-xs text-[#f2e6d5] shadow-md backdrop-blur-xs">
        <span className="font-serif font-bold text-[#f3ca82]">
          Gantungan Fase Kelas {activePhase}
        </span>
        <span aria-hidden="true">·</span>
        <span>{currentBounds.items.length} Lembar Kertas Foto 3D</span>
      </div>

      {/* Pop-Up Panel Baca Jelas Saat Foto Diklik di 3D (Teks & Foto Terbaca Jelas Tanpa Terpotong) */}
      {selectedMoment && (
        <div className="pointer-events-auto absolute top-3.5 right-3.5 z-20 w-[300px] sm:w-[340px] rounded-2xl border border-[#cbb799] bg-[#fbf5e8]/95 p-3.5 text-[#221811] shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8c5a2b]">
              Fase Kelas {selectedMoment.phase} · {selectedMoment.category}
            </div>
            <button
              type="button"
              onClick={() => closeZoomRef.current?.()}
              aria-label="Tutup fokus foto"
              className="inline-flex size-7 items-center justify-center rounded-lg border border-[#d8c3a5] bg-white/80 text-[#221811] hover:bg-[#efe3ce]"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border border-[#cbb799] bg-[#efe3ce]">
              <img
                src={selectedMoment.image_url}
                alt={selectedMoment.caption}
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-hand text-xl font-bold leading-snug text-[#1f1610] break-words">
                &ldquo;{selectedMoment.caption}&rdquo;
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-[#654d38]">
                Oleh {selectedMoment.uploader_name} · {selectedMoment.taken_at}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerFlipRef.current?.()}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#bfa582] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2b1e14] hover:bg-[#f2e5d0]"
            >
              <RotateCw className="size-3.5" />
              <span>Balik Kertas 3D</span>
            </button>
            {onOpenLightbox && (
              <button
                type="button"
                onClick={() => onOpenLightbox(selectedMoment)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#b96434] px-2.5 py-1.5 text-xs font-semibold text-[#fbf6ec] hover:opacity-95"
              >
                <Maximize2 className="size-3.5" />
                <span>Pop-Up Penuh</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Kontrol Geser Kiri & Kanan Sepanjang Gantungan Foto */}
      <div className="pointer-events-auto absolute right-3.5 bottom-3.5 left-3.5 z-10 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#463629] bg-[#231912]/92 px-3.5 py-2.5 text-xs text-[#f2e6d5] shadow-lg backdrop-blur-xs">
        <button
          type="button"
          onClick={() => nudgePan(-1.7)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#5c4736] bg-[#312319] px-3 py-1.5 font-semibold text-[#f3ca82] transition-colors hover:bg-[#423023] active:scale-95"
        >
          <ChevronLeft className="size-4" />
          <span>Geser Kiri</span>
        </button>

        <div className="flex min-w-[160px] flex-1 flex-col items-center gap-1 px-2">
          <div className="flex w-full items-center justify-between text-[11px] text-[#d9c7b0]">
            <span>Tarik kanvas / geser sepanjang foto</span>
            <span className="font-mono text-[#f3ca82]">
              Kelas {activePhase} ({currentBounds.items.length} Foto)
            </span>
          </div>
          <input
            type="range"
            aria-label={`Geser gantungan foto Kelas ${activePhase}`}
            min={currentBounds.minPanX}
            max={currentBounds.maxPanX}
            step={0.05}
            value={THREE.MathUtils.clamp(
              panXUi,
              currentBounds.minPanX,
              currentBounds.maxPanX
            )}
            onChange={(e) => setPanPosition(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-[#e09f4c]"
          />
        </div>

        <button
          type="button"
          onClick={() => nudgePan(1.7)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#5c4736] bg-[#312319] px-3 py-1.5 font-semibold text-[#f3ca82] transition-colors hover:bg-[#423023] active:scale-95"
        >
          <span>Geser Kanan</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </SceneShell>
  );
}

