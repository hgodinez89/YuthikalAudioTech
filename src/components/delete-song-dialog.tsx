"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "./confirm-dialog";
import type { Instrument } from "@/lib/instruments";
import { deleteSong } from "@/lib/song-actions";
import type { SongRow } from "@/lib/songs";

/** Confirmar y borrar la canción desde el editor; luego vuelve a la lista. */
export function DeleteSongDialog({
  open,
  song,
  instrument,
  onCancel,
  onDeleted,
}: {
  open: boolean;
  song: SongRow;
  instrument: Instrument;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("editor");
  const tSongs = useTranslations("songs");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <ConfirmDialog
      open={open}
      title={t("deleteTitle")}
      message={t.rich("deleteMessage", {
        name: song.name,
        b: (chunks) => <span className="font-bold text-ink">{chunks}</span>,
      })}
      cancelLabel={tSongs("cancel")}
      confirmLabel={pending ? t("deleting") : t("deleteConfirm")}
      confirmIcon={<Trash2 size={15} strokeWidth={2.2} />}
      pending={pending}
      error={error}
      onCancel={() => {
        setError(null);
        onCancel();
      }}
      onConfirm={() =>
        startTransition(async () => {
          setError(null);
          const result = await deleteSong(song.id).catch(() => null);
          if (!result?.ok) {
            setError(tSongs(`errors.${result?.error ?? "db"}`));
            return;
          }
          onDeleted();
          router.push(`/${instrument}/songs`);
        })
      }
    />
  );
}
