"use client";

import { Trash2, WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "./button";
import { InstrumentToggles } from "./instrument-toggles";
import { Modal, ModalHeader } from "./modal";
import { FIELD_CLASS } from "./playlist-form-modal";
import { detectKey, type DetectedKey } from "@/lib/key-detect";
import { updateSongMeta } from "@/lib/song-actions";
import { KEY_OPTIONS, keyLabel, validateSong, type SongRow } from "@/lib/songs";

export type PlaylistOption = { id: string; name: string };

const LABEL = "mb-[7px] block text-[12.5px] font-semibold text-sub";

/** Drawer "Datos de la canción": nombre, descripción, tonalidad, instrumentos, playlist. */
export function SongMetaDrawer({
  song,
  content,
  playlists,
  onClose,
  onDelete,
}: {
  song: SongRow;
  /** Cifrado actual del editor (aunque no se haya guardado): base de Autodetectar. */
  content: string;
  playlists: PlaylistOption[];
  onClose: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("editor");
  const tSongs = useTranslations("songs");
  const router = useRouter();
  const id = useId();
  const [form, setForm] = useState({
    name: song.name,
    description: song.description,
    keyNote: song.key_note,
    instruments: song.instruments,
    playlistId: song.playlist_id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  /* Autodetectar: se calcula del cifrado (null = sin acordes reconocibles) y
     solo se muestra y aplica al pulsar el botón; guardar sigue siendo manual. */
  const detection = useMemo(() => detectKey(content), [content]);
  const [detected, setDetected] = useState<DetectedKey | null>(null);
  const autoDetect = () => {
    if (!detection) return;
    setDetected(detection);
    setForm((f) => ({ ...f, keyNote: detection.key }));
  };
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const input = { ...form, playlistId: form.playlistId || null };
    const invalid = validateSong(input);
    if (invalid) {
      setError(tSongs(`errors.${invalid}`));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateSongMeta(song.id, input).catch(() => null);
      if (!result?.ok) {
        setError(tSongs(`errors.${result?.error ?? "db"}`));
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <Modal onClose={onClose} labelledBy={`${id}-title`} variant="drawer">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="h-full w-[420px] max-w-[92vw] overflow-y-auto border-l border-edge-2 bg-surface shadow-pop"
      >
        <ModalHeader
          id={`${id}-title`}
          title={t("songData")}
          closeLabel={tSongs("close")}
          onClose={onClose}
          className="sticky top-0 z-10 bg-surface"
        />
        <div className="flex flex-col gap-5 p-6">
          <div>
            <label htmlFor={`${id}-name`} className={LABEL}>
              {tSongs("form.name")}
            </label>
            <input
              id={`${id}-name`}
              data-autofocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={150}
              aria-describedby={error ? `${id}-error` : undefined}
              className={`${FIELD_CLASS} h-11`}
            />
          </div>
          <div>
            <label htmlFor={`${id}-description`} className={LABEL}>
              {tSongs("form.description")}
            </label>
            <textarea
              id={`${id}-description`}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              maxLength={300}
              className={`${FIELD_CLASS} resize-none py-[11px]`}
            />
          </div>
          <div>
            <div className="mb-[7px] flex items-center justify-between gap-3">
              <label
                htmlFor={`${id}-key`}
                className="block text-[12.5px] font-semibold text-sub"
              >
                {tSongs("form.key")}
              </label>
              <button
                type="button"
                onClick={autoDetect}
                disabled={!detection}
                title={
                  detection ? tSongs("form.autoDetectHint") : tSongs("form.noChords")
                }
                className="yk-hit-y relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] [--hit:9px] font-semibold text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent"
              >
                <WandSparkles size={14} strokeWidth={2} />
                {tSongs("form.autoDetect")}
              </button>
            </div>
            <select
              id={`${id}-key`}
              value={form.keyNote}
              onChange={(e) => setForm({ ...form, keyNote: e.target.value })}
              className={`${FIELD_CLASS} h-11 cursor-pointer`}
            >
              <option value="">{tSongs("form.noKey")}</option>
              {KEY_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {keyLabel(k)}
                </option>
              ))}
            </select>
            {detected && (
              <p className="mt-2 text-[12.5px] text-sub" aria-live="polite">
                {tSongs("form.detected", { key: keyLabel(detected.key) })}
                {detected.alternative && (
                  <>
                    {" · "}
                    {tSongs("form.detectedAlt")}{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, keyNote: detected.alternative! }))
                      }
                      className="cursor-pointer font-semibold text-accent hover:underline"
                    >
                      {keyLabel(detected.alternative)}
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
          <div>
            <span className={LABEL}>{tSongs("form.instruments")}</span>
            <InstrumentToggles
              value={form.instruments}
              onChange={(instruments) => setForm({ ...form, instruments })}
              label={tSongs("form.instruments")}
            />
          </div>
          <div>
            <label htmlFor={`${id}-playlist`} className={LABEL}>
              {tSongs("form.playlist")}
            </label>
            <select
              id={`${id}-playlist`}
              value={form.playlistId}
              onChange={(e) => setForm({ ...form, playlistId: e.target.value })}
              className={`${FIELD_CLASS} h-11 cursor-pointer`}
            >
              <option value="">{tSongs("form.noPlaylist")}</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p
              id={`${id}-error`}
              role="alert"
              className="text-[13px] font-semibold text-warn"
            >
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={pending} className="mt-1.5">
            {pending ? t("savingChanges") : t("saveChanges")}
          </Button>
          <Button variant="dangerSoft" onClick={onDelete}>
            <Trash2 size={15} strokeWidth={2.2} />
            {t("deleteSong")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
