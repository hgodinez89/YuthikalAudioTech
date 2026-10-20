"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { PianoKeyboard } from "./piano-keyboard";
import {
  fingering,
  flatSpelledNotes,
  keyboardRange,
  noteName,
  pianoChord,
  pianoInversions,
  type Hand,
} from "@/lib/piano";
import { usePianoSynth } from "@/lib/use-piano-synth";

const HAND_KEY = "yk-piano-hand";
const noopSubscribe = () => () => {};

function readHand(): Hand {
  try {
    return window.localStorage.getItem(HAND_KEY) === "left" ? "left" : "right";
  } catch {
    return "right";
  }
}

function ListenButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="yk-hit-y relative inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12.5px] font-semibold text-accent hover:bg-accent/20"
    >
      <Play size={13} fill="currentColor" strokeWidth={0} />
      {label}
    </button>
  );
}

/** Cabecera del detalle: teclado grande en posición fundamental + escuchar. */
export function PianoChordHero({
  chordKey,
  suffix,
}: {
  chordKey: string;
  suffix: string;
}) {
  const t = useTranslations("piano");
  const { playChord, playNote } = usePianoSynth();
  const chord = pianoChord(chordKey, suffix);
  if (!chord) return null;
  const root = pianoInversions(chord)[0];
  const range = keyboardRange(root.notes);

  return (
    <div className="flex flex-col items-center gap-3">
      <PianoKeyboard
        start={range.start}
        octaves={range.octaves}
        pressed={root.notes}
        labels="pressed"
        flatNotes={flatSpelledNotes(chord, root.notes)}
        whiteWidth={22}
        height={104}
        onKey={playNote}
      />
      <ListenButton onClick={() => playChord(root.notes)} label={t("listen")} />
    </div>
  );
}

/**
 * Todas las inversiones del acorde: teclas, nombre de cada nota, dedos según
 * la mano elegida (se recuerda) y botón para escucharla.
 */
export function PianoInversions({
  chordKey,
  suffix,
}: {
  chordKey: string;
  suffix: string;
}) {
  const t = useTranslations("piano");
  const { playChord, playNote } = usePianoSynth();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [savedHand, setSavedHand] = useState<Hand>(() =>
    typeof window === "undefined" ? "right" : readHand(),
  );
  const hand = mounted ? savedHand : "right";
  const chooseHand = (next: Hand) => {
    setSavedHand(next);
    try {
      window.localStorage.setItem(HAND_KEY, next);
    } catch {
      /* sin almacenamiento: dura esta visita */
    }
  };

  const chord = pianoChord(chordKey, suffix);
  if (!chord) return null;
  const voicings = pianoInversions(chord);
  // Mismo rango para todas las tarjetas: se comparan de un vistazo.
  const range = keyboardRange(voicings.flatMap((v) => v.notes));

  return (
    <>
      <div className="mb-[18px] mt-[30px] flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          {t("inversionsTitle")}{" "}
          <span className="text-sm font-medium text-mute">
            · {t("inversionsCount", { n: voicings.length })}
          </span>
        </h2>
        <div
          role="group"
          aria-label={t("hand")}
          className="flex rounded-xl border border-edge bg-surface-2 p-1 text-[13px] font-semibold"
        >
          {(["right", "left"] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => chooseHand(h)}
              aria-pressed={hand === h}
              className={
                hand === h
                  ? "yk-gradient cursor-pointer rounded-[9px] px-[15px] py-[7px]"
                  : "cursor-pointer rounded-[9px] px-[15px] py-[7px] text-sub"
              }
            >
              {t(h === "right" ? "rightHand" : "leftHand")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        {voicings.map((v) => {
          const fingers = fingering(v.notes.length, v.inversion, hand);
          const bass = v.notes[0];
          const flatNotes = flatSpelledNotes(chord, v.notes);
          const bassFlat = flatNotes.includes(bass);
          return (
            <article
              key={v.inversion}
              className="flex flex-col gap-3 rounded-2xl border border-edge bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold">{t(`inversion.${v.inversion}`)}</h3>
                  <p className="text-[12.5px] text-tert">
                    {t("bass", {
                      es: noteName(bass, "es", bassFlat),
                      en: noteName(bass, "en", bassFlat),
                    })}
                  </p>
                </div>
                <ListenButton onClick={() => playChord(v.notes)} label={t("listen")} />
              </div>
              <div className="overflow-x-auto">
                <PianoKeyboard
                  start={range.start}
                  octaves={range.octaves}
                  pressed={v.notes}
                  fingers={Object.fromEntries(v.notes.map((n, i) => [n, fingers[i]]))}
                  labels="pressed"
                  flatNotes={flatNotes}
                  whiteWidth={range.octaves > 2 ? 16 : 22}
                  height={96}
                  onKey={playNote}
                  className="mx-auto"
                />
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-[12.5px] text-tert">{t("fingeringNote")}</p>
    </>
  );
}
