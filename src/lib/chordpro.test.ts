import { describe, expect, it } from "vitest";
import {
  arrowsToStrum,
  buildVisualModel,
  collectChords,
  isInstrumental,
  lineRepeat,
  parseChordPro,
  parseInstrumentalLine,
  parseLyricUnits,
  replaceInstrumentalToken,
  sectionHeaderLabel,
  setChordAtUnit,
  setSectionStrum,
  strumToArrows,
  syncPlan,
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
      {
        chord: null,
        text: "I",
        textStart: 0,
        chordStart: null,
        chordEnd: null,
        spaceAfter: true,
      },
      {
        chord: null,
        text: "went",
        textStart: 2,
        chordStart: null,
        chordEnd: null,
        spaceAfter: true,
      },
      {
        chord: "Em",
        text: "down",
        textStart: 11,
        chordStart: 7,
        chordEnd: 11,
        spaceAfter: false,
      },
    ]);
  });

  it("espacio tras la palabra solo si existe en el texto", () => {
    const sep = parseLyricUnits("On a [Em]cobweb");
    expect(sep.map((u) => [u.text, u.spaceAfter])).toEqual([
      ["On", true],
      ["a", true],
      ["cobweb", false],
    ]);
    const joined = parseLyricUnits("Any[Bm]where we");
    expect(joined.map((u) => [u.text, u.spaceAfter])).toEqual([
      ["Any", false],
      ["where", true],
      ["we", false],
    ]);
  });

  it("acordes seguidos sin letra no se pierden", () => {
    const units = parseLyricUnits("[C] [G] [Am]");
    expect(units.map((u) => [u.chord, u.text, u.spaceAfter])).toEqual([
      ["C", "", true],
      ["G", "", true],
      ["Am", "", false],
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

describe("encabezados [[…]] y notas {c:}", () => {
  const SONG = [
    "{c: Capo III}",
    "",
    "[[Intro]]",
    "[Em] [D]",
    "",
    "[[ Verse 1 ]]",
    "On a [Em]cobweb",
    "",
    "In a [Bm]room",
    "{c: Repetir x2}",
    "[[Solo de guitarra]]",
    "[Em]",
  ].join("\n");

  it("sectionHeaderLabel solo acepta doble corchete en toda la línea", () => {
    expect(sectionHeaderLabel("[[Intro]]")).toBe("Intro");
    expect(sectionHeaderLabel("  [[ Coro 2 ]]  ")).toBe("Coro 2");
    expect(sectionHeaderLabel("[Intro]")).toBeNull();
    expect(sectionHeaderLabel("[[Intro]] letra")).toBeNull();
    expect(sectionHeaderLabel("[[]]")).toBeNull();
  });

  it("parseChordPro: secciones con etiqueta, notas y acordes reales", () => {
    const song = parseChordPro(SONG);
    expect(song.sections.map((s) => s.label)).toEqual([
      null,
      "Intro",
      "Verse 1",
      "Solo de guitarra",
    ]);
    expect(song.sections[0].lines[0]).toEqual([
      { chord: null, text: "Capo III", note: true },
    ]);
    // la nota queda en la sección donde aparece
    expect(song.sections[2].lines.at(-1)).toEqual([
      { chord: null, text: "Repetir x2", note: true },
    ]);
    expect(collectChords(song)).toEqual(["Em", "D", "Bm"]);
  });

  it("[Em] solo en su línea sigue siendo acorde", () => {
    const song = parseChordPro("[Em]");
    expect(song.sections[0].lines[0][0].chord).toBe("Em");
  });

  it("buildVisualModel: encabezado, notas fuera de lines y separación de estrofas", () => {
    const model = buildVisualModel(SONG);
    expect(model.map((s) => [s.label, s.headerLineIndex])).toEqual([
      [null, null],
      ["Intro", 2],
      ["Verse 1", 5],
      ["Solo de guitarra", 10],
    ]);
    expect(model[0].lines).toHaveLength(0);
    expect(model[0].trailingNotes).toEqual(["Capo III"]);
    expect(model[1].lines[0].units.map((u) => u.chord)).toEqual(["Em", "D"]);
    expect(model[2].lines.map((l) => l.gapBefore)).toEqual([false, true]);
    expect(model[2].trailingNotes).toEqual(["Repetir x2"]);
    // solo las líneas de letra cuentan para sincronizar
    expect(model.flatMap((s) => s.lines)).toHaveLength(4);
  });

  it("nota antes de una línea de letra", () => {
    const model = buildVisualModel("{c: suave}\nHola");
    expect(model[0].lines[0].notesBefore).toEqual(["suave"]);
  });
});

describe("líneas instrumentales", () => {
  const chordsOf = (raw: string) =>
    parseInstrumentalLine(raw)
      ?.tokens.filter((tk) => tk.kind === "chord")
      .map((tk) => (tk.kind === "chord" ? tk.chord : ""));

  it.each([
    ["Em D Bm C x2", ["Em", "D", "Bm", "C"], 2],
    ["| Em | D |", ["Em", "D"], 1],
    ["Am F (2X)", ["Am", "F"], 2],
    ["C G 2×", ["C", "G"], 2],
    ["[Em] [D] x3", ["Em", "D"], 3],
    ["Lam Re ×4", ["Lam", "Re"], 4],
  ])("%s → instrumental", (raw, chords, repeat) => {
    expect(chordsOf(raw)).toEqual(chords);
    expect(parseInstrumentalLine(raw)?.repeat).toBe(repeat);
  });

  it.each([
    "Em D Bm C", // sin | ni repetición: sigue siendo letra
    "La La La",
    "x2 Em D", // repetición no final
    "Em casa x2",
    "| x2",
    "",
  ])("%s → no es instrumental", (raw) => {
    expect(parseInstrumentalLine(raw)).toBeNull();
  });

  it("parseChordPro: segmentos de acorde, compás y repetición", () => {
    const line = parseChordPro("| Em D | Bm C | x2").sections[0].lines[0];
    expect(line).toEqual([
      { chord: null, text: "|", bar: true },
      { chord: "Em", text: "" },
      { chord: "D", text: "" },
      { chord: null, text: "|", bar: true },
      { chord: "Bm", text: "" },
      { chord: "C", text: "" },
      { chord: null, text: "|", bar: true },
      { chord: null, text: "×2", repeat: 2 },
    ]);
    expect(isInstrumental(line)).toBe(true);
    expect(lineRepeat(line)).toBe(2);
    expect(collectChords(parseChordPro("Em D Bm C x2"))).toEqual(["Em", "D", "Bm", "C"]);
  });

  it("una línea de letra no es instrumental", () => {
    const line = parseChordPro("On a [Em]cobweb").sections[0].lines[0];
    expect(isInstrumental(line)).toBe(false);
    expect(lineRepeat(line)).toBe(1);
  });

  it("replaceInstrumentalToken cambia y quita acordes escritos como texto", () => {
    const content = "[[Intro]]\nEm D Bm C x2";
    const tokens = parseInstrumentalLine("Em D Bm C x2")!.tokens;
    expect(replaceInstrumentalToken(content, 1, tokens[1], "G")).toBe(
      "[[Intro]]\nEm G Bm C x2",
    );
    expect(replaceInstrumentalToken(content, 1, tokens[2], null)).toBe(
      "[[Intro]]\nEm D C x2",
    );
  });
});

describe("syncPlan — calibración y karaoke comparten índices", () => {
  const SONG = ["[[Intro]]", "Em D Bm C x2", "", "[[Verse]]", "On a [Em]cobweb"].join(
    "\n",
  );

  it("granularidad línea: una marca por vuelta", () => {
    expect(syncPlan(SONG, "line")).toEqual([
      { line: 0, pass: 1, passes: 2, targets: 1, firstTarget: 0 },
      { line: 0, pass: 2, passes: 2, targets: 1, firstTarget: 1 },
      { line: 1, pass: 1, passes: 1, targets: 1, firstTarget: 2 },
    ]);
  });

  it("granularidad palabra: cada acorde de cada vuelta y cada palabra", () => {
    expect(syncPlan(SONG, "word")).toEqual([
      { line: 0, pass: 1, passes: 2, targets: 4, firstTarget: 0 },
      { line: 0, pass: 2, passes: 2, targets: 4, firstTarget: 4 },
      { line: 1, pass: 1, passes: 1, targets: 3, firstTarget: 8 },
    ]);
  });

  it("mismo número de líneas que parseChordPro (sin notas ni encabezados)", () => {
    const song = "{c: Capo III}\n" + SONG;
    const lyricLines = parseChordPro(song)
      .sections.flatMap((s) => s.lines)
      .filter((l) => l.length && !l[0].note);
    const plan = syncPlan(song, "line");
    expect(new Set(plan.map((p) => p.line)).size).toBe(lyricLines.length);
  });
});
