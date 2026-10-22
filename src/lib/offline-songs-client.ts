"use client";

import { useEffect, useSyncExternalStore } from "react";
import { locales } from "@/i18n/config";
import { INSTRUMENTS } from "./instruments";
import { staticAssets } from "./offline-cache";
import {
  EMPTY_SCOPE,
  FULL_REFRESH_MS,
  planRefresh,
  tidyScope,
  type OfflineChords,
  type OfflinePayload,
  type OfflinePlaylist,
  type OfflineScope,
  type OfflineSong,
} from "./offline-songs";

/*
 * Canciones descargadas en IndexedDB (base "yk-songs"): las canciones y,
 * en "meta", el dueño, las suscripciones, las playlists, los diagramas y la
 * versión de cada canción. Solo se llena con conexión; sin ella lo lee la
 * página /{idioma}/offline/songs. Se borra al cerrar sesión o si la sesión
 * con conexión es de otra cuenta.
 */

const DB = "yk-songs";
const SONGS = "songs";
const META = "meta";

type Meta = {
  owner: string | null;
  scope: OfflineScope;
  playlists: OfflinePlaylist[];
  chords: OfflineChords;
  versions: Record<string, string>;
  refreshedAt: number;
};

const EMPTY_CHORDS = Object.fromEntries(INSTRUMENTS.map((i) => [i, {}])) as OfflineChords;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(SONGS, { keyPath: "id" });
      req.result.createObjectStore(META);
    };
    req.onsuccess = () => {
      // Otra pestaña borra la base (cerrar sesión): esta suelta su conexión.
      req.result.onversionchange = () => {
        req.result.close();
        dbPromise = null;
      };
      resolve(req.result);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

const done = (req: IDBRequest | IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    if (req instanceof IDBTransaction) {
      req.oncomplete = () => resolve();
      req.onerror = req.onabort = () => reject(req.error);
    } else {
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }
  });

function result<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readMeta(): Promise<Meta> {
  const db = await openDb();
  const store = db.transaction(META).objectStore(META);
  const [owner, scope, playlists, chords, versions, refreshedAt] = await Promise.all(
    ["owner", "scope", "playlists", "chords", "versions", "refreshedAt"].map((k) =>
      result(store.get(k)),
    ),
  );
  return {
    owner: (owner as string | undefined) ?? null,
    scope: (scope as OfflineScope | undefined) ?? EMPTY_SCOPE,
    playlists: (playlists as OfflinePlaylist[] | undefined) ?? [],
    chords: (chords as OfflineChords | undefined) ?? EMPTY_CHORDS,
    versions: (versions as Record<string, string> | undefined) ?? {},
    refreshedAt: (refreshedAt as number | undefined) ?? 0,
  };
}

async function writeMeta(
  meta: Partial<Meta>,
  songs?: { put: OfflineSong[]; remove: string[] },
) {
  const db = await openDb();
  const tx = db.transaction([META, SONGS], "readwrite");
  const metaStore = tx.objectStore(META);
  for (const [key, value] of Object.entries(meta)) metaStore.put(value, key);
  if (songs) {
    const songStore = tx.objectStore(SONGS);
    for (const song of songs.put) songStore.put(song);
    for (const id of songs.remove) songStore.delete(id);
  }
  await done(tx);
}

/** Todo lo guardado (para la página sin conexión). */
export async function loadOfflineSongs(): Promise<{
  songs: OfflineSong[];
  playlists: OfflinePlaylist[];
  chords: OfflineChords;
  scope: OfflineScope;
}> {
  const db = await openDb();
  const songs = await result(
    db.transaction(SONGS).objectStore(SONGS).getAll() as IDBRequest<OfflineSong[]>,
  );
  const meta = await readMeta();
  return { songs, playlists: meta.playlists, chords: meta.chords, scope: meta.scope };
}

/* ---------- estado para la interfaz ---------- */

export type OfflineSongsState = {
  /** Ya se leyó lo guardado. */
  ready: boolean;
  scope: OfflineScope;
  /** id → versión de cada canción guardada. */
  versions: Record<string, string>;
  /** Descarga en curso (canciones listas de un total). */
  busy: { done: number; total: number } | null;
  error: boolean;
};

const INITIAL: OfflineSongsState = {
  ready: false,
  scope: EMPTY_SCOPE,
  versions: {},
  busy: null,
  error: false,
};

let state = INITIAL;
const listeners = new Set<() => void>();

function set(patch: Partial<OfflineSongsState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let loading: Promise<void> | null = null;
function ensureLoaded() {
  loading ??= readMeta().then(
    (meta) => set({ ready: true, scope: meta.scope, versions: meta.versions }),
    () => set({ ready: true }),
  );
  return loading;
}

/* Una operación a la vez: descargas, quitas y borrados no se pisan. */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Estado de lo descargado; lee la base la primera vez que se usa. */
export function useOfflineSongs(): OfflineSongsState {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
  useEffect(() => {
    void ensureLoaded();
  }, []);
  return snapshot;
}

/* ---------- descargar ---------- */

/* Por pedido: el avance se ve y una respuesta no crece sin límite. */
const BATCH = 20;

async function fetchSongs(ids: string[]): Promise<OfflinePayload> {
  const res = await fetch("/api/offline/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
    cache: "no-store",
  });
  if (res.status === 401) throw new SessionGone();
  if (!res.ok) throw new Error(`offline songs ${res.status}`);
  return res.json() as Promise<OfflinePayload>;
}

