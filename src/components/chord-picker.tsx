"use client";

import { RotateCcw, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { ChordVisual } from "./chord-visual";
import { Modal } from "./modal";
import { escapeLike, parseChordQuery } from "@/lib/chord-search";
import type { CustomChordRow } from "@/lib/custom-chords";
import { catalogInstrument, isFretted, type Instrument } from "@/lib/instruments";
import { PIANO_SUFFIXES, pianoRootKeys } from "@/lib/piano";

type PickerChord = {
  name_en: string;
  name_es: string;
  position: { base_fret: number; frets: number[]; barres: number[] };
  /** Piano: teclas del acorde. */
  keys?: number[];
};

async function searchChords(
  instrument: Instrument,
  query: string,
): Promise<PickerChord[]> {
  const { supabaseBrowser } = await import("@/lib/supabase");
  let qb = supabaseBrowser()
    .from("chords")
    .select(
      "key,suffix,name_en,name_es,positions:chord_positions!inner(base_fret,frets,barres,position)",
    )
    .eq("instrument", catalogInstrument(instrument))
    .eq("positions.position", 1);
  // Piano: identidad del catálogo de guitarra, solo tipos que se tocan en teclado.
  if (!isFretted(instrument)) qb = qb.in("suffix", PIANO_SUFFIXES);

  const parsed = parseChordQuery(query);
  if (parsed.kind === "chord") {
    qb = qb.in("key", parsed.keys);
    if (parsed.suffixes) qb = qb.in("suffix", parsed.suffixes);
  } else if (parsed.kind === "text") {
    qb = qb.ilike("search_text", `%${escapeLike(parsed.text)}%`);
  }

  const { data, error } = await qb
    .order("category_order")
    .order("note_order")
    .order("name_en")
    .limit(12);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    name_en: row.name_en as string,
    name_es: row.name_es as string,
    position: (row.positions as PickerChord["position"][])[0],
    keys: isFretted(instrument)
      ? undefined
      : pianoRootKeys(row.key as string, row.suffix as string),
  }));
}

/**
 * Popover selector de acordes del editor visual (Song Editor.dc.html):
 * buscador + lista con mini diagramas; opción de quitar el acorde actual.
 */
export function ChordPicker({
  instrument,
  x,
  y,
  currentChord,
  customChords = [],
  onPick,
  onRemove,
  onClose,
}: {
  instrument: Instrument;
  x: number;
  y: number;
  currentChord: string | null;
  /** Biblioteca del usuario: grupo "Mis acordes" arriba del catálogo. */
  customChords?: CustomChordRow[];
  onPick: (name: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("editor");
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [chords, setChords] = useState<PickerChord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  /* Reintentar vuelve a lanzar la misma búsqueda. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      () => {
        setStatus("loading");
        searchChords(instrument, query)
          .then((results) => {
            if (cancelled) return;
            setChords(results);
            setStatus("ready");
          })
          .catch(() => !cancelled && setStatus("error"));
      },
      query ? 250 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [instrument, query, attempt]);

  const needle = query.trim().toLowerCase();
  const mine = customChords
    .filter((c) => c.name.toLowerCase().includes(needle))
    .slice(0, 8);

  // Mantener el popover dentro del viewport (ancho fijo de 300px).
  const left = Math.min(Math.max(x - 150, 12), window.innerWidth - 312);
  const top = Math.min(y, window.innerHeight - 340);

  return (
    <Modal onClose={onClose} label={t("pickerTitle")} variant="anchored" backdrop="light">
      <div
        className="absolute w-[300px] overflow-hidden rounded-2xl border border-edge-2 bg-surface shadow-pop"
        style={{ left, top }}
      >
        <div className="border-b border-edge px-3.5 py-3">
          <div className="relative flex items-center">
            <Search size={15} strokeWidth={2} className="absolute left-3 text-mute" />
            <label htmlFor={inputId} className="sr-only">
              {t("pickerTitle")}
            </label>
            <input
              id={inputId}
              data-autofocus
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
                <ChordVisual
                  chord={{
                    frets: chord.position.frets,
                    barres: chord.position.barres,
                    baseFret: chord.position.base_fret,
                    keys: chord.keys,
                  }}
                  scale={chord.keys ? 0.8 : 0.62}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{chord.name_en}</span>
                <span className="block text-xs text-sub">{chord.name_es}</span>
              </span>
            </button>
          ))}
          {mine.length > 0 && (
            <div role="group" aria-label={t("pickerMine")} className="mb-1">
              <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                {t("pickerMine")}
              </div>
              {mine.map((chord) => (
                <button
                  key={chord.id}
                  type="button"
                  onClick={() => onPick(chord.name)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-left hover:bg-edge"
                >
                  <span className="shrink-0">
                    <ChordVisual
                      chord={{
                        frets: chord.frets,
                        barres: chord.barres,
                        baseFret: chord.base_fret,
                        keys: chord.keys.length ? chord.keys : undefined,
                      }}
                      scale={chord.keys.length ? 0.8 : 0.62}
                    />
                  </span>
                  <span className="text-sm font-bold">{chord.name}</span>
                </button>
              ))}
              <div className="mx-1.5 my-1 h-px bg-edge" />
            </div>
          )}
          {status === "error" ? (
            <div role="alert" className="px-2.5 py-4 text-center text-[12.5px]">
              <p className="mb-2.5 font-semibold text-warn">{t("pickerError")}</p>
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border border-edge-2 px-3.5 font-semibold text-ink hover:border-accent/50"
              >
                <RotateCcw size={13} strokeWidth={2.2} />
                {t("retry")}
              </button>
            </div>
          ) : status === "loading" && chords.length === 0 ? (
            <p role="status" className="px-2.5 py-4 text-center text-[12.5px] text-tert">
              {t("pickerLoading")}
            </p>
          ) : (
            chords.length === 0 &&
            mine.length === 0 && (
              <p className="px-2.5 py-4 text-center text-[12.5px] text-tert">
                {t("pickerEmpty")}
              </p>
            )
          )}
        </div>
      </div>
    </Modal>
  );
}
