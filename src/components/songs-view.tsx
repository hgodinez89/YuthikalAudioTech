"use client";

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  Copy,
  Ellipsis,
  FileMusic,
  FolderInput,
  Music,
  Pencil,
  Play,
  Plus,
  Search,
  SlidersVertical,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { ConfirmDialog } from "./confirm-dialog";
import { DuplicateSongModal } from "./duplicate-song-modal";
import { SongInstruments } from "./instrument-toggles";
import { FIELD_CLASS, PlaylistFormModal } from "./playlist-form-modal";
import { StarsRow } from "./stars";
import type { Instrument } from "@/lib/instruments";
import { createPlaylist, deletePlaylist, updatePlaylist } from "@/lib/playlist-actions";
import type { PlaylistInput, PlaylistRow } from "@/lib/playlists";
import { createSong, deleteSong, moveSongToPlaylist } from "@/lib/song-actions";
import {
  DEFAULT_DIR,
  SONG_SORTS,
  keyLabel,
  sortSongs,
  validateSong,
  type SongRow,
  type SongSort,
  type SortDir,
} from "@/lib/songs";

export type SongListRow = Omit<SongRow, "content"> & {
  source: "youtube" | "file" | null;
  /** Título del video (para mostrarlo al duplicar). */
  youtubeTitle: string | null;
  synced: boolean;
  /** Marcas de sincronización y su precisión (para mostrarlas al duplicar). */
  stampCount: number;
  granularity: "line" | "word" | null;
};

export type PlaylistWithCount = PlaylistRow & { songs_count: number };

const EMPTY_PLAYLIST: PlaylistInput = {
  name: "",
  description: "",
  genre: "ballad",
  genreOther: "",
  ratingLike: 4,
};

/* Orden de la lista: preferencia de este navegador. */
const SORT_KEY = "yk-song-sort";
const DEFAULT_SORT = { by: "recent", dir: DEFAULT_DIR.recent } as const;
type SortPref = { by: SongSort; dir: SortDir };
const noopSubscribe = () => () => {};

function readSort(): SortPref {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(SORT_KEY) ?? "null");
    if (saved && typeof saved === "object" && "by" in saved && "dir" in saved) {
      const { by, dir } = saved;
      if (SONG_SORTS.includes(by as SongSort) && (dir === "asc" || dir === "desc")) {
        return { by: by as SongSort, dir };
      }
    }
  } catch {}
  return DEFAULT_SORT;
}

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

