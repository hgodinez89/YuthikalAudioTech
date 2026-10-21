"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChordDataMap } from "./chord-sheet";
import { FadeRow } from "./fade-row";
import { chordIdFromName } from "@/lib/chord-search";

/* ¿Se puede buscar en el catálogo? (un acorde con bajo, por su acorde base). */
const parseable = (name: string) => chordIdFromName(name.split("/")[0]) !== null;

/**
 * Acordes de la canción en el editor: los que tienen diagrama (del catálogo
 * o propios, "Mío") y los que no, con "Sin diagrama · Crear" para abrir el
 * constructor con el nombre ya puesto.
 */
export function SongChordsStrip({
  names,
  chords,
  checked,
  onCreate,
}: {
  names: string[];
  chords: ChordDataMap;
  /** Nombres ya buscados al abrir el editor (los nuevos aún no se buscaron). */
  checked: ReadonlySet<string>;
  onCreate: (name: string) => void;
}) {
  const t = useTranslations("editor.chords");
  if (names.length === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-tert">
        {t("title")}
      </span>
      <FadeRow
        role="list"
        aria-label={t("title")}
        className="-my-1.5 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1.5 [scrollbar-width:none]"
      >
        {names.map((name) => {
          const data = chords[name];
          // Sin diagrama confirmado: se buscó al abrir, o no es un nombre del catálogo.
          const missing = !data && (checked.has(name) || !parseable(name));
          return (
            <span key={name} role="listitem" className="shrink-0">
              {data || !missing ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-2 px-3 py-[5px] text-[12.5px] font-bold">
                  {name}
                  {data?.custom && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
                      {t("mine")}
                    </span>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onCreate(name)}
                  title={t("createHint", { name })}
                  className="yk-hit-y relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-warn/50 bg-warn/5 px-3 py-[5px] text-[12.5px] font-bold text-warn hover:bg-warn/10"
                >
                  {name}
                  <span className="font-semibold opacity-80">· {t("missing")} ·</span>
                  <Plus size={12} strokeWidth={2.6} />
                  {t("create")}
                </button>
              )}
            </span>
          );
        })}
      </FadeRow>
    </div>
  );
}
