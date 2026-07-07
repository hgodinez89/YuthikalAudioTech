"use client";

import {
  ChevronLeft,
  Eye,
  FileMusic,
  Music,
  Pencil,
  Play,
  Plus,
  SlidersVertical,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { FIELD_CLASS, PlaylistFormModal } from "./playlist-form-modal";
import { StarsRow } from "./stars";
import { updatePlaylist } from "@/lib/playlist-actions";
import type { PlaylistInput, PlaylistRow } from "@/lib/playlists";
import { createSong } from "@/lib/song-actions";
import { KEY_OPTIONS, keyLabel, validateSong, type SongRow } from "@/lib/songs";

/* Logo de YouTube (Playlist Detail.dc.html) — lucide ya no trae marcas. */
function YoutubeIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23 12s0-3.3-.4-4.9a2.6 2.6 0 0 0-1.8-1.8C19.2 5 12 5 12 5s-7.2 0-8.8.4a2.6 2.6 0 0 0-1.8 1.8C1 8.7 1 12 1 12s0 3.3.4 4.9a2.6 2.6 0 0 0 1.8 1.8C4.8 19 12 19 12 19s7.2 0 8.8-.4a2.6 2.6 0 0 0 1.8-1.8C23 15.3 23 12 23 12z" />
      <path d="M10 9l5 3-5 3z" fill="var(--surface)" />
    </svg>
  );
}

function SongFormModal({
  playlistId,
  onClose,
}: {
  playlistId: string;
  onClose: () => void;
}) {
  const t = useTranslations("songs");
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", keyNote: "C" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const input = { ...form, playlistId };
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
      onClose();
      // Ir directo al editor para cargar la letra y los acordes.
      router.push(`/playlists/${playlistId}/songs/${result.id}?mode=edit`);
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-page/70 p-6 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
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
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {t("form.name")}
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("form.namePlaceholder")}
              maxLength={150}
              className={`${FIELD_CLASS} h-11`}
            />
          </div>
          <div>
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {t("form.description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("form.descriptionPlaceholder")}
              rows={2}
              maxLength={300}
              className={`${FIELD_CLASS} resize-none py-[11px]`}
            />
          </div>
          <div>
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {t("form.key")}
            </label>
            <select
              value={form.keyNote}
              onChange={(e) => setForm({ ...form, keyNote: e.target.value })}
              className={`${FIELD_CLASS} h-11 cursor-pointer`}
            >
              {KEY_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {keyLabel(k)}
                </option>
              ))}
            </select>
          </div>
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
            type="button"
            onClick={submit}
            disabled={pending}
            className="yk-gradient cursor-pointer rounded-[11px] px-5 py-[11px] text-sm font-bold disabled:opacity-60"
          >
            {pending ? t("creating") : t("create")}
          </button>
        </div>
      </div>
    </div>
  );
}

export type SongListRow = SongRow & {
  source: "youtube" | "file" | null;
  synced: boolean;
};

