import type { ChordDataMap } from "@/components/chord-sheet";
import type { SongAudioRow, SongSyncRow } from "./audio";
import { isUuid } from "./ids";
import { isInstrument, type Instrument } from "./instruments";
import type { SongRow } from "./songs";

/*
 * Canciones descargadas para usarlas sin conexión (lógica pura; el
 * almacenamiento vive en offline-songs-db). Lo descargado se define por
 * suscripciones: canciones sueltas, playlists enteras o «todas». Una
 * playlist o «todas» incluyen también lo que se agregue después.
 */

export type OfflineSong = SongRow & {
  playlist_position: number | null;
  /** Solo el tipo de audio (sin conexión no suena; decide si hay marcas). */
  audio: Pick<SongAudioRow, "source"> | null;
  /** Sincronización ya reubicada sobre la letra actual. */
  sync: SongSyncRow | null;
  syncMissing: number;
  /** Para saber si la copia quedó vieja (ver songVersion). */
  version: string;
};

export type OfflineScope = { all: boolean; playlists: string[]; songs: string[] };

export const EMPTY_SCOPE: OfflineScope = { all: false, playlists: [], songs: [] };

export type OfflinePlaylist = { id: string; name: string; songs_count: number };

/** Diagramas de los acordes de lo descargado, por instrumento. */
export type OfflineChords = Record<Instrument, ChordDataMap>;

/** Lo que devuelve /api/offline/songs. */
export type OfflinePayload = {
  userId: string;
  songs: OfflineSong[];
  playlists: OfflinePlaylist[];
  chords: OfflineChords;
};

/** Tope de canciones por pedido (igual que la lista). */
export const MAX_OFFLINE_SONGS = 1000;

/** Una vez al día se baja todo de nuevo (p. ej. acordes propios editados). */
export const FULL_REFRESH_MS = 24 * 60 * 60 * 1000;

type ListedSong = { id: string; playlist_id: string | null };

/**
 * Lo que cambia la copia guardada: la canción (letra y datos), su
 * sincronización y su lugar en el setlist (reordenar no toca updated_at).
 */
export function songVersion(row: {
  updated_at: string;
  sync_updated_at: string | null;
  playlist_id: string | null;
  playlist_position: number | null;
}): string {
  return [
    row.updated_at,
    row.sync_updated_at ?? "",
    row.playlist_id ?? "",
    row.playlist_position ?? "",
  ].join("|");
}

/** Por qué está descargada (la suscripción más amplia gana); null = no lo está. */
export type Coverage = "all" | "playlist" | "song" | null;

export function coverage(scope: OfflineScope, song: ListedSong): Coverage {
  if (scope.all) return "all";
  if (song.playlist_id && scope.playlists.includes(song.playlist_id)) return "playlist";
  if (scope.songs.includes(song.id)) return "song";
  return null;
}

/** Canciones de la lista que cubren las suscripciones. */
export function wantedIds(scope: OfflineScope, list: ListedSong[]): Set<string> {
  return new Set(list.filter((s) => coverage(scope, s) !== null).map((s) => s.id));
}

/**
 * Qué bajar y qué quitar al abrir Canciones con conexión: lo que falta, lo
 * que cambió (o todo, si toca el refresco diario) y lo que ya no cubre
 * ninguna suscripción (borrado o sacado de la playlist).
 */
export function planRefresh(
  stored: Map<string, string>,
  list: (ListedSong & { version: string })[],
  scope: OfflineScope,
  full: boolean,
): { download: string[]; remove: string[] } {
  const wanted = wantedIds(scope, list);
  const download = list
    .filter((s) => wanted.has(s.id) && (full || stored.get(s.id) !== s.version))
    .map((s) => s.id);
  const remove = [...stored.keys()].filter((id) => !wanted.has(id));
  return { download, remove };
}

/** Quita suscripciones a playlists que ya no existen y canciones sueltas cubiertas. */
export function tidyScope(
  scope: OfflineScope,
  playlistIds: string[],
  songIds: string[],
): OfflineScope {
  return {
    all: scope.all,
    playlists: scope.playlists.filter((id) => playlistIds.includes(id)),
    songs: scope.songs.filter((id) => songIds.includes(id)),
  };
}

/** Canciones de una playlist en el orden del setlist (como el concierto con red). */
export function setlistOrder<
  T extends { playlist_position: number | null; created_at: string },
>(songs: T[]): T[] {
  return [...songs].sort(
    (a, b) =>
      (a.playlist_position ?? Number.MAX_SAFE_INTEGER) -
        (b.playlist_position ?? Number.MAX_SAFE_INTEGER) ||
      a.created_at.localeCompare(b.created_at),
  );
}

/* ---------- rutas dentro de la página sin conexión ---------- */

/*
 * La página sin conexión de canciones recibe la dirección pedida en el
 * fragmento (/es/offline/songs#/es/guitar/songs/<id>?mode=karaoke) y navega
 * cambiando ese fragmento: son las mismas rutas que con conexión.
 */
export type OfflineRoute =
  | { view: "list"; list: string | null }
  | { view: "song"; id: string; mode: "view" | "karaoke" }
  | { view: "concert"; list: string };

export function parseSongsHash(
  hash: string,
): { locale: "es" | "en"; instrument: Instrument; route: OfflineRoute } | null {
  const m = /^#\/(es|en)\/([a-z]+)\/songs(?:\/([^/?#]+))?\/?(?:\?(.*))?$/.exec(hash);
  if (!m || !isInstrument(m[2])) return null;
  const [, locale, instrument, segment, query] = m;
  const params = new URLSearchParams(query ?? "");
  const list = params.get("list");
  const base = { locale: locale as "es" | "en", instrument };
  if (!segment) {
    return { ...base, route: { view: "list", list: list && isUuid(list) ? list : null } };
  }
  if (segment === "concert") {
    return list && isUuid(list) ? { ...base, route: { view: "concert", list } } : null;
  }
  if (!isUuid(segment)) return null;
  // Editar o sincronizar no existen sin conexión: se ve la letra.
  const mode = params.get("mode") === "karaoke" ? "karaoke" : "view";
  return { ...base, route: { view: "song", id: segment, mode } };
}

/** Fragmento de una ruta (el inverso de parseSongsHash). */
export function songsHash(locale: string, instrument: Instrument, route: OfflineRoute) {
  const base = `#/${locale}/${instrument}/songs`;
  switch (route.view) {
    case "list":
      return route.list ? `${base}?list=${route.list}` : base;
    case "concert":
      return `${base}/concert?list=${route.list}`;
    case "song":
      return `${base}/${route.id}${route.mode === "karaoke" ? "?mode=karaoke" : ""}`;
  }
}

/** Duración del reloj del karaoke sin audio: el fin marcado o la última marca + 4 s. */
export function clockDuration(sync: SongSyncRow): number {
  if (sync.end_at) return sync.end_at;
  const last = sync.stamps.reduce((max, s) => Math.max(max, s.t), 0);
  return last + 4;
}
