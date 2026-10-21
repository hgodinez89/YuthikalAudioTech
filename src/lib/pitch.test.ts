import { describe, expect, it } from "vitest";
import {
  centsOff,
  detectPitch,
  median,
  midiFreq,
  nearestString,
  noteFromFreq,
} from "./pitch";

const SAMPLE_RATE = 48000;
const SIZE = 4096;

/* Cuerda sintética: fundamental + armónicos que decaen (como una cuerda real,
   donde el 2.º armónico a veces suena más que la fundamental). */
function string(freq: number, harmonics = [1, 0.8, 0.5, 0.3, 0.2], amp = 0.4) {
  const buffer = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    let v = 0;
    harmonics.forEach((h, k) => {
      v += h * Math.sin((2 * Math.PI * freq * (k + 1) * i) / SAMPLE_RATE + k);
    });
    buffer[i] = (v * amp) / harmonics.length;
  }
  return buffer;
}

const detectedCents = (freq: number, midi: number, harmonics?: number[]) => {
  const reading = detectPitch(string(freq, harmonics), SAMPLE_RATE);
  expect(reading).not.toBeNull();
  return centsOff(reading!.freq, midi);
};

describe("detectPitch", () => {
  it("Mi grave de la guitarra (82,4 Hz) con armónicos", () => {
    expect(Math.abs(detectedCents(midiFreq(40), 40))).toBeLessThan(3);
  });

  it("con el 2.º armónico más fuerte que la fundamental no salta de octava", () => {
    expect(Math.abs(detectedCents(midiFreq(40), 40, [0.6, 1, 0.5, 0.3]))).toBeLessThan(3);
  });

  it("Re grave de Drop D (73,4 Hz)", () => {
    expect(Math.abs(detectedCents(midiFreq(38), 38))).toBeLessThan(3);
  });

  it("Sol y La agudos del ukelele", () => {
    expect(Math.abs(detectedCents(midiFreq(67), 67))).toBeLessThan(3);
    expect(Math.abs(detectedCents(midiFreq(69), 69))).toBeLessThan(3);
  });

  it("mide el desvío de una cuerda desafinada", () => {
    // 20 cents alto respecto del La (110 Hz)
    const sharp = midiFreq(45) * 2 ** (20 / 1200);
    expect(detectedCents(sharp, 45)).toBeCloseTo(20, 0);
  });

  it("el silencio no da lectura", () => {
    expect(detectPitch(new Float32Array(SIZE), SAMPLE_RATE)).toBeNull();
    expect(detectPitch(string(110, [1], 0.001), SAMPLE_RATE)).toBeNull();
  });
});

describe("notas y cuerdas", () => {
  it("noteFromFreq: nota más cercana y cents", () => {
    expect(noteFromFreq(440)).toEqual({ midi: 69, cents: 0 });
    const { midi, cents } = noteFromFreq(midiFreq(40) * 2 ** (-30 / 1200));
    expect(midi).toBe(40);
    expect(cents).toBeCloseTo(-30, 5);
  });

  it("nearestString: la cuerda de la afinación más cercana", () => {
    const standard = [40, 45, 50, 55, 59, 64];
    expect(nearestString(midiFreq(45) * 1.01, standard)).toBe(1);
    expect(nearestString(midiFreq(64), standard)).toBe(5);
    // Ukelele reentrante: el Sol agudo es la 4ª (primera del arreglo).
    expect(nearestString(midiFreq(67), [67, 60, 64, 69])).toBe(0);
  });

  it("median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
