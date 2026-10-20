"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "./button";
import { Modal, MODAL_PANEL, ModalFooter, ModalHeader } from "./modal";
import { FIELD_CLASS } from "./playlist-form-modal";
import type { Instrument } from "@/lib/instruments";
import type { PlaylistRow } from "@/lib/playlists";
import { createSong } from "@/lib/song-actions";
import { validateSong } from "@/lib/songs";

/** Nueva canción: solo el nombre (y la playlist, opcional). */
export function NewSongModal({
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
  const titleId = useId();
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
      const result = await createSong(input).catch(() => null);
      if (!result?.ok) {
        setError(t(`errors.${result?.error ?? "db"}`));
        return;
      }
      // Directo al editor para cargar (o pegar) la letra con sus acordes.
      router.push(`/${instrument}/songs/${result.id}?mode=edit`);
    });
  };

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`${MODAL_PANEL} max-w-[440px]`}
      >
        <ModalHeader
          id={titleId}
          title={t("newSong")}
          closeLabel={t("close")}
          onClose={onClose}
        />
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
              data-autofocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
              maxLength={150}
              aria-describedby={error ? "new-song-error" : undefined}
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
          {error && (
            <p
              id="new-song-error"
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
            {pending ? t("creating") : t("create")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
