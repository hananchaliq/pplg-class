"use client";

import * as React from "react";
import * as THREE from "three";
import { gsap } from "@/lib/gsap-utils";
import { BOOK_FLIP_CONFIG } from "@/lib/book-flip-config";
import { prefersReducedMotion } from "@/lib/motion-tokens";
import { SceneShell } from "@/components/three/scene-shell";
import {
  createBookCoverTextures,
  createBookPageTexture,
  createWoodTextures,
  type BookPageData,
} from "@/lib/procedural-textures";

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
  onWebglUnavailable?: () => void;
}

const {
  pageWidth: PAGE_W,
  pageHeight: PAGE_H,
  segmentsX: SEG_X,
  segmentsZ: SEG_Z,
  restArchHeight: REST_ARCH,
  gutterDip: GUTTER_DIP,
  maxStackHeight: MAX_STACK_H,
  minStackHeight: MIN_STACK_H,
  leafPoolSize: LEAF_POOL_SIZE,
  leafHalfGap: LEAF_HALF_GAP,
  stackLayerStep: STACK_LAYER_STEP,
} = BOOK_FLIP_CONFIG.geometry;

/**
 * Tekstur tepi tumpukan kertas buku nyata (lapisan lembaran tipis berwarna krem-gading).
 */
function createPageEdgeTexture(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#EAE4D3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillStyle =
      y % 6 === 0
        ? "rgba(110, 96, 76, 0.16)"
        : "rgba(255, 252, 245, 0.35)";
    ctx.fillRect(0, y, canvas.width, 1);
  }

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
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

/**
 * Geometri lembaran halaman statis kiri/kanan dengan lengkungan lembah punggung buku.
 */
function createCurvedSpreadPageGeometry(
  side: "left" | "right"
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEG_X, SEG_Z);
  geo.rotateX(-Math.PI / 2);
  geo.translate(side === "right" ? PAGE_W / 2 : -PAGE_W / 2, 0, 0);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const t = THREE.MathUtils.clamp(Math.abs(lx) / PAGE_W, 0, 1);
    const archY =
      Math.sin(Math.pow(t, 0.72) * Math.PI) * REST_ARCH -
      Math.pow(1 - t, 3) * GUTTER_DIP;
    pos.setY(i, archY);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Pasangan bidang depan/belakang untuk lembar yang dibalik.
 * Sisi belakang membalik koordinat U secara matematis agar tulisan tangan terbaca benar setelah dibalik!
 */
function createFlipLeafSideGeometry(
  face: "front" | "back"
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEG_X, SEG_Z);
  geo.rotateX(-Math.PI / 2);
  if (face === "back") {
    // rotateZ(Math.PI) membalik normal ke -Y sekaligus menukar sisi X↔U sehingga
    // saat lembar berputar +180° ke tumpukan kiri, tepi luar (x=-PAGE_W) ber-u=0 dan punggung (x=0) ber-u=1 (terbaca benar).
    geo.rotateZ(Math.PI);
    geo.translate(PAGE_W / 2, -LEAF_HALF_GAP, 0);
  } else {
    geo.translate(PAGE_W / 2, LEAF_HALF_GAP, 0);
  }
  geo.computeVertexNormals();
  return geo;
}

interface FlipUniforms {
  uProgress: { value: number };
  uBend: { value: number };
  uStackStartY: { value: number };
  uStackEndY: { value: number };
  uLeafLift: { value: number };
}

/**
 * Menempelkan deformasi kertas vertex-shader ala book-flip ke MeshStandardMaterial
 * via onBeforeCompile: mengubah posisi & normal vertex saja sehingga pencahayaan PBR,
 * bayangan jatuh, dan offset tumpukan kiri/kanan bekerja akurat tanpa z-fighting.
 */
