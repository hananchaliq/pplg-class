"use client";

import * as React from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import { StudentRecord, DREAM_PAPER_PALETTE } from "@/lib/class-data";
import { computeDreamBoardLayout, DreamNoteBoardPose } from "@/lib/class-logic";
import {
  ensureAlbumFontsLoaded,
  getAlbumArsipFont,
  getAlbumDisplayFont,
  getAlbumTulisFont,
} from "@/lib/class-meta";
import {
  createSafeWebGLRenderer,
  isSoftwareWebGL,
  useVisualTier,
} from "@/lib/visual-tier";
import {
  Sparkles,
  Pin,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
  X,
  Shuffle,
  Edit3,
  RotateCcw,
  Save,
  Layers,
  MessageSquareHeart,
  LayoutGrid,
  Box,
  Search,
  Plus,
  ArrowUpRight,
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

  addPanel(0xfffaf0, 6, 7, 7, 0.2, 6, 6);
  addPanel(0xffe9c7, -7, 4, 6, 0.2, 5, 5);
  addPanel(0xffffff, 0, 9, 0, 8, 0.2, 8);
  addPanel(0xe5c89b, 0, -6, 4, 6, 0.2, 4);

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

function createTeakWoodTexture(maxAnisotropy = 1): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#B8783F");
    grad.addColorStop(0.45, "#9C602E");
    grad.addColorStop(0.85, "#CA8B51");
    grad.addColorStop(1, "#8A5024");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Serat kayu jati madu hangat
    for (let i = 0; i < 42; i++) {
      const baseY = (i / 42) * size;
      ctx.strokeStyle =
        i % 3 === 0 ? "rgba(74, 38, 12, 0.2)" : "rgba(244, 198, 140, 0.16)";
      ctx.lineWidth = 1.2 + (i % 3) * 0.7;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= size; x += 24) {
        const wave =
          Math.sin(x * 0.018 + i * 0.65) * 6 + Math.cos(x * 0.045 - i) * 2.2;
        ctx.lineTo(x, baseY + wave);
      }
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
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
      // Papan Tulis Kelas Cerah Putih Bersih Klasik
      const grad = ctx.createLinearGradient(0, 0, 1024, 576);
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.55, "#F9FBFE");
      grad.addColorStop(1, "#F1F5FA");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 576);

      ctx.strokeStyle = "rgba(59, 130, 246, 0.08)";
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

      // Garis header warna spidol kelas (biru, merah, hijau)
      ctx.fillStyle = "rgba(37, 99, 235, 0.55)";
      ctx.fillRect(42, 10, 420, 3);
      ctx.fillStyle = "rgba(220, 38, 38, 0.45)";
      ctx.fillRect(472, 10, 260, 3);
      ctx.fillStyle = "rgba(22, 163, 74, 0.5)";
      ctx.fillRect(742, 10, 240, 3);

      ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
      ctx.font = `700 23px ${getAlbumTulisFont()}`;
      ctx.textAlign = "center";
      ctx.fillText(
        "XII PPLG 1 — MAKN Ende · Papan Impian & Harapan Masa Depan",
        512,
        38
      );
      ctx.textAlign = "start";

      for (let i = 0; i < 1600; i++) {
        const nx = (i * 193) % 1024;
        const ny = (i * 109) % 576;
        ctx.fillStyle =
          i % 2 === 0
            ? "rgba(255, 255, 255, 0.3)"
            : "rgba(148, 163, 184, 0.04)";
        ctx.fillRect(nx, ny, 2, 2);
      }
    } else {
      // Papan Kapur Hijau Klasik Madrasah
      const grad = ctx.createLinearGradient(0, 0, 1024, 576);
      grad.addColorStop(0, "#1F5038");
      grad.addColorStop(0.5, "#19432F");
      grad.addColorStop(1, "#133524");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 576);

      ctx.strokeStyle = "rgba(245, 240, 224, 0.065)";
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

      ctx.fillStyle = "rgba(248, 243, 226, 0.78)";
      ctx.font = `700 22px ${getAlbumTulisFont()}`;
      ctx.textAlign = "center";
      ctx.fillText(
        "XII PPLG 1 — MAKN Ende · Papan Kapur Cita-Cita & Harapan",
        512,
        36
      );
      ctx.textAlign = "start";

      for (let i = 0; i < 2200; i++) {
        const nx = (i * 193) % 1024;
        const ny = (i * 109) % 576;
        ctx.fillStyle =
          i % 2 === 0 ? "rgba(248,243,226,0.06)" : "rgba(14,32,22,0.12)";
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
  const drawNote = () => {
    if (!ctx) return;
    const tulisFont = getAlbumTulisFont();
    const arsipFont = getAlbumArsipFont();

    ctx.clearRect(0, 0, 512, 384);

    // Garis buku tulis tipis di kertas catatan warna-warni
    ctx.strokeStyle = "rgba(45, 58, 84, 0.14)";
    ctx.lineWidth = 1.8;
    for (let y = 126; y < 342; y += 46) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(482, y);
      ctx.stroke();
    }

    // Nomor & Nama Siswa dengan tulisan tangan pulpen tinta biru-gelap alami (Caveat)
    const padded = String(rollNo).padStart(2, "0");
    ctx.fillStyle = "#1E2633";
    ctx.font = `700 30px ${tulisFont}`;
    ctx.fillText(`#${padded} · ${name}`, 34, 68);

    // Garis coretan warna sesuai pin
    ctx.strokeStyle = pinHex;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(34, 84);
    ctx.quadraticCurveTo(116, 79, 198, 86);
    ctx.stroke();

    // Isi Cita-Cita dengan Tulisan Tangan Caveat Natural
    ctx.fillStyle = "#24211E";
    ctx.font = `700 34px ${tulisFont}`;
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
      ctx.translate(34, 154 + idx * 46);
      ctx.rotate(((rollNo + idx) % 3 - 1) * 0.008);
      ctx.fillText(line, 0, 0);
      ctx.restore();
    });

    // Stamp metadata arsip di bagian bawah kertas
    ctx.fillStyle = "#52493F";
    ctx.font = `700 14px ${arsipFont}`;
    ctx.fillText(`${(role || "UNO · XII PPLG 1").toUpperCase()}`, 34, 346);

    // Lipatan sudut kanan bawah kertas
    ctx.fillStyle = "rgba(38, 31, 24, 0.11)";
    ctx.beginPath();
    ctx.moveTo(452, 384);
    ctx.lineTo(512, 324);
    ctx.lineTo(512, 384);
    ctx.closePath();
    ctx.fill();
  };

  drawNote();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;

  if (typeof window !== "undefined") {
    void ensureAlbumFontsLoaded().then(() => {
      drawNote();
      tex.needsUpdate = true;
    });
  }

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

  const { tier, isManualOverride } = useVisualTier();
  const [viewMode, setViewMode] = React.useState<"bento" | "board3d">("bento");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [boardFinish, setBoardFinish] = React.useState<
    "whiteboard" | "chalkboard"
  >("whiteboard");
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [zoomedIndex, setZoomedIndex] = React.useState<number | null>(0);
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
  const [css3dFallback, setCss3dFallback] = React.useState(false);
  const [cssTilt, setCssTilt] = React.useState<{ rx: number; ry: number }>({
    rx: 0,
    ry: 0,
  });

  // Sync with global 3D/2D Navbar button when user manually toggles it
  const prevGlobalTierRef = React.useRef(tier);
  React.useEffect(() => {
    if (prevGlobalTierRef.current !== tier && isManualOverride) {
      prevGlobalTierRef.current = tier;
      setViewMode(tier === "hd" ? "board3d" : "bento");
    }
  }, [tier, isManualOverride]);

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
    zoomedIndexRef.current = viewMode === "board3d" ? zoomedIndex : null;
  }, [zoomedIndex, viewMode]);

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
      viewMode,
      isStaticBoardLocked: true,
    });
    return () => {
      delete win.__dream_board_state;
    };
  }, [poses.length, boardFinish, viewMode]);

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
        if (viewMode === "board3d") {
          setZoomedIndex(null);
        }
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
  }, [zoomedIndex, orderedStudents.length, viewMode]);

  const noteCount = orderedStudents.length;
  React.useEffect(() => {
    if (viewMode !== "board3d") {
      window.dispatchEvent(new CustomEvent("app:scene-ready"));
      return undefined;
    }
    const container = mountRef.current;
    if (!container || noteCount === 0) {
      window.dispatchEvent(new CustomEvent("app:scene-ready"));
      return undefined;
    }

    const isSoftwareGl = isSoftwareWebGL();

    const segs = 16;
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 580;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, -0.12, 12.65);
    camera.lookAt(0, -0.12, 0);

    const safeRenderer = createSafeWebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
    });
    if (!safeRenderer) {
      setCss3dFallback(true);
      window.dispatchEvent(new CustomEvent("app:scene-ready"));
      return undefined;
    }
    setCss3dFallback(false);
    const renderer = safeRenderer;

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

    // Pencahayaan Ruang Kelas Hangat & Cerah
    const hemiLight = new THREE.HemisphereLight(0xfffdf7, 0xd4b692, 1.45);
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.9);
    keyLight.position.set(5.5, 7.5, 9.0);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffead0, 0.98);
    fillLight.position.set(-7.0, 2.5, 6.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.72);
    rimLight.position.set(0, -6.0, 5.0);
    scene.add(rimLight);

    // Root Classroom Board Group (100% STATIC)
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const teakWoodTex = createTeakWoodTexture(maxAnisotropy);
    disposableTextures.push(teakWoodTex);

    const outerFrameGeo = createRoundedBoxGeometry(
      13.6,
      7.6,
      0.34,
      0.22,
      isSoftwareGl ? 2 : 4
    );
    disposableGeometries.push(outerFrameGeo);
    const outerFrameMat = new THREE.MeshStandardMaterial({
      map: teakWoodTex,
      color: 0xffffff,
      roughness: 0.44,
      metalness: 0.06,
    });
    disposableMaterials.push(outerFrameMat);
    const outerFrameMesh = new THREE.Mesh(outerFrameGeo, outerFrameMat);
    outerFrameMesh.position.set(0, 0, -0.2);
    outerFrameMesh.receiveShadow = true;
    boardGroup.add(outerFrameMesh);

    const innerTrimGeo = createRoundedBoxGeometry(13.15, 7.15, 0.36, 0.16, 2);
    disposableGeometries.push(innerTrimGeo);
    const innerTrimMat = new THREE.MeshStandardMaterial({
      color: 0x72401d,
      roughness: 0.48,
      metalness: 0.08,
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
      roughness: 0.56,
      metalness: 0.02,
    });
    disposableMaterials.push(surfaceMat);
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    // Letakkan permukaan papan di z = 0.0 agar kertas di z = 0.24+ tidak pernah terpotong
    surfaceMesh.position.set(0, 0, 0.0);
    surfaceMesh.receiveShadow = true;
    boardGroup.add(surfaceMesh);

    // Untaian Lampu Pijar Hangat & Magnet Warna-Warni di Bingkai Atas
    const bulbGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const bulbHaloGeo = new THREE.CircleGeometry(0.26, 16);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe69c });
    const bulbHaloMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    });
    const wirePoints: THREE.Vector3[] = [];
    disposableGeometries.push(bulbGeo, bulbHaloGeo);
    disposableMaterials.push(bulbMat, bulbHaloMat);
    for (let bx = -5.8; bx <= 5.8; bx += 1.16) {
      const sag = Math.cos((bx / 5.8) * Math.PI * 2) * 0.08;
      const by = 3.46 - sag;
      wirePoints.push(new THREE.Vector3(bx, by + 0.06, 0.14));
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(bx, by, 0.16);
      boardGroup.add(bulb);

      const halo = new THREE.Mesh(bulbHaloGeo, bulbHaloMat);
      halo.position.set(bx, by, 0.06);
      boardGroup.add(halo);
    }
    const wireCurve = new THREE.CatmullRomCurve3(wirePoints);
    const wireGeo = new THREE.TubeGeometry(wireCurve, 44, 0.014, 6, false);
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x3b2818, roughness: 0.6 });
    disposableGeometries.push(wireGeo);
    disposableMaterials.push(wireMat);
    boardGroup.add(new THREE.Mesh(wireGeo, wireMat));

    // 2 Magnet Bulat Warna-Warni di Sudut Atas Papan
    const magnetGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20);
    magnetGeo.rotateX(Math.PI / 2);
    const blueMagnetMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.25 });
    const coralMagnetMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.25 });
    disposableGeometries.push(magnetGeo);
    disposableMaterials.push(blueMagnetMat, coralMagnetMat);
    const magLeft = new THREE.Mesh(magnetGeo, blueMagnetMat);
    magLeft.position.set(-5.95, 3.05, 0.05);
    const magRight = new THREE.Mesh(magnetGeo, coralMagnetMat);
    magRight.position.set(5.95, 3.05, 0.05);
    boardGroup.add(magLeft, magRight);

    updateBoardFinishRef.current = (mode: "whiteboard" | "chalkboard") => {
      surfaceMat.map = mode === "whiteboard" ? whiteboardTex : chalkboardTex;
      outerFrameMat.color.setHex(mode === "whiteboard" ? 0xffffff : 0xead4ba);
      innerTrimMat.color.setHex(mode === "whiteboard" ? 0x72401d : 0x572f14);
      surfaceMat.needsUpdate = true;
    };
    updateBoardFinishRef.current(boardFinishRef.current);

    // Rak Spidol + Penghapus Biru Klasik + 4 Spidol Warna-Warni (Biru, Merah, Hijau, Oranye)
    const trayGeo = createRoundedBoxGeometry(6.3, 0.22, 0.55, 0.06, 2);
    disposableGeometries.push(trayGeo);
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.28,
      metalness: 0.38,
    });
    disposableMaterials.push(trayMat);
    const trayMesh = new THREE.Mesh(trayGeo, trayMat);
    trayMesh.position.set(0, -3.62, 0.22);
    boardGroup.add(trayMesh);

    const eraserTopGeo = createRoundedBoxGeometry(0.95, 0.24, 0.36, 0.05, 2);
    const eraserFeltGeo = createRoundedBoxGeometry(0.95, 0.09, 0.36, 0.02, 2);
    disposableGeometries.push(eraserTopGeo, eraserFeltGeo);
    const eraserTopMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.35,
    });
    const eraserFeltMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
    });
    disposableMaterials.push(eraserTopMat, eraserFeltMat);

    const eraserTop = new THREE.Mesh(eraserTopGeo, eraserTopMat);
    eraserTop.position.set(-2.15, -3.41, 0.28);
    boardGroup.add(eraserTop);

    const eraserFelt = new THREE.Mesh(eraserFeltGeo, eraserFeltMat);
    eraserFelt.position.set(-2.15, -3.51, 0.28);
    boardGroup.add(eraserFelt);

    const markerBodyGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.88, 14);
    markerBodyGeo.rotateZ(Math.PI / 2);
    const markerCapGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.26, 14);
    markerCapGeo.rotateZ(Math.PI / 2);
    disposableGeometries.push(markerBodyGeo, markerCapGeo);

    const whiteMarkerMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.22,
    });
    const blueCapMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.28 });
    const redCapMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28 });
    const greenCapMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.28 });
    const amberCapMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28 });
    disposableMaterials.push(whiteMarkerMat, blueCapMat, redCapMat, greenCapMat, amberCapMat);

    const marker1Body = new THREE.Mesh(markerBodyGeo, whiteMarkerMat);
    marker1Body.position.set(-0.55, -3.45, 0.28);
    const marker1Cap = new THREE.Mesh(markerCapGeo, blueCapMat);
    marker1Cap.position.set(-0.98, -3.45, 0.28);
    boardGroup.add(marker1Body, marker1Cap);

    const marker2Body = new THREE.Mesh(markerBodyGeo, whiteMarkerMat);
    marker2Body.position.set(0.62, -3.45, 0.31);
    marker2Body.rotation.y = 0.05;
    const marker2Cap = new THREE.Mesh(markerCapGeo, redCapMat);
    marker2Cap.position.set(0.19, -3.45, 0.31);
    boardGroup.add(marker2Body, marker2Cap);

    const marker3Body = new THREE.Mesh(markerBodyGeo, whiteMarkerMat);
    marker3Body.position.set(1.78, -3.45, 0.29);
    marker3Body.rotation.y = -0.04;
    const marker3Cap = new THREE.Mesh(markerCapGeo, greenCapMat);
    marker3Cap.position.set(1.35, -3.45, 0.29);
    boardGroup.add(marker3Body, marker3Cap);

    const marker4Body = new THREE.Mesh(markerBodyGeo, whiteMarkerMat);
    marker4Body.position.set(2.86, -3.45, 0.27);
    marker4Body.rotation.y = 0.03;
    const marker4Cap = new THREE.Mesh(markerCapGeo, amberCapMat);
    marker4Cap.position.set(2.43, -3.45, 0.27);
    boardGroup.add(marker4Body, marker4Cap);

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
      color: 0xc9c4b8,
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
        color: 0x161614,
        transparent: true,
        opacity: 0.14,
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
    syncNotesContentRef.current(orderedStudents, poses, zoomColorOverride);

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
  }, [noteCount, viewMode]);

  const hoveredStudent =
    hoveredIndex !== null ? (orderedStudents[hoveredIndex] ?? null) : null;
  const activeSpotlightIdx =
    zoomedIndex !== null && zoomedIndex < orderedStudents.length
      ? zoomedIndex
      : 0;
  const spotlightStudent =
    orderedStudents[activeSpotlightIdx] ?? orderedStudents[0] ?? null;
  const spotlightPose =
    poses[activeSpotlightIdx] ?? poses[0] ?? null;
  const zoomedStudent =
    viewMode === "board3d" && zoomedIndex !== null
      ? (orderedStudents[zoomedIndex] ?? null)
      : null;
  const zoomedPose =
    viewMode === "board3d" && zoomedIndex !== null
      ? (poses[zoomedIndex] ?? null)
      : null;

  const filteredIndexedStudents = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orderedStudents
      .map((student, idx) => ({ student, idx, pose: poses[idx] }))
      .filter(({ student }) => {
        if (!q) return true;
        return (
          student.name.toLowerCase().includes(q) ||
          (student.nickname || "").toLowerCase().includes(q) ||
          student.dream_title.toLowerCase().includes(q) ||
          student.dream_reason.toLowerCase().includes(q)
        );
      });
  }, [orderedStudents, poses, searchQuery]);

  const handleCycleZoomPaperColor = () => {
    const target = zoomedStudent ?? spotlightStudent;
    const targetPose = zoomedPose ?? spotlightPose;
    if (!target) return;
    const currentHex =
      zoomColorOverride[target.id] ||
      targetPose?.paperColorHex ||
      DEFAULT_PAPER_HEX;
    const currentIdx = DREAM_PAPER_PALETTE.findIndex(
      (p) => p.hex.toLowerCase() === currentHex.toLowerCase()
    );
    const nextPalette =
      DREAM_PAPER_PALETTE[(currentIdx + 1) % DREAM_PAPER_PALETTE.length];
    const nextHex = nextPalette?.hex ?? DEFAULT_PAPER_HEX;

    setZoomColorOverride((prev) => ({
      ...prev,
      [target.id]: nextHex,
    }));
    updatePaperColorRef.current(target.id, nextHex);
  };

  const handleToggleBoardFinish = () => {
    const nextMode =
      boardFinish === "whiteboard" ? "chalkboard" : "whiteboard";
    setBoardFinish(nextMode);
    updateBoardFinishRef.current(nextMode);
  };

  const activePaperHex =
    spotlightStudent && spotlightPose
      ? zoomColorOverride[spotlightStudent.id] || spotlightPose.paperColorHex
      : DEFAULT_PAPER_HEX;
  const activePaperName =
    DREAM_PAPER_PALETTE.find(
      (p) => p.hex.toLowerCase() === activePaperHex.toLowerCase()
    )?.name ??
    spotlightPose?.paperColorName ??
    "Krem Klasik";

  return (
    <section
      id="papan-cita-cita"
      aria-labelledby="heading-papan-cita-cita"
      className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
    >
      {/* Top Editorial Header & High-Contrast Control Bar */}
      <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            ARSIP IMPIAN · XII PPLG 1 · MAKN ENDE
          </p>
          <h1
            id="heading-papan-cita-cita"
            className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]"
          >
            Papan Cita-Cita &amp; Harapan.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Catatan target masa depan angkatan UNO. Pilih kartu catatan untuk
            membaca alasan lengkap atau kirim doa semangat untuk sahabatmu.
          </p>
        </div>

        {/* High-Contrast Interactive Controls (Search + Bento/3D Toggle + Create Button) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-60 sm:flex-initial">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau cita-cita..."
              aria-label="Cari nama siswa atau cita-cita"
              className="h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </div>

          <div
            role="group"
            aria-label="Pilih mode tampilan papan cita-cita"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-card p-1"
          >
            <button
              type="button"
              onClick={() => setViewMode("bento")}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                viewMode === "bento"
                  ? "bg-[#141413] text-[#F3F1EA] dark:bg-[#F3F1EA] dark:text-[#141413]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span>Bento Board</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("board3d");
                setZoomedIndex(null);
              }}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                viewMode === "board3d"
                  ? "bg-[#141413] text-[#F3F1EA] dark:bg-[#F3F1EA] dark:text-[#141413]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Box className="size-3.5" />
              <span>Papan 3D</span>
            </button>
          </div>

          {onOpenSubmitDreamModal && (
            <button
              type="button"
              onClick={onOpenSubmitDreamModal}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#141413] px-4 text-xs font-semibold text-[#F3F1EA] shadow-xs transition hover:opacity-90 dark:bg-[#F3F1EA] dark:text-[#141413]"
            >
              <Plus className="size-4" />
              <span>Tempel Cita-Cita</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 12-Column Asymmetric Bento Grid (Inspired by iDraft & Nexus References) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* LEFT COLUMN (4 Cols): High-Contrast Dark Overview Card + Spotlight Reader Card */}
        <div className="space-y-5 lg:col-span-4 lg:sticky lg:top-24">
          {/* Card 1: Dark Overview Bento Card (iDraft "Overall Information" Style) */}
          <div className="rounded-3xl border border-[#2A2926] bg-[#141413] p-6 text-[#F3F1EA] shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <span className="font-serif text-base font-bold tracking-tight text-[#F3F1EA]">
                Ringkasan Impian
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#A8A49B]">
                XII PPLG 1 · &apos;27
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-b border-white/10 pb-5">
              <div className=" flex items-baseline gap-2.5">
                <span className="font-mono text-4xl font-bold tabular-nums tracking-tight text-[#F3F1EA]">
                  {orderedStudents.length}
                </span>
                <span className="text-xs leading-tight text-[#A8A49B]">
                  Kertas impian
                  <br />
                  tertempel
                </span>
              </div>
              <div className="flex items-baseline gap-2.5 border-l border-white/10 pl-4">
                <span className="font-mono text-4xl font-bold tabular-nums tracking-tight text-[#F3F1EA]">
                  {filteredIndexedStudents.length}
                </span>
                <span className="text-xs leading-tight text-[#A8A49B]">
                  Catatan
                  <br />
                  ditampilkan
                </span>
              </div>
            </div>

            {/* 3 Sub-cards inside the Dark Card (Matching iDraft 28/14/11 Sub-cards) */}
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-[#22211F] px-3 py-3.5 text-center border border-white/8">
                <p className="font-mono text-xl font-bold tabular-nums text-[#F3F1EA]">
                  {orderedStudents.length}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#A8A49B]">
                  Siswa UNO
                </p>
              </div>
              <div className="rounded-2xl bg-[#22211F] px-3 py-3.5 text-center border border-white/8">
                <p className="font-mono text-xl font-bold tabular-nums text-[#F3F1EA]">
                  2027
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#A8A49B]">
                  Target Lulus
                </p>
              </div>
              <div className="rounded-2xl bg-[#F3F1EA] px-3 py-3.5 text-center text-[#141413]">
                <p className="font-mono text-xl font-bold tabular-nums">
                  #{String(spotlightStudent?.roll_no ?? 1).padStart(2, "0")}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold opacity-75">
                  Sorotan Aktif
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Active Spotlight Note Reader Card */}
          {spotlightStudent && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={spotlightStudent.avatar_url}
                    alt={spotlightStudent.name}
                    width={44}
                    height={44}
                    referrerPolicy="no-referrer"
                    className="public-film-photo size-11 shrink-0 rounded-xl border border-border object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      ABSEN #{String(spotlightStudent.roll_no).padStart(2, "0")}{" "}
                      · {spotlightStudent.role}
                    </p>
                    <h2 className="truncate font-serif text-lg font-bold text-foreground">
                      {spotlightStudent.name}
                    </h2>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCycleZoomPaperColor}
                    title={`Warna kertas: ${activePaperName}`}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-secondary/70 text-muted-foreground transition hover:text-foreground"
                  >
                    <Shuffle className="size-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditingModal) {
                          setEditTitle(spotlightStudent.dream_title);
                          setEditReason(spotlightStudent.dream_reason);
                          setEditDesc(spotlightStudent.dream_description);
                          setEditCapsule(
                            spotlightStudent.capsule_message ||
                              `Kapsul Waktu 2027 — Sampai bertemu lagi sebagai ${spotlightStudent.dream_title}!`
                          );
                          setEditColor(activePaperHex);
                        }
                        setIsEditingModal((v) => !v);
                      }}
                      aria-label="Sunting catatan mimpi"
                      className="inline-flex size-8 items-center justify-center rounded-lg bg-[#141413] text-[#F3F1EA] dark:bg-[#F3F1EA] dark:text-[#141413]"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {statusNotice && (
                <p className="mt-3 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground">
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
                      await onUpdateStudentDream(spotlightStudent.id, {
                        dream_title: editTitle,
                        dream_reason: editReason,
                        dream_description: editDesc,
                        dream_paper_color: editColor,
                        capsule_message: editCapsule,
                      });
                      setZoomColorOverride((prev) => ({
                        ...prev,
                        [spotlightStudent.id]: editColor,
                      }));
                      updatePaperColorRef.current(
                        spotlightStudent.id,
                        editColor
                      );
                      setIsEditingModal(false);
                      setStatusNotice(
                        `Catatan mimpi ${spotlightStudent.name} berhasil disimpan!`
                      );
                    } catch {
                      setStatusNotice(
                        "Gagal menyimpan perubahan catatan mimpi."
                      );
                    } finally {
                      setIsSavingEdit(false);
                    }
                  }}
                  className="mt-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-xs font-bold text-foreground">
                      Sunting Catatan Impian
                    </span>
                    {onResetStudentDream && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await onResetStudentDream(spotlightStudent.id);
                            setZoomColorOverride((prev) => {
                              const next = { ...prev };
                              delete next[spotlightStudent.id];
                              return next;
                            });
                            setIsEditingModal(false);
                          } catch {
                            setStatusNotice("Gagal mereset catatan mimpi.");
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
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
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground"
                  />
                  <textarea
                    rows={3}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground"
                  />
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#141413] px-3 text-xs font-semibold text-[#F3F1EA] dark:bg-[#F3F1EA] dark:text-[#141413]"
                  >
                    <Save className="size-3.5" />
                    <span>Simpan Perubahan</span>
                  </button>
                </form>
              ) : (
                <>
                  {/* Highlighted Paper Quote Box */}
                  <div
                    style={{ backgroundColor: activePaperHex }}
                    className="mt-4 rounded-2xl border border-[#1B1B1A]/15 p-4 text-[#1B1B1A] shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#1B1B1A]/65">
                      <span>CITA-CITA UTAMA</span>
                      <span>KERTAS {activePaperName.toUpperCase()}</span>
                    </div>
                    <p className="mt-1.5 font-serif text-xl font-bold leading-snug text-[#1B1B1A]">
                      &ldquo;{spotlightStudent.dream_title}&rdquo;
                    </p>
                    <p className="mt-2 border-t border-[#1B1B1A]/15 pt-2 text-xs leading-relaxed text-[#1B1B1A]/85">
                      &ldquo;{spotlightStudent.dream_reason}&rdquo;
                    </p>
                  </div>

                  {spotlightStudent.dream_description && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {spotlightStudent.dream_description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    {onOpenCheerModal && (
                      <button
                        type="button"
                        onClick={() => onOpenCheerModal(spotlightStudent)}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#141413] px-4 text-xs font-semibold text-[#F3F1EA] transition hover:opacity-90 dark:bg-[#F3F1EA] dark:text-[#141413]"
                      >
                        <MessageSquareHeart className="size-3.5" />
                        <span>
                          Tulis Doa untuk{" "}
                          {spotlightStudent.nickname ||
                            spotlightStudent.name.split(" ")[0]}
                        </span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Prev / Next Navigation Bar */}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingModal(false);
                    setZoomedIndex(
                      (activeSpotlightIdx - 1 + orderedStudents.length) %
                        Math.max(1, orderedStudents.length)
                    );
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <span className="font-mono text-xs font-bold tabular-nums text-muted-foreground">
                  {String(activeSpotlightIdx + 1).padStart(2, "0")} /{" "}
                  {String(orderedStudents.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingModal(false);
                    setZoomedIndex(
                      (activeSpotlightIdx + 1) %
                        Math.max(1, orderedStudents.length)
                    );
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (8 Cols): Interactive Bento Board OR Optional 3D Classroom Board */}
        <div className="lg:col-span-8">
          {viewMode === "bento" ? (
            <div className="space-y-4">
              {/* Subheader Bar (iDraft "Task In process (3)" style) */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg font-bold text-foreground sm:text-xl">
                    Kertas Cita-Cita Siswa ({filteredIndexedStudents.length})
                  </h2>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  Klik kartu untuk sorot · Tombol sudut untuk kirim doa
                </span>
              </div>

              {filteredIndexedStudents.length === 0 ? (
                <div className="rounded-3xl border border-border bg-card p-10 text-center">
                  <p className="font-serif text-lg font-bold text-foreground">
                    Tidak ada kertas cita-cita yang cocok
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Coba kata kunci pencarian lain atau tempel kertas cita-cita
                    baru.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filteredIndexedStudents.map(({ student: st, idx, pose }) => {
                    const isSelected = activeSpotlightIdx === idx;
                    const paperHex =
                      zoomColorOverride[st.id] ||
                      st.dream_paper_color ||
                      pose?.paperColorHex ||
                      DEFAULT_PAPER_HEX;
                    const paperLabel =
                      DREAM_PAPER_PALETTE.find(
                        (p) => p.hex.toLowerCase() === paperHex.toLowerCase()
                      )?.name ?? "Krem Klasik";

                    return (
                      <motion.article
                        key={st.id}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.18 }}
                        data-testid={`dream-note-btn-${st.roll_no}`}
                        onClick={() => {
                          setIsEditingModal(false);
                          setZoomedIndex(idx);
                        }}
                        className={`group relative flex cursor-pointer flex-col justify-between rounded-3xl border p-5 transition-all ${
                          isSelected
                            ? "border-[#141413] bg-card ring-2 ring-[#141413] shadow-md dark:border-[#F3F1EA] dark:ring-[#F3F1EA]"
                            : "border-border bg-card/95 shadow-2xs hover:border-foreground/45 hover:shadow-sm"
                        }`}
                      >
                        {/* Top Bar: Number Swatch + Student Identity + Action Corner */}
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                style={{ backgroundColor: paperHex }}
                                className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#1B1B1A]/15 font-mono text-xs font-bold tabular-nums text-[#1B1B1A] shadow-2xs"
                              >
                                #{String(st.roll_no).padStart(2, "0")}
                              </span>
                              <div className="min-w-0">
                                <h3 className="truncate font-serif text-base font-bold text-foreground">
                                  {st.name}
                                </h3>
                                <p className="truncate font-mono text-[11px] text-muted-foreground">
                                  {st.nickname || st.name.split(" ")[0]} ·{" "}
                                  {st.role}
                                </p>
                              </div>
                            </div>

                            {onOpenCheerModal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCheerModal(st);
                                }}
                                title={`Kirim doa semangat untuk ${st.name}`}
                                aria-label={`Kirim doa semangat untuk ${st.name}`}
                                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#141413] text-[#F3F1EA] transition hover:scale-105 dark:bg-[#F3F1EA] dark:text-[#141413]"
                              >
                                <MessageSquareHeart className="size-4" />
                              </button>
                            )}
                          </div>

                          {/* Middle Body: Dream Title & Reason */}
                          <div className="mt-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              TARGET MASA DEPAN
                            </p>
                            <p className="mt-1 font-serif text-xl font-bold leading-snug text-foreground">
                              &ldquo;{st.dream_title}&rdquo;
                            </p>
                            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                              {st.dream_reason}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Metadata Footer */}
                        <div className="mt-5 flex items-center justify-between border-t border-border/80 pt-3 text-xs">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            Kertas {paperLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <span>{isSelected ? "Sedang Disorot" : "Baca Detail"}</span>
                            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </span>
                        </div>
                      </motion.article>
                    );
                  })}

                  {/* Dashed "+ Tempel Cita-Cita Baru" Bento Card (Matching iDraft "+ Add task" Card) */}
                  {onOpenSubmitDreamModal && (
                    <button
                      type="button"
                      onClick={onOpenSubmitDreamModal}
                      className="group flex min-h-[210px] flex-col items-center justify-center gap-2.5 rounded-3xl border-2 border-dashed border-border bg-card/45 p-6 text-center transition hover:border-foreground hover:bg-card"
                    >
                      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#141413] text-[#F3F1EA] transition group-hover:scale-105 dark:bg-[#F3F1EA] dark:text-[#141413]">
                        <Plus className="size-5" />
                      </span>
                      <div>
                        <p className="font-serif text-base font-bold text-foreground">
                          + Tempel Cita-Cita Baru
                        </p>
                        <p className="mt-0.5 max-w-[220px] text-xs text-muted-foreground">
                          Tulis atau perbarui kertas impianmu di papan kelas XII
                          PPLG 1
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* OPTIONAL 3D BOARD VIEWPORT */
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-serif text-base font-bold text-foreground">
                    Simulasi Papan Kelas 3D
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Klik kertas catatan di papan tulis 3D untuk fokus membaca.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleBoardFinish}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground hover:bg-muted"
                  >
                    <Layers className="size-3.5" />
                    <span>
                      {boardFinish === "whiteboard"
                        ? "Papan Putih"
                        : "Papan Hijau"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("bento")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#141413] px-3 text-xs font-semibold text-[#F3F1EA] dark:bg-[#F3F1EA] dark:text-[#141413]"
                  >
                    <LayoutGrid className="size-3.5" />
                    <span>Kembali ke Bento</span>
                  </button>
                </div>
              </div>

              <div
                onPointerMove={(e) => {
                  if (!css3dFallback) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                  const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
                  setCssTilt({
                    rx: -ny * 4.5,
                    ry: nx * 5.5,
                  });
                }}
                onPointerLeave={() => {
                  if (css3dFallback) {
                    setCssTilt({ rx: 0, ry: 0 });
                    setHoveredIndex(null);
                  }
                }}
                style={{ perspective: "1200px" }}
                className="relative h-[460px] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#FFFDF7] via-[#FBF2DC] to-[#EFE1C2] shadow-inner sm:h-[520px] dark:from-[#2C241C] dark:via-[#241D16] dark:to-[#30271E]"
              >
                <div
                  ref={mountRef}
                  className={`relative z-[2] h-full w-full ${
                    css3dFallback ? "hidden" : "block"
                  }`}
                  aria-label="Kanvas 3D Papan Tulis Cita-Cita Siswa XII PPLG 1"
                />

                {css3dFallback && (
                  <div className="relative z-[3] flex h-full w-full items-center justify-center p-3 sm:p-5">
                    {/* Interactive 3D Perspective Classroom Board Engine */}
                    <div
                      style={{
                        transformStyle: "preserve-3d",
                        transform: `rotateX(${cssTilt.rx}deg) rotateY(${cssTilt.ry}deg)`,
                        transition: "transform 160ms ease-out",
                      }}
                      className={`relative flex h-full w-full flex-col justify-between rounded-2xl border-[10px] sm:border-[14px] border-[#9C602E] p-3 sm:p-5 shadow-[0_24px_48px_rgba(24,18,12,0.32),inset_0_2px_10px_rgba(0,0,0,0.22)] ${
                        boardFinish === "whiteboard"
                          ? "bg-[#F9FBFE] text-[#1E293B]"
                          : "bg-[#18432F] text-[#F8F3E2]"
                      }`}
                    >
                      {/* String Lights & Magnetic Pins Header on the 3D Board */}
                      <div
                        style={{ transform: "translateZ(16px)" }}
                        className="relative flex items-center justify-between border-b border-current/15 pb-2"
                      >
                        <span className="inline-flex size-4 rounded-full bg-blue-600 shadow-md ring-2 ring-white/50" />
                        <div className="flex flex-col items-center text-center">
                          <div className="mb-1 flex items-center gap-2.5">
                            {Array.from({ length: 9 }).map((_, bIdx) => (
                              <span
                                key={bIdx}
                                className="inline-block size-2 rounded-full bg-[#FFE69C] shadow-[0_0_8px_#F59E0B]"
                              />
                            ))}
                          </div>
                          <p className="font-serif text-[11px] sm:text-xs font-bold tracking-wide opacity-90">
                            XII PPLG 1 — MAKN Ende · Papan Impian &amp; Harapan Masa Depan
                          </p>
                        </div>
                        <span className="inline-flex size-4 rounded-full bg-rose-600 shadow-md ring-2 ring-white/50" />
                      </div>

                      {/* 3D Pinned Sticky Notes Grid inside the 3D Board */}
                      <div
                        style={{ transformStyle: "preserve-3d" }}
                        className="no-scrollbar my-2 grid flex-1 grid-cols-2 gap-2.5 overflow-y-auto p-1.5 sm:grid-cols-3 md:grid-cols-4"
                      >
                        {orderedStudents.map((st, idx) => {
                          const pose = poses[idx];
                          const isZoom = activeSpotlightIdx === idx;
                          const isHov = hoveredIndex === idx;
                          const paperHex =
                            zoomColorOverride[st.id] ||
                            st.dream_paper_color ||
                            pose?.paperColorHex ||
                            DEFAULT_PAPER_HEX;
                          const pinHex = pose?.pinColorHex || "#E11D48";
                          const rotDeg = ((pose?.rotZRad ?? 0) * 180) / Math.PI;
                          const shortName =
                            st.nickname || st.name.split(" ")[0] || st.name;

                          return (
                            <button
                              key={st.id}
                              type="button"
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              onClick={() => {
                                setIsEditingModal(false);
                                setZoomedIndex(idx);
                              }}
                              style={{
                                backgroundColor: paperHex,
                                transform: isZoom
                                  ? "translateZ(42px) scale(1.06) rotateZ(0deg)"
                                  : isHov
                                    ? "translateZ(26px) scale(1.04) rotateZ(0deg)"
                                    : `translateZ(10px) rotateZ(${rotDeg.toFixed(1)}deg)`,
                                transition:
                                  "transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease",
                              }}
                              className={`group relative flex flex-col justify-between rounded-xl border border-[#1B1B1A]/15 p-2.5 text-left text-[#1B1B1A] ${
                                isZoom
                                  ? "ring-2 ring-[#141413] shadow-[0_18px_32px_rgba(0,0,0,0.32)]"
                                  : "shadow-[0_8px_16px_rgba(0,0,0,0.18)] hover:shadow-[0_14px_24px_rgba(0,0,0,0.26)]"
                              }`}
                            >
                              {/* 3D Pushpin Head */}
                              <span
                                style={{ backgroundColor: pinHex }}
                                className="mx-auto -mt-1 mb-1 inline-block size-3 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.35)] ring-1 ring-white/60"
                              />
                              <div>
                                <p className="truncate font-mono text-[10px] font-bold text-[#1E2633]">
                                  #{String(st.roll_no).padStart(2, "0")} ·{" "}
                                  {shortName}
                                </p>
                                <div
                                  style={{ backgroundColor: pinHex }}
                                  className="my-1 h-0.5 w-10 rounded-full opacity-75"
                                />
                                <p className="line-clamp-2 font-serif text-xs font-bold leading-snug text-[#1B1B1A]">
                                  {st.dream_title}
                                </p>
                              </div>
                              <p className="mt-1.5 truncate font-mono text-[9px] uppercase tracking-wider text-[#52493F]">
                                {st.role}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* 3D Aluminum Marker Tray + Blue Eraser + 4 Colored Markers */}
                      <div
                        style={{ transform: "translateZ(20px)" }}
                        className="mx-auto flex w-4/5 max-w-md items-center justify-between rounded-lg border border-slate-400/60 bg-gradient-to-b from-slate-200 to-slate-300 px-3 py-1 shadow-md"
                      >
                        {/* Blue Eraser */}
                        <span className="inline-block h-2.5 w-10 rounded-xs border-b-2 border-slate-800 bg-blue-600 shadow-2xs" />
                        {/* 4 Markers */}
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-1.5 w-8 overflow-hidden rounded-full bg-white shadow-2xs">
                            <span className="h-full w-2.5 bg-blue-600" />
                          </span>
                          <span className="inline-flex h-1.5 w-8 overflow-hidden rounded-full bg-white shadow-2xs">
                            <span className="h-full w-2.5 bg-red-600" />
                          </span>
                          <span className="inline-flex h-1.5 w-8 overflow-hidden rounded-full bg-white shadow-2xs">
                            <span className="h-full w-2.5 bg-green-600" />
                          </span>
                          <span className="inline-flex h-1.5 w-8 overflow-hidden rounded-full bg-white shadow-2xs">
                            <span className="h-full w-2.5 bg-amber-600" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {hoveredStudent && !zoomedStudent && hoverScreenPos && !css3dFallback && (
                    <motion.div
                      key={`hover-tip-${hoveredStudent.id}`}
                      initial={{ opacity: 0, scale: 0.9, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.14 }}
                      data-testid="floating-hover-prompt"
                      style={{
                        left: `${hoverScreenPos.x}px`,
                        top: `${hoverScreenPos.y}px`,
                      }}
                      className="pointer-events-none absolute z-20 max-w-[90%] -translate-x-1/2 -translate-y-full"
                    >
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/95 px-3 py-1.5 font-sans text-xs font-semibold text-card-foreground shadow-md backdrop-blur-md">
                        <span>
                          Klik untuk sorot catatan {hoveredStudent.name} →
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export const ClassDreamBoard3D = DreamBoardSection;

