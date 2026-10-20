import { describe, expect, it } from "vitest";
import { printableSuffix, suffixEs } from "./chords";
import { isUuid } from "./ids";
import { validatePlaylist, type PlaylistInput } from "./playlists";
import { safeNextPath } from "./safe-path";
import { keyLabel, validateSong } from "./songs";
import { youtubeThumbnail } from "./youtube";

/* Validaciones que se repiten en el servidor (server actions y redirects). */

describe("isUuid", () => {
  it("acepta un UUID y rechaza lo demás", () => {
    expect(isUuid("3f2b8c1e-9a4d-4e2f-8b1a-0c9d7e6f5a4b")).toBe(true);
    expect(isUuid("3F2B8C1E-9A4D-4E2F-8B1A-0C9D7E6F5A4B")).toBe(true);
    expect(isUuid("------------------------------------")).toBe(false);
    expect(isUuid("3f2b8c1e9a4d4e2f8b1a0c9d7e6f5a4b")).toBe(false);
    expect(isUuid("3f2b8c1e-9a4d-4e2f-8b1a-0c9d7e6f5a4b'; drop")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});

describe("safeNextPath — solo rutas internas", () => {
  it("conserva rutas relativas", () => {
    expect(safeNextPath("/guitar/songs?list=1")).toBe("/guitar/songs?list=1");
  });

  it("cualquier otra cosa vuelve al inicio", () => {
    for (const next of [
      null,
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "guitar/songs",
    ]) {
      expect(safeNextPath(next), String(next)).toBe("/");
    }
  });
});

describe("validatePlaylist", () => {
  const ok: PlaylistInput = {
    name: "Boleros",
    description: "",
    genre: "bolero",
    genreOther: "",
    ratingLike: 4,
  };

  it("acepta una playlist válida", () => {
    expect(validatePlaylist(ok)).toBeNull();
  });

  it("nombre obligatorio y con largo máximo", () => {
    expect(validatePlaylist({ ...ok, name: "   " })).toBe("name");
    expect(validatePlaylist({ ...ok, name: "a".repeat(101) })).toBe("name");
  });

  it("género de la lista; 'otro' exige especificarlo", () => {
    expect(validatePlaylist({ ...ok, genre: "metal" })).toBe("genre");
    expect(validatePlaylist({ ...ok, genre: "other" })).toBe("genreOther");
    expect(validatePlaylist({ ...ok, genre: "other", genreOther: "Trova" })).toBeNull();
  });

  it("calificación entera de 1 a 5", () => {
    for (const ratingLike of [0, 6, 2.5, Number.NaN]) {
      expect(validatePlaylist({ ...ok, ratingLike }), String(ratingLike)).toBe("rating");
    }
  });

  it("descripción de hasta 300 caracteres", () => {
    expect(validatePlaylist({ ...ok, description: "a".repeat(301) })).toBe("description");
  });
});

describe("validateSong · playlist", () => {
  const ok = {
    name: "Bésame mucho",
    description: "",
    keyNote: "Am",
    instruments: [],
    playlistId: null,
  };

  it("playlist opcional, pero si viene debe ser un UUID", () => {
    expect(validateSong(ok)).toBeNull();
    expect(
      validateSong({ ...ok, playlistId: "3f2b8c1e-9a4d-4e2f-8b1a-0c9d7e6f5a4b" }),
    ).toBeNull();
    expect(validateSong({ ...ok, playlistId: "x" })).toBe("playlist");
  });

  it("tonalidad de la lista", () => {
    expect(validateSong({ ...ok, keyNote: "H" })).toBe("keyNote");
  });
});

describe("keyLabel", () => {
  it("nombre en español con el cifrado", () => {
    expect(keyLabel("Em")).toBe("Mi menor — Em");
    expect(keyLabel("G")).toBe("Sol — G");
    expect(keyLabel("F#m")).toBe("Fa# menor — F#m");
  });

  it("una clave desconocida se muestra tal cual", () => {
    expect(keyLabel("Xm")).toBe("Xm");
  });
});

describe("acordes · sufijos", () => {
  it("printableSuffix: como se escribe en el cifrado", () => {
    expect(printableSuffix("major")).toBe("");
    expect(printableSuffix("minor")).toBe("m");
    expect(printableSuffix("maj7")).toBe("maj7");
  });

  it("suffixEs: la cualidad del nombre en español", () => {
    expect(suffixEs({ key: "C", name_es: "Do mayor" })).toBe("mayor");
    expect(suffixEs({ key: "F#", name_es: "Fa# menor 7" })).toBe("menor 7");
  });
});

describe("youtubeThumbnail", () => {
  it("miniatura del video", () => {
    expect(youtubeThumbnail("dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });
});
