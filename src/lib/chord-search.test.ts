import { describe, expect, it } from "vitest";
import { escapeLike, normalizeQuery, parseChordQuery } from "./chord-search";

describe("parseChordQuery — cifrado compacto", () => {
  it("Am → La menor", () => {
    expect(parseChordQuery("Am")).toEqual({
      kind: "chord",
      keys: ["A"],
      suffixes: ["minor"],
    });
  });

  it("C#7 → Do sostenido séptima", () => {
    expect(parseChordQuery("C#7")).toEqual({
      kind: "chord",
      keys: ["C#"],
      suffixes: ["7"],
    });
  });

  it("Bb (solo raíz) → todas las cualidades de Si bemol", () => {
    expect(parseChordQuery("Bb")).toEqual({
      kind: "chord",
      keys: ["Bb"],
      suffixes: null,
    });
  });

  it("Fmaj7", () => {
    expect(parseChordQuery("Fmaj7")).toEqual({
      kind: "chord",
      keys: ["F"],
      suffixes: ["maj7"],
    });
  });

  it("Dm7b5 (semidisminuido)", () => {
    expect(parseChordQuery("Dm7b5")).toEqual({
      kind: "chord",
      keys: ["D"],
      suffixes: ["m7b5"],
    });
  });

  it("Db se normaliza a la clave C# de chords-db", () => {
    expect(parseChordQuery("Db")).toEqual({
      kind: "chord",
      keys: ["C#"],
      suffixes: null,
    });
  });
});

describe("parseChordQuery — español hablado/escrito", () => {
  it("la menor", () => {
    expect(parseChordQuery("la menor")).toEqual({
      kind: "chord",
      keys: ["A"],
      suffixes: ["minor"],
    });
  });

  it("La menor séptima (con acento)", () => {
    expect(parseChordQuery("La menor séptima")).toEqual({
      kind: "chord",
      keys: ["A"],
      suffixes: ["m7"],
    });
  });

  it("do sostenido mayor", () => {
    expect(parseChordQuery("do sostenido mayor")).toEqual({
      kind: "chord",
      keys: ["C#"],
      suffixes: ["major"],
    });
  });

  it("si bemol séptima", () => {
    expect(parseChordQuery("si bemol séptima")).toEqual({
      kind: "chord",
      keys: ["Bb"],
      suffixes: ["7"],
    });
  });

  it("re susp 4", () => {
    expect(parseChordQuery("re susp 4")).toEqual({
      kind: "chord",
      keys: ["D"],
      suffixes: ["sus4"],
    });
  });

  it("sol disminuido", () => {
    expect(parseChordQuery("sol disminuido")).toEqual({
      kind: "chord",
      keys: ["G"],
      suffixes: ["dim"],
    });
  });

  it("mi aumentado", () => {
    expect(parseChordQuery("mi aumentado")).toEqual({
      kind: "chord",
      keys: ["E"],
      suffixes: ["aug"],
    });
  });

  it("fa mayor 7", () => {
    expect(parseChordQuery("fa mayor 7")).toEqual({
      kind: "chord",
      keys: ["F"],
      suffixes: ["maj7"],
    });
  });

  it("la add 9", () => {
    expect(parseChordQuery("la add 9")).toEqual({
      kind: "chord",
      keys: ["A"],
      suffixes: ["add9"],
    });
  });

  it("solo la raíz devuelve todas las cualidades (suffixes null)", () => {
    expect(parseChordQuery("sol")).toEqual({
      kind: "chord",
      keys: ["G"],
      suffixes: null,
    });
  });
});

describe("parseChordQuery — inglés", () => {
  it("a minor seventh", () => {
    expect(parseChordQuery("a minor seventh")).toEqual({
      kind: "chord",
      keys: ["A"],
      suffixes: ["m7"],
    });
  });

  it("g augmented", () => {
    expect(parseChordQuery("g augmented")).toEqual({
      kind: "chord",
      keys: ["G"],
      suffixes: ["aug"],
    });
  });
});

describe("parseChordQuery — casos límite", () => {
  it("cadena vacía", () => {
    expect(parseChordQuery("  ")).toEqual({ kind: "empty" });
  });

  it("texto no reconocible cae a búsqueda libre", () => {
    expect(parseChordQuery("xyz123")).toEqual({ kind: "text", text: "xyz123" });
  });

  it("raíz con cualidad incomprensible cae a texto libre", () => {
    expect(parseChordQuery("la cosa rara")).toEqual({
      kind: "text",
      text: "la cosa rara",
    });
  });
});

describe("utilidades", () => {
  it("normalizeQuery quita acentos y colapsa espacios", () => {
    expect(normalizeQuery("  SÉptima   MAYOR ")).toBe("septima mayor");
  });

  it("escapeLike escapa comodines de LIKE", () => {
    expect(escapeLike("50%_a\\b")).toBe("50\\%\\_a\\\\b");
  });
});
