import { describe, expect, it } from "vitest";
import {
  soundingNotes,
  validateCustomChord,
  type CustomChordInput,
} from "./custom-chords";

const guitar = (over: Partial<CustomChordInput> = {}): CustomChordInput => ({
  instrument: "guitar",
  name: "Cadd9",
  baseFret: 1,
  frets: [-1, 3, 2, 0, 3, 0],
  barres: [],
  keys: [],
  ...over,
});

describe("validateCustomChord", () => {
  it("acepta un acorde de guitarra, uno de ukelele y uno de piano", () => {
    expect(validateCustomChord(guitar())).toBeNull();
    expect(
      validateCustomChord({
        ...guitar(),
        instrument: "ukulele",
        name: "C/E",
        frets: [0, 0, 0, 3],
      }),
    ).toBeNull();
    expect(
      validateCustomChord({
        instrument: "piano",
        name: "Cmaj9",
        baseFret: 1,
        frets: [],
        barres: [],
        keys: [60, 64, 67, 71, 74],
      }),
    ).toBeNull();
  });

  it("nombre: sin espacios y de 1 a 24 caracteres (se recorta)", () => {
    expect(validateCustomChord(guitar({ name: "  Cadd9 " }))).toBeNull();
    expect(validateCustomChord(guitar({ name: "" }))).toBe("name");
    expect(validateCustomChord(guitar({ name: "C add9" }))).toBe("name");
    expect(validateCustomChord(guitar({ name: "a".repeat(25) }))).toBe("name");
  });

  it("cuerdas: cantidad del instrumento, ventana de 5 trastes y al menos una que suene", () => {
    expect(validateCustomChord(guitar({ frets: [0, 0, 0, 0] }))).toBe("frets");
    expect(validateCustomChord(guitar({ frets: [0, 0, 0, 0, 0, 6] }))).toBe("frets");
    expect(validateCustomChord(guitar({ frets: [-1, -1, -1, -1, -1, -1] }))).toBe(
      "frets",
    );
    expect(validateCustomChord(guitar({ frets: [0, 0, 0, 0, 0, 1.5] }))).toBe("frets");
  });

  it("traste inicial entre 1 y 20", () => {
    expect(validateCustomChord(guitar({ baseFret: 0 }))).toBe("baseFret");
    expect(validateCustomChord(guitar({ baseFret: 21 }))).toBe("baseFret");
    expect(validateCustomChord(guitar({ baseFret: 7 }))).toBeNull();
  });

  it("cejilla: hasta 2, y cada una pisa al menos dos cuerdas en su traste", () => {
    expect(
      validateCustomChord(guitar({ frets: [1, 3, 3, 2, 1, 1], barres: [1] })),
    ).toBeNull();
    expect(validateCustomChord(guitar({ barres: [1] }))).toBe("barres");
    expect(
      validateCustomChord(guitar({ frets: [1, 1, 2, 2, 3, 3], barres: [1, 2, 3] })),
    ).toBe("barres");
  });

  it("piano: de 3 a 6 teclas distintas del rango del piano, sin trastes", () => {
    const piano = (keys: number[]): CustomChordInput => ({
      instrument: "piano",
      name: "X",
      baseFret: 1,
      frets: [],
      barres: [],
      keys,
    });
    expect(validateCustomChord(piano([60, 64]))).toBe("keys");
    expect(validateCustomChord(piano([60, 64, 67, 71, 74, 77, 79]))).toBe("keys");
    expect(validateCustomChord(piano([60, 60, 67]))).toBe("keys");
    expect(validateCustomChord(piano([10, 64, 67]))).toBe("keys");
    expect(validateCustomChord({ ...piano([60, 64, 67]), frets: [0] })).toBe("frets");
  });

  it("guitarra no lleva teclas", () => {
    expect(validateCustomChord(guitar({ keys: [60, 64, 67] }))).toBe("keys");
  });
});

describe("soundingNotes", () => {
  const OPEN = [40, 45, 50, 55, 59, 64]; // Mi grave → Mi agudo
  it("suma el traste real a cada cuerda que suena", () => {
    // C: x32010
    expect(soundingNotes(OPEN, [-1, 3, 2, 0, 1, 0], 1)).toEqual([48, 52, 55, 60, 64]);
  });
  it("con traste inicial, los trastes son relativos", () => {
    // Barre en el 5 (A): 1 3 3 2 1 1 desde el traste 5
    expect(soundingNotes(OPEN, [1, 3, 3, 2, 1, 1], 5)).toEqual([45, 52, 57, 61, 64, 69]);
  });
});
