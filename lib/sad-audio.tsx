"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Volume2, VolumeX, SkipForward, ExternalLink } from "lucide-react";
import { MOTION_EASE } from "@/lib/motion-tokens";

export interface SadTrack {
  id: string;
  youtubeId: string;
  youtubeUrl: string;
  title: string;
  subtitle: string;
  tempoMs: number;
  chords: Array<{
    pad: number[];
    melody: number[];
  }>;
}

export const SAD_TIKTOK_TRACKS: SadTrack[] = [
  {
    id: "yt-track-1",
    youtubeId: "cA7Gzh2ISL0",
    youtubeUrl: "https://www.youtube.com/watch?v=cA7Gzh2ISL0&list=RDcA7Gzh2ISL0&start_radio=1",
    title: "Lagu Perpisahan #1 — Kenangan Kita",
    subtitle: "YouTube Track 1 · cA7Gzh2ISL0",
    tempoMs: 520,
    chords: [
      {
        pad: [185.0, 220.0, 277.18],
        melody: [369.99, 440.0, 554.37, 659.25, 554.37, 440.0, 493.88, 369.99],
      },
      {
        pad: [146.83, 220.0, 277.18],
        melody: [293.66, 369.99, 440.0, 554.37, 493.88, 440.0, 369.99, 329.63],
      },
      {
        pad: [110.0, 220.0, 277.18],
        melody: [329.63, 440.0, 493.88, 554.37, 659.25, 554.37, 493.88, 440.0],
      },
      {
        pad: [164.81, 246.94, 329.63],
        melody: [329.63, 369.99, 440.0, 493.88, 440.0, 369.99, 329.63, 293.66],
      },
    ],
  },
  {
    id: "yt-track-2",
    youtubeId: "jo-JkKpjmwY",
    youtubeUrl: "https://www.youtube.com/watch?v=jo-JkKpjmwY&list=RDjo-JkKpjmwY&start_radio=1",
    title: "Lagu Perpisahan #2 — Cerita Masa Sekolah",
    subtitle: "YouTube Track 2 · jo-JkKpjmwY",
    tempoMs: 480,
    chords: [
      {
        pad: [110.0, 164.81, 220.0],
        melody: [440.0, 523.25, 659.25, 587.33, 523.25, 493.88, 440.0, 392.0],
      },
      {
        pad: [174.61, 220.0, 261.63],
        melody: [349.23, 440.0, 523.25, 659.25, 587.33, 523.25, 440.0, 349.23],
      },
      {
        pad: [130.81, 196.0, 261.63],
        melody: [392.0, 523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 392.0],
      },
      {
        pad: [98.0, 196.0, 246.94],
        melody: [392.0, 493.88, 587.33, 493.88, 440.0, 392.0, 329.63, 293.66],
      },
    ],
  },
  {
    id: "yt-track-3",
    youtubeId: "DrulgpXAGCA",
    youtubeUrl: "https://www.youtube.com/watch?v=DrulgpXAGCA&list=RDDrulgpXAGCA&start_radio=1",
    title: "Lagu Perpisahan #3 — Sampai Jumpa Kawan",
    subtitle: "YouTube Track 3 · DrulgpXAGCA",
    tempoMs: 560,
    chords: [
      {
        pad: [164.81, 196.0, 246.94],
        melody: [329.63, 392.0, 493.88, 587.33, 493.88, 392.0, 440.0, 329.63],
      },
      {
        pad: [130.81, 196.0, 246.94],
        melody: [261.63, 329.63, 392.0, 493.88, 440.0, 392.0, 329.63, 293.66],
      },
      {
        pad: [196.0, 246.94, 293.66],
        melody: [392.0, 493.88, 587.33, 659.25, 587.33, 493.88, 392.0, 329.63],
      },
      {
        pad: [146.83, 220.0, 293.66],
        melody: [293.66, 369.99, 440.0, 587.33, 493.88, 440.0, 369.99, 293.66],
      },
    ],
  },
];

interface YTPlayerInstance {
  playVideo?: () => void;
  pauseVideo?: () => void;
  loadVideoById?: (videoId: string) => void;
  cueVideoById?: (videoId: string) => void;
  setVolume?: (vol: number) => void;
  unMute?: () => void;
  destroy?: () => void;
}

interface SadAudioContextValue {
  playing: boolean;
  trackIndex: number;
  currentTrack: SadTrack;
  musicMenuOpen: boolean;
  toggleAudio: () => void;
  nextTrack: () => void;
  selectTrack: (idx: number) => void;
  toggleMusicMenu: () => void;
  closeMusicMenu: () => void;
}

