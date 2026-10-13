"use client";

import { Gauge, Keyboard, MonitorPlay, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { formatTime } from "@/lib/audio";

/* Piezas de reproducción compartidas por Calibración y Karaoke. */

export const SKIP_SECONDS = 10;

export const SMALL_BUTTON =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] border border-edge-2 bg-surface-2 px-2.5 text-[12.5px] font-semibold tabular-nums text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

/* Menú flotante encima del botón, con un fondo que lo cierra al hacer clic fuera. */
function Popover({
  open,
  onClose,
  align,
  children,
}: {
  open: boolean;
  onClose: () => void;
  align: "center" | "right";
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <div
        className={`absolute bottom-12 z-[71] rounded-[12px] border border-edge-2 bg-surface p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.5)] ${
          align === "center" ? "left-1/2 -translate-x-1/2" : "right-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}

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
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label={t("speed")}
        title={t("speed")}
        className={`${SMALL_BUTTON} min-w-[64px] ${rate !== 1 ? "border-accent/50 text-accent" : ""}`}
      >
        <Gauge size={15} strokeWidth={2} />
        {rate}×
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="center">
        <div className="flex flex-col gap-0.5">
          {rates.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                onChange(value);
                setOpen(false);
              }}
              className={`cursor-pointer rounded-[8px] px-4 py-1.5 text-[13px] font-semibold tabular-nums ${
                rate === value
                  ? "bg-accent/15 text-accent"
                  : "text-sub hover:bg-edge hover:text-ink"
              }`}
            >
              {value}×
            </button>
          ))}
        </div>
      </Popover>
    </div>
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

/** Botón con la lista de atajos de teclado (oculto en celular). */
export function ShortcutsButton({ items }: { items: { keys: string; label: string }[] }) {
  const t = useTranslations("player");
  const [open, setOpen] = useState(false);
  return (
    <div className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("shortcuts")}
        title={t("shortcuts")}
        className={SMALL_BUTTON}
      >
        <Keyboard size={16} strokeWidth={2} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="right">
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
    </div>
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
  const [hover, setHover] = useState<number | null>(null);
  const heights = waveBars(bars);
  const progress = duration ? current / duration : 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="shrink-0 text-[12.5px] tabular-nums text-sub">
        {formatTime(current)}
      </span>
      <div
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
        className="relative flex h-[34px] flex-1 cursor-pointer items-center gap-[2.5px]"
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
              className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md border border-edge-2 bg-surface px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-ink shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
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