/** Nueva canción: solo el nombre (y la playlist, opcional). */
function NewSongModal({
  instrument,
  playlists,
  initialPlaylistId,
  onClose,
}: {
  instrument: Instrument;
  playlists: PlaylistRow[];
  initialPlaylistId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("songs");
  const router = useRouter();
  const [name, setName] = useState("");
  const [playlistId, setPlaylistId] = useState(initialPlaylistId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    // Se crea desde un instrumento: queda marcado como preparada para él.
    const input = {
      name,
      description: "",
      keyNote: "",
      instruments: [instrument],
      playlistId: playlistId || null,
    };
    const invalid = validateSong(input);
    if (invalid) {
      setError(t(`errors.${invalid}`));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createSong(input);
      if (!result.ok) {
        setError(t(`errors.${result.error}`));
        return;
      }
      // Directo al editor para cargar (o pegar) la letra con sus acordes.
      router.push(`/${instrument}/songs/${result.id}?mode=edit`);
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-page/70 p-6 backdrop-blur-[6px]"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between border-b border-edge px-6 py-[22px]">
          <h2 className="text-[19px] font-extrabold">{t("newSong")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid size-8 cursor-pointer place-items-center rounded-[9px] border border-edge bg-surface-2 text-sub"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className="flex flex-col gap-[18px] px-6 py-[22px]">
          <div>
            <label
              htmlFor="new-song-name"
              className="mb-[7px] block text-[12.5px] font-semibold text-sub"
            >
              {t("form.name")}
            </label>
            <input
              id="new-song-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
              maxLength={150}
              className={`${FIELD_CLASS} h-11`}
            />
          </div>
          {playlists.length > 0 && (
            <div>
              <label
                htmlFor="new-song-playlist"
                className="mb-[7px] block text-[12.5px] font-semibold text-sub"
              >
                {t("form.playlist")}
              </label>
              <select
                id="new-song-playlist"
                value={playlistId}
                onChange={(e) => setPlaylistId(e.target.value)}
                className={`${FIELD_CLASS} h-11 cursor-pointer`}
              >
                <option value="">{t("form.noPlaylist")}</option>
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-[13px] font-semibold text-warn">{error}</p>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-edge px-6 py-[18px]">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[11px] border border-edge-2 bg-surface-2 px-[18px] py-[11px] text-sm font-semibold"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="yk-gradient cursor-pointer rounded-[11px] px-5 py-[11px] text-sm font-bold disabled:opacity-60"
          >
            {pending ? t("creating") : t("create")}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Elegir la playlist destino de una canción (o ninguna, o una nueva). */
function MoveSongModal({
  song,
  playlists,
  onClose,
  onCreateNew,
}: {
  song: SongListRow;
  playlists: PlaylistWithCount[];
  onClose: () => void;
  onCreateNew: () => void;
}) {
  const t = useTranslations("songs");
  const router = useRouter();
  const [target, setTarget] = useState<string>(song.playlist_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = song.playlist_id ?? "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await moveSongToPlaylist(song.id, target || null);
      if (!result.ok) {
        setError(t(`errors.${result.error}`));
        return;
      }
      onClose();
      router.refresh();
    });
  };

  const options = [
    { id: "", name: t("move.none"), count: null },
    ...playlists.map((p) => ({ id: p.id, name: p.name, count: p.songs_count })),
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-page/70 p-6 backdrop-blur-[6px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-song-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-edge px-6 py-[20px]">
          <h2
            id="move-song-title"
            className="min-w-0 truncate text-[18px] font-extrabold"
          >
            {t("move.title", { name: song.name })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[9px] border border-edge bg-surface-2 text-sub"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div role="radiogroup" className="flex flex-col gap-1 overflow-y-auto p-3">
          {options.map((o) => {
            const selected = target === o.id;
            return (
              <button
                key={o.id || "none"}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTarget(o.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-[11px] border px-3.5 py-3 text-left text-[14px] ${
                  selected
                    ? "border-accent bg-accent/10"
                    : "border-transparent hover:bg-edge"
                }`}
              >
                <span
                  className={`grid size-[18px] shrink-0 place-items-center rounded-full border ${
                    selected ? "border-accent bg-accent text-page" : "border-edge-2"
                  }`}
                >
                  {selected && <Check size={12} strokeWidth={3} />}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate font-semibold ${o.id ? "" : "text-sub"}`}
                >
                  {o.name}
                </span>
                {o.id === current && (
                  <span className="rounded-full border border-edge-2 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-tert">
                    {t("move.current")}
                  </span>
                )}
                {o.count !== null && (
                  <span className="text-[12px] text-tert">{o.count}</span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-1 flex cursor-pointer items-center gap-3 rounded-[11px] border border-dashed border-edge-2 px-3.5 py-3 text-left text-[14px] font-semibold text-sub hover:text-ink"
          >
            <Plus size={16} strokeWidth={2.4} />
            {t("move.createNew")}
          </button>
        </div>

        {error && (
          <p className="px-6 pb-1 text-[13px] font-semibold text-warn">{error}</p>
        )}
        <div className="flex justify-end gap-2.5 border-t border-edge px-6 py-[16px]">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[11px] border border-edge-2 bg-surface-2 px-[18px] py-[11px] text-sm font-semibold"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || target === current}
            className="yk-gradient cursor-pointer rounded-[11px] px-5 py-[11px] text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? t("move.moving") : t("move.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Menú ⋯ de una canción: acciones secundarias fuera de la vista principal. */
function SongMenu({
  songUrl,
  onMove,
  onDuplicate,
  onDelete,
}: {
  songUrl: (mode?: string) => string;
  onMove: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("songs");
  const tEditor = useTranslations("editor");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("moreActions")}
        aria-expanded={open}
        className="grid size-[38px] cursor-pointer place-items-center rounded-[10px] text-sub hover:bg-edge hover:text-ink"
      >
        <Ellipsis size={19} strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[42px] z-40 w-[210px] overflow-hidden rounded-[12px] border border-edge-2 bg-surface p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.5)]">
            <Link
              href={songUrl("edit")}
              className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[13.5px] hover:bg-edge"
            >
              <Pencil size={16} strokeWidth={2} />
              {t("edit")}
            </Link>
            <Link
              href={songUrl("audio")}
              className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[13.5px] hover:bg-edge"
            >
              <SlidersVertical size={16} strokeWidth={2} />
              {t("syncAudio")}
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onMove();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13.5px] hover:bg-edge"
            >
              <FolderInput size={16} strokeWidth={2} />
              {t("moveToPlaylist")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13.5px] hover:bg-edge"
            >
              <Copy size={16} strokeWidth={2} />
              {t("duplicate")}
            </button>
            <div className="mx-1.5 my-1 h-px bg-edge" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13.5px] text-warn hover:bg-warn/10"
            >
              <Trash2 size={16} strokeWidth={2} />
              {tEditor("deleteSong")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Mis canciones: lista plana con las playlists como filtros opcionales
 * (?list=<id>). Las playlists conservan género y calificaciones.
 */
export function SongsView({
  instrument,
  songs,
  playlists,
  activeListId,
}: {
  instrument: Instrument;
  songs: SongListRow[];
  playlists: PlaylistWithCount[];
  activeListId: string | null;
}) {
  const t = useTranslations("songs");
  const tPlaylists = useTranslations("playlists");
  const tEditor = useTranslations("editor");
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  /* Antes de montar, el orden por defecto (el del servidor): sin desajuste de hidratación. */
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [savedSort, setSavedSort] = useState<SortPref>(() =>
    typeof window === "undefined" ? DEFAULT_SORT : readSort(),
  );
  const [songToDelete, setSongToDelete] = useState<SongListRow | null>(null);
  const [songToMove, setSongToMove] = useState<SongListRow | null>(null);
  const [songToDuplicate, setSongToDuplicate] = useState<SongListRow | null>(null);
  /* La copia recién creada se resalta unos segundos; si quedó en otra
     playlist que la filtrada, un aviso dice dónde está. */
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onDuplicated = (newId: string, playlistId: string | null) => {
    setSongToDuplicate(null);
    router.refresh();
    setHighlightId(newId);
    setTimeout(() => setHighlightId((id) => (id === newId ? null : id)), 4000);
    if (activeListId && playlistId !== activeListId) {
      const where =
        playlists.find((p) => p.id === playlistId)?.name ?? t("form.noPlaylist");
      setNotice(t("duplicatedElsewhere", { name: where }));
      setTimeout(() => setNotice(null), 5000);
    }
  };
  const [createForSong, setCreateForSong] = useState<SongListRow | null>(null);
  const [deletingSong, startDeleteSong] = useTransition();
  const [newSongOpen, setNewSongOpen] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [editListOpen, setEditListOpen] = useState(false);
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  const base = `/${instrument}/songs`;
  const activeList = playlists.find((p) => p.id === activeListId) ?? null;
  const playlistName = new Map(playlists.map((p) => [p.id, p.name]));

  const songUrl = (song: SongListRow) => (mode?: string) =>
    `${base}/${song.id}${
      mode === "audio" ? "?mode=edit&step=audio" : mode ? `?mode=${mode}` : ""
    }`;

  const genreLabel = (p: PlaylistRow) =>
    p.genre === "other" && p.genre_other
      ? p.genre_other
      : tPlaylists(`genres.${p.genre}`);

  const sort = mounted ? savedSort : DEFAULT_SORT;
  /* Con una playlist filtrada, ordenar por playlist no aporta: se usa el nombre. */
  const sortBy = activeList && sort.by === "playlist" ? "name" : sort.by;
  const sortDir = sortBy === sort.by ? sort.dir : DEFAULT_DIR.name;
  const saveSort = (next: SortPref) => {
    setSavedSort(next);
    try {
      window.localStorage.setItem(SORT_KEY, JSON.stringify(next));
    } catch {}
  };

  const needle = search.trim().toLowerCase();
  const visible = sortSongs(
    needle ? songs.filter((s) => s.name.toLowerCase().includes(needle)) : songs,
    { by: sortBy, dir: sortDir, instrument, playlistNames: playlistName, locale },
  );

  const createList = async (input: PlaylistInput) => {
    const result = await createPlaylist(input);
    if (!result.ok) return result.error;
    router.push(`${base}?list=${result.id}`);
    return null;
  };

  const editList = async (input: PlaylistInput) => {
    if (!activeList) return null;
    const result = await updatePlaylist(activeList.id, input);
    if (!result.ok) return result.error;
    router.refresh();
    return null;
  };

  /* Nueva playlist desde "Mover a playlist": se crea y la canción se mueve a ella. */
  const createListForSong = async (input: PlaylistInput) => {
    if (!createForSong) return null;
    const created = await createPlaylist(input);
    if (!created.ok || !created.id) return created.ok ? "db" : created.error;
    // El formulario muestra errores de "playlists.errors": un fallo al mover es de BD.
    const moved = await moveSongToPlaylist(createForSong.id, created.id);
    if (!moved.ok) return "db";
    router.refresh();
    return null;
  };

  const removeSong = () => {
    if (!songToDelete) return;
    startDeleteSong(async () => {
      await deleteSong(songToDelete.id);
      setSongToDelete(null);
      router.refresh();
    });
  };

  const removeList = () => {
    if (!activeList) return;
    startDelete(async () => {
      await deletePlaylist(activeList.id);
      setDeleteListOpen(false);
      router.push(base);
    });
  };

  const chipClass = (active: boolean) =>
    active
      ? "yk-gradient inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-[7px] text-[13px] font-bold"
      : "inline-flex shrink-0 items-center gap-2 rounded-full border border-edge bg-surface-2 px-3.5 py-[7px] text-[13px] font-semibold text-sub hover:text-ink";

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-[90px] pt-8 sm:px-7">
      {/* TÍTULO */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[30px] font-extrabold tracking-[-0.02em]">
            {t("title")}
          </h1>
          <p className="text-[14px] text-tert">{t("count", { count: songs.length })}</p>
        </div>
        <button
          type="button"
          onClick={() => setNewSongOpen(true)}
          className="yk-gradient inline-flex cursor-pointer items-center gap-[9px] rounded-xl px-[18px] py-[11px] text-sm font-bold"
        >
          <Plus size={16} strokeWidth={2.4} />
          {t("newSong")}
        </button>
      </div>

      {/* PLAYLISTS COMO FILTROS */}
      <div
        role="group"
        aria-label={tPlaylists("title")}
        className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <Link href={base} className={chipClass(!activeList)}>
          {t("all")}
        </Link>
        {playlists.map((p) => (
          <Link
            key={p.id}
            href={`${base}?list=${p.id}`}
            className={chipClass(p.id === activeListId)}
          >
            {p.name}
            <span className="text-[11.5px] opacity-70">{p.songs_count}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setNewListOpen(true)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-edge-2 px-3.5 py-[7px] text-[13px] font-semibold text-sub hover:text-ink"
        >
          <Plus size={14} strokeWidth={2.4} />
          {tPlaylists("newPlaylist")}
        </button>
      </div>

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
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setEditListOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-edge-2 bg-surface-2 px-3.5 py-[9px] text-[13px] font-semibold"
            >
              <Pencil size={15} strokeWidth={2} />
              {t("edit")}
            </button>
            <button
              type="button"
              onClick={() => setDeleteListOpen(true)}
              aria-label={tPlaylists("delete")}
              className="grid size-[38px] cursor-pointer place-items-center rounded-[10px] border border-edge-2 bg-surface-2 text-sub hover:text-ink"
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* BÚSQUEDA Y ORDEN */}
      {songs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative flex min-w-[220px] flex-1 items-center">
            <Search
              size={17}
              strokeWidth={2}
              className="pointer-events-none absolute left-3.5 text-tert"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className={`${FIELD_CLASS} h-11 pl-10`}
            />
          </div>
          {songs.length > 1 && (
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
                {SONG_SORTS.filter((s) => !(activeList && s === "playlist")).map((s) => (
                  <option key={s} value={s}>
                    {t(`sort.${s}`)}
                  </option>
                ))}
              </select>
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
            </div>
          )}
        </div>
      )}

      {/* CANCIONES */}
      {visible.length > 0 ? (
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
                    ? "border-accent shadow-[0_0_0_3px_rgba(53,214,232,0.18)]"
                    : "border-edge hover:border-edge-2"
                }`}
              >
                {/* Toda la fila abre la canción */}
                <Link href={url()} className="absolute inset-0" aria-label={song.name} />
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
                    {song.synced && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                        <span className="inline-block size-1.5 rounded-full bg-accent" />
                        {t("statusSynced")}
                      </span>
                    )}
                  </div>
                </div>
                {/* Con el menú abierto se eleva sobre las filas siguientes. */}
                <div className="relative z-10 flex shrink-0 items-center gap-1 has-[[aria-expanded=true]]:z-30">
                  <SongMenu
                    songUrl={url}
                    onMove={() => setSongToMove(song)}
                    onDuplicate={() => setSongToDuplicate(song)}
                    onDelete={() => setSongToDelete(song)}
                  />
                  <Link
                    href={url("karaoke")}
                    aria-label={t("play")}
                    title={t("play")}
                    className="yk-gradient grid size-11 place-items-center rounded-xl shadow-[0_4px_16px_rgba(46,107,240,0.3)]"
                  >
                    <Play
                      size={19}
                      fill="currentColor"
                      strokeWidth={0}
                      className="ml-0.5"
                    />
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
          <h3 className="mb-2 text-lg font-bold">
            {activeList ? t("emptyListTitle") : t("emptyTitle")}
          </h3>
          <p className="mb-[22px] max-w-[360px] text-sm text-tert">{t("emptyDesc")}</p>
          <button
            type="button"
            onClick={() => setNewSongOpen(true)}
            className="yk-gradient inline-flex cursor-pointer items-center gap-[9px] rounded-xl px-[22px] py-3 text-sm font-bold"
          >
            <Plus size={16} strokeWidth={2.4} />
            {t("newSong")}
          </button>
        </div>
      )}

      {/* Aviso: la copia quedó en otra playlist */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-[92px] left-1/2 z-50 -translate-x-1/2 rounded-[12px] border border-accent/40 bg-surface px-4 py-2.5 text-[13.5px] font-semibold shadow-[0_18px_44px_rgba(0,0,0,0.5)] md:bottom-8"
        >
          {notice}
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
        open={songToDelete !== null}
        title={tEditor("deleteTitle")}
        message={
          songToDelete &&
          tEditor.rich("deleteMessage", {
            name: songToDelete.name,
            b: (chunks) => <span className="font-bold text-ink">{chunks}</span>,
          })
        }
        cancelLabel={t("cancel")}
        confirmLabel={deletingSong ? tEditor("deleting") : tEditor("deleteConfirm")}
        confirmIcon={<Trash2 size={15} strokeWidth={2.2} />}
        pending={deletingSong}
        onCancel={() => setSongToDelete(null)}
        onConfirm={removeSong}
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
        onCancel={() => setDeleteListOpen(false)}
        onConfirm={removeList}
      />
    </div>
  );
}
