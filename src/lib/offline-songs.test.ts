import { describe, expect, it } from "vitest";
import {
  clockDuration,
  coverage,
  EMPTY_SCOPE,
  parseSongsHash,
  planRefresh,
  setlistOrder,
  songsHash,
  songVersion,
  tidyScope,
  wantedIds,
} from "./offline-songs";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const ROCK = "44444444-4444-4444-8444-444444444444";

const list = [
  { id: A, playlist_id: ROCK, version: "v1" },
  { id: B, playlist_id: ROCK, version: "v1" },
  { id: C, playlist_id: null, version: "v1" },
];

describe("coverage y wantedIds", () => {
  it("la suscripción más amplia gana", () => {
    const scope = { all: false, playlists: [ROCK], songs: [A, C] };
    expect(coverage(scope, list[0])).toBe("playlist");
    expect(coverage(scope, list[2])).toBe("song");
    expect(coverage({ ...scope, all: true }, list[2])).toBe("all");
    expect(coverage(EMPTY_SCOPE, list[0])).toBeNull();
  });

  it("una playlist incluye las canciones que se le agreguen", () => {
    const scope = { all: false, playlists: [ROCK], songs: [] };
    const later = [...list, { id: "new", playlist_id: ROCK, version: "v1" }];
    expect([...wantedIds(scope, later)]).toEqual([A, B, "new"]);
  });
});

describe("planRefresh", () => {
  const scope = { all: false, playlists: [ROCK], songs: [] };

  it("baja lo que falta o cambió y quita lo que ya no se cubre", () => {
    const stored = new Map([
      [A, "v1"],
      [B, "v0"],
      [C, "v1"],
    ]);
    expect(planRefresh(stored, list, scope, false)).toEqual({
      download: [B],
      remove: [C],
    });
  });

  it("una canción borrada se quita", () => {
    const stored = new Map([[A, "v1"]]);
    expect(planRefresh(stored, [list[1]], scope, false)).toEqual({
      download: [B],
      remove: [A],
    });
  });

  it("el refresco diario baja todo lo cubierto", () => {
    const stored = new Map([
      [A, "v1"],
      [B, "v1"],
    ]);
    expect(planRefresh(stored, list, scope, true).download).toEqual([A, B]);
  });
});

describe("songVersion", () => {
  it("cambia con la letra, la sincronización y el lugar en el setlist", () => {
    const base = {
      updated_at: "2026-01-01",
      sync_updated_at: null,
      playlist_id: ROCK,
      playlist_position: 1,
    };
    const v = songVersion(base);
    expect(songVersion({ ...base, sync_updated_at: "2026-01-02" })).not.toBe(v);
    expect(songVersion({ ...base, playlist_position: 2 })).not.toBe(v);
    expect(songVersion({ ...base })).toBe(v);
  });
});

describe("tidyScope", () => {
  it("olvida playlists y canciones que ya no existen", () => {
    expect(
      tidyScope(
        { all: false, playlists: [ROCK, "gone"], songs: [A, "gone"] },
        [ROCK],
        [A],
      ),
    ).toEqual({ all: false, playlists: [ROCK], songs: [A] });
  });
});

describe("setlistOrder", () => {
  it("por posición; sin posición al final, por fecha", () => {
    const songs = [
      { id: "c", playlist_position: null, created_at: "2026-01-02" },
      { id: "b", playlist_position: 2, created_at: "2026-01-03" },
      { id: "d", playlist_position: null, created_at: "2026-01-01" },
      { id: "a", playlist_position: 1, created_at: "2026-01-04" },
    ];
    expect(setlistOrder(songs).map((s) => s.id)).toEqual(["a", "b", "d", "c"]);
  });
});

describe("parseSongsHash y songsHash", () => {
  it("lee las mismas rutas que con conexión", () => {
    expect(parseSongsHash("#/es/guitar/songs")).toEqual({
      locale: "es",
      instrument: "guitar",
      route: { view: "list", list: null },
    });
    expect(parseSongsHash(`#/en/piano/songs?list=${ROCK}`)?.route).toEqual({
      view: "list",
      list: ROCK,
    });
    expect(parseSongsHash(`#/es/guitar/songs/${A}?mode=karaoke`)?.route).toEqual({
      view: "song",
      id: A,
      mode: "karaoke",
    });
    expect(parseSongsHash(`#/es/guitar/songs/concert?list=${ROCK}`)?.route).toEqual({
      view: "concert",
      list: ROCK,
    });
  });

  it("editar o sincronizar se abren como letra", () => {
    expect(parseSongsHash(`#/es/guitar/songs/${A}?mode=edit&step=audio`)?.route).toEqual({
      view: "song",
      id: A,
      mode: "view",
    });
  });

  it("rechaza lo que no es una ruta de canciones", () => {
    expect(parseSongsHash("#/es/bass/songs")).toBeNull();
    expect(parseSongsHash("#/es/guitar/songs/chords")).toBeNull();
    expect(parseSongsHash("#/es/guitar/songs/concert")).toBeNull();
    expect(parseSongsHash("#/es/guitar/chords")).toBeNull();
    expect(parseSongsHash("")).toBeNull();
  });

  it("ida y vuelta", () => {
    for (const route of [
      { view: "list", list: null },
      { view: "list", list: ROCK },
      { view: "song", id: A, mode: "view" },
      { view: "song", id: A, mode: "karaoke" },
      { view: "concert", list: ROCK },
    ] as const) {
      expect(parseSongsHash(songsHash("es", "ukulele", route))?.route).toEqual(route);
    }
  });
});

describe("clockDuration", () => {
  it("el fin marcado o la última marca + 4 s", () => {
    const sync = {
      song_id: A,
      granularity: "line" as const,
      stamps: [
        { i: 0, t: 3 },
        { i: 1, t: 61.5 },
      ],
      end_at: null,
    };
    expect(clockDuration(sync)).toBe(65.5);
    expect(clockDuration({ ...sync, end_at: 70 })).toBe(70);
  });
});
