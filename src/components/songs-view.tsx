"use client";

import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  CloudCheck,
  Download,
  FileMusic,
  LayoutGrid,
  LoaderCircle,
  MonitorPlay,
  Music,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Button, buttonClass } from "./button";
import { ConfirmDialog } from "./confirm-dialog";
import { PendingIcon, PendingOutline } from "./link-pending";
import { SongInstruments } from "./song-instruments";
import { PlaylistFilter } from "./playlist-filter";
import { FIELD_CLASS, PlaylistFormModal } from "./playlist-form-modal";
import { SongMenu } from "./song-menu";
import { StarsRow } from "./stars";
import { useToast } from "./toast";
import type { Instrument } from "@/lib/instruments";
import { coverage, EMPTY_SCOPE, type OfflineScope } from "@/lib/offline-songs";
import {
  setOfflineScope,
  syncOfflineSongs,
  useOfflineSongs,
} from "@/lib/offline-songs-client";
import { useFullPrefetch } from "@/lib/use-full-prefetch";
import { useHasServiceWorker } from "@/lib/use-offline-instruments";
import {
  createPlaylist,
  deletePlaylist,
  reorderPlaylist,
  updatePlaylist,
} from "@/lib/playlist-actions";
import type { PlaylistInput, PlaylistRow, PlaylistWithCount } from "@/lib/playlists";
import { moveSongToPlaylist } from "@/lib/song-actions";
import {
  DEFAULT_DIR,
  SONG_SORTS,
  keyLabel,
  sortSongs,
  type SongListRow,
  type SongSort,
  type SortDir,
} from "@/lib/songs";
import { useDeleteSong } from "@/lib/use-delete-song";
import { useOnline } from "@/lib/use-online";
import { useStoredValue } from "@/lib/use-stored-flag";

/* Se descargan al abrirlos, no al entrar a la lista. */
const DuplicateSongModal = dynamic(() =>
  import("./duplicate-song-modal").then((m) => m.DuplicateSongModal),
);
const MoveSongModal = dynamic(() =>
  import("./move-song-modal").then((m) => m.MoveSongModal),
);
const NewSongModal = dynamic(() =>
  import("./new-song-modal").then((m) => m.NewSongModal),
);
const SetlistOrder = dynamic(() => import("./setlist-order").then((m) => m.SetlistOrder));

const EMPTY_PLAYLIST: PlaylistInput = {
  name: "",
  description: "",
  genre: "ballad",
  genreOther: "",
  ratingLike: 4,
};

/* Orden de la lista: preferencia de este navegador, una para "Todas" y otra
   para las playlists (ahí el predeterminado es su setlist). */
const SORT_KEY = "yk-song-sort";
const LIST_SORT_KEY = "yk-song-sort-list";
type SortPref = { by: SongSort; dir: SortDir };
const DEFAULT_SORT: SortPref = { by: "recent", dir: DEFAULT_DIR.recent };
const DEFAULT_LIST_SORT: SortPref = { by: "setlist", dir: DEFAULT_DIR.setlist };
/* Con una playlist filtrada, ordenar por playlist no aporta; sí su setlist. */
const LIST_SORTS: SongSort[] = ["setlist", "recent", "name", "instruments"];

const sortParser =
  (allowed: SongSort[]) =>
  (raw: string): SortPref | null => {
    try {
      const saved: unknown = JSON.parse(raw);
      if (saved && typeof saved === "object" && "by" in saved && "dir" in saved) {
        const { by, dir } = saved;
        if (allowed.includes(by as SongSort) && (dir === "asc" || dir === "desc")) {
          return { by: by as SongSort, dir };
        }
      }
    } catch {}
    return null;
  };
const parseSort = sortParser(SONG_SORTS);
const parseListSort = sortParser(LIST_SORTS);

/*
 * Playlist filtrada (?list=), leída de la dirección y no de useSearchParams:
 * el filtro cambia la URL sin ir al servidor, y Next deja de enterarse de esos
 * pushState propios tras cambiar de idioma (quita su parche de history al
 * cambiar el segmento raíz /es → /en). Atrás/adelante llegan por popstate.
 */
const LIST_EVENT = "yk-list-change";

function subscribeList(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(LIST_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(LIST_EVENT, onChange);
  };
}

