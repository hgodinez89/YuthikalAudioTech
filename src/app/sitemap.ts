import type { MetadataRoute } from "next";
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

/** Secciones públicas por instrumento; las canciones son de cada usuario y no entran. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = {
    guitar: await catalogChords("guitar"),
    ukulele: await catalogChords("ukulele"),
  };
  // Piano: catálogo de guitarra, solo los tipos con voicing de teclado.
  const chordsOf = (instrument: Instrument) =>
    isFretted(instrument)
      ? catalog[instrument]
      : catalog.guitar.filter((c) => PIANO_SUFFIXES.includes(c.suffix));

  return INSTRUMENTS.flatMap((instrument) => {
    const base = `${SITE_URL}/${instrument}`;
    return [
      `${base}/basics`,
      `${base}/chords`,
      ...DB_KEYS.flatMap((key) =>
        SCALES.map(({ id }) => `${base}/scales/${scaleSlug(key, id)}`),
      ),
      ...chordsOf(instrument).map((c) => `${base}/chords/${chordSlug(c.key, c.suffix)}`),
    ].map((url) => ({ url }));
  });
}
