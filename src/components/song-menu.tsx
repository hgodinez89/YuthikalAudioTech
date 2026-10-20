"use client";

import {
  Copy,
  Ellipsis,
  FolderInput,
  Pencil,
  SlidersVertical,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Menu, MenuItem, MenuSeparator } from "./menu";

/** Menú ⋯ de una canción: acciones secundarias fuera de la vista principal. */
export function SongMenu({
  songName,
  songUrl,
  onMove,
  onDuplicate,
  onDelete,
}: {
  songName: string;
  songUrl: (mode?: string) => string;
  onMove: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("songs");
  const tEditor = useTranslations("editor");
  const icon = { size: 16, strokeWidth: 2 } as const;

  return (
    <Menu
      label={`${t("moreActions")}: ${songName}`}
      trigger={{
        "aria-label": `${t("moreActions")}: ${songName}`,
        className:
          "grid size-[38px] cursor-pointer place-items-center rounded-[10px] text-sub hover:bg-edge hover:text-ink",
        children: <Ellipsis size={19} strokeWidth={2} />,
      }}
      panelClassName="absolute right-0 top-[42px] z-40 w-[210px] overflow-hidden rounded-[12px] border border-edge-2 bg-surface p-1.5 shadow-pop"
    >
      <MenuItem href={songUrl("edit")} icon={<Pencil {...icon} />}>
        {t("edit")}
      </MenuItem>
      <MenuItem href={songUrl("audio")} icon={<SlidersVertical {...icon} />}>
        {t("syncAudio")}
      </MenuItem>
      <MenuItem onSelect={onMove} icon={<FolderInput {...icon} />}>
        {t("moveToPlaylist")}
      </MenuItem>
      <MenuItem onSelect={onDuplicate} icon={<Copy {...icon} />}>
        {t("duplicate")}
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={onDelete} tone="danger" icon={<Trash2 {...icon} />}>
        {tEditor("deleteSong")}
      </MenuItem>
    </Menu>
  );
}
