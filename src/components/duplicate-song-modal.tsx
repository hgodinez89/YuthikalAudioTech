"use client";

import { Check, FileMusic, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { InstrumentToggles } from "./instrument-toggles";
import { FIELD_CLASS } from "./playlist-form-modal";
import type { SongListRow } from "./songs-view";
import type { PlaylistRow } from "@/lib/playlists";
import { duplicateSong } from "@/lib/song-actions";
import { copyName, KEY_OPTIONS, keyLabel, validateSong } from "@/lib/songs";

/** Casilla con el estilo de la app (los checkbox nativos no se pueden teñir bien). */
function CheckOption({
  checked,
  disabled,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-start gap-3 rounded-[11px] border border-edge bg-surface-2 px-3.5 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border ${
          checked ? "border-accent bg-accent text-page" : "border-edge-2"
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block truncate text-[12.5px] text-tert">{detail}</span>
      </span>
    </button>
  );
}

/**
 * Duplicar una canción: datos precargados de la original (editables) y qué
 * más copiar —audio y sincronización—, marcado por defecto.
 */
export function DuplicateSongModal({
  song,
  playlists,
  onClose,
  onDone,
}: {
  song: SongListRow;
  playlists: PlaylistRow[];
  onClose: () => void;
  onDone: (newId: string, playlistId: string | null) => void;
}) {
  const t = useTranslations("songs");
  const [form, setForm] = useState({
    name: copyName(song.name, t("copySuffix")),
    description: song.description,
    keyNote: song.key_note,
    instruments: song.instruments,
    playlistId: song.playlist_id ?? "",
  });
  const [audio, setAudio] = useState(song.source !== null);
  const [sync, setSync] = useState(song.synced);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    const input = { ...form, playlistId: form.playlistId || null };
    const invalid = validateSong(input);
    if (invalid) {
      setError(t(`errors.${invalid}`));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await duplicateSong(song.id, input, { audio, sync });
      if (!result.ok || !result.id) {
        setError(t(`errors.${result.ok ? "db" : result.error}`));
        return;
      }
      onDone(result.id, input.playlistId);
    });
  };

  const audioDetail =
    song.source === "youtube"
      ? `YouTube${song.youtubeTitle ? ` · ${song.youtubeTitle}` : ""}`
      : t("sourceFile");

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-page/70 p-6 backdrop-blur-[6px]"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between border-b border-edge px-6 py-[20px]">
          <h2 id="duplicate-title" className="text-[19px] font-extrabold">
            {t("duplicateTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid size-8 cursor-pointer place-items-center rounded-[9px] border border-edge bg-surface-2 text-sub"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex flex-col gap-[16px] px-6 py-[20px]">
          <div>
            <label
              htmlFor="dup-name"
              className="mb-[7px] block text-[12.5px] font-semibold text-sub"
            >
              {t("form.name")}
            </label>
            <input
              id="dup-name"
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={150}
              className={`${FIELD_CLASS} h-11`}
            />
          </div>
          <div>
            <label
              htmlFor="dup-description"
              className="mb-[7px] block text-[12.5px] font-semibold text-sub"
            >
              {t("form.description")}
            </label>
            <textarea
              id="dup-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              maxLength={300}
              className={`${FIELD_CLASS} resize-none py-[11px]`}
            />
          </div>
          <div className="grid gap-[16px] sm:grid-cols-2">
            <div>
              <label
                htmlFor="dup-key"
                className="mb-[7px] block text-[12.5px] font-semibold text-sub"
              >
                {t("form.key")}
              </label>
              <select
                id="dup-key"
                value={form.keyNote}
                onChange={(e) => setForm({ ...form, keyNote: e.target.value })}
                className={`${FIELD_CLASS} h-11 cursor-pointer`}
              >
                <option value="">{t("form.noKey")}</option>
                {KEY_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {keyLabel(k)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="dup-playlist"
                className="mb-[7px] block text-[12.5px] font-semibold text-sub"
              >
                {t("form.playlist")}
              </label>
              <select
                id="dup-playlist"
                value={form.playlistId}
                onChange={(e) => setForm({ ...form, playlistId: e.target.value })}
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
          </div>
          <div>
            <span className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {t("form.instruments")}
            </span>
            <InstrumentToggles
              value={form.instruments}
              onChange={(instruments) => setForm({ ...form, instruments })}
              label={t("form.instruments")}
            />
          </div>

          {/* Qué más copiar */}
          <div>
            <div className="mb-2 text-[12.5px] font-semibold text-sub">
              {t("copyAlso")}
            </div>
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-[12.5px] text-tert">
                <Info size={14} strokeWidth={2} className="shrink-0 text-accent" />
                {t("copyLyricsNote")}
              </p>
              {song.source && (
                <CheckOption
                  checked={audio}
                  onChange={setAudio}
                  title={t("copyAudio")}
                  detail={audioDetail}
                />
              )}
              {song.synced && (
                <CheckOption
                  checked={audio && sync}
                  disabled={!audio}
                  onChange={setSync}
                  title={t("copySync")}
                  detail={t("copySyncDetail", {
                    count: song.stampCount,
                    granularity: song.granularity ?? "line",
                  })}
                />
              )}
              {song.source === "file" && audio && (
                <p className="flex items-center gap-2 text-[12px] text-tert">
                  <FileMusic size={13} strokeWidth={2} className="shrink-0" />
                  {t("copyFileNote")}
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-[13px] font-semibold text-warn">{error}</p>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-edge px-6 py-[16px]">
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
            {pending ? t("duplicating") : t("duplicate")}
          </button>
        </div>
      </form>
    </div>
  );
}
