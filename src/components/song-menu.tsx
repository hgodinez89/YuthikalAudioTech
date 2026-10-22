"use client";

import {
  CloudCheck,
  Copy,
  Download,
  Ellipsis,
  FolderInput,
  Pencil,
  SlidersVertical,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Coverage } from "@/lib/offline-songs";
import { useOnline } from "@/lib/use-online";
import { Menu, MenuItem, MenuSeparator } from "./menu";

/** Menú ⋯ de una canción: acciones secundarias fuera de la vista principal. */
export function SongMenu({
  songName,
  songUrl,
  onMove,
  onDuplicate,
  onDelete,
  offlineItem,
}: {
  /** Descargar o quitar para usar sin conexión (solo con service worker). */
  offlineItem?: {
    state: Coverage;
    playlistName: string;
    disabled: boolean;
    onToggle: () => void;
  };
  songName: string;
  songUrl: (mode?: string) => string;
  onMove: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("songs");
  const tEditor = useTranslations("editor");
  const icon = { size: 16, strokeWidth: 2 } as const;
  // Sin conexión todo el menú es de edición: se ve, pero desactivado.
  const offline = !useOnline();

  return (
    <Menu
      label={`${t("moreActions")}: ${songName}`}
      trigger={{
        "aria-label": `${t("moreActions")}: ${songName}`,
        className:
          "grid size-[38px] cursor-pointer place-items-center rounded-[10px] text-sub hover:bg-edge hover:text-ink",
        children: <Ellipsis size={19} strokeWidth={2} />,
      }}
      panelClassName="absolute right-0 top-[42px] z-40 w-[260px] overflow-hidden rounded-[12px] border border-edge-2 bg-surface p-1.5 shadow-pop"
    >
      <MenuItem href={songUrl("edit")} icon={<Pencil {...icon} />} disabled={offline}>
        {t("edit")}
      </MenuItem>
      <MenuItem
        href={songUrl("audio")}
        icon={<SlidersVertical {...icon} />}
        disabled={offline}
      >
        {t("syncAudio")}
      </MenuItem>
      <MenuItem onSelect={onMove} icon={<FolderInput {...icon} />} disabled={offline}>
        {t("moveToPlaylist")}
      </MenuItem>
      <MenuItem onSelect={onDuplicate} icon={<Copy {...icon} />} disabled={offline}>
        {t("duplicate")}
      </MenuItem>
      {offlineItem && (
        <>
          <MenuSeparator />
          {offlineItem.state === "playlist" || offlineItem.state === "all" ? (
            // La cubre su playlist o «todas»: se quita desde ahí.
            <MenuItem
              disabled
              icon={<CloudCheck {...icon} className="shrink-0 text-accent" />}
            >
              {offlineItem.state === "all"
                ? t("offline.menuIncludedAll")
                : t("offline.menuIncluded", { name: offlineItem.playlistName })}
            </MenuItem>
          ) : (
            <MenuItem
              onSelect={offlineItem.onToggle}
              disabled={offlineItem.disabled}
              icon={
                offlineItem.state === "song" ? (
                  <CloudCheck {...icon} className="shrink-0 text-accent" />
                ) : (
                  <Download {...icon} className="shrink-0 text-accent" />
                )
              }
            >
              {offlineItem.state === "song"
                ? t("offline.menuRemove")
                : t("offline.menuDownload")}
            </MenuItem>
          )}
        </>
      )}
      <MenuSeparator />
      <MenuItem
        onSelect={onDelete}
        tone="danger"
        icon={<Trash2 {...icon} />}
        disabled={offline}
      >
        {tEditor("deleteSong")}
      </MenuItem>
    </Menu>
  );
}
