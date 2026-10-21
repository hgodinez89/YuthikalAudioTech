/*
 * Afinaciones del afinador. Cada cuerda es su nota MIDI al aire, en el orden
 * del diagrama de acordes: de la 6ª (o la 4ª en ukelele) a la 1ª.
 */

export type TuningId =
  "standard" | "dropD" | "halfDown" | "openG" | "dadgad" | "lowG" | "d";

export type Tuning = { id: TuningId; strings: number[] };

export const TUNER_TUNINGS: Record<"guitar" | "ukulele", Tuning[]> = {
  guitar: [
    { id: "standard", strings: [40, 45, 50, 55, 59, 64] }, // Mi La Re Sol Si Mi
    { id: "dropD", strings: [38, 45, 50, 55, 59, 64] }, // Re La Re Sol Si Mi
    { id: "halfDown", strings: [39, 44, 49, 54, 58, 63] }, // Mi♭ La♭ Re♭ Sol♭ Si♭ Mi♭
    { id: "openG", strings: [38, 43, 50, 55, 59, 62] }, // Re Sol Re Sol Si Re
    { id: "dadgad", strings: [38, 45, 50, 55, 57, 62] }, // Re La Re Sol La Re
  ],
  ukulele: [
    // Reentrante: la 4ª (Sol) es aguda.
    { id: "standard", strings: [67, 60, 64, 69] }, // Sol Do Mi La
    { id: "lowG", strings: [55, 60, 64, 69] }, // Sol grave
    { id: "d", strings: [69, 62, 66, 71] }, // La Re Fa♯ Si
  ],
};

/** Cuánto se puede subir o bajar toda la afinación con ♭ / ♯ (semitonos). */
export const MAX_TRANSPOSE = 3;

/** Afinación con el ajuste ♭/♯ aplicado (semitonos, −3 a +3). */
export function tuningStrings(tuning: Tuning, transpose: number): number[] {
  const shift = Math.max(-MAX_TRANSPOSE, Math.min(MAX_TRANSPOSE, Math.round(transpose)));
  return tuning.strings.map((midi) => midi + shift);
}

export function findTuning(instrument: "guitar" | "ukulele", id: string | null): Tuning {
  const list = TUNER_TUNINGS[instrument];
  return list.find((t) => t.id === id) ?? list[0];
}
