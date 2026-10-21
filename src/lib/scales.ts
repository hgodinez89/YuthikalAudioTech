/**
 * Escalas calculadas (no hay nada que guardar en la BD): tónica + fórmula de
 * grados → notas bien escritas → mástil, posiciones, teclado y acordes.
 */

import { DB_KEYS, printableSuffix } from "./chords";
import { chordSlug } from "./chord-search";

export const SCALE_CATEGORIES = ["basic", "pentatonic", "minor", "modes"] as const;
export type ScaleCategory = (typeof SCALE_CATEGORIES)[number];

/*
 * Cada escala se define por sus grados respecto a la escala mayor ("b3" =
 * tercera menor). De ahí salen los semitonos y la letra de cada nota.
 */
export const SCALES = [
  { id: "major", category: "basic", degrees: ["1", "2", "3", "4", "5", "6", "7"] },
  { id: "minor", category: "basic", degrees: ["1", "2", "b3", "4", "5", "b6", "b7"] },
  { id: "pentatonic-major", category: "pentatonic", degrees: ["1", "2", "3", "5", "6"] },
  {
    id: "pentatonic-minor",
    category: "pentatonic",
    degrees: ["1", "b3", "4", "5", "b7"],
  },
  { id: "blues", category: "pentatonic", degrees: ["1", "b3", "4", "b5", "5", "b7"] },
  {
    id: "harmonic-minor",
    category: "minor",
    degrees: ["1", "2", "b3", "4", "5", "b6", "7"],
  },
  {
    id: "melodic-minor",
    category: "minor",
    degrees: ["1", "2", "b3", "4", "5", "6", "7"],
  },
  { id: "dorian", category: "modes", degrees: ["1", "2", "b3", "4", "5", "6", "b7"] },
  { id: "phrygian", category: "modes", degrees: ["1", "b2", "b3", "4", "5", "b6", "b7"] },
  { id: "lydian", category: "modes", degrees: ["1", "2", "3", "#4", "5", "6", "7"] },
  { id: "mixolydian", category: "modes", degrees: ["1", "2", "3", "4", "5", "6", "b7"] },
  { id: "locrian", category: "modes", degrees: ["1", "b2", "b3", "4", "b5", "b6", "b7"] },
] as const satisfies readonly {
  id: string;
  category: ScaleCategory;
  degrees: string[];
}[];

export type ScaleId = (typeof SCALES)[number]["id"];
export type DbKey = (typeof DB_KEYS)[number];

const LETTERS_EN = ["C", "D", "E", "F", "G", "A", "B"];
const LETTERS_ES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
/* Semitonos de cada grado natural (escala mayor). */
const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];

/* Escrituras posibles de cada tónica: [letra, alteración]. */
const ROOT_SPELLINGS: Record<DbKey, [number, number][]> = {
  C: [[0, 0]],
  "C#": [
    [0, 1],
    [1, -1],
  ],
  D: [[1, 0]],
  Eb: [
    [2, -1],
    [1, 1],
  ],
  E: [[2, 0]],
  F: [[3, 0]],
  "F#": [
    [3, 1],
    [4, -1],
  ],
  G: [[4, 0]],
  Ab: [
    [5, -1],
    [4, 1],
  ],
  A: [[5, 0]],
  Bb: [
    [6, -1],
    [5, 1],
  ],
  B: [[6, 0]],
};

const ACCIDENTAL: Record<number, string> = {
  [-2]: "♭♭",
  [-1]: "♭",
  0: "",
  1: "♯",
  2: "♯♯",
};

export type ScaleNote = {
  /** Clase de altura (0 = Do). */
  pc: number;
  /** Semitonos sobre la tónica (0…11). */
  semis: number;
  /** Grado tal como se lee: "1", "♭3", "♯4". */
  degree: string;
  es: string;
  en: string;
};

export type Scale = {
  key: DbKey;
  id: ScaleId;
  category: ScaleCategory;
  rootPc: number;
  notes: ScaleNote[];
};

function parseDegree(d: string): { num: number; acc: number } {
  const acc = d.startsWith("b") ? -1 : d.startsWith("#") ? 1 : 0;
  return { num: Number(acc ? d.slice(1) : d), acc };
}

const prettyDegree = (d: string) => d.replace("b", "♭").replace("#", "♯");

function spell(
  rootLetter: number,
  rootPc: number,
  degrees: readonly string[],
): { notes: ScaleNote[]; score: number } {
  let score = 0;
  const notes = degrees.map((d) => {
    const { num, acc } = parseDegree(d);
    const semis = (MAJOR_SEMIS[num - 1] + acc + 12) % 12;
    const pc = (rootPc + semis) % 12;
    const letter = (rootLetter + num - 1) % 7;
    // alteración necesaria sobre la letra natural, en el rango −6…5
    const a = ((pc - LETTER_PC[letter] + 18) % 12) - 6;
    score += Math.abs(a) > 1 ? 10 : Math.abs(a);
    const sign = ACCIDENTAL[a] ?? "?";
    return {
      pc,
      semis,
      degree: prettyDegree(d),
      es: LETTERS_ES[letter] + sign,
      en: LETTERS_EN[letter] + sign,
    };
  });
  return { notes, score };
}

export function isScaleId(value: string): value is ScaleId {
  return SCALES.some((s) => s.id === value);
}

/**
 * Notas de la escala, bien escritas: cada grado usa su letra (Fa mayor lleva
 * Si♭, no La♯). En las tónicas negras se elige la escritura con menos
 * alteraciones y sin dobles (Re♭ mayor, pero Do♯ menor).
 */