const readList = () => new URLSearchParams(window.location.search).get("list");

/* Logo de YouTube (Playlist Detail.dc.html) — lucide ya no trae marcas. */
function YoutubeIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23 12s0-3.3-.4-4.9a2.6 2.6 0 0 0-1.8-1.8C19.2 5 12 5 12 5s-7.2 0-8.8.4a2.6 2.6 0 0 0-1.8 1.8C1 8.7 1 12 1 12s0 3.3.4 4.9a2.6 2.6 0 0 0 1.8 1.8C4.8 19 12 19 12 19s7.2 0 8.8-.4a2.6 2.6 0 0 0 1.8-1.8C23 15.3 23 12 23 12z" />
      <path d="M10 9l5 3-5 3z" fill="var(--surface)" />
    </svg>
  );
}

/* Ilustración del estado vacío (guitarra + onda, Playlists.dc.html). */
function EmptyArt() {
  return (
    <svg
      width={110}
      height={84}
      viewBox="0 0 120 90"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mb-[18px] text-edge-2"
      aria-hidden
    >
      <path
        d="M6 62h12l6-14 8 26 8-40 8 30 8-18 6 16h12"
        stroke="var(--accent)"
        opacity={0.5}
      />
      <path d="M84 30l-8 8" />
      <path d="M76 38c-4-4-11-3-15 1s-6 13-1 18 14 4 18 0 3-11-2-15z" />
      <circle cx={70} cy={50} r={5} />
    </svg>
  );
}

/**
 * Mis canciones: lista plana con las playlists como filtros opcionales
 * (?list=<id>). Llegan todas las canciones y el filtro se aplica aquí:
 * cambiar de playlist solo cambia la URL, sin ir al servidor.
 */
