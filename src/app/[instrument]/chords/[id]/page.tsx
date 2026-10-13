import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cache } from "react";
import { ChordDiagram } from "@/components/chord-diagram";
import {
  printableSuffix,
  ROOT_LONG_ES,
  ROOT_SHORT_ES,
  suffixEs,
  type ChordPositionRow,
  type ChordRow,
} from "@/lib/chords";
import { PianoChordHero, PianoInversions } from "@/components/piano-chord";
import { catalogInstrument, chordDbId, isFretted, isInstrument } from "@/lib/instruments";
import {
  pianoChord,
  pianoIntervalLabels,
  pianoInversions,
  pianoNoteNames,
} from "@/lib/piano";
import { supabaseServer } from "@/lib/supabase";

/* Cacheado por request: lo comparten generateMetadata y la página. Resolverlo
   en metadata garantiza un 404 real antes de que inicie el streaming. */
const getChord = cache(async (instrument: string, slug: string) => {
  if (!isInstrument(instrument)) return null;
  const { data } = await supabaseServer()
    .from("chords")
    .select("*")
    .eq("id", chordDbId(instrument, slug))
    .eq("instrument", catalogInstrument(instrument))
    .maybeSingle<ChordRow>();
  // Piano: solo los tipos que tienen voicing de teclado.
  if (data && !isFretted(instrument) && !pianoChord(data.key, data.suffix)) return null;
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ instrument: string; id: string }>;
}): Promise<Metadata> {
  const { instrument, id } = await params;
  const chord = await getChord(instrument, id);
  if (!chord) notFound();
  const tInstruments = await getTranslations("instruments");
  return {
    title: `${chord.name_en} · ${chord.name_es} (${tInstruments(`${instrument}.name`)}) — Yuthikal AudioTech`,
  };
}

/** Nombre en cifrado con el sufijo en cian: A#7, Sib7… */
function ChordName({ root, suffix }: { root: string; suffix: string }) {
  return (
    <>
      {root}
      {suffix && <span className="text-accent">{suffix}</span>}
    </>
  );
}

