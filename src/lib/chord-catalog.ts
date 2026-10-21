import type { ChordCardData } from "@/components/chord-card";
import { parseChordQuery } from "./chord-search";
import type { ChordGrouping, ChordPage, ChordPicks, ChordRow } from "./chord-query";
import { PAGE_SIZE, QUICK_TYPES } from "./chord-query";
import { DB_KEYS, type ChordCategory, type ChordPositionRow } from "./chords";
import { chordDbId, isFretted, type Instrument } from "./instruments";
import { PIANO_SUFFIXES, pianoRootKeys } from "./piano";

/*
 * Catálogo de acordes para consultar SIN conexión: un JSON estático por
 * instrumento (/catalog/guitar.json…) generado en el build. El buscador y la
 * ficha de un acorde lo usan cuando no hay red; con red siguen yendo a Supabase.
 */

export type CatalogChord = {
  id: string;
  key: string;
  suffix: string;
  name_en: string;
  name_es: string;
  category: ChordCategory;
  category_order: number;
  note_order: number;
  search_text: string;
  notes: string[];
  intervals: string[];
  /** Todas las posiciones (piano: ninguna; las teclas se calculan). */
  positions: ChordPositionRow[];
};

export type Catalog = { instrument: Instrument; chords: CatalogChord[] };

export const catalogUrl = (instrument: Instrument) => `/catalog/${instrument}.json`;

/** Lo que el `ilike` de Postgres compara: sin mayúsculas (como search_text). */
const fold = (s: string) => s.toLocaleLowerCase();

const byOrder =
  (grouping: ChordGrouping) =>
  (a: CatalogChord, b: CatalogChord): number => {
    const [first, second] =
      grouping === "cat"
        ? (["category_order", "note_order"] as const)
        : (["note_order", "category_order"] as const);
    return (
      a[first] - b[first] ||
      a[second] - b[second] ||
      (a.name_en < b.name_en ? -1 : a.name_en > b.name_en ? 1 : 0)
    );
  };

/**
 * Una página del buscador desde el catálogo local, con las mismas reglas que
 * `fetchChords` (consulta → notas/tipos o texto, selector rápido, piano solo
 * con sus tipos, orden por categoría o por nota, páginas de PAGE_SIZE).
 */
export function searchCatalog(
  catalog: Catalog,
  rawQuery: string,
  grouping: ChordGrouping,
  offset: number,
  picks?: ChordPicks,
): ChordPage {
  const { instrument } = catalog;
  const parsed = parseChordQuery(rawQuery);
  const keys =
    picks?.keys.filter((k) => (DB_KEYS as readonly string[]).includes(k)) ?? [];
  const suffixes = picks?.suffixes.filter((s) => QUICK_TYPES.includes(s)) ?? [];
  const needle = parsed.kind === "text" ? fold(parsed.text) : "";

  const matches = catalog.chords
    .filter((c) => isFretted(instrument) || PIANO_SUFFIXES.includes(c.suffix))
    .filter((c) => {
      if (parsed.kind === "chord") {
        if (!parsed.keys.includes(c.key)) return false;
        if (parsed.suffixes && !parsed.suffixes.includes(c.suffix)) return false;
      } else if (parsed.kind === "text" && !fold(c.search_text).includes(needle)) {
        return false;
      }
      if (keys.length && !keys.includes(c.key)) return false;
      if (suffixes.length && !suffixes.includes(c.suffix)) return false;
      return true;
    })
    .sort(byOrder(grouping));

  const rows: ChordRow[] = matches.slice(offset, offset + PAGE_SIZE).map((c) => ({
    id: c.id,
    key: c.key,
    suffix: c.suffix,
    name_en: c.name_en,
    name_es: c.name_es,
    category: c.category,
    position: (c.positions[0] ?? {
      base_fret: 1,
      frets: [],
      barres: [],
    }) as ChordCardData["position"],
    keys: isFretted(instrument) ? undefined : pianoRootKeys(c.key, c.suffix),
  }));
  return { rows, total: matches.length };
}

/** El acorde de una ficha (por su slug: "c-major"), o null si no está. */
export function findCatalogChord(catalog: Catalog, slug: string): CatalogChord | null {
  const id = chordDbId(catalog.instrument, slug);
  const chord = catalog.chords.find((c) => c.id === id) ?? null;
  // Piano: solo los tipos que tienen voicing de teclado (como la ficha con red).
  if (chord && !isFretted(catalog.instrument) && !PIANO_SUFFIXES.includes(chord.suffix)) {
    return null;
  }
  return chord;
}
