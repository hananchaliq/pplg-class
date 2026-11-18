"use client";

import * as React from "react";
import * as THREE from "three";
import { StudentRecord, DREAM_PAPER_PALETTE } from "@/lib/class-data";
import { computeDreamBoardLayout, DreamNoteBoardPose } from "@/lib/class-logic";
import {
  Sparkles,
  Pin,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
  X,
  Compass,
  Heart,
  Shuffle,
  Edit3,
  RotateCcw,
  Save,
  Layers,
  MessageSquareHeart,
} from "lucide-react";

export type ExtendedStudentRecord = StudentRecord & {
  nis?: string;
  dream_paper_color?: string;
  capsule_message?: string;
};

interface DreamBoardSectionProps {
  students: ExtendedStudentRecord[];
  isAdmin?: boolean;
  onOpenCheerModal?: (student: ExtendedStudentRecord) => void;
  onOpenSubmitDreamModal?: () => void;
  onUpdateStudentDream?: (
    studentId: string,
    payload: {
      dream_title: string;
      dream_reason: string;
      dream_description: string;
      dream_paper_color: string;
      capsule_message?: string | undefined;
    }
  ) => Promise<void>;
  onResetStudentDream?: (studentId: string) => Promise<void>;
}

const DEFAULT_PAPER_HEX = DREAM_PAPER_PALETTE[0]?.hex ?? "#FFF7D6";

// Pre-allocated math helpers outside the render loop (Zero GC in tick)
const _worldPos = new THREE.Vector3();

function createStudioEnvironmentScene(): {
  scene: THREE.Scene;
  dispose: () => void;
} {
  const envScene = new THREE.Scene();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mats: THREE.MeshBasicMaterial[] = [];

  const addPanel = (
    color: number,
    px: number,
    py: number,
    pz: number,
    sx: number,
    sy: number,
    sz: number
  ) => {
    const mat = new THREE.MeshBasicMaterial({ color });
    mats.push(mat);
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.position.set(px, py, pz);
    mesh.scale.set(sx, sy, sz);
    envScene.add(mesh);
  };

  addPanel(0xfff4dc, 6, 7, 7, 0.2, 6, 6);
  addPanel(0xffe4b5, -7, 4, 6, 0.2, 5, 5);
  addPanel(0xfffaf0, 0, 9, 0, 8, 0.2, 8);
  addPanel(0xf5deb3, 0, -6, 4, 6, 0.2, 4);

  return {
    scene: envScene,
    dispose: () => {
      boxGeo.dispose();
      mats.forEach((m) => m.dispose());
    },
  };
}

function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  smoothness = 4
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const eps = 0.00001;
  const r = Math.max(eps, radius - eps);
  shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
  shape.absarc(eps, height - r * 2, eps, Math.PI, Math.PI / 2, true);
  shape.absarc(width - r * 2, height - r * 2, eps, Math.PI / 2, 0, true);
  shape.absarc(width - r * 2, eps, eps, 0, -Math.PI / 2, true);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - radius * 2),
    bevelEnabled: true,
    bevelSegments: smoothness,
    steps: 1,
    bevelSize: r,
    bevelThickness: radius,
    curveSegments: smoothness,
  });
  geo.center();
  return geo;
}