export default async function ChordDetailPage({
  params,
}: {
  params: Promise<{ instrument: string; id: string }>;
}) {
  const { instrument, id } = await params;
  const t = await getTranslations("chordDetail");
  const tFinder = await getTranslations("finder");
  const tPiano = await getTranslations("piano");
  const locale = await getLocale();
  const piano = isInstrument(instrument) && !isFretted(instrument);

  const [chord, { data: positions }] = await Promise.all([
    getChord(instrument, id),
    piano
      ? Promise.resolve({ data: [] as ChordPositionRow[] })
      : supabaseServer()
          .from("chord_positions")
          .select("position,base_fret,frets,fingers,barres,capo")
          .eq("chord_id", isInstrument(instrument) ? chordDbId(instrument, id) : id)
          .order("position")
          .returns<ChordPositionRow[]>(),
  ]);

  if (!chord || (!piano && !positions?.length)) notFound();

  const suffix = printableSuffix(chord.suffix);
  const hero = positions?.[0];
  const pianoData = piano ? pianoChord(chord.key, chord.suffix) : null;

  return (
    <div className="mx-auto max-w-[1080px] px-7 pb-[90px] pt-6">
      <Link
        href={`/${instrument}/chords`}
        className="mb-6 inline-flex items-center gap-2 text-[13px] text-tert hover:text-ink"
      >
        <ChevronLeft size={15} strokeWidth={2} />
        {t("backToFinder")}
      </Link>

      {/* CABECERA */}
      <div className="flex flex-wrap items-start gap-7 border-b border-edge pb-[30px]">
        {/* Diagrama destacado */}
        <div className="relative flex flex-col items-center rounded-[20px] border border-edge-2 bg-surface px-[26px] pb-[18px] pt-[22px] shadow-[0_20px_50px_rgba(46,107,240,0.14)] dark:bg-[linear-gradient(180deg,#12151c,#0e1118)]">
          {pianoData ? (
            <>
              <span className="mb-3 self-start rounded-full border border-accent/35 px-[9px] py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                {tPiano("inversion.0")}
              </span>
              <PianoChordHero chordKey={chord.key} suffix={chord.suffix} />
            </>
          ) : (
            hero && (
              <>
                <span className="absolute right-3.5 top-3 rounded-full border border-accent/35 px-[9px] py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                  {t("mostUsed")}
                </span>
                <div className="pb-2 pt-1">
                  <ChordDiagram
                    frets={hero.frets}
                    barres={hero.barres}
                    baseFret={hero.base_fret}
                    scale={1.5}
                  />
                </div>
                <span className="text-[12.5px] font-semibold text-sub">
                  {t("position", { n: 1, fret: hero.base_fret })}
                </span>
              </>
            )
          )}
        </div>

        {/* Nombres y metadatos */}
        <div className="min-w-[260px] flex-1">
          <div className="mb-3.5 flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full border border-accent/[0.28] bg-accent/[0.08] px-[13px] py-[5px] text-xs font-bold tracking-[0.04em] text-accent">
              {tFinder(`categories.${chord.category}`)}
            </span>
          </div>
          <h1 className="text-[42px] font-extrabold leading-none tracking-[-0.03em] md:text-[56px]">
            <ChordName root={chord.key} suffix={suffix} />{" "}
            <span className="font-medium text-disabled">/</span>{" "}
            <ChordName root={ROOT_SHORT_ES[chord.key]} suffix={suffix} />
          </h1>
          <p className="mt-2 text-sub">
            {ROOT_LONG_ES[chord.key]} —{" "}
            <span className="font-semibold text-ink">{suffixEs(chord)}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-[22px]">
            {[
              [
                t("notes"),
                (pianoData ? pianoNoteNames(pianoData, "en") : chord.notes).join(" · "),
              ],
              [
                t("intervals"),
                (pianoData ? pianoIntervalLabels(pianoData) : chord.intervals).join(
                  " · ",
                ),
              ],
              pianoData
                ? [
                    tPiano("inversionsTitle"),
                    tPiano("inversionsCount", { n: pianoInversions(pianoData).length }),
                  ]
                : [
                    t("positionsMeta"),
                    t("positionsOnNeck", { n: positions?.length ?? 0 }),
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
          {/* Voicing práctico: qué grado se omite al tocarlo con una mano */}
          {pianoData && pianoData.omitted.length > 0 && (
            <p className="mt-4 max-w-[480px] rounded-[10px] border border-accent/20 bg-accent/[0.06] px-3 py-2 text-[12.5px] text-sub">
              {tPiano("practicalVoicing", {
                count: pianoData.omitted.length,
                // "la 5.ª y la 9.ª" / "the 5th and the 9th"
                degrees: new Intl.ListFormat(locale, { type: "conjunction" }).format(
                  pianoData.omitted.map((d) => tPiano(`degree.${d}`)),
                ),
              })}
            </p>
          )}
        </div>
      </div>

      {pianoData ? (
        <PianoInversions chordKey={chord.key} suffix={chord.suffix} />
      ) : (
        <>
          {/* POSICIONES */}
          <div className="mb-[18px] mt-[30px]">
            <h2 className="text-lg font-bold">
              {t("positionsTitle")}{" "}
              <span className="text-sm font-medium text-mute">
                · {t("positionsSubtitle")}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3.5">
            {(positions ?? []).map((p) => (
              <article
                key={p.position}
                className="relative flex flex-col items-center rounded-2xl border border-edge bg-surface px-3 pb-4 pt-[18px] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-accent"
              >
                <div className="mb-2 flex w-full items-center justify-between">
                  <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full border border-edge-2 bg-surface-2 px-[7px] text-[11.5px] font-bold">
                    {p.position}
                  </span>
                  {p.barres.length > 0 && (
                    <span className="rounded-full border border-accent/40 px-[7px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-accent">
                      {t("barre")}
                    </span>
                  )}
                </div>
                <div className="pb-2.5 pt-1">
                  <ChordDiagram
                    frets={p.frets}
                    barres={p.barres}
                    baseFret={p.base_fret}
                  />
                </div>
                <span className="text-[12.5px] font-semibold text-sub">
                  {t("position", { n: p.position, fret: p.base_fret })}
                </span>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
