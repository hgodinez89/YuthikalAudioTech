"use client";

import dynamic from "next/dynamic";

/*
 * Los cuatro modos de una canción, cada uno en su propio chunk: abrir la
 * canción descarga solo el modo que se usa (libro, editor, sincronizar o
 * karaoke). Se cargan desde un módulo de cliente porque `next/dynamic` en un
 * componente de servidor no divide el código.
 */
export const SongBook = dynamic(() => import("./song-book").then((m) => m.SongBook));
export const SongEditor = dynamic(() =>
  import("./song-editor").then((m) => m.SongEditor),
);
export const SongCalibration = dynamic(() =>
  import("./song-calibration").then((m) => m.SongCalibration),
);
export const SongKaraoke = dynamic(() =>
  import("./song-karaoke").then((m) => m.SongKaraoke),
);
