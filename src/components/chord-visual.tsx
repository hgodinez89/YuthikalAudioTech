import { ChordDiagram } from "./chord-diagram";
import { PianoKeyboard } from "./piano-keyboard";
import type { NoteLabel } from "@/lib/chord-notes";
import { keyboardRange } from "@/lib/piano";

/** Datos mínimos para dibujar un acorde: trastes (guitarra/ukelele) o teclas (piano). */
export type ChordShapeData = {
  frets?: number[];
  barres?: number[];
  baseFret?: number;
  /** Piano: notas MIDI del acorde (posición fundamental). */
  keys?: number[];
};

/**
 * Diagrama de un acorde según el instrumento: mástil con trastes o teclado
 * de piano mini con las teclas resaltadas. `scale` ajusta el tamaño en ambos;
 * `notes` (ver `chordNoteLabels`) pone el nombre bajo cada tecla o cuerda.
 */
export function ChordVisual({
  chord,
  scale = 1,
  notes,
}: {
  chord: ChordShapeData;
  scale?: number;
  notes?: (NoteLabel | null)[];
}) {
  if (chord.keys?.length) {
    const keys = chord.keys;
    const { start, octaves } = keyboardRange(keys);
    return (
      <PianoKeyboard
        start={start}
        octaves={octaves}
        pressed={keys}
        whiteWidth={Math.round(9 * scale)}
        height={Math.round(46 * scale)}
        labels={notes ? "compact" : "none"}
        noteLabels={
          notes &&
          Object.fromEntries(
            keys.flatMap((midi, i): [number, [string]][] =>
              notes[i] ? [[midi, [notes[i].main]]] : [],
            ),
          )
        }
        rootKeys={notes && keys.filter((_, i) => notes[i]?.root)}
      />
    );
  }
  return (
    <ChordDiagram
      frets={chord.frets ?? []}
      barres={chord.barres}
      baseFret={chord.baseFret}
      scale={scale}
      labels={notes}
    />
  );
}
