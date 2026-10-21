import { catalogUrl } from "./chord-catalog";
import { DB_KEYS } from "./chords";
import { isFretted, type Instrument } from "./instruments";
import { SCALES, scaleSlug } from "./scales";

/*
 * «Descargar [instrumento]»: guarda de una vez lo público de un instrumento
 * para consultarlo sin conexión (Básicos, acordes, las 144 escalas y el
 * catálogo de acordes). Las fichas de acorde salen del catálogo.
 */

/** Lo que se descarga (≈ comprimido); el navegador guarda unas 10 veces eso. */
export const DOWNLOAD_MB = 3;

/** Páginas y datos de un instrumento en un idioma. */
export function instrumentDownloadUrls(locale: string, instrument: Instrument): string[] {
  const base = `/${locale}/${instrument}`;
  return [
    `${base}/basics`,
    ...(isFretted(instrument) ? [`${base}/basics/tuner`] : []),
    `${base}/chords`,
    ...DB_KEYS.flatMap((key) =>
      SCALES.map(({ id }) => `${base}/scales/${scaleSlug(key, id)}`),
    ),
    catalogUrl(instrument),
  ];
}