export function SongsView({
  userId,
  instrument,
  songs,
  playlists,
}: {
  /** Cuenta con sesión: las descargas de otra cuenta se borran. */
  userId: string;
  instrument: Instrument;
  songs: SongListRow[];
  playlists: PlaylistWithCount[];
}) {
  const t = useTranslations("songs");
  const tPlaylists = useTranslations("playlists");
  const tOffline = useTranslations("offline");
  const locale = useLocale();
  /* Sin conexión la lista es solo consulta: crear, ordenar, editar y borrar, no. */
  const offline = !useOnline();
  const offlineTitle = offline ? tOffline("unavailable") : undefined;
  // Una ?list= ajena, borrada o inválida no coincide: se muestran todas.
  const requestedList = useSearchParams().get("list");
  const listParam = useSyncExternalStore(
    subscribeList,
    readList,
    // En el servidor y al hidratar, la de la petición.
    () => requestedList,
  );
  const activeList = playlists.find((p) => p.id === listParam) ?? null;
  const activeListId = activeList?.id ?? null;
  const selectList = (id: string | null) => {
    // Con el estado de Next (no null): la entrada sigue siendo suya para
    // atrás/adelante, sin pasar por su parche de pushState (ver readList).
    window.history.pushState(
      window.history.state,
      "",
      id ? `?list=${id}` : window.location.pathname,
    );
    window.dispatchEvent(new Event(LIST_EVENT));
  };
  const [search, setSearch] = useState("");
  /* "Mis acordes" completo por adelantado (en segundo plano y al mostrar
     intención): al entrar aparece al instante, con el servidor ya despierto. */
  const prefetchChords = useFullPrefetch(`/${instrument}/songs/chords`, {
    idle: !offline,
  });

  /* Descargas para usar sin conexión (solo con service worker). */
  const saved = useOfflineSongs();
  const canSave = useHasServiceWorker() && saved.ready;
  const scope = saved.scope;
  const busy = saved.busy;
  const offlineList = useMemo(
    () => songs.map(({ id, playlist_id, version }) => ({ id, playlist_id, version })),
    [songs],
  );
  // Con red: cuenta, playlists y copias al día (lo nuevo o cambiado se baja solo).
  useEffect(() => {
    if (offline || !canSave) return;
    void syncOfflineSongs(
      userId,
      offlineList,
      playlists.map(({ id, name, songs_count }) => ({ id, name, songs_count })),
    );
  }, [offline, canSave, userId, offlineList, playlists]);
  const setScope = (next: OfflineScope) => void setOfflineScope(next, offlineList);
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  const playlistSaved = (id: string) => scope.all || scope.playlists.includes(id);
  const togglePlaylist = (id: string) =>
    setScope({
      ...scope,
      playlists: scope.playlists.includes(id)
        ? scope.playlists.filter((p) => p !== id)
        : [...scope.playlists, id],
    });
  /* Antes de montar, el orden por defecto (el del servidor): sin desajuste de hidratación. */
  const [allSort, saveAllSort] = useStoredValue(
    SORT_KEY,
    DEFAULT_SORT,
    parseSort,
    JSON.stringify,
  );
  const [listSort, saveListSort] = useStoredValue(
    LIST_SORT_KEY,
    DEFAULT_LIST_SORT,
    parseListSort,
    JSON.stringify,
  );
  /* Ordenar el setlist de esta playlist; al cambiar de playlist se cancela solo. */
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const ordering = activeListId !== null && orderingId === activeListId;
  const [savingOrder, startSaveOrder] = useTransition();
  const [orderError, setOrderError] = useState<string | null>(null);
  const toast = useToast();
  const deleteLater = useDeleteSong();
  const [songToMove, setSongToMove] = useState<SongListRow | null>(null);
  const [songToDuplicate, setSongToDuplicate] = useState<SongListRow | null>(null);
  /* La copia recién creada se resalta unos segundos; si quedó en otra
     playlist que la filtrada, el aviso dice dónde está. */
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const onDuplicated = (newId: string, playlistId: string | null) => {
    // La acción ya revalidó la lista: la copia llega con su respuesta.
    setSongToDuplicate(null);
    setHighlightId(newId);
    setTimeout(() => setHighlightId((id) => (id === newId ? null : id)), 4000);
    const where =
      activeListId && playlistId !== activeListId
        ? (playlists.find((p) => p.id === playlistId)?.name ?? t("form.noPlaylist"))
        : null;
    toast.show({
      message: where ? t("duplicatedElsewhere", { name: where }) : t("toast.duplicated"),
    });
  };

  /* Aviso de "mover" con «Deshacer»: la devuelve a su playlist anterior. */
  const announceMove = (song: SongListRow, to: string | null, toName: string) => {
    const from = song.playlist_id;
    toast.show({
      message: to
        ? t("toast.moved", { name: song.name, playlist: toName })
        : t("toast.movedNone", { name: song.name }),
      undo: () => {
        void moveSongToPlaylist(song.id, from)
          .then((result) => {
            if (!result.ok) {
              toast.show({ message: t(`errors.${result.error}`), tone: "error" });
            }
          })
          .catch(() => toast.show({ message: t("toast.error"), tone: "error" }));
      },
    });
  };
  const [createForSong, setCreateForSong] = useState<SongListRow | null>(null);
  const [deleteListError, setDeleteListError] = useState<string | null>(null);
  const [newSongOpen, setNewSongOpen] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [editListOpen, setEditListOpen] = useState(false);
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  const base = `/${instrument}/songs`;
  const playlistName = new Map(playlists.map((p) => [p.id, p.name]));

  const songUrl = (song: SongListRow) => (mode?: string) =>
    `${base}/${song.id}${
      mode === "audio" ? "?mode=edit&step=audio" : mode ? `?mode=${mode}` : ""
    }`;

  const genreLabel = (p: PlaylistRow) =>
    p.genre === "other" && p.genre_other
      ? p.genre_other
      : tPlaylists(`genres.${p.genre}`);

  const sort = activeList ? listSort : allSort;
  const saveSort = activeList ? saveListSort : saveAllSort;
  const sortBy = sort.by;
  const sortDir = sort.dir;

  // Las de la playlist filtrada, sin las que se están borrando (con «Deshacer» pendiente).
  const listed = songs.filter(
    (s) => (!activeList || s.playlist_id === activeList.id) && !toast.hidden.has(s.id),
  );
  const needle = search.trim().toLowerCase();
  const visible = sortSongs(
    needle ? listed.filter((s) => s.name.toLowerCase().includes(needle)) : listed,
    { by: sortBy, dir: sortDir, instrument, playlistNames: playlistName, locale },
  );

  /* El setlist en su orden actual (lo que se ordena y lo que toca el concierto). */
  const setlist = sortSongs(listed, {
    by: "setlist",
    dir: "asc",
    instrument,
    playlistNames: playlistName,
    locale,
  });
  const saveOrder = (ids: string[]) => {
    if (!activeList) return;
    setOrderError(null);
    startSaveOrder(async () => {
      const result = await reorderPlaylist(activeList.id, ids).catch(() => null);
      if (!result?.ok) {
        setOrderError(t(`errors.${result?.error ?? "db"}`));
        return;
      }
      // El orden nuevo llegó con la respuesta (revalidatePath); se cierra a la vez.
      startSaveOrder(() => {
        setOrderingId(null);
        if (sortBy !== "setlist") saveSort(DEFAULT_LIST_SORT);
      });
    });
  };

  const createList = async (input: PlaylistInput) => {
    const result = await createPlaylist(input);
    if (!result.ok) return result.error;
    selectList(result.id ?? null);
    return null;
  };

  const editList = async (input: PlaylistInput) => {
    if (!activeList) return null;
    const result = await updatePlaylist(activeList.id, input);
    return result.ok ? null : result.error;
  };

  /* Nueva playlist desde "Mover a playlist": se crea y la canción se mueve a ella. */
  const createListForSong = async (input: PlaylistInput) => {
    if (!createForSong) return null;
    const created = await createPlaylist(input);
    if (!created.ok || !created.id) return created.ok ? "db" : created.error;
    // El formulario muestra errores de "playlists.errors": un fallo al mover es de BD.
    const moved = await moveSongToPlaylist(createForSong.id, created.id);
    if (!moved.ok) return "db";
    announceMove(createForSong, created.id, input.name.trim());
    return null;
  };

  const removeList = () => {
    if (!activeList) return;
    startDelete(async () => {
      setDeleteListError(null);
      const result = await deletePlaylist(activeList.id).catch(() => null);
      if (!result?.ok) {
        setDeleteListError(tPlaylists(`errors.${result?.error ?? "db"}`));
        return;
      }
      setDeleteListOpen(false);
      selectList(null);
    });
  };

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-[90px] pt-8 sm:px-7">
      {/* TÍTULO */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[30px] font-extrabold tracking-[-0.02em]">
            {t("title")}
          </h1>
          <p className="text-[14px] text-tert">{t("count", { count: listed.length })}</p>
          {saved.error && (
            <p role="alert" className="mt-1 text-[13px] text-warn">
              {t("offline.error")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${base}/chords`}
            onMouseEnter={prefetchChords}
            onTouchStart={prefetchChords}
            onFocus={prefetchChords}
            className={buttonClass("secondary")}
          >
            <PendingIcon size={16}>
              <LayoutGrid size={16} strokeWidth={2} />
            </PendingIcon>
            {t("myChords")}
          </Link>
          {canSave &&
            (scope.all && !busy ? (
              <Button
                onClick={() => setRemoveAllOpen(true)}
                disabled={offline}
                title={offline ? offlineTitle : t("offline.removeAllTitle")}
                className="border-accent/35 text-accent"
              >
                <CloudCheck size={16} strokeWidth={2} />
                {t("offline.allSaved")}
              </Button>
            ) : (
              <Button
                onClick={() => setScope({ ...scope, all: true })}
                disabled={offline || busy !== null || songs.length === 0}
                title={offlineTitle}
                className="border-accent/45"
              >
                {busy ? (
                  <LoaderCircle
                    size={16}
                    strokeWidth={2.4}
                    className="animate-spin text-accent"
                  />
                ) : (
                  <Download size={16} strokeWidth={2} className="text-accent" />
                )}
                {busy ? t("offline.downloading", busy) : t("offline.downloadAll")}
              </Button>
            ))}
          <Button
            variant="primary"
            onClick={() => setNewSongOpen(true)}
            disabled={offline}
            title={offlineTitle}
          >
            <Plus size={16} strokeWidth={2.4} />
            {t("newSong")}
          </Button>
        </div>
      </div>

      {/* PLAYLISTS COMO FILTROS */}
      <PlaylistFilter
        base={base}
        playlists={playlists}
        activeListId={activeListId}
        onSelect={selectList}
        onNewList={() => setNewListOpen(true)}
        canCreate={!offline}
        offlineSaving={
          canSave
            ? {
                saved: playlistSaved,
                onDownload: togglePlaylist,
                disabled: offline || busy !== null,
              }
            : undefined
        }
      />

      {/* CABECERA DE LA PLAYLIST SELECCIONADA */}
      {activeList && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-[16px] border border-edge bg-surface p-[18px]">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-bold">{activeList.name}</h2>
              <span className="inline-flex rounded-full border border-edge-2 bg-surface-2 px-2.5 py-[3px] text-xs font-semibold">
                {genreLabel(activeList)}
              </span>
            </div>
            {activeList.description && (
              <p className="mb-2.5 text-[13.5px] leading-[1.5] text-sub">
                {activeList.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-sub">{tPlaylists("like")}</span>
              <StarsRow value={activeList.rating_like} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {listed.length > 0 && !ordering && (
              <Link
                href={`${base}/concert?list=${activeList.id}`}
                className={buttonClass("primary", "sm")}
              >
                <PendingIcon size={15}>
                  <MonitorPlay size={15} strokeWidth={2} />
                </PendingIcon>
                {t("setlist.concert")}
              </Link>
            )}
            {canSave &&
              listed.length > 0 &&
              !ordering &&
              (scope.all ? (
                <span
                  title={t("offline.includedAllHint")}
                  className="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-edge px-3 text-[13px] font-semibold text-sub"
                >
                  <CloudCheck size={15} strokeWidth={2} className="text-accent" />
                  {t("offline.includedAll")}
                </span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => togglePlaylist(activeList.id)}
                  disabled={offline || busy !== null}
                  title={
                    offline
                      ? offlineTitle
                      : playlistSaved(activeList.id)
                        ? t("offline.removePlaylist")
                        : undefined
                  }
                  className={
                    playlistSaved(activeList.id)
                      ? "border-accent/35 text-accent"
                      : "border-accent/45"
                  }
                >
                  {playlistSaved(activeList.id) ? (
                    <CloudCheck size={15} strokeWidth={2} />
                  ) : (
                    <Download size={15} strokeWidth={2} className="text-accent" />
                  )}
                  {playlistSaved(activeList.id)
                    ? t("offline.saved")
                    : t("offline.download")}
                </Button>
              ))}
            {listed.length > 1 && !ordering && (
              <Button
                size="sm"
                onClick={() => {
                  setOrderError(null);
                  setOrderingId(activeList.id);
                }}
                disabled={offline}
                title={offlineTitle}
              >
                <ArrowUpDown size={15} strokeWidth={2} />
                {t("setlist.order")}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setEditListOpen(true)}
              disabled={offline}
              title={offlineTitle}
            >
              <Pencil size={15} strokeWidth={2} />
              {t("edit")}
            </Button>
            <button
              type="button"
              onClick={() => setDeleteListOpen(true)}
              aria-label={tPlaylists("delete")}
              disabled={offline}
              title={offlineTitle}
              className="grid size-[38px] cursor-pointer place-items-center rounded-[10px] border border-edge-2 bg-surface-2 text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* ORDENAR EL SETLIST (reemplaza la lista mientras dura) */}
      {ordering && activeList && (
        <SetlistOrder
          songs={setlist}
          pending={savingOrder}
          error={orderError}
          onCancel={() => setOrderingId(null)}
          onSave={saveOrder}
        />
      )}

      {/* BÚSQUEDA Y ORDEN */}
      {!ordering && listed.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative flex min-w-[220px] flex-1 items-center">
            <Search
              size={17}
              strokeWidth={2}
              className="pointer-events-none absolute left-3.5 text-tert"
            />
            <label htmlFor="song-search" className="sr-only">
              {t("searchLabel")}
            </label>
            <input
              id="song-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`${FIELD_CLASS} h-11 pl-10`}
            />
          </div>
          {listed.length > 1 && (
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  const by = e.target.value as SongSort;
                  saveSort({ by, dir: DEFAULT_DIR[by] });
                }}
                aria-label={t("sort.label")}
                title={t("sort.label")}
                className={`${FIELD_CLASS} h-11 w-auto cursor-pointer`}
              >
                {(activeList ? LIST_SORTS : SONG_SORTS).map((s) => (
                  <option key={s} value={s}>
                    {t(`sort.${s}`)}
                  </option>
                ))}
              </select>
              {/* El setlist tiene un solo sentido: el del concierto. */}
              {sortBy !== "setlist" && (
                <button
                  type="button"
                  onClick={() =>
                    saveSort({ by: sortBy, dir: sortDir === "asc" ? "desc" : "asc" })
                  }
                  aria-label={`${t("sort.label")}: ${t(`sort.${sortDir}`)}`}
                  title={t(`sort.${sortDir}`)}
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[11px] border border-edge bg-surface-2 text-sub hover:text-ink"
                >
                  {sortDir === "asc" ? (
                    <ArrowUpNarrowWide size={18} strokeWidth={2} />
                  ) : (
                    <ArrowDownWideNarrow size={18} strokeWidth={2} />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* CANCIONES */}
      {ordering ? null : visible.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {visible.map((song) => {
            const url = songUrl(song);
            const listName =
              !activeList && song.playlist_id ? playlistName.get(song.playlist_id) : null;
            return (
              <article
                key={song.id}
                className={`relative flex items-center gap-3 rounded-[14px] border bg-surface py-3 pl-[18px] pr-3 transition-[border-color,box-shadow] duration-300 ${
                  song.id === highlightId
                    ? "border-accent shadow-focus"
                    : "border-edge hover:border-edge-2"
                }`}
              >
                {/* Toda la fila abre la canción. Sin precarga (serían dos
                    peticiones por fila al hacer scroll): al pulsar, la fila
                    late hasta que llega la canción. */}
                <Link
                  href={url()}
                  prefetch={false}
                  className="absolute inset-0"
                  aria-label={song.name}
                >
                  <PendingOutline className="rounded-[14px]" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="truncate text-[15.5px] font-bold">{song.name}</span>
                    {song.key_note && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-2 bg-surface-2 px-2.5 py-[3px] text-[11.5px] font-semibold">
                        <Music size={12} strokeWidth={2} className="text-accent" />
                        {keyLabel(song.key_note)}
                      </span>
                    )}
                    <SongInstruments instruments={song.instruments} size={15} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-tert">
                    {listName && <span>{listName}</span>}
                    {song.source && (
                      <span className="inline-flex items-center gap-1.5">
                        {song.source === "youtube" ? (
                          <YoutubeIcon size={14} />
                        ) : (
                          <FileMusic size={13} strokeWidth={2} />
                        )}
                        {song.source === "youtube" ? "YouTube" : t("sourceFile")}
                      </span>
                    )}
                    {/* Estado de la sincronización (insignias del diseño) */}
                    {song.synced ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-[3px] text-[11.5px] font-semibold text-accent">
                        <span className="inline-block size-1.5 rounded-full bg-accent" />
                        {t("statusSynced")}
                      </span>
                    ) : (
                      song.source && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-2 bg-surface-2 px-2.5 py-[3px] text-[11.5px] font-semibold text-tert">
                          <span className="inline-block size-1.5 rounded-full bg-mute" />
                          {t("statusRaw")}
                        </span>
                      )
                    )}
                    {canSave && saved.versions[song.id] && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                        <CloudCheck size={14} strokeWidth={2} />
                        {t("offline.badge")}
                      </span>
                    )}
                  </div>
                </div>
                {/* Con el menú abierto se eleva sobre las filas siguientes. */}
                <div className="relative z-10 flex shrink-0 items-center gap-1 has-[[aria-expanded=true]]:z-30">
                  <SongMenu
                    songName={song.name}
                    songUrl={url}
                    onMove={() => setSongToMove(song)}
                    onDuplicate={() => setSongToDuplicate(song)}
                    onDelete={() => deleteLater(song)}
                    offlineItem={
                      canSave
                        ? {
                            state: coverage(scope, song),
                            playlistName: song.playlist_id
                              ? (playlistName.get(song.playlist_id) ?? "")
                              : "",
                            disabled: offline || busy !== null,
                            onToggle: () =>
                              setScope({
                                ...scope,
                                songs: scope.songs.includes(song.id)
                                  ? scope.songs.filter((id) => id !== song.id)
                                  : [...scope.songs, song.id],
                              }),
                          }
                        : undefined
                    }
                  />
                  <Link
                    href={url("karaoke")}
                    prefetch={false}
                    aria-label={t("play")}
                    title={t("play")}
                    className="yk-gradient grid size-11 place-items-center rounded-xl shadow-fab"
                  >
                    <PendingIcon size={19}>
                      <Play
                        size={19}
                        fill="currentColor"
                        strokeWidth={0}
                        className="ml-0.5"
                      />
                    </PendingIcon>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : needle ? (
        <p className="px-5 py-12 text-center text-[14px] text-tert">
          {t("noResults", { query: search.trim() })}
        </p>
      ) : (
        /* ESTADO VACÍO */
        <div className="flex flex-col items-center rounded-[18px] border border-dashed border-edge-2 bg-surface-3 px-5 py-[60px] text-center">
          <EmptyArt />
          <h2 className="mb-2 text-lg font-bold">
            {activeList ? t("emptyListTitle") : t("emptyTitle")}
          </h2>
          <p className="mb-[22px] max-w-[360px] text-sm text-tert">{t("emptyDesc")}</p>
          <Button
            variant="primary"
            onClick={() => setNewSongOpen(true)}
            disabled={offline}
            title={offlineTitle}
          >
            <Plus size={16} strokeWidth={2.4} />
            {t("newSong")}
          </Button>
        </div>
      )}

      {/* MODALES */}
      {songToDuplicate && (
        <DuplicateSongModal
          song={songToDuplicate}
          playlists={playlists}
          onClose={() => setSongToDuplicate(null)}
          onDone={onDuplicated}
        />
      )}
      {songToMove && (
        <MoveSongModal
          song={songToMove}
          playlists={playlists}
          onClose={() => setSongToMove(null)}
          onMoved={(to, toName) => announceMove(songToMove, to, toName)}
          onCreateNew={() => {
            setCreateForSong(songToMove);
            setSongToMove(null);
          }}
        />
      )}
      {createForSong && (
        <PlaylistFormModal
          title={tPlaylists("newPlaylist")}
          submitLabel={tPlaylists("create")}
          submittingLabel={tPlaylists("creating")}
          initial={EMPTY_PLAYLIST}
          onClose={() => setCreateForSong(null)}
          onSubmit={createListForSong}
        />
      )}
      {newSongOpen && (
        <NewSongModal
          instrument={instrument}
          playlists={playlists}
          initialPlaylistId={activeListId}
          onClose={() => setNewSongOpen(false)}
        />
      )}
      {newListOpen && (
        <PlaylistFormModal
          title={tPlaylists("newPlaylist")}
          submitLabel={tPlaylists("create")}
          submittingLabel={tPlaylists("creating")}
          initial={EMPTY_PLAYLIST}
          onClose={() => setNewListOpen(false)}
          onSubmit={createList}
        />
      )}
      {editListOpen && activeList && (
        <PlaylistFormModal
          title={t("editPlaylist")}
          submitLabel={t("save")}
          submittingLabel={t("saving")}
          initial={{
            name: activeList.name,
            description: activeList.description,
            genre: activeList.genre,
            genreOther: activeList.genre_other ?? "",
            ratingLike: activeList.rating_like,
          }}
          onClose={() => setEditListOpen(false)}
          onSubmit={editList}
        />
      )}
      <ConfirmDialog
        open={removeAllOpen}
        title={t("offline.removeAllTitle")}
        message={t("offline.removeAllMessage")}
        cancelLabel={tPlaylists("cancel")}
        confirmLabel={t("offline.removeAllConfirm")}
        onCancel={() => setRemoveAllOpen(false)}
        onConfirm={() => {
          setRemoveAllOpen(false);
          setScope(EMPTY_SCOPE);
        }}
      />
      <ConfirmDialog
        open={deleteListOpen && activeList !== null}
        title={tPlaylists("deleteModal.title")}
        message={
          activeList &&
          tPlaylists.rich("deleteModal.message", {
            name: activeList.name,
            b: (chunks) => <span className="font-bold text-ink">{chunks}</span>,
          })
        }
        cancelLabel={tPlaylists("cancel")}
        confirmLabel={
          deleting
            ? tPlaylists("deleteModal.deleting")
            : tPlaylists("deleteModal.confirm")
        }
        confirmIcon={<Trash2 size={15} strokeWidth={2.2} />}
        pending={deleting}
        error={deleteListError}
        onCancel={() => {
          setDeleteListError(null);
          setDeleteListOpen(false);
        }}
        onConfirm={removeList}
      />
    </div>
  );
}
