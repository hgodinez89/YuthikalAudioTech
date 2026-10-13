import { describe, expect, it } from "vitest";
import { chordsInLine, chordsOverLyricsToChordPro, isChordSymbol } from "./chord-import";
import { parseChordPro } from "./chordpro";

describe("isChordSymbol", () => {
  it.each([
    "C",
    "Am",
    "C#m7",
    "Bb/D",
    "Gmaj7",
    "Dsus4",
    "E7(b9)",
    "Dm7b5",
    "Cadd9",
    "F#",
  ])("%s es acorde (inglés)", (token) => expect(isChordSymbol(token)).toBe(true));

  it.each(["Lam", "Sol7", "Fa#m", "Mi", "Do/Mi", "Sib"])(
    "%s es acorde (español)",
    (token) => expect(isChordSymbol(token)).toBe(true),
  );

  it.each(["la", "mi", "Casa", "Amor", "Hola", "I", "Dame"])("%s no es acorde", (token) =>
    expect(isChordSymbol(token)).toBe(false),
  );
});

describe("chordsInLine", () => {
  it("devuelve columnas", () => {
    expect(chordsInLine("Am    F  C")).toEqual([
      { col: 0, chord: "Am" },
      { col: 6, chord: "F" },
      { col: 9, chord: "C" },
    ]);
  });

  it("ignora barras y repeticiones", () => {
    expect(chordsInLine("| C | G | x2")).toEqual([
      { col: 2, chord: "C" },
      { col: 6, chord: "G" },
    ]);
  });

  it("una letra no es línea de acordes (falsos positivos)", () => {
    expect(chordsInLine("La casa de mi padre")).toBeNull();
    expect(chordsInLine("A mi manera")).toBeNull();
    expect(chordsInLine("la la la")).toBeNull();
  });
});

describe("chordsOverLyricsToChordPro", () => {
  it("ancla los acordes en la columna de la sílaba", () => {
    const input = ["Am      F      C", "Bésame, bésame mucho"].join("\n");
    expect(chordsOverLyricsToChordPro(input)).toBe("[Am]Bésame, [F]bésame [C]mucho");
  });

  it("acordes más allá del final de la letra", () => {
    const input = ["G       D       Em", "Hola mundo"].join("\n");
    expect(chordsOverLyricsToChordPro(input)).toBe("[G]Hola mun[D]do      [Em]");
  });

  it("línea instrumental sin letra debajo", () => {
    const input = ["C  G  Am  F", "", "Letra sin acordes"].join("\n");
    expect(chordsOverLyricsToChordPro(input)).toBe(
      ["[C] [G] [Am] [F]", "", "Letra sin acordes"].join("\n"),
    );
  });

  it("dos líneas de acordes seguidas: la primera es instrumental", () => {
    const input = ["C G", "Am  F", "Canto"].join("\n");
    expect(chordsOverLyricsToChordPro(input)).toBe(
      ["[C] [G]", "[Am]Cant[F]o"].join("\n"),
    );
  });

  it("cifrado en español y acordes con bajo", () => {
    const input = ["Lam     Do/Mi", "Quiero cantar"].join("\n");
    expect(chordsOverLyricsToChordPro(input)).toBe("[Lam]Quiero c[Do/Mi]antar");
  });

  it("encabezados → [[Sección]]", () => {
    const input = [
      "Verso 1:",
      "C       G",
      "Primera línea",
      "",
      "[Coro]",
      "F      C",
      "Estribillo aquí",
    ].join("\n");
    expect(chordsOverLyricsToChordPro(input)).toBe(
      [
        "[[Verso 1]]",
        "[C]Primera [G]línea",
        "",
        "[[Coro]]",
        "[F]Estribi[C]llo aquí",
      ].join("\n"),
    );
  });

  it("encabezado con acordes en la misma línea", () => {
    expect(chordsOverLyricsToChordPro("Intro: C G Am")).toBe(
      ["[[Intro]]", "[C] [G] [Am]"].join("\n"),
    );
  });

  it("ChordPro existente pasa sin cambios", () => {
    const input = ["{title: X}", "I [Em]went down"].join("\n");
    expect(chordsOverLyricsToChordPro(input)).toBe(input);
  });

  it("tabuladores y saltos de línea de Windows", () => {
    const input = "C\tG\r\nPalabra uno dos";
    expect(chordsOverLyricsToChordPro(input)).toBe("[C]Palabra [G]uno dos");
  });

  it("el resultado se parsea como canción", () => {
    const song = parseChordPro(
      chordsOverLyricsToChordPro(["Coro:", "Am   F", "Bésame"].join("\n")),
    );
    expect(song.sections).toHaveLength(1);
    expect(song.sections[0].label).toBe("Coro");
    expect(song.sections[0].lines[0][0]).toEqual({ chord: "Am", text: "Bésam" });
  });

  it("indicaciones de capo/afinación → nota {c:}", () => {
    expect(chordsOverLyricsToChordPro(["Capo 3", "Afinación: Drop D"].join("\n"))).toBe(
      ["{c: Capo 3}", "{c: Afinación: Drop D}"].join("\n"),
    );
  });

  it("línea instrumental con repetición o compases se conserva tal cual", () => {
    expect(chordsOverLyricsToChordPro(["Em D Bm C x2", "| Am | F |"].join("\n"))).toBe(
      ["Em D Bm C x2", "| Am | F |"].join("\n"),
    );
  });

  it("[[Encabezado]] ya escrito pasa sin cambios", () => {
    expect(chordsOverLyricsToChordPro("[[Intro]]")).toBe("[[Intro]]");
  });
});