function createBookFlipShaderMaterial(
  face: "front" | "back",
  uniforms: FlipUniforms
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf6f3ea,
    roughness: 0.76,
    metalness: 0.0,
    emissive: 0x161410,
    emissiveIntensity: 0.14,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  mat.customProgramCacheKey = () => `kenangan-book-flip-pbr-${face}-v4`;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uProgress = uniforms.uProgress;
    shader.uniforms.uBend = uniforms.uBend;
    shader.uniforms.uStackStartY = uniforms.uStackStartY;
    shader.uniforms.uStackEndY = uniforms.uStackEndY;
    shader.uniforms.uLeafLift = uniforms.uLeafLift;
    shader.uniforms.uPageW = { value: PAGE_W };
    shader.uniforms.uPageH = { value: PAGE_H };
    shader.uniforms.uRestArch = { value: REST_ARCH };
    shader.uniforms.uGutterDip = { value: GUTTER_DIP };
    shader.uniforms.uCornerLead = { value: BOOK_FLIP_CONFIG.shader.cornerLeadWeight };
    shader.uniforms.uEdgeLag = { value: BOOK_FLIP_CONFIG.shader.edgeLagWeight };
    shader.uniforms.uBellyBase = { value: BOOK_FLIP_CONFIG.shader.midAirBellyBase };
    shader.uniforms.uBellyBend = { value: BOOK_FLIP_CONFIG.shader.midAirBellyBend };

    const vertHeader = `
      uniform float uProgress;
      uniform float uBend;
      uniform float uStackStartY;
      uniform float uStackEndY;
      uniform float uLeafLift;
      uniform float uPageW;
      uniform float uPageH;
      uniform float uRestArch;
      uniform float uGutterDip;
      uniform float uCornerLead;
      uniform float uEdgeLag;
      uniform float uBellyBase;
      uniform float uBellyBend;
      varying float vGutterShade;

      float computeLeafAngle(float rx, float rz) {
        float r = clamp(abs(rx) / uPageW, 0.0, 1.0);
        float zNorm = clamp((rz / (uPageH * 0.5)) * 0.5 + 0.5, 0.0, 1.0);
        float sinP = sin(clamp(uProgress, 0.0, 1.0) * 3.14159265);
        float bendAmp = mix(0.62, 1.38, clamp(uBend, 0.0, 1.3));
        float leadLag = sinP * bendAmp * (uCornerLead * r * (0.34 + 0.66 * zNorm) - uEdgeLag * pow(r, 1.32));
        float eff = clamp(uProgress + leadLag, 0.0, 1.0);
        return eff * 3.14159265;
      }
    `;

    shader.vertexShader = vertHeader + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      `
      #include <beginnormal_vertex>
      float nAngle = computeLeafAngle(position.x, position.z);
      float nCos = cos(nAngle);
      float nSin = sin(nAngle);
      float nr = clamp(abs(position.x) / uPageW, 0.0, 1.0);
      float nSinTurn = sin(clamp(uProgress, 0.0, 1.0) * 3.14159265);
      float slopeTilt = cos(nr * 3.14159265) * 0.165 * (1.0 - nSinTurn * 0.42);
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
      vGutterShade = mix(0.80, 1.0, smoothstep(0.0, 0.24, rDist));

      float clampedP = clamp(uProgress, 0.0, 1.0);
      float flipAng = computeLeafAngle(position.x, position.z);
      float cAng = cos(flipAng);
      float sAng = sin(flipAng);
      float sinTurn = sin(clampedP * 3.14159265);

      float restArch = sin(pow(rDist, 0.72) * 3.14159265) * uRestArch - pow(1.0 - rDist, 3.0) * uGutterDip;
      float midAirBelly = sinTurn * sin(rDist * 3.14159265) * (uBellyBase + uBellyBend * clamp(uBend, 0.0, 1.3));
      // Offset tumpukan dihitung langsung di shader agar lembar mendarat tepat DI ATAS tumpukan tujuan
      float stackY = mix(uStackStartY, uStackEndY, smoothstep(0.0, 1.0, clampedP));

      float sSpine = position.x;
      float ny = position.y;
      float rxPos = sSpine * cAng - ny * sAng;
      float ryPos = sSpine * sAng + ny * cAng;

      ryPos += stackY + restArch * (1.0 - 0.34 * sinTurn) + midAirBelly + sinTurn * uLeafLift;
      rxPos += (-sAng) * (sinTurn * sin(rDist * 3.14159265) * 0.075);

      transformed = vec3(rxPos, ryPos, position.z);
      `
    );

    shader.fragmentShader =
      `varying float vGutterShade;\n` +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        diffuseColor.rgb *= vGutterShade;
        `
      );
  };

  return mat;
}

interface FlipLeafSlot {
  group: THREE.Group;
  frontMat: THREE.MeshStandardMaterial;
  backMat: THREE.MeshStandardMaterial;
  uniforms: FlipUniforms;
  active: boolean;
  isDragSlot: boolean;
  dir: 1 | -1;
  fromSpread: number;
  toSpread: number;
  tween: gsap.core.Tween | null;
}

export function BukuKenanganSceneHD({
  spreads,
  isBookOpen,
  activeSpreadIndex,
  coverPhotoUrl,
  coverCaption,
  onOpenBook,
  onChangeSpread,
  onWebglUnavailable,
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

  const syncCoverTextureRef = React.useRef<
    ((photoUrl?: string, caption?: string) => void) | null
  >(null);
  const triggerFlipRef = React.useRef<
    ((fromIdx: number, toIdx: number) => void) | null
  >(null);
  const animateCoverRef = React.useRef<((open: boolean) => void) | null>(null);
  const applyRestingSpreadRef = React.useRef<((idx: number) => void) | null>(
    null
  );
  const suppressNextEffectFlipRef = React.useRef(false);
  const prevSpreadIndexRef = React.useRef(activeSpreadIndex);
  const prevOpenStateRef = React.useRef(isBookOpen);

  React.useEffect(() => {
    const prev = prevSpreadIndexRef.current;
    if (prev !== activeSpreadIndex) {
      prevSpreadIndexRef.current = activeSpreadIndex;
      if (suppressNextEffectFlipRef.current) {
        suppressNextEffectFlipRef.current = false;
        return;
      }
      triggerFlipRef.current?.(prev, activeSpreadIndex);
    } else {
      applyRestingSpreadRef.current?.(activeSpreadIndex);
    }
  }, [activeSpreadIndex, spreads]);

  React.useEffect(() => {
    if (prevOpenStateRef.current !== isBookOpen) {
      prevOpenStateRef.current = isBookOpen;
      animateCoverRef.current?.(isBookOpen);
    }
  }, [isBookOpen]);

  React.useEffect(() => {
    syncCoverTextureRef.current?.(coverPhotoUrl, coverCaption);
  }, [coverPhotoUrl, coverCaption]);

  const handleSetup = React.useCallback(
    ({
      scene,
      camera,
      renderer,
      requestRender,
    }: {
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
      requestRender: () => void;
    }) => {
      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          BOOK_FLIP_CONFIG.performance.maxPixelRatio
        )
      );
      camera.near = BOOK_FLIP_CONFIG.camera.near;
      camera.far = BOOK_FLIP_CONFIG.camera.far;
      camera.fov = BOOK_FLIP_CONFIG.camera.fov;
      camera.updateProjectionMatrix();

      const wood = createWoodTextures(renderer, "warm");
      const darkWood = createWoodTextures(renderer, "dark");
      const pageEdgeTex = createPageEdgeTexture(renderer);
      const coverTex = createBookCoverTextures(
        renderer,
        coverPhotoUrlRef.current,
        coverCaptionRef.current
      );

      // Pencahayaan studio reading desk hangat & nyata
      const readingKeySpot = new THREE.SpotLight(
        0xfff1d6,
        2.75,
        18,
        Math.PI * 0.28,
        0.55,
        1.2
      );
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

      const deskBlotter = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 0.016, 3.9),
        new THREE.MeshStandardMaterial({
          color: 0x26231f,
          roughness: 0.88,
          metalness: 0.02,
        })
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

      // Bayangan kontak lembut buku di atas alas meja
      const bookShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 3.45),
        new THREE.MeshBasicMaterial({
          color: 0x0f0e0c,
          transparent: true,
          opacity: 0.46,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: 2,
          polygonOffsetUnits: 2,
        })
      );
      bookShadow.rotation.x = -Math.PI / 2;
      bookShadow.position.set(0, -0.001, 0.05);
      bookShadow.renderOrder = 0;
      scene.add(bookShadow);

      // Properti meja: cangkir & pulpen klasik
      const mugGroup = new THREE.Group();
      mugGroup.position.set(-3.12, 0.0, -1.12);
      const coasterMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.42, 0.028, 24),
        new THREE.MeshStandardMaterial({ color: 0x4b3b2c, roughness: 0.72 })
      );
      const mugCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.25, 0.34, 24),
        new THREE.MeshStandardMaterial({
          color: 0xeee9dd,
          roughness: 0.26,
          metalness: 0.04,
        })
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
        new THREE.MeshStandardMaterial({
          color: 0x1e2022,
          roughness: 0.32,
          metalness: 0.32,
        })
      );
      penBody.rotation.x = Math.PI / 2;
      penBody.castShadow = true;
      const penTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.026, 0.15, 16),
        new THREE.MeshStandardMaterial({
          color: 0xd6b572,
          roughness: 0.22,
          metalness: 0.88,
        })
      );
      penTip.rotation.x = -Math.PI / 2;
      penTip.position.z = -0.84;
      const penClip = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.022, 0.38),
        new THREE.MeshStandardMaterial({
          color: 0xd6b572,
          roughness: 0.22,
          metalness: 0.88,
        })
      );
      penClip.position.set(0, 0.028, 0.42);
      penGroup.add(penBody, penTip, penClip);
      scene.add(penGroup);

      // Untaian lampu pijar hangat statis (tidak membakar GPU saat buku diam)
      const fairyGroup = new THREE.Group();
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

        const halo = new THREE.Mesh(
          haloGeo,
          new THREE.MeshBasicMaterial({
            color: 0xd9a441,
            transparent: true,
            opacity: 0.16,
            depthWrite: false,
          })
        );
        halo.position.set(bx, 0.004, bz);
        fairyGroup.add(halo);
      });
      scene.add(fairyGroup);

      // ================================================================
      // 2. BUKU FISIK 3D REALISTIS
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

      // Punggung Buku
      const spineGroup = new THREE.Group();
      const spineCenter = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.08,
          0.08,
          PAGE_H + 0.18,
          18,
          1,
          false,
          0,
          Math.PI
        ),
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

      const headbandGeo = new THREE.BoxGeometry(0.11, 0.032, 0.028);
      const topBand = new THREE.Mesh(headbandGeo, ribbonMat);
      topBand.position.set(0, 0.068, -(PAGE_H / 2 - 0.01));
      const bottomBand = new THREE.Mesh(headbandGeo, ribbonMat);
      bottomBand.position.set(0, 0.068, PAGE_H / 2 - 0.01);
      spineGroup.add(topBand, bottomBand);
      bookRoot.add(spineGroup);

      const ribbonTail = new THREE.Mesh(
        new THREE.BoxGeometry(0.052, 0.008, 0.68),
        ribbonMat
      );
      ribbonTail.position.set(0.05, 0.012, PAGE_H / 2 + 0.24);
      ribbonTail.rotation.y = 0.09;
      bookRoot.add(ribbonTail);

      // Blok Ketebalan Halaman Kiri & Kanan
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

      // Lembar Statis Kiri & Kanan
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
      leftPageMesh.renderOrder = 1;
      bookRoot.add(leftPageMesh);

      const rightPageMesh = new THREE.Mesh(rightPageGeo, rightPageMat);
      rightPageMesh.receiveShadow = true;
      rightPageMesh.renderOrder = 1;
      bookRoot.add(rightPageMesh);

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
      spineShadowStrip.renderOrder = 2;
      bookRoot.add(spineShadowStrip);

      // ================================================================
      // 3. POOL LEMBARAN BERBASIS VERTEX SHADER + GSAP + DRAG-TO-FLIP
      // ================================================================
      const sharedFlipFrontGeo = createFlipLeafSideGeometry("front");
      const sharedFlipBackGeo = createFlipLeafSideGeometry("back");
      const flipPoolGroup = new THREE.Group();
      bookRoot.add(flipPoolGroup);

      const leafPool: FlipLeafSlot[] = Array.from(
        { length: LEAF_POOL_SIZE },
        (_, i) => {
          const uniforms: FlipUniforms = {
            uProgress: { value: 0 },
            uBend: { value: BOOK_FLIP_CONFIG.shader.baseBend },
            uStackStartY: { value: 0.16 },
            uStackEndY: { value: 0.16 },
            uLeafLift: { value: i * 0.014 },
          };
          const frontMat = createBookFlipShaderMaterial("front", uniforms);
          const backMat = createBookFlipShaderMaterial("back", uniforms);
          const group = new THREE.Group();
          const frontMesh = new THREE.Mesh(sharedFlipFrontGeo, frontMat);
          const backMesh = new THREE.Mesh(sharedFlipBackGeo, backMat);
          frontMesh.castShadow = true;
          backMesh.castShadow = true;
          frontMesh.renderOrder = 3 + i;
          backMesh.renderOrder = 3 + i;
          group.add(frontMesh, backMesh);
          group.visible = false;
          flipPoolGroup.add(group);
          return {
            group,
            frontMat,
            backMat,
            uniforms,
            active: false,
            isDragSlot: false,
            dir: 1,
            fromSpread: 0,
            toSpread: 0,
            tween: null,
          };
        }
      );

      // ================================================================
      // 4. SAMPUL KERAS BERENGSEL (WEIGHTED OVERSHOOT + SETTLE)
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

      const closedFrontCoverGeo = new THREE.PlaneGeometry(
        PAGE_W + 0.1,
        PAGE_H + 0.12
      );
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

      const innerCoverGeo = new THREE.PlaneGeometry(
        PAGE_W + 0.1,
        PAGE_H + 0.12
      );
      innerCoverGeo.rotateX(Math.PI / 2);
      innerCoverGeo.translate((PAGE_W + 0.12) / 2, 0, 0);
      const innerCoverMesh = new THREE.Mesh(
        innerCoverGeo,
        new THREE.MeshStandardMaterial({ color: 0xe6dfd0, roughness: 0.88 })
      );
      innerCoverMesh.position.y = -0.047;
      closedCoverHinge.add(innerCoverMesh);
      bookRoot.add(closedCoverHinge);

      // Bidang backdrop datar tak terlihat untuk hit-test stabil (bebas distorsi vertex shader GPU)
      const hitProxyGeo = new THREE.PlaneGeometry(PAGE_W * 2.15, PAGE_H * 1.08);
      hitProxyGeo.rotateX(-Math.PI / 2);
      const hitProxyMesh = new THREE.Mesh(
        hitProxyGeo,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitProxyMesh.position.set(0, 0.16, 0);
      bookRoot.add(hitProxyMesh);

      // ================================================================
      // 5. LAZY TEXTURE CACHE DENGAN MIPMAPS & ANISOTROPY MAKSIMAL
      // ================================================================
      const textureCache = new Map<
        number,
        { left: THREE.CanvasTexture; right: THREE.CanvasTexture }
      >();

      const enhancePageTexture = (tex: THREE.CanvasTexture) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tex.needsUpdate = true;
        return tex;
      };

      const getSpreadTextures = (idx: number) => {
        const list = spreadsRef.current;
        if (!list.length) return null;
        const safeIdx = Math.max(0, Math.min(list.length - 1, idx));
        if (!textureCache.has(safeIdx)) {
          const sp = list[safeIdx]!;
          textureCache.set(safeIdx, {
            left: enhancePageTexture(createBookPageTexture(sp.leftPage, renderer)),
            right: enhancePageTexture(
              createBookPageTexture(sp.rightPage, renderer)
            ),
          });
        }
        return textureCache.get(safeIdx)!;
      };

      const pruneTextureCache = (centerIdx: number) => {
        const radius = BOOK_FLIP_CONFIG.performance.textureCacheRadius;
        for (const [k, texPair] of textureCache.entries()) {
          if (Math.abs(k - centerIdx) > radius) {
            texPair.left.dispose();
            texPair.right.dispose();
            textureCache.delete(k);
          }
        }
      };

      // State fisik buku & kamera yang dikendalikan GSAP (render on-demand!)
      const rigState: {
        coverOpen: number;
        readSpread: number;
        camX: number;
        camY: number;
        camZ: number;
        lookY: number;
        lookZ: number;
        parallaxX: number;
        parallaxY: number;
        idleSwayStrength: number;
      } = {
        coverOpen: isOpenRef.current ? 1 : 0,
        readSpread: activeSpreadRef.current,
        camX: BOOK_FLIP_CONFIG.camera.closedPos.x,
        camY: isOpenRef.current
          ? BOOK_FLIP_CONFIG.camera.openPos.y
          : BOOK_FLIP_CONFIG.camera.closedPos.y,
        camZ: isOpenRef.current
          ? BOOK_FLIP_CONFIG.camera.openPos.z
          : BOOK_FLIP_CONFIG.camera.closedPos.z,
        lookY: isOpenRef.current
          ? BOOK_FLIP_CONFIG.camera.lookAtOpen.y
          : BOOK_FLIP_CONFIG.camera.lookAtClosed.y,
        lookZ: isOpenRef.current
          ? BOOK_FLIP_CONFIG.camera.lookAtOpen.z
          : BOOK_FLIP_CONFIG.camera.lookAtClosed.z,
        parallaxX: 0,
        parallaxY: 0,
        idleSwayStrength: isOpenRef.current ? 0 : 1,
      };

      let viewportAspect =
        (renderer.domElement.clientWidth || 800) /
        Math.max(1, renderer.domElement.clientHeight || 560);
      let idleSwayPhase = 0;

      const getStackHeights = (spreadVal: number, openVal: number) => {
        const totalSpreads = Math.max(1, spreadsRef.current.length - 1);
        const readRatio = THREE.MathUtils.clamp(
          spreadVal / totalSpreads,
          0.05,
          0.95
        );
        const leftH =
          Math.max(MIN_STACK_H, MAX_STACK_H * readRatio) *
          THREE.MathUtils.clamp(openVal, 0, 1);
        const rightH =
          openVal > 0.12
            ? Math.max(MIN_STACK_H, MAX_STACK_H * (1 - readRatio))
            : MAX_STACK_H;
        const leftTopY = 0.046 + leftH;
        const rightTopY = 0.046 + rightH;
        return { leftH, rightH, leftTopY, rightTopY };
      };

      const computeCameraTargets = (open: boolean) => {
        const cfg = BOOK_FLIP_CONFIG.camera;
        const base = open ? cfg.openPos : cfg.closedPos;
        const look = open ? cfg.lookAtOpen : cfg.lookAtClosed;
        // Portrait aspect ratio reframe agar seluruh spread buku selalu terbaca utuh tanpa terpotong
        const portraitFactor =
          viewportAspect < 1.12
            ? THREE.MathUtils.clamp((1.12 - viewportAspect) / 0.62, 0, 1.35)
            : 0;
        return {
          y: base.y + portraitFactor * cfg.portraitExtraHeight,
          z: base.z + portraitFactor * cfg.portraitExtraDistance,
          lookY: look.y,
          lookZ: look.z,
        };
      };

      const syncBookPose = () => {
        const openVal = rigState.coverOpen;
        const clampedOpen = THREE.MathUtils.clamp(openVal, 0, 1);
        const isMostlyOpen = clampedOpen > 0.16;

        const { leftH, rightH, leftTopY, rightTopY } = getStackHeights(
          rigState.readSpread,
          clampedOpen
        );
        const midTopY = Math.max(leftTopY, rightTopY) + 0.004;

        leftBlockMesh.visible = isMostlyOpen;
        leftBlockMesh.scale.y = Math.max(0.15, leftH / 0.12);
        leftBlockMesh.position.set(-(PAGE_W / 2 + 0.01), 0.045 + leftH / 2, 0);

        rightBlockMesh.scale.y = Math.max(0.15, rightH / 0.12);
        rightBlockMesh.position.set(PAGE_W / 2 + 0.01, 0.045 + rightH / 2, 0);

        leftPageMesh.visible = clampedOpen > 0.28;
        leftPageMesh.position.set(-0.01, leftTopY, 0);

        rightPageMesh.visible = isMostlyOpen;
        rightPageMesh.position.set(0.01, rightTopY, 0);

        spineShadowStrip.visible = isMostlyOpen;
        spineShadowStrip.position.y = midTopY - 0.001;

        leftHardcover.visible = isMostlyOpen;
        cornerProtectorsGroup.visible = isMostlyOpen;

        // Engsel sampul keras mendukung sedikit overshoot saat membuka agar terasa berbobot
        closedCoverHinge.visible = clampedOpen < 0.992;
        closedCoverHinge.position.y = 0.048 + rightH + 0.022;
        closedCoverHinge.rotation.z =
          THREE.MathUtils.clamp(openVal, 0, 1.03) *
          BOOK_FLIP_CONFIG.cover.openAngleRad;

        bookRoot.position.x = THREE.MathUtils.lerp(
          -PAGE_W * 0.5,
          0,
          clampedOpen
        );
        leftHardcover.rotation.z = THREE.MathUtils.lerp(0, -0.015, clampedOpen);
        rightHardcover.rotation.z = THREE.MathUtils.lerp(0, 0.015, clampedOpen);

        // Idle sway lembut saat tertutup dan memudar habis saat buku dibuka
        const swayX =
          Math.sin(idleSwayPhase) *
          BOOK_FLIP_CONFIG.camera.idleSwayAmpX *
          rigState.idleSwayStrength;
        const swayY =
          Math.cos(idleSwayPhase * 0.72) *
          BOOK_FLIP_CONFIG.camera.idleSwayAmpY *
          rigState.idleSwayStrength;

        camera.position.set(
          rigState.camX + rigState.parallaxX + swayX,
          rigState.camY + rigState.parallaxY + swayY,
          rigState.camZ
        );
        camera.lookAt(0, rigState.lookY, rigState.lookZ);
      };

      const initialCam = computeCameraTargets(isOpenRef.current);
      rigState.camY = initialCam.y;
      rigState.camZ = initialCam.z;
      rigState.lookY = initialCam.lookY;
      rigState.lookZ = initialCam.lookZ;
      syncBookPose();

      syncCoverTextureRef.current = (photoUrl?: string, caption?: string) => {
        const nextCover = createBookCoverTextures(renderer, photoUrl, caption);
        if (closedFrontCoverMat.map) closedFrontCoverMat.map.dispose();
        closedFrontCoverMat.map = nextCover.map;
        closedFrontCoverMat.needsUpdate = true;
        requestRender();
      };

      const releaseSlot = (slot: FlipLeafSlot) => {
        slot.tween?.kill();
        slot.tween = null;
        slot.active = false;
        slot.isDragSlot = false;
        slot.group.visible = false;
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
        for (const slot of leafPool) {
          releaseSlot(slot);
        }
        rigState.readSpread = safeIdx;
        syncBookPose();
        requestRender();
      };
      applyRestingSpreadRef.current = applyRestingSpread;

      let coverTween: gsap.core.Tween | null = null;
      let camTween: gsap.core.Tween | null = null;
      let spreadStackTween: gsap.core.Tween | null = null;
      let parallaxTween: gsap.core.Tween | null = null;

      const animateCover = (open: boolean) => {
        const reduced = prefersReducedMotion();
        const camTargets = computeCameraTargets(open);
        coverTween?.kill();
        camTween?.kill();

        if (reduced) {
          rigState.coverOpen = open ? 1 : 0;
          rigState.idleSwayStrength = 0;
          rigState.camY = camTargets.y;
          rigState.camZ = camTargets.z;
          rigState.lookY = camTargets.lookY;
          rigState.lookZ = camTargets.lookZ;
          syncBookPose();
          requestRender();
          return;
        }

        coverTween = gsap.to(rigState, {
          coverOpen: open ? 1 : 0,
          idleSwayStrength: open ? 0 : 1,
          duration: open
            ? BOOK_FLIP_CONFIG.cover.openDurationSec
            : BOOK_FLIP_CONFIG.cover.closeDurationSec,
          ease: open
            ? BOOK_FLIP_CONFIG.cover.openEase
            : BOOK_FLIP_CONFIG.cover.closeEase,
          onUpdate: () => {
            syncBookPose();
            requestRender();
          },
          onComplete: () => {
            rigState.coverOpen = open ? 1 : 0;
            syncBookPose();
            requestRender();
          },
        });

        camTween = gsap.to(rigState, {
          camY: camTargets.y,
          camZ: camTargets.z,
          lookY: camTargets.lookY,
          lookZ: camTargets.lookZ,
          duration: BOOK_FLIP_CONFIG.camera.reframeDurationSec,
          ease: BOOK_FLIP_CONFIG.camera.reframeEase,
          onUpdate: () => {
            syncBookPose();
            requestRender();
          },
        });
      };
      animateCoverRef.current = animateCover;

      const allocateLeafSlot = (dir: 1 | -1) => {
        let slot = leafPool.find((s) => !s.active);
        if (!slot) {
          slot = [...leafPool].sort((a, b) =>
            dir === 1
              ? b.uniforms.uProgress.value - a.uniforms.uProgress.value
              : a.uniforms.uProgress.value - b.uniforms.uProgress.value
          )[0]!;
          releaseSlot(slot);
        }
        return slot;
      };

      const configureLeafForTurn = (
        slot: FlipLeafSlot,
        fromIdx: number,
        toIdx: number,
        dir: 1 | -1,
        layerOffsetIdx: number
      ) => {
        const fromTex = getSpreadTextures(fromIdx);
        const toTex = getSpreadTextures(toIdx);
        if (!fromTex || !toTex) return false;

        const { leftTopY: startLeftY, rightTopY: startRightY } =
          getStackHeights(fromIdx, 1);
        const { leftTopY: endLeftY, rightTopY: endRightY } = getStackHeights(
          toIdx,
          1
        );

        slot.active = true;
        slot.dir = dir;
        slot.fromSpread = fromIdx;
        slot.toSpread = toIdx;

        // Offset tumpukan dihitung di shader (uStackStartY -> uStackEndY) agar selalu mendarat DI ATAS tumpukan tujuan
        const layerBump = (layerOffsetIdx + 1) * STACK_LAYER_STEP;
        slot.uniforms.uStackStartY.value = startRightY + layerBump;
        slot.uniforms.uStackEndY.value = endLeftY + layerBump;
        slot.uniforms.uLeafLift.value = (layerOffsetIdx % 4) * 0.02;

        if (dir === 1) {
          rightPageMat.map = toTex.right;
          rightPageMat.needsUpdate = true;
          slot.frontMat.map = fromTex.right;
          slot.frontMat.needsUpdate = true;
          slot.backMat.map = toTex.left;
          slot.backMat.needsUpdate = true;
          slot.uniforms.uProgress.value = 0;
        } else {
          leftPageMat.map = toTex.left;
          leftPageMat.needsUpdate = true;
          slot.frontMat.map = toTex.right;
          slot.frontMat.needsUpdate = true;
          slot.backMat.map = fromTex.left;
          slot.backMat.needsUpdate = true;
          slot.uniforms.uProgress.value = 1;
          // Untuk arah balik (kiri ke kanan), ujung kanan = endRightY
          slot.uniforms.uStackStartY.value = endRightY + layerBump;
          slot.uniforms.uStackEndY.value = startLeftY + layerBump;
        }

        slot.uniforms.uBend.value = BOOK_FLIP_CONFIG.shader.baseBend;
        slot.group.visible = true;
        return true;
      };

      const finishLeafSettle = (slot: FlipLeafSlot, committed: boolean) => {
        const settledSpread = committed ? slot.toSpread : slot.fromSpread;
        const settledTex = getSpreadTextures(settledSpread);
        releaseSlot(slot);

        const anyStillActive = leafPool.some((s) => s.active);
        if (settledTex) {
          if (committed) {
            if (slot.dir === 1) {
              leftPageMat.map = settledTex.left;
              leftPageMat.needsUpdate = true;
            } else {
              rightPageMat.map = settledTex.right;
              rightPageMat.needsUpdate = true;
            }
          } else {
            // Dibatalkan (snap back): pulihkan halaman statis asal
            leftPageMat.map = settledTex.left;
            leftPageMat.needsUpdate = true;
            rightPageMat.map = settledTex.right;
            rightPageMat.needsUpdate = true;
          }
        }

        if (!anyStillActive) {
          const finalTex = getSpreadTextures(activeSpreadRef.current);
          if (finalTex) {
            leftPageMat.map = finalTex.left;
            leftPageMat.needsUpdate = true;
            rightPageMat.map = finalTex.right;
            rightPageMat.needsUpdate = true;
          }
        }
        syncBookPose();
        requestRender();
      };

      const triggerFlip = (fromIdx: number, toIdx: number) => {
        const list = spreadsRef.current;
        if (!list.length) return;
        const safeFrom = Math.max(0, Math.min(list.length - 1, fromIdx));
        const safeTo = Math.max(0, Math.min(list.length - 1, toIdx));
        if (safeFrom === safeTo) return;

        // Reduced motion: snap instan tanpa animasi lipatan panjang
        if (prefersReducedMotion() || !isOpenRef.current) {
          applyRestingSpread(safeTo);
          return;
        }

        const dir: 1 | -1 = safeTo > safeFrom ? 1 : -1;
        const diff = Math.abs(safeTo - safeFrom);
        const stepCount = Math.min(
          BOOK_FLIP_CONFIG.flip.maxCascadeLeaves,
          diff
        );
        const stepPairs: Array<[number, number]> = [];

        for (let i = 0; i < stepCount; i++) {
          const a =
            i === 0
              ? safeFrom
              : Math.round(safeFrom + ((safeTo - safeFrom) * i) / stepCount);
          const b =
            i === stepCount - 1
              ? safeTo
              : Math.round(
                  safeFrom + ((safeTo - safeFrom) * (i + 1)) / stepCount
                );
          if (a !== b) stepPairs.push([a, b]);
        }
        if (stepPairs.length === 0) stepPairs.push([safeFrom, safeTo]);

        spreadStackTween?.kill();
        spreadStackTween = gsap.to(rigState, {
          readSpread: safeTo,
          duration: BOOK_FLIP_CONFIG.flip.durationSec,
          ease: "power2.out",
          onUpdate: () => {
            syncBookPose();
            requestRender();
          },
        });

        stepPairs.forEach(([fIdx, tIdx], stepIdx) => {
          const slot = allocateLeafSlot(dir);
          const ok = configureLeafForTurn(slot, fIdx, tIdx, dir, stepIdx);
          if (!ok) return;

          const targetProgress = dir === 1 ? 1 : 0;
          const duration =
            stepPairs.length > 1
              ? BOOK_FLIP_CONFIG.flip.cascadeDurationSec
              : BOOK_FLIP_CONFIG.flip.durationSec;

          slot.tween = gsap.to(slot.uniforms.uProgress, {
            value: targetProgress,
            duration,
            delay: stepIdx * BOOK_FLIP_CONFIG.flip.cascadeStaggerSec,
            ease: BOOK_FLIP_CONFIG.flip.ease,
            onStart: () => {
              slot.group.visible = true;
              requestRender();
            },
            onUpdate: () => {
              const p = slot.uniforms.uProgress.value;
              slot.uniforms.uBend.value =
                0.55 + Math.sin(p * Math.PI) * 0.65;
              requestRender();
            },
            onComplete: () => {
              finishLeafSettle(slot, true);
            },
          });
        });

        pruneTextureCache(safeTo);
        getSpreadTextures(safeTo - 1);
        getSpreadTextures(safeTo + 1);
      };
      triggerFlipRef.current = triggerFlip;

      applyRestingSpread(activeSpreadRef.current);

      // ================================================================
      // 6. REAL-TIME DRAG-TO-FLIP + MOMENTUM SNAP + BACKDROP HIT-TEST
      // ================================================================
      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();
      const _localHitPt = new THREE.Vector3();

      let pointerIdActive: number | null = null;
      let dragStartX = 0;
      let lastMoveX = 0;
      let lastMoveTime = 0;
      let velocityPxPerMs = 0;
      let activeDragSlot: FlipLeafSlot | null = null;
      let dragDirection: 1 | -1 | 0 = 0;
      let hasDraggedPastThreshold = false;

      const startDragLeaf = (dir: 1 | -1) => {
        const curIdx = activeSpreadRef.current;
        const maxIdx = spreadsRef.current.length - 1;
        const targetIdx = dir === 1 ? curIdx + 1 : curIdx - 1;
        if (targetIdx < 0 || targetIdx > maxIdx) return null;

        const slot = allocateLeafSlot(dir);
        const ok = configureLeafForTurn(slot, curIdx, targetIdx, dir, 0);
        if (!ok) return null;
        slot.isDragSlot = true;
        return slot;
      };

      const onPointerDown = (ev: PointerEvent) => {
        if (pointerIdActive !== null) return;
        pointerIdActive = ev.pointerId;
        dragStartX = ev.clientX;
        lastMoveX = ev.clientX;
        lastMoveTime = performance.now();
        velocityPxPerMs = 0;
        hasDraggedPastThreshold = false;
        activeDragSlot = null;
        dragDirection = 0;
        try {
          renderer.domElement.setPointerCapture(ev.pointerId);
        } catch {
          // Ignore capture errors on synthetic events
        }
      };

      const onPointerMove = (ev: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        // Parallax super halus hanya saat pointer desktop bergerak (di-tween on-demand)
        if (ev.pointerType === "mouse" && !prefersReducedMotion()) {
          const nx = THREE.MathUtils.clamp(
            ((ev.clientX - rect.left) / rect.width) * 2 - 1,
            -1,
            1
          );
          const ny = THREE.MathUtils.clamp(
            ((ev.clientY - rect.top) / rect.height) * 2 - 1,
            -1,
            1
          );
          parallaxTween?.kill();
          parallaxTween = gsap.to(rigState, {
            parallaxX: nx * BOOK_FLIP_CONFIG.camera.pointerParallaxX,
            parallaxY: ny * BOOK_FLIP_CONFIG.camera.pointerParallaxY,
            duration: 0.45,
            ease: "power2.out",
            onUpdate: () => {
              syncBookPose();
              requestRender();
            },
          });
        }

        if (pointerIdActive !== ev.pointerId || !isOpenRef.current) return;

        const now = performance.now();
        const dtMs = Math.max(4, now - lastMoveTime);
        velocityPxPerMs = (ev.clientX - lastMoveX) / dtMs;
        lastMoveX = ev.clientX;
        lastMoveTime = now;

        const totalDx = ev.clientX - dragStartX;
        if (
          !hasDraggedPastThreshold &&
          Math.abs(totalDx) >= BOOK_FLIP_CONFIG.flip.minDragActivationPx
        ) {
          hasDraggedPastThreshold = true;
          dragDirection = totalDx < 0 ? 1 : -1;
          activeDragSlot = startDragLeaf(dragDirection);
        }

        if (activeDragSlot && dragDirection !== 0) {
          const spanPx = Math.max(
            180,
            rect.width * BOOK_FLIP_CONFIG.flip.dragHorizontalSensitivity
          );
          const rawDelta = Math.abs(totalDx) / spanPx;
          // Jika user menyeret ke arah berlawanan dari arah awal, jaga progress di batas awal
          const aligned =
            (dragDirection === 1 && totalDx <= 0) ||
            (dragDirection === -1 && totalDx >= 0);
          const progress =
            dragDirection === 1
              ? aligned
                ? THREE.MathUtils.clamp(rawDelta, 0.005, 0.995)
                : 0.005
              : aligned
                ? THREE.MathUtils.clamp(1 - rawDelta, 0.005, 0.995)
                : 0.995;

          activeDragSlot.uniforms.uProgress.value = progress;
          const velBoost = Math.min(
            BOOK_FLIP_CONFIG.shader.dragBendBoost,
            Math.abs(velocityPxPerMs) * 0.35
          );
          activeDragSlot.uniforms.uBend.value =
            BOOK_FLIP_CONFIG.shader.baseBend + velBoost;
          requestRender();
        }
      };

      const finishPointerInteraction = (ev: PointerEvent, cancelled: boolean) => {
        if (pointerIdActive !== ev.pointerId) return;
        pointerIdActive = null;
        try {
          renderer.domElement.releasePointerCapture(ev.pointerId);
        } catch {
          // Ignore
        }

        if (!isOpenRef.current) {
          if (!cancelled) onOpenRef.current();
          return;
        }

        if (activeDragSlot && dragDirection !== 0) {
          const slot = activeDragSlot;
          const dir = dragDirection;
          activeDragSlot = null;
          dragDirection = 0;

          const curP = slot.uniforms.uProgress.value;
          const turnAmount = dir === 1 ? curP : 1 - curP;
          const velAligned = dir === 1 ? -velocityPxPerMs : velocityPxPerMs;
          const shouldCommit =
            !cancelled &&
            (turnAmount >= BOOK_FLIP_CONFIG.flip.dragCommitProgress ||
              velAligned >= BOOK_FLIP_CONFIG.flip.dragVelocityThresholdPxPerMs);

          const snapTarget = shouldCommit
            ? dir === 1
              ? 1
              : 0
            : dir === 1
              ? 0
              : 1;
          const remaining = Math.abs(snapTarget - curP);
          const snapDur = prefersReducedMotion()
            ? 0.01
            : THREE.MathUtils.clamp(remaining * 0.56, 0.16, 0.52);

          if (shouldCommit) {
            suppressNextEffectFlipRef.current = true;
            prevSpreadIndexRef.current = slot.toSpread;
            onChangeSpreadRef.current(slot.toSpread);

            spreadStackTween?.kill();
            spreadStackTween = gsap.to(rigState, {
              readSpread: slot.toSpread,
              duration: snapDur,
              ease: BOOK_FLIP_CONFIG.flip.snapEase,
              onUpdate: () => {
                syncBookPose();
                requestRender();
              },
            });
          }

          slot.tween = gsap.to(slot.uniforms.uProgress, {
            value: snapTarget,
            duration: snapDur,
            ease: BOOK_FLIP_CONFIG.flip.snapEase,
            onUpdate: () => {
              const p = slot.uniforms.uProgress.value;
              slot.uniforms.uBend.value =
                0.5 + Math.sin(p * Math.PI) * 0.55;
              requestRender();
            },
            onComplete: () => {
              finishLeafSettle(slot, shouldCommit);
            },
          });
          return;
        }

        // Klik cepat (tanpa drag): gunakan backdrop tak terlihat / separuh layar
        if (!cancelled && !hasDraggedPastThreshold) {
          const rect = renderer.domElement.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;

          pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
          pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointerNdc, camera);
          const hits = raycaster.intersectObject(hitProxyMesh, false);

          let sideIsRight = pointerNdc.x >= 0;
          if (hits.length > 0) {
            _localHitPt.copy(hits[0]!.point);
            bookRoot.worldToLocal(_localHitPt);
            sideIsRight = _localHitPt.x >= 0;
          }

          if (
            sideIsRight &&
            activeSpreadRef.current < spreadsRef.current.length - 1
          ) {
            onChangeSpreadRef.current(activeSpreadRef.current + 1);
          } else if (!sideIsRight && activeSpreadRef.current > 0) {
            onChangeSpreadRef.current(activeSpreadRef.current - 1);
          }
        }
      };

      const onPointerUp = (ev: PointerEvent) => finishPointerInteraction(ev, false);
      const onPointerCancel = (ev: PointerEvent) =>
        finishPointerInteraction(ev, true);

      const onPointerLeave = () => {
        if (pointerIdActive !== null) return;
        parallaxTween?.kill();
        parallaxTween = gsap.to(rigState, {
          parallaxX: 0,
          parallaxY: 0,
          duration: 0.5,
          ease: "power2.out",
          onUpdate: () => {
            syncBookPose();
            requestRender();
          },
        });
      };

      renderer.domElement.style.touchAction = "pan-y";
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointercancel", onPointerCancel);
      renderer.domElement.addEventListener("pointerleave", onPointerLeave);

      // Ayunan idle super lembut HANYA ketika buku tertutup & tab terlihat (berhenti total saat buku dibuka!)
      let idleRafId = 0;
      let lastIdleTime = performance.now();
      const tickClosedIdleSway = (now: number) => {
        if (
          prefersReducedMotion() ||
          rigState.idleSwayStrength <= 0.01 ||
          document.hidden
        ) {
          idleRafId = 0;
          return;
        }
        const dt = Math.min(0.05, (now - lastIdleTime) / 1000);
        lastIdleTime = now;
        idleSwayPhase += dt * BOOK_FLIP_CONFIG.camera.idleSwaySpeed;
        syncBookPose();
        requestRender();
        idleRafId = window.requestAnimationFrame(tickClosedIdleSway);
      };

      const startClosedIdleSway = () => {
        if (
          !idleRafId &&
          !prefersReducedMotion() &&
          rigState.idleSwayStrength > 0.01 &&
          !document.hidden
        ) {
          lastIdleTime = performance.now();
          idleRafId = window.requestAnimationFrame(tickClosedIdleSway);
        }
      };
      startClosedIdleSway();

      const onVisChange = () => {
        if (!document.hidden && !isOpenRef.current) {
          startClosedIdleSway();
        }
      };
      document.addEventListener("visibilitychange", onVisChange);

      // Pastikan idle sway menyala lagi jika sampul ditutup kembali
      const origAnimateCover = animateCoverRef.current;
      animateCoverRef.current = (open: boolean) => {
        origAnimateCover?.(open);
        if (!open) {
          window.setTimeout(startClosedIdleSway, 120);
        }
      };

      return {
        onTick: () => {
          syncBookPose();
        },
        onResize: (w: number, h: number) => {
          viewportAspect = w / Math.max(1, h);
          const camTargets = computeCameraTargets(isOpenRef.current);
          rigState.camY = camTargets.y;
          rigState.camZ = camTargets.z;
          rigState.lookY = camTargets.lookY;
          rigState.lookZ = camTargets.lookZ;
          syncBookPose();
          requestRender();
        },
        onDispose: () => {
          if (idleRafId) window.cancelAnimationFrame(idleRafId);
          document.removeEventListener("visibilitychange", onVisChange);
          coverTween?.kill();
          camTween?.kill();
          spreadStackTween?.kill();
          parallaxTween?.kill();
          for (const slot of leafPool) {
            slot.tween?.kill();
            slot.frontMat.dispose();
            slot.backMat.dispose();
          }
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
          renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
          leftPageGeo.dispose();
          rightPageGeo.dispose();
          sharedFlipFrontGeo.dispose();
          sharedFlipBackGeo.dispose();
          closedFrontCoverGeo.dispose();
          innerCoverGeo.dispose();
          hitProxyGeo.dispose();
          wood.map.dispose();
          wood.bumpMap.dispose();
          darkWood.map.dispose();
          darkWood.bumpMap.dispose();
          pageEdgeTex.dispose();
          coverTex.map.dispose();
          if (closedFrontCoverMat.map) closedFrontCoverMat.map.dispose();
          for (const pair of textureCache.values()) {
            pair.left.dispose();
            pair.right.dispose();
          }
          textureCache.clear();
          syncCoverTextureRef.current = null;
          triggerFlipRef.current = null;
          animateCoverRef.current = null;
          applyRestingSpreadRef.current = null;
        },
      };
    },
    []
  );

  return (
    <SceneShell
      onSetup={handleSetup}
      onWebglUnavailable={onWebglUnavailable}
      cameraPosition={[
        BOOK_FLIP_CONFIG.camera.closedPos.x,
        BOOK_FLIP_CONFIG.camera.closedPos.y,
        BOOK_FLIP_CONFIG.camera.closedPos.z,
      ]}
      cameraFov={BOOK_FLIP_CONFIG.camera.fov}
      continuous={false}
      clearColor="#161614"
      ariaLabel="Buku Kenangan 3D interaktif XII PPLG 1 dengan efek lipatan halaman book-flip"
      className="relative h-[500px] sm:h-[580px] lg:h-[650px] w-full cursor-grab active:cursor-grabbing select-none"
    >
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/50 bg-background/85 px-3.5 py-1.5 font-mono text-[10px] sm:text-xs text-foreground shadow-sm">
        {!isBookOpen
          ? "Ketuk sampul atau tekan Spasi / Panah Kanan untuk membuka"
          : "Seret halaman, klik kiri/kanan, atau pakai tombol ← → / PgUp / PgDn"}
      </div>
    </SceneShell>
  );
}