class SessionGone extends Error {}

/* La página sin conexión de canciones y su código, una vez por visita, en los
   dos idiomas: cambiar de idioma no deja sin ella (los datos no dependen del idioma). */
const pagesSaved = new Set<string>();
async function saveOfflinePage(locale: string) {
  if (pagesSaved.has(locale)) return;
  const res = await fetch(`/${locale}/offline/songs`);
  if (!res.ok) return;
  const assets = staticAssets(await res.text());
  await Promise.allSettled(
    assets.map(async (asset) => {
      if (!(await caches.match(asset))) await (await fetch(asset)).arrayBuffer();
    }),
  );
  pagesSaved.add(locale);
}

/**
 * Lleva lo guardado a `scope`: baja `download` (por tandas, con avance) y
 * quita `remove`. Con `full`, reemplaza los diagramas en vez de sumarlos.
 */
async function apply(
  scope: OfflineScope,
  download: string[],
  remove: string[],
  extra: { playlists?: OfflinePlaylist[]; full?: boolean } = {},
) {
  const meta = await readMeta();
  const versions = { ...meta.versions };
  for (const id of remove) delete versions[id];
  let chords = extra.full ? EMPTY_CHORDS : meta.chords;
  let playlists = extra.playlists ?? meta.playlists;
  let owner = meta.owner;

  await writeMeta(
    { scope, versions, ...(extra.playlists ? { playlists } : {}) },
    {
      put: [],
      remove,
    },
  );
  set({ scope, versions, error: false });

  if (download.length > 0) {
    set({ busy: { done: 0, total: download.length } });
    try {
      for (let i = 0; i < download.length; i += BATCH) {
        const payload = await fetchSongs(download.slice(i, i + BATCH));
        // Otra cuenta en este dispositivo: lo de la anterior se borra antes.
        if (owner && owner !== payload.userId) {
          await wipe();
          return;
        }
        owner = payload.userId;
        for (const song of payload.songs) versions[song.id] = song.version;
        chords = Object.fromEntries(
          INSTRUMENTS.map((inst) => [inst, { ...chords[inst], ...payload.chords[inst] }]),
        ) as OfflineChords;
        playlists = payload.playlists;
        await writeMeta(
          { owner, versions: { ...versions }, chords, playlists },
          { put: payload.songs, remove: [] },
        );
        set({
          versions: { ...versions },
          busy: { done: Math.min(i + BATCH, download.length), total: download.length },
        });
      }
      if (extra.full) await writeMeta({ refreshedAt: Date.now() });
      await Promise.allSettled(locales.map(saveOfflinePage));
      set({ busy: null });
    } catch (error) {
      if (error instanceof SessionGone) {
        await wipe();
        return;
      }
      set({ busy: null, error: true });
    }
  } else if (Object.keys(versions).length > 0) {
    // Sin nada que bajar: igual se asegura la página sin conexión en los dos
    // idiomas (las descargas de antes solo la guardaban en uno).
    void Promise.allSettled(locales.map(saveOfflinePage));
  }
}

type Listed = { id: string; playlist_id: string | null; version: string };

/**
 * Al abrir Canciones con conexión: comprueba la cuenta, guarda las
 * playlists, olvida suscripciones a lo borrado y baja lo nuevo o cambiado.
 */
export function syncOfflineSongs(
  userId: string,
  list: Listed[],
  playlists: OfflinePlaylist[],
) {
  return serial(async () => {
    const meta = await readMeta();
    if (meta.owner && meta.owner !== userId) {
      await wipe();
      return;
    }
    const scope = tidyScope(
      meta.scope,
      playlists.map((p) => p.id),
      list.map((s) => s.id),
    );
    const nothing =
      !scope.all && scope.playlists.length === 0 && scope.songs.length === 0;
    if (nothing && Object.keys(meta.versions).length === 0) return;
    const full = Date.now() - meta.refreshedAt > FULL_REFRESH_MS;
    const plan = planRefresh(new Map(Object.entries(meta.versions)), list, scope, full);
    await apply(scope, plan.download, plan.remove, { playlists, full });
  });
}

/** Cambia las suscripciones desde la lista (que conoce todas las canciones). */
export function setOfflineScope(scope: OfflineScope, list: Listed[]) {
  return serial(async () => {
    const meta = await readMeta();
    const plan = planRefresh(new Map(Object.entries(meta.versions)), list, scope, false);
    await apply(scope, plan.download, plan.remove);
  });
}

/** Desde la canción: descargarla sola o quitarla (si no la cubre otra cosa). */
export function setOfflineSong(id: string, on: boolean) {
  return serial(async () => {
    const meta = await readMeta();
    const songs = on
      ? [...new Set([...meta.scope.songs, id])]
      : meta.scope.songs.filter((s) => s !== id);
    const scope = { ...meta.scope, songs };
    await apply(scope, on ? [id] : [], on ? [] : [id]);
  });
}

/** Vuelve a bajar canciones ya cubiertas (cambiaron o aún no estaban). */
export function refreshOfflineSongs(ids: string[]) {
  return serial(async () => {
    const meta = await readMeta();
    await apply(meta.scope, ids, []);
  });
}

async function wipe() {
  const db = await dbPromise?.catch(() => null);
  db?.close();
  dbPromise = null;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
  set({ ...INITIAL, ready: true });
}

/** Cerrar sesión (o una sesión que ya no está): borra todo lo descargado. */
export function wipeOfflineSongs() {
  return serial(wipe);
}
