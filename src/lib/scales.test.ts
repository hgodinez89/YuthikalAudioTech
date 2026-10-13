import { describe, expect, it } from "vitest";
import { DB_KEYS } from "./chords";
import { TUNINGS } from "./instruments";
import {
  fretboardNotes,
  parseScaleSlug,
  scaleChords,
  scaleNotes,
  scalePositions,
  scaleSlug,
  scaleSteps,
  SCALES,
} from "./scales";

const GUITAR = TUNINGS.guitar.map((s) => s.midi);
const UKULELE = TUNINGS.ukulele.map((s) => s.midi);

const en = (key: (typeof DB_KEYS)[number], id: Parameters<typeof scaleNotes>[1]) =>
  scaleNotes(key, id).notes.map((n) => n.en);

describe("scaleNotes", () => {
  it("Do mayor", () => {
    expect(en("C", "major")).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(scaleNotes("C", "major").notes.map((n) => n.es)).toEqual([
      "Do",
      "Re",
      "Mi",
      "Fa",
      "Sol",
      "La",
      "Si",
    ]);
  });

  it("Fa mayor lleva Si♭, no La♯", () => {
    expect(en("F", "major")).toEqual(["F", "G", "A", "B♭", "C", "D", "E"]);
  });

  it("tónica negra: Re♭ mayor en lugar de Do♯ mayor, pero Do♯ menor", () => {
    expect(en("C#", "major")).toEqual(["D♭", "E♭", "F", "G♭", "A♭", "B♭", "C"]);
    expect(en("C#", "minor")).toEqual(["C♯", "D♯", "E", "F♯", "G♯", "A", "B"]);
  });

  it("Si lidio lleva Mi♯ y Do♯ menor armónica lleva Si♯", () => {
    expect(en("B", "lydian")).toEqual(["B", "C♯", "D♯", "E♯", "F♯", "G♯", "A♯"]);
    expect(en("C#", "harmonic-minor")).toEqual(["C♯", "D♯", "E", "F♯", "G♯", "A", "B♯"]);
  });

  it("Fa♯ lidio se escribe Sol♭ lidio (5 bemoles en vez de 7 sostenidos)", () => {
    expect(en("F#", "lydian")).toEqual(["G♭", "A♭", "B♭", "C", "D♭", "E♭", "F"]);
  });

  it("La blues con su ♭5 (Mi♭)", () => {
    expect(en("A", "blues")).toEqual(["A", "C", "D", "E♭", "E", "G"]);
    expect(scaleNotes("A", "blues").notes.map((n) => n.degree)).toEqual([
      "1",
      "♭3",
      "4",
      "♭5",
      "5",
      "♭7",
    ]);
  });

  it("ninguna combinación queda sin escribir", () => {
    for (const key of DB_KEYS)
      for (const { id } of SCALES)
        for (const n of scaleNotes(key, id).notes) expect(n.en).not.toContain("?");
  });
});

describe("scaleSteps", () => {
  it("fórmulas", () => {
    expect(scaleSteps(scaleNotes("C", "major"))).toEqual([2, 2, 1, 2, 2, 2, 1]);
    expect(scaleSteps(scaleNotes("A", "harmonic-minor"))).toEqual([2, 1, 2, 2, 1, 3, 1]);
    expect(scaleSteps(scaleNotes("A", "pentatonic-minor"))).toEqual([3, 2, 2, 3, 2]);
  });

  it("toda escala suma una octava", () => {
    for (const { id } of SCALES)
      expect(scaleSteps(scaleNotes("C", id)).reduce((a, b) => a + b)).toBe(12);
  });
});

