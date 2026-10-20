"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { Badge, Button } from "./button";
import { Modal, ModalFooter, ModalHeader } from "./modal";
import type { PlaylistWithCount } from "@/lib/playlists";
import { moveSongToPlaylist } from "@/lib/song-actions";
import type { SongListRow } from "@/lib/songs";

/** Elegir la playlist destino de una canción (o ninguna, o una nueva). */
export function MoveSongModal({
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
  const titleId = useId();
  const [target, setTarget] = useState<string>(song.playlist_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = song.playlist_id ?? "";

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await moveSongToPlaylist(song.id, target || null).catch(() => null);
      if (!result?.ok) {
        setError(t(`errors.${result?.error ?? "db"}`));
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
    <Modal onClose={onClose} labelledBy={titleId}>
      <div className="flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
        <ModalHeader
          id={titleId}
          title={t("move.title", { name: song.name })}
          closeLabel={t("close")}
          onClose={onClose}
        />

        <div
          role="radiogroup"
          aria-labelledby={titleId}
          className="flex flex-col gap-1 overflow-y-auto p-3"
        >
          {options.map((o) => {
            const selected = target === o.id;
            return (
              <button
                key={o.id || "none"}
                type="button"
                role="radio"
                aria-checked={selected}
                data-autofocus={selected || undefined}
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
                {o.id === current && <Badge>{t("move.current")}</Badge>}
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
          <p role="alert" className="px-6 pb-1 text-[13px] font-semibold text-warn">
            {error}
          </p>
        )}
        <ModalFooter>
          <Button onClick={onClose}>{t("cancel")}</Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={pending || target === current}
          >
            {pending ? t("move.moving") : t("move.confirm")}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
