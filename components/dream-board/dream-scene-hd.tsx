"use client";

import * as React from "react";
import * as THREE from "three";
import { SceneShell } from "@/components/three/scene-shell";
import {
  createChalkboardTexture,
  createDreamNoteTexture,
  createWoodTextures,
} from "@/lib/procedural-textures";
import { gsap } from "@/lib/gsap-utils";
import type { DreamRow } from "@/lib/types";

interface DreamBoardSceneHDProps {
  dreams: DreamRow[];
  selectedDream: DreamRow | null;
  onSelectDream: (d: DreamRow | null) => void;
}

export function DreamBoardSceneHD({
  dreams,
  selectedDream,
  onSelectDream,
}: DreamBoardSceneHDProps) {
  const dreamsRef = React.useRef(dreams);
  const onSelectRef = React.useRef(onSelectDream);

  React.useEffect(() => {
    dreamsRef.current = dreams;
    onSelectRef.current = onSelectDream;
  }, [dreams, onSelectDream]);

  const [hoveredDream, setHoveredDream] = React.useState<DreamRow | null>(null);
  const resetZoomRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (!selectedDream) {
      resetZoomRef.current?.();
    }
  }, [selectedDream]);

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
      const chalkTex = createChalkboardTexture(renderer);

      // Grup Papan Tulis Kapur Prosedural (Composite 9-Part Model)
      const boardGroup = new THREE.Group();
      scene.add(boardGroup);

      // 1. Permukaan Papan Tulis Kapur (Lebih lebar agar tiap kertas note tampil besar & jelas)
      const surfaceMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(9.6, 5.1),
        new THREE.MeshStandardMaterial({
          map: chalkTex,
          roughness: 0.85,
          metalness: 0.04,
        })
      );
      surfaceMesh.position.set(0, 0.15, -0.05);
      surfaceMesh.receiveShadow = true;
      boardGroup.add(surfaceMesh);

      // 2-5. Bingkai Kayu Jati Atas, Bawah, Kiri, Kanan
      const frameMat = new THREE.MeshStandardMaterial({
        map: wood.map,
        bumpMap: wood.bumpMap,
        bumpScale: 0.02,
        roughness: 0.58,
        metalness: 0.08,
      });

      const topFrame = new THREE.Mesh(
        new THREE.BoxGeometry(10.0, 0.24, 0.22),
        frameMat
      );
      topFrame.position.set(0, 2.75, 0);
      const bottomFrame = new THREE.Mesh(
        new THREE.BoxGeometry(10.0, 0.24, 0.22),
        frameMat
      );
      bottomFrame.position.set(0, -2.45, 0);
      const leftFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 5.44, 0.22),
        frameMat
      );
      leftFrame.position.set(-4.88, 0.15, 0);
      const rightFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 5.44, 0.22),
        frameMat
      );
      rightFrame.position.set(4.88, 0.15, 0);
      boardGroup.add(topFrame, bottomFrame, leftFrame, rightFrame);

      // 6. Rak Kapur Bawah
      const trayMesh = new THREE.Mesh(
        new THREE.BoxGeometry(9.6, 0.1, 0.36),
        frameMat
      );
      trayMesh.position.set(0, -2.55, 0.14);
      boardGroup.add(trayMesh);

      // 7. Penghapus Papan Tulis (Kayu + Felt Hitam)
      const eraserWood = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.14, 0.22),
        frameMat
      );
      eraserWood.position.set(-2.6, -2.44, 0.18);
      const eraserFelt = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.06, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.95 })
      );
      eraserFelt.position.set(-2.6, -2.34, 0.18);
      boardGroup.add(eraserWood, eraserFelt);

      // 8-9. Batang Kapur Warna-Warni (Putih, Kuning, Merah Muda)
      const chalkColors = [0xf7f4eb, 0xf3ca82, 0xe89b93];
      chalkColors.forEach((col, cIdx) => {
        const chalkStick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032, 0.032, 0.32, 12),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 })
        );
        chalkStick.rotation.z = Math.PI / 2 + (cIdx - 1) * 0.12;
        chalkStick.position.set(1.2 + cIdx * 0.48, -2.46, 0.18);
        boardGroup.add(chalkStick);
      });

      // 22 Note Cita-Cita Siswa + Pin 3D (Ukuran diperbesar & tanpa silau agar terbaca langsung tanpa modal/zoom)
      const noteGroups: Array<{
        group: THREE.Group;
        basePos: THREE.Vector3;
        baseRotZ: number;
        dream: DreamRow;
      }> = [];
      const interactables: THREE.Object3D[] = [];

      const pinColors = [0xc84b31, 0x2d6a6e, 0xd99b4e, 0x3b593f];
      const pinMetalMat = new THREE.MeshStandardMaterial({
        color: 0xdcdcdc,
        roughness: 0.25,
        metalness: 0.85,
      });

      const list = dreamsRef.current;
      const cols = 6;

      list.forEach((d, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const rowCount = Math.min(cols, list.length - row * cols);
        const spacingX = 1.52;
        const spacingY = 1.16;
        const startX = -((rowCount - 1) * spacingX) / 2;
        const x = startX + col * spacingX;
        const y = 1.72 - row * spacingY;

        const nGroup = new THREE.Group();
        nGroup.position.set(x, y, 0.035);
        const baseRotZ = ((idx % 2 === 0 ? 1 : -1) * (0.015 + (idx % 3) * 0.01));
        nGroup.rotation.z = baseRotZ;

        // Kertas Note Besar (1.34 x 1.06) sedikit melengkung di bagian bawah
        const noteGeo = new THREE.PlaneGeometry(1.34, 1.06, 10, 10);
        const posAttr = noteGeo.attributes.position as THREE.BufferAttribute;
        for (let v = 0; v < posAttr.count; v++) {
          const vy = posAttr.getY(v); // -0.53 .. +0.53
          const curl = Math.pow(Math.max(0, (0.53 - vy) / 1.06), 2.2) * 0.045;
          posAttr.setZ(v, curl);
        }
        posAttr.needsUpdate = true;
        noteGeo.computeVertexNormals();

        const noteTex = createDreamNoteTexture(
          {
            studentName: d.student_nickname || d.student_name || "Siswa",
            dream: d.dream,
            paperColor: d.paper_color,
            seed: idx + 11,
          },
          renderer
        );

        // Gunakan MeshBasicMaterial bebas kabut & bebas bayangan gelap agar tulisan tiap kertas sangat tajam & terbaca langsung
        const paperMesh = new THREE.Mesh(
          noteGeo,
          new THREE.MeshBasicMaterial({
            map: noteTex,
            side: THREE.DoubleSide,
            fog: false,
            toneMapped: false,
          })
        );
        paperMesh.userData.noteIndex = idx;
        interactables.push(paperMesh);
        nGroup.add(paperMesh);

        // Pin 3D (Bola Plastik + Silinder Logam) di bagian atas pita note
        const pinHeadMat = new THREE.MeshStandardMaterial({
          color: pinColors[idx % pinColors.length]!,
          roughness: 0.3,
          metalness: 0.15,
        });
        const pinHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.052, 16, 16),
          pinHeadMat
        );
        pinHead.position.set(0, 0.44, 0.055);
        const pinShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8),
          pinMetalMat
        );
        pinShaft.rotation.x = Math.PI / 2;
        pinShaft.position.set(0, 0.44, 0.02);
        nGroup.add(pinHead, pinShaft);

        boardGroup.add(nGroup);
        noteGroups.push({
          group: nGroup,
          basePos: nGroup.position.clone(),
          baseRotZ,
          dream: d,
        });
      });

      // Interaksi Raycaster (Hover menampilkan kutipan penuh + memperbesar halus kertas di tempat)
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let hoveredIdx = -1;
      let zoomedIdx = -1;
      let lastMove = 0;

      const restoreZoomed = () => {
        if (zoomedIdx >= 0 && noteGroups[zoomedIdx]) {
          const prev = noteGroups[zoomedIdx]!;
          gsap.to(prev.group.position, {
            x: prev.basePos.x,
            y: prev.basePos.y,
            z: prev.basePos.z,
            duration: 0.55,
            ease: "power3.out",
          });
          gsap.to(prev.group.rotation, {
            x: 0,
            y: 0,
            z: prev.baseRotZ,
            duration: 0.55,
          });
          gsap.to(prev.group.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.55,
          });
          zoomedIdx = -1;
        }
      };

      resetZoomRef.current = restoreZoomed;

      const updatePointer = (ev: PointerEvent | MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onPointerMove = (ev: PointerEvent) => {
        const now = performance.now();
        if (now - lastMove < 40) return;
        lastMove = now;
        updatePointer(ev);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(interactables, false);

        if (hits.length > 0) {
          const idx = hits[0]!.object.userData.noteIndex as number;
          renderer.domElement.style.cursor = "pointer";
          if (idx !== hoveredIdx && idx !== zoomedIdx) {
            if (hoveredIdx >= 0 && hoveredIdx !== zoomedIdx && noteGroups[hoveredIdx]) {
              const old = noteGroups[hoveredIdx]!;
              gsap.to(old.group.rotation, {
                x: 0,
                z: old.baseRotZ,
                duration: 0.3,
              });
              gsap.to(old.group.position, {
                z: old.basePos.z,
                duration: 0.3,
              });
              gsap.to(old.group.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 0.3,
              });
            }
            hoveredIdx = idx;
            const cur = noteGroups[idx]!;
            setHoveredDream(cur.dream);
            gsap.to(cur.group.rotation, {
              x: -0.1,
              z: 0,
              duration: 0.28,
              ease: "back.out(2)",
            });
            gsap.to(cur.group.position, {
              z: cur.basePos.z + 0.22,
              duration: 0.28,
            });
            gsap.to(cur.group.scale, {
              x: 1.18,
              y: 1.18,
              z: 1.18,
              duration: 0.28,
            });
          }
        } else {
          renderer.domElement.style.cursor = "default";
          if (hoveredIdx >= 0 && hoveredIdx !== zoomedIdx && noteGroups[hoveredIdx]) {
            const old = noteGroups[hoveredIdx]!;
            gsap.to(old.group.rotation, {
              x: 0,
              z: old.baseRotZ,
              duration: 0.3,
            });
            gsap.to(old.group.position, {
              z: old.basePos.z,
              duration: 0.3,
            });
            gsap.to(old.group.scale, {
              x: 1,
              y: 1,
              z: 1,
              duration: 0.3,
            });
          }
          hoveredIdx = -1;
          setHoveredDream(null);
        }
      };

      const onClick = (ev: MouseEvent) => {
        updatePointer(ev);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(interactables, false);
        if (hits.length > 0) {
          const idx = hits[0]!.object.userData.noteIndex as number;
          const target = noteGroups[idx];
          if (!target) return;

          restoreZoomed();
          zoomedIdx = idx;
          onSelectRef.current(target.dream);

          gsap.to(target.group.position, {
            x: -1.4,
            y: 0.15,
            z: 2.35,
            duration: 0.65,
            ease: "power3.out",
          });
          gsap.to(target.group.rotation, {
            x: 0,
            y: 0.18,
            z: 0,
            duration: 0.65,
            ease: "power3.out",
          });
          gsap.to(target.group.scale, {
            x: 1.55,
            y: 1.55,
            z: 1.55,
            duration: 0.65,
            ease: "power3.out",
          });
        } else if (zoomedIdx >= 0) {
          restoreZoomed();
          onSelectRef.current(null);
        }
      };

      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("click", onClick);

      return {
        onTick: (_dt: number, elapsed: number) => {
          // Getaran angin sore halus pada kertas-kertas di papan tulis
          for (let i = 0; i < noteGroups.length; i++) {
            if (i === zoomedIdx || i === hoveredIdx) continue;
            const n = noteGroups[i]!;
            n.group.rotation.x = Math.sin(elapsed * 1.5 + i * 0.9) * 0.02;
          }
        },
        onDispose: () => {
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("click", onClick);
        },
      };
    },
    []
  );

  return (
    <SceneShell
      onSetup={handleSetup}
      cameraPosition={[0, 0.05, 6.45]}
      cameraFov={44}
      continuous={true}
      ariaLabel="Papan Tulis Kapur 3D Cita-Cita Siswa XII PPLG 1"
      className="relative w-full h-[560px] sm:h-[640px]"
    >
      {/* Kartu Baca Cepat Tanpa Modal saat Kursor Melintas di Atas Kertas */}
      {hoveredDream && !selectedDream && (
        <div
          role="status"
          className="pointer-events-none absolute top-3 left-1/2 z-20 w-[92%] max-w-xl -translate-x-1/2 rounded-xl border border-[#e09f4c] bg-[#1e150f]/95 px-4 py-2.5 text-center text-[#f2e6d5] shadow-xl"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#f3ca82]">
            {hoveredDream.student_name} ({hoveredDream.student_nickname})
          </p>
          <p className="mt-0.5 font-hand text-xl font-bold text-white">
            &ldquo;{hoveredDream.dream}&rdquo;
          </p>
          <p className="mt-0.5 text-[11px] text-[#d5c3ad]">
            Alasan: {hoveredDream.reason} · (Klik kertas untuk kirim semangat)
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-[#463629] bg-[#231912]/90 px-4 py-1.5 text-center text-xs text-[#f2e6d5]">
        Teks tiap kertas dapat langsung dibaca di papan · Arahkan kursor untuk baca alasan · Klik untuk kirim semangat
      </div>
    </SceneShell>
  );
}
