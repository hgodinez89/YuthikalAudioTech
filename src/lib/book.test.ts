import { describe, expect, it } from "vitest";
import {
  bookLayout,
  clampStart,
  clampZoom,
  pageAt,
  PAGE_PADDING,
  PAGE_SPACING,
  stepZoom,
  turnPage,
} from "./book";

describe("zoom", () => {
  it("se limita a 70 %–200 % en pasos de 10 %", () => {
    expect(clampZoom(0.5)).toBe(0.7);
    expect(clampZoom(2.4)).toBe(2);
    expect(clampZoom(1.04)).toBe(1);
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(0.7, -1)).toBe(0.7);
    expect(stepZoom(1.9, 1)).toBe(2);
  });
});

describe("bookLayout", () => {
  it("tantas páginas como quepan, menos con más zoom", () => {
    expect(bookLayout(1800, 1).visible).toBe(4);
    expect(bookLayout(1800, 2).visible).toBe(2);
    expect(bookLayout(900, 1).visible).toBe(2);
    expect(bookLayout(300, 1).visible).toBe(1);
  });

  it("las tarjetas y separaciones llenan exactamente el ancho", () => {
    const { visible, cardWidth, stride, columnGap } = bookLayout(1500, 1);
    expect(visible * cardWidth + (visible - 1) * PAGE_SPACING).toBeCloseTo(1500);
    expect(stride).toBeCloseTo(cardWidth + PAGE_SPACING);
    // columna dentro de su tarjeta: el paso entre columnas coincide con el de tarjetas
    expect(cardWidth - 2 * PAGE_PADDING + columnGap).toBeCloseTo(stride);
  });
});

describe("navegación", () => {
  it("pageAt ubica la página por posición horizontal", () => {
    const stride = 500;
    expect(pageAt(PAGE_PADDING, stride)).toBe(0);
    expect(pageAt(PAGE_PADDING + stride, stride)).toBe(1);
    expect(pageAt(PAGE_PADDING + 2 * stride + 120, stride)).toBe(2);
  });

  it("clampStart no deja huecos al final", () => {
    expect(clampStart(-2, 7, 2)).toBe(0);
    expect(clampStart(6, 7, 2)).toBe(5);
    expect(clampStart(3, 2, 3)).toBe(0);
  });

  it("turnPage avanza y retrocede todas las páginas visibles", () => {
    expect(turnPage(0, 7, 2, 1)).toBe(2);
    expect(turnPage(4, 7, 2, 1)).toBe(5); // última vista llena: 6 y 7
    expect(turnPage(5, 7, 2, -1)).toBe(3);
    expect(turnPage(1, 7, 2, -1)).toBe(0);
  });
});
