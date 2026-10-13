"use client";

import {
  Gauge,
  History,
  Keyboard,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { formatTime } from "@/lib/audio";
import type { AudioEngine } from "@/lib/use-audio-engine";

export const RATES = [0.5, 0.75, 1, 1.25] as const;
export const SKIP_SECONDS = 10;

/* Barras deterministas de la onda (mismo dibujo que antes). */
const BARS = Array.from({ length: 64 }, (_, i) =>
  Math.round(6 + Math.abs(Math.sin(i * 0.5)) * 20 + (i % 3) * 2),
);

/* Tecla (literal, o `null` si su nombre se traduce: keys.<acción>Key) y acción. */
const SHORTCUTS = [
  [null, "mark"],
  ["K", "playPause"],
  ["← / →", "skip5"],
  ["J / L", "skip10"],
  [null, "toStart"],
  ["[ / ]", "speed"],
  ["M", "mute"],
  ["R", "review"],
  ["V", "video"],
] as const;

/**
 * Transporte de la calibración: inicio, ±10 s, reproducir, progreso con
 * tiempo al pasar el mouse, velocidad, volumen, repasar y atajos.
 */
export function CalibrationTransport({
  engine,
  onReview,
  onReset,
  resetDisabled,
  video,
}: {
  engine: AudioEngine;
  onReview: () => void;
  onReset: () => void;
  resetDisabled: boolean;
  /** Mostrar/ocultar el video flotante (solo con fuente YouTube). */
  video?: { open: boolean; onToggle: () => void };
}) {
  const t = useTranslations("calibration");
  const [hover, setHover] = useState<number | null>(null);
  const [menu, setMenu] = useState<"rate" | "keys" | null>(null);

  const progress = engine.duration ? engine.currentTime / engine.duration : 0;
  const disabled = !engine.ready;

  const smallButton =
    "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] border border-edge-2 bg-surface-2 px-2.5 text-[12.5px] font-semibold tabular-nums text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      data-transport
      className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-page/95 backdrop-blur-[14px]"
    >
      {menu && <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />}
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:px-7">
        {/* Navegación */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => engine.seekTo(0)}
            disabled={disabled}
            aria-label={t("toStart")}
            title={t("toStart")}
            className={smallButton}
          >
            <SkipBack size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => engine.skip(-SKIP_SECONDS)}
            disabled={disabled}
            aria-label={t("back10")}
            title={t("back10")}
            className={smallButton}
          >
            −{SKIP_SECONDS}
          </button>
          <button
            type="button"
            onClick={engine.toggle}
            disabled={disabled}
            aria-label={engine.playing ? t("pause") : t("play")}
            className="yk-gradient mx-1 grid size-[46px] shrink-0 cursor-pointer place-items-center rounded-full shadow-[0_4px_18px_rgba(46,107,240,0.35)] disabled:opacity-50"
          >
            {engine.playing ? (
              <Pause size={18} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={18} fill="currentColor" strokeWidth={0} className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => engine.skip(SKIP_SECONDS)}
            disabled={disabled}
            aria-label={t("forward10")}
            title={t("forward10")}
            className={smallButton}
          >
            +{SKIP_SECONDS}
          </button>
        </div>

        {/* Progreso: en pantallas angostas ocupa su propia fila arriba */}
        <div className="order-first flex w-full items-center gap-3 lg:order-none lg:w-auto lg:flex-1">
          <span className="shrink-0 text-[12.5px] tabular-nums text-sub">
            {formatTime(engine.currentTime)}
          </span>
          <div
            onClick={(e) => {
              if (!engine.duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              engine.seekTo(((e.clientX - rect.left) / rect.width) * engine.duration);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHover(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
            }}
            onMouseLeave={() => setHover(null)}
            className="relative flex h-[34px] flex-1 cursor-pointer items-center gap-[2.5px]"
          >
            {BARS.map((h, i) => (
              <span
                key={i}
                className="min-w-[2px] flex-1 rounded-[2px]"
                style={{
                  height: h,
                  background:
                    i / BARS.length <= progress
                      ? "linear-gradient(180deg, var(--grad-to), var(--grad-from))"
                      : "var(--edge)",
                }}
              />
            ))}
            {/* Tiempo al pasar el mouse */}
            {hover !== null && engine.duration > 0 && (
              <>
                <span
                  className="pointer-events-none absolute inset-y-0 w-px bg-accent/70"
                  style={{ left: `${hover * 100}%` }}
                />
                <span
                  className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md border border-edge-2 bg-surface px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-ink shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
                  style={{ left: `${hover * 100}%` }}
                >
                  {formatTime(hover * engine.duration)}
                </span>
              </>
            )}
          </div>
          <span className="shrink-0 text-[12.5px] tabular-nums text-tert">
            {formatTime(engine.duration)}
          </span>
        </div>

        {/* Ajustes y acciones */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Velocidad */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu(menu === "rate" ? null : "rate")}
              disabled={disabled}
              aria-label={t("speed")}
              title={t("speed")}
              className={`${smallButton} min-w-[64px] ${engine.rate !== 1 ? "border-accent/50 text-accent" : ""}`}
            >
              <Gauge size={15} strokeWidth={2} />
              {engine.rate}×
            </button>
            {menu === "rate" && (
              <div className="absolute bottom-12 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-0.5 rounded-[12px] border border-edge-2 bg-surface p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.5)]">
                {RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      engine.setRate(rate);
                      setMenu(null);
                    }}
                    className={`cursor-pointer rounded-[8px] px-4 py-1.5 text-[13px] font-semibold tabular-nums ${
                      engine.rate === rate
                        ? "bg-accent/15 text-accent"
                        : "text-sub hover:bg-edge hover:text-ink"
                    }`}
                  >
                    {rate}×
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volumen */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={engine.toggleMute}
              disabled={disabled}
              aria-label={engine.muted ? t("unmute") : t("mute")}
              title={engine.muted ? t("unmute") : t("mute")}
              className={smallButton}
            >
              {engine.muted || engine.volume === 0 ? (
                <VolumeX size={16} strokeWidth={2} />
              ) : (
                <Volume2 size={16} strokeWidth={2} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={engine.muted ? 0 : engine.volume}
              onChange={(e) => engine.setVolume(Number(e.target.value))}
              disabled={disabled}
              aria-label={t("volume")}
              className="hidden w-20 cursor-pointer accent-[var(--accent)] md:block"
            />
          </div>

          {/* Video (YouTube): abre/cierra el mini-reproductor */}
          {video && (
            <button
              type="button"
              onClick={video.onToggle}
              aria-pressed={video.open}
              aria-label={video.open ? t("videoClose") : t("videoOpen")}
              title={video.open ? t("videoClose") : t("videoOpen")}
              className={`${smallButton} ${video.open ? "border-accent/50 text-accent" : ""}`}
            >
              <MonitorPlay size={16} strokeWidth={2} />
            </button>
          )}

          {/* Repasar */}
          <button
            type="button"
            onClick={onReview}
            disabled={disabled}
            title={t("reviewHint")}
            className={smallButton}
          >
            <History size={15} strokeWidth={2} />
            <span className="hidden xl:inline">{t("review")}</span>
          </button>

          {/* Atajos */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setMenu(menu === "keys" ? null : "keys")}
              aria-label={t("shortcuts")}
              title={t("shortcuts")}
              className={smallButton}
            >
              <Keyboard size={16} strokeWidth={2} />
            </button>
            {menu === "keys" && (
              <div className="absolute bottom-12 right-0 z-50 w-[240px] rounded-[12px] border border-edge-2 bg-surface p-3 shadow-[0_18px_44px_rgba(0,0,0,0.5)]">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-tert">
                  {t("shortcuts")}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
                  {SHORTCUTS.filter(([, action]) => action !== "video" || video).map(
                    ([key, action]) => (
                      <div key={action} className="contents">
                        <dt>
                          <kbd className="rounded-[5px] border border-edge-2 bg-surface-2 px-1.5 py-px font-mono text-[11px] text-ink">
                            {key ?? t(`keys.${action}Key`)}
                          </kbd>
                        </dt>
                        <dd className="text-sub">{t(`keys.${action}`)}</dd>
                      </div>
                    ),
                  )}
                </dl>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={resetDisabled}
            title={t("reset")}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-[11px] border border-edge-2 bg-surface-2 px-3 text-[13px] font-semibold disabled:opacity-50"
          >
            <RotateCcw size={15} strokeWidth={2} />
            {/* Solo ícono: con el texto la barra no cabe en una fila (confirma igual). */}
            <span className="sr-only">{t("reset")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
