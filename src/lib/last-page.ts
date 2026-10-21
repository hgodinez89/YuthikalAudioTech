import { isInstrument, SECTIONS, type Instrument, type Section } from "./instruments";

/** Última página visitada (sin idioma): al volver al sitio se abre ahí. */
export const LAST_PAGE_COOKIE = "yk-last";

/* Ruta de la app con query simple: /guitar/songs/<id>?mode=edit&step=audio.
   Sin "//", "\", esquemas, espacios ni fragmentos. */
const PATH = /^(\/[\w-]+)+\/?(\?[\w=&%-]*)?$/;

/**
 * La ruta guardada si es una página propia de un instrumento; si no, null.
 * El proxy redirige con ella: nunca debe poder apuntar fuera del sitio.
 */
export function safeLastPage(value: string | null | undefined): string | null {
  if (!value || value.length > 300 || !PATH.test(value)) return null;
  return isInstrument(value.split(/[/?]/)[1]) ? value : null;
}

/** Instrumento y sección de una ruta ya validada (la sección, si es conocida). */
export function lastPageParts(
  path: string,
): { instrument: Instrument; section: Section | null } | null {
  const safe = safeLastPage(path);
  if (!safe) return null;
  const [, instrument, section] = safe.split("?")[0].split("/");
  return {
    instrument: instrument as Instrument,
    section: SECTIONS.includes(section as Section) ? (section as Section) : null,
  };
}
