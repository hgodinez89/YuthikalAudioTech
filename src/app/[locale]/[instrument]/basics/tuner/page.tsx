import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BasicsTabs } from "@/components/basics-tabs";
import { Tuner } from "@/components/tuner";
import { isFretted, isInstrument } from "@/lib/instruments";
import { localeAlternates } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}): Promise<Metadata> {
  const { locale, instrument } = await params;
  const t = await getTranslations({ locale, namespace: "tuner" });
  const tInstruments = await getTranslations({ locale, namespace: "instruments" });
  return {
    title: `${t("title")} · ${tInstruments(`${instrument}.name`)} — Yuthikal AudioTech`,
    description: t("intro"),
    alternates: localeAlternates(locale, `/${instrument}/basics/tuner`),
  };
}

/** Afinador (Básicos → Afinador): solo guitarra y ukelele; página estática. */
export default async function TunerPage({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}) {
  const { locale, instrument } = await params;
  setRequestLocale(locale);
  if (!isInstrument(instrument) || !isFretted(instrument)) notFound();
  const t = await getTranslations("basics");
  const tInstruments = await getTranslations("instruments");

  return (
    <div className="mx-auto max-w-[980px] px-5 pb-[90px] pt-10 sm:px-7">
      <div className="mb-8">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.22em] text-accent">
          {t("eyebrow", { instrument: tInstruments(`${instrument}.name`) })}
        </div>
        <h1 className="mb-5 text-4xl font-extrabold tracking-[-0.025em]">{t("title")}</h1>
        <BasicsTabs instrument={instrument} current="tuner" />
      </div>
      <Tuner instrument={instrument} />
    </div>
  );
}
