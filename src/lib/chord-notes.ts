import { DB_KEYS } from "./chords";
import { isFretted, TUNINGS, type Instrument } from "./instruments";
import { chordSpeller } from "./piano";

/**
 * Nombres de las notas dentro de los diagramas de acordes: bajo cada tecla
 * del piano o bajo cada cuerda de la guitarra y el ukelele.
 */

/** Nombre bajo una tecla o cuerda: `sub` es el otro idioma (fichas). */
export type NoteLabel = { main: string; sub?: string; root: boolean };

/**
 * Altura (MIDI) que suena en cada cuerda, en el orden de `frets` (de la más
 * grave a la 1ª, como chords-db); null en las que no se tocan. Los trastes
 * pisados son relativos a `baseFret` (1 = el traste inicial de la ventana).
 */
export function stringPitches(
  instrument: "guitar" | "ukulele",
  frets: number[],
  baseFret = 1,
): (number | null)[] {
  const open = TUNINGS[instrument].map((s) => s.midi).reverse();
  return frets.map((f, i) => (f < 0 ? null : open[i] + (f === 0 ? 0 : f + baseFret - 1)));
}

/**
 * Nombre de la nota de cada tecla (piano, en el orden de `keys`) o de cada
 * cuerda (null si no suena), en `lang` y, con `both`, también en el otro.
 */
export function chordNoteLabels(
  instrument: Instrument,
  chord: {
    key: string;
    suffix: string;
    keys?: number[];
    frets?: number[];
    baseFret?: number;
  },
  lang: "es" | "en",
  both = false,
): (NoteLabel | null)[] {
  const spell = chordSpeller(chord.key, chord.suffix);
  const other = lang === "es" ? "en" : "es";
  const rootPc = (DB_KEYS as readonly string[]).indexOf(chord.key);
  const pitches = isFretted(instrument)
    ? stringPitches(instrument, chord.frets ?? [], chord.baseFret)
    : (chord.keys ?? []);
  return pitches.map((midi) =>
    midi === null
      ? null
      : {
          main: spell(midi, lang),
          sub: both ? spell(midi, other) : undefined,
          root: midi % 12 === rootPc,
        },
  );
}

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Clase de altura de una nota en cifrado ("C", "A#", "Eb", "B♭"). */
export function pitchClass(name: string): number {
  let pc = LETTER_PC[name[0]] ?? 0;
  for (const ch of name.slice(1)) {
    if (ch === "#" || ch === "♯") pc++;
    else if (ch === "b" || ch === "♭") pc--;
  }
  return (pc + 12) % 12;
}

/**
 * Fila de cada nombre bajo un diagrama, en orden de x creciente: va en la
 * primera fila donde no se encima con el anterior (con letras casi siempre
 * la 0; con solfeo, dos cuerdas o teclas muy juntas bajan a la siguiente).
 */
export function stackLabels(items: { x: number; width: number }[], gap = 2): number[] {
  const ends: number[] = [];
  return items.map(({ x, width }) => {
    let row = 0;
    while (ends[row] !== undefined && x - width / 2 < ends[row] + gap) row++;
    ends[row] = x + width / 2;
    return row;
  });
}

/** Ancho aproximado de un nombre en el diagrama (Inter en negrita). */
export const labelWidth = (text: string, fontSize: number) =>
  text.length * fontSize * 0.62;
