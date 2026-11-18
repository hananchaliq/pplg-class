import { StageCurtainLoader } from "@/components/three/stage-curtain-loader";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Memuat halaman..."
      className="min-h-[70vh] w-full"
    >
      <StageCurtainLoader
        fullViewport
        ready={false}
        progress={26}
        label="Menyiapkan album kenangan XII PPLG 1..."
        sceneTitle="ALBUM MEMORIES · UNO XII PPLG 1"
      />
    </div>
  );
}
