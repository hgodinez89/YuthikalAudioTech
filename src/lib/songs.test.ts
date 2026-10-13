import { describe, expect, it } from "vitest";
import type { Instrument } from "./instruments";
import {
  copyName,
  normalizeInclude,
  sortInstruments,
  sortSongs,
  validateSong,
  type SongSort,
  type SortDir,
} from "./songs";

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

describe("sortSongs", () => {
  const song = (
    name: string,
    created_at: string,
    instruments: Instrument[] = [],
    playlist_id: string | null = null,
  ) => ({ name, created_at, instruments, playlist_id });
  const playlistNames = new Map([
    ["p-rock", "Rock"],
    ["p-baladas", "Baladas"],
  ]);
  const names = (
    songs: ReturnType<typeof song>[],
    by: SongSort,
    dir: SortDir,
    instrument: Instrument = "guitar",
  ) =>
    sortSongs(songs, { by, dir, instrument, playlistNames, locale: "es" }).map(
      (s) => s.name,
    );

  const a = song("Ángel", "2026-01-02", ["guitar"], "p-rock");
  const b = song("bamboleo", "2026-01-03", ["piano"], null);
  const c = song("Canción 10", "2026-01-01", [], "p-baladas");
  const d = song("Canción 2", "2026-01-04", ["ukulele", "guitar"], "p-rock");
  const all = [a, b, c, d];

  it("por fecha", () => {
    expect(names(all, "recent", "desc")).toEqual([
      "Canción 2",
      "bamboleo",
      "Ángel",
      "Canción 10",
    ]);
    expect(names(all, "recent", "asc")).toEqual([
      "Canción 10",
      "Ángel",
      "bamboleo",
      "Canción 2",
    ]);
  });

  it("por nombre ignora acentos y mayúsculas y ordena números como números", () => {
    expect(names(all, "name", "asc")).toEqual([
      "Ángel",
      "bamboleo",
      "Canción 2",
      "Canción 10",
    ]);
    expect(names(all, "name", "desc")).toEqual([
      "Canción 10",
      "Canción 2",
      "bamboleo",
      "Ángel",
    ]);
  });

  it("por instrumento: el actual primero, luego otros, luego sin definir", () => {
    expect(names(all, "instruments", "asc")).toEqual([
      "Ángel",
      "Canción 2",
      "bamboleo",
      "Canción 10",
    ]);
    expect(names(all, "instruments", "desc")).toEqual([
      "Canción 10",
      "bamboleo",
      "Ángel",
      "Canción 2",
    ]);
    expect(names(all, "instruments", "asc", "piano")).toEqual([
      "bamboleo",
      "Ángel",
      "Canción 2",
      "Canción 10",
    ]);
  });

  it("por playlist: sin playlist siempre al final", () => {
    expect(names(all, "playlist", "asc")).toEqual([
      "Canción 10",
      "Ángel",
      "Canción 2",
      "bamboleo",
    ]);
    expect(names(all, "playlist", "desc")).toEqual([
      "Ángel",
      "Canción 2",
      "Canción 10",
      "bamboleo",
    ]);
  });

  it("no muta la lista original", () => {
    const list = [b, a];
    sortSongs(list, {
      by: "name",
      dir: "asc",
      instrument: "guitar",
      playlistNames,
      locale: "es",
    });
    expect(list).toEqual([b, a]);
  });
});
