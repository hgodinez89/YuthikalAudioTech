/** Dominio de audio y sincronización. */

import { syncTargets } from "./chordpro";

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

/**
 * Subida de MP3 (Storage) deshabilitada por ahora: es lo que más consume del
 * plan gratuito. Las canciones que ya tienen MP3 siguen sonando. Reactivar
 * exige también restaurar las políticas de subida del bucket (ver docs).
 */
export const MP3_ENABLED = false;

/** Tope absoluto de objetivos (y de marcas) de una sincronización; igual en la BD. */
export const MAX_SYNC_TARGETS = 10000;

/**
 * Valida la lista de timestamps contra los objetivos de la letra actual:
 * índices únicos dentro de [0, total), tiempos finitos y ≥ 0.
 */
export function validateStamps(stamps: unknown, total: number): stamps is SyncStamp[] {
  const max = Math.min(total, MAX_SYNC_TARGETS);
  if (!Array.isArray(stamps) || stamps.length > max) return false;
  const seen = new Set<number>();
  for (const stamp of stamps) {
    if (typeof stamp !== "object" || stamp === null) return false;
    const { i, t } = stamp as Record<string, unknown>;
    if (!Number.isInteger(i) || (i as number) < 0 || (i as number) >= max) return false;
    if (seen.has(i as number)) return false;
    if (typeof t !== "number" || !Number.isFinite(t) || t < 0) return false;
    seen.add(i as number);
  }
  return true;
}

/**
 * Reubica las marcas cuando la letra cambió desde que se sincronizó.
 * Con la misma cantidad de objetivos (una errata corregida) todo sigue igual;
 * si se agregaron o quitaron, se conservan las marcas del tramo común del
 * inicio y del final, y lo del medio queda por marcar. `missing` cuenta los
 * objetivos nuevos sin marca. Sin huella guardada (sincronizaciones previas a
 * la huella) solo se descartan las marcas que ya no existen.
 */
export function remapStamps(
  oldKeys: string[] | null,
  newKeys: string[],
  stamps: SyncStamp[],
): { stamps: SyncStamp[]; missing: number } {
  const total = newKeys.length;
  if (!oldKeys || oldKeys.length === total) {
    return { stamps: stamps.filter((s) => s.i < total), missing: 0 };
  }
  const limit = Math.min(oldKeys.length, total);
  let prefix = 0;
  while (prefix < limit && oldKeys[prefix] === newKeys[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < limit - prefix &&
    oldKeys[oldKeys.length - 1 - suffix] === newKeys[total - 1 - suffix]
  ) {
    suffix++;
  }
  const shift = total - oldKeys.length;
  const tailStart = oldKeys.length - suffix;
  const kept = stamps.flatMap((s) =>
    s.i < prefix ? [s] : s.i >= tailStart ? [{ i: s.i + shift, t: s.t }] : [],
  );
  return { stamps: kept, missing: total - prefix - suffix };
}

/**
 * Sincronización guardada frente a la letra actual: marcas reubicadas y
 * cuántos objetivos nuevos quedaron sin marca (para avisar).
 */
export function reconcileSync(
  sync: SongSyncRow & { targets: string[] | null },
  content: string,
): { sync: SongSyncRow; missing: number } {
  const { targets, ...row } = sync;
  const { stamps, missing } = remapStamps(
    targets,
    syncTargets(content, sync.granularity),
    sync.stamps,
  );
  return { sync: { ...row, stamps }, missing };
}

/** Siguiente objetivo sin marcar después de `from` (o el primero libre; o `total`). */
export function nextUnmarked(
  stamps: Map<number, number>,
  from: number,
  total: number,
): number {
  for (let i = from + 1; i < total; i++) if (!stamps.has(i)) return i;
  for (let i = 0; i <= from && i < total; i++) if (!stamps.has(i)) return i;
  return total;
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

/** Fin máximo de una sincronización (24 h); igual en la BD. */
const MAX_END_AT = 86400;

/** El fin es opcional; si existe, va después de todas las marcas. */
export function validateSyncEnd(endAt: unknown, stamps: SyncStamp[]): boolean {
  if (endAt === null) return true;
  if (typeof endAt !== "number" || !Number.isFinite(endAt)) return false;
  if (endAt <= 0 || endAt > MAX_END_AT) return false;
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
