/**
 * Acordes de piano calculados (no hay "posiciones" que guardar como en un
 * mástil): raíz + tipo → notas → inversiones → teclas, nombres y dedos.
 * La identidad del acorde (nombre, categoría, búsqueda) sale del catálogo de
 * guitarra; aquí solo se define cómo se toca en un teclado.
 */

import { DB_KEYS } from "./chords";
import { parseChordQuery } from "./chord-search";

/** Grados que un voicing práctico puede omitir (para explicarlo en la UI). */
export type OmittedDegree = "3" | "5" | "7" | "9" | "11";

type Voicing = { intervals: number[]; omitted?: OmittedDegree[] };

/*
 * Voicing por tipo: semitonos sobre la raíz, ascendentes, máximo 4 notas
 * (una mano, digitación estándar). Los acordes extendidos usan la forma
 * práctica que tocan los pianistas e indican qué grado se omite.
 */
export const PIANO_VOICINGS: Record<string, Voicing> = {
  major: { intervals: [0, 4, 7] },
  minor: { intervals: [0, 3, 7] },
  dim: { intervals: [0, 3, 6] },
  aug: { intervals: [0, 4, 8] },
  sus2: { intervals: [0, 2, 7] },
  sus4: { intervals: [0, 5, 7] },
  alt: { intervals: [0, 4, 6] },
  dim7: { intervals: [0, 3, 6, 9] },
  "7sus4": { intervals: [0, 5, 7, 10] },
  6: { intervals: [0, 4, 7, 9] },
  m6: { intervals: [0, 3, 7, 9] },
  7: { intervals: [0, 4, 7, 10] },
  "7b5": { intervals: [0, 4, 6, 10] },
  aug7: { intervals: [0, 4, 8, 10] },
  maj7: { intervals: [0, 4, 7, 11] },
  maj7b5: { intervals: [0, 4, 6, 11] },
  "maj7#5": { intervals: [0, 4, 8, 11] },
  m7: { intervals: [0, 3, 7, 10] },
  m7b5: { intervals: [0, 3, 6, 10] },
  mmaj7: { intervals: [0, 3, 7, 11] },
  mmaj7b5: { intervals: [0, 3, 6, 11] },
  add9: { intervals: [0, 4, 7, 14] },
  madd9: { intervals: [0, 3, 7, 14] },
  69: { intervals: [0, 4, 9, 14], omitted: ["5"] },
  m69: { intervals: [0, 3, 9, 14], omitted: ["5"] },
  9: { intervals: [0, 4, 10, 14], omitted: ["5"] },
  m9: { intervals: [0, 3, 10, 14], omitted: ["5"] },
  maj9: { intervals: [0, 4, 11, 14], omitted: ["5"] },
  mmaj9: { intervals: [0, 3, 11, 14], omitted: ["5"] },
  "7b9": { intervals: [0, 4, 10, 13], omitted: ["5"] },
  "7#9": { intervals: [0, 4, 10, 15], omitted: ["5"] },
  "9b5": { intervals: [0, 6, 10, 14], omitted: ["3"] },
  aug9: { intervals: [0, 8, 10, 14], omitted: ["3"] },
  11: { intervals: [0, 4, 10, 17], omitted: ["5", "9"] },
  m11: { intervals: [0, 3, 10, 17], omitted: ["5", "9"] },
  maj11: { intervals: [0, 4, 11, 17], omitted: ["5", "9"] },
  mmaj11: { intervals: [0, 3, 11, 17], omitted: ["5", "9"] },
  "9#11": { intervals: [0, 4, 10, 18], omitted: ["5", "9"] },
  13: { intervals: [0, 4, 10, 21], omitted: ["5", "9", "11"] },
  maj13: { intervals: [0, 4, 11, 21], omitted: ["5", "9", "11"] },
};

/** Tipos del catálogo que tienen voicing de piano (excluye p. ej. `7sg`). */
export const PIANO_SUFFIXES = Object.keys(PIANO_VOICINGS);

/** Tipos del catálogo de guitarra que no se tocan en piano. */
export const PIANO_EXCLUDED_SUFFIXES = ["7sg"];

const ROOT_PC: Record<string, number> = Object.fromEntries(DB_KEYS.map((k, i) => [k, i]));

/* Tonalidades que se escriben con bemoles (mismo criterio que el catálogo). */
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab"]);

const NAMES = {
  es: {
    sharp: [
      "Do",
      "Do♯",
      "Re",
      "Re♯",
      "Mi",
      "Fa",
      "Fa♯",
      "Sol",
      "Sol♯",
      "La",
      "La♯",
      "Si",
    ],
    flat: ["Do", "Re♭", "Re", "Mi♭", "Mi", "Fa", "Sol♭", "Sol", "La♭", "La", "Si♭", "Si"],
  },
  en: {
    sharp: ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"],
    flat: ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"],
  },
} as const;

/** Nombre de una nota (MIDI o clase de altura) en la notación pedida. */
export function noteName(midi: number, lang: "es" | "en", flats = false): string {
  const pc = ((midi % 12) + 12) % 12;
  return NAMES[lang][flats ? "flat" : "sharp"][pc];
}

/** Octava científica: C4 = Do central = MIDI 60. */
export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export const isBlackKey = (midi: number) =>
  [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);

export type PianoChord = {
  key: string;
  suffix: string;
  rootPc: number;
  intervals: number[];
  omitted: OmittedDegree[];
  /** Escribir las notas con bemoles (F, B♭, E♭, A♭). */
  flats: boolean;
};