describe("slugs", () => {
  it("ida y vuelta para todas las escalas", () => {
    for (const key of DB_KEYS)
      for (const { id } of SCALES)
        expect(parseScaleSlug(scaleSlug(key, id))).toEqual({ key, id });
  });

  it("formato y slugs inválidos", () => {
    expect(scaleSlug("C#", "dorian")).toBe("csharp-dorian");
    expect(parseScaleSlug("bb-major")).toEqual({ key: "Bb", id: "major" });
    expect(parseScaleSlug("b-major")).toEqual({ key: "B", id: "major" });
    expect(parseScaleSlug("h-major")).toBeNull();
    expect(parseScaleSlug("c-unknown")).toBeNull();
  });
});

describe("fretboardNotes", () => {
  it("Mi menor pentatónica en las cuerdas al aire de la guitarra", () => {
    const open = fretboardNotes(GUITAR, scaleNotes("E", "pentatonic-minor"), 0);
    // E B G D A E: todas están en la escala (E G A B D)
    expect(open.map((n) => n.string)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(open.filter((n) => n.note === 0).map((n) => n.string)).toEqual([0, 5]);
  });
});

describe("scalePositions", () => {
  it("La menor pentatónica: 5 posiciones, la 1.ª es la caja de los trastes 5–8", () => {
    const positions = scalePositions(GUITAR, scaleNotes("A", "pentatonic-minor"));
    expect(positions).toHaveLength(5);
    expect(positions[0]).toMatchObject({ from: 5, to: 8 });
    const lowE = positions[0].notes.filter((n) => n.string === 5);
    expect(lowE.map((n) => [n.fret, n.finger])).toEqual([
      [5, 1],
      [8, 4],
    ]);
  });

  it("cada posición contiene todas las notas de la escala (guitarra y ukelele)", () => {
    for (const tuning of [GUITAR, UKULELE])
      for (const key of DB_KEYS)
        for (const { id } of SCALES) {
          const scale = scaleNotes(key, id);
          const positions = scalePositions(tuning, scale);
          expect(positions).toHaveLength(scale.notes.length);
          for (const p of positions)
            expect(new Set(p.notes.map((n) => n.note)).size).toBe(scale.notes.length);
        }
  });

  it("en la posición abierta el traste 0 es cuerda al aire", () => {
    const open = scalePositions(GUITAR, scaleNotes("E", "pentatonic-minor"))[0];
    expect(open.from).toBe(0);
    expect(open.notes.filter((n) => n.fret === 0).every((n) => n.finger === 0)).toBe(
      true,
    );
    expect(open.notes.find((n) => n.fret === 3)?.finger).toBe(3);
  });
});

describe("scaleChords", () => {
  it("Do mayor", () => {
    const chords = scaleChords(scaleNotes("C", "major"));
    expect(chords.map((c) => c.nameEn)).toEqual([
      "C",
      "Dm",
      "Em",
      "F",
      "G",
      "Am",
      "Bdim",
    ]);
    expect(chords.map((c) => c.roman)).toEqual([
      "I",
      "ii",
      "iii",
      "IV",
      "V",
      "vi",
      "vii°",
    ]);
    expect(chords[6].slug).toBe("b-dim");
  });

  it("Fa mayor escribe B♭ y apunta al catálogo", () => {
    const iv = scaleChords(scaleNotes("F", "major"))[3];
    expect(iv).toMatchObject({
      nameEn: "B♭",
      nameEs: "Si♭",
      catalogName: "Bb",
      slug: "bb-major",
    });
  });

  it("La menor armónica: III+ aumentado y V mayor", () => {
    const chords = scaleChords(scaleNotes("A", "harmonic-minor"));
    expect(chords[2]).toMatchObject({ roman: "♭III+", nameEn: "Caug", slug: "c-aug" });
    expect(chords[4]).toMatchObject({ roman: "V", nameEn: "E" });
  });

  it("sin acordes en pentatónicas y blues", () => {
    expect(scaleChords(scaleNotes("A", "pentatonic-minor"))).toEqual([]);
    expect(scaleChords(scaleNotes("A", "blues"))).toEqual([]);
  });
});
