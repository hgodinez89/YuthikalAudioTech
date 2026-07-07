import { describe, expect, it } from "vitest";
import {
  arrowsToStrum,
  buildVisualModel,
  collectChords,
  parseChordPro,
  parseLyricUnits,
  setChordAtUnit,
  setSectionStrum,
  strumToArrows,
} from "./chordpro";

const SAMPLE = `{title: St. James Infirmary}
{artist: Traditional}
{key: Em}

{start_of_verse}
{strum: D - D U - U D U}
I went [Em]down to the St. [Am]James In[Em]firmary
Saw my [Em]baby [B7]lyin' there
{end_of_verse}

{start_of_chorus}
Let her [Em]go, let her [Am]go
{end_of_chorus}`;

describe("parseChordPro — metadatos", () => {
  it("lee title, artist y key", () => {
    const song = parseChordPro(SAMPLE);
    expect(song.title).toBe("St. James Infirmary");
    expect(song.artist).toBe("Traditional");
    expect(song.key).toBe("Em");
  });
});

describe("parseChordPro — secciones", () => {
  it("crea verso y coro numerados con su rasgueo", () => {
    const song = parseChordPro(SAMPLE);
    expect(song.sections).toHaveLength(2);
    expect(song.sections[0]).toMatchObject({
      type: "verse",
      number: 1,
      strum: "D - D U - U D U",
    });
    expect(song.sections[1]).toMatchObject({ type: "chorus", number: 1, strum: null });
  });

  it("numera versos consecutivos y respeta etiquetas explícitas", () => {
    const song = parseChordPro(
      "{sov}\n[C]uno\n{eov}\n{sov: Verso especial}\n[D]dos\n{eov}",
    );
    expect(song.sections[0].number).toBe(1);
    expect(song.sections[1].number).toBe(2);
    expect(song.sections[0].label).toBeNull();
    expect(song.sections[1].label).toBe("Verso especial");
  });

  it("texto sin sección abre una sección plain", () => {
    const song = parseChordPro("[C]Hola [G]mundo");
    expect(song.sections).toHaveLength(1);
    expect(song.sections[0].type).toBe("plain");
  });

  it("descarta secciones vacías", () => {
    const song = parseChordPro("{sov}\n{eov}\n{soc}\n[C]algo\n{eoc}");
    expect(song.sections).toHaveLength(1);
    expect(song.sections[0].type).toBe("chorus");
  });
});

describe("parseChordPro — segmentos acorde/texto", () => {
  it("ancla cada acorde a la sílaba que le sigue", () => {
    const song = parseChordPro("I went [Em]down to the St. [Am]James In[Em]firmary");
    const line = song.sections[0].lines[0];
    expect(line).toEqual([
      { chord: null, text: "I went " },
      { chord: "Em", text: "down to the St. " },
      { chord: "Am", text: "James In" },
      { chord: "Em", text: "firmary" },
    ]);
  });

  it("acorde al final de línea sin texto posterior", () => {
    const line = parseChordPro("so cold, so [B7]").sections[0].lines[0];
    expect(line[line.length - 1]).toEqual({ chord: "B7", text: "" });
  });

  it("corchetes vacíos no generan acorde", () => {
    const line = parseChordPro("hola [] mundo").sections[0].lines[0];
    expect(line.every((s) => s.chord === null)).toBe(true);
  });

  it("colapsa líneas en blanco repetidas dentro de una sección", () => {
    const song = parseChordPro("{sov}\n[C]a\n\n\n\n[D]b\n{eov}");
    expect(song.sections[0].lines).toHaveLength(3); // a, blanco, b
  });
});

describe("rasgueo — flechas", () => {
  it("D/U/- a flechas y de regreso", () => {
    expect(strumToArrows("D - D U - U D U")).toBe("↓ – ↓ ↑ – ↑ ↓ ↑");
    expect(arrowsToStrum("↓ – ↓ ↑")).toBe("D - D U");
  });
});

describe("parseLyricUnits — edición visual", () => {
  it("palabra con y sin acorde, con offsets crudos", () => {
    const units = parseLyricUnits("I went [Em]down");
    expect(units).toEqual([
      { chord: null, text: "I", textStart: 0, chordStart: null, chordEnd: null },
      { chord: null, text: "went", textStart: 2, chordStart: null, chordEnd: null },
      { chord: "Em", text: "down", textStart: 11, chordStart: 7, chordEnd: 11 },
    ]);
  });

  it("acorde a mitad de palabra crea una unidad para el fragmento", () => {
    const units = parseLyricUnits("In[Em]firmary");
    expect(units.map((u) => u.text)).toEqual(["In", "firmary"]);
    expect(units[1].chord).toBe("Em");
  });

  it("acorde colgante al final de línea", () => {
    const units = parseLyricUnits("so fair [B7]");
    expect(units[units.length - 1]).toMatchObject({ chord: "B7", text: "" });
  });
});

describe("setChordAtUnit", () => {
  const content = "linea cero\nI went [Em]down to";

  it("inserta acorde en palabra sin acorde", () => {
    const units = parseLyricUnits("I went [Em]down to");
    const result = setChordAtUnit(content, 1, units[0], "C");
    expect(result.split("\n")[1]).toBe("[C]I went [Em]down to");
  });

  it("reemplaza el acorde existente", () => {
    const units = parseLyricUnits("I went [Em]down to");
    const result = setChordAtUnit(content, 1, units[2], "Am7");
    expect(result.split("\n")[1]).toBe("I went [Am7]down to");
  });

  it("quita el acorde con chord = null", () => {
    const units = parseLyricUnits("I went [Em]down to");
    const result = setChordAtUnit(content, 1, units[2], null);
    expect(result.split("\n")[1]).toBe("I went down to");
  });
});

describe("setSectionStrum", () => {
  it("inserta {strum} tras el encabezado si no existe", () => {
    const result = setSectionStrum("{sov}\n[C]hola", 0, "D U");
    expect(result).toBe("{sov}\n{strum: D U}\n[C]hola");
  });

  it("reemplaza el {strum} existente", () => {
    const result = setSectionStrum("{sov}\n{strum: D}\n[C]hola", 0, "D U D");
    expect(result).toBe("{sov}\n{strum: D U D}\n[C]hola");
  });

  it("elimina el {strum} con strum = null", () => {
    const result = setSectionStrum("{sov}\n{strum: D}\n[C]hola", 0, null);
    expect(result).toBe("{sov}\n[C]hola");
  });
});

describe("buildVisualModel", () => {
  it("expone índices de línea reales del encabezado y las letras", () => {
    const model = buildVisualModel(
      "{title: X}\n{sov}\n{strum: D U}\nI went [Em]down\n{eov}",
    );
    expect(model).toHaveLength(1);
    expect(model[0]).toMatchObject({
      headerLineIndex: 1,
      type: "verse",
      strum: "D U",
    });
    expect(model[0].lines[0].lineIndex).toBe(3);
    expect(model[0].lines[0].units[2].chord).toBe("Em");
  });
});

describe("collectChords", () => {
  it("devuelve acordes únicos en orden de aparición", () => {
    expect(collectChords(parseChordPro(SAMPLE))).toEqual(["Em", "Am", "B7"]);
  });

  it("canción sin acordes devuelve lista vacía", () => {
    expect(collectChords(parseChordPro("solo letra"))).toEqual([]);
  });
});
