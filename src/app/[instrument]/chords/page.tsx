import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChordFinder } from "@/components/chord-finder";
import type { Instrument } from "@/lib/instruments";

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
  return <ChordFinder key={instrument} instrument={instrument} />;
}
