"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { clampTime } from "./audio";

/* `start`: posición inicial (s), sin reproducir. Solo se lee al crear el
   reproductor: no forma parte de la clave de la fuente. */
export type AudioSource = (
  | { type: "youtube"; videoId: string }
  | {
      type: "file";
      url: string;
      /** Identidad estable (la ruta del archivo): la URL firmada se renueva. */
      id: string;
    }
  /* Sin audio (sin conexión): un reloj silencioso con la misma interfaz,
     para que la letra siga las marcas de la sincronización. */
  | { type: "clock"; id: string; duration: number }
) & { start?: number };

export type AudioEngine = {
  ready: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  /** Velocidad de reproducción (1 = normal). */
  rate: number;
  /** Volumen 0–100 y silencio. */
  volume: number;
  muted: boolean;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  /** Avanza (positivo) o retrocede (negativo), dentro de la canción. */
  skip: (seconds: number) => void;
  setRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  /** Fundido (0–1) sobre el volumen elegido, sin cambiarlo. */
  setFade: (gain: number) => void;
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
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width: string;
      height: string;
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
  rate: number;
  volume: number;
  muted: boolean;
};

/* Controles activos (viven fuera de React; solo los usan event handlers). */
type Controls = {
  now: () => number;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setFade: (gain: number) => void;
};

/**
 * Reloj de reproducción unificado sobre YouTube (IFrame API), un MP3
 * (elemento <audio>) o un reloj silencioso (sin conexión). Ambas fuentes exponen la misma interfaz: la capa de
 * calibración/karaoke solo necesita "dame el tiempo actual".
 */
