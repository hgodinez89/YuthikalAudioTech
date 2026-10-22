"use client";

import { CloudCheck, Download, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { coverage } from "@/lib/offline-songs";
import {
  refreshOfflineSongs,
  setOfflineSong,
  useOfflineSongs,
  wipeOfflineSongs,
} from "@/lib/offline-songs-client";
import { useHasServiceWorker } from "@/lib/use-offline-instruments";
import { useOnline } from "@/lib/use-online";
import { Button } from "./button";

/** Sin sesión no quedan canciones de nadie en el dispositivo. */
export function WipeOfflineSongs() {
  useEffect(() => {
    void wipeOfflineSongs();
  }, []);
  return null;
}

/**
 * «Descargar» de la cabecera de una canción: la descarga sola o la quita; si
 * la cubre su playlist o «todas», solo lo indica. Con red, mantiene al día la
 * copia guardada (la página trae su versión).
 */
export function SongDownloadButton({
  songId,
  playlistId,
  playlistName,
  version,
}: {
  songId: string;
  playlistId: string | null;
  playlistName: string | null;
  version: string;
}) {
  const t = useTranslations("songView");
  const online = useOnline();
  const hasWorker = useHasServiceWorker();
  const { ready, scope, versions, busy } = useOfflineSongs();
  const covered = coverage(scope, { id: songId, playlist_id: playlistId });
  const stored = versions[songId];

  useEffect(() => {
    if (online && hasWorker && ready && covered && stored !== version) {
      void refreshOfflineSongs([songId]);
    }
  }, [online, hasWorker, ready, covered, stored, version, songId]);

  if (!hasWorker || !ready) return null;

  if (covered === "playlist" || covered === "all") {
    const name = covered === "all" ? t("offlineAll") : (playlistName ?? "");
    return (
      <span
        title={t("offlineIncludedHint")}
        className="inline-flex h-10 items-center gap-2 rounded-[11px] border border-edge px-4 text-[14px] font-semibold text-sub"
      >
        <CloudCheck size={16} strokeWidth={2} className="text-accent" />
        {t("offlineIncluded", { name })}
      </span>
    );
  }

  const saved = covered === "song";
  return (
    <Button
      onClick={() => void setOfflineSong(songId, !saved)}
      disabled={!online || busy !== null}
      title={saved ? t("offlineRemove") : undefined}
      className={saved ? "border-accent/35 text-accent" : "border-accent/45"}
    >
      {busy ? (
        <LoaderCircle size={16} strokeWidth={2.4} className="animate-spin text-accent" />
      ) : saved ? (
        <CloudCheck size={16} strokeWidth={2} />
      ) : (
        <Download size={16} strokeWidth={2} className="text-accent" />
      )}
      {busy ? t("offlineDownloading") : saved ? t("offlineSaved") : t("offlineDownload")}
    </Button>
  );
}
