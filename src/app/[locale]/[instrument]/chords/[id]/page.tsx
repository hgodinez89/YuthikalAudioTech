import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ChordDetailView } from "@/components/chord-detail-view";
import { type ChordPositionRow, type ChordRow } from "@/lib/chords";
import { dbError } from "@/lib/db-error";
import { catalogInstrument, chordDbId, isFretted, isInstrument } from "@/lib/instruments";
import { pianoChord } from "@/lib/piano";
import { localeAlternates } from "@/lib/site";
import { supabaseServer } from "@/lib/supabase";

/* Cada acorde se genera estático la primera vez que alguien lo visita y queda
   en caché (el catálogo no cambia entre despliegues). */
export function generateStaticParams() {
  return [];
}

/* Cacheado por request: lo comparten generateMetadata y la página. Resolverlo
   en metadata garantiza un 404 real antes de que inicie el streaming. */
const getChord = cache(async (instrument: string, slug: string) => {
  if (!isInstrument(instrument)) return null;
  const { data, error, status } = await supabaseServer()
    .from("chords")
    .select("*")
    .eq("id", chordDbId(instrument, slug))
    .eq("instrument", catalogInstrument(instrument))
    .maybeSingle<ChordRow>();
  // Un fallo no es un 404 (que además quedaría en caché): se lanza.
  if (error) throw dbError(error, status);
  // Piano: solo los tipos que tienen voicing de teclado.
  if (data && !isFretted(instrument) && !pianoChord(data.key, data.suffix)) return null;
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; instrument: string; id: string }>;
}): Promise<Metadata> {
  const { locale, instrument, id } = await params;
  const chord = await getChord(instrument, id);
  if (!chord) notFound();
  const tInstruments = await getTranslations({ locale, namespace: "instruments" });
  return {
    title: `${chord.name_en} · ${chord.name_es} (${tInstruments(`${instrument}.name`)}) — Yuthikal AudioTech`,
    alternates: localeAlternates(locale, `/${instrument}/chords/${id}`),
  };
}

export default async function ChordDetailPage({
  params,
}: {
  params: Promise<{ locale: string; instrument: string; id: string }>;
}) {
  const { locale, instrument, id } = await params;
  setRequestLocale(locale);
  const piano = isInstrument(instrument) && !isFretted(instrument);

  const [chord, { data: positions, error: positionsError, status }] = await Promise.all([
    getChord(instrument, id),
    piano
      ? Promise.resolve({ data: [] as ChordPositionRow[], error: null, status: 200 })
      : supabaseServer()
          .from("chord_positions")
          .select("position,base_fret,frets,fingers,barres,capo")
          .eq("chord_id", isInstrument(instrument) ? chordDbId(instrument, id) : id)
          .order("position")
          .returns<ChordPositionRow[]>(),
  ]);

  if (positionsError) throw dbError(positionsError, status);
  if (!chord || !isInstrument(instrument) || (!piano && !positions?.length)) notFound();

  return (
    <ChordDetailView instrument={instrument} chord={chord} positions={positions ?? []} />
  );
}
