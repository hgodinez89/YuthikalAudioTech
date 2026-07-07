"use client";

import { Info, LogOut, Pause, Play, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChordDiagram } from "./chord-diagram";
import type { ChordDataMap } from "./chord-sheet";
import { formatTime, type SongAudioRow, type SongSyncRow } from "@/lib/audio";
import {
  parseChordPro,
  strumToArrows,
  type SheetLine,
  type SectionType,
} from "@/lib/chordpro";
import type { SongRow } from "@/lib/songs";
import { supabaseBrowser } from "@/lib/supabase";
import { useAudioEngine, type AudioSource } from "@/lib/use-audio-engine";

/* Línea de karaoke: segmentos + encabezado de sección si es la primera. */
type KaraokeLine = {
  section: string | null;
  strum: string | null;
  segments: SheetLine;
};

function buildLines(
  content: string,
  sectionTitle: (
    type: SectionType,
    number: number,
    label: string | null,
  ) => string | null,
): KaraokeLine[] {
  const lines: KaraokeLine[] = [];
  for (const section of parseChordPro(content).sections) {
    let first = true;
    for (const segments of section.lines) {
      if (!segments.length) continue; // separadores en blanco no aplican aquí
      lines.push({
        section: first ? sectionTitle(section.type, section.number, section.label) : null,
        strum: first && section.strum ? strumToArrows(section.strum) : null,
        segments,
      });
      first = false;
    }
  }
  return lines;
}

