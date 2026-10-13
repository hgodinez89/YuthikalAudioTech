import { describe, expect, it } from "vitest";
import { copyName, normalizeInclude } from "./songs";

describe("copyName", () => {
  it("agrega el sufijo", () => {
    expect(copyName("Like a stone", "copia")).toBe("Like a stone (copia)");
  });

  it("nunca pasa de 150 caracteres", () => {
    const name = copyName("x".repeat(200), "copia");
    expect(name).toHaveLength(150);
    expect(name.endsWith(" (copia)")).toBe(true);
  });
});

describe("normalizeInclude", () => {
  it("sin audio no se copia la sincronización", () => {
    expect(normalizeInclude({ audio: false, sync: true })).toEqual({
      audio: false,
      sync: false,
    });
    expect(normalizeInclude({ audio: true, sync: true })).toEqual({
      audio: true,
      sync: true,
    });
    expect(normalizeInclude({ audio: true, sync: false })).toEqual({
      audio: true,
      sync: false,
    });
  });
});
