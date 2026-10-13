import { describe, expect, it } from "vitest";
import { detectKey } from "./key-detect";

/* Una línea de letra con los acordes dados, uno por palabra. */
const line = (...chords: string[]) => chords.map((c) => `[${c}]la`).join(" ");
const song = (...lines: string[][]) => lines.map((l) => line(...l)).join("\n");

describe("detectKey", () => {
  it("I-V-vi-IV en Sol → Sol mayor", () => {
    expect(
      detectKey(song(["G", "D", "Em", "C"], ["G", "D", "Em", "C"], ["G"]))?.key,
    ).toBe("G");
  });

  it("separa la relativa por la tónica: Am F C G que empieza y termina en Am", () => {
    const result = detectKey(song(["Am", "F", "C", "G"], ["Am", "F", "C", "G"], ["Am"]));
    expect(result?.key).toBe("Am");
  });

  it("acepta el V mayor de la menor armónica", () => {
    expect(detectKey(song(["Am", "Dm", "E", "Am"], ["Am", "Dm", "E7", "Am"]))?.key).toBe(
      "Am",
    );
  });

  it("Em D Bm C empezando y terminando en Em → Mi menor (alternativa Sol)", () => {
    const result = detectKey(
      song(["Em", "D", "Bm", "C"], ["Em", "D", "Bm", "C"], ["Em"]),
    );
    expect(result?.key).toBe("Em");
  });

  it("propone la relativa como alternativa cuando el énfasis es parejo", () => {
    const result = detectKey(song(["C", "Am", "F", "G"], ["Am", "C", "G", "F"]));
    expect(["C", "Am"]).toContain(result?.key);
    expect(["C", "Am"]).toContain(result?.alternative);
  });

  it("ignora el bajo de los acordes con barra", () => {
    expect(detectKey(song(["G", "D/F#", "Em", "C"], ["G", "D/F#", "G"]))?.key).toBe("G");
  });

  it("trata igual los enarmónicos (A# = Bb) y los nombres en español", () => {
    expect(detectKey(song(["Bb", "F", "Gm", "Eb"], ["Bb"]))?.key).toBe("Bb");
    expect(detectKey(song(["A#", "F", "Gm", "D#"], ["A#"]))?.key).toBe("Bb");
    expect(detectKey(song(["Sol", "Re", "Mim", "Do"], ["Sol"]))?.key).toBe("G");
  });

  it("cuenta las vueltas de las líneas instrumentales", () => {
    // Sin contar las 6 vueltas de Am ganaría Do (más presente en la letra).
    const content = ["| Am | x6", line("C", "G", "C")].join("\n");
    expect(detectKey(content)?.key).toBe("Am");
  });

  it("sin acordes reconocibles → null", () => {
    expect(detectKey("")).toBeNull();
    expect(detectKey("Solo letra, sin acordes")).toBeNull();
  });
});
