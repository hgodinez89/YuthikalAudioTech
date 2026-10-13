import { ChordDiagram } from "./chord-diagram";
import { PianoKeyboard } from "./piano-keyboard";
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
 * de piano mini con las teclas resaltadas. `scale` ajusta el tamaño en ambos.
 */
export function ChordVisual({
  chord,
  scale = 1,
}: {
  chord: ChordShapeData;
  scale?: number;
}) {
  if (chord.keys?.length) {
    const { start, octaves } = keyboardRange(chord.keys);
    return (
      <PianoKeyboard
        start={start}
        octaves={octaves}
        pressed={chord.keys}
        whiteWidth={Math.round(9 * scale)}
        height={Math.round(46 * scale)}
      />
    );
  }
  return (
    <ChordDiagram
      frets={chord.frets ?? []}
      barres={chord.barres}
      baseFret={chord.baseFret}
      scale={scale}
    />
  );
}
