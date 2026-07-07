/** Tipos y diccionarios del catálogo de acordes (los datos viven en Supabase). */

export type ChordRow = {
  id: string;
  key: string;
  suffix: string;
  name_en: string;
  name_es: string;
  category: ChordCategory;
  notes: string[];
  intervals: string[];
  positions_count: number;
};

export type ChordPositionRow = {
  position: number;
  base_fret: number;
  frets: number[];
  fingers: number[];
  barres: number[];
  capo: boolean;
};

export const CATEGORIES = [
  "major",
  "minor",
  "seventh",
  "suspended",
  "diminished",
  "augmented",
  "extended",
  "other",
] as const;

export type ChordCategory = (typeof CATEGORIES)[number];

/** Claves tal como las nombra chords-db, en orden cromático. */
export const DB_KEYS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

/** Etiquetas de agrupación "Por nota" (con enarmonías en las alteradas). */
export const NOTE_LABELS: Record<"es" | "en", Record<string, string>> = {
  es: {
    C: "Do",
    "C#": "Do# / Reb",
    D: "Re",
    Eb: "Re# / Mib",
    E: "Mi",
    F: "Fa",
    "F#": "Fa# / Solb",
    G: "Sol",
    Ab: "Sol# / Lab",
    A: "La",
    Bb: "La# / Sib",
    B: "Si",
  },
  en: {
    C: "C",
    "C#": "C# / Db",
    D: "D",
    Eb: "D# / Eb",
    E: "E",
    F: "F",
    "F#": "F# / Gb",
    G: "G",
    Ab: "G# / Ab",
    A: "A",
    Bb: "A# / Bb",
    B: "B",
  },
};

/** Raíz corta en español (para el nombre dual "A#7 / Sib7"). */
export const ROOT_SHORT_ES: Record<string, string> = {
  C: "Do",
  "C#": "Do#",
  D: "Re",
  Eb: "Mib",
  E: "Mi",
  F: "Fa",
  "F#": "Fa#",
  G: "Sol",
  Ab: "Lab",
  A: "La",
  Bb: "Sib",
  B: "Si",
};

/** Raíz larga en español, con enarmonía (para el subtítulo del detalle). */
export const ROOT_LONG_ES: Record<string, string> = {
  C: "Do",
  "C#": "Do sostenido / Re bemol",
  D: "Re",
  Eb: "Re sostenido / Mi bemol",
  E: "Mi",
  F: "Fa",
  "F#": "Fa sostenido / Sol bemol",
  G: "Sol",
  Ab: "Sol sostenido / La bemol",
  A: "La",
  Bb: "La sostenido / Si bemol",
  B: "Si",
};

/** Sufijo tal como se escribe en el cifrado: C, Cm, C7, Cmaj7… */
export function printableSuffix(suffix: string): string {
  if (suffix === "major") return "";
  if (suffix === "minor") return "m";
  return suffix;
}

/** Parte del name_es que corresponde a la cualidad ("Do mayor 7" → "mayor 7"). */
export function suffixEs(chord: Pick<ChordRow, "key" | "name_es">): string {
  return chord.name_es.slice(ROOT_SHORT_ES[chord.key].length).trim();
}
