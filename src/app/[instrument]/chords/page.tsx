import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChordFinder } from "@/components/chord-finder";
import { fetchChords } from "@/lib/chord-query";
import type { Instrument } from "@/lib/instruments";
import { supabaseServer } from "@/lib/supabase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ instrument: string }>;
}): Promise<Metadata> {
  const { instrument } = await params;
  const t = await getTranslations("finder");
  const tInstruments = await getTranslations("instruments");
  return {
    title: `${t("title")} · ${tInstruments(`${instrument}.name`)} — Yuthikal AudioTech`,
  };
}

export default async function ChordFinderPage({
  params,
}: {
  params: Promise<{ instrument: string }>;
}) {
  // El layout del instrumento ya validó el segmento.
  const instrument = (await params).instrument as Instrument;
  // Primera página en el HTML: título y tarjetas se pintan sin esperar al JS.
  const initial = await fetchChords(supabaseServer(), instrument, "", "cat", 0);
  return <ChordFinder key={instrument} instrument={instrument} initial={initial} />;
}
