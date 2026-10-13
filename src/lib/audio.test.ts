import { describe, expect, it } from "vitest";
import { clampTime, reviewStart, stepRate } from "./audio";

describe("clampTime", () => {
  it("limita entre 0 y la duración", () => {
    expect(clampTime(-4, 100)).toBe(0);
    expect(clampTime(120, 100)).toBe(100);
    expect(clampTime(42, 100)).toBe(42);
  });

  it("sin duración conocida solo evita negativos", () => {
    expect(clampTime(500, 0)).toBe(500);
    expect(clampTime(-1, 0)).toBe(0);
  });
});

describe("reviewStart", () => {
  it("3 s antes de la última marca anterior al cursor", () => {
    const stamps = new Map([
      [0, 10],
      [1, 15.5],
      [2, 22],
    ]);
    expect(reviewStart(stamps, 2)).toBe(12.5);
    expect(reviewStart(stamps, 3)).toBe(19);
  });

  it("sin marcas previas o cerca del inicio, desde 0", () => {
    expect(reviewStart(new Map(), 0)).toBe(0);
    expect(reviewStart(new Map([[0, 1.2]]), 1)).toBe(0);
  });
});

describe("stepRate", () => {
  const RATES = [0.5, 0.75, 1, 1.25];
  it("avanza y retrocede sin salirse de la lista", () => {
    expect(stepRate(RATES, 1, 1)).toBe(1.25);
    expect(stepRate(RATES, 1.25, 1)).toBe(1.25);
    expect(stepRate(RATES, 0.75, -1)).toBe(0.5);
    expect(stepRate(RATES, 0.5, -1)).toBe(0.5);
  });

  it("si la velocidad actual no está en la lista, parte de 1×", () => {
    expect(stepRate(RATES, 1.1, 1)).toBe(1.25);
  });
});
