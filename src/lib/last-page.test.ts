import { describe, expect, it } from "vitest";
import { lastPageParts, safeLastPage } from "./last-page";

describe("safeLastPage", () => {
  it("acepta páginas de un instrumento, con query simple", () => {
    expect(safeLastPage("/guitar/basics")).toBe("/guitar/basics");
    expect(safeLastPage("/piano/scales/c-major")).toBe("/piano/scales/c-major");
    expect(safeLastPage("/ukulele/songs?list=00000000-0000-4000-8000-000000000001")).toBe(
      "/ukulele/songs?list=00000000-0000-4000-8000-000000000001",
    );
    expect(safeLastPage("/guitar/songs/abc-123?mode=edit&step=audio")).toBe(
      "/guitar/songs/abc-123?mode=edit&step=audio",
    );
  });

  it("rechaza lo que no es una página propia de instrumento", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "/",
      "/home",
      "/login",
      "/bass/basics",
      "guitar/basics",
      "//evil.com/guitar",
      "/guitar//evil.com",
      "https://evil.com/guitar",
      "/guitar\\evil",
      "/guitar/basics#x",
      "/guitar/ basics",
      `/guitar/${"a".repeat(300)}`,
    ]) {
      expect(safeLastPage(bad)).toBeNull();
    }
  });
});

describe("lastPageParts", () => {
  it("separa instrumento y sección", () => {
    expect(lastPageParts("/guitar/scales/c-major")).toEqual({
      instrument: "guitar",
      section: "scales",
    });
    expect(lastPageParts("/piano/songs?list=x")).toEqual({
      instrument: "piano",
      section: "songs",
    });
  });

  it("sin sección conocida, null; ruta inválida, null", () => {
    expect(lastPageParts("/guitar/otra")).toEqual({
      instrument: "guitar",
      section: null,
    });
    expect(lastPageParts("//evil.com")).toBeNull();
  });
});
