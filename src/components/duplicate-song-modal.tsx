"use client";

import { Check, FileMusic, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Badge, Button } from "./button";
import { InstrumentToggles } from "./instrument-toggles";
import { Modal, MODAL_PANEL, ModalFooter, ModalHeader } from "./modal";
import { FIELD_CLASS } from "./playlist-form-modal";
import type { PlaylistRow } from "@/lib/playlists";
import { MP3_ENABLED } from "@/lib/audio";
import { duplicateSong } from "@/lib/song-actions";
import {
  copyName,
  KEY_OPTIONS,
  keyLabel,
  validateSong,
  type SongListRow,
} from "@/lib/songs";

/** Casilla con el estilo de la app (los checkbox nativos no se pueden teñir bien). */
function CheckOption({
  checked,
  disabled,
  onChange,
  title,
  detail,
  badge,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  detail: string;
  /** Insignia junto al título (p. ej. "Próximamente"). */
  badge?: string;
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
        <span className="flex items-center gap-2 text-[14px] font-semibold">
          {title}
          {badge && <Badge>{badge}</Badge>}
        </span>
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
  /* Con la subida de MP3 deshabilitada, un MP3 (y su sincronización) no se copia. */
  const audioLocked = song.source === "file" && !MP3_ENABLED;
  const [audio, setAudio] = useState(song.source !== null && !audioLocked);
  const [sync, setSync] = useState(song.synced && !audioLocked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const input = { ...form, playlistId: form.playlistId || null };
    const invalid = validateSong(input);
    if (invalid) {
      setError(t(`errors.${invalid}`));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await duplicateSong(song.id, input, { audio, sync }).catch(
        () => null,
      );
      if (!result?.ok || !result.id) {
        setError(t(`errors.${result && !result.ok ? result.error : "db"}`));
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
    <Modal onClose={onClose} labelledBy="duplicate-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`${MODAL_PANEL} max-w-[480px]`}
      >
        <ModalHeader
          id="duplicate-title"
          title={t("duplicateTitle")}
          closeLabel={t("close")}
          onClose={onClose}
        />

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
              data-autofocus
              onFocus={(e) => e.currentTarget.select()}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={150}
              aria-describedby={error ? "dup-error" : undefined}
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
                  disabled={audioLocked}
                  onChange={setAudio}
                  title={t("copyAudio")}
                  detail={audioLocked ? t("copyFileSoon") : audioDetail}
                  badge={audioLocked ? t("soon") : undefined}
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

          {error && (
            <p
              id="dup-error"
              role="alert"
              className="text-[13px] font-semibold text-warn"
            >
              {error}
            </p>
          )}
        </div>

        <ModalFooter>
          <Button onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? t("duplicating") : t("duplicate")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
