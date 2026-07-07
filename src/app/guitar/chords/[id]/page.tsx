import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { supabaseServer } from "@/lib/supabase";

/* Cacheado por request: lo comparten generateMetadata y la página. Resolverlo
   en metadata garantiza un 404 real antes de que inicie el streaming. */
const getChord = cache(async (id: string) => {
  const { data } = await supabaseServer()
    .from("chords")
    .select("*")
    .eq("id", id)
    .single<ChordRow>();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const chord = await getChord(id);
  if (!chord) notFound();
  return { title: `${chord.name_en} · ${chord.name_es} — Yuthikal AudioTech` };
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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("chordDetail");
  const tFinder = await getTranslations("finder");

  const [chord, { data: positions }] = await Promise.all([
    getChord(id),
    supabaseServer()
      .from("chord_positions")
      .select("position,base_fret,frets,fingers,barres,capo")
      .eq("chord_id", id)
      .order("position")
      .returns<ChordPositionRow[]>(),
  ]);

  if (!chord || !positions?.length) notFound();

  const suffix = printableSuffix(chord.suffix);
  const hero = positions[0];

  return (
    <div className="mx-auto max-w-[1080px] px-7 pb-[90px] pt-6">
      <Link
        href="/guitar/chords"
        className="mb-6 inline-flex items-center gap-2 text-[13px] text-tert hover:text-ink"
      >
        <ChevronLeft size={15} strokeWidth={2} />
        {t("backToFinder")}
      </Link>

      {/* CABECERA */}
      <div className="flex flex-wrap items-start gap-7 border-b border-edge pb-[30px]">
        {/* Diagrama destacado */}
        <div className="relative flex flex-col items-center rounded-[20px] border border-edge-2 bg-surface px-[26px] pb-[18px] pt-[22px] shadow-[0_20px_50px_rgba(46,107,240,0.14)] dark:bg-[linear-gradient(180deg,#12151c,#0e1118)]">
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
              [t("notes"), chord.notes.join(" · ")],
              [t("intervals"), chord.intervals.join(" · ")],
              [t("positionsMeta"), t("positionsOnNeck", { n: positions.length })],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
                  {label}
                </div>
                <div className="text-[15px] font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
        {positions.map((p) => (
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
              <ChordDiagram frets={p.frets} barres={p.barres} baseFret={p.base_fret} />
            </div>
            <span className="text-[12.5px] font-semibold text-sub">
              {t("position", { n: p.position, fret: p.base_fret })}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
