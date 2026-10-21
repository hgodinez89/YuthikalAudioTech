"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useToast } from "@/components/toast";
import { deleteSong } from "./song-actions";

/**
 * Borra una canción con «Deshacer»: desaparece de la lista al instante y el
 * borrado real ocurre a los 6 s (o al cerrar el aviso). La acción revalida
 * la lista: no hace falta refrescar aparte.
 */
export function useDeleteSong() {
  const t = useTranslations("songs");
  const { defer } = useToast();
  return useCallback(
    (song: { id: string; name: string }) =>
      defer({
        message: t("toast.deleted", { name: song.name }),
        hides: song.id,
        commit: async () => {
          const result = await deleteSong(song.id);
          return result.ok ? null : t(`errors.${result.error}`);
        },
      }),
    [defer, t],
  );
}
