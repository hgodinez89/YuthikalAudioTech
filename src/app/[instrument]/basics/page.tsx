import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InstrumentStrings } from "@/components/instrument-strings";
import { MusicalNotes } from "@/components/musical-notes";
import { PianoBasics } from "@/components/piano-basics";
import { isFretted, type Instrument } from "@/lib/instruments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ instrument: string }>;
}): Promise<Metadata> {
  const { instrument } = await params;
  const t = await getTranslations("basics");
  const tInstruments = await getTranslations("instruments");
  return {
    title: `${t("title")} · ${tInstruments(`${instrument}.name`)} — Yuthikal AudioTech`,
  };
}

export default async function BasicsPage({
  params,
}: {
  params: Promise<{ instrument: string }>;
}) {
  // El layout del instrumento ya validó el segmento.
  const instrument = (await params).instrument as Instrument;
  const t = await getTranslations("basics");
  const tInstruments = await getTranslations("instruments");

  return (
    <div className="mx-auto max-w-[980px] px-5 pb-[90px] pt-10 sm:px-7">
      <div className="mb-8">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.22em] text-accent">
          {t("eyebrow", { instrument: tInstruments(`${instrument}.name`) })}
        </div>
        <h1 className="mb-5 text-4xl font-extrabold tracking-[-0.025em]">{t("title")}</h1>
        <div className="flex w-fit rounded-xl border border-edge bg-surface-2 p-1 text-[13px] font-semibold">
          {isFretted(instrument) ? (
            <a
              href="#strings"
              className="rounded-[9px] px-[15px] py-[7px] text-sub hover:text-ink"
            >
              {t("strings")}
            </a>
          ) : (
            <>
              <a
                href="#keyboard"
                className="rounded-[9px] px-[15px] py-[7px] text-sub hover:text-ink"
              >
                {t("keyboard")}
              </a>
              <a
                href="#fingers"
                className="rounded-[9px] px-[15px] py-[7px] text-sub hover:text-ink"
              >
                {t("fingers")}
              </a>
            </>
          )}
          <a
            href="#notes"
            className="rounded-[9px] px-[15px] py-[7px] text-sub hover:text-ink"
          >
            {t("notes")}
          </a>
        </div>
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
