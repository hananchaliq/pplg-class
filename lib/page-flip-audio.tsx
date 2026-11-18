"use client";

import * as React from "react";

interface PageFlipAudioContextValue {
  enabled: boolean;
  togglePageFlipSound: () => void;
  togglePageFlip: () => void;
  playPageFlip: () => void;
}

const PageFlipAudioContext = React.createContext<PageFlipAudioContextValue>({
  enabled: false,
  togglePageFlipSound: () => {},
  togglePageFlip: () => {},
  playPageFlip: () => {},
});

/**
 * Suara Lembaran Kertas Buku Tahunan (Default: MATI, tanpa autoplay).
 * Menggunakan sintesis Web Audio API lembut agar ringan tanpa file audio eksternal.
 */
export function PageFlipAudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = React.useState(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  const playPageFlip = React.useCallback(() => {
    if (!enabled || typeof window === "undefined") return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      const duration = 0.16;
      const sampleRate = ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const env = Math.sin(t * Math.PI) * Math.pow(1 - t, 1.3);
        data[i] = (Math.random() * 2 - 1) * env * 0.18;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1150, ctx.currentTime);
      filter.Q.setValueAtTime(1.4, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.14, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {
      // Abaikan jika browser memblokir Web Audio
    }
  }, [enabled]);

  const togglePageFlipSound = React.useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const value = React.useMemo(
    () => ({
      enabled,
      togglePageFlipSound,
      togglePageFlip: togglePageFlipSound,
      playPageFlip,
    }),
    [enabled, togglePageFlipSound, playPageFlip]
  );

  return (
    <PageFlipAudioContext.Provider value={value}>
      {children}
    </PageFlipAudioContext.Provider>
  );
}

export function usePageFlipSound() {
  return React.useContext(PageFlipAudioContext);
}
