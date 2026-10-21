import type { SheetChordData } from "@/components/chord-sheet";
import { isFretted, isInstrument, type Instrument } from "./instruments";

/*
 * Biblioteca personal de acordes (tabla `custom_chords`). La validación es
 * compartida: el constructor la usa en el navegador y las server actions la
 * repiten en el servidor, con las mismas reglas que los checks de la base.
 */

export const MAX_CHORD_NAME = 24;
/** Trastes visibles en el constructor (y en el diagrama). */
export const FRET_WINDOW = 5;
export const MAX_BASE_FRET = 20;
export const PIANO_MIN_KEYS = 3;
export const PIANO_MAX_KEYS = 6;
/* Rango de un piano de 88 teclas (La0–Do8). */
const MIDI_MIN = 21;
const MIDI_MAX = 108;

export type CustomChordInput = {
  instrument: Instrument;
  name: string;
  /** Guitarra/ukelele: traste real donde empieza la ventana de 5. */
  baseFret: number;
  /** De la cuerda más grave a la 1ª: -1 muteada, 0 al aire, 1–5 relativo a baseFret. */
  frets: number[];
  /** Trastes (relativos) con cejilla. */
  barres: number[];
  /** Piano: teclas MIDI. */
  keys: number[];
};

export type CustomChordRow = {
  id: string;
  instrument: Instrument;
  name: string;
  base_fret: number;
  frets: number[];
  barres: number[];
  keys: number[];
};

export type CustomChordError =
  "instrument" | "name" | "baseFret" | "frets" | "barres" | "keys";

export function stringCount(instrument: "guitar" | "ukulele"): number {
  return instrument === "guitar" ? 6 : 4;
}

/** El nombre como va en el cifrado: sin espacios, de 1 a 24 caracteres. */
export function normalizeChordName(name: string): string {
  return name.trim();
}

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

/** Primer problema del acorde, o null si es válido. */
export function validateCustomChord(input: CustomChordInput): CustomChordError | null {
  if (!isInstrument(input.instrument)) return "instrument";
  const name = normalizeChordName(input.name);
  if (!/^\S+$/.test(name) || [...name].length > MAX_CHORD_NAME) return "name";

  const { frets, barres, keys } = input;
  if (!Array.isArray(frets) || !Array.isArray(barres) || !Array.isArray(keys))
    return "frets";

  if (isFretted(input.instrument)) {
    if (keys.length) return "keys";
    if (!isInt(input.baseFret) || input.baseFret < 1 || input.baseFret > MAX_BASE_FRET) {
      return "baseFret";
    }
    if (frets.length !== stringCount(input.instrument)) return "frets";
    if (!frets.every((f) => isInt(f) && f >= -1 && f <= FRET_WINDOW)) return "frets";
    // Al menos una cuerda suena.
    if (frets.every((f) => f === -1)) return "frets";
    if (barres.length > 2 || new Set(barres).size !== barres.length) return "barres";
    // Una cejilla pisa al menos dos cuerdas en su traste.
    for (const b of barres) {
      if (!isInt(b) || b < 1 || b > FRET_WINDOW) return "barres";
      if (frets.filter((f) => f === b).length < 2) return "barres";
    }
    return null;
  }

  // Piano
  if (frets.length || barres.length) return "frets";
  if (keys.length < PIANO_MIN_KEYS || keys.length > PIANO_MAX_KEYS) return "keys";
  if (!keys.every((k) => isInt(k) && k >= MIDI_MIN && k <= MIDI_MAX)) return "keys";
  if (new Set(keys).size !== keys.length) return "keys";
  return null;
}

/** Notas MIDI que suenan (para "Escuchar"): cuerdas al aire + traste. */
export function soundingNotes(
  openStrings: readonly number[],
  frets: readonly number[],
  baseFret: number,
): number[] {
  const notes: number[] = [];
  frets.forEach((f, i) => {
    if (f < 0 || openStrings[i] === undefined) return;
    notes.push(openStrings[i] + (f === 0 ? 0 : baseFret - 1 + f));
  });
  return notes;
}

/** Diagrama de un acorde propio. */
export function customChordData(row: CustomChordRow, name = row.name): SheetChordData {
  return row.keys.length
    ? {
        name,
        nameEs: row.name,
        keys: row.keys,
        frets: [],
        barres: [],
        baseFret: 1,
        custom: true,
      }
    : {
        name,
        nameEs: row.name,
        frets: row.frets,
        barres: row.barres,
        baseFret: row.base_fret,
        custom: true,
      };
}
