import { describe, expect, it } from "vitest";
import {
  clampTime,
  fadeGain,
  resumePoint,
  reviewStart,
  stepRate,
  validateSyncEnd,
} from "./audio";

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

describe("resumePoint", () => {
  // Por línea: un objetivo por línea.
  const byLine = [0, 1, 2, 3].map((i) => ({ firstTarget: i, targetCount: 1 }));
  // Por palabra: líneas de 3 y 2 palabras.
  const byWord = [
    { firstTarget: 0, targetCount: 3 },
    { firstTarget: 3, targetCount: 2 },
  ];

  it("sin marcas o completa: no hay que retomar", () => {
    expect(resumePoint(new Map(), 0, byLine, 4)).toBeNull();
    const all = new Map([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
    expect(resumePoint(all, 4, byLine, 4)).toBeNull();
  });

  it("por línea: inicio de la última línea marcada", () => {
    const stamps = new Map([
      [0, 75],
      [1, 80.4],
    ]);
    expect(resumePoint(stamps, 2, byLine, 4)).toBe(80.4);
  });

  it("por palabra con la línea a medias: vuelve a su inicio", () => {
    const stamps = new Map([
      [0, 10],
      [1, 11],
      [2, 12],
      [3, 15.2],
    ]);
    expect(resumePoint(stamps, 4, byWord, 5)).toBe(15.2);
  });

  it("con marcas sueltas tras un hueco (re-marcar) manda el cursor", () => {
    const stamps = new Map([
      [0, 75],
      [2, 90],
      [3, 95],
    ]);
    expect(resumePoint(stamps, 1, byLine, 4)).toBe(75);
  });
});

describe("validateSyncEnd", () => {
  const stamps = [
    { i: 0, t: 10 },
    { i: 1, t: 20 },
  ];

  it("sin fin es válido", () => {
    expect(validateSyncEnd(null, stamps)).toBe(true);
  });

  it("debe ir después de todas las marcas", () => {
    expect(validateSyncEnd(25, stamps)).toBe(true);
    expect(validateSyncEnd(20, stamps)).toBe(false);
    expect(validateSyncEnd(15, stamps)).toBe(false);
  });

  it("rechaza valores no numéricos o no positivos", () => {
    expect(validateSyncEnd(Number.NaN, [])).toBe(false);
    expect(validateSyncEnd(-3, [])).toBe(false);
    expect(validateSyncEnd(0, [])).toBe(false);
    expect(validateSyncEnd("30", [])).toBe(false);
  });
});

describe("fadeGain", () => {
  it("sin fin no hay fundido", () => {
    expect(fadeGain(500, null)).toBe(1);
  });

  it("baja en los últimos segundos y llega a 0 en el fin", () => {
    expect(fadeGain(90, 100)).toBe(1);
    expect(fadeGain(98, 100)).toBe(1);
    expect(fadeGain(99, 100)).toBeCloseTo(0.5);
    expect(fadeGain(100, 100)).toBe(0);
    expect(fadeGain(101, 100)).toBe(0);
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
