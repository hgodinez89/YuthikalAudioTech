"use client";

import { History, Info, LogOut, Pause, Play, SkipBack, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChordVisual } from "./chord-visual";
import type { ChordDataMap } from "./chord-sheet";
import { FloatingVideo, type VideoInsets } from "./floating-video";
import {
  ProgressWave,
  ShortcutsButton,
  SKIP_SECONDS,
  SMALL_BUTTON,
  SpeedControl,
  VideoToggle,
  VolumeControl,
} from "./player-controls";
import {
  clampTime,
  fadeGain,
  stepRate,
  type SongAudioRow,
  type SongSyncRow,
} from "@/lib/audio";
import { isInstrumental, wordGroups } from "@/lib/chordpro";
import type { SongRow } from "@/lib/songs";
import { karaokeLines } from "@/lib/sync-lines";
import { useAudioEngine, type AudioSource } from "@/lib/use-audio-engine";
import { usePlayerShortcuts } from "@/lib/use-player-shortcuts";
import { useSectionTitle } from "@/lib/use-section-title";
import { useSignedAudioUrl } from "@/lib/use-signed-audio-url";
import { useStoredFlag } from "@/lib/use-stored-flag";

/* Velocidades: con audio, la de reproducción; sin audio, la del autoscroll. */
const AUDIO_RATES = [0.5, 0.75, 1, 1.25] as const;
const AUTO_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
/* Repasar: se vuelve un poco antes del inicio de la línea. */
const REPEAT_PREROLL = 1;
/* Saltar la intro: se empieza un poco antes de la primera línea sincronizada. */
const INTRO_PREROLL = 3;
/* Video flotante entre la cabecera (Ahora/Sigue) y la barra de transporte. */
const KARAOKE_VIDEO_INSETS: VideoInsets = { top: 132, bottom: 236, bottomMobile: 268 };