export function useAudioEngine(
  source: AudioSource | null,
  youtubeContainer: RefObject<HTMLDivElement | null>,
): AudioEngine {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [controls, setControls] = useState<Controls | null>(null);
  /* MP3 vigente: permite cambiar su URL (renovada) sin recrear el reproductor. */
  const fileRef = useRef<{ key: string; swap: (url: string) => void } | null>(null);

  const sourceKey = !source
    ? null
    : source.type === "youtube"
      ? `youtube:${source.videoId}`
      : source.type === "clock"
        ? `clock:${source.id}:${source.duration}`
        : `file:${source.id}`;

  useEffect(() => {
    if (!source || !sourceKey) return;
    let cancelled = false;
    const key = sourceKey;
    const start = source.start && source.start > 0 ? source.start : 0;
    // Volumen que suena = el elegido × el fundido.
    let volume = 100;
    let gain = 1;

    const patch = (update: Partial<Snapshot>) => {
      if (cancelled) return;
      setSnapshot((prev) =>
        prev && prev.key === key
          ? { ...prev, ...update }
          : {
              key,
              ready: false,
              playing: false,
              currentTime: 0,
              duration: 0,
              rate: 1,
              volume: 100,
              muted: false,
              ...update,
            },
      );
    };

    if (source.type === "clock") {
      const end = source.duration;
      // Posición = base + tiempo desde el último play × velocidad.
      let base = Math.min(start, end);
      let since = 0;
      let rate = 1;
      let running = false;
      const now = () =>
        running
          ? Math.min(end, base + ((performance.now() - since) / 1000) * rate)
          : base;
      const rebase = () => {
        base = now();
        since = performance.now();
      };
      const pause = () => {
        if (!running) return;
        rebase();
        running = false;
        patch({ playing: false, currentTime: base });
      };
      const play = () => {
        if (running) return;
        if (base >= end) base = 0;
        since = performance.now();
        running = true;
        patch({ playing: true });
      };
      // Al llegar al final se detiene, como un audio.
      const ender = setInterval(() => {
        if (running && now() >= end) pause();
      }, 200);
      // Listo en el siguiente turno, como las otras fuentes (que cargan algo).
      const init = setTimeout(() => {
        patch({ ready: true, duration: end, currentTime: base });
        setControls({
          now,
          toggle: () => (running ? pause() : play()),
          play,
          pause,
          seekTo: (seconds) => {
            base = Math.min(Math.max(0, seconds), end);
            since = performance.now();
            patch({ currentTime: base });
          },
          setRate: (next) => {
            rebase();
            rate = next;
            patch({ rate });
          },
          setVolume: (next) => patch({ volume: next }),
          setFade: () => {},
          setMuted: (muted) => patch({ muted }),
        });
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(init);
        clearInterval(ender);
      };
    }

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
          // Llena su contenedor (el mini-reproductor visible).
          width: "100%",
          height: "100%",
          // `start` deja el video en ese segundo sin reproducirlo (un seekTo
          // en estado "cued" lo pondría a sonar).
          playerVars: {
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            ...(start ? { start: Math.floor(start) } : {}),
          },
          events: {
            onReady: () => {
              patch({
                ready: true,
                duration: player?.getDuration() ?? 0,
                currentTime: Math.floor(start),
              });
              if (cancelled || !player) return;
              const p = player;
              setControls({
                now: () => p.getCurrentTime(),
                toggle: () => {
                  if (p.getPlayerState() === YT.PlayerState.PLAYING) p.pauseVideo();
                  else p.playVideo();
                },
                play: () => p.playVideo(),
                pause: () => p.pauseVideo(),
                seekTo: (seconds) => {
                  p.seekTo(seconds, true);
                  patch({ currentTime: seconds });
                },
                setRate: (rate) => {
                  p.setPlaybackRate(rate);
                  patch({ rate });
                },
                setVolume: (next) => {
                  volume = next;
                  p.setVolume(Math.round(volume * gain));
                  patch({ volume });
                },
                setFade: (next) => {
                  if (next === gain) return;
                  gain = next;
                  p.setVolume(Math.round(volume * gain));
                },
                setMuted: (muted) => {
                  if (muted) p.mute();
                  else p.unMute();
                  patch({ muted });
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
    /* URL renovada: al cargar se recuperan posición, velocidad y estado. */
    let resume: { at: number; playing: boolean; rate: number } | null = null;
    fileRef.current = {
      key,
      swap: (url) => {
        if (audio.src === url) return;
        resume = {
          at: audio.currentTime,
          playing: !audio.paused,
          rate: audio.playbackRate,
        };
        audio.src = url;
      },
    };
    const onMeta = () => {
      if (resume) {
        audio.currentTime = resume.at;
        audio.playbackRate = resume.rate;
        if (resume.playing) void audio.play();
        resume = null;
        return;
      }
      if (start) audio.currentTime = start;
      patch({ ready: true, duration: audio.duration || 0, currentTime: start });
      setControls({
        now: () => audio.currentTime,
        toggle: () => {
          if (audio.paused) void audio.play();
          else audio.pause();
        },
        play: () => void audio.play(),
        pause: () => audio.pause(),
        seekTo: (seconds) => {
          audio.currentTime = seconds;
          patch({ currentTime: seconds });
        },
        setRate: (rate) => {
          audio.playbackRate = rate;
          patch({ rate });
        },
        setVolume: (next) => {
          volume = next;
          audio.volume = (volume / 100) * gain;
          patch({ volume });
        },
        setFade: (next) => {
          if (next === gain) return;
          gain = next;
          audio.volume = (volume / 100) * gain;
        },
        setMuted: (muted) => {
          audio.muted = muted;
          patch({ muted });
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
      if (fileRef.current?.key === key) fileRef.current = null;
      audio.pause();
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  /* Misma fuente, URL nueva (firmada otra vez): se cambia en caliente. */
  const fileUrl = source?.type === "file" ? source.url : null;
  useEffect(() => {
    if (fileUrl && fileRef.current?.key === sourceKey) fileRef.current.swap(fileUrl);
  }, [fileUrl, sourceKey]);

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

  const duration = active?.duration ?? 0;
  const muted = active?.muted ?? false;

  /* Acciones estables mientras no cambien la fuente, la duración o el
     silencio: los componentes memorizados no se redibujan por el reloj. */
  const actions = useMemo(
    () => ({
      now: () => controls?.now() ?? 0,
      toggle: () => controls?.toggle(),
      play: () => controls?.play(),
      pause: () => controls?.pause(),
      seekTo: (seconds: number) => controls?.seekTo(clampTime(seconds, duration)),
      skip: (seconds: number) => {
        if (!controls) return;
        controls.seekTo(clampTime(controls.now() + seconds, duration));
      },
      setRate: (rate: number) => controls?.setRate(rate),
      setVolume: (volume: number) => {
        controls?.setVolume(Math.round(Math.min(100, Math.max(0, volume))));
        // Subir el volumen quita el silencio, como en cualquier reproductor.
        if (muted && volume > 0) controls?.setMuted(false);
      },
      toggleMute: () => controls?.setMuted(!muted),
      setFade: (gain: number) => controls?.setFade(Math.min(1, Math.max(0, gain))),
    }),
    [controls, duration, muted],
  );

  return {
    ready: active?.ready ?? false,
    playing,
    currentTime: active?.currentTime ?? 0,
    duration,
    rate: active?.rate ?? 1,
    volume: active?.volume ?? 100,
    muted,
    ...actions,
  };
}
