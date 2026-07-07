import { describe, expect, it } from "vitest";
import { formatStamp, formatTime, validateStamps } from "./audio";
import { parseYouTubeId } from "./youtube";

describe("parseYouTubeId", () => {
  it("acepta las formas comunes de URL", () => {
    const id = "pWLybm_KEZM";
    for (const url of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtube.com/watch?v=${id}&t=42`,
      `https://youtu.be/${id}`,
      `https://youtu.be/${id}?si=abc`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://music.youtube.com/watch?v=${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/live/${id}`,
    ]) {
      expect(parseYouTubeId(url), url).toBe(id);
    }
  });

  it("rechaza dominios ajenos y basura", () => {
    for (const url of [
      "https://evil.com/watch?v=pWLybm_KEZM",
      "https://youtube.com.evil.com/watch?v=pWLybm_KEZM",
      "https://www.youtube.com/watch?v=corto",
      "javascript:alert(1)",
      "no es una url",
      "",
    ]) {
      expect(parseYouTubeId(url), url).toBeNull();
    }
  });
});

describe("validateStamps", () => {
  it("acepta lista válida", () => {
    expect(
      validateStamps([
        { i: 0, t: 1.2 },
        { i: 1, t: 5 },
      ]),
    ).toBe(true);
    expect(validateStamps([])).toBe(true);
  });

  it("rechaza índices duplicados, negativos o tiempos inválidos", () => {
    expect(
      validateStamps([
        { i: 0, t: 1 },
        { i: 0, t: 2 },
      ]),
    ).toBe(false);
    expect(validateStamps([{ i: -1, t: 1 }])).toBe(false);
    expect(validateStamps([{ i: 0, t: NaN }])).toBe(false);
    expect(validateStamps([{ i: 0.5, t: 1 }])).toBe(false);
    expect(validateStamps("x")).toBe(false);
  });
});

describe("formato de tiempos", () => {
  it("formatStamp con décimas", () => {
    expect(formatStamp(12.42)).toBe("0:12.4");
    expect(formatStamp(83.4)).toBe("1:23.4");
  });

  it("formatTime mm:ss", () => {
    expect(formatTime(72)).toBe("1:12");
    expect(formatTime(9)).toBe("0:09");
  });
});
