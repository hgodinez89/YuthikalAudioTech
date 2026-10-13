import { describe, expect, it } from "vitest";
import {
  fingering,
  keyboardRange,
  noteName,
  pianoIntervalLabels,
  pianoNoteNames,
  pianoChord,
  pianoChordFromName,
  pianoInversions,
  PIANO_EXCLUDED_SUFFIXES,
  PIANO_SUFFIXES,
  PIANO_VOICINGS,
} from "./piano";

const names = (notes: number[], flats = false) =>
  notes.map((n) => noteName(n, "en", flats));

describe("pianoChord / notas", () => {
  it("C mayor, Am7, B♭maj7, F♯dim", () => {
    const c = pianoChord("C", "major")!;
    expect(names(pianoInversions(c)[0].notes)).toEqual(["C", "E", "G"]);

    const am7 = pianoChordFromName("Am7")!;
    expect(names(pianoInversions(am7)[0].notes)).toEqual(["A", "C", "E", "G"]);

    const bb = pianoChordFromName("Bbmaj7")!;
    expect(bb.flats).toBe(true);
    expect(names(pianoInversions(bb)[0].notes, true)).toEqual(["B♭", "D", "F", "A"]);

    const fsdim = pianoChordFromName("F#dim")!;
    expect(names(pianoInversions(fsdim)[0].notes)).toEqual(["F♯", "A", "C"]);
  });

  it("nombres en español", () => {
    expect(noteName(61, "es")).toBe("Do♯");
    expect(noteName(61, "es", true)).toBe("Re♭");
  });

  it("acorde desconocido o excluido → null", () => {
    expect(pianoChord("C", "7sg")).toBeNull();
    expect(pianoChordFromName("hola mundo")).toBeNull();
  });

  it("los voicings prácticos dicen qué omiten", () => {
    expect(pianoChord("C", "9")!.omitted).toEqual(["5"]);
    expect(pianoChord("C", "major")!.omitted).toEqual([]);
  });
});

describe("pianoInversions", () => {
  it("C mayor: fundamental, 1.ª y 2.ª inversión", () => {
    const inv = pianoInversions(pianoChord("C", "major")!);
    expect(inv.map((v) => names(v.notes))).toEqual([
      ["C", "E", "G"],
      ["E", "G", "C"],
      ["G", "C", "E"],
    ]);
    // la nota más grave siempre en la octava del Do central (C4 = 60)
    for (const v of inv) {
      expect(v.notes[0]).toBeGreaterThanOrEqual(60);
      expect(v.notes[0]).toBeLessThan(72);
    }
  });

  it("una cuatríada tiene 4 inversiones", () => {
    expect(pianoInversions(pianoChord("C", "maj7")!)).toHaveLength(4);
  });

  it("todas las notas quedan ascendentes", () => {
    for (const suffix of PIANO_SUFFIXES) {
      for (const v of pianoInversions(pianoChord("A", suffix)!)) {
        expect([...v.notes].sort((a, b) => a - b)).toEqual(v.notes);
      }
    }
  });
});

describe("keyboardRange", () => {
  it("mínimo 2 octavas desde el Do de la nota más grave", () => {
    expect(keyboardRange([60, 64, 67])).toEqual({ start: 60, octaves: 2 });
    expect(keyboardRange([67, 72, 76])).toEqual({ start: 60, octaves: 2 });
  });

  it("3 octavas si la nota más aguda no cabe", () => {
    expect(keyboardRange([64, 70, 81, 88])).toEqual({ start: 60, octaves: 3 });
  });
});

describe("fingering", () => {
  it("tríadas, mano derecha e izquierda", () => {
    expect([0, 1, 2].map((k) => fingering(3, k, "right"))).toEqual([
      [1, 3, 5],
      [1, 2, 5],
      [1, 3, 5],
    ]);
    expect([0, 1, 2].map((k) => fingering(3, k, "left"))).toEqual([
      [5, 3, 1],
      [5, 3, 1],
      [5, 2, 1],
    ]);
  });

  it("todo voicing tiene un dedo por nota en cada inversión", () => {
    for (const suffix of PIANO_SUFFIXES) {
      const n = PIANO_VOICINGS[suffix].intervals.length;
      for (let k = 0; k < n; k++) {
        expect(fingering(n, k, "right")).toHaveLength(n);
        expect(fingering(n, k, "left")).toHaveLength(n);
      }
    }
  });
});

/* Tipos del catálogo de guitarra (supabase/seed_chords_guitar.sql). */
const GUITAR_SUFFIXES = (
  "major minor dim dim7 sus2 sus4 7sus4 alt aug 6 69 7 7b5 7sg aug7 9 9b5 aug9 7b9 7#9 " +
  "11 9#11 13 maj7 maj7b5 maj7#5 maj9 maj11 maj13 m6 m7 m7b5 m9 m69 m11 mmaj7 mmaj7b5 " +
  "mmaj9 mmaj11 add9 madd9"
).split(" ");

describe("cobertura del catálogo", () => {
  it("todo tipo del catálogo tiene voicing de piano o está excluido", () => {
    const missing = GUITAR_SUFFIXES.filter(
      (s) => !PIANO_SUFFIXES.includes(s) && !PIANO_EXCLUDED_SUFFIXES.includes(s),
    );
    expect(missing).toEqual([]);
  });
});

describe("ortografía e intervalos", () => {
  it("C9 se escribe con B♭ y sus intervalos son los del voicing", () => {
    const c9 = pianoChord("C", "9")!;
    expect(pianoNoteNames(c9, "en")).toEqual(["C", "E", "B♭", "D"]);
    expect(pianoIntervalLabels(c9)).toEqual(["1", "3", "♭7", "9"]);
  });

  it("Cm lleva E♭; Caug lleva G♯; Cdim7 lleva ♭♭7", () => {
    expect(pianoNoteNames(pianoChord("C", "minor")!, "en")).toEqual(["C", "E♭", "G"]);
    expect(pianoNoteNames(pianoChord("C", "aug")!, "en")).toEqual(["C", "E", "G♯"]);
    expect(pianoIntervalLabels(pianoChord("C", "dim7")!)).toEqual([
      "1",
      "♭3",
      "♭5",
      "♭♭7",
    ]);
  });

  it("A mayor con sostenido; B♭ mayor con bemoles", () => {
    expect(pianoNoteNames(pianoChord("A", "major")!, "en")).toEqual(["A", "C♯", "E"]);
    expect(pianoNoteNames(pianoChord("Bb", "major")!, "es")).toEqual(["Si♭", "Re", "Fa"]);
  });
});
