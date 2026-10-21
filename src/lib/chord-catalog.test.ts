import { describe, expect, it } from "vitest";
import {
  findCatalogChord,
  searchCatalog,
  type Catalog,
  type CatalogChord,
} from "./chord-catalog";
import { PAGE_SIZE } from "./chord-query";

const pos = {
  position: 1,
  base_fret: 1,
  frets: [0, 3, 2, 0, 1, 0],
  fingers: [],
  barres: [],
  capo: false,
};
const chord = (
  id: string,
  key: string,
  suffix: string,
  category: CatalogChord["category"],
  category_order: number,
  note_order: number,
  search_text: string,
): CatalogChord => ({
  id,
  key,
  suffix,
  name_en: `${key}${suffix === "major" ? "" : suffix}`,
  name_es: `${key} ${suffix}`,
  category,
  category_order,
  note_order,
  search_text,
  notes: [],
  intervals: [],
  positions: [pos],
});

const guitar: Catalog = {
  instrument: "guitar",
  chords: [
    chord("g-minor", "G", "minor", "minor", 1, 7, "g minor sol menor"),
    chord("c-major", "C", "major", "major", 0, 0, "c major do mayor"),
    chord("c-minor", "C", "minor", "minor", 1, 0, "c minor do menor"),
    chord("a-7sg", "A", "7sg", "other", 7, 9, "a 7sg la 7sg"),
  ],
};

describe("searchCatalog", () => {
  it("sin consulta: todo, ordenado por categoría y luego por nota", () => {
    const page = searchCatalog(guitar, "", "cat", 0);
    expect(page.rows.map((r) => r.id)).toEqual([
      "c-major",
      "c-minor",
      "g-minor",
      "a-7sg",
    ]);
    expect(page.total).toBe(4);
  });

  it("agrupado por nota", () => {
    expect(searchCatalog(guitar, "", "note", 0).rows.map((r) => r.id)).toEqual([
      "c-major",
      "c-minor",
      "g-minor",
      "a-7sg",
    ]);
  });

  it("consulta de acorde: nota y tipo", () => {
    expect(searchCatalog(guitar, "Do menor", "cat", 0).rows.map((r) => r.id)).toEqual([
      "c-minor",
    ]);
    expect(searchCatalog(guitar, "C", "cat", 0).rows.map((r) => r.id)).toEqual([
      "c-major",
      "c-minor",
    ]);
  });

  it("selector rápido: notas y tipos combinados", () => {
    const page = searchCatalog(guitar, "", "cat", 0, {
      keys: ["C", "G"],
      suffixes: ["minor"],
    });
    expect(page.rows.map((r) => r.id)).toEqual(["c-minor", "g-minor"]);
  });

  it("piano: solo los tipos de teclado, con sus teclas", () => {
    const piano: Catalog = { ...guitar, instrument: "piano" };
    const page = searchCatalog(piano, "", "cat", 0);
    expect(page.rows.map((r) => r.id)).not.toContain("a-7sg");
    expect(page.rows[0].keys?.length).toBeGreaterThan(0);
  });

  it("pagina de PAGE_SIZE en PAGE_SIZE", () => {
    const many: Catalog = {
      instrument: "guitar",
      chords: Array.from({ length: PAGE_SIZE + 5 }, (_, i) =>
        chord(`c-x${i}`, "C", "major", "major", 0, 0, "c"),
      ),
    };
    expect(searchCatalog(many, "", "cat", 0).rows).toHaveLength(PAGE_SIZE);
    expect(searchCatalog(many, "", "cat", PAGE_SIZE).rows).toHaveLength(5);
  });
});

describe("findCatalogChord", () => {
  it("encuentra por slug según el instrumento", () => {
    expect(findCatalogChord(guitar, "c-major")?.key).toBe("C");
    const ukulele: Catalog = {
      instrument: "ukulele",
      chords: [chord("ukulele-c-major", "C", "major", "major", 0, 0, "c")],
    };
    expect(findCatalogChord(ukulele, "c-major")?.id).toBe("ukulele-c-major");
    expect(findCatalogChord(guitar, "zz-nope")).toBeNull();
  });

  it("piano: un tipo sin voicing de teclado no existe", () => {
    expect(findCatalogChord({ ...guitar, instrument: "piano" }, "a-7sg")).toBeNull();
  });
});
