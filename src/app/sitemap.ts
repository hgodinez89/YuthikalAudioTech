import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { chordSlug } from "@/lib/chord-search";
import { DB_KEYS } from "@/lib/chords";
import { INSTRUMENTS, isFretted, type Instrument } from "@/lib/instruments";
import { PIANO_SUFFIXES } from "@/lib/piano";
import { SCALES, scaleSlug } from "@/lib/scales";
import { SITE_URL } from "@/lib/site";
import { supabaseServer } from "@/lib/supabase";

export const revalidate = 86400;

type CatalogChord = { key: string; suffix: string };

/** Acordes del catálogo público; si la BD no responde se omiten (no rompe el build). */
async function catalogChords(instrument: "guitar" | "ukulele"): Promise<CatalogChord[]> {
  const { data, error } = await supabaseServer()
    .from("chords")
    .select("key,suffix")
    .eq("instrument", instrument);
  return error ? [] : (data ?? []);
}

/**
 * Secciones públicas por instrumento, en cada idioma y con sus alternativas
 * (hreflang). Las canciones son de cada usuario y no entran.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [guitar, ukulele] = await Promise.all([
    catalogChords("guitar"),
    catalogChords("ukulele"),
  ]);
  const catalog = { guitar, ukulele };
  // Piano: catálogo de guitarra, solo los tipos con voicing de teclado.
  const chordsOf = (instrument: Instrument) =>
    isFretted(instrument)
      ? catalog[instrument]
      : catalog.guitar.filter((c) => PIANO_SUFFIXES.includes(c.suffix));

  const paths = [
    "",
    ...INSTRUMENTS.flatMap((instrument) => [
      `/${instrument}/basics`,
      ...(isFretted(instrument) ? [`/${instrument}/basics/tuner`] : []),
      `/${instrument}/chords`,
      ...DB_KEYS.flatMap((key) =>
        SCALES.map(({ id }) => `/${instrument}/scales/${scaleSlug(key, id)}`),
      ),
      ...chordsOf(instrument).map(
        (c) => `/${instrument}/chords/${chordSlug(c.key, c.suffix)}`,
      ),
    ]),
  ];

  return paths.flatMap((path) => {
    const languages = Object.fromEntries(
      locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
    );
    return locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      alternates: { languages },
    }));
  });
}
