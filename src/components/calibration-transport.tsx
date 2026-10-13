"use client";

import { History, Pause, Play, RotateCcw, SkipBack } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ProgressWave,
  ShortcutsButton,
  SKIP_SECONDS,
  SMALL_BUTTON,
  SpeedControl,
  VideoToggle,
  VolumeControl,
} from "./player-controls";
import type { AudioEngine } from "@/lib/use-audio-engine";

export const RATES = [0.5, 0.75, 1, 1.25] as const;
export { SKIP_SECONDS };

/**
 * Transporte de la calibración: inicio, ±10 s, reproducir, progreso con
 * tiempo al pasar el mouse, velocidad, volumen, video, repasar y atajos.
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
  const tp = useTranslations("player");
  const disabled = !engine.ready;

  const shortcuts = [
    { keys: tp("keys.space"), label: t("keys.mark") },
    { keys: "K", label: tp("keys.playPause") },
    { keys: "← / →", label: tp("keys.skip5") },
    { keys: "J / L", label: tp("keys.skip10") },
    { keys: tp("keys.home"), label: tp("keys.toStart") },
    { keys: "[ / ]", label: tp("keys.speed") },
    { keys: "M", label: tp("keys.mute") },
    { keys: "R", label: t("keys.review") },
    ...(video ? [{ keys: "V", label: tp("keys.video") }] : []),
  ];

  return (
    <div
      data-transport
      className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-page/95 backdrop-blur-[14px]"
    >
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:px-7">
        {/* Navegación */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => engine.seekTo(0)}
            disabled={disabled}
            aria-label={tp("toStart")}
            title={tp("toStart")}
            className={SMALL_BUTTON}
          >
            <SkipBack size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => engine.skip(-SKIP_SECONDS)}
            disabled={disabled}
            aria-label={tp("back10")}
            title={tp("back10")}
            className={SMALL_BUTTON}
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
            aria-label={tp("forward10")}
            title={tp("forward10")}
            className={SMALL_BUTTON}
          >
            +{SKIP_SECONDS}
          </button>
        </div>

        {/* Progreso: en pantallas angostas ocupa su propia fila arriba */}
        <ProgressWave
          current={engine.currentTime}
          duration={engine.duration}
          onSeek={engine.seekTo}
          className="order-first w-full lg:order-none lg:w-auto lg:flex-1"
        />

        {/* Ajustes y acciones */}
        <div className="ml-auto flex items-center gap-1.5">
          <SpeedControl
            rate={engine.rate}
            rates={RATES}
            onChange={engine.setRate}
            disabled={disabled}
          />
          <VolumeControl
            volume={engine.volume}
            muted={engine.muted}
            onToggleMute={engine.toggleMute}
            onVolume={engine.setVolume}
            disabled={disabled}
          />
          {video && <VideoToggle open={video.open} onToggle={video.onToggle} />}
          <button
            type="button"
            onClick={onReview}
            disabled={disabled}
            title={t("reviewHint")}
            className={SMALL_BUTTON}
          >
            <History size={15} strokeWidth={2} />
            <span className="hidden xl:inline">{t("review")}</span>
          </button>
          <ShortcutsButton items={shortcuts} />
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
