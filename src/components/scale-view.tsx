"use client";

import { Play, Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Fretboard } from "./fretboard";
import { PianoKeyboard } from "./piano-keyboard";
import { isFretted, TUNINGS, type Instrument } from "@/lib/instruments";
import { keyboardRange } from "@/lib/piano";
import { fretboardNotes, scalePositions, type Scale } from "@/lib/scales";
import { usePianoSynth } from "@/lib/use-piano-synth";

type LabelMode = "notes" | "degrees";

const LABELS_KEY = "yk-scale-labels";
const STEP_MS = 280;
const noopSubscribe = () => () => {};

function readLabels(): LabelMode {
  try {
    return window.localStorage.getItem(LABELS_KEY) === "degrees" ? "degrees" : "notes";
  } catch {
    return "notes";
  }
}

/* Tarjeta oscura (como el mástil de Básicos), desplazable si no cabe. */
function Showcase({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="dark rounded-[20px] border border-[#1b2130] bg-[linear-gradient(180deg,#101017,#0b0d12)] px-5 py-5">
      <div className="overflow-x-auto [scrollbar-width:thin]">{children}</div>
      {hint && (
        <p className="mt-3 flex items-center gap-2 text-[12.5px] text-[#8b93a3]">
          <Volume2 size={14} strokeWidth={2} className="text-[#35d6e8]" />
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Escala sobre el instrumento: mástil completo y posiciones (guitarra y
 * ukelele) o teclado (piano); etiquetas por nota o por grado (se recuerda) y
 * botón para escucharla subiendo y bajando.
 */
export function ScaleView({
  instrument,
  scale,
}: {
  instrument: Instrument;
  scale: Scale;
}) {
  const t = useTranslations("scales");
  const lang = useLocale() === "en" ? "en" : "es";
  const other = lang === "es" ? "en" : "es";
  const { playNote } = usePianoSynth();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [savedLabels, setSavedLabels] = useState<LabelMode>(() =>
    typeof window === "undefined" ? "notes" : readLabels(),
  );
  const labels = mounted ? savedLabels : "notes";
  const chooseLabels = (next: LabelMode) => {
    setSavedLabels(next);
    try {
      window.localStorage.setItem(LABELS_KEY, next);
    } catch {
      /* sin almacenamiento: dura esta visita */
    }
  };

  const root = scale.notes[0][lang];
  const labelOf = (i: number) =>
    labels === "notes" ? scale.notes[i][lang] : scale.notes[i].degree;

  // Octava para escuchar: la del teclado, o la tónica más grave de la guitarra.
  const base =
    instrument === "guitar" ? 40 + ((scale.rootPc - 4 + 12) % 12) : 60 + scale.rootPc;
  const octave = [...scale.notes.map((n) => base + n.semis), base + 12];
  const listen = () =>
    [...octave, ...octave.slice(0, -1).reverse()].forEach((midi, i) =>
      playNote(midi, i * STEP_MS, 0.9),
    );

  const toolbar = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={listen}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-accent/40 bg-accent/10 px-3.5 py-2 text-[13px] font-semibold text-accent hover:bg-accent/20"
      >
        <Play size={13} fill="currentColor" strokeWidth={0} />
        {t("listen")}
      </button>
      <div
        role="group"
        aria-label={t("show")}
        className="flex rounded-xl border border-edge bg-surface-2 p-1 text-[13px] font-semibold"
      >
        {(["notes", "degrees"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => chooseLabels(mode)}
            aria-pressed={labels === mode}
            className={
              labels === mode
                ? "yk-gradient cursor-pointer rounded-[9px] px-[15px] py-[7px]"
                : "cursor-pointer rounded-[9px] px-[15px] py-[7px] text-sub"
            }
          >
            {t(mode)}
          </button>
        ))}
      </div>
    </div>
  );

  if (!isFretted(instrument)) {
    const notes = octave;
    const range = keyboardRange(notes);
    const noteLabels = Object.fromEntries(
      notes.map((midi, i) => {
        const n = scale.notes[i % scale.notes.length];
        return [
          midi,
          (labels === "notes" ? [n[lang], n[other]] : [n.degree, n[lang]]) as [
            string,
            string,
          ],
        ];
      }),
    );
    return (
      <section className="min-w-0">
        {toolbar}
        <h2 className="mb-3 text-lg font-bold">{t("keyboard")}</h2>
        <Showcase hint={t("keyboardHint", { root })}>
          <PianoKeyboard
            start={range.start}
            octaves={range.octaves}
            pressed={notes}
            strong={[notes[0], notes[notes.length - 1]]}
            labels="pressed"
            noteLabels={noteLabels}
            whiteWidth={38}
            height={140}
            onKey={playNote}
            className="mx-auto"
          />
        </Showcase>
      </section>
    );
  }

  const strings = TUNINGS[instrument];
  const tuning = strings.map((s) => s.midi);
  const stringNames = strings.map((s) => (lang === "es" ? s.noteEs : s.noteEn));
  const neck = fretboardNotes(tuning, scale).map((n) => ({
    ...n,
    label: labelOf(n.note),
    tonic: n.note === 0,
  }));
  const positions = scalePositions(tuning, scale);

  return (
    <>
      <section className="min-w-0">
        {toolbar}
        <h2 className="mb-3 text-lg font-bold">{t("fullNeck")}</h2>
        <Showcase hint={t("fullNeckHint", { root })}>
          <Fretboard
            stringNames={stringNames}
            from={0}
            to={12}
            notes={neck}
            fretWidth={62}
            onNote={playNote}
          />
        </Showcase>
      </section>

      <section className="min-w-0">
        <h2 className="mb-1.5 text-lg font-bold">
          {t("positions")}{" "}
          <span className="text-sm font-medium text-mute">· {positions.length}</span>
        </h2>
        <p className="mb-4 max-w-[660px] text-[13.5px] leading-relaxed text-sub">
          {t("positionsIntro")}
        </p>
        <div className="grid gap-3.5 md:grid-cols-2">
          {positions.map((p, i) => (
            <article
              key={p.from}
              className="flex min-w-0 flex-col gap-3 rounded-2xl border border-edge bg-surface p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold">{t("position", { n: i + 1 })}</h3>
                <span className="text-[12.5px] text-tert">
                  {t("positionFrets", { from: p.from, to: p.to })}
                </span>
              </div>
              <div className="dark overflow-x-auto rounded-xl bg-[#0b0d12] px-3 py-3">
                <Fretboard
                  stringNames={stringNames}
                  from={p.from}
                  to={p.to}
                  notes={p.notes.map((n) => ({
                    ...n,
                    label: String(n.finger),
                    tonic: n.note === 0,
                  }))}
                  fretWidth={66}
                  onNote={playNote}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
