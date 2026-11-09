import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChordVisual } from "./chord-visual";
import { chordNoteLabels } from "@/lib/chord-notes";
import type { ChordPositionRow } from "@/lib/chords";
import type { Instrument } from "@/lib/instruments";

export type ChordCardData = {
  id: string;
  key: string;
  suffix: string;
  name_en: string;
  name_es: string;
  position: Pick<ChordPositionRow, "base_fret" | "frets" | "barres">;
  /** Piano: teclas del acorde (en lugar de la posición en el mástil). */
  keys?: number[];
};

export function ChordCard({
  chord,
  instrument,
  href,
}: {
  chord: ChordCardData;
  instrument: Instrument;
  href: string;
}) {
  const t = useTranslations("finder");
  const lang = useLocale() === "en" ? "en" : "es";
  const hasBarre = !chord.keys && chord.position.barres.length > 0;
  // El nombre de cada nota bajo su tecla o su cuerda.
  const notes = chordNoteLabels(
    instrument,
    {
      key: chord.key,
      suffix: chord.suffix,
      keys: chord.keys,
      frets: chord.position.frets,
      baseFret: chord.position.base_fret,
    },
    lang,
  );
  const noteList = [...new Set(notes.flatMap((n) => (n ? [n.main] : [])))];

  return (
    <Link
      href={href}
      prefetch={false}
      className="relative flex flex-col items-center rounded-2xl border border-edge bg-surface px-3 pb-3.5 pt-4 shadow-card transition-[border-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-accent hover:shadow-lift"
    >
      {hasBarre && (
        <span className="absolute right-2.5 top-2.5 rounded-full border border-accent/40 px-[7px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-accent">
          {t("barre")}
        </span>
      )}
      <div className="flex w-full justify-center pb-2.5 pt-1">
        <ChordVisual
          chord={{
            frets: chord.position.frets,
            barres: chord.position.barres,
            baseFret: chord.position.base_fret,
            keys: chord.keys,
          }}
          scale={chord.keys ? 1.15 : 1}
          notes={notes}
        />
      </div>
      <div className="text-center leading-[1.35]">
        <span className="text-[17px] font-extrabold tracking-[-0.01em]">
          {chord.name_en}
        </span>
        <div className="text-[12.5px] text-sub">{chord.name_es}</div>
      </div>
      {/* El diagrama es un dibujo: las notas, también para lectores de pantalla. */}
      <span className="sr-only">{t("cardNotes", { notes: noteList.join(", ") })}</span>
    </Link>
  );
}
