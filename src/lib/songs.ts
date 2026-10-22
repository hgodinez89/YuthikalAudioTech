import { DB_KEYS, ROOT_SHORT_ES } from "./chords";
import { isUuid } from "./ids";
import { INSTRUMENTS, isInstrument, type Instrument } from "./instruments";

export type SongRow = {
  id: string;
  playlist_id: string | null;
  name: string;
  description: string;
  key_note: string;
  /** Instrumentos para los que está preparada (informativo; vacío = sin definir). */
  instruments: Instrument[];
  content: string;
  created_at: string;
};

export type SongInput = {
  /** Playlist opcional: la lista de canciones es plana. */
  playlistId: string | null;
  name: string;
  description: string;
  keyNote: string;
  instruments: Instrument[];
};

/** Tonalidades disponibles: 12 raíces × mayor/menor ("C", "Cm", …). */
export const KEY_OPTIONS: string[] = DB_KEYS.flatMap((k) => [k, `${k}m`]);

/** Etiqueta de tonalidad como en el handoff: "Mi menor — Em", "Sol — G". */
export function keyLabel(keyNote: string): string {
  const minor = keyNote.endsWith("m");
  const root = minor ? keyNote.slice(0, -1) : keyNote;
  const rootEs = ROOT_SHORT_ES[root];
  if (!rootEs) return keyNote;
  return `${rootEs}${minor ? " menor" : ""} — ${keyNote}`;
}

/** Instrumentos en el orden de la app, sin repetidos. */
export function sortInstruments(list: readonly Instrument[]): Instrument[] {
  return INSTRUMENTS.filter((i) => list.includes(i));
}

/** "setlist": orden propio de una playlist (solo con una playlist filtrada). */
export type SongSort = "recent" | "name" | "instruments" | "playlist" | "setlist";
export type SortDir = "asc" | "desc";
export const SONG_SORTS: SongSort[] = ["recent", "name", "instruments", "playlist"];
/** Dirección natural al elegir cada criterio. */
export const DEFAULT_DIR: Record<SongSort, SortDir> = {
  recent: "desc",
  name: "asc",
  instruments: "asc",
  playlist: "asc",
  setlist: "asc",
};

type SortableSong = Pick<
  SongRow,
  "name" | "created_at" | "instruments" | "playlist_id"
> & {
  /** Lugar en el setlist de su playlist; null = al final, por fecha. */
  playlist_position?: number | null;
};

/**
 * Orden de la lista de canciones. "instruments" agrupa: preparadas para el
 * instrumento actual, para otros, sin definir. Las canciones sin playlist van
 * al final en cualquier dirección. "setlist" ignora la dirección: posición
 * guardada y, sin ella, al final por fecha de creación.
 */
export function sortSongs<T extends SortableSong>(
  songs: readonly T[],
  opts: {
    by: SongSort;
    dir: SortDir;
    instrument: Instrument;
    playlistNames: Map<string, string>;
    locale: string;
  },
): T[] {
  const collator = new Intl.Collator(opts.locale, { sensitivity: "base", numeric: true });
  const sign = opts.dir === "asc" ? 1 : -1;
  const byName = (a: T, b: T) => collator.compare(a.name, b.name);
  const byDate = (a: T, b: T) => a.created_at.localeCompare(b.created_at);
  const group = (s: T) =>
    s.instruments.includes(opts.instrument) ? 0 : s.instruments.length > 0 ? 1 : 2;
  const listName = (s: T) =>
    s.playlist_id ? (opts.playlistNames.get(s.playlist_id) ?? null) : null;

  const compare = (a: T, b: T): number => {
    switch (opts.by) {
      case "recent":
        return sign * byDate(a, b);
      case "name":
        return sign * byName(a, b) || -byDate(a, b);
      case "instruments":
        return sign * (group(a) - group(b)) || byName(a, b);
      case "playlist": {
        const la = listName(a);
        const lb = listName(b);
        if (la === null || lb === null) {
          return (la === null ? 1 : 0) - (lb === null ? 1 : 0) || byName(a, b);
        }
        return sign * collator.compare(la, lb) || byName(a, b);
      }
      case "setlist": {
        const pa = a.playlist_position ?? null;
        const pb = b.playlist_position ?? null;
        if (pa === null || pb === null) {
          return (pa === null ? 1 : 0) - (pb === null ? 1 : 0) || byDate(a, b);
        }
        return pa - pb || byDate(a, b);
      }
    }
  };
  return [...songs].sort(compare);
}

export type SongValidationError =
  "name" | "description" | "keyNote" | "instruments" | "playlist";

export function validateSong(input: SongInput): SongValidationError | null {
  if (input.playlistId !== null && !isUuid(input.playlistId)) {
    return "playlist";
  }
  const name = input.name.trim();
  if (name.length < 1 || name.length > 150) return "name";
  if (input.description.trim().length > 300) return "description";
  if (input.keyNote && !KEY_OPTIONS.includes(input.keyNote)) return "keyNote";
  // Llega de una server action: no confiar en el tipo.
  const instruments: unknown = input.instruments;
  if (
    !Array.isArray(instruments) ||
    !instruments.every(isInstrument) ||
    new Set(instruments).size !== instruments.length
  ) {
    return "instruments";
  }
  return null;
}

export const MAX_CONTENT_LENGTH = 20000;

const MAX_NAME_LENGTH = 150;

/** Nombre sugerido para una copia: "Canción (copia)", sin pasar del máximo. */
export function copyName(name: string, suffix: string): string {
  const tail = ` (${suffix})`;
  return name.trim().slice(0, MAX_NAME_LENGTH - tail.length) + tail;
}

export type DuplicateInclude = { audio: boolean; sync: boolean };

/** Fila de "Mis canciones": sin la letra, con el resumen de audio y sincronización. */
export type SongListRow = Omit<SongRow, "content"> & {
  /** Lugar en el setlist de su playlist (null = al final). */
  playlist_position: number | null;
  source: "youtube" | "file" | null;
  /** Título del video (para mostrarlo al duplicar). */
  youtubeTitle: string | null;
  synced: boolean;
  /** Marcas de sincronización y su precisión (para mostrarlas al duplicar). */
  stampCount: number;
  granularity: "line" | "word" | null;
  /** Para actualizar la copia descargada (ver songVersion). */
  version: string;
};

/** La sincronización solo tiene sentido con el audio al que pertenecen sus marcas. */
export function normalizeInclude(include: DuplicateInclude): DuplicateInclude {
  return { audio: include.audio, sync: include.audio && include.sync };
}