export function PlaylistDetailView({
  playlist,
  songs,
}: {
  playlist: PlaylistRow;
  songs: SongListRow[];
}) {
  const t = useTranslations("songs");
  const tPlaylists = useTranslations("playlists");
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [newSongOpen, setNewSongOpen] = useState(false);

  const genreLabel =
    playlist.genre === "other" && playlist.genre_other
      ? playlist.genre_other
      : tPlaylists(`genres.${playlist.genre}`);

  const edit = async (input: PlaylistInput) => {
    const result = await updatePlaylist(playlist.id, input);
    if (!result.ok) return result.error;
    router.refresh();
    return null;
  };

  const songUrl = (song: SongRow, mode?: string) =>
    `/playlists/${playlist.id}/songs/${song.id}${mode ? `?mode=${mode}` : ""}`;

  return (
    <div className="mx-auto max-w-[960px] px-7 pb-[90px] pt-6">
      <Link
        href="/playlists"
        className="mb-6 inline-flex items-center gap-2 text-[13px] text-tert hover:text-ink"
      >
        <ChevronLeft size={15} strokeWidth={2} />
        {tPlaylists("title")}
      </Link>

      {/* CABECERA DEL PLAYLIST */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-edge pb-[26px]">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center gap-3">
            <h1 className="text-[32px] font-extrabold tracking-[-0.02em]">
              {playlist.name}
            </h1>
            <span className="inline-flex rounded-full border border-edge-2 bg-surface-2 px-3 py-[5px] text-[12.5px] font-semibold">
              {genreLabel}
            </span>
          </div>
          {playlist.description && (
            <p className="mb-[18px] max-w-[520px] text-[15px] leading-[1.55] text-sub">
              {playlist.description}
            </p>
          )}
          <div className="flex flex-wrap gap-8">
            <div className="flex items-center gap-2.5">
              <span className="text-[12.5px] text-sub">{tPlaylists("like")}</span>
              <StarsRow value={playlist.rating_like} />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[12.5px] text-sub">{tPlaylists("difficulty")}</span>
              <StarsRow value={playlist.rating_difficulty} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-edge-2 bg-surface-2 px-[18px] py-[11px] text-sm font-semibold"
        >
          <Pencil size={16} strokeWidth={2} />
          {t("edit")}
        </button>
      </div>

      {/* CANCIONES */}
      <div className="mb-[18px] mt-[30px] flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">
          {t("songsTitle")}{" "}
          <span className="text-sm font-medium text-mute">
            · {tPlaylists("songCount", { count: songs.length })}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setNewSongOpen(true)}
          className="yk-gradient inline-flex cursor-pointer items-center gap-[9px] rounded-xl px-[18px] py-[11px] text-sm font-bold"
        >
          <Plus size={16} strokeWidth={2.4} />
          {t("newSong")}
        </button>
      </div>

      {songs.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {songs.map((song) => (
            <article
              key={song.id}
              className="flex items-center gap-4 rounded-[14px] border border-edge bg-surface py-3.5 pl-[18px] pr-4 transition-colors duration-150 hover:border-edge-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[15.5px] font-bold">{song.name}</span>
                  {song.key_note && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-2 bg-surface-2 px-2.5 py-[3px] text-[11.5px] font-semibold">
                      <Music size={12} strokeWidth={2} className="text-accent" />
                      {t("keyChip", { key: keyLabel(song.key_note) })}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3.5">
                  {song.source && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-tert">
                      {song.source === "youtube" ? (
                        <YoutubeIcon size={15} />
                      ) : (
                        <FileMusic size={14} strokeWidth={2} />
                      )}
                      {song.source === "youtube" ? "YouTube" : t("sourceFile")}
                    </span>
                  )}
                  {song.synced ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-[3px] text-[11.5px] font-semibold text-accent">
                      <span className="inline-block size-1.5 rounded-full bg-accent" />
                      {t("statusSynced")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-2 bg-surface-2 px-2.5 py-[3px] text-[11.5px] font-semibold text-sub">
                      <span className="inline-block size-1.5 rounded-full bg-mute" />
                      {t("statusRaw")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={songUrl(song)}
                  title={t("view")}
                  className="grid size-[38px] place-items-center rounded-[10px] text-sub hover:bg-edge hover:text-ink"
                >
                  <Eye size={18} strokeWidth={2} />
                </Link>
                <Link
                  href={songUrl(song, "edit")}
                  title={t("edit")}
                  className="grid size-[38px] place-items-center rounded-[10px] text-sub hover:bg-edge hover:text-ink"
                >
                  <Pencil size={17} strokeWidth={2} />
                </Link>
                <Link
                  href={songUrl(song, "calibrate")}
                  title={t("calibrate")}
                  className="grid size-[38px] place-items-center rounded-[10px] text-sub hover:bg-edge hover:text-ink"
                >
                  <SlidersVertical size={18} strokeWidth={2} />
                </Link>
                <Link
                  href={songUrl(song, "karaoke")}
                  title={t("karaoke")}
                  className="yk-gradient ml-1.5 grid size-11 place-items-center rounded-xl shadow-[0_4px_16px_rgba(46,107,240,0.3)]"
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
          ))}
        </div>
      ) : (
        /* ESTADO VACÍO */
        <div className="flex flex-col items-center rounded-[18px] border border-dashed border-edge-2 bg-surface-3 px-5 py-[60px] text-center">
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
          <h3 className="mb-2 text-lg font-bold">{t("emptyTitle")}</h3>
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

      {/* MODALES */}
      {editOpen && (
        <PlaylistFormModal
          title={t("editPlaylist")}
          submitLabel={t("save")}
          submittingLabel={t("saving")}
          initial={{
            name: playlist.name,
            description: playlist.description,
            genre: playlist.genre,
            genreOther: playlist.genre_other ?? "",
            ratingLike: playlist.rating_like,
            ratingDifficulty: playlist.rating_difficulty,
          }}
          onClose={() => setEditOpen(false)}
          onSubmit={edit}
        />
      )}
      {newSongOpen && (
        <SongFormModal playlistId={playlist.id} onClose={() => setNewSongOpen(false)} />
      )}
    </div>
  );
}
