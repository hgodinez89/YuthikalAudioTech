"use client";

import { useEffect, useState, type RefObject } from "react";

export type AudioSource =
  { type: "youtube"; videoId: string } | { type: "file"; url: string };

export type AudioEngine = {
  ready: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  /** Lectura precisa del reloj en el instante de la marca. */
  now: () => number;
};

/* --- tipado mínimo del IFrame API de YouTube --- */
type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars: Record<string, number>;
      events: {
        onReady: () => void;
        onStateChange: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  ytApiPromise ??= new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

/* Estado del reloj, siempre asociado a la clave de su fuente: al cambiar
   de fuente los valores viejos dejan de aplicar sin resets síncronos. */
type Snapshot = {
  key: string;
  ready: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
};

/* Controles activos (viven fuera de React; solo los usan event handlers). */
type Controls = {
  now: () => number;
  toggle: () => void;
  seekTo: (seconds: number) => void;
};

/**
 * Reloj de reproducción unificado sobre YouTube (IFrame API) o un MP3
 * (elemento <audio>). Ambas fuentes exponen la misma interfaz: la capa de
 * calibración/karaoke solo necesita "dame el tiempo actual".
 */
export function useAudioEngine(
  source: AudioSource | null,
  youtubeContainer: RefObject<HTMLDivElement | null>,
): AudioEngine {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [controls, setControls] = useState<Controls | null>(null);

  const sourceKey = source
    ? `${source.type}:${source.type === "youtube" ? source.videoId : source.url}`
    : null;

  useEffect(() => {
    if (!source || !sourceKey) return;
    let cancelled = false;
    const key = sourceKey;

    const patch = (update: Partial<Snapshot>) => {
      if (cancelled) return;
      setSnapshot((prev) =>
        prev && prev.key === key
          ? { ...prev, ...update }
          : { key, ready: false, playing: false, currentTime: 0, duration: 0, ...update },
      );
    };

    if (source.type === "youtube") {
      const container = youtubeContainer.current;
      if (!container) return;
      const mount = document.createElement("div");
      container.appendChild(mount);
      let player: YTPlayer | null = null;

      loadYouTubeApi().then((YT) => {
        if (cancelled) return;
        player = new YT.Player(mount, {
          videoId: source.videoId,
          playerVars: { controls: 0, disablekb: 1, playsinline: 1 },
          events: {
            onReady: () => {
              patch({ ready: true, duration: player?.getDuration() ?? 0 });
              if (cancelled || !player) return;
              const p = player;
              setControls({
                now: () => p.getCurrentTime(),
                toggle: () => {
                  if (p.getPlayerState() === YT.PlayerState.PLAYING) p.pauseVideo();
                  else p.playVideo();
                },
                seekTo: (seconds) => {
                  p.seekTo(seconds, true);
                  patch({ currentTime: seconds });
                },
              });
            },
            onStateChange: (e) => {
              patch({
                playing: e.data === YT.PlayerState.PLAYING,
                duration: player?.getDuration() ?? 0,
              });
            },
          },
        });
      });

      return () => {
        cancelled = true;
        player?.destroy();
        mount.remove();
      };
    }

    // MP3
    const audio = new Audio(source.url);
    audio.preload = "metadata";
    const onMeta = () => {
      patch({ ready: true, duration: audio.duration || 0 });
      setControls({
        now: () => audio.currentTime,
        toggle: () => {
          if (audio.paused) void audio.play();
          else audio.pause();
        },
        seekTo: (seconds) => {
          audio.currentTime = seconds;
          patch({ currentTime: seconds });
        },
      });
    };
    const onPlay = () => patch({ playing: true });
    const onPause = () => patch({ playing: false });
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const active = snapshot && snapshot.key === sourceKey ? snapshot : null;
  const playing = active?.playing ?? false;

  /* Reloj de UI: refresca currentTime mientras suena. */
  useEffect(() => {
    if (!playing || !controls || !sourceKey) return;
    const key = sourceKey;
    const interval = setInterval(() => {
      setSnapshot((prev) =>
        prev && prev.key === key ? { ...prev, currentTime: controls.now() } : prev,
      );
    }, 200);
    return () => clearInterval(interval);
  }, [playing, controls, sourceKey]);

  return {
    ready: active?.ready ?? false,
    playing,
    currentTime: active?.currentTime ?? 0,
    duration: active?.duration ?? 0,
    now: () => controls?.now() ?? 0,
    toggle: () => controls?.toggle(),
    seekTo: (seconds) => controls?.seekTo(seconds),
  };
}