export function pianoChord(key: string, suffix: string): PianoChord | null {
  const voicing = PIANO_VOICINGS[suffix];
  const rootPc = ROOT_PC[key];
  if (!voicing || rootPc === undefined) return null;
  return {
    key,
    suffix,
    rootPc,
    intervals: voicing.intervals,
    omitted: voicing.omitted ?? [],
    flats: FLAT_KEYS.has(key),
  };
}

/** Acorde de piano a partir de un nombre de cifrado ("Am7", "Sib", "F#dim"). */
export function pianoChordFromName(name: string): PianoChord | null {
  const parsed = parseChordQuery(name);
  if (parsed.kind !== "chord") return null;
  return pianoChord(parsed.keys[0], parsed.suffixes?.[0] ?? "major");
}

/** Do central: la nota más grave de cada voicing cae en esta octava. */
const BASE_C = 60;

export type PianoVoicing = {
  /** 0 = posición fundamental, 1 = 1.ª inversión… */
  inversion: number;
  /** Notas MIDI ascendentes. */
  notes: number[];
};

/**
 * Inversiones: la k-ésima sube sus k notas más graves una octava. Cada
 * voicing se coloca con su nota más grave en la octava del Do central.
 */
export function pianoInversions(chord: PianoChord): PianoVoicing[] {
  const base = chord.intervals;
  return base.map((_, k) => {
    const raised = base.map((iv, i) => (i < k ? iv + 12 : iv)).sort((a, b) => a - b);
    const lowestPc = (chord.rootPc + raised[0]) % 12;
    const shift = BASE_C + lowestPc - (chord.rootPc + raised[0]);
    return { inversion: k, notes: raised.map((iv) => chord.rootPc + iv + shift) };
  });
}

/**
 * Rango de teclado a dibujar: desde el Do de la octava de la nota más grave,
 * en octavas completas (mínimo 2) hasta cubrir la más aguda.
 */
export function keyboardRange(notes: number[]): { start: number; octaves: number } {
  const start = Math.floor(Math.min(...notes) / 12) * 12;
  const span = Math.max(...notes) - start + 1;
  return { start, octaves: Math.max(2, Math.ceil(span / 12)) };
}

export type Hand = "right" | "left";

/* Digitación estándar de los métodos, por número de notas e inversión. */
const FINGERING: Record<Hand, Record<number, number[][]>> = {
  right: {
    3: [
      [1, 3, 5],
      [1, 2, 5],
      [1, 3, 5],
    ],
    4: [
      [1, 2, 3, 5],
      [1, 2, 3, 5],
      [1, 2, 4, 5],
      [1, 2, 4, 5],
    ],
  },
  left: {
    3: [
      [5, 3, 1],
      [5, 3, 1],
      [5, 2, 1],
    ],
    4: [
      [5, 3, 2, 1],
      [5, 4, 2, 1],
      [5, 3, 2, 1],
      [5, 3, 2, 1],
    ],
  },
};

/** Dedos (1 = pulgar … 5 = meñique) para cada nota, de grave a agudo. */
export function fingering(noteCount: number, inversion: number, hand: Hand): number[] {
  return FINGERING[hand][noteCount]?.[inversion] ?? [];
}

/** Teclas en posición fundamental (para tarjetas, canciones y karaoke). */
export function pianoRootKeys(key: string, suffix: string): number[] | undefined {
  const chord = pianoChord(key, suffix);
  return chord ? pianoInversions(chord)[0].notes : undefined;
}

/* Nombre de cada intervalo (en semitonos sobre la raíz) dentro de un acorde. */
const INTERVAL_LABELS: Record<number, string> = {
  0: "1",
  1: "♭9",
  2: "2",
  3: "♭3",
  4: "3",
  5: "4",
  6: "♭5",
  7: "5",
  8: "♯5",
  9: "6",
  10: "♭7",
  11: "7",
  13: "♭9",
  14: "9",
  15: "♯9",
  17: "11",
  18: "♯11",
  21: "13",
};

/** Intervalos del voicing ("1 · 3 · ♭7 · 9"), como se tocan en el teclado. */
export function pianoIntervalLabels(chord: PianoChord): string[] {
  return chord.intervals.map((iv) =>
    // la 7.ª disminuida (9 semitonos) se escribe ♭♭7, no 6
    chord.suffix === "dim7" && iv === 9 ? "♭♭7" : (INTERVAL_LABELS[iv] ?? String(iv)),
  );
}

/**
 * Notas que se escriben con bemol: las de intervalo ♭ (♭3, ♭7, ♭9…) y, en
 * tonalidades con bemoles (F, B♭, E♭, A♭), también las naturales. Las de
 * intervalo ♯ (♯5, ♯9, ♯11) van siempre con sostenido. Así C9 lleva B♭, no A♯.
 */
export function flatSpelledNotes(chord: PianoChord, notes: number[]): number[] {
  const labels = pianoIntervalLabels(chord);
  const labelByPc = new Map(
    chord.intervals.map((iv, i) => [(chord.rootPc + iv) % 12, labels[i]]),
  );
  return notes.filter((midi) => {
    const label = labelByPc.get(((midi % 12) + 12) % 12) ?? "";
    if (label.includes("♭")) return true;
    if (label.includes("♯")) return false;
    return chord.flats;
  });
}

/** Nombres de las notas del voicing en posición fundamental, bien escritos. */
export function pianoNoteNames(chord: PianoChord, lang: "es" | "en"): string[] {
  const notes = pianoInversions(chord)[0].notes;
  const flat = new Set(flatSpelledNotes(chord, notes));
  return notes.map((n) => noteName(n, lang, flat.has(n)));
}
