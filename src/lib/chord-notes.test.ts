import { describe, expect, it } from "vitest";
import { chordNoteLabels, pitchClass, stackLabels, stringPitches } from "./chord-notes";
import { chordSpeller } from "./piano";

const mains = (labels: ({ main: string } | null)[]) => labels.map((l) => l?.main ?? null);

describe("stringPitches", () => {
  it("guitarra: C abierto, con la 6ª sin tocar", () => {
    expect(stringPitches("guitar", [-1, 3, 2, 0, 1, 0])).toEqual([
      null,
      48,
      52,
      55,
      60,
      64,
    ]);
  });

  it("guitarra: trastes relativos al traste inicial (C con cejilla en el 3)", () => {
    expect(stringPitches("guitar", [1, 1, 3, 3, 3, 1], 3)).toEqual([
      43, 48, 55, 60, 64, 67,
    ]);
  });

  it("ukelele: afinación reentrante (Sol agudo)", () => {
    expect(stringPitches("ukulele", [0, 0, 0, 3])).toEqual([67, 60, 64, 72]);
  });
});

describe("chordNoteLabels", () => {
  it("guitarra C7: B♭ (no A♯) y la fundamental marcada", () => {
    const labels = chordNoteLabels(
      "guitar",
      { key: "C", suffix: "7", frets: [-1, 3, 2, 3, 1, 0] },
      "en",
    );
    expect(mains(labels)).toEqual([null, "C", "E", "B♭", "C", "E"]);
    expect(labels.map((l) => l?.root ?? false)).toEqual([
      false,
      true,
      false,
      false,
      true,
      false,
    ]);
  });

  it("piano F♯7 en solfeo, con el otro idioma", () => {
    const labels = chordNoteLabels(
      "piano",
      { key: "F#", suffix: "7", keys: [66, 70, 73, 76] },
      "es",
      true,
    );
    expect(mains(labels)).toEqual(["Fa♯", "La♯", "Do♯", "Mi"]);
    expect(labels[0]).toEqual({ main: "Fa♯", sub: "F♯", root: true });
  });

  it("ukelele B♭: notas naturales y alteradas con bemol", () => {
    expect(
      mains(
        chordNoteLabels(
          "ukulele",
          { key: "Bb", suffix: "major", frets: [3, 2, 1, 1] },
          "en",
        ),
      ),
    ).toEqual(["B♭", "D", "F", "B♭"]);
  });
});

describe("chordSpeller", () => {
  it("por intervalo en los tipos con voicing; por tonalidad en los demás", () => {
    expect(chordSpeller("C", "7")(70, "es")).toBe("Si♭");
    expect(chordSpeller("E", "7#9")(67, "en")).toBe("G");
    expect(chordSpeller("Eb", "major")(63, "en")).toBe("E♭");
    expect(chordSpeller("C", "7sg")(70, "en")).toBe("A♯");
  });
});

describe("pitchClass", () => {
  it("lee el cifrado del catálogo", () => {
    expect(["C", "A#", "Eb", "B♭", "F♯", "B"].map(pitchClass)).toEqual([
      0, 10, 3, 10, 6, 11,
    ]);
  });
});

describe("stackLabels", () => {
  it("baja de fila solo cuando se encima con el anterior", () => {
    expect(
      stackLabels([
        { x: 0, width: 10 },
        { x: 10, width: 12 },
        { x: 20, width: 8 },
        { x: 40, width: 10 },
      ]),
    ).toEqual([0, 1, 0, 0]);
  });
});
