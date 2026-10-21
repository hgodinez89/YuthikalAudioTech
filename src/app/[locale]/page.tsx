import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ChordDiagram } from "@/components/chord-diagram";
import { TourChooser } from "@/components/tour-chooser";
import {
  GuitarNeck,
  InstrumentStrip,
  PianoKeys,
  TourEqualizer,
  UkuleleNeck,
} from "@/components/tour-visuals";
import { COMING_SOON, INSTRUMENTS } from "@/lib/instruments";
import { localeAlternates } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return { alternates: localeAlternates((await params).locale, "") };
}

/* Secciones de la «canción», en orden: id (ancla) y minuto en la barra. */
const SEGMENTS = [
  { id: "intro", key: "intro", time: "0:00" },
  { id: "verse1", key: "verse1", time: "0:32" },
  { id: "verse2", key: "verse2", time: "1:04" },
  { id: "bridge", key: "bridge", time: "1:36" },
  { id: "chorus", key: "chorus", time: "2:08" },
  { id: "solo", key: "solo", time: "2:40" },
  { id: "final", key: "outro", time: "3:12" },
] as const;

const SECTION_BOX = "relative overflow-hidden px-5 sm:px-8";
const SECTION_GRID =
  "relative mx-auto grid min-h-[calc(100svh-71px)] max-w-[1180px] items-center gap-10 py-28 md:grid-cols-2 md:gap-12";
const CARD = "rounded-[20px] border border-edge bg-surface-3 p-6";

/** Texto de una parte: minuto · sección · función, título y descripción. */
function Feature({
  label,
  title,
  desc,
  children,
}: {
  label: string;
  title: string;
  desc: string;
  children?: ReactNode;
}) {
  return (
    <div className="yk-tour-reveal relative flex flex-col gap-3.5">
      <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-accent">
        {label}
      </div>
      <h2 className="text-balance text-[38px] font-extrabold leading-[1.04] tracking-[-0.025em] sm:text-[48px]">
        {title}
      </h2>
      <p className="max-w-[440px] text-[17px] leading-relaxed text-sub">{desc}</p>
      {children}
    </div>
  );
}

/** Una línea de cifrado: cada acorde sobre la palabra donde cae. */
function ChordLine({ text, chords }: { text: string; chords: string[] }) {
  const words = text.split(" ");
  const at = [0, Math.floor(words.length / 2), words.length - 1].slice(0, chords.length);
  return (
    <p className="flex flex-wrap gap-x-[0.3em] text-[21px] leading-tight">
      {words.map((word, i) => (
        <span key={i} className="inline-flex flex-col">
          <span className="h-5 font-mono text-sm font-bold text-accent">
            {at.includes(i) ? chords[at.indexOf(i)] : ""}
          </span>
          {word}
        </span>
      ))}
    </p>
  );
}

/**
 * Portada: recorrido de bienvenida con forma de canción (Intro → Final) que
 * termina eligiendo instrumento. Estática; quien ya eligió instrumento no la
 * ve (el proxy lo lleva a la última página que visitó), salvo con ?tour.
 */
