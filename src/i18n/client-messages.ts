import type { AbstractIntlMessages } from "next-intl";

/*
 * Textos que viajan al navegador. Los componentes de servidor leen todos con
 * getTranslations; los de cliente (useTranslations) solo ven estos, así cada
 * pantalla manda lo que usa y no el archivo entero (~25 KB por idioma).
 * Un test verifica que todo namespace de useTranslations esté en algún grupo.
 */

/** En todas las páginas: header, menú, login, errores, 404 y carga. */
export const COMMON_NAMESPACES = [
  "header",
  "nav",
  "auth",
  "instruments",
  "loading",
  "errorDb",
  "notFound",
];

/** Además de los comunes, por sección del instrumento (su layout los agrega). */
export const SECTION_NAMESPACES = {
  chords: ["finder", "piano"],
  scales: ["scales"],
  basics: ["pianoBasics"],
  songs: [
    "songs",
    "playlists",
    "editor",
    "calibration",
    "player",
    "songView",
    "karaoke",
    "book",
  ],
} as const;

export type Section = keyof typeof SECTION_NAMESPACES;

export function clientMessages(
  messages: AbstractIntlMessages,
  section?: Section,
): AbstractIntlMessages {
  const names = [...COMMON_NAMESPACES, ...(section ? SECTION_NAMESPACES[section] : [])];
  return Object.fromEntries(
    names.filter((n) => n in messages).map((n) => [n, messages[n]]),
  );
}