const SadAudioContext = React.createContext<SadAudioContextValue>({
  playing: false,
  trackIndex: 0,
  currentTrack: SAD_TIKTOK_TRACKS[0]!,
  musicMenuOpen: false,
  toggleAudio: () => {},
  nextTrack: () => {},
  selectTrack: () => {},
  toggleMusicMenu: () => {},
  closeMusicMenu: () => {},
});

export function SadAudioProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = React.useState(false);
  const [trackIndex, setTrackIndex] = React.useState(0);
  const [musicMenuOpen, setMusicMenuOpen] = React.useState(false);
  const [ytActive, setYtActive] = React.useState(false);

  const ctxRef = React.useRef<AudioContext | null>(null);
  const timerRef = React.useRef<number>(0);
  const stepRef = React.useRef<number>(0);
  const ytPlayerRef = React.useRef<YTPlayerInstance | null>(null);
  const ytReadyRef = React.useRef(false);
  const ytBootRequestedRef = React.useRef(false);
  const playingRef = React.useRef(false);
  const trackIndexRef = React.useRef(0);
  const popoverRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    playingRef.current = playing;
    trackIndexRef.current = trackIndex;
  }, [playing, trackIndex]);

  const stopSynthEngine = React.useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = 0;
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
  }, []);

  const startSynthEngine = React.useCallback(
    (tIdx: number) => {
      stopSynthEngine();
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        ctxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.45, ctx.currentTime);

        const delayNode = ctx.createDelay(1.0);
        delayNode.delayTime.setValueAtTime(0.38, ctx.currentTime);
        const feedbackGain = ctx.createGain();
        feedbackGain.gain.setValueAtTime(0.42, ctx.currentTime);
        const reverbFilter = ctx.createBiquadFilter();
        reverbFilter.type = "lowpass";
        reverbFilter.frequency.setValueAtTime(1600, ctx.currentTime);

        delayNode.connect(reverbFilter);
        reverbFilter.connect(feedbackGain);
        feedbackGain.connect(delayNode);

        masterGain.connect(ctx.destination);
        masterGain.connect(delayNode);
        delayNode.connect(ctx.destination);

        const track = SAD_TIKTOK_TRACKS[tIdx % SAD_TIKTOK_TRACKS.length]!;
        stepRef.current = 0;

        const playStep = () => {
          if (!ctxRef.current || ctxRef.current.state !== "running") return;
          const now = ctx.currentTime;
          const s = stepRef.current;
          const chordIdx = Math.floor(s / 8) % track.chords.length;
          const noteInBar = s % 8;
          const chord = track.chords[chordIdx]!;

          if (noteInBar === 0) {
            chord.pad.forEach((freq, i) => {
              const padOsc = ctx.createOscillator();
              const padSub = ctx.createOscillator();
              const padFilter = ctx.createBiquadFilter();
              const padGain = ctx.createGain();

              padOsc.type = "sawtooth";
              padSub.type = "triangle";
              padOsc.frequency.setValueAtTime(freq, now);
              padSub.frequency.setValueAtTime(freq * 1.003, now);

              padFilter.type = "lowpass";
              padFilter.frequency.setValueAtTime(680 + i * 120, now);

              const barDur = (track.tempoMs * 8) / 1000;
              padGain.gain.setValueAtTime(0.0005, now);
              padGain.gain.linearRampToValueAtTime(0.028, now + 0.85);
              padGain.gain.exponentialRampToValueAtTime(0.001, now + barDur + 0.6);

              padOsc.connect(padFilter);
              padSub.connect(padFilter);
              padFilter.connect(padGain);
              padGain.connect(masterGain);

              padOsc.start(now);
              padSub.start(now);
              padOsc.stop(now + barDur + 0.65);
              padSub.stop(now + barDur + 0.65);
            });
          }

          const melFreq = chord.melody[noteInBar] ?? 440;
          const pianoOsc = ctx.createOscillator();
          const overtoneOsc = ctx.createOscillator();
          const noteFilter = ctx.createBiquadFilter();
          const noteGain = ctx.createGain();

          pianoOsc.type = "triangle";
          overtoneOsc.type = "sine";
          pianoOsc.frequency.setValueAtTime(melFreq, now);
          overtoneOsc.frequency.setValueAtTime(melFreq * 2, now);

          noteFilter.type = "lowpass";
          noteFilter.frequency.setValueAtTime(2200, now);
          noteFilter.frequency.exponentialRampToValueAtTime(620, now + 1.4);

          const accent = noteInBar === 0 || noteInBar === 3 ? 0.085 : 0.055;
          noteGain.gain.setValueAtTime(0.001, now);
          noteGain.gain.linearRampToValueAtTime(accent, now + 0.025);
          noteGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.75);

          pianoOsc.connect(noteFilter);
          overtoneOsc.connect(noteFilter);
          noteFilter.connect(noteGain);
          noteGain.connect(masterGain);

          pianoOsc.start(now);
          overtoneOsc.start(now);
          pianoOsc.stop(now + 1.8);
          overtoneOsc.stop(now + 0.5);

          stepRef.current += 1;
        };

        playStep();
        timerRef.current = window.setInterval(playStep, track.tempoMs);
      } catch {
        // Ignore if blocked
      }
    },
    [stopSynthEngine]
  );

  // Lazy-load Official YouTube IFrame API strictly on first user audio/menu interaction
  const ensureYouTubePlayer = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (ytBootRequestedRef.current && ytPlayerRef.current) return;
    ytBootRequestedRef.current = true;

    const win = window as unknown as {
      YT?: {
        Player: new (
          id: string,
          opts: Record<string, unknown>
        ) => YTPlayerInstance;
      };
      onYouTubeIframeAPIReady?: () => void;
    };

    const initPlayer = () => {
      if (!win.YT || !win.YT.Player || ytPlayerRef.current) return;
      const mountEl = document.getElementById("xii-pplg1-yt-player");
      if (!mountEl) return;
      try {
        ytPlayerRef.current = new win.YT.Player("xii-pplg1-yt-player", {
          host: "https://www.youtube-nocookie.com",
          height: "108",
          width: "228",
          videoId: SAD_TIKTOK_TRACKS[trackIndexRef.current]?.youtubeId ?? "cA7Gzh2ISL0",
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (ev: { target: YTPlayerInstance }) => {
              ytReadyRef.current = true;
              ev.target.setVolume?.(85);
              if (playingRef.current) {
                ev.target.unMute?.();
                ev.target.playVideo?.();
              }
            },
            onStateChange: (ev: { data: number }) => {
              if (ev.data === 1) {
                setYtActive(true);
                setPlaying(true);
                stopSynthEngine();
              } else if (ev.data === 0) {
                const nextIdx = (trackIndexRef.current + 1) % SAD_TIKTOK_TRACKS.length;
                setTrackIndex(nextIdx);
                const nextTrackItem = SAD_TIKTOK_TRACKS[nextIdx]!;
                ytPlayerRef.current?.loadVideoById?.(nextTrackItem.youtubeId);
              } else if (ev.data === 2) {
                setYtActive(false);
              }
            },
            onError: () => {
              setYtActive(false);
              if (playingRef.current) {
                startSynthEngine(trackIndexRef.current);
              }
            },
          },
        });
      } catch {
        // Fallback if YT fails
      }
    };

    if (win.YT && win.YT.Player) {
      initPlayer();
    } else {
      const prevCb = win.onYouTubeIframeAPIReady;
      win.onYouTubeIframeAPIReady = () => {
        prevCb?.();
        initPlayer();
      };
      if (!document.getElementById("yt-iframe-api-script")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
      }
    }
  }, [startSynthEngine, stopSynthEngine]);

  React.useEffect(() => {
    return () => {
      stopSynthEngine();
    };
  }, [stopSynthEngine]);

  React.useEffect(() => {
    if (!musicMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMusicMenuOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (target.closest?.('[aria-label="Buka daftar putar musik"]')) return;
      setMusicMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [musicMenuOpen]);

  const selectTrack = React.useCallback(
    (idx: number) => {
      ensureYouTubePlayer();
      const safeIdx = ((idx % SAD_TIKTOK_TRACKS.length) + SAD_TIKTOK_TRACKS.length) % SAD_TIKTOK_TRACKS.length;
      setTrackIndex(safeIdx);
      const track = SAD_TIKTOK_TRACKS[safeIdx]!;
      setPlaying(true);
      if (ytReadyRef.current && ytPlayerRef.current?.loadVideoById) {
        try {
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.loadVideoById(track.youtubeId);
          ytPlayerRef.current.playVideo?.();
        } catch {
          startSynthEngine(safeIdx);
        }
      } else {
        startSynthEngine(safeIdx);
      }
    },
    [ensureYouTubePlayer, startSynthEngine]
  );

  const toggleAudio = React.useCallback(() => {
    if (playing) {
      setPlaying(false);
      setYtActive(false);
      stopSynthEngine();
      try {
        ytPlayerRef.current?.pauseVideo?.();
      } catch {
        // ignore
      }
    } else {
      ensureYouTubePlayer();
      setPlaying(true);
      const track = SAD_TIKTOK_TRACKS[trackIndex % SAD_TIKTOK_TRACKS.length]!;
      startSynthEngine(trackIndex);
      if (ytReadyRef.current && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.loadVideoById?.(track.youtubeId);
          ytPlayerRef.current.playVideo?.();
        } catch {
          // keep synth running
        }
      }
    }
  }, [ensureYouTubePlayer, playing, stopSynthEngine, startSynthEngine, trackIndex]);

  const nextTrack = React.useCallback(() => {
    const nextIdx = (trackIndex + 1) % SAD_TIKTOK_TRACKS.length;
    selectTrack(nextIdx);
  }, [trackIndex, selectTrack]);

  const toggleMusicMenu = React.useCallback(() => {
    setMusicMenuOpen((prev) => {
      const next = !prev;
      if (next) ensureYouTubePlayer();
      return next;
    });
  }, [ensureYouTubePlayer]);

  const closeMusicMenu = React.useCallback(() => {
    setMusicMenuOpen(false);
  }, []);

  const currentTrack =
    SAD_TIKTOK_TRACKS[trackIndex % SAD_TIKTOK_TRACKS.length] ??
    SAD_TIKTOK_TRACKS[0]!;

  const value = React.useMemo(
    () => ({
      playing,
      trackIndex,
      currentTrack,
      musicMenuOpen,
      toggleAudio,
      nextTrack,
      selectTrack,
      toggleMusicMenu,
      closeMusicMenu,
    }),
    [
      playing,
      trackIndex,
      currentTrack,
      musicMenuOpen,
      toggleAudio,
      nextTrack,
      selectTrack,
      toggleMusicMenu,
      closeMusicMenu,
    ]
  );

  return (
    <SadAudioContext.Provider value={value}>
      {children}

      {/* Compact Popover Fitur Musik — keeps YT player node mounted once requested */}
      <motion.aside
        ref={popoverRef}
        aria-label="Fitur Pemutar Lagu Kenangan"
        data-testid="compact-music-popover"
        initial={false}
        animate={
          musicMenuOpen
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.95, y: -8 }
        }
        transition={MOTION_EASE.springLuxury}
        className={`editorial-glass fixed top-16 right-4 z-50 w-[256px] origin-top-right rounded-2xl border border-border p-3.5 text-card-foreground shadow-2xl sm:right-6 ${
          musicMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {playing && (
                <span className="inline-flex h-2.5 items-end gap-[2px]" aria-hidden="true">
                  <span className="w-[2px] animate-pulse rounded-full bg-[var(--accent-gold)] h-2" />
                  <span className="w-[2px] animate-pulse rounded-full bg-[var(--accent-gold)] h-2.5 [animation-delay:120ms]" />
                  <span className="w-[2px] animate-pulse rounded-full bg-[var(--accent-gold)] h-1.5 [animation-delay:240ms]" />
                </span>
              )}
              <p className="truncate text-[11px] font-bold text-foreground">
                {currentTrack.title}
              </p>
            </div>
            <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground">
              {ytActive
                ? "Memutar dari YouTube"
                : playing
                  ? "Instrumen Sedih Menyala"
                  : "Klik Putar untuk mendengarkan"}
            </p>
          </div>
          <a
            href={currentTrack.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Buka lagu di YouTube"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* Tombol Utama Putar/Jeda & Ganti Lagu */}
        <div className="mb-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleAudio}
            data-testid="music-play-toggle-btn"
            className={`inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-colors ${
              playing
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {playing ? (
              <>
                <Volume2 className="size-3.5" />
                <span>Jeda Musik</span>
              </>
            ) : (
              <>
                <VolumeX className="size-3.5 text-muted-foreground" />
                <span>Putar Musik</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={nextTrack}
            title="Lagu berikutnya"
            aria-label="Lagu berikutnya"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
          >
            <SkipForward className="size-3.5" />
          </button>
        </div>

        {/* 3 Tombol Pilihan Lagu YouTube */}
        <div className="mb-2 grid grid-cols-3 gap-1">
          {SAD_TIKTOK_TRACKS.map((t, idx) => {
            const active = idx === trackIndex;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTrack(idx)}
                className={`rounded-md px-1.5 py-1 font-mono text-[9px] font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Lagu #{idx + 1}
              </button>
            );
          })}
        </div>

        {/* Compact YouTube IFrame Container */}
        <div className="relative mx-auto h-[108px] w-[228px] overflow-hidden rounded-lg border border-border bg-[#161614]">
          <div id="xii-pplg1-yt-player" className="size-full" />
        </div>
      </motion.aside>
    </SadAudioContext.Provider>
  );
}

export function useSadAudio() {
  return React.useContext(SadAudioContext);
}
