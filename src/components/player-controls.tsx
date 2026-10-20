"use client";

import { Gauge, Keyboard, MonitorPlay, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type KeyboardEvent } from "react";
import { Menu, MenuItem, Popover } from "./menu";
import { formatTime } from "@/lib/audio";

/* Piezas de reproducción compartidas por Calibración y Karaoke. */

export const SKIP_SECONDS = 10;

export const SMALL_BUTTON =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] border border-edge-2 bg-surface-2 px-2.5 text-[12.5px] font-semibold tabular-nums text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

/* Panel flotante encima del botón. */
const PANEL =
  "absolute bottom-12 z-[71] rounded-[12px] border border-edge-2 bg-surface p-1.5 shadow-pop";

/** Velocidad de reproducción: botón con el valor actual y menú de opciones. */
export function SpeedControl({
  rate,
  rates,
  onChange,
  disabled,
}: {
  rate: number;
  rates: readonly number[];
  onChange: (rate: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("player");
  return (
    <Menu
      label={t("speed")}
      trigger={{
        "aria-label": `${t("speed")}: ${rate}×`,
        title: t("speed"),
        disabled,
        className: `${SMALL_BUTTON} min-w-[64px] ${rate !== 1 ? "border-accent/50 text-accent" : ""}`,
        children: (
          <>
            <Gauge size={15} strokeWidth={2} />
            {rate}×
          </>
        ),
      }}
      panelClassName={`${PANEL} left-1/2 flex -translate-x-1/2 flex-col gap-0.5`}
    >
      {rates.map((value) => (
        <MenuItem
          key={value}
          checked={rate === value}
          onSelect={() => onChange(value)}
          className={`justify-center rounded-[8px] px-4 py-1.5 text-[13px] font-semibold tabular-nums ${
            rate === value ? "bg-accent/15 text-accent" : "text-sub hover:text-ink"
          }`}
        >
          {value}×
        </MenuItem>
      ))}
    </Menu>
  );
}

/** Silenciar + deslizador de volumen (el deslizador solo en pantallas medianas). */
export function VolumeControl({
  volume,
  muted,
  onToggleMute,
  onVolume,
  disabled,
}: {
  volume: number;
  muted: boolean;
  onToggleMute: () => void;
  onVolume: (volume: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("player");
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        aria-label={muted ? t("unmute") : t("mute")}
        title={muted ? t("unmute") : t("mute")}
        className={SMALL_BUTTON}
      >
        {muted || volume === 0 ? (
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
        value={muted ? 0 : volume}
        onChange={(e) => onVolume(Number(e.target.value))}
        disabled={disabled}
        aria-label={t("volume")}
        className="hidden w-20 cursor-pointer accent-[var(--accent)] md:block"
      />
    </div>
  );
}

/** Abre/cierra el video flotante de YouTube. */
export function VideoToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const t = useTranslations("player");
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={open}
      aria-label={open ? t("videoClose") : t("videoOpen")}
      title={open ? t("videoClose") : t("videoOpen")}
      className={`${SMALL_BUTTON} ${open ? "border-accent/50 text-accent" : ""}`}
    >
      <MonitorPlay size={16} strokeWidth={2} />
    </button>
  );
}

/** Botón con la lista de atajos de teclado (también en tablet o celular con teclado o pedal). */
export function ShortcutsButton({ items }: { items: { keys: string; label: string }[] }) {
  const t = useTranslations("player");
  return (
    <Popover
      trigger={{
        "aria-label": t("shortcuts"),
        title: t("shortcuts"),
        className: SMALL_BUTTON,
        children: <Keyboard size={16} strokeWidth={2} />,
      }}
      panelClassName={`${PANEL} right-0`}
    >
      <div className="w-[250px] p-1.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-tert">
          {t("shortcuts")}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          {items.map(({ keys, label }) => (
            <div key={label} className="contents">
              <dt>
                <kbd className="rounded-[5px] border border-edge-2 bg-surface-2 px-1.5 py-px font-mono text-[11px] text-ink">
                  {keys}
                </kbd>
              </dt>
              <dd className="text-sub">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Popover>
  );
}

/* Barras deterministas de la onda (mismo dibujo que antes). */
const waveBars = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    Math.round(6 + Math.abs(Math.sin(i * 0.5)) * 20 + (i % 3) * 2),
  );

/**
 * Onda de progreso con tiempos a los lados: clic para saltar y globo con el
 * tiempo al pasar el mouse.
 */
export function ProgressWave({
  current,
  duration,
  onSeek,
  bars = 64,
  className = "",
}: {
  current: number;
  duration: number;
  onSeek: (seconds: number) => void;
  bars?: number;
  className?: string;
}) {
  const t = useTranslations("player");
  const [hover, setHover] = useState<number | null>(null);
  const heights = waveBars(bars);
  const progress = duration ? current / duration : 0;

  /* Teclado (patrón slider): flechas ±5 s, Re Pág/Av Pág ±10 s, Inicio y Fin. */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!duration) return;
    const step =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? 5
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -5
          : e.key === "PageUp"
            ? 10
            : e.key === "PageDown"
              ? -10
              : null;
    const target =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? duration
          : step !== null
            ? current + step
            : null;
    if (target === null) return;
    // Que no lo repitan los atajos globales del reproductor.
    e.preventDefault();
    e.stopPropagation();
    onSeek(Math.min(duration, Math.max(0, target)));
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="shrink-0 text-[12.5px] tabular-nums text-sub">
        {formatTime(current)}
      </span>
      <div
        role="slider"
        tabIndex={duration ? 0 : -1}
        aria-label={t("seek")}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
        aria-valuetext={`${formatTime(current)} / ${formatTime(duration)}`}
        aria-disabled={!duration || undefined}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          if (!duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - rect.left) / rect.width) * duration);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHover(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
        }}
        onMouseLeave={() => setHover(null)}
        className="relative flex h-[34px] flex-1 cursor-pointer items-center gap-[2.5px] rounded-md"
      >
        {heights.map((h, i) => (
          <span
            key={i}
            className="min-w-[2px] flex-1 rounded-[2px]"
            style={{
              height: h,
              background:
                i / bars <= progress
                  ? "linear-gradient(180deg, var(--grad-to), var(--grad-from))"
                  : "var(--edge)",
            }}
          />
        ))}
        {hover !== null && duration > 0 && (
          <>
            <span
              className="pointer-events-none absolute inset-y-0 w-px bg-accent/70"
              style={{ left: `${hover * 100}%` }}
            />
            <span
              className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md border border-edge-2 bg-surface px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-ink shadow-pop"
              style={{ left: `${hover * 100}%` }}
            >
              {formatTime(hover * duration)}
            </span>
          </>
        )}
      </div>
      <span className="shrink-0 text-[12.5px] tabular-nums text-tert">
        {formatTime(duration)}
      </span>
    </div>
  );
}
