import { describe, expect, it } from "vitest";
import { crossedLoopEnd, loopRange, sectionLines } from "./loop";

describe("sectionLines", () => {
  // Intro (0–1), Verso (2–4), Coro (5–6)
  const starts = [true, false, true, false, false, true, false];

  it("toma la sección de la línea actual", () => {
    expect(sectionLines(starts, 0)).toEqual({ a: 0, b: 1 });
    expect(sectionLines(starts, 3)).toEqual({ a: 2, b: 4 });
    expect(sectionLines(starts, 6)).toEqual({ a: 5, b: 6 });
  });

  it("sin secciones marcadas, toda la canción", () => {
    expect(sectionLines([false, false, false], 1)).toEqual({ a: 0, b: 2 });
  });

  it("índices fuera de rango se ajustan", () => {
    expect(sectionLines(starts, 99)).toEqual({ a: 5, b: 6 });
    expect(sectionLines(starts, -3)).toEqual({ a: 0, b: 1 });
  });
});

describe("loopRange", () => {
  const starts = [10, 14, 18, null, 25, 30];

  it("desde la primera marca hasta donde empieza la línea siguiente", () => {
    expect(loopRange(starts, { a: 1, b: 2 }, 60)).toEqual({ from: 14, to: 25 });
  });

  it("una línea sin marca dentro del rango no lo corta", () => {
    expect(loopRange(starts, { a: 2, b: 3 }, 60)).toEqual({ from: 18, to: 25 });
  });

  it("al final de la canción termina en el fin (marcado o del audio)", () => {
    expect(loopRange(starts, { a: 4, b: 5 }, 42)).toEqual({ from: 25, to: 42 });
  });

  it("A y B en cualquier orden", () => {
    expect(loopRange(starts, { a: 2, b: 1 }, 60)).toEqual({ from: 14, to: 25 });
  });

  it("sin marcas en el rango, o rango vacío, no hay bucle", () => {
    expect(loopRange(starts, { a: 3, b: 3 }, 60)).toBeNull();
    expect(loopRange([5, 5], { a: 0, b: 0 }, 60)).toBeNull();
  });

  it("sin audio: los tiempos del autoscroll", () => {
    const dwell = 3.6;
    const auto = [0, 1, 2, 3].map((i) => i * dwell);
    expect(loopRange(auto, { a: 1, b: 2 }, 4 * dwell)).toEqual({
      from: 3.6,
      to: 3 * dwell,
    });
  });
});

describe("crossedLoopEnd", () => {
  const range = { from: 10, to: 20 };
  it("solo al cruzar el fin", () => {
    expect(crossedLoopEnd(19.9, 20.05, range)).toBe(true);
    expect(crossedLoopEnd(19, 19.5, range)).toBe(false);
    // Saltar más allá de B a propósito no vuelve a A.
    expect(crossedLoopEnd(25, 25.1, range)).toBe(false);
  });
});