export default async function TourPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tour");
  const tInstruments = await getTranslations("instruments");

  const es = locale === "es";
  const notes = es
    ? ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"]
    : ["C", "D", "E", "F", "G", "A", "B"];
  const instruments = INSTRUMENTS.map((id) => ({ id, name: tInstruments(`${id}.name`) }));
  const strip = <InstrumentStrip label={t("for")} instruments={instruments} />;
  const label = (i: number, feature: string) =>
    `${SEGMENTS[i].time} · ${t(`segments.${SEGMENTS[i].key}`)} · ${feature}`;
  const lyric2 = t("lyrics.l2").split(" ");

  return (
    <>
      <main id="main" tabIndex={-1} className="yk-tour relative flex-1 outline-none">
        <TourEqualizer />

        {/* BARRA DE REPRODUCCIÓN: avanza con el scroll; cada sección, un tramo */}
        <div className="sticky top-[71px] z-30 px-5 pb-3 pt-2 [background:linear-gradient(var(--page)_75%,transparent)] sm:px-8">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-2.5">
            <div className="flex items-center justify-between gap-4">
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-mute sm:block">
                {t("nowPlaying")}
              </span>
              <a
                href="#final"
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-edge-2 px-3.5 py-1.5 text-[13px] font-semibold hover:border-accent"
              >
                {t("skip")}
                <ArrowRight size={14} strokeWidth={2.4} />
              </a>
            </div>
            <div aria-hidden className="relative h-1 rounded-full bg-edge">
              <div className="yk-tour-played yk-gradient absolute inset-y-0 left-0 rounded-full">
                <span className="absolute -right-[7px] -top-[5px] size-3.5 rounded-full bg-ink shadow-glow" />
              </div>
            </div>
            <nav aria-label={t("progress")} className="hidden sm:block">
              <ol className="grid grid-cols-7 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
                {SEGMENTS.map((s, i) => (
                  <li
                    key={s.id}
                    className={i === SEGMENTS.length - 1 ? "text-right" : ""}
                  >
                    <a
                      href={`#${s.id}`}
                      className={`yk-tour-seg yk-tour-seg-${i + 1} hover:text-ink`}
                    >
                      {t(`segments.${s.key}`)}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>

        {/* INTRO */}
        <section id="intro" className={`yk-tour-s1 scroll-mt-[130px] ${SECTION_BOX}`}>
          <span aria-hidden className="yk-tour-giant absolute bottom-24 right-0">
            {t("giant.intro")}
          </span>
          <div className="relative mx-auto flex min-h-[calc(100svh-150px)] max-w-[1180px] flex-col justify-center gap-6 py-16">
            <div className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
              {SEGMENTS[0].time} · {t("segments.intro")}
            </div>
            <h1 className="max-w-[820px] text-balance text-[44px] font-extrabold leading-none tracking-[-0.035em] sm:text-[76px]">
              {t.rich("intro.title", {
                accent: (chunks) => <span className="yk-gradient-text">{chunks}</span>,
              })}
            </h1>
            <p className="max-w-[520px] text-[19px] leading-relaxed text-sub">
              {t("intro.subtitle")}
            </p>
          </div>
        </section>

        {/* VERSO 1 · BÁSICOS: guitarra → ukelele → piano mientras haces scroll */}
        <section id="verse1" className="yk-tour-s2 yk-tour-v1 relative scroll-mt-[130px]">
          <div className={`yk-tour-v1-stage ${SECTION_BOX}`}>
            <span aria-hidden className="yk-tour-giant absolute bottom-24 left-6">
              {t("giant.verse")}
            </span>
            <div className={SECTION_GRID}>
              <Feature
                label={label(1, t("basics.kicker"))}
                title={t("basics.title")}
                desc={t("basics.desc")}
              >
                <div className="mt-2 flex gap-5 font-mono text-xs uppercase tracking-[0.14em]">
                  {instruments.map(({ id, name }, i) => (
                    <span key={id} className={`yk-tour-dot yk-tour-dot-${i + 1}`}>
                      ● {name}
                    </span>
                  ))}
                </div>
              </Feature>
              <div className="yk-tour-reveal yk-tour-slides relative">
                <div
                  className={`yk-tour-slide yk-tour-slide-1 flex flex-col gap-3 ${CARD}`}
                >
                  <div className="font-mono text-xs uppercase tracking-[0.16em] text-mute">
                    {instruments[0].name} · {t("strings", { n: 6 })}
                  </div>
                  <GuitarNeck
                    label={`${instruments[0].name} · ${t("strings", { n: 6 })}`}
                  />
                </div>
                <div
                  className={`yk-tour-slide yk-tour-slide-2 flex flex-col gap-3 ${CARD}`}
                >
                  <div className="font-mono text-xs uppercase tracking-[0.16em] text-mute">
                    {instruments[1].name} · {t("strings", { n: 4 })}
                  </div>
                  <UkuleleNeck
                    label={`${instruments[1].name} · ${t("strings", { n: 4 })}`}
                  />
                </div>
                <div
                  className={`yk-tour-slide yk-tour-slide-3 flex flex-col gap-4 ${CARD}`}
                >
                  <div className="font-mono text-xs uppercase tracking-[0.16em] text-mute">
                    {instruments[2].name} · {t("keys")}
                  </div>
                  <PianoKeys
                    label={`${instruments[2].name} · ${t("keys")}`}
                    first={notes[0]}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VERSO 2 · ACORDES */}
        <section id="verse2" className={`yk-tour-s3 scroll-mt-[130px] ${SECTION_BOX}`}>
          <span aria-hidden className="yk-tour-giant absolute bottom-24 right-0">
            {t("giant.verse")}
          </span>
          <div className={SECTION_GRID}>
            <Feature
              label={label(2, t("chords.kicker"))}
              title={t("chords.title")}
              desc={t("chords.desc")}
            >
              {strip}
            </Feature>
            <div className="yk-tour-reveal relative flex flex-wrap gap-4">
              {[
                { name: es ? "Do" : "C", frets: [-1, 3, 2, 0, 1, 0] },
                { name: es ? "Sol" : "G", frets: [3, 2, 0, 0, 0, 3] },
              ].map((chord) => (
                <div
                  key={chord.name}
                  className="yk-raised flex flex-col items-center gap-2 rounded-2xl border border-edge-2 px-5 pb-3 pt-4"
                >
                  <span className="text-[22px] font-extrabold">{chord.name}</span>
                  <ChordDiagram frets={chord.frets} scale={1.3} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PUENTE · ESCALAS */}
        <section id="bridge" className={`yk-tour-s4 scroll-mt-[130px] ${SECTION_BOX}`}>
          <span aria-hidden className="yk-tour-giant absolute bottom-24 left-6">
            {t("giant.bridge")}
          </span>
          <div className={SECTION_GRID}>
            <Feature
              label={label(3, t("scales.kicker"))}
              title={t("scales.title")}
              desc={t("scales.desc")}
            >
              {strip}
            </Feature>
            <div className="yk-tour-reveal relative flex flex-wrap gap-2">
              {notes.map((note, i) => (
                <span
                  key={note}
                  className={`min-w-[52px] rounded-xl py-[11px] text-center ${
                    i === 0 ? "yk-gradient font-bold" : "border border-edge-2"
                  }`}
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CORO · CANCIONES */}
        <section id="chorus" className={`yk-tour-s5 scroll-mt-[130px] ${SECTION_BOX}`}>
          <span aria-hidden className="yk-tour-giant absolute bottom-24 right-0">
            {t("giant.chorus")}
          </span>
          <div className={SECTION_GRID}>
            <Feature
              label={label(4, t("songs.kicker"))}
              title={t("songs.title")}
              desc={t("songs.desc")}
            >
              {strip}
            </Feature>
            <div className={`yk-tour-reveal relative flex flex-col gap-4 ${CARD}`}>
              <ChordLine text={t("lyrics.l1")} chords={["C", "G", "Am"]} />
              <ChordLine text={t("lyrics.l2")} chords={["F", "C"]} />
            </div>
          </div>
        </section>

        {/* SOLO · KARAOKE */}
        <section id="solo" className={`yk-tour-s6 scroll-mt-[130px] ${SECTION_BOX}`}>
          <span aria-hidden className="yk-tour-giant absolute bottom-24 left-6">
            {t("giant.solo")}
          </span>
          <div className={SECTION_GRID}>
            <Feature
              label={label(5, t("karaoke.kicker"))}
              title={t("karaoke.title")}
              desc={t("karaoke.desc")}
            >
              {strip}
            </Feature>
            <div className="yk-tour-reveal relative flex flex-col gap-4 text-[26px] font-bold">
              <p className="text-mute">{t("lyrics.l1")}</p>
              <p>
                {lyric2.map((word, i) => (
                  <span key={i}>
                    {i > 0 && " "}
                    <span className={i === 2 ? "yk-tour-glow" : ""}>{word}</span>
                  </span>
                ))}
              </p>
              <p className="font-semibold text-mute">{t("lyrics.l3")}</p>
            </div>
          </div>
        </section>

        {/* FINAL: elegir instrumento */}
        <section id="final" className={`yk-tour-s7 scroll-mt-[130px] ${SECTION_BOX}`}>
          <span
            aria-hidden
            className="yk-tour-giant absolute left-1/2 top-16 -translate-x-1/2 opacity-80"
          >
            {t("giant.outro")}
          </span>
          <div className="relative mx-auto flex min-h-[calc(100svh-71px)] max-w-[1000px] flex-col items-center justify-center gap-7 py-28 text-center">
            <div className="yk-tour-reveal font-mono text-xs uppercase tracking-[0.28em] text-accent">
              {SEGMENTS[6].time} · {t("segments.outro")}
            </div>
            <h2 className="yk-tour-reveal text-balance text-[36px] font-extrabold tracking-[-0.025em] sm:text-[54px]">
              {t("final.title")}
            </h2>
            <TourChooser
              instruments={instruments.map((i) => ({
                ...i,
                cta: t("final.cta", { instrument: i.name }),
              }))}
              soon={COMING_SOON.map((id) => ({
                id,
                name: tInstruments(`${id}.name`),
                label: tInstruments("soon"),
              }))}
            />
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-edge bg-page">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-5 px-6 py-7">
          <div className="opacity-85">
            <BrandLogo height={30} />
          </div>
          <span className="text-[12.5px] text-mute">{t("footer")}</span>
        </div>
      </footer>
    </>
  );
}
