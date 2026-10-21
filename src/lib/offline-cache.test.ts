import { describe, expect, it } from "vitest";
import { isOfflineCacheable } from "./offline-cache";

describe("isOfflineCacheable", () => {
  it("guarda portada, inicio y referencia pública", () => {
    for (const ok of [
      "/es",
      "/en/",
      "/es/home",
      "/es/guitar/basics",
      "/es/guitar/basics/tuner",
      "/en/piano/scales/c-major",
      "/es/ukulele/chords",
      "/es/guitar/chords/c-major",
    ]) {
      expect(isOfflineCacheable(ok)).toBe(true);
    }
  });

  it("nunca canciones, login ni rutas desconocidas", () => {
    for (const no of [
      "/es/guitar/songs",
      "/es/guitar/songs/00000000-0000-4000-8000-000000000001",
      "/es/guitar/songs/chords",
      "/es/login",
      "/auth/callback",
      "/api/keepalive",
      "/es/bass/basics",
      "/fr/guitar/basics",
      "/es/offline",
    ]) {
      expect(isOfflineCacheable(no)).toBe(false);
    }
  });
});
