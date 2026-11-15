"use client";

import * as React from "react";
import * as THREE from "three";
import { SceneShell } from "@/components/three/scene-shell";
import {
  createLaptopScreenTexture,
  createPolaroidTexture,
  createWoodTextures,
} from "@/lib/procedural-textures";
import { ensureScrollTrigger, gsap } from "@/lib/gsap-utils";

export function HeroDeskSceneHD({ scrollTriggerEl }: { scrollTriggerEl?: HTMLElement | null }) {
  const scrollProgressRef = React.useRef(0);

  React.useEffect(() => {
    ensureScrollTrigger();
    if (!scrollTriggerEl) return;
    const tween = gsap.to(scrollProgressRef, {
      current: 1,
      ease: "none",
      scrollTrigger: {
        trigger: scrollTriggerEl,
        start: "top top",
        end: "bottom top",
        scrub: 0.6,
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [scrollTriggerEl]);

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

      const addContactShadow = (x: number, z: number, rx: number, rz: number) => {
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(1, 24),
          new THREE.MeshBasicMaterial({
            color: 0x0b0502,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
          })
        );
        disc.rotation.x = -Math.PI / 2;
        disc.scale.set(rx, rz, 1);
        disc.position.set(x, 0.015, z);
        scene.add(disc);
      };

      // 1. Meja Belajar Kayu Jati (Daun Meja + Lis Depan + Kaki)
      const deskGroup = new THREE.Group();
      const deskTop = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 0.18, 3.4),
        new THREE.MeshStandardMaterial({
          map: wood.map,
          bumpMap: wood.bumpMap,
          bumpScale: 0.02,
          roughness: 0.58,
          metalness: 0.08,
        })
      );
      deskTop.position.set(0, -0.09, 0);
      deskTop.receiveShadow = true;
      deskGroup.add(deskTop);

      const deskTrim = new THREE.Mesh(
        new THREE.BoxGeometry(6.86, 0.08, 3.46),
        new THREE.MeshStandardMaterial({
          map: darkWood.map,
          roughness: 0.48,
          metalness: 0.12,
        })
      );
      deskTrim.position.set(0, -0.16, 0);
      deskGroup.add(deskTrim);
      scene.add(deskGroup);

      // 2. Jendela Senja di Belakang Meja (Cahaya Sore Ende)
      const windowGroup = new THREE.Group();
      windowGroup.position.set(0, 1.85, -1.75);
      const skyGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 2.8),
        new THREE.MeshBasicMaterial({ color: 0xe58c47 })
      );
      windowGroup.add(skyGlow);

      const frameMat = new THREE.MeshStandardMaterial({
        map: darkWood.map,
        roughness: 0.65,
        metalness: 0.1,
      });
      const vBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.12), frameMat);
      vBar1.position.x = -1.2;
      const vBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.12), frameMat);
      vBar2.position.x = 1.2;
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.1, 0.12), frameMat);
      hBar.position.y = 0.2;
      windowGroup.add(vBar1, vBar2, hBar);
      scene.add(windowGroup);

      // 3. Laptop Prosedural + Tuts Keyboard InstancedMesh (>30 Tuts) + Layar Kode Anti-Silau
      const laptopGroup = new THREE.Group();
      laptopGroup.position.set(0, 0, 0.24);
      addContactShadow(0, 0.24, 1.05, 0.74);

      const chassisMat = new THREE.MeshStandardMaterial({
        color: 0x2c2723,
        roughness: 0.45,
        metalness: 0.55,
      });
      const baseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.74, 0.06, 1.12),
        chassisMat
      );
      baseMesh.position.y = 0.03;
      baseMesh.castShadow = true;
      laptopGroup.add(baseMesh);

      // Tuts Keyboard dengan InstancedMesh (4 baris x 10 kolom = 40 tuts)
      const keyGeo = new THREE.BoxGeometry(0.12, 0.022, 0.11);
      const keyMat = new THREE.MeshStandardMaterial({
        color: 0x171311,
        roughness: 0.72,
        metalness: 0.15,
      });
      const keyCount = 40;
      const keysInstanced = new THREE.InstancedMesh(keyGeo, keyMat, keyCount);
      const dummy = new THREE.Object3D();
      let kIdx = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 10; c++) {
          dummy.position.set(
            -0.66 + c * 0.146,
            0.068,
            -0.30 + r * 0.145
          );
          dummy.updateMatrix();
          keysInstanced.setMatrixAt(kIdx++, dummy.matrix);
        }
      }
      keysInstanced.instanceMatrix.needsUpdate = true;
      keysInstanced.computeBoundingSphere();
      laptopGroup.add(keysInstanced);

      // Layar Laptop Terbuka + Tekstur Kode Anti-Silau (Matte Dark Screen)
      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, 0.06, -0.52);
      lidGroup.rotation.x = -0.12;

      const lidBack = new THREE.Mesh(
        new THREE.BoxGeometry(1.74, 1.12, 0.045),
        chassisMat
      );
      lidBack.position.set(0, 0.56, 0);
      lidBack.castShadow = true;
      lidGroup.add(lidBack);

      const bezelMat = new THREE.MeshBasicMaterial({
        color: 0x090b10,
        fog: false,
      });
      const bezelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.66, 1.04),
        bezelMat
      );
      bezelMesh.position.set(0, 0.56, 0.024);
      lidGroup.add(bezelMesh);

      const screenTexOn = createLaptopScreenTexture(true, renderer);
      const screenTexOff = createLaptopScreenTexture(false, renderer);
      const screenMat = new THREE.MeshBasicMaterial({
        map: screenTexOn,
        fog: false,
        toneMapped: false,
      });
      const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.58, 0.96),
        screenMat
      );
      screenMesh.position.set(0, 0.56, 0.027);
      lidGroup.add(screenMesh);

      laptopGroup.add(lidGroup);
      scene.add(laptopGroup);

      // 4. Lampu Meja (LatheGeometry untuk dasar & kap, TubeGeometry untuk lengan, SpotLight + Kerucut Cahaya)
      const lampGroup = new THREE.Group();
      lampGroup.position.set(1.88, 0, -0.45);
      addContactShadow(1.88, -0.45, 0.48, 0.48);

      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xc88d48,
        roughness: 0.28,
        metalness: 0.82,
      });
      const shadeMat = new THREE.MeshStandardMaterial({
        color: 0x3b593f,
        roughness: 0.45,
        metalness: 0.25,
        side: THREE.DoubleSide,
      });

      const basePoints = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.36, 0),
        new THREE.Vector2(0.32, 0.08),
        new THREE.Vector2(0.12, 0.14),
        new THREE.Vector2(0, 0.15),
      ];
      const lampBase = new THREE.Mesh(
        new THREE.LatheGeometry(basePoints, 24),
        brassMat
      );
      lampBase.castShadow = true;
      lampGroup.add(lampBase);

      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.14, 0),
        new THREE.Vector3(0.12, 0.85, -0.1),
        new THREE.Vector3(-0.18, 1.48, 0.15),
        new THREE.Vector3(-0.42, 1.32, 0.24),
      ]);
      const lampArm = new THREE.Mesh(
        new THREE.TubeGeometry(armCurve, 28, 0.032, 12, false),
        brassMat
      );
      lampArm.castShadow = true;
      lampGroup.add(lampArm);

      const shadePoints = [
        new THREE.Vector2(0.05, 0),
        new THREE.Vector2(0.18, -0.08),
        new THREE.Vector2(0.34, -0.32),
      ];
      const lampShade = new THREE.Mesh(
        new THREE.LatheGeometry(shadePoints, 24),
        shadeMat
      );
      lampShade.position.set(-0.42, 1.35, 0.24);
      lampShade.rotation.z = 0.24;
      lampGroup.add(lampShade);

      // Bohlam & Kerucut Cahaya Lembut (Tidak Menutupi Layar Laptop)
      const bulbMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffe4a0 })
      );
      bulbMesh.position.set(-0.45, 1.18, 0.24);
      lampGroup.add(bulbMesh);

      const lightCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.68, 1.25, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffcf75,
          transparent: true,
          opacity: 0.055,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      lightCone.position.set(-0.52, 0.56, 0.24);
      lightCone.rotation.z = 0.14;
      lampGroup.add(lightCone);

      const deskSpot = new THREE.SpotLight(0xffcb78, 2.6, 6, Math.PI / 3, 0.7, 1.5);
      deskSpot.position.set(1.42, 1.25, -0.15);
      deskSpot.target.position.set(0.35, 0, 0.15);
      scene.add(deskSpot);
      scene.add(deskSpot.target);

      // 5. Gantungan Kunci Berayun di Lengan Lampu (Pegas Sederhana)
      const keychainPivot = new THREE.Group();
      keychainPivot.position.set(-0.18, 1.38, 0.15);
      const chainRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.04, 0.008, 8, 16),
        brassMat
      );
      chainRing.position.y = -0.04;
      const charmBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.025, 6),
        new THREE.MeshStandardMaterial({
          color: 0xa84232,
          roughness: 0.35,
          metalness: 0.2,
        })
      );
      charmBody.rotation.x = Math.PI / 2;
      charmBody.position.y = -0.14;
      keychainPivot.add(chainRing, charmBody);
      lampGroup.add(keychainPivot);

      scene.add(lampGroup);

      // 6. Tumpukan Buku Bervariasi di Kiri Meja (Bebas Z-Fighting / Tanpa Glitch Coplanar)
      const booksGroup = new THREE.Group();
      booksGroup.position.set(-1.78, 0, -0.22);
      addContactShadow(-1.78, -0.22, 0.64, 0.54);

      const bookSpecs = [
        { w: 0.94, h: 0.14, d: 0.68, col: 0xa84232, rot: 0.08 },
        { w: 0.86, h: 0.125, d: 0.63, col: 0x2d6a6e, rot: -0.12 },
        { w: 0.80, h: 0.115, d: 0.58, col: 0x3b593f, rot: 0.05 },
        { w: 0.74, h: 0.105, d: 0.54, col: 0xc86d3b, rot: -0.18 },
      ];
      let curBookY = 0.004;
      bookSpecs.forEach((b) => {
        const bGroup = new THREE.Group();
        bGroup.position.y = curBookY + b.h / 2;
        bGroup.rotation.y = b.rot;

        const coverMat = new THREE.MeshStandardMaterial({
          color: b.col,
          roughness: 0.68,
          metalness: 0.06,
        });
        const pageMat = new THREE.MeshStandardMaterial({
          color: 0xf6efe2,
          roughness: 0.88,
        });

        const boardThick = 0.02;
        // Top & bottom hardcovers + left spine (tidak tumpang tindih dengan blok halaman)
        const topCover = new THREE.Mesh(
          new THREE.BoxGeometry(b.w, boardThick, b.d),
          coverMat
        );
        topCover.position.y = b.h / 2 - boardThick / 2;
        topCover.castShadow = true;

        const bottomCover = new THREE.Mesh(
          new THREE.BoxGeometry(b.w, boardThick, b.d),
          coverMat
        );
        bottomCover.position.y = -b.h / 2 + boardThick / 2;
        bottomCover.castShadow = true;

        const spineCover = new THREE.Mesh(
          new THREE.BoxGeometry(boardThick * 1.3, b.h - boardThick * 2, b.d),
          coverMat
        );
        spineCover.position.x = -b.w / 2 + (boardThick * 1.3) / 2;
        spineCover.castShadow = true;

        const pagesWidth = b.w - boardThick * 1.3 - 0.025;
        const pages = new THREE.Mesh(
          new THREE.BoxGeometry(pagesWidth, b.h - boardThick * 2 - 0.004, b.d - 0.04),
          pageMat
        );
        pages.position.x = (boardThick * 1.3 - 0.025) / 2;

        bGroup.add(topCover, bottomCover, spineCover, pages);
        booksGroup.add(bGroup);
        curBookY += b.h + 0.004;
      });
      scene.add(booksGroup);

      // 7. Cangkir Teh Hangat + Partikel Uap
      const mugGroup = new THREE.Group();
      mugGroup.position.set(-1.15, 0, 0.52);
      addContactShadow(-1.15, 0.52, 0.24, 0.24);

      const mugMat = new THREE.MeshStandardMaterial({
        color: 0xf4ead8,
        roughness: 0.25,
        metalness: 0.05,
      });
      const mugBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.13, 0.32, 20),
        mugMat
      );
      mugBody.position.y = 0.16;
      mugBody.castShadow = true;
      const mugHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI),
        mugMat
      );
      mugHandle.rotation.z = -Math.PI / 2;
      mugHandle.position.set(0.14, 0.16, 0);
      const teaLiquid = new THREE.Mesh(
        new THREE.CircleGeometry(0.135, 16),
        new THREE.MeshStandardMaterial({ color: 0x6b3215, roughness: 0.15 })
      );
      teaLiquid.rotation.x = -Math.PI / 2;
      teaLiquid.position.y = 0.29;
      mugGroup.add(mugBody, mugHandle, teaLiquid);
      scene.add(mugGroup);

      // Partikel Uap Teh & Debu Cahaya Senja (Points)
      const steamGeo = new THREE.BufferGeometry();
      const steamCount = 18;
      const steamPositions = new Float32Array(steamCount * 3);
      for (let i = 0; i < steamCount; i++) {
        steamPositions[i * 3] = -1.15 + (Math.random() - 0.5) * 0.12;
        steamPositions[i * 3 + 1] = 0.34 + (i / steamCount) * 0.55;
        steamPositions[i * 3 + 2] = 0.52 + (Math.random() - 0.5) * 0.12;
      }
      steamGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(steamPositions, 3)
      );
      const steamPoints = new THREE.Points(
        steamGeo,
        new THREE.PointsMaterial({
          color: 0xfbf3dc,
          size: 0.045,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      );
      scene.add(steamPoints);

      const dustGeo = new THREE.BufferGeometry();
      const dustCount = 55;
      const dustPos = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 5.2;
        dustPos[i * 3 + 1] = 0.2 + Math.random() * 2.2;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
      }
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      const dustPoints = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({
          color: 0xffd78c,
          size: 0.032,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        })
      );
      scene.add(dustPoints);

      // 8. Polaroid Melayang Pelan
      const polTex1 = createPolaroidTexture(
        {
          caption: "Senja di Lab RPL",
          category: "Momen Kelas",
          phase: "XII",
          dateStr: "2026",
          seed: 7,
        },
        renderer
      );
      const floatingPol1 = new THREE.Mesh(
        new THREE.PlaneGeometry(0.56, 0.68),
        new THREE.MeshStandardMaterial({
          map: polTex1,
          roughness: 0.7,
          side: THREE.DoubleSide,
        })
      );
      floatingPol1.position.set(-1.1, 1.05, -0.35);
      floatingPol1.rotation.set(0.08, 0.28, 0.12);
      scene.add(floatingPol1);

      const polTex2 = createPolaroidTexture(
        {
          caption: "Keluarga XII PPLG 1",
          category: "Hari Terakhir",
          phase: "XII",
          dateStr: "2027",
          seed: 19,
        },
        renderer
      );
      const floatingPol2 = new THREE.Mesh(
        new THREE.PlaneGeometry(0.54, 0.66),
        new THREE.MeshStandardMaterial({
          map: polTex2,
          roughness: 0.7,
          side: THREE.DoubleSide,
        })
      );
      floatingPol2.position.set(1.05, 1.25, -0.45);
      floatingPol2.rotation.set(-0.05, -0.25, -0.1);
      scene.add(floatingPol2);

      // Parallax Pointer
      const pointerTarget = { x: 0, y: 0 };
      const onPointerMove = (ev: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerTarget.x = ((ev.clientX - rect.left) / rect.width - 0.5) * 0.9;
        pointerTarget.y = ((ev.clientY - rect.top) / rect.height - 0.5) * 0.45;
      };
      window.addEventListener("pointermove", onPointerMove);

      let lastBlinkStep = 0;

      return {
        onTick: (dt: number, elapsed: number) => {
          // Kedip kursor layar laptop tiap 0.65 detik
          const blinkStep = Math.floor(elapsed / 0.65);
          if (blinkStep !== lastBlinkStep) {
            lastBlinkStep = blinkStep;
            const nextTex = blinkStep % 2 === 0 ? screenTexOn : screenTexOff;
            screenMat.map = nextTex;
            screenMat.needsUpdate = true;
          }

          // Ayunan pegas gantungan kunci & polaroid melayang
          keychainPivot.rotation.z = Math.sin(elapsed * 2.6) * 0.22;
          keychainPivot.rotation.x = Math.cos(elapsed * 1.9) * 0.1;

          floatingPol1.position.y = 1.05 + Math.sin(elapsed * 1.3) * 0.06;
          floatingPol1.rotation.z = 0.12 + Math.sin(elapsed * 0.9) * 0.04;

          floatingPol2.position.y = 1.25 + Math.cos(elapsed * 1.15) * 0.06;
          floatingPol2.rotation.z = -0.1 + Math.cos(elapsed * 0.85) * 0.04;

          // Uap teh naik perlahan
          const sPos = steamGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < steamCount; i++) {
            let py = sPos.getY(i) + dt * 0.22;
            if (py > 0.88) py = 0.32;
            sPos.setY(i, py);
          }
          sPos.needsUpdate = true;

          // Kamera Parallax + ScrollTrigger zoom menuju layar laptop
          const sp = scrollProgressRef.current;
          const desiredX = pointerTarget.x * (1 - sp * 0.6);
          const desiredY = THREE.MathUtils.lerp(1.55, 0.75, sp) - pointerTarget.y * 0.4;
          const desiredZ = THREE.MathUtils.lerp(4.25, 1.95, sp);

          camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredX, 4, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredY, 4, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredZ, 4, dt);
          camera.lookAt(0, THREE.MathUtils.lerp(0.55, 0.52, sp), 0);
        },
        onDispose: () => {
          window.removeEventListener("pointermove", onPointerMove);
          screenTexOn.dispose();
          screenTexOff.dispose();
        },
      };
    },
    []
  );

  return (
    <SceneShell
      onSetup={handleSetup}
      cameraPosition={[0, 1.55, 4.25]}
      cameraFov={42}
      continuous={true}
      ariaLabel="Scene 3D Meja Belajar Saat Senja XII PPLG 1 MAKN Ende"
      className="relative w-full h-[460px] sm:h-[540px]"
    />
  );
}
