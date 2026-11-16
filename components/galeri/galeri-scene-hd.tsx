"use client";

import * as React from "react";
import * as THREE from "three";
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
}

interface PolaroidNode {
  group: THREE.Group;
  cardGroup: THREE.Group;
  moment: MomentRow;
  basePos: THREE.Vector3;
  angleZ: number;
  velZ: number;
  angleX: number;
  velX: number;
}

export function GaleriSceneHD({
  moments,
  activePhase,
  selectedMoment,
  onSelectMoment,
}: GaleriSceneHDProps) {
  const activePhaseRef = React.useRef(activePhase);
  const selectedRef = React.useRef(selectedMoment);
  const onSelectRef = React.useRef(onSelectMoment);

  React.useEffect(() => {
    activePhaseRef.current = activePhase;
    selectedRef.current = selectedMoment;
    onSelectRef.current = onSelectMoment;
  }, [activePhase, selectedMoment, onSelectMoment]);

  // Rebuild key when moments list or uploaded image URLs change
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
  const flipStateRef = React.useRef({ flipped: false });

  React.useEffect(() => {
    // Tiga rak vertikal: Kelas X (atas: +3.05), Kelas XI (tengah: -0.15), Kelas XII (bawah: -3.35)
    const targetY =
      activePhase === "X" ? 3.05 : activePhase === "XI" ? -0.15 : -3.35;
    gsap.to(cameraTargetYRef, {
      current: targetY,
      duration: 0.85,
      ease: "power3.out",
    });
  }, [activePhase]);

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

      // Dinding tiga nuansa (X: krem hangat, XI: hijau redup, XII: marun senja)
      const wallColors = [
        { y: 3.2, color: 0x3a2b20 },
        { y: 0, color: 0x243026 },
        { y: -3.2, color: 0x38201b },
      ];

      wallColors.forEach((w) => {
        const wallGeo = new THREE.PlaneGeometry(14, 3.15);
        const wallMat = new THREE.MeshStandardMaterial({
          color: w.color,
          roughness: 0.9,
          metalness: 0.05,
        });
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.set(0, w.y, -0.6);
        wallMesh.receiveShadow = true;
        scene.add(wallMesh);

        // Balok kayu pembatas rak
        const beamGeo = new THREE.BoxGeometry(13.5, 0.14, 0.35);
        const beamMat = new THREE.MeshStandardMaterial({
          map: darkWood.map,
          bumpMap: darkWood.bumpMap,
          bumpScale: 0.02,
          roughness: 0.65,
          metalness: 0.1,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, w.y + 1.48, -0.42);
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

      const polaroidNodes: PolaroidNode[] = [];
      const interactableMeshes: THREE.Object3D[] = [];

      const phases: MomentPhase[] = ["X", "XI", "XII"];
      phases.forEach((ph) => {
        const shelfY = ph === "X" ? 3.2 : ph === "XI" ? 0 : -3.2;
        const phaseMoments = moments
          .filter((m) => String(m.phase || "XII").trim().toUpperCase() === ph)
          .slice(0, 12);

        // Dua baris tali katenari per fase dengan jarak vertikal lega (1.36 unit) agar jepitan bawah tidak menyentuh kartu atas
        for (let row = 0; row < 2; row++) {
          const ropeY = shelfY + (row === 0 ? 0.92 : -0.44);
          const curvePoints: THREE.Vector3[] = [];
          const segs = 24;
          for (let s = 0; s <= segs; s++) {
            const t = s / segs;
            const x = -5.2 + t * 10.4;
            const sag = Math.sin(t * Math.PI) * 0.18;
            curvePoints.push(new THREE.Vector3(x, ropeY - sag, -0.15));
          }
          const catenaryCurve = new THREE.CatmullRomCurve3(curvePoints);
          const ropeGeo = new THREE.TubeGeometry(catenaryCurve, 32, 0.018, 6, false);
          const ropeMesh = new THREE.Mesh(ropeGeo, stringMat);
          scene.add(ropeMesh);

          const rowItems = phaseMoments.slice(row * 6, row * 6 + 6);
          rowItems.forEach((m, idx) => {
            const countInRow = Math.max(1, rowItems.length);
            const t = (idx + 0.5) / countInRow;
            const x = -4.5 + t * 9.0;
            const sag = Math.sin(t * Math.PI) * 0.18;
            const anchorY = ropeY - sag;

            // Grup engsel di titik jepitan tali
            const pivotGroup = new THREE.Group();
            pivotGroup.position.set(x, anchorY, -0.12);

            // Jepitan kayu prosedural (Dinaikkan ke atas agar hanya menjepit tepi putih atas & tidak menghalangi tulisan/foto)
            const jawGeo = new THREE.BoxGeometry(0.075, 0.2, 0.04);
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

            // Grup Kartu Polaroid (depan + belakang + ketebalan kertas)
            const cardGroup = new THREE.Group();
            cardGroup.position.set(0, -0.49, 0);

            const seedNum =
              Number(m.id.replace(/\D/g, "")) || (idx + 1) * 13 + row * 7;
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
            const planeGeo = new THREE.PlaneGeometry(cardW, cardH);

            const frontMat = new THREE.MeshBasicMaterial({
              map: frontTex,
              fog: false,
              toneMapped: false,
            });
            const backMat = new THREE.MeshBasicMaterial({
              map: backTex,
              fog: false,
              toneMapped: false,
            });

            const frontMesh = new THREE.Mesh(planeGeo, frontMat);
            frontMesh.position.z = 0.006;
            const backMesh = new THREE.Mesh(planeGeo, backMat);
            backMesh.rotation.y = Math.PI;
            backMesh.position.z = -0.006;

            const coreMesh = new THREE.Mesh(
              new THREE.BoxGeometry(cardW - 0.01, cardH - 0.01, 0.01),
              new THREE.MeshStandardMaterial({ color: 0xf5ebd6, roughness: 0.9 })
            );

            frontMesh.userData.polaroidIndex = polaroidNodes.length;
            backMesh.userData.polaroidIndex = polaroidNodes.length;
            interactableMeshes.push(frontMesh, backMesh);

            cardGroup.add(frontMesh, backMesh, coreMesh);
            pivotGroup.add(cardGroup);
            scene.add(pivotGroup);

            const initialTilt = ((idx % 2 === 0 ? 1 : -1) * (0.03 + (idx % 3) * 0.015));
            pivotGroup.rotation.z = initialTilt;

            polaroidNodes.push({
              group: pivotGroup,
              cardGroup,
              moment: m,
              basePos: pivotGroup.position.clone(),
              angleZ: initialTilt,
              velZ: (idx % 2 === 0 ? 1 : -1) * 0.25,
              angleX: 0,
              velX: 0,
            });
          });
        }
      });

      // Interaksi Raycaster (Hover mengayunkan polaroid, Klik menerbangkan ke depan kamera & membalik)
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let lastHoverIdx = -1;
      let zoomedIdx = -1;
      let lastPointerMove = 0;

      const updatePointer = (ev: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onPointerMove = (ev: PointerEvent) => {
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
              node.velZ += (Math.random() > 0.5 ? 1 : -1) * 0.9;
              node.velX += 0.55;
            }
            lastHoverIdx = idx;
          }
        } else {
          renderer.domElement.style.cursor = "default";
          lastHoverIdx = -1;
        }
      };

      const onClick = (ev: MouseEvent) => {
        updatePointer(ev as unknown as PointerEvent);
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

          // Kembalikan polaroid sebelumnya bila ada
          if (zoomedIdx >= 0 && polaroidNodes[zoomedIdx]) {
            const prev = polaroidNodes[zoomedIdx]!;
            gsap.to(prev.group.position, {
              x: prev.basePos.x,
              y: prev.basePos.y,
              z: prev.basePos.z,
              duration: 0.5,
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
              y: 0,
              duration: 0.45,
            });
          }

          zoomedIdx = idx;
          flipStateRef.current.flipped = false;
          onSelectRef.current(node.moment);

          // Saat pop/zoom, naikkan pivotGroup sedikit dan turunkan cardGroup.position.y agar jepitan tetap di atas batas kartu!
          gsap.to(node.group.position, {
            x: 0,
            y: camera.position.y + 0.58,
            z: camera.position.z - 2.2,
            duration: 0.65,
            ease: "power3.out",
          });
          gsap.to(node.cardGroup.position, {
            y: -0.75,
            duration: 0.65,
            ease: "power3.out",
          });
          gsap.to(node.cardGroup.scale, {
            x: 1.55,
            y: 1.55,
            z: 1.55,
            duration: 0.65,
            ease: "power3.out",
          });
        } else if (zoomedIdx >= 0 && polaroidNodes[zoomedIdx]) {
          const prev = polaroidNodes[zoomedIdx]!;
          gsap.to(prev.group.position, {
            x: prev.basePos.x,
            y: prev.basePos.y,
            z: prev.basePos.z,
            duration: 0.5,
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
            y: 0,
            duration: 0.45,
          });
          zoomedIdx = -1;
          onSelectRef.current(null);
        }
      };

      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("click", onClick);

      return {
        onTick: (dt: number, elapsed: number) => {
          // Damped camera Y following active phase shelf
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            cameraTargetYRef.current,
            5,
            dt
          );
          camera.lookAt(0, camera.position.y, 0);

          // Simulasi bandul Verlet/pegas ringan untuk setiap Polaroid
          for (let i = 0; i < polaroidNodes.length; i++) {
            const p = polaroidNodes[i]!;
            if (i === zoomedIdx) {
              p.group.rotation.z = THREE.MathUtils.damp(p.group.rotation.z, 0, 8, dt);
              p.group.rotation.x = THREE.MathUtils.damp(p.group.rotation.x, 0, 8, dt);
              continue;
            }
            const breeze = Math.sin(elapsed * 1.4 + i * 0.7) * 0.015;
            const restZ = ((i % 2 === 0 ? 1 : -1) * 0.03) + breeze;
            const accZ = -18 * (p.angleZ - restZ) - 2.6 * p.velZ;
            p.velZ += accZ * dt;
            p.angleZ = THREE.MathUtils.clamp(p.angleZ + p.velZ * dt, -0.35, 0.35);

            const accX = -22 * p.angleX - 3.0 * p.velX;
            p.velX += accX * dt;
            p.angleX = THREE.MathUtils.clamp(p.angleX + p.velX * dt, -0.25, 0.25);

            p.group.rotation.z = p.angleZ;
            p.group.rotation.x = p.angleX;
          }
        },
        onDispose: () => {
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("click", onClick);
        },
      };
    },
    [moments]
  );

  return (
    <SceneShell
      key={sceneKey}
      onSetup={handleSetup}
      cameraPosition={[0, initialCameraY, 5.1]}
      cameraFov={42}
      continuous={true}
      ariaLabel="Rak Tali Polaroid 3D Galeri Momen XII PPLG 1"
      className="relative w-full h-[540px] sm:h-[600px]"
    >
      {/* Collapsible Bottom Hint Bar */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-[#463629] bg-[#231912]/90 px-4 py-2 text-center text-xs text-[#f2e6d5]">
        Sentuh tali polaroid untuk mengayunkan · Klik foto untuk memperbesar & klik lagi untuk membalik catatan belakang
      </div>
    </SceneShell>
  );
}
