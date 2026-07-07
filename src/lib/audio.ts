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
