/**
 * Tonalidad probable de una canción a partir de sus acordes escritos (sin
 * transponer por cejilla). Se puntúan las 24 tonalidades por cuántos acordes
 * encajan en su armonía diatónica y se desempata por la tónica: Sol mayor y
 * Mi menor comparten acordes, pero la canción suele empezar o terminar en el
 * suyo.
 */

import { parseChordPro, lineRepeat } from "./chordpro";
import { parseChordQuery } from "./chord-search";
import { DB_KEYS } from "./chords";

type Family = "major" | "minor" | "dim" | "aug" | "neutral";

/* Grados de cada modo (semitonos sobre la tónica) → cualidades que encajan. */
const MAJOR_KEY: Record<number, Family[]> = {
  0: ["major"],
  2: ["minor"],
  4: ["minor"],
  5: ["major"],
  7: ["major"],
  9: ["minor"],
  11: ["dim"],
};
/* Menor natural + V mayor (armónica): E en La menor. */
const MINOR_KEY: Record<number, Family[]> = {
  0: ["minor"],
  2: ["dim"],
  3: ["major"],
  5: ["minor"],
  7: ["minor", "major"],
  8: ["major"],
  10: ["major"],
};

const DIM = new Set(["dim", "dim7", "m7b5", "m9b5", "mmaj7b5"]);
const AUG = new Set(["aug", "aug7", "aug9", "maj7#5"]);
const NEUTRAL = new Set(["sus2", "sus4", "7sus4"]);

function family(suffix: string): Family {
  if (DIM.has(suffix)) return "dim";
  if (AUG.has(suffix)) return "aug";
  if (NEUTRAL.has(suffix)) return "neutral";
  if (suffix === "minor" || (suffix.startsWith("m") && !suffix.startsWith("maj"))) {
    return "minor";
  }
  return "major";
}

type Chord = { pc: number; family: Family };

/** "D/F#" → D; "Sib", "A#m7"… → raíz y familia, o null si no se reconoce. */
function readChord(name: string): Chord | null {
  const parsed = parseChordQuery(name.split("/")[0]);
  if (parsed.kind !== "chord") return null;
  const pc = DB_KEYS.indexOf(parsed.keys[0] as (typeof DB_KEYS)[number]);
  if (pc < 0) return null;
  return { pc, family: family(parsed.suffixes?.[0] ?? "major") };
}

const fits = (chord: Chord, allowed: Family[] | undefined) =>
  allowed !== undefined && (chord.family === "neutral" || allowed.includes(chord.family));

export type DetectedKey = {
  /** Valor de KEY_OPTIONS ("G", "Em"). */
  key: string;
  /** Segunda opción si queda muy cerca (casi siempre la relativa). */
  alternative: string | null;
};

export function detectKey(content: string): DetectedKey | null {
  // Ocurrencias: cada acorde pesa 1; las líneas instrumentales, sus vueltas.
  const occurrences: { chord: Chord; weight: number }[] = [];
  for (const section of parseChordPro(content).sections) {
    for (const line of section.lines) {
      const weight = lineRepeat(line);
      for (const segment of line) {
        const chord = segment.chord ? readChord(segment.chord) : null;
        if (chord) occurrences.push({ chord, weight });
      }
    }
  }
  if (occurrences.length === 0) return null;

  const total = occurrences.reduce((sum, o) => sum + o.weight, 0);
  const first = occurrences[0].chord;
  const last = occurrences[occurrences.length - 1].chord;

  const scored = [false, true].flatMap((minor) =>
    Array.from({ length: 12 }, (_, tonic) => {
      const scale = minor ? MINOR_KEY : MAJOR_KEY;
      const tonicFamily: Family = minor ? "minor" : "major";
      const isTonic = (c: Chord) => c.pc === tonic && fits(c, [tonicFamily]);
      let fit = 0;
      let tonicWeight = 0;
      for (const { chord, weight } of occurrences) {
        if (fits(chord, scale[(chord.pc - tonic + 12) % 12])) fit += weight;
        if (isTonic(chord)) tonicWeight += weight;
      }
      const score =
        fit +
        0.5 * tonicWeight +
        (isTonic(first) ? 0.15 * total : 0) +
        (isTonic(last) ? 0.2 * total : 0);
      return { key: DB_KEYS[tonic] + (minor ? "m" : ""), score };
    }),
  );
  scored.sort((a, b) => b.score - a.score);

  const [best, second] = scored;
  return {
    key: best.key,
    alternative: second.score >= best.score * 0.85 ? second.key : null,
  };
}
