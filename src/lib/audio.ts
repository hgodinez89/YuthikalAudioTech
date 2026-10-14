/** Dominio de audio y sincronización. */

export type SongAudioRow = {
  song_id: string;
  source: "youtube" | "file";
  youtube_id: string | null;
  youtube_title: string | null;
  file_path: string | null;
};

export type SyncStamp = { i: number; t: number };

export type SongSyncRow = {
  song_id: string;
  granularity: "line" | "word";
  stamps: SyncStamp[];
  /** Fin opcional (s): el karaoke termina ahí. null = hasta el final del audio. */
  end_at: number | null;
};

export const MAX_MP3_BYTES = 15 * 1024 * 1024;
export const MAX_STAMPS = 3000;

/** Valida la lista de timestamps: índices únicos, tiempos finitos y ≥ 0. */
export function validateStamps(stamps: unknown): stamps is SyncStamp[] {
  if (!Array.isArray(stamps) || stamps.length > MAX_STAMPS) return false;
  const seen = new Set<number>();
  for (const stamp of stamps) {
    if (typeof stamp !== "object" || stamp === null) return false;
    const { i, t } = stamp as Record<string, unknown>;
    if (!Number.isInteger(i) || (i as number) < 0 || seen.has(i as number)) return false;
    if (typeof t !== "number" || !Number.isFinite(t) || t < 0) return false;
    seen.add(i as number);
  }
  return true;
}

/** "83.4" → "1:23.4" para mostrar timestamps capturados. */
export function formatStamp(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${mm}:${ss}`;
}

/** "83" → "1:23" para el transporte. */
export function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Tiempo dentro de [0, duración] (sin duración conocida, solo ≥ 0). */
export function clampTime(seconds: number, duration: number): number {
  const max = duration > 0 ? duration : Infinity;
  return Math.min(max, Math.max(0, seconds));
}

/** Segundos de "pre-roll" al repasar o re-marcar: se escucha la entrada. */
export const REVIEW_PREROLL = 3;

/** El fin es opcional; si existe, va después de todas las marcas. */
export function validateSyncEnd(endAt: unknown, stamps: SyncStamp[]): boolean {
  if (endAt === null) return true;
  if (typeof endAt !== "number" || !Number.isFinite(endAt) || endAt <= 0) return false;
  return stamps.every((s) => s.t < endAt);
}

/** Segundos de fundido antes del fin de la sincronización. */
export const FADE_SECONDS = 2;

/** Ganancia del fundido final: 1 fuera de la ventana, baja a 0 en el fin. */
export function fadeGain(now: number, endAt: number | null): number {
  if (endAt === null) return 1;
  const left = endAt - now;
  if (left <= 0) return 0;
  return Math.min(1, left / FADE_SECONDS);
}

/**
 * Punto desde donde repasar: unos segundos antes de la última marca anterior
 * al objetivo actual. Sin marcas previas, desde el inicio.
 */
export function reviewStart(stamps: Map<number, number>, cursor: number): number {
  let last: number | null = null;
  for (const [i, t] of stamps) {
    if (i < cursor && (last === null || t > last)) last = t;
  }
  return last === null ? 0 : Math.max(0, last - REVIEW_PREROLL);
}

/**
 * Al retomar una sincronización a medias: inicio de la línea del último
 * objetivo marcado (el anterior al cursor). Null si no hay nada marcado o ya
 * está completa: entonces se empieza desde 0:00.
 */
export function resumePoint(
  stamps: Map<number, number>,
  cursor: number,
  lines: { firstTarget: number; targetCount: number }[],
  totalTargets: number,
): number | null {
  if (cursor <= 0 || cursor >= totalTargets) return null;
  const last = cursor - 1;
  const line = lines.find(
    (l) => last >= l.firstTarget && last < l.firstTarget + l.targetCount,
  );
  if (!line) return null;
  let start: number | null = null;
  for (let i = line.firstTarget; i < line.firstTarget + line.targetCount; i++) {
    const t = stamps.get(i);
    if (t !== undefined && (start === null || t < start)) start = t;
  }
  return start;
}

/** Velocidad siguiente/anterior dentro de una lista (sin salirse de ella). */
export function stepRate(
  rates: readonly number[],
  current: number,
  direction: 1 | -1,
): number {
  const index = rates.indexOf(current);
  const from = index < 0 ? rates.indexOf(1) : index;
  return rates[Math.min(rates.length - 1, Math.max(0, from + direction))];
}