function createBoardSurfaceTexture(
  mode: "whiteboard" | "chalkboard",
  maxAnisotropy = 1
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    if (mode === "whiteboard") {
      // Papan Gabus & Kertas Tua Hangat (Warm Nostalgic Cork & Parchment Board)
      const grad = ctx.createLinearGradient(0, 0, 1024, 576);
      grad.addColorStop(0, "#ebd7b7");
      grad.addColorStop(0.5, "#dfc49b");
      grad.addColorStop(1, "#d2b285");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 576);

      ctx.strokeStyle = "rgba(92, 58, 28, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 48; x < 1024; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 576);
        ctx.stroke();
      }
      for (let y = 48; y < 576; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }

      // Ornamen garis tenun ikat tipis di tepi atas papan
      ctx.fillStyle = "rgba(168, 66, 50, 0.32)";
      ctx.fillRect(40, 10, 944, 4);

      ctx.fillStyle = "rgba(74, 44, 18, 0.68)";
      ctx.font = '700 20px Georgia, serif';
      ctx.textAlign = "center";
      ctx.fillText(
        "✦ XII PPLG 1 — MAKN ENDE · PAPAN IMPIAN & HARAPAN MASA DEPAN ✦",
        512,
        34
      );
      ctx.textAlign = "start";

      for (let i = 0; i < 2800; i++) {
        const nx = (i * 193) % 1024;
        const ny = (i * 109) % 576;
        ctx.fillStyle =
          i % 2 === 0
            ? "rgba(255, 245, 225, 0.25)"
            : "rgba(92, 54, 24, 0.09)";
        ctx.fillRect(nx, ny, 2.5, 2.5);
      }
    } else {
      // Papan Kapur Hijau Madrasah Hangat
      const grad = ctx.createLinearGradient(0, 0, 1024, 576);
      grad.addColorStop(0, "#243b2e");
      grad.addColorStop(0.5, "#1d3126");
      grad.addColorStop(1, "#16261d");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 576);

      ctx.strokeStyle = "rgba(255, 244, 214, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 48; x < 1024; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 576);
        ctx.stroke();
      }
      for (let y = 48; y < 576; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255, 240, 200, 0.55)";
      ctx.font = '700 20px Georgia, serif';
      ctx.textAlign = "center";
      ctx.fillText(
        "✦ XII PPLG 1 — MAKN ENDE · PAPAN KAPUR CITA-CITA & HARAPAN ✦",
        512,
        34
      );
      ctx.textAlign = "start";

      for (let i = 0; i < 2200; i++) {
        const nx = (i * 193) % 1024;
        const ny = (i * 109) % 576;
        ctx.fillStyle =
          i % 2 === 0 ? "rgba(255,245,220,0.07)" : "rgba(0,0,0,0.09)";
        ctx.fillRect(nx, ny, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createDreamNoteTextTexture(
  rollNo: number,
  name: string,
  dreamTitle: string,
  role: string,
  pinHex: string,
  maxAnisotropy = 1
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const serifFont = `"Fraunces", Georgia, "Times New Roman", serif`;
    const sansFont = `"Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
    const monoFont = `"Space Mono", ui-monospace, monospace`;

    ctx.clearRect(0, 0, 512, 384);

    // Garis buku tulis tipis di kertas catatan
    ctx.strokeStyle = "rgba(43, 28, 16, 0.11)";
    ctx.lineWidth = 1.8;
    for (let y = 122; y < 342; y += 46) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(482, y);
      ctx.stroke();
    }

    // Nomor & Nama Siswa dengan Space Mono + Fraunces Serif
    const padded = String(rollNo).padStart(2, "0");
    ctx.fillStyle = "#5c3d24";
    ctx.font = `700 24px ${serifFont}`;
    ctx.fillText(`#${padded} · ${name}`, 34, 70);

    // Garis bawah warna pin
    ctx.strokeStyle = pinHex;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(34, 86);
    ctx.quadraticCurveTo(110, 82, 185, 88);
    ctx.stroke();

    // Isi Cita-Cita dengan Plus Jakarta Sans Tebal yang Sangat Mudah Dibaca
    const inkColors = ["#182542", "#231309", "#3b1712", "#142e24"];
    ctx.fillStyle = inkColors[rollNo % inkColors.length]!;
    ctx.font = `700 30px ${sansFont}`;
    const words = (dreamTitle || "").split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      if (ctx.measureText(testLine).width > 442 && currentLine) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    lines.slice(0, 3).forEach((line, idx) => {
      ctx.save();
      ctx.translate(34, 150 + idx * 46);
      ctx.rotate(((rollNo + idx) % 3 - 1) * 0.005);
      ctx.fillText(line, 0, 0);
      ctx.restore();
    });

    // Stamp metadata arsip di bagian bawah kertas (Space Mono)
    ctx.fillStyle = "rgba(92, 54, 32, 0.85)";
    ctx.font = `700 18px ${monoFont}`;
    ctx.fillText(`${(role || "UNO · XII PPLG 1").toUpperCase()}`, 34, 346);

    // Lipatan sudut kanan bawah kertas
    ctx.fillStyle = "rgba(43, 28, 16, 0.1)";
    ctx.beginPath();
    ctx.moveTo(452, 384);
    ctx.lineTo(512, 324);
    ctx.lineTo(512, 384);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Applies realistic 3D paper curl/bend + dynamic wind wave to a 16x16 segmented PlaneGeometry.
 */
function deformPaperGeometry(
  geo: THREE.PlaneGeometry,
  basePositions: Float32Array,
  curlAmount: number,
  waveAmount: number,
  timeSec: number,
  seedPhase: number
) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  const count = pos.count;

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const x = basePositions[ix] ?? 0;
    const y = basePositions[ix + 1] ?? 0;

    const nx = x / 0.86;
    const ny = y / 0.62;

    const distFromTop = Math.max(0, (1 - ny) * 0.5);
    const cornerFactor =
      Math.pow(distFromTop, 1.85) * (0.65 + 0.35 * Math.abs(nx));
    const asymmetry = Math.abs(nx) * 0.018 * distFromTop;

    const windWave =
      (Math.sin(timeSec * 4.2 + seedPhase + nx * 1.9 - ny * 1.5) + 1) *
      0.5 *
      waveAmount *
      distFromTop;

    arr[ix] = x;
    arr[ix + 1] = y;
    // Pastikan Z selalu >= 0 agar kertas hanya melengkung ke depan (+Z) dan TIDAK PERNAH terpotong papan di belakangnya
    arr[ix + 2] = Math.max(0, cornerFactor * curlAmount + asymmetry + windWave);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function DreamBoardSection({
  students,
  isAdmin = false,
  onOpenCheerModal,
  onOpenSubmitDreamModal,
  onUpdateStudentDream,
  onResetStudentDream,
}: DreamBoardSectionProps) {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const poses = React.useMemo(
    () => computeDreamBoardLayout(students),
    [students]
  );

  const orderedStudents = React.useMemo(
    () =>
      poses
        .map(
          (pose, idx) =>
            students.find((s) => s.id === pose.studentId) ?? students[idx]
        )
        .filter((s): s is ExtendedStudentRecord => Boolean(s)),
    [poses, students]
  );

  const [boardFinish, setBoardFinish] = React.useState<
    "whiteboard" | "chalkboard"
  >("whiteboard");
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [zoomedIndex, setZoomedIndex] = React.useState<number | null>(null);
  const [hoverScreenPos, setHoverScreenPos] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [zoomColorOverride, setZoomColorOverride] = React.useState<
    Record<string, string>
  >({});
  const [isEditingModal, setIsEditingModal] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState("");
  const [editReason, setEditReason] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editCapsule, setEditCapsule] = React.useState("");
  const [editColor, setEditColor] = React.useState<string>(DEFAULT_PAPER_HEX);
  const [statusNotice, setStatusNotice] = React.useState<string | null>(null);

  // Refs synced for the Three.js loop
  const hoveredIndexRef = React.useRef<number | null>(null);
  const zoomedIndexRef = React.useRef<number | null>(null);
  const boardFinishRef = React.useRef<"whiteboard" | "chalkboard">(boardFinish);
  const pointerTiltRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const updatePaperColorRef = React.useRef<
    (studentId: string, hex: string) => void
  >(() => {});
  const updateBoardFinishRef = React.useRef<
    (mode: "whiteboard" | "chalkboard") => void
  >(() => {});
  const syncNotesContentRef = React.useRef<
    (
      nextStudents: ExtendedStudentRecord[],
      nextPoses: DreamNoteBoardPose[],
      overrides: Record<string, string>
    ) => void
  >(() => {});

  React.useEffect(() => {
    hoveredIndexRef.current = hoveredIndex;
  }, [hoveredIndex]);

  React.useEffect(() => {
    zoomedIndexRef.current = zoomedIndex;
  }, [zoomedIndex]);

  React.useEffect(() => {
    boardFinishRef.current = boardFinish;
  }, [boardFinish]);

  React.useEffect(() => {
    syncNotesContentRef.current(orderedStudents, poses, zoomColorOverride);
  }, [orderedStudents, poses, zoomColorOverride]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const win = window as unknown as Record<string, unknown>;
    win.__dream_board_state = () => ({
      activeState:
        zoomedIndexRef.current !== null
          ? "zoom"
          : hoveredIndexRef.current !== null
            ? "hover"
            : "idle",
      hoveredIndex: hoveredIndexRef.current,
      zoomedIndex: zoomedIndexRef.current,
      noteCount: poses.length,
      boardFinish,
      isStaticBoardLocked: true,
    });
    return () => {
      delete win.__dream_board_state;
    };
  }, [poses.length, boardFinish]);

  React.useEffect(() => {
    if (zoomedIndex === null || orderedStudents.length === 0) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (e.key === "Escape") {
        setIsEditingModal(false);
        setZoomedIndex(null);
      } else if (!isTyping && e.key === "ArrowRight") {
        setIsEditingModal(false);
        setZoomedIndex((prev) =>
          prev === null ? 0 : (prev + 1) % orderedStudents.length
        );
      } else if (!isTyping && e.key === "ArrowLeft") {
        setIsEditingModal(false);
        setZoomedIndex((prev) =>
          prev === null
            ? 0
            : (prev - 1 + orderedStudents.length) % orderedStudents.length
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomedIndex, orderedStudents.length]);

  const noteCount = orderedStudents.length;
  React.useEffect(() => {
    const container = mountRef.current;
    if (!container || noteCount === 0) return undefined;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement("canvas").getContext("webgl2");
        if (!probe) return true;
        const ext = probe.getExtension("WEBGL_debug_renderer_info");
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension("WEBGL_lose_context")?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const segs = 16;
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 580;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, -0.12, 12.65);
    camera.lookAt(0, -0.12, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      });
    } catch {
      return undefined;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    renderer.domElement.style.position = "relative";
    renderer.domElement.style.zIndex = "2";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const disposableGeometries: THREE.BufferGeometry[] = [];
    const disposableMaterials: THREE.Material[] = [];
    const disposableTextures: THREE.Texture[] = [];

    // Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const studioEnv = createStudioEnvironmentScene();
    const envTarget = pmremGenerator.fromScene(studioEnv.scene, 0.04);
    scene.environment = envTarget.texture;
    disposableTextures.push(envTarget.texture);
    studioEnv.dispose();
    pmremGenerator.dispose();

    // Warm Sunset Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfff4dc, 0xd8b88c, 1.25);
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff0d0, 1.65);
    keyLight.position.set(5.5, 7.5, 9.0);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffdca8, 0.85);
    fillLight.position.set(-7.0, 2.5, 6.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf2b872, 0.75);
    rimLight.position.set(0, -6.0, 5.0);
    scene.add(rimLight);

    // Root Classroom Board Group (100% STATIC)
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const outerFrameGeo = createRoundedBoxGeometry(
      13.6,
      7.6,
      0.34,
      0.22,
      isSoftwareGl ? 2 : 4
    );
    disposableGeometries.push(outerFrameGeo);
    const outerFrameMat = new THREE.MeshStandardMaterial({
      color: 0x7a4b2a,
      roughness: 0.52,
      metalness: 0.08,
    });
    disposableMaterials.push(outerFrameMat);
    const outerFrameMesh = new THREE.Mesh(outerFrameGeo, outerFrameMat);
    outerFrameMesh.position.set(0, 0, -0.2);
    outerFrameMesh.receiveShadow = true;
    boardGroup.add(outerFrameMesh);

    const innerTrimGeo = createRoundedBoxGeometry(13.15, 7.15, 0.36, 0.16, 2);
    disposableGeometries.push(innerTrimGeo);
    const innerTrimMat = new THREE.MeshStandardMaterial({
      color: 0x5c361c,
      roughness: 0.55,
      metalness: 0.12,
    });
    disposableMaterials.push(innerTrimMat);
    const innerTrimMesh = new THREE.Mesh(innerTrimGeo, innerTrimMat);
    innerTrimMesh.position.set(0, 0, -0.18);
    boardGroup.add(innerTrimMesh);

    const whiteboardTex = createBoardSurfaceTexture(
      "whiteboard",
      maxAnisotropy
    );
    const chalkboardTex = createBoardSurfaceTexture(
      "chalkboard",
      maxAnisotropy
    );
    disposableTextures.push(whiteboardTex, chalkboardTex);

    const surfaceGeo = new THREE.PlaneGeometry(12.85, 6.85);
    disposableGeometries.push(surfaceGeo);
    const surfaceMat = new THREE.MeshStandardMaterial({
      map: whiteboardTex,
      roughness: 0.68,
      metalness: 0.02,
    });
    disposableMaterials.push(surfaceMat);
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    // Letakkan permukaan papan di z = 0.0 agar kertas di z = 0.24+ tidak pernah terpotong
    surfaceMesh.position.set(0, 0, 0.0);
    surfaceMesh.receiveShadow = true;
    boardGroup.add(surfaceMesh);

    // Untaian Lampu Hias Hangat (Warm Fairy Lights) di sepanjang bingkai atas papan
    const bulbGeo = new THREE.SphereGeometry(0.085, 10, 10);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe494 });
    disposableGeometries.push(bulbGeo);
    disposableMaterials.push(bulbMat);
    for (let bx = -5.8; bx <= 5.8; bx += 1.16) {
      const sag = Math.cos((bx / 5.8) * Math.PI * 2) * 0.08;
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(bx, 3.46 - sag, 0.16);
      boardGroup.add(bulb);
    }

    updateBoardFinishRef.current = (mode: "whiteboard" | "chalkboard") => {
      surfaceMat.map = mode === "whiteboard" ? whiteboardTex : chalkboardTex;
      outerFrameMat.color.setHex(mode === "whiteboard" ? 0x7a4b2a : 0x5c3a21);
      innerTrimMat.color.setHex(mode === "whiteboard" ? 0x5c361c : 0x3d2514);
      surfaceMat.needsUpdate = true;
    };
    updateBoardFinishRef.current(boardFinishRef.current);

    // Bottom Marker Tray + Procedural Eraser + 2 Pastel Markers
    const trayGeo = createRoundedBoxGeometry(5.6, 0.22, 0.55, 0.06, 2);
    disposableGeometries.push(trayGeo);
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0xd8dcf2,
      roughness: 0.38,
      metalness: 0.3,
    });
    disposableMaterials.push(trayMat);
    const trayMesh = new THREE.Mesh(trayGeo, trayMat);
    trayMesh.position.set(0, -3.62, 0.22);
    boardGroup.add(trayMesh);

    const eraserTopGeo = createRoundedBoxGeometry(0.95, 0.24, 0.36, 0.05, 2);
    const eraserFeltGeo = createRoundedBoxGeometry(0.95, 0.09, 0.36, 0.02, 2);
    disposableGeometries.push(eraserTopGeo, eraserFeltGeo);
    const eraserTopMat = new THREE.MeshStandardMaterial({
      color: 0x6e78e8,
      roughness: 0.35,
    });
    const eraserFeltMat = new THREE.MeshStandardMaterial({
      color: 0x2c3044,
      roughness: 0.85,
    });
    disposableMaterials.push(eraserTopMat, eraserFeltMat);

    const eraserTop = new THREE.Mesh(eraserTopGeo, eraserTopMat);
    eraserTop.position.set(-1.65, -3.41, 0.28);
    boardGroup.add(eraserTop);

    const eraserFelt = new THREE.Mesh(eraserFeltGeo, eraserFeltMat);
    eraserFelt.position.set(-1.65, -3.51, 0.28);
    boardGroup.add(eraserFelt);

    const markerBodyGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.88, 14);
    markerBodyGeo.rotateZ(Math.PI / 2);
    const markerCapGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.26, 14);
    markerCapGeo.rotateZ(Math.PI / 2);
    disposableGeometries.push(markerBodyGeo, markerCapGeo);

    const whiteMarkerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
    });
    const irisCapMat = new THREE.MeshStandardMaterial({
      color: 0x6e78e8,
      roughness: 0.3,
    });
    const mintCapMat = new THREE.MeshStandardMaterial({
      color: 0x3fb8a5,
      roughness: 0.3,
    });
    disposableMaterials.push(whiteMarkerMat, irisCapMat, mintCapMat);

    const marker1Body = new THREE.Mesh(markerBodyGeo, whiteMarkerMat);
    marker1Body.position.set(0.35, -3.45, 0.28);
    const marker1Cap = new THREE.Mesh(markerCapGeo, irisCapMat);
    marker1Cap.position.set(-0.08, -3.45, 0.28);
    boardGroup.add(marker1Body, marker1Cap);

    const marker2Body = new THREE.Mesh(markerBodyGeo, whiteMarkerMat);
    marker2Body.position.set(1.65, -3.45, 0.32);
    marker2Body.rotation.y = 0.06;
    const marker2Cap = new THREE.Mesh(markerCapGeo, mintCapMat);
    marker2Cap.position.set(1.22, -3.45, 0.32);
    boardGroup.add(marker2Body, marker2Cap);

    interface Note3DInstance {
      index: number;
      student: ExtendedStudentRecord;
      pose: DreamNoteBoardPose;
      group: THREE.Group;
      paperMesh: THREE.Mesh;
      paperMat: THREE.MeshStandardMaterial;
      paperGeo: THREE.PlaneGeometry;
      basePositions: Float32Array;
      textMesh: THREE.Mesh;
      textMat: THREE.MeshBasicMaterial;
      textSignature: string;
      rimMesh: THREE.Mesh;
      rimMat: THREE.MeshBasicMaterial;
      pinGroup: THREE.Group;
      shadowMat: THREE.MeshBasicMaterial;
      currPos: THREE.Vector3;
      currRot: THREE.Euler;
      currScale: number;
      currCurl: number;
      currWave: number;
      currPinOffset: number;
      currRimOpacity: number;
    }

    const noteInstances: Note3DInstance[] = [];
    const pickablePaperMeshes: THREE.Mesh[] = [];

    const noteW = 1.72;
    const noteH = 1.24;

    const pinNeedleGeo = new THREE.CylinderGeometry(0.022, 0.008, 0.18, 12);
    pinNeedleGeo.rotateX(Math.PI / 2 - 0.18);
    const pinHeadGeo = new THREE.SphereGeometry(0.095, 16, 16);
    const pinCollarGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.05, 14);
    pinCollarGeo.rotateX(Math.PI / 2 - 0.18);
    disposableGeometries.push(pinNeedleGeo, pinHeadGeo, pinCollarGeo);

    const metalPinMat = new THREE.MeshStandardMaterial({
      color: 0xd0d5e8,
      metalness: 0.75,
      roughness: 0.25,
    });
    disposableMaterials.push(metalPinMat);

    const shadowPlaneGeo = new THREE.PlaneGeometry(noteW * 1.04, noteH * 1.04);
    disposableGeometries.push(shadowPlaneGeo);

    poses.forEach((pose, idx) => {
      const student = orderedStudents[idx];
      if (!student) return;

      const group = new THREE.Group();
      group.position.set(pose.x, pose.y, pose.z);
      group.rotation.set(0, 0, pose.rotZRad);
      boardGroup.add(group);

      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x161b33,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
      });
      disposableMaterials.push(shadowMat);
      const shadowMesh = new THREE.Mesh(shadowPlaneGeo, shadowMat);
      shadowMesh.position.set(0.04, -0.05, -0.04);
      group.add(shadowMesh);

      const rimGeo = new THREE.PlaneGeometry(noteW + 0.12, noteH + 0.12);
      disposableGeometries.push(rimGeo);
      const rimMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pose.pinColorHex),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      disposableMaterials.push(rimMat);
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.position.set(0, 0, -0.015);
      group.add(rimMesh);

      const paperGeo = new THREE.PlaneGeometry(noteW, noteH, segs, segs);
      disposableGeometries.push(paperGeo);
      const basePositions = new Float32Array(
        (paperGeo.attributes.position as THREE.BufferAttribute).array
      );
      deformPaperGeometry(
        paperGeo,
        basePositions,
        0.14,
        0.008,
        0,
        pose.swayPhase
      );

      const paperMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pose.paperColorHex),
        roughness: 0.68,
        metalness: 0.03,
        side: THREE.DoubleSide,
      });
      disposableMaterials.push(paperMat);

      const paperMesh = new THREE.Mesh(paperGeo, paperMat);
      paperMesh.userData = { noteIndex: idx, studentId: student.id };
      group.add(paperMesh);
      pickablePaperMeshes.push(paperMesh);

      const displayShortName = student.nickname || student.name.split(" ")[0] || student.name;
      const textSignature = `${student.roll_no}|${displayShortName}|${student.dream_title}|${student.role}|${pose.pinColorHex}`;
      const textTex = createDreamNoteTextTexture(
        student.roll_no,
        displayShortName,
        student.dream_title,
        student.role,
        pose.pinColorHex,
        maxAnisotropy
      );
      disposableTextures.push(textTex);

      const textMat = new THREE.MeshBasicMaterial({
        map: textTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      disposableMaterials.push(textMat);

      const textMesh = new THREE.Mesh(paperGeo, textMat);
      textMesh.position.set(0, 0, 0.012);
      group.add(textMesh);

      const pinGroup = new THREE.Group();
      pinGroup.position.set(0, noteH * 0.41, 0.05);

      const pinHeadMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pose.pinColorHex),
        roughness: 0.18,
        metalness: 0.22,
      });
      disposableMaterials.push(pinHeadMat);

      const needleMesh = new THREE.Mesh(pinNeedleGeo, metalPinMat);
      needleMesh.position.set(0, 0, -0.02);
      const collarMesh = new THREE.Mesh(pinCollarGeo, pinHeadMat);
      collarMesh.position.set(0, 0.01, 0.04);
      const headMesh = new THREE.Mesh(pinHeadGeo, pinHeadMat);
      headMesh.position.set(0, 0.025, 0.11);

      pinGroup.add(needleMesh, collarMesh, headMesh);
      group.add(pinGroup);

      noteInstances.push({
        index: idx,
        student,
        pose,
        group,
        paperMesh,
        paperMat,
        paperGeo,
        basePositions,
        textMesh,
        textMat,
        textSignature,
        rimMesh,
        rimMat,
        pinGroup,
        shadowMat,
        currPos: new THREE.Vector3(pose.x, pose.y, pose.z),
        currRot: new THREE.Euler(0, 0, pose.rotZRad),
        currScale: 1,
        currCurl: 0.14,
        currWave: 0.008,
        currPinOffset: 0,
        currRimOpacity: 0,
      });
    });

    updatePaperColorRef.current = (studentId: string, hex: string) => {
      const target = noteInstances.find((n) => n.student.id === studentId);
      if (target) {
        target.paperMat.color.set(hex);
      }
    };

    syncNotesContentRef.current = (nextStudents, nextPoses, overrides) => {
      noteInstances.forEach((inst, idx) => {
        const st = nextStudents[idx];
        const pose = nextPoses[idx];
        if (!st || !pose) return;
        inst.student = st;
        inst.pose = pose;

        const activeHex = overrides[st.id] || pose.paperColorHex;
        inst.paperMat.color.set(activeHex);

        const displayShortName = st.nickname || st.name.split(" ")[0] || st.name;
        const nextSig = `${st.roll_no}|${displayShortName}|${st.dream_title}|${st.role}|${pose.pinColorHex}`;
        if (inst.textSignature !== nextSig) {
          inst.textSignature = nextSig;
          const oldTex = inst.textMat.map;
          const nextTex = createDreamNoteTextTexture(
            st.roll_no,
            displayShortName,
            st.dream_title,
            st.role,
            pose.pinColorHex,
            maxAnisotropy
          );
          disposableTextures.push(nextTex);
          inst.textMat.map = nextTex;
          inst.textMat.needsUpdate = true;
          if (oldTex) oldTex.dispose();
        }
      });
    };

    // High-Performance Raycasting for Hover & Click on the 22 3D Notes
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastRaycastMs = 0;

    const updatePointerAndRaycast = (clientX: number, clientY: number) => {
      const now = performance.now();
      if (now - lastRaycastMs < 24) return;
      lastRaycastMs = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      pointerTiltRef.current = { x: pointer.x, y: pointer.y };

      if (zoomedIndexRef.current !== null) {
        return;
      }

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickablePaperMeshes, false);
      const firstHit = hits[0];
      if (firstHit) {
        const hitIdx = firstHit.object.userData?.noteIndex;
        if (typeof hitIdx === "number") {
          renderer.domElement.style.cursor = "pointer";
          if (hoveredIndexRef.current !== hitIdx) {
            hoveredIndexRef.current = hitIdx;
            setHoveredIndex(hitIdx);
          }

          const inst = noteInstances[hitIdx];
          if (inst) {
            inst.group.getWorldPosition(_worldPos);
            _worldPos.y += 0.72;
            _worldPos.z += 0.25;
            _worldPos.project(camera);
            const sx = ((_worldPos.x + 1) / 2) * rect.width;
            const sy = ((-_worldPos.y + 1) / 2) * rect.height;
            setHoverScreenPos({
              x: Math.max(110, Math.min(rect.width - 110, sx)),
              y: Math.max(36, Math.min(rect.height - 36, sy)),
            });
          }
          return;
        }
      }

      renderer.domElement.style.cursor = "default";
      if (hoveredIndexRef.current !== null) {
        hoveredIndexRef.current = null;
        setHoveredIndex(null);
        setHoverScreenPos(null);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointerAndRaycast(e.clientX, e.clientY);
    };

    const onPointerLeave = () => {
      pointerTiltRef.current = { x: 0, y: 0 };
      if (hoveredIndexRef.current !== null) {
        hoveredIndexRef.current = null;
        setHoveredIndex(null);
        setHoverScreenPos(null);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickablePaperMeshes, false);
      const firstHit = hits[0];
      if (firstHit) {
        const hitIdx = firstHit.object.userData?.noteIndex;
        if (typeof hitIdx === "number") {
          if (zoomedIndexRef.current === hitIdx) {
            const inst = noteInstances[hitIdx];
            if (inst) {
              const randomPalette =
                DREAM_PAPER_PALETTE[
                  Math.floor(Math.random() * DREAM_PAPER_PALETTE.length)
                ];
              if (randomPalette) {
                inst.paperMat.color.set(randomPalette.hex);
                setZoomColorOverride((prev) => ({
                  ...prev,
                  [inst.student.id]: randomPalette.hex,
                }));
              }
            }
          } else {
            setIsEditingModal(false);
            zoomedIndexRef.current = hitIdx;
            setZoomedIndex(hitIdx);
            setHoveredIndex(null);
            setHoverScreenPos(null);
          }
        }
      } else if (zoomedIndexRef.current !== null) {
        setIsEditingModal(false);
        zoomedIndexRef.current = null;
        setZoomedIndex(null);
      }
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.position.z = w < 640 ? 15.2 : 12.65;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    onResize();
    window.addEventListener("resize", onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === "function") {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const startTimeMs = performance.now();
    let prevTimeSec = 0;

    const tick = () => {
      const elapsedSec = (performance.now() - startTimeMs) * 0.001;
      const dt = Math.min(elapsedSec - prevTimeSec, 0.1);
      prevTimeSec = elapsedSec;
      const lerpFactor = isSoftwareGl ? 0.52 : Math.min(1, dt * 8.5);

      const activeHover = hoveredIndexRef.current;
      const activeZoom = zoomedIndexRef.current;
      const tilt = pointerTiltRef.current;

      // STRICT STATIC BOARD LOCK
      boardGroup.rotation.set(0, 0, 0);
      boardGroup.position.set(0, 0, 0);

      for (let i = 0; i < noteInstances.length; i++) {
        const inst = noteInstances[i];
        if (!inst) continue;
        const isHovered = activeZoom === null && activeHover === i;
        const isZoomed = activeZoom === i;

        let targetX = inst.pose.x;
        let targetY = inst.pose.y;
        let targetZ = inst.pose.z;
        let targetRotX = 0;
        let targetRotY = 0;
        let targetRotZ = inst.pose.rotZRad;
        let targetScale = 1.0;
        let targetCurl = 0.14;
        let targetWave = 0.008;
        let targetPinOffset = 0;
        let targetRimOpacity = 0;

        if (isZoomed) {
          // Saat pop-up / zoom: Kertas 3D berada di SEBELAH KIRI (-2.55) dan Modal Compact di SEBELAH KANAN tanpa menghalangi kertas!
          const isMobile = (container.clientWidth || 960) < 768;
          targetX = isMobile ? 0 : -2.55;
          targetY = isMobile ? 1.15 : -0.1;
          targetZ = 4.25;
          targetRotX = -tilt.y * 0.1 + Math.sin(elapsedSec * 2.1) * 0.025;
          targetRotY =
            0.14 + tilt.x * 0.14 + Math.cos(elapsedSec * 1.7) * 0.03;
          targetRotZ = -0.015 + Math.sin(elapsedSec * 1.4) * 0.012;
          targetScale = isMobile ? 1.35 : 1.65;
          targetCurl = 0.2;
          targetWave = 0.024;
          targetPinOffset = 0.32;
          targetRimOpacity = 0.45;
        } else if (isHovered) {
          targetX = inst.pose.x;
          targetY = inst.pose.y + 0.06;
          targetZ = inst.pose.z + 0.55;
          targetRotX = -tilt.y * 0.15 - 0.04;
          targetRotY = tilt.x * 0.18;
          targetRotZ =
            inst.pose.rotZRad * 0.35 + Math.sin(elapsedSec * 6.0) * 0.02;
          targetScale = 1.14;
          targetCurl = 0.22;
          targetWave = 0.035;
          targetPinOffset = 0.12;
          targetRimOpacity = 0.5;
        } else {
          // Catatan di latar belakang tetap utuh di depan papan (JANGAN kurangi targetZ agar tidak terpotong oleh papan!)
          const breathe = Math.sin(elapsedSec * 1.6 + inst.pose.swayPhase);
          targetRotZ = inst.pose.rotZRad + breathe * 0.008;
          targetRotX = 0;
          targetRotY = 0;
          targetCurl = 0.11 + breathe * 0.012;
          targetWave = 0.006;
          targetZ = inst.pose.z;
        }

        inst.currPos.x += (targetX - inst.currPos.x) * lerpFactor;
        inst.currPos.y += (targetY - inst.currPos.y) * lerpFactor;
        inst.currPos.z += (targetZ - inst.currPos.z) * lerpFactor;

        inst.currRot.x += (targetRotX - inst.currRot.x) * lerpFactor;
        inst.currRot.y += (targetRotY - inst.currRot.y) * lerpFactor;
        inst.currRot.z += (targetRotZ - inst.currRot.z) * lerpFactor;

        inst.currScale += (targetScale - inst.currScale) * lerpFactor;
        inst.currCurl += (targetCurl - inst.currCurl) * lerpFactor;
        inst.currWave += (targetWave - inst.currWave) * lerpFactor;
        inst.currPinOffset +=
          (targetPinOffset - inst.currPinOffset) * lerpFactor;
        inst.currRimOpacity +=
          (targetRimOpacity - inst.currRimOpacity) * lerpFactor;

        inst.group.position.copy(inst.currPos);
        inst.group.rotation.copy(inst.currRot);
        inst.group.scale.setScalar(inst.currScale);

        inst.pinGroup.position.y = noteH * 0.41 + inst.currPinOffset * 0.45;
        inst.pinGroup.position.z = 0.05 + inst.currPinOffset;
        inst.pinGroup.rotation.x = -inst.currPinOffset * 0.8;

        inst.rimMat.opacity = inst.currRimOpacity;
        inst.shadowMat.opacity = isZoomed ? 0.26 : isHovered ? 0.22 : 0.12;

        if (isHovered || isZoomed || !isSoftwareGl) {
          deformPaperGeometry(
            inst.paperGeo,
            inst.basePositions,
            inst.currCurl,
            inst.currWave,
            elapsedSec,
            inst.pose.swayPhase
          );
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    let routeTransitionStopped = false;
    const onRouteTransitionStart = () => {
      routeTransitionStopped = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
    };
    window.addEventListener("app:route-transition-start", onRouteTransitionStart);

    window.dispatchEvent(
      new CustomEvent("app:scene-loading", {
        detail: {
          progress: 32,
          label: "Menyiapkan papan cita-cita 3D...",
          sceneTitle: "PANGGUNG 3D · PAPAN IMPIAN XII PPLG 1",
        },
      })
    );

    const wrappedTick = () => {
      if (routeTransitionStopped) return;
      tick();
    };
    wrappedTick();
    window.dispatchEvent(
      new CustomEvent("app:scene-progress", {
        detail: {
          progress: 100,
          label: "Menyiapkan papan cita-cita 3D...",
          sceneTitle: "PANGGUNG 3D · PAPAN IMPIAN XII PPLG 1",
        },
      })
    );
    const curtainTimer = window.setTimeout(() => {
      if (!routeTransitionStopped) {
        window.dispatchEvent(new CustomEvent("app:scene-ready"));
      }
    }, 280);

    return () => {
      routeTransitionStopped = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.clearTimeout(curtainTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener(
        "app:route-transition-start",
        onRouteTransitionStart
      );
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      disposableTextures.forEach((t) => t.dispose());
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteCount]);

  const hoveredStudent =
    hoveredIndex !== null ? (orderedStudents[hoveredIndex] ?? null) : null;
  const zoomedStudent =
    zoomedIndex !== null ? (orderedStudents[zoomedIndex] ?? null) : null;
  const zoomedPose =
    zoomedIndex !== null ? (poses[zoomedIndex] ?? null) : null;

  const handleCycleZoomPaperColor = () => {
    if (!zoomedStudent) return;
    const currentHex =
      zoomColorOverride[zoomedStudent.id] ||
      zoomedPose?.paperColorHex ||
      DEFAULT_PAPER_HEX;
    const currentIdx = DREAM_PAPER_PALETTE.findIndex(
      (p) => p.hex.toLowerCase() === currentHex.toLowerCase()
    );
    const nextPalette =
      DREAM_PAPER_PALETTE[(currentIdx + 1) % DREAM_PAPER_PALETTE.length];
    const nextHex = nextPalette?.hex ?? DEFAULT_PAPER_HEX;

    setZoomColorOverride((prev) => ({
      ...prev,
      [zoomedStudent.id]: nextHex,
    }));
    updatePaperColorRef.current(zoomedStudent.id, nextHex);
  };

  const handleToggleBoardFinish = () => {
    const nextMode =
      boardFinish === "whiteboard" ? "chalkboard" : "whiteboard";
    setBoardFinish(nextMode);
    updateBoardFinishRef.current(nextMode);
  };

  const activePaperHex =
    zoomedStudent && zoomedPose
      ? zoomColorOverride[zoomedStudent.id] || zoomedPose.paperColorHex
      : DEFAULT_PAPER_HEX;
  const activePaperName =
    DREAM_PAPER_PALETTE.find(
      (p) => p.hex.toLowerCase() === activePaperHex.toLowerCase()
    )?.name ??
    zoomedPose?.paperColorName ??
    "Pastel";

  return (
    <section
      id="papan-cita-cita"
      aria-labelledby="heading-papan-cita-cita"
      className="mx-auto max-w-[1320px] px-3 py-6 sm:px-6 sm:py-8 lg:px-8"
    >
      <div className="rounded-3xl border border-border bg-card/90 p-4 shadow-md backdrop-blur-md sm:p-6 lg:p-8">
        {/* Compact Responsive Section Header — Warm Nostalgic Palette */}
        <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent-warm)]">
              <Sparkles className="size-3.5 shrink-0" strokeWidth={1.5} />
              <span className="truncate">
                Papan Impian 3D · XII PPLG 1
              </span>
            </p>
            <h1
              id="heading-papan-cita-cita"
              className="mt-1 font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-[28px]"
            >
              Papan Cita-Cita &amp; Harapan ({orderedStudents.length} Siswa)
            </h1>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Klik lembar kertas cita-cita untuk membaca alasan dan mengirim doa semangat.
            </p>
          </div>

          {/* Warm Control Bar */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] sm:gap-2">
            <button
              type="button"
              onClick={handleToggleBoardFinish}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-foreground transition hover:bg-muted"
            >
              <Layers
                className="size-3.5 shrink-0 text-[var(--color-accent-warm)]"
                strokeWidth={1.5}
              />
              <span>
                {boardFinish === "whiteboard"
                  ? "Papan Gabus"
                  : "Papan Kapur"}
              </span>
            </button>

            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background/70 px-3 text-foreground">
              <Pin
                className="size-3.5 shrink-0 text-[var(--color-chart-3)]"
                strokeWidth={1.5}
              />
              <span>{orderedStudents.length} Kertas</span>
            </span>

            {onOpenSubmitDreamModal && (
              <button
                type="button"
                onClick={onOpenSubmitDreamModal}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-accent-warm)] px-3.5 font-sans text-xs font-semibold text-[#fbf6ec] shadow-xs transition hover:opacity-90"
              >
                <Sparkles className="size-3.5 shrink-0" />
                <span>Tempel Cita-Cita</span>
              </button>
            )}

            {zoomedStudent ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditingModal(false);
                  setZoomedIndex(null);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3 text-background transition hover:opacity-90"
              >
                <X className="size-3.5 shrink-0" />
                <span>Tutup</span>
              </button>
            ) : (
              <span className="hidden h-9 items-center gap-1.5 rounded-xl border border-[var(--color-accent-warm)]/35 bg-[var(--color-accent-warm)]/10 px-3 text-[var(--color-accent-warm)] sm:inline-flex">
                <MousePointerClick className="size-3.5" strokeWidth={1.5} />
                <span>Klik: Fokus</span>
              </span>
            )}
          </div>
        </div>

        {/* Main 3D Board Viewport Container — Warm Amber Sunset Studio */}
        <div className="relative mt-4 h-[480px] w-full overflow-hidden rounded-2xl border border-[#d8c7ae] bg-gradient-to-br from-[#f6ead4] via-[#f1dec0] to-[#e7cfa8] shadow-inner sm:mt-5 sm:h-[550px] sm:rounded-[24px] lg:h-[600px] dark:border-[#463629] dark:from-[#261b12] dark:via-[#1e150e] dark:to-[#2b1e14]">
          {/* Warm Sunset Glow Underlay */}
          <svg
            viewBox="0 0 960 560"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover opacity-85 dark:opacity-55"
          >
            <defs>
              <radialGradient id="boardStudioGlow" cx="50%" cy="46%" r="54%">
                <stop offset="0%" stopColor="#e09f4c" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#c86d3b" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#f6efe2" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="960" height="560" fill="url(#boardStudioGlow)" />
          </svg>

          {/* Interactive Three.js 3D Canvas */}
          <div
            ref={mountRef}
            className="relative z-[2] h-full w-full"
            aria-label="Kanvas 3D Papan Tulis Cita-Cita Siswa XII PPLG 1"
          />

          {orderedStudents.length === 0 && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
              <div className="max-w-md rounded-2xl border border-[#d8c7ae] bg-[#fbf6ec]/95 p-6 text-[#2b2118] shadow-lg dark:border-[#463629] dark:bg-[#241b14]/95 dark:text-[#f2e6d5]">
                <p className="font-serif text-lg font-bold">
                  Papan Cita-Cita Masih Kosong (0 Data)
                </p>
                <p className="mt-1.5 text-xs leading-relaxed opacity-80">
                  Belum ada data siswa atau cita-cita di database Supabase.
                  Silakan tambahkan data siswa melalui Dasbor Admin terlebih
                  dahulu.
                </p>
              </div>
            </div>
          )}

          {/* Subtle Warm Backdrop on the right side only when in State 3 (Click & Zoom) */}
          {zoomedStudent && (
            <div
              onClick={() => {
                setIsEditingModal(false);
                setZoomedIndex(null);
              }}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-black/25 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-black/25 transition-opacity duration-300"
            />
          )}

          {/* STATE 2: COMPACT WARM FLOATING HOVER PROMPT */}
          {hoveredStudent && !zoomedStudent && hoverScreenPos && (
            <div
              data-testid="floating-hover-prompt"
              style={{
                left: `${hoverScreenPos.x}px`,
                top: `${hoverScreenPos.y}px`,
              }}
              className="pointer-events-none absolute z-20 max-w-[90%] -translate-x-1/2 -translate-y-full transition-transform duration-150"
            >
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#c86d3b]/40 bg-[#fffdf7]/95 px-3 py-1.5 font-sans text-xs font-semibold text-[#2b2118] shadow-md backdrop-blur-md dark:border-[#e09f4c]/40 dark:bg-[#261d16]/95 dark:text-[#f2e6d5]">
                <span>Klik untuk baca catatan {hoveredStudent.name} →</span>
              </div>
            </div>
          )}

          {/* STATE 3: LEMBAR CATATAN IMPIAN BERSIH & EDITORIAL (Tidak seperti template AI, tidak menutupi kertas 3D di kiri) */}
          {zoomedStudent && zoomedPose && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center p-2 sm:items-center sm:justify-end sm:p-4 lg:pr-6">
              <article
                role="dialog"
                aria-modal="false"
                data-testid="dream-note-detail-modal"
                aria-label={`Lembar cita-cita ${zoomedStudent.name}`}
                style={{
                  borderTopColor: activePaperHex,
                }}
                className="pointer-events-auto flex max-h-[65%] w-full flex-col overflow-hidden rounded-xl border border-[#cbb799] border-t-[5px] bg-[#fffdf8] text-[#2b2118] shadow-[0_20px_45px_-12px_rgba(28,18,10,0.45)] sm:max-h-[86%] sm:max-w-[356px] lg:max-w-[372px] dark:border-[#4d3b2c] dark:bg-[#231a13] dark:text-[#f2e6d5]"
              >
                {/* Header Kartu Indeks Bersih */}
                <div className="flex shrink-0 items-start justify-between gap-2.5 border-b border-[#e4d5be] px-3.5 py-2.5 sm:px-4 sm:py-3.5 dark:border-[#3e2f23]">
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <img
                      src={zoomedStudent.avatar_url}
                      alt={zoomedStudent.name}
                      width={40}
                      height={40}
                      referrerPolicy="no-referrer"
                      className="size-9 sm:size-10 shrink-0 rounded-lg border border-[#cbb799] object-cover shadow-2xs dark:border-[#544030]"
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-bold text-[#a84232] dark:text-[#e09f4c]">
                        ABSEN #{String(zoomedStudent.roll_no).padStart(2, "0")} ·{" "}
                        {zoomedStudent.role}
                      </p>
                      <h3 className="truncate font-serif text-sm sm:text-base font-bold leading-snug">
                        {zoomedStudent.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={handleCycleZoomPaperColor}
                      title={`Warna kertas: ${activePaperName} (Klik untuk ganti)`}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-[#dccbb2] bg-[#f8f1e4] text-[#6e5a47] transition hover:text-[#2b2118] dark:border-[#463629] dark:bg-[#2e231b] dark:text-[#b8a38c]"
                    >
                      <Shuffle className="size-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditingModal) {
                            setEditTitle(zoomedStudent.dream_title);
                            setEditReason(zoomedStudent.dream_reason);
                            setEditDesc(zoomedStudent.dream_description);
                            setEditCapsule(
                              zoomedStudent.capsule_message ||
                                `Kapsul Waktu 2027 — Sampai bertemu lagi sebagai ${zoomedStudent.dream_title}!`
                            );
                            setEditColor(
                              zoomColorOverride[zoomedStudent.id] ||
                                zoomedStudent.dream_paper_color ||
                                zoomedPose.paperColorHex
                            );
                          }
                          setIsEditingModal((v) => !v);
                        }}
                        aria-label="Edit catatan mimpi"
                        className="inline-flex size-8 items-center justify-center rounded-lg bg-[#c86d3b] text-white transition hover:opacity-90"
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingModal(false);
                        setZoomedIndex(null);
                      }}
                      aria-label="Tutup lembar catatan cita-cita"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-[#dccbb2] bg-[#f8f1e4] text-[#2b2118] transition hover:bg-[#efe4d0] dark:border-[#463629] dark:bg-[#2e231b] dark:text-[#f2e6d5]"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Isi Lembar Catatan Tulisan Tangan (Tanpa kotak bersarang / pill AI) */}
                <div className="flex-1 overflow-y-auto px-3.5 py-2.5 sm:px-4 sm:py-3.5 space-y-2.5 sm:space-y-3.5">
                  {statusNotice && (
                    <p className="rounded-lg border border-[#c86d3b]/30 bg-[#c86d3b]/10 px-3 py-2 text-xs font-medium text-[#c86d3b]">
                      {statusNotice}
                    </p>
                  )}
                  {isAdmin && isEditingModal ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!onUpdateStudentDream || isSavingEdit) return;
                        try {
                          setIsSavingEdit(true);
                          await onUpdateStudentDream(zoomedStudent.id, {
                            dream_title: editTitle,
                            dream_reason: editReason,
                            dream_description: editDesc,
                            dream_paper_color: editColor,
                            capsule_message: editCapsule,
                          });
                          setZoomColorOverride((prev) => ({
                            ...prev,
                            [zoomedStudent.id]: editColor,
                          }));
                          updatePaperColorRef.current(
                            zoomedStudent.id,
                            editColor
                          );
                          setIsEditingModal(false);
                          setStatusNotice(
                            `Catatan mimpi ${zoomedStudent.name} berhasil disimpan!`
                          );
                        } catch {
                          setStatusNotice(
                            "Gagal menyimpan perubahan catatan mimpi."
                          );
                        } finally {
                          setIsSavingEdit(false);
                        }
                      }}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-xs font-bold text-[#c86d3b]">
                          Sunting Catatan Impian
                        </span>
                        {onResetStudentDream && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await onResetStudentDream(zoomedStudent.id);
                                setZoomColorOverride((prev) => {
                                  const next = { ...prev };
                                  delete next[zoomedStudent.id];
                                  return next;
                                });
                                setIsEditingModal(false);
                              } catch {
                                setStatusNotice("Gagal mereset catatan mimpi.");
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#a84232]"
                          >
                            <RotateCcw className="size-3" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#d8c7ae] bg-white px-2.5 font-sans text-sm font-semibold text-[#2b2118]"
                      />
                      <textarea
                        rows={3}
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        className="w-full rounded-lg border border-[#d8c7ae] bg-white p-2.5 font-sans text-sm leading-relaxed text-[#2b2118]"
                      />
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#c86d3b] px-3 text-xs font-semibold text-white"
                      >
                        <Save className="size-3.5" />
                        <span>Simpan Perubahan</span>
                      </button>
                    </form>
                  ) : (
                    <>
                      {/* Cita-Cita Utama dengan Fraunces Serif */}
                      <div>
                        <p className="text-[11px] font-medium text-[#6e5a47] dark:text-[#b8a38c]">
                          Cita-cita masa depan:
                        </p>
                        <h4 className="mt-0.5 font-serif text-lg sm:text-xl font-bold leading-snug text-[#182542] dark:text-[#f5d08a]">
                          {zoomedStudent.dream_title}
                        </h4>
                      </div>

                      {/* Kutipan Cerita di Atas Garis Buku (Plus Jakarta Sans, line-height 1.6) */}
                      <div className="border-y border-dashed border-[#dccbb2] py-2.5 sm:py-3 dark:border-[#463629]">
                        <p className="font-sans text-sm sm:text-[15px] leading-relaxed text-[#2b2118] dark:text-[#f2e6d5]">
                          &ldquo;{zoomedStudent.dream_reason}&rdquo;
                        </p>
                        {zoomedStudent.dream_description && (
                          <p className="mt-1.5 sm:mt-2 font-sans text-xs sm:text-sm leading-relaxed text-[#6e5a47] dark:text-[#b8a38c]">
                            — {zoomedStudent.dream_description}
                          </p>
                        )}
                      </div>

                      {onOpenCheerModal && (
                        <button
                          type="button"
                          onClick={() => onOpenCheerModal(zoomedStudent)}
                          className="inline-flex min-h-[38px] sm:min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-[#2b2118] px-3.5 py-2 text-xs font-semibold text-[#fbf6ec] transition hover:opacity-90 dark:bg-[#e09f4c] dark:text-[#1c1510]"
                        >
                          <MessageSquareHeart className="size-3.5" />
                          <span>
                            Tulis Doa untuk{" "}
                            {zoomedStudent.nickname ||
                              zoomedStudent.name.split(" ")[0]}
                          </span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Bar Navigasi Bawah Bersih */}
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#e4d5be] bg-[#f8f1e4] px-3.5 py-2 sm:px-4 sm:py-2.5 dark:border-[#3e2f23] dark:bg-[#1c1510]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingModal(false);
                      setZoomedIndex((prev) =>
                        prev === null
                          ? 0
                          : (prev - 1 + orderedStudents.length) %
                            orderedStudents.length
                      );
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8c7ae] bg-[#fffdf8] px-2.5 text-xs font-semibold text-[#2b2118] transition hover:bg-white dark:border-[#463629] dark:bg-[#261d16] dark:text-[#f2e6d5]"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="font-mono text-xs font-bold tabular-nums text-[#6e5a47] dark:text-[#b8a38c]">
                    Lembar {String(zoomedStudent.roll_no).padStart(2, "0")} /{" "}
                    {orderedStudents.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingModal(false);
                      setZoomedIndex((prev) =>
                        prev === null
                          ? 0
                          : (prev + 1) % orderedStudents.length
                      );
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8c7ae] bg-[#fffdf8] px-2.5 text-xs font-semibold text-[#2b2118] transition hover:bg-white dark:border-[#463629] dark:bg-[#261d16] dark:text-[#f2e6d5]"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </article>
            </div>
          )}
        </div>

        {/* Quick Selector Strip dengan Tipografi Bersih & Prev/Next */}
        <div className="mt-4 rounded-xl border border-[#8c6b48]/25 bg-[#fffdf9]/85 p-3 sm:p-3.5 shadow-xs backdrop-blur-md dark:border-[#d4a36a]/20 dark:bg-[#231912]/80">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-serif text-sm sm:text-base font-bold text-[#6e5a47] dark:text-[#c7b39b]">
              Pintasan Kertas Cita-Cita ({orderedStudents.length})
            </span>
            <div className="flex items-center gap-2">
              {(() => {
                const totalPages = Math.ceil(orderedStudents.length / 6);
                const currentPage =
                  zoomedIndex !== null ? Math.floor(zoomedIndex / 6) : 0;
                return (
                  <>
                    <span className="font-mono text-xs font-bold tabular-nums text-[#C86D3B] dark:text-[#F2A96B]">
                      Hal {currentPage + 1} / {Math.max(1, totalPages)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Halaman pintasan sebelumnya"
                        onClick={() => {
                          const prevPage = Math.max(0, currentPage - 1);
                          setZoomedIndex(prevPage * 6);
                        }}
                        disabled={currentPage === 0}
                        className="inline-flex size-7 items-center justify-center rounded-md border border-[#8c6b48]/25 text-[#2b2118] transition hover:bg-[#8c6b48]/10 disabled:opacity-30 dark:border-white/10 dark:text-[#f6efe2] dark:hover:bg-white/10"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Halaman pintasan berikutnya"
                        onClick={() => {
                          const nextPage = Math.min(
                            totalPages - 1,
                            currentPage + 1
                          );
                          setZoomedIndex(nextPage * 6);
                        }}
                        disabled={currentPage >= totalPages - 1}
                        className="inline-flex size-7 items-center justify-center rounded-md border border-[#8c6b48]/25 text-[#2b2118] transition hover:bg-[#8c6b48]/10 disabled:opacity-30 dark:border-white/10 dark:text-[#f6efe2] dark:hover:bg-white/10"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-3">
            {(() => {
              const currentPage =
                zoomedIndex !== null ? Math.floor(zoomedIndex / 6) : 0;
              return orderedStudents
                .slice(currentPage * 6, (currentPage + 1) * 6)
                .map((st, idxOnPage) => {
                  const idx = currentPage * 6 + idxOnPage;
                  const pose = poses[idx];
                  const isZoomed = zoomedIndex === idx;
                  const isHovered = hoveredIndex === idx;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      data-testid={`dream-note-btn-${st.roll_no}`}
                      onMouseEnter={() => {
                        if (zoomedIndex === null) {
                          setHoveredIndex(idx);
                          setHoverScreenPos({ x: 480, y: 180 });
                        }
                      }}
                      onMouseLeave={() => {
                        if (hoveredIndex === idx) {
                          setHoveredIndex(null);
                          setHoverScreenPos(null);
                        }
                      }}
                      onClick={() => {
                        setIsEditingModal(false);
                        zoomedIndexRef.current = idx;
                        setZoomedIndex(idx);
                        setHoveredIndex(null);
                        setHoverScreenPos(null);
                        mountRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }}
                      style={{
                        borderLeftColor: pose?.pinColorHex ?? "#C86D3B",
                      }}
                      className={`group flex items-center justify-between gap-2 rounded-lg border border-[#8c6b48]/20 border-l-[4px] px-2.5 py-2 sm:px-3 text-left transition-all hover:-translate-y-0.5 ${
                        isZoomed
                          ? "bg-[#2b2118] text-[#fbf6ec] shadow-sm dark:bg-[#e09f4c] dark:text-[#1c1510]"
                          : isHovered
                            ? "bg-white shadow-xs dark:bg-white/15"
                            : "bg-white/85 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 font-mono text-[11px] font-bold opacity-75">
                            #{String(st.roll_no).padStart(2, "0")}
                          </span>
                          <span className="truncate font-serif text-xs sm:text-sm font-bold">
                            {st.name}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-sans text-xs sm:text-sm font-medium leading-snug opacity-90">
                          {st.dream_title}
                        </p>
                      </div>
                      <Pin
                        className="size-3.5 shrink-0 opacity-40 transition group-hover:rotate-12 group-hover:opacity-90"
                        strokeWidth={1.5}
                      />
                    </button>
                  );
                });
            })()}
          </div>

          <div className="mt-2.5 border-t border-[#8c6b48]/15 pt-2 text-center dark:border-white/10">
            <span className="block truncate font-sans text-xs sm:text-sm font-semibold text-[#C86D3B] dark:text-[#F2A96B]">
              {hoveredStudent
                ? `${hoveredStudent.name} · ${hoveredStudent.dream_title}`
                : zoomedStudent
                  ? `Sedang membaca lembar catatan: ${zoomedStudent.name} · ${zoomedStudent.dream_title}`
                  : "Klik kertas catatan di papan 3D atau nama sahabat di atas untuk fokus membaca"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export const ClassDreamBoard3D = DreamBoardSection;