export function SongKaraoke({
  song,
  audio,
  sync,
  chords,
  exitHref,
  syncHref,
  syncMissing = 0,
}: {
  song: SongRow;
  audio: SongAudioRow | null;
  sync: SongSyncRow | null;
  /** Líneas nuevas sin marca (la letra cambió después de sincronizar). */
  syncMissing?: number;
  chords: ChordDataMap;
  exitHref: string;
  /** Paso "Audio" del editor, para sincronizar desde el aviso sin calibración. */
  syncHref: string;
}) {
  const t = useTranslations("karaoke");
  const tSongView = useTranslations("songView");
  const sectionTitle = useSectionTitle();

  const granularity = sync?.granularity ?? "line";
  const lines = useMemo(
    () => karaokeLines(song.content, granularity, sectionTitle),
    [song.content, granularity, sectionTitle],
  );

  /* Inicio de cada línea/vuelta: su primera marca (en "por palabra", la menor). */
  const lineStarts = useMemo(() => {
    if (!sync || sync.stamps.length === 0) return null;
    const byIndex = new Map(sync.stamps.map((s) => [s.i, s.t]));
    return lines.map((line) => {
      let first: number | null = null;
      for (let w = 0; w < line.targets; w++) {
        const stamp = byIndex.get(line.firstTarget + w);
        if (stamp !== undefined && (first === null || stamp < first)) first = stamp;
      }
      return first;
    });
  }, [sync, lines]);

  const syncAvailable = Boolean(audio && lineStarts?.some((s) => s !== null));
  /* Con sincronización sigue el audio; sin ella, autoscroll por tiempo fijo. */
  const variant: "sync" | "auto" = syncAvailable ? "sync" : "auto";

  /* Motor de audio (solo variante sincronizada). URL firmada del MP3, renovada. */
  const filePath =
    variant === "sync" && audio?.source === "file" ? audio.file_path : null;
  const signed = useSignedAudioUrl(filePath);

  const engineSource: AudioSource | null =
    variant === "sync" && audio?.source === "youtube" && audio.youtube_id
      ? { type: "youtube", videoId: audio.youtube_id }
      : filePath && signed.url
        ? { type: "file", url: signed.url, id: filePath }
        : null;
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const engine = useAudioEngine(engineSource, youtubeContainerRef);

  /* Reloj virtual del autoscroll. */
  const [autoT, setAutoT] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const dwell = 3.6 / speed;
  const autoTotal = lines.length * dwell;

  /* Cambiar la velocidad del autoscroll sin saltar de línea: el reloj se
     reescala (la línea actual es reloj / permanencia). */
  const changeAutoSpeed = (next: number) => {
    setAutoT((t) => (t * speed) / next);
    setSpeed(next);
  };

  useEffect(() => {
    if (variant !== "auto" || !autoPlaying) return;
    const interval = setInterval(() => {
      setAutoT((prev) => {
        const next = prev + 0.1;
        if (next >= autoTotal) {
          setAutoPlaying(false);
          return autoTotal;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [variant, autoPlaying, autoTotal]);

  /* Línea actual + progreso dentro de ella. */
  const clock = variant === "sync" ? engine.currentTime : autoT;
  /* Fin marcado al sincronizar (opcional): ahí termina la canción. */
  const endAt =
    variant === "sync" &&
    sync?.end_at &&
    (engine.duration === 0 || sync.end_at < engine.duration)
      ? sync.end_at
      : null;
  const total = variant === "sync" ? (endAt ?? engine.duration) : autoTotal;
  const playing = variant === "sync" ? engine.playing : autoPlaying;

  const { currentIndex, progress } = useMemo(() => {
    if (variant === "auto") {
      const idx = Math.min(Math.floor(autoT / dwell), lines.length - 1);
      return { currentIndex: idx, progress: (autoT - idx * dwell) / dwell };
    }
    if (!lineStarts) return { currentIndex: 0, progress: 0 };
    let idx = 0;
    for (let i = 0; i < lineStarts.length; i++) {
      const start = lineStarts[i];
      if (start !== null && clock >= start) idx = i;
    }
    const start = lineStarts[idx] ?? 0;
    let end: number | null = null;
    for (let i = idx + 1; i < lineStarts.length; i++) {
      if (lineStarts[i] !== null) {
        end = lineStarts[i];
        break;
      }
    }
    const span = (end ?? total) - start;
    return {
      currentIndex: idx,
      progress: span > 0 ? Math.max(0, Math.min(1, (clock - start) / span)) : 0,
    };
  }, [variant, autoT, dwell, lines.length, lineStarts, clock, total]);

  /* Acorde actual y siguiente. */
  const { nowChord, nextChord } = useMemo(() => {
    const flat: { line: number; chord: string }[] = [];
    lines.forEach((line, i) =>
      line.segments.forEach(
        (seg) => seg.chord && flat.push({ line: i, chord: seg.chord }),
      ),
    );
    const currentPos = flat.findLastIndex((f) => f.line <= currentIndex);
    const now = currentPos >= 0 ? flat[currentPos].chord : (flat[0]?.chord ?? null);
    let next: string | null = null;
    for (let i = Math.max(currentPos, 0) + 1; i < flat.length; i++) {
      if (flat[i].chord !== now) {
        next = flat[i].chord;
        break;
      }
    }
    return { nowChord: now, nextChord: next ?? now };
  }, [lines, currentIndex]);

  /* Scroll: centrar la línea actual. */
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef(new Map<number, HTMLDivElement>());
  const prevIndexRef = useRef(-1);
  useEffect(() => {
    const container = containerRef.current;
    const node = lineRefs.current.get(currentIndex);
    if (!container || !node) return;
    const smooth = prevIndexRef.current !== -1;
    prevIndexRef.current = currentIndex;
    container.scrollTo({
      top: node.offsetTop - container.clientHeight / 2 + node.clientHeight / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  }, [currentIndex]);

  const seekToLine = (index: number) => {
    const clamped = Math.max(0, Math.min(index, lines.length - 1));
    if (variant === "auto") {
      setAutoT(clamped * dwell);
      return;
    }
    const start = lineStarts?.[clamped];
    if (start !== null && start !== undefined) engine.seekTo(start);
  };

  const sectionIndices = lines
    .map((line, i) => (line.section ? i : -1))
    .filter((i) => i >= 0);

  /* Desde dónde empezar a tocar: poco antes de la primera línea sincronizada.
     La intro queda fuera del karaoke: la barra empieza ahí en 0:00. */
  const firstStart = lineStarts?.reduce<number | null>(
    (min, s) => (s !== null && (min === null || s < min) ? s : min),
    null,
  );
  const introEnd =
    firstStart === null || firstStart === undefined
      ? 0
      : Math.max(0, firstStart - INTRO_PREROLL);

  const togglePlay = () => {
    if (variant === "sync") {
      // Antes de la primera línea, play salta la intro en lugar de esperarla;
      // en el fin, vuelve a empezar.
      const atEnd = endAt !== null && engine.currentTime >= endAt - 0.1;
      if (!engine.playing && (engine.currentTime < introEnd || atEnd)) {
        engine.seekTo(introEnd);
        engine.play();
      } else engine.toggle();
    } else {
      if (!autoPlaying && autoT >= autoTotal) setAutoT(0);
      setAutoPlaying((p) => !p);
    }
  };

  const restart = () => {
    if (variant === "sync") engine.seekTo(introEnd);
    else setAutoT(0);
  };

  const prevSection = () => {
    const prior = sectionIndices.filter((i) => i < currentIndex).pop();
    seekToLine(prior ?? 0);
  };
  const nextSection = () => {
    const next = sectionIndices.find((i) => i > currentIndex);
    if (next !== undefined) seekToLine(next);
  };

  /* ±10 s y saltos en la onda: sobre el audio (sin volver a la intro ni
     pasar del fin) o sobre el reloj del autoscroll. */
  const seekTo = (seconds: number) => {
    if (variant === "sync") {
      engine.seekTo(Math.min(endAt ?? Infinity, Math.max(introEnd, seconds)));
    } else setAutoT(clampTime(seconds, autoTotal));
  };
  const skip = (seconds: number) => {
    if (variant === "sync") seekTo(engine.currentTime + seconds);
    else setAutoT((t) => clampTime(t + seconds, autoTotal));
  };
  /* La barra cuenta desde el final de la intro. */
  const barOffset = variant === "sync" ? introEnd : 0;

  /* Con fin marcado: fundido en los últimos segundos y pausa al llegar. El
     motor cambia de identidad en cada render; el intervalo usa el vigente. */
  const engineRef = useRef(engine);
  useEffect(() => {
    engineRef.current = engine;
  });
  const enginePlaying = engine.playing;
  useEffect(() => {
    if (endAt === null || !enginePlaying) return;
    const interval = setInterval(() => {
      const current = engineRef.current;
      const now = current.now();
      current.setFade(fadeGain(now, endAt));
      if (now >= endAt) {
        current.pause();
        current.setFade(1);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [endAt, enginePlaying]);

  /* Repasar: repetir la línea actual desde un poco antes de su inicio. */
  const repeatLine = () => {
    if (variant === "sync") {
      const start = lineStarts?.[currentIndex];
      if (start === null || start === undefined) return;
      engine.seekTo(Math.max(0, start - REPEAT_PREROLL));
      engine.play();
    } else {
      setAutoT(currentIndex * dwell);
      setAutoPlaying(true);
    }
  };

  const rate = variant === "sync" ? engine.rate : speed;
  const rates = variant === "sync" ? AUDIO_RATES : AUTO_RATES;
  const setRate = (next: number) =>
    variant === "sync" ? engine.setRate(next) : changeAutoSpeed(next);

  /* Video: solo con YouTube y solo cuando lo pides (no se abre al dar play);
     se recuerda si lo dejaste abierto. */
  const hasVideo = engineSource?.type === "youtube";
  const [videoOpen, setVideoOpen] = useStoredFlag("yk-video-open:karaoke", false);
  const toggleVideo = () => setVideoOpen(!videoOpen);

  const transportDisabled = variant === "sync" && !engine.ready;

  usePlayerShortcuts({
    " ": togglePlay,
    k: togglePlay,
    ArrowLeft: () => skip(-5),
    ArrowRight: () => skip(5),
    j: () => skip(-SKIP_SECONDS),
    l: () => skip(SKIP_SECONDS),
    Home: restart,
    ArrowUp: prevSection,
    ArrowDown: nextSection,
    PageUp: prevSection,
    PageDown: nextSection,
    "[": () => setRate(stepRate(rates, rate, -1)),
    "]": () => setRate(stepRate(rates, rate, 1)),
    m: variant === "sync" ? engine.toggleMute : undefined,
    r: repeatLine,
    v: hasVideo ? toggleVideo : undefined,
  });

  const tp = useTranslations("player");
  const shortcuts = [
    { keys: `${tp("keys.space")} / K`, label: tp("keys.playPause") },
    { keys: "← / →", label: tp("keys.skip5") },
    { keys: "J / L", label: tp("keys.skip10") },
    { keys: tp("keys.home"), label: tp("keys.toStart") },
    { keys: `↑ / ↓ · ${tp("keys.pages")}`, label: tp("keys.section") },
    { keys: "[ / ]", label: tp("keys.speed") },
    ...(variant === "sync" ? [{ keys: "M", label: tp("keys.mute") }] : []),
    { keys: "R", label: tp("keys.repeatLine") },
    ...(hasVideo ? [{ keys: "V", label: tp("keys.video") }] : []),
  ];

  const nowData = nowChord ? chords[nowChord] : undefined;
  const nextData = nextChord ? chords[nextChord] : undefined;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-page text-ink dark:bg-[radial-gradient(120%_90%_at_50%_-10%,#0a1220_0%,#05070a_55%)]">
      {/* Video de YouTube flotante (con MP3 o sin audio no hay video). Cerrado,
          sigue montado fuera de pantalla: el audio no se corta. */}
      {hasVideo && (
        <FloatingVideo
          containerRef={youtubeContainerRef}
          open={videoOpen}
          onClose={() => setVideoOpen(false)}
          insets={KARAOKE_VIDEO_INSETS}
          overlay
        />
      )}

      {/* BARRA SUPERIOR: Ahora / Sigue + salir */}
      <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-1 pt-3.5">
        <div className="flex gap-4">
          {nowData && (
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                {t("now")}
              </span>
              <div className="rounded-xl border border-edge-2 bg-surface p-2 shadow-[0_0_24px_rgba(53,214,232,0.28)]">
                <ChordVisual chord={nowData} scale={0.8} />
              </div>
              <span className="mt-1 text-sm font-extrabold">{nowChord}</span>
            </div>
          )}
          {nextData && nextChord !== nowChord && (
            <div className="flex flex-col items-center opacity-60">
              <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-tert">
                {t("next")}
              </span>
              <div className="rounded-xl border border-edge bg-surface-2 p-2">
                <ChordVisual chord={nextData} scale={0.72} />
              </div>
              <span className="mt-1 text-[13px] font-bold">{nextChord}</span>
            </div>
          )}
        </div>

        <Link
          href={exitHref}
          aria-label={t("exit")}
          className="grid size-10 shrink-0 place-items-center rounded-[11px] border border-edge bg-surface-3 text-sub hover:text-ink"
        >
          <X size={19} strokeWidth={2} />
        </Link>
      </div>

      {/* META */}
      <div className="shrink-0 px-5 pb-1 pt-0.5 text-center text-[13px] text-tert">
        {song.name}
        {song.key_note && (
          <>
            {" · "}
            <span className="text-sub">
              {tSongView("keyPrefix")} {song.key_note}
            </span>
          </>
        )}
      </div>

      {/* LETRA */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden [mask-image:linear-gradient(180deg,transparent_0%,#000_20%,#000_80%,transparent_100%)] [scrollbar-width:none]"
      >
        <div className="flex flex-col items-center gap-[22px] px-5 pb-[45vh] pt-[40vh]">
          {lines.map((line, i) => {
            const isCurrent = i === currentIndex;
            const distance = Math.abs(i - currentIndex);
            const opacity = isCurrent ? 1 : Math.max(0.14, 0.62 - (distance - 1) * 0.15);
            return (
              <div
                key={i}
                ref={(el) => {
                  if (el) lineRefs.current.set(i, el);
                  else lineRefs.current.delete(i);
                }}
                className="text-center transition-[opacity,transform] duration-[400ms]"
                style={{ opacity, transform: isCurrent ? "scale(1)" : "scale(0.98)" }}
              >
                {line.notes.length > 0 && (
                  <div className="mb-2 flex flex-wrap justify-center gap-2">
                    {line.notes.map((note, ni) => (
                      <span
                        key={ni}
                        className="rounded-lg border border-edge bg-surface-2 px-2.5 py-[3px] text-[12px] italic text-sub"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                )}
                {line.section && (
                  <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
                      {line.section}
                    </span>
                    {line.strum && (
                      <span className="rounded-lg border border-edge bg-surface-2 px-2.5 py-[3px] text-[11.5px] tracking-[0.12em] text-sub">
                        {line.strum}
                      </span>
                    )}
                  </div>
                )}
                {isInstrumental(line.segments) ? (
                  /* Solo acordes (intro, solo…): acordes en grande + vuelta actual */
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                    {line.segments.map((seg, gi) =>
                      seg.repeat ? null : seg.bar ? (
                        <span
                          key={gi}
                          className="font-light text-edge-2"
                          style={{ fontSize: isCurrent ? 30 : 21 }}
                        >
                          |
                        </span>
                      ) : (
                        <span
                          key={gi}
                          className="font-extrabold tracking-[0.01em] text-accent"
                          style={{
                            fontSize: isCurrent ? 30 : 21,
                            textShadow: isCurrent
                              ? "0 0 14px rgba(53,214,232,0.85), 0 0 28px rgba(46,107,240,0.4)"
                              : "none",
                          }}
                        >
                          {seg.chord}
                        </span>
                      ),
                    )}
                    {line.pass && (
                      <span className="rounded-md border border-accent/35 bg-accent/10 px-2 py-0.5 text-[12px] font-bold tabular-nums text-accent">
                        {t("pass", { n: line.pass.n, total: line.pass.total })}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end justify-center gap-y-0.5">
                    {/* Salta entre palabras: una palabra con un acorde en medio no se parte */}
                    {wordGroups(line.segments).map((group, wi) => (
                      <span key={wi} className="inline-flex items-end">
                        {group.map((piece, pi) => (
                          <span
                            key={pi}
                            className="inline-flex flex-col whitespace-pre text-left"
                          >
                            <span
                              className="font-extrabold leading-normal tracking-[0.01em] text-accent"
                              style={{
                                fontSize: isCurrent ? 17 : 13,
                                minHeight: isCurrent ? 26 : 20,
                                textShadow: isCurrent
                                  ? "0 0 14px rgba(53,214,232,0.85), 0 0 28px rgba(46,107,240,0.4)"
                                  : "none",
                              }}
                            >
                              {piece.chord ?? ""}
                            </span>
                            <span
                              className="leading-[1.3]"
                              style={{
                                fontSize: isCurrent ? 30 : 21,
                                fontWeight: isCurrent ? 700 : 500,
                                color: isCurrent ? "var(--ink)" : "var(--sub)",
                              }}
                            >
                              {/* acorde final sin palabra: mantiene la altura de la línea */}
                              {piece.text || " "}
                            </span>
                          </span>
                        ))}
                      </span>
                    ))}
                  </div>
                )}
                {isCurrent && (
                  <div className="mx-auto mt-3 h-[3px] w-[180px] overflow-hidden rounded-[3px] bg-edge">
                    <div
                      className="h-full rounded-[3px] bg-[linear-gradient(90deg,var(--grad-from),var(--grad-to))] shadow-[0_0_12px_rgba(53,214,232,0.7)]"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* TRANSPORTE */}
      <div className="shrink-0 border-t border-edge bg-[linear-gradient(180deg,transparent_0%,var(--surface-3)_30%)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 sm:px-6">
        {/* Progreso: el audio sin la intro, o el reloj del autoscroll */}
        <ProgressWave
          current={Math.max(0, Math.min(clock, total) - barOffset)}
          duration={Math.max(0, total - barOffset)}
          onSeek={(seconds) => seekTo(seconds + barOffset)}
          bars={72}
          className="mx-auto mb-1.5 max-w-[640px]"
        />
        {signed.error && (
          <div
            role="alert"
            className="mb-2 flex items-center justify-center gap-[7px] text-xs text-warn"
          >
            <Info size={14} strokeWidth={2} />
            {t("fileLoadError")}
          </div>
        )}
        {variant === "sync" && syncMissing > 0 && (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-[7px] text-xs text-warn">
            <Info size={14} strokeWidth={2} />
            {t("syncDrift", { count: syncMissing })}
            <span aria-hidden>·</span>
            <Link href={syncHref} className="font-semibold text-accent hover:underline">
              {t("syncReview")}
            </Link>
          </div>
        )}
        {variant === "auto" && (
          <div className="mb-2 flex items-center justify-center gap-[7px] text-xs text-tert">
            <Info size={14} strokeWidth={2} />
            {t("noSyncNote")}
            <span aria-hidden>·</span>
            <Link href={syncHref} className="font-semibold text-accent hover:underline">
              {t("syncNow")}
            </Link>
          </div>
        )}

        {/* Fila principal */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={restart}
            disabled={transportDisabled}
            aria-label={tp("toStart")}
            title={tp("toStart")}
            className={SMALL_BUTTON}
          >
            <SkipBack size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => skip(-SKIP_SECONDS)}
            disabled={transportDisabled}
            aria-label={tp("back10")}
            title={tp("back10")}
            className={SMALL_BUTTON}
          >
            −{SKIP_SECONDS}
          </button>
          <button
            type="button"
            onClick={prevSection}
            aria-label={t("prevSection")}
            title={t("prevSection")}
            className="grid size-[46px] cursor-pointer place-items-center text-sub hover:text-ink"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M6 6h2v12H6zM20 6v12l-9-6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={transportDisabled}
            aria-label={playing ? t("pause") : t("play")}
            className="yk-gradient grid size-[68px] shrink-0 cursor-pointer place-items-center rounded-full shadow-[0_0_30px_rgba(53,214,232,0.45)] disabled:opacity-50 sm:size-[74px]"
          >
            {playing ? (
              <Pause size={30} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={32} fill="currentColor" strokeWidth={0} className="ml-[3px]" />
            )}
          </button>
          <button
            type="button"
            onClick={nextSection}
            aria-label={t("nextSection")}
            title={t("nextSection")}
            className="grid size-[46px] cursor-pointer place-items-center text-sub hover:text-ink"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M16 6h2v12h-2zM4 6l9 6-9 6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => skip(SKIP_SECONDS)}
            disabled={transportDisabled}
            aria-label={tp("forward10")}
            title={tp("forward10")}
            className={SMALL_BUTTON}
          >
            +{SKIP_SECONDS}
          </button>
          <Link
            href={exitHref}
            aria-label={t("exit")}
            title={t("exit")}
            className="grid size-[46px] place-items-center text-sub hover:text-ink"
          >
            <LogOut size={22} strokeWidth={2} />
          </Link>
        </div>

        {/* Fila secundaria */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
          <SpeedControl
            rate={rate}
            rates={rates}
            onChange={setRate}
            disabled={transportDisabled}
          />
          {variant === "sync" && (
            <VolumeControl
              volume={engine.volume}
              muted={engine.muted}
              onToggleMute={engine.toggleMute}
              onVolume={engine.setVolume}
              disabled={transportDisabled}
            />
          )}
          {hasVideo && <VideoToggle open={videoOpen} onToggle={toggleVideo} />}
          <button
            type="button"
            onClick={repeatLine}
            disabled={transportDisabled}
            title={t("reviewHint")}
            className={SMALL_BUTTON}
          >
            <History size={15} strokeWidth={2} />
            <span className="hidden sm:inline">{t("review")}</span>
          </button>
          <ShortcutsButton items={shortcuts} />
        </div>
      </div>
    </div>
  );
}
