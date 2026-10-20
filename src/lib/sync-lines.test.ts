import { describe, expect, it } from "vitest";
import { sectionTitle, syncPlan } from "./chordpro";
import { calibrationRows, karaokeLines } from "./sync-lines";

const NAMES = { verse: "Verso", chorus: "Coro", bridge: "Puente" } as const;
const title = (section: Parameters<typeof sectionTitle>[0]) =>
  sectionTitle(section, (type) => NAMES[type as keyof typeof NAMES] ?? type);

const SONG = [
  "{c: Capo 2}",
  "[[Intro]]",
  "Em D Bm C x2",
  "",
  "{sov}",
  "On a [Em]cobweb [D]afternoon",
  "In a room full of [Bm]emptiness",
  "{eov}",
  "{soc}",
  "Re[D]demp[G]tion song",
  "{eoc}",
].join("\n");

describe("sectionTitle", () => {
  it("etiqueta propia, verso numerado y coro numerado desde el segundo", () => {
    expect(title({ type: "chorus", number: 1, label: "Estribillo" })).toBe("Estribillo");
    expect(title({ type: "verse", number: 1, label: null })).toBe("Verso 1");
    expect(title({ type: "chorus", number: 1, label: null })).toBe("Coro");
    expect(title({ type: "chorus", number: 2, label: null })).toBe("Coro 2");
    expect(title({ type: "plain", number: 1, label: null })).toBeNull();
  });
});

describe("filas de calibración y de karaoke — mismos índices que syncPlan", () => {
  for (const granularity of ["line", "word"] as const) {
    it(`granularidad ${granularity}`, () => {
      const plan = syncPlan(SONG, granularity);
      const { rows, totalTargets } = calibrationRows(SONG, granularity, title);
      const lines = karaokeLines(SONG, granularity, title);
      const calLines = rows.flatMap((r) => (r.kind === "line" ? [r] : []));

      // Una fila por vuelta, en ambas pantallas, con los objetivos del plan.
      expect(calLines.map((r) => [r.firstTarget, r.targetCount])).toEqual(
        plan.map((p) => [p.firstTarget, p.targets]),
      );
      expect(lines.map((l) => [l.firstTarget, l.targets])).toEqual(
        plan.map((p) => [p.firstTarget, p.targets]),
      );
      const last = plan[plan.length - 1];
      expect(totalTargets).toBe(last.firstTarget + last.targets);
    });
  }

  it("calibración: encabezados de sección y vueltas de la línea repetida", () => {
    const { rows } = calibrationRows(SONG, "line", title);
    expect(rows.filter((r) => r.kind === "section").map((r) => r.title)).toEqual([
      "Intro",
      "Verso 1",
      "Coro",
    ]);
    const intro = rows.filter((r) => r.kind === "line").slice(0, 2);
    expect(intro.map((r) => r.kind === "line" && r.pass)).toEqual([
      { n: 1, total: 2 },
      { n: 2, total: 2 },
    ]);
  });

  it("calibración: los trozos de una palabra con acordes quedan pegados", () => {
    const { rows } = calibrationRows(SONG, "word", title);
    const redemption = rows.findLast((r) => r.kind === "line");
    expect(
      redemption?.kind === "line" &&
        redemption.words.map((w) => (w.spaceAfter ? `${w.text}_` : w.text)).join(""),
    ).toBe("Redemption_song");
  });

  it("karaoke: encabezado y notas solo en la primera vuelta", () => {
    const lines = karaokeLines(SONG, "line", title);
    expect(lines[0]).toMatchObject({ section: "Intro", notes: ["Capo 2"] });
    expect(lines[1]).toMatchObject({
      section: null,
      notes: [],
      pass: { n: 2, total: 2 },
    });
    expect(lines[2].section).toBe("Verso 1");
  });
});
