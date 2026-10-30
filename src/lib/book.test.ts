import { describe, expect, it } from "vitest";
import {
  bookLayout,
  clampStart,
  clampZoom,
  pageAt,
  pageTurnDirection,
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

describe("pageTurnDirection", () => {
  it("flechas, Av/Re Pág y Enter de teclados y pedales", () => {
    for (const key of ["ArrowRight", "ArrowDown", "PageDown", "Enter", "Right", "Down"]) {
      expect(pageTurnDirection({ key })).toBe(1);
    }
    for (const key of ["ArrowLeft", "ArrowUp", "PageUp", "Left", "Up"]) {
      expect(pageTurnDirection({ key })).toBe(-1);
    }
  });

  it("los nombres de iPadOS para las flechas", () => {
    expect(pageTurnDirection({ key: "UIKeyInputRightArrow" })).toBe(1);
    expect(pageTurnDirection({ key: "UIKeyInputDownArrow" })).toBe(1);
    expect(pageTurnDirection({ key: "UIKeyInputLeftArrow" })).toBe(-1);
    expect(pageTurnDirection({ key: "UIKeyInputUpArrow" })).toBe(-1);
  });

  it("sin `key` (o «Unidentified»): por `code` o por el código numérico", () => {
    expect(pageTurnDirection({ key: "Unidentified", code: "ArrowRight" })).toBe(1);
    expect(pageTurnDirection({ code: "PageUp" })).toBe(-1);
    expect(pageTurnDirection({ key: "", keyCode: 39 })).toBe(1);
    expect(pageTurnDirection({ keyCode: 38 })).toBe(-1);
    expect(pageTurnDirection({ keyCode: 32, shiftKey: true })).toBe(-1);
  });

  it("Espacio: adelante, con Mayús atrás", () => {
    expect(pageTurnDirection({ key: " " })).toBe(1);
    expect(pageTurnDirection({ key: " ", shiftKey: true })).toBe(-1);
  });

  it("Enter y Espacio sobre un botón son del botón (sin doble salto)", () => {
    expect(pageTurnDirection({ key: "Enter" }, true)).toBeNull();
    expect(pageTurnDirection({ key: " " }, true)).toBeNull();
    // Las flechas sí pasan de página aunque haya un botón enfocado.
    expect(pageTurnDirection({ key: "ArrowRight" }, true)).toBe(1);
  });

  it("otras teclas no pasan de página", () => {
    expect(pageTurnDirection({ key: "a" })).toBeNull();
    expect(pageTurnDirection({ key: "Home" })).toBeNull();
    expect(pageTurnDirection({})).toBeNull();
  });
});
