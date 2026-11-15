import { DREAM_PAPER_PALETTE, type StudentRecord } from "@/lib/class-data";

export interface DreamNoteBoardPose {
  studentId: string;
  x: number;
  y: number;
  z: number;
  rotZRad: number;
  swayPhase: number;
  paperColorHex: string;
  paperColorName: string;
  pinColorHex: string;
}

/**
 * Computes deterministic 3D board positions for the 22 student dream notes
 * arranged in a balanced 6x4 classroom board grid.
 */
export function computeDreamBoardLayout(
  students: StudentRecord[]
): DreamNoteBoardPose[] {
  const cols = 6;
  const colSpacing = 1.98;
  const rowSpacing = 1.48;

  return students.map((student, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    // Center the last row if it has fewer than 6 items (e.g. 4 items on row 3)
    const itemsInRow = Math.min(cols, students.length - row * cols);
    const rowWidth = (itemsInRow - 1) * colSpacing;
    const startX = -rowWidth / 2;

    const jitterX = (((idx * 37) % 11) - 5) * 0.012;
    const jitterY = (((idx * 53) % 11) - 5) * 0.01;
    const rotDeg = (((idx * 29) % 9) - 4) * 0.65;

    const palette =
      DREAM_PAPER_PALETTE.find(
        (p) =>
          student.dream_paper_color &&
          p.hex.toLowerCase() === student.dream_paper_color.toLowerCase()
      ) ??
      DREAM_PAPER_PALETTE[idx % DREAM_PAPER_PALETTE.length] ??
      DREAM_PAPER_PALETTE[0]!;

    return {
      studentId: student.id,
      x: startX + col * colSpacing + jitterX,
      y: 2.12 - row * rowSpacing + jitterY,
      z: 0.24 + (idx % 3) * 0.014,
      rotZRad: (rotDeg * Math.PI) / 180,
      swayPhase: idx * 0.75,
      paperColorHex: student.dream_paper_color || palette.hex,
      paperColorName: palette.name,
      pinColorHex: palette.pinHex,
    };
  });
}
