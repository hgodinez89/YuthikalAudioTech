"use client";

import { Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { FINGER_COLORS, PianoKeyboard } from "./piano-keyboard";
import { usePianoSynth } from "@/lib/use-piano-synth";

/* Do de cada octava del teclado dibujado (Do1 … Do7) con su nombre científico. */
const OCTAVE_MARKS = Object.fromEntries(
  [1, 2, 3, 4, 5, 6, 7].map((o) => [12 * (o + 1), `C${o}`]),
);

/* Dedos de ejemplo: izquierda 5-4-3-2-1 sobre Do3–Sol3, derecha 1-2-3-4-5 sobre Do4–Sol4. */
const HAND_FINGERS: Record<number, number> = {
  48: 5,
  50: 4,
  52: 3,
  53: 2,
  55: 1,
  60: 1,
  62: 2,
  64: 3,
  65: 4,
  67: 5,
};

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-[28px] font-extrabold tracking-[-0.02em]">{title}</h2>
      <p className="mb-[22px] max-w-[660px] leading-relaxed text-sub">{intro}</p>
      {children}
    </section>
  );
}

/* Tarjeta con el teclado (desplazable si no cabe) y una pista opcional. */
function Showcase({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="rounded-[20px] border border-edge bg-surface px-5 py-6">
      <div className="overflow-x-auto [scrollbar-width:thin]">{children}</div>
      {hint && (
        <p className="mt-3 flex items-center gap-2 text-[12.5px] text-tert">
          <Volume2 size={14} strokeWidth={2} className="text-accent" />
          {hint}
        </p>
      )}
    </div>
  );
}

/** Básicos del piano: el teclado, octavas y Do central, los dedos, tono y semitono. */
export function PianoBasics() {
  const t = useTranslations("pianoBasics");
  const { playNote, playChord } = usePianoSynth();

  return (
    <div className="flex flex-col gap-16">
      <Section id="keyboard" title={t("keyboardTitle")} intro={t("keyboardIntro")}>
        <Showcase hint={t("tapToHear")}>
          <PianoKeyboard
            start={60}
            octaves={2}
            labels="all"
            whiteWidth={44}
            height={180}
            onKey={playNote}
            className="mx-auto"
          />
        </Showcase>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-edge bg-surface p-4">
            <h3 className="mb-1.5 font-bold">{t("findCTitle")}</h3>
            <p className="mb-3 text-[13.5px] text-sub">{t("findC")}</p>
            <PianoKeyboard
              start={60}
              octaves={2}
              pressed={[60, 72]}
              whiteWidth={18}
              height={64}
              onKey={playNote}
            />
          </div>
          <div className="rounded-2xl border border-edge bg-surface p-4">
            <h3 className="mb-1.5 font-bold">{t("blackKeysTitle")}</h3>
            <p className="mb-3 text-[13.5px] text-sub">{t("blackKeys")}</p>
            <PianoKeyboard
              start={60}
              octaves={2}
              pressed={[61, 63, 66, 68, 70, 73, 75, 78, 80, 82]}
              flats={false}
              whiteWidth={18}
              height={64}
              onKey={playNote}
            />
          </div>
        </div>
      </Section>

      <Section id="octaves" title={t("octavesTitle")} intro={t("octavesIntro")}>
        <Showcase hint={t("middleCHint")}>
          <PianoKeyboard
            start={24}
            octaves={7}
            pressed={[60]}
            marks={OCTAVE_MARKS}
            whiteWidth={14}
            height={70}
            onKey={playNote}
          />
        </Showcase>
      </Section>

      <Section id="fingers" title={t("fingersTitle")} intro={t("fingersIntro")}>
        <Showcase>
          <PianoKeyboard
            start={48}
            octaves={2}
            pressed={Object.keys(HAND_FINGERS).map(Number)}
            fingers={HAND_FINGERS}
            whiteWidth={32}
            height={120}
            onKey={playNote}
            className="mx-auto"
          />
          <div className="mx-auto mt-2 grid max-w-[448px] grid-cols-2 text-center text-[12.5px] font-semibold text-sub">
            <span>{t("leftHand")}</span>
            <span>{t("rightHand")}</span>
          </div>
        </Showcase>
        <ul className="mt-4 flex flex-wrap gap-2.5">
          {[1, 2, 3, 4, 5].map((finger) => (
            <li
              key={finger}
              className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1.5 text-[13px]"
            >
              <span
                className="grid size-6 place-items-center rounded-full text-[12px] font-extrabold text-white"
                style={{ background: FINGER_COLORS[finger] }}
              >
                {finger}
              </span>
              {t(`finger${finger}`)}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="tones" title={t("tonesTitle")} intro={t("tonesIntro")}>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["semitone", [64, 65]],
              ["semitoneBlack", [60, 61]],
              ["tone", [60, 62]],
            ] as const
          ).map(([key, notes]) => (
            <button
              key={key}
              type="button"
              onClick={() => playChord([...notes])}
              className="cursor-pointer rounded-2xl border border-edge bg-surface p-4 text-left transition-colors hover:border-accent"
            >
              <h3 className="mb-1 font-bold">{t(`${key}Title`)}</h3>
              <p className="mb-3 text-[13px] text-sub">{t(key)}</p>
              <PianoKeyboard
                start={60}
                octaves={1}
                pressed={[...notes]}
                labels="pressed"
                whiteWidth={22}
                height={66}
              />
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
