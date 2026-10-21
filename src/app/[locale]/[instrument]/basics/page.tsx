import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BasicsTabs } from "@/components/basics-tabs";
import { InstrumentStrings } from "@/components/instrument-strings";
import { MusicalNotes } from "@/components/musical-notes";
import { PianoBasics } from "@/components/piano-basics";
import { isFretted, type Instrument } from "@/lib/instruments";
import { localeAlternates } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}): Promise<Metadata> {
  const { locale, instrument } = await params;
  const t = await getTranslations({ locale, namespace: "basics" });
  const tInstruments = await getTranslations({ locale, namespace: "instruments" });
  return {
    title: `${t("title")} · ${tInstruments(`${instrument}.name`)} — Yuthikal AudioTech`,
    alternates: localeAlternates(locale, `/${instrument}/basics`),
  };
}

export default async function BasicsPage({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}) {
  const { locale, instrument: rawInstrument } = await params;
  setRequestLocale(locale);
  // El layout del instrumento ya validó el segmento.
  const instrument = rawInstrument as Instrument;
  const t = await getTranslations("basics");
  const tInstruments = await getTranslations("instruments");

  return (
    <div className="mx-auto max-w-[980px] px-5 pb-[90px] pt-10 sm:px-7">
      <div className="mb-8">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.22em] text-accent">
          {t("eyebrow", { instrument: tInstruments(`${instrument}.name`) })}
        </div>
        <h1 className="mb-5 text-4xl font-extrabold tracking-[-0.025em]">{t("title")}</h1>
        <BasicsTabs instrument={instrument} current="page" />
      </div>

      <div className="flex flex-col gap-16">
        {isFretted(instrument) ? (
          <InstrumentStrings instrument={instrument} />
        ) : (
          <PianoBasics />
        )}
        <MusicalNotes instrument={instrument} />
      </div>
    </div>
  );
}
