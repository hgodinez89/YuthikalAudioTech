import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ChordVisual } from "@/components/chord-visual";
import { ScalePicker } from "@/components/scale-picker";
import { ScaleView } from "@/components/scale-view";
import { loadChordData } from "@/lib/chord-data";
import type { Instrument } from "@/lib/instruments";
import { parseScaleSlug, scaleChords, scaleNotes, scaleSteps } from "@/lib/scales";
import { localeAlternates } from "@/lib/site";

type Params = Promise<{ locale: string; instrument: string; slug: string }>;

/* Cada escala se genera estática en su primera visita y queda en caché. */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, instrument, slug } = await params;
  const parsed = parseScaleSlug(slug);
  if (!parsed) notFound();
  const t = await getTranslations({ locale, namespace: "scales" });
  const tInstruments = await getTranslations({ locale, namespace: "instruments" });
  const lang = locale === "en" ? "en" : "es";
  const scale = scaleNotes(parsed.key, parsed.id);
  return {
    title: `${t("title", { root: scale.notes[0][lang], name: t(`name.${scale.id}`) })} · ${tInstruments(`${instrument}.name`)} — Yuthikal AudioTech`,
    alternates: localeAlternates(locale, `/${instrument}/scales/${slug}`),
  };
}

export default async function ScalePage({ params }: { params: Params }) {
  const { locale, instrument: rawInstrument, slug } = await params;
  setRequestLocale(locale);
  // El layout del instrumento ya validó el segmento.
  const instrument = rawInstrument as Instrument;
  const parsed = parseScaleSlug(slug);
  if (!parsed) notFound();

  const t = await getTranslations("scales");
  const tInstruments = await getTranslations("instruments");
  const lang = locale === "en" ? "en" : "es";
  const other = lang === "es" ? "en" : "es";

  const scale = scaleNotes(parsed.key, parsed.id);
  const chords = scaleChords(scale);
  const chordData = await loadChordData(
    instrument,
    chords.map((c) => c.catalogName),
  );
  const title = (l: "es" | "en") =>
    t("title", { root: scale.notes[0][l], name: t(`name.${scale.id}`) });

  return (
    <div className="mx-auto max-w-[1080px] px-5 pb-[90px] pt-8 sm:px-7">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-accent">
        {t("eyebrow", { instrument: tInstruments(`${instrument}.name`) })}
      </div>

      <ScalePicker instrument={instrument} current={parsed} />

      {/* CABECERA */}
      <div className="mb-8 mt-8 border-b border-edge pb-7">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.03em] md:text-[46px]">
          {title(lang)}
          {scale.notes[0][other] !== scale.notes[0][lang] && (
            <span className="ml-3 text-[0.55em] font-semibold text-mute">
              {scale.notes[0][other]}
            </span>
          )}
        </h1>
        <p className="mt-2 max-w-[640px] leading-relaxed text-sub">
          {t(`desc.${scale.id}`)}
        </p>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
          {[
            [t("notes"), scale.notes.map((n) => n[lang]).join(" · ")],
            [t("degrees"), scale.notes.map((n) => n.degree).join(" · ")],
            [
              t("formula"),
              scaleSteps(scale)
                .map((s) => t(`step.${s}`))
                .join(" "),
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
                {label}
              </div>
              <div className="text-[15px] font-semibold">{value}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-tert">{t("formulaHint")}</p>
      </div>

      <div className="flex flex-col gap-10 [&>*]:min-w-0">
        <ScaleView instrument={instrument} scale={scale} />

        {/* ACORDES DE LA ESCALA */}
        {chords.length > 0 && (
          <section>
            <h2 className="mb-1.5 text-lg font-bold">{t("chordsTitle")}</h2>
            <p className="mb-4 max-w-[660px] text-[13.5px] leading-relaxed text-sub">
              {t("chordsIntro")}
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3">
              {chords.map((chord) => {
                const data = chordData[chord.catalogName];
                return (
                  <Link
                    key={chord.roman}
                    href={`/${instrument}/chords/${chord.slug}`}
                    className="flex flex-col items-center rounded-2xl border border-edge bg-surface px-3 pb-3 pt-3 transition-colors hover:border-accent/50"
                  >
                    <span className="mb-2 self-start rounded-full border border-accent/35 px-[7px] py-[2px] text-[11px] font-bold text-accent">
                      {chord.roman}
                    </span>
                    {data && (
                      <div className="pb-2">
                        <ChordVisual chord={data} scale={0.9} />
                      </div>
                    )}
                    <span className="font-extrabold">
                      {lang === "es" ? chord.nameEs : chord.nameEn}
                    </span>
                    <span className="text-xs text-sub">
                      {lang === "es" ? chord.nameEn : chord.nameEs}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
