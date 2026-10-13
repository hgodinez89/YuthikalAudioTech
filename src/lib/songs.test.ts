import { describe, expect, it } from "vitest";
import type { Instrument } from "./instruments";
import { copyName, normalizeInclude, sortInstruments, validateSong } from "./songs";

describe("copyName", () => {
  it("agrega el sufijo", () => {
    expect(copyName("Like a stone", "copia")).toBe("Like a stone (copia)");
  });

  it("nunca pasa de 150 caracteres", () => {
    const name = copyName("x".repeat(200), "copia");
    expect(name).toHaveLength(150);
    expect(name.endsWith(" (copia)")).toBe(true);
  });
});

describe("normalizeInclude", () => {
  it("sin audio no se copia la sincronización", () => {
    expect(normalizeInclude({ audio: false, sync: true })).toEqual({
      audio: false,
      sync: false,
    });
    expect(normalizeInclude({ audio: true, sync: true })).toEqual({
      audio: true,
      sync: true,
    });
    expect(normalizeInclude({ audio: true, sync: false })).toEqual({
      audio: true,
      sync: false,
    });
  });
});

describe("validateSong · instrumentos", () => {
  const base = { playlistId: null, name: "Canción", description: "", keyNote: "" };

  it("acepta ninguno o varios instrumentos activos", () => {
    expect(validateSong({ ...base, instruments: [] })).toBeNull();
    expect(validateSong({ ...base, instruments: ["guitar", "piano"] })).toBeNull();
  });

  it("rechaza instrumentos desconocidos, repetidos o un valor que no es lista", () => {
    const bad = (instruments: unknown) =>
      validateSong({ ...base, instruments: instruments as Instrument[] });
    expect(bad(["bass"])).toBe("instruments");
    expect(bad(["guitar", "guitar"])).toBe("instruments");
    expect(bad("guitar")).toBe("instruments");
  });
});

describe("sortInstruments", () => {
  it("ordena como la app", () => {
    expect(sortInstruments(["piano", "guitar"])).toEqual(["guitar", "piano"]);
  });
});
