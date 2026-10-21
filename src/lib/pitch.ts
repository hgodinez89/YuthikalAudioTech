/*
 * Detección de tono para el afinador (algoritmo YIN) y conversiones nota ↔
 * frecuencia. Funciones puras: el hook del micrófono les pasa cada bloque de
 * audio; los tests usan ondas sintéticas con armónicos.
 */

/** Frecuencia de una nota MIDI (La4 = 69 = 440 Hz). */
export function midiFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Desvío en cents de una frecuencia respecto de una nota (+ = alto). */
export function centsOff(freq: number, midi: number): number {
  return 1200 * Math.log2(freq / midiFreq(midi));
}

/** Nota más cercana a una frecuencia y su desvío en cents (−50 a +50). */
export function noteFromFreq(freq: number): { midi: number; cents: number } {
  const exact = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(exact);
  return { midi, cents: (exact - midi) * 100 };
}

/** Índice de la cuerda (de la afinación) más cercana a la frecuencia. */
export function nearestString(freq: number, strings: readonly number[]): number {
  let best = 0;
  let bestDistance = Infinity;
  strings.forEach((midi, i) => {
    const distance = Math.abs(centsOff(freq, midi));
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

/* Rango que escucha el afinador: del Re grave de Drop D con margen a la 1ª
   aguda del ukelele con armónicos. */
const MIN_FREQ = 60;
const MAX_FREQ = 1100;
/* Umbral de YIN (más bajo = más exigente) y volumen mínimo (silencio). */
const YIN_THRESHOLD = 0.15;
const MIN_RMS = 0.01;

export type PitchReading = { freq: number; clarity: number };

/**
 * Tono fundamental de un bloque de audio (YIN, de Cheveigné y Kawahara):
 * diferencia acumulada normalizada, primer mínimo bajo el umbral e
 * interpolación parabólica. Null si es silencio o no hay un tono claro.
 */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
): PitchReading | null {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  if (Math.sqrt(sum / buffer.length) < MIN_RMS) return null;

  const tauMin = Math.floor(sampleRate / MAX_FREQ);
  const tauMax = Math.min(
    Math.floor(sampleRate / MIN_FREQ),
    Math.floor(buffer.length / 2),
  );
  const window = buffer.length - tauMax;
  if (window <= 0 || tauMax <= tauMin) return null;

  // Diferencia d(τ) y su media acumulada normalizada d'(τ).
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let d = 0;
    for (let i = 0; i < window; i++) {
      const delta = buffer[i] - buffer[i + tau];
      d += delta * delta;
    }
    running += d;
    cmnd[tau] = running > 0 ? (d * tau) / running : 1;
  }

  // Primer τ bajo el umbral y, desde ahí, su mínimo local.
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < YIN_THRESHOLD) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;

  // Interpolación parabólica entre los vecinos: precisión sub-muestra.
  let better = tau;
  if (tau > tauMin && tau < tauMax) {
    const a = cmnd[tau - 1];
    const b = cmnd[tau];
    const c = cmnd[tau + 1];
    const denominator = a - 2 * b + c;
    if (denominator !== 0) better = tau + (a - c) / (2 * denominator);
  }
  const freq = sampleRate / better;
  if (freq < MIN_FREQ || freq > MAX_FREQ) return null;
  return { freq, clarity: 1 - cmnd[tau] };
}

/** Mediana de las últimas lecturas: quita saltos sueltos (armónicos, ataques). */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
