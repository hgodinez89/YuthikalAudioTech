import { describe, expect, it } from "vitest";
import { invertPoints, mapScroll } from "./scroll-sync";

describe("mapScroll", () => {
  it("sin anclas es proporcional", () => {
    expect(mapScroll([], 1000, 500, 0)).toBe(0);
    expect(mapScroll([], 1000, 500, 400)).toBe(200);
    expect(mapScroll([], 1000, 500, 1000)).toBe(500);
  });

  it("cada sección cae en su ancla y se interpola entre ellas", () => {
    const points = [
      { from: 100, to: 300 },
      { from: 500, to: 400 },
    ];
    expect(mapScroll(points, 1000, 1000, 100)).toBe(300);
    expect(mapScroll(points, 1000, 1000, 500)).toBe(400);
    expect(mapScroll(points, 1000, 1000, 50)).toBe(150);
    expect(mapScroll(points, 1000, 1000, 300)).toBe(350);
    expect(mapScroll(points, 1000, 1000, 750)).toBe(700);
  });

  it("fuera del recorrido se acota al inicio y al final", () => {
    expect(mapScroll([], 1000, 500, -20)).toBe(0);
    expect(mapScroll([], 1000, 500, 1200)).toBe(500);
  });

  it("descarta anclas fuera del recorrido o que no avanzan; el final siempre coincide", () => {
    const points = [
      { from: 200, to: 100 },
      { from: 300, to: 90 }, // retrocede en el destino
      { from: 900, to: 600 }, // más allá del scroll máximo del destino
    ];
    expect(mapScroll(points, 1000, 500, 200)).toBe(100);
    expect(mapScroll(points, 1000, 500, 1000)).toBe(500);
    expect(mapScroll(points, 1000, 500, 600)).toBe(300);
  });

  it("sin recorrido en algún panel no hay scroll", () => {
    expect(mapScroll([], 0, 500, 100)).toBe(0);
    expect(mapScroll([], 1000, 0, 100)).toBe(0);
  });

  it("ida y vuelta devuelve la misma posición", () => {
    const points = [
      { from: 120, to: 340 },
      { from: 480, to: 610 },
      { from: 800, to: 900 },
    ];
    for (const value of [0, 60, 120, 300, 480, 700, 1000]) {
      const there = mapScroll(points, 1000, 1200, value);
      expect(mapScroll(invertPoints(points), 1200, 1000, there)).toBeCloseTo(value);
    }
  });
});