export function SongKaraoke({
  song,
  audio,
  sync,
  chords,
  exitHref,
}: {
  song: SongRow;
  audio: SongAudioRow | null;
  sync: SongSyncRow | null;
  chords: ChordDataMap;
  exitHref: string;
}) {
  const t = useTranslations("karaoke");
  const tSongView = useTranslations("songView");

  const sectionTitle = (type: SectionType, number: number, label: string | null) => {
    if (label) return label;
    if (type === "plain") return null;
    const base = tSongView(type);
    if (type === "verse") return `${base} ${number}`;
    return number > 1 ? `${base} ${number}` : base;
  };

  const lines = useMemo(
    () => buildLines(song.content, sectionTitle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [song.content],
  );

  /* Marcas por línea: en granularidad palabra se toma la primera de la línea. */
  const lineStarts = useMemo(() => {
    if (!sync || sync.stamps.length === 0) return null;
    const byIndex = new Map(sync.stamps.map((s) => [s.i, s.t]));
    const starts: (number | null)[] = [];
    let target = 0;
    for (const line of lines) {
      if (sync.granularity === "line") {
        starts.push(byIndex.get(target) ?? null);
        target += 1;
      } else {
        const wordCount = Math.max(
          line.segments.flatMap((s) => s.text.split(/\s+/)).filter(Boolean).length,
          1,
        );
        let first: number | null = null;
        for (let w = 0; w < wordCount; w++) {
          const stamp = byIndex.get(target + w);
          if (stamp !== undefined && (first === null || stamp < first)) first = stamp;
        }
        starts.push(first);
        target += wordCount;
      }
    }
    return starts;
  }, [sync, lines]);

  const syncAvailable = Boolean(audio && lineStarts?.some((s) => s !== null));
  const [variant, setVariant] = useState<"sync" | "auto">(
    syncAvailable ? "sync" : "auto",
  );

  /* Motor de audio (solo variante sincronizada). */
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  useEffect(() => {
    if (audio?.source !== "file" || !audio.file_path) return;
    let cancelled = false;
    supabaseBrowser()
      .storage.from("audio")
      .createSignedUrl(audio.file_path, 3600)
      .then(({ data }) => {
        if (!cancelled && data) setFileUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [audio?.source, audio?.file_path]);

  const engineSource: AudioSource | null =
    variant === "sync" && audio?.source === "youtube" && audio.youtube_id
      ? { type: "youtube", videoId: audio.youtube_id }
      : variant === "sync" && audio?.source === "file" && fileUrl
        ? { type: "file", url: fileUrl }
        : null;
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const engine = useAudioEngine(engineSource, youtubeContainerRef);

  /* Reloj virtual del autoscroll. */
  const [autoT, setAutoT] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const dwell = 3.6 / speed;
  const autoTotal = lines.length * dwell;

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
  const total = variant === "sync" ? engine.duration : autoTotal;
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
  }, [currentIndex, variant]);

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

  const togglePlay = () => {
    if (variant === "sync") engine.toggle();
    else {
      if (!autoPlaying && autoT >= autoTotal) setAutoT(0);
      setAutoPlaying((p) => !p);
    }
  };

  const restart = () => {
    if (variant === "sync") engine.seekTo(0);
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

  const nowData = nowChord ? chords[nowChord] : undefined;
  const nextData = nextChord ? chords[nextChord] : undefined;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-page text-ink dark:bg-[radial-gradient(120%_90%_at_50%_-10%,#0a1220_0%,#05070a_55%)]">
      <div
        ref={youtubeContainerRef}
        className="pointer-events-none fixed -left-[9999px] top-0 size-px overflow-hidden"
        aria-hidden
      />

      {/* BARRA SUPERIOR: Ahora / Sigue + variante + salir */}
      <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-1 pt-3.5">
        <div className="flex gap-4">
          {nowData && (
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                {t("now")}
              </span>
              <div className="rounded-xl border border-edge-2 bg-surface p-2 shadow-[0_0_24px_rgba(53,214,232,0.28)]">
                <ChordDiagram
                  frets={nowData.frets}
                  barres={nowData.barres}
                  baseFret={nowData.baseFret}
                  scale={0.8}
                />
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
                <ChordDiagram
                  frets={nextData.frets}
                  barres={nextData.barres}
                  baseFret={nextData.baseFret}
                  scale={0.72}
                />
              </div>
              <span className="mt-1 text-[13px] font-bold">{nextChord}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {syncAvailable && (
            <div className="flex rounded-[11px] border border-edge bg-surface-3 p-1 text-xs font-semibold">
              {(["sync", "auto"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  className={
                    variant === v
                      ? "yk-gradient cursor-pointer whitespace-nowrap rounded-lg px-[13px] py-1.5"
                      : "cursor-pointer whitespace-nowrap rounded-lg px-[13px] py-1.5 text-sub"
                  }
                >
                  {t(`variant.${v}`)}
                </button>
              ))}
            </div>
          )}
          <Link
            href={exitHref}
            aria-label={t("exit")}
            className="grid size-10 place-items-center rounded-[11px] border border-edge bg-surface-3 text-sub hover:text-ink"
          >
            <X size={19} strokeWidth={2} />
          </Link>
        </div>
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
                <div className="flex flex-wrap items-end justify-center gap-y-0.5">
                  {line.segments.map((seg, gi) => (
                    <span key={gi} className="inline-flex flex-col whitespace-pre">
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
                        {seg.chord ?? ""}
                      </span>
                      <span
                        className="leading-[1.3]"
                        style={{
                          fontSize: isCurrent ? 30 : 21,
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? "var(--ink)" : "var(--sub)",
                        }}
                      >
                        {seg.text}
                      </span>
                    </span>
                  ))}
                </div>
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
      <div className="shrink-0 border-t border-edge bg-[linear-gradient(180deg,transparent_0%,var(--surface-3)_30%)] px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3.5">
        {variant === "sync" ? (
          <div className="mx-auto mb-3.5 flex max-w-[640px] items-center gap-3">
            <span className="min-w-10 text-xs tabular-nums text-sub">
              {formatTime(clock)}
            </span>
            <div
              className="flex h-[30px] flex-1 cursor-pointer items-center gap-[3px]"
              onClick={(e) => {
                if (!total) return;
                const rect = e.currentTarget.getBoundingClientRect();
                engine.seekTo(((e.clientX - rect.left) / rect.width) * total);
              }}
            >
              {Array.from({ length: 72 }, (_, i) => {
                const h = 6 + Math.abs(Math.sin(i * 0.55)) * 20 + (i % 3) * 2;
                const on = total > 0 && i / 72 <= clock / total;
                return (
                  <span
                    key={i}
                    className="flex-1 rounded-[2px]"
                    style={{
                      height: Math.round(h),
                      background: on
                        ? "linear-gradient(180deg, var(--grad-to), var(--grad-from))"
                        : "var(--edge)",
                    }}
                  />
                );
              })}
            </div>
            <span className="min-w-10 text-right text-xs tabular-nums text-tert">
              {formatTime(total)}
            </span>
          </div>
        ) : (
          <div className="mb-3 flex flex-col items-center gap-2">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setSpeed((s) => Math.max(0.5, +(s - 0.1).toFixed(1)))}
                aria-label={t("slower")}
                className="grid size-[42px] cursor-pointer place-items-center rounded-xl border border-edge-2 bg-surface-2 text-[22px]"
              >
                –
              </button>
              <div className="min-w-[88px] text-center">
                <div className="text-[22px] font-extrabold tabular-nums">
                  {speed.toFixed(1)}×
                </div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-mute">
                  {t("speed")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSpeed((s) => Math.min(2, +(s + 0.1).toFixed(1)))}
                aria-label={t("faster")}
                className="grid size-[42px] cursor-pointer place-items-center rounded-xl border border-edge-2 bg-surface-2 text-[22px]"
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-[7px] text-xs text-tert">
              <Info size={14} strokeWidth={2} />
              {t("noSyncNote")}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={restart}
            aria-label={t("restart")}
            className="grid size-[52px] cursor-pointer place-items-center text-sub hover:text-ink"
          >
            <RotateCcw size={24} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={prevSection}
            aria-label={t("prevSection")}
            className="grid size-[52px] cursor-pointer place-items-center text-sub hover:text-ink"
          >
            <svg
              width="26"
              height="26"
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
            disabled={variant === "sync" && !engine.ready}
            aria-label={playing ? t("pause") : t("play")}
            className="yk-gradient grid size-[74px] cursor-pointer place-items-center rounded-full shadow-[0_0_30px_rgba(53,214,232,0.45)] disabled:opacity-50"
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
            className="grid size-[52px] cursor-pointer place-items-center text-sub hover:text-ink"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M16 6h2v12h-2zM4 6l9 6-9 6z" />
            </svg>
          </button>
          <Link
            href={exitHref}
            aria-label={t("exit")}
            className="grid size-[52px] place-items-center text-sub hover:text-ink"
          >
            <LogOut size={23} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
