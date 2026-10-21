import type { Instrument, Section } from "./instruments";

/** Escala con la que abre la sección (Do mayor). */
export const DEFAULT_SCALE_SLUG = "c-major";

/**
 * Enlace a una sección del instrumento. Escalas apunta directo a su escala
 * por defecto: /scales redirige, y esa ida y vuelta se nota al entrar.
 * Liviano a propósito (lo usan el header y la barra inferior en cada página).
 */
export function sectionHref(instrument: Instrument, section: Section): string {
  return section === "scales"
    ? `/${instrument}/scales/${DEFAULT_SCALE_SLUG}`
    : `/${instrument}/${section}`;
}
