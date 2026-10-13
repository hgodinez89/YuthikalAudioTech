"use client";

import { useCallback, useRef } from "react";

/* Frecuencia de una nota MIDI (A4 = 69 = 440 Hz). */
const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/* Retraso entre notas al tocar un acorde (arpegio corto, como una mano real). */
const STRUM_MS = 25;

/**
 * Sintetizador de piano mínimo con Web Audio (sin librerías ni archivos):
 * cada nota son dos osciladores —triangular + senoidal una octava arriba— con
 * ataque rápido y caída suave, un timbre tipo piano eléctrico. El contexto de
 * audio se crea al primer uso: los navegadores exigen un gesto del usuario.
 */
export function usePianoSynth() {
  const ctxRef = useRef<AudioContext | null>(null);

  const context = useCallback(() => {
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playNote = useCallback(
    (midi: number, delayMs = 0, duration = 1.6) => {
      const ctx = context();
      if (!ctx) return;
      const start = ctx.currentTime + delayMs / 1000;
      const gain = ctx.createGain();
      // Envolvente: ataque corto, caída exponencial (sin clics al cortar).
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      gain.connect(ctx.destination);

      for (const [type, mult, level] of [
        ["triangle", 1, 1],
        ["sine", 2, 0.35],
      ] as const) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq(midi) * mult;
        g.gain.value = level;
        osc.connect(g).connect(gain);
        osc.start(start);
        osc.stop(start + duration + 0.05);
      }
    },
    [context],
  );

  const playChord = useCallback(
    (notes: number[]) => notes.forEach((n, i) => playNote(n, i * STRUM_MS)),
    [playNote],
  );

  return { playNote, playChord };
}
