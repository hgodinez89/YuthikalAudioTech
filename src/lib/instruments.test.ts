import { describe, expect, it } from "vitest";
import { chordDbId, switchInstrumentPath } from "./instruments";

describe("switchInstrumentPath", () => {
  it("conserva la sección", () => {
    expect(switchInstrumentPath("/guitar/basics", "ukulele")).toBe("/ukulele/basics");
  });

  it("dentro de una canción conserva la ruta completa", () => {
    expect(switchInstrumentPath("/guitar/songs/abc", "ukulele")).toBe(
      "/ukulele/songs/abc",
    );
  });

  it("dentro de una escala conserva la escala", () => {
    expect(switchInstrumentPath("/guitar/scales/a-blues", "piano")).toBe(
      "/piano/scales/a-blues",
    );
    expect(switchInstrumentPath("/guitar/scales", "piano")).toBe("/piano/scales");
  });

  it("desde el detalle de un acorde vuelve al buscador", () => {
    expect(switchInstrumentPath("/ukulele/chords/c-7sg", "guitar")).toBe(
      "/guitar/chords",
    );
  });

  it("ruta desconocida → acordes", () => {
    expect(switchInstrumentPath("/", "ukulele")).toBe("/ukulele/chords");
  });
});

describe("chordDbId", () => {
  it("guitarra sin prefijo, ukelele con prefijo", () => {
    expect(chordDbId("guitar", "a-minor")).toBe("a-minor");
    expect(chordDbId("ukulele", "a-minor")).toBe("ukulele-a-minor");
  });
});
