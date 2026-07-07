"use client";

import { Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ChordDiagram } from "./chord-diagram";
import { escapeLike, parseChordQuery } from "@/lib/chord-search";
import { supabaseBrowser } from "@/lib/supabase";

type PickerChord = {
  name_en: string;
  name_es: string;
  position: { base_fret: number; frets: number[]; barres: number[] };
};

async function searchChords(query: string): Promise<PickerChord[]> {
  let qb = supabaseBrowser()
    .from("chords")
    .select(
      "name_en,name_es,positions:chord_positions!inner(base_fret,frets,barres,position)",
    )
    .eq("positions.position", 1);

  const parsed = parseChordQuery(query);
  if (parsed.kind === "chord") {
    qb = qb.in("key", parsed.keys);
    if (parsed.suffixes) qb = qb.in("suffix", parsed.suffixes);
  } else if (parsed.kind === "text") {
    qb = qb.ilike("search_text", `%${escapeLike(parsed.text)}%`);
  }

  const { data } = await qb
    .order("category_order")
    .order("note_order")
    .order("name_en")
    .limit(12);

  return (data ?? []).map((row) => ({
    name_en: row.name_en as string,
    name_es: row.name_es as string,
    position: (row.positions as PickerChord["position"][])[0],
  }));
}

/**
 * Popover selector de acordes del editor visual (Song Editor.dc.html):
 * buscador + lista con mini diagramas; opción de quitar el acorde actual.
 */
export function ChordPicker({
  x,
  y,
  currentChord,
  onPick,
  onRemove,
  onClose,
}: {
  x: number;
  y: number;
  currentChord: string | null;
  onPick: (name: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("editor");
  const [query, setQuery] = useState("");
  const [chords, setChords] = useState<PickerChord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      () => {
        searchChords(query).then((results) => {
          if (!cancelled) setChords(results);
        });
      },
      query ? 250 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Mantener el popover dentro del viewport (ancho fijo de 300px).
  const left = Math.min(Math.max(x - 150, 12), window.innerWidth - 312);
  const top = Math.min(y, window.innerHeight - 340);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-page/55 backdrop-blur-[3px]"
      role="dialog"
      aria-label={t("pickerTitle")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute w-[300px] overflow-hidden rounded-2xl border border-edge-2 bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        style={{ left, top }}
      >
        <div className="border-b border-edge px-3.5 py-3">
          <div className="relative flex items-center">
            <Search size={15} strokeWidth={2} className="absolute left-3 text-mute" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("pickerPlaceholder")}
              className="h-[38px] w-full rounded-[10px] border border-edge bg-surface-2 pl-9 pr-3 text-[13.5px] text-ink outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="max-h-[240px] overflow-y-auto p-2">
          {currentChord && (
            <button
              type="button"
              onClick={onRemove}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-warn hover:bg-edge"
            >
              <Trash2 size={15} strokeWidth={2} />
              <span className="text-[13.5px] font-semibold">
                {t("removeChord", { chord: currentChord })}
              </span>
            </button>
          )}
          {chords.map((chord) => (
            <button
              key={chord.name_en}
              type="button"
              onClick={() => onPick(chord.name_en)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-left hover:bg-edge"
            >
              <span className="shrink-0">
                <ChordDiagram
                  frets={chord.position.frets}
                  barres={chord.position.barres}
                  baseFret={chord.position.base_fret}
                  scale={0.62}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{chord.name_en}</span>
                <span className="block text-xs text-sub">{chord.name_es}</span>
              </span>
            </button>
          ))}
          {chords.length === 0 && (
            <p className="px-2.5 py-4 text-center text-[12.5px] text-tert">
              {t("pickerEmpty")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
