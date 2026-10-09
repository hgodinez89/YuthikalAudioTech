/** Instrumentos de la app: activos (con rutas) y próximos (solo vitrina). */

export const INSTRUMENTS = ["guitar", "ukulele"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export const COMING_SOON = ["piano", "bass"] as const;

export const DEFAULT_INSTRUMENT: Instrument = "guitar";
export const INSTRUMENT_COOKIE = "yk-instrument";

export function isInstrument(value: unknown): value is Instrument {
  return typeof value === "string" && INSTRUMENTS.includes(value as Instrument);
}

/** Id del catálogo para un slug de acorde: guitarra sin prefijo (ids históricos). */
export function chordDbId(instrument: Instrument, slug: string): string {
  return instrument === "guitar" ? slug : `${instrument}-${slug}`;
}

/** Secciones de cada instrumento, en el orden de la navegación. */
export const SECTIONS = ["chords", "songs", "basics"] as const;
export type Section = (typeof SECTIONS)[number];

/**
 * Ruta equivalente al cambiar de instrumento: se conserva la sección; dentro
 * de una canción se conserva la ruta completa (los diagramas cambian), y en
 * el detalle de un acorde se vuelve al buscador.
 */
export function switchInstrumentPath(pathname: string, to: Instrument): string {
  const [, , section, ...rest] = pathname.split("/");
  if (section === "songs" && rest.length) return `/${to}/songs/${rest.join("/")}`;
  if (SECTIONS.includes(section as Section)) return `/${to}/${section}`;
  return `/${to}/chords`;
}

export type TuningString = {
  num: string;
  noteEs: string;
  noteEn: string;
  /** Nombre tradicional en español (solo guitarra). */
  trad: string | null;
  /** Grosor relativo para la ilustración (1 = la más delgada). */
  th: number;
};

/** Afinación estándar, de la 1ª cuerda (la de abajo) a la última. */
export const TUNINGS: Record<Instrument, TuningString[]> = {
  guitar: [
    { num: "1ª", noteEs: "Mi", noteEn: "E", trad: "Prima", th: 1 },
    { num: "2ª", noteEs: "Si", noteEn: "B", trad: "Segunda", th: 2 },
    { num: "3ª", noteEs: "Sol", noteEn: "G", trad: "Tercera", th: 3 },
    { num: "4ª", noteEs: "Re", noteEn: "D", trad: "Cuarta", th: 4 },
    { num: "5ª", noteEs: "La", noteEn: "A", trad: "Quinta", th: 5 },
    { num: "6ª", noteEs: "Mi", noteEn: "E", trad: "Bordona", th: 6 },
  ],
  // Afinación reentrante: la 4ª (Sol) es aguda, no grave.
  ukulele: [
    { num: "1ª", noteEs: "La", noteEn: "A", trad: null, th: 1 },
    { num: "2ª", noteEs: "Mi", noteEn: "E", trad: null, th: 2 },
    { num: "3ª", noteEs: "Do", noteEn: "C", trad: null, th: 3 },
    { num: "4ª", noteEs: "Sol", noteEn: "G", trad: null, th: 2 },
  ],
};
