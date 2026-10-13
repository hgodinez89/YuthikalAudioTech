import { describe, expect, it } from "vitest";
import {
  clampVideoWidth,
  parseStoredWidth,
  resizedWidth,
  VIDEO_LARGE_WIDTH,
  VIDEO_MIN_WIDTH,
} from "./video-size";

describe("clampVideoWidth / parseStoredWidth", () => {
  it("nunca baja del mínimo de YouTube", () => {
    expect(clampVideoWidth(200)).toBe(VIDEO_MIN_WIDTH);
    expect(clampVideoWidth(512.4)).toBe(512);
  });

  it("migra los tamaños viejos y valores inválidos", () => {
    expect(parseStoredWidth("sm")).toBe(VIDEO_MIN_WIDTH);
    expect(parseStoredWidth("lg")).toBe(VIDEO_LARGE_WIDTH);
    expect(parseStoredWidth("640")).toBe(640);
    expect(parseStoredWidth(null)).toBe(VIDEO_MIN_WIDTH);
    expect(parseStoredWidth("abc")).toBe(VIDEO_MIN_WIDTH);
  });
});

describe("resizedWidth — el asa está en la esquina libre", () => {
  it("anclada abajo-derecha: crece hacia arriba-izquierda", () => {
    expect(resizedWidth(400, -100, 0, "br")).toBe(500);
    expect(resizedWidth(400, 50, 0, "br")).toBe(356);
    expect(resizedWidth(400, 0, -90, "br")).toBe(560); // 90 × 16/9
  });

  it("anclada arriba-izquierda: crece hacia abajo-derecha", () => {
    expect(resizedWidth(400, 100, 0, "tl")).toBe(500);
    expect(resizedWidth(400, 0, 45, "tl")).toBe(480);
  });

  it("usa el eje con más movimiento", () => {
    // horizontal 20 vs vertical 18×16/9 = 32 → gana el vertical
    expect(resizedWidth(400, -20, -18, "br")).toBe(432);
  });
});
