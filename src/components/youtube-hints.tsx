"use client";

import { preconnect, preload } from "react-dom";

/**
 * Avisos al navegador cuando el modo va a usar YouTube (sincronizar, tocar):
 * abre las conexiones y empieza a bajar la API mientras la página hidrata,
 * en vez de esperar a que el motor de audio inserte el script.
 */
export function YouTubeHints() {
  preconnect("https://www.youtube.com");
  preconnect("https://i.ytimg.com");
  preload("https://www.youtube.com/iframe_api", { as: "script" });
  return null;
}
