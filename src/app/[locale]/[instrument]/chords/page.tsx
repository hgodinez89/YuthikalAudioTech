import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChordFinder } from "@/components/chord-finder";
import { fetchChords } from "@/lib/chord-query";
import type { Instrument } from "@/lib/instruments";
import { localeAlternates } from "@/lib/site";
import { supabaseServer } from "@/lib/supabase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}): Promise<Metadata> {
  const { locale, instrument } = await params;
  const t = await getTranslations({ locale, namespace: "finder" });
  const tInstruments = await getTranslations({ locale, namespace: "instruments" });
  return {
    title: `${t("title")} · ${tInstruments(`${instrument}.name`)} — Yuthikal AudioTech`,
    alternates: localeAlternates(locale, `/${instrument}/chords`),
  };
}

export default async function ChordFinderPage({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}) {
  const { locale, instrument: rawInstrument } = await params;
  setRequestLocale(locale);
  // El layout del instrumento ya validó el segmento.
  const instrument = rawInstrument as Instrument;
  // Primera página en el HTML: título y tarjetas se pintan sin esperar al JS.
  const initial = await fetchChords(supabaseServer(), instrument, "", "cat", 0);
  return <ChordFinder key={instrument} instrument={instrument} initial={initial} />;
}