export function scaleNotes(key: DbKey, id: ScaleId): Scale {
  const def = SCALES.find((s) => s.id === id)!;
  const rootPc = DB_KEYS.indexOf(key);
  const options = ROOT_SPELLINGS[key].map(([letter]) =>
    spell(letter, rootPc, def.degrees),
  );
  const best = options.reduce((a, b) => (b.score < a.score ? b : a));
  return { key, id, category: def.category, rootPc, notes: best.notes };
}

/** Distancias entre notas consecutivas (en semitonos), cerrando en la octava. */
export function scaleSteps(scale: Scale): number[] {
  const semis = scale.notes.map((n) => n.semis);
  return semis.map((s, i) => (i + 1 < semis.length ? semis[i + 1] : 12) - s);
}

/* ---------- slugs: "a-pentatonic-minor", "csharp-major", "eb-dorian" ---------- */

const keySlug = (key: string) => key.toLowerCase().replace("#", "sharp");

export function scaleSlug(key: DbKey, id: ScaleId): string {
  return `${keySlug(key)}-${id}`;
}

export function parseScaleSlug(slug: string): { key: DbKey; id: ScaleId } | null {
  const m = slug.match(/^([a-g](?:sharp|b)?)-(.+)$/);
  if (!m) return null;
  const key = DB_KEYS.find((k) => keySlug(k) === m[1]);
  if (!key || !isScaleId(m[2])) return null;
  return { key, id: m[2] };
}

/* ---------- mástil ---------- */

export type FretNote = {
  /** Índice de la cuerda (0 = 1.ª, la más aguda en la ilustración). */
  string: number;
  fret: number;
  midi: number;
  /** Índice de la nota dentro de la escala (0 = tónica). */
  note: number;
};

/** Todas las notas de la escala sobre el mástil, del traste 0 al `maxFret`. */
export function fretboardNotes(tuning: number[], scale: Scale, maxFret = 12): FretNote[] {
  const byPc = new Map(scale.notes.map((n, i) => [n.pc, i]));
  const out: FretNote[] = [];
  tuning.forEach((open, string) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      const note = byPc.get((open + fret) % 12);
      if (note !== undefined) out.push({ string, fret, midi: open + fret, note });
    }
  });
  return out;
}

export type ScalePosition = {
  /** Primer y último traste de la ventana. */
  from: number;
  to: number;
  notes: (FretNote & { finger: number })[];
};

/** Ancho de una posición: un dedo por traste. */
const POSITION_FRETS = 4;

/**
 * Posiciones para practicar por zonas: una por cada nota de la escala en la
 * cuerda de referencia (la última de la afinación, la de abajo en el
 * diagrama), con una ventana de 4 trastes y un dedo por traste (0 = al aire).
 * La primera empieza en la tónica.
 */
export function scalePositions(tuning: number[], scale: Scale): ScalePosition[] {
  const ref = tuning.length - 1;
  const all = fretboardNotes(tuning, scale, 11 + POSITION_FRETS);
  const starts = all
    .filter((n) => n.string === ref && n.fret <= 11)
    .sort((a, b) => a.fret - b.fret);
  const tonic = starts.findIndex((n) => n.note === 0);
  const ordered = [...starts.slice(tonic), ...starts.slice(0, tonic)];

  return ordered.map(({ fret: from }) => {
    const to = from + POSITION_FRETS - 1;
    const notes = all
      .filter((n) => n.fret >= from && n.fret <= to)
      .map((n) => ({ ...n, finger: n.fret === 0 ? 0 : n.fret - Math.max(from, 1) + 1 }));
    return { from, to, notes };
  });
}

/* ---------- acordes de la escala ---------- */

export type ScaleChordQuality = "major" | "minor" | "dim" | "aug";

export type ScaleChord = {
  /** Grado romano: I, ii, ♭III, vii°… */
  roman: string;
  quality: ScaleChordQuality;
  /** Nombre bien escrito ("B♭", "Sol♯m"). */
  nameEn: string;
  nameEs: string;
  /** Nombre en cifrado ASCII del catálogo ("Bb", "Abm") para cargar su diagrama. */
  catalogName: string;
  /** Id del acorde en el catálogo ("bb-major"). */
  slug: string;
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

const QUALITY: Record<string, ScaleChordQuality> = {
  "4,7": "major",
  "3,7": "minor",
  "3,6": "dim",
  "4,8": "aug",
};

const QUALITY_TEXT: Record<ScaleChordQuality, { name: string; roman: string }> = {
  major: { name: "", roman: "" },
  minor: { name: "m", roman: "" },
  dim: { name: "dim", roman: "°" },
  aug: { name: "aug", roman: "+" },
};

/**
 * Tríadas que se forman con las notas de la escala (terceras apiladas).
 * Solo en escalas de 7 notas; en pentatónicas y blues no aplica.
 */
export function scaleChords(scale: Scale): ScaleChord[] {
  const n = scale.notes;
  if (n.length !== 7) return [];
  return n.flatMap((root, i) => {
    const third = (n[(i + 2) % 7].semis - root.semis + 12) % 12;
    const fifth = (n[(i + 4) % 7].semis - root.semis + 12) % 12;
    const quality = QUALITY[`${third},${fifth}`];
    if (!quality) return [];
    const suffix = quality === "minor" ? "minor" : quality;
    const base = ROMAN[i];
    const accidental = root.degree.replace(/\d/g, "");
    const roman =
      accidental +
      (quality === "major" || quality === "aug" ? base : base.toLowerCase()) +
      QUALITY_TEXT[quality].roman;
    const dbKey = DB_KEYS[root.pc];
    return [
      {
        roman,
        quality,
        nameEn: root.en + QUALITY_TEXT[quality].name,
        nameEs: root.es + QUALITY_TEXT[quality].name,
        catalogName: dbKey + printableSuffix(suffix),
        slug: chordSlug(dbKey, suffix),
      },
    ];
  });
}
