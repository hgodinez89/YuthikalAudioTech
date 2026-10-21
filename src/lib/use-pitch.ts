"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { detectPitch, median } from "./pitch";

export type MicStatus =
  "idle" | "starting" | "listening" | "denied" | "unavailable" | "error";

/* Cada cuánto se analiza un bloque (ms) y cuánto se suaviza (mediana). */
const DETECT_EVERY = 50;
const SMOOTH_MS = 300;
/* Sin tono durante este tiempo: "toca una cuerda". */
const SILENCE_MS = 500;
/* La UI (textos, aguja) se actualiza a este ritmo; el trazo, en cada lectura. */
const UI_EVERY = 80;

/**
 * Micrófono → tono para el afinador. Se enciende solo con `start()` (gesto
 * del usuario, requisito de iOS) y se apaga al desmontar o al ocultar la
 * pestaña. `freq` es la frecuencia suavizada (null = silencio); `subscribe`
 * recibe cada lectura para dibujar sin re-renderizar. Con `paused` (sonando
 * el tono de referencia) no se analiza.
 */
export function usePitch(paused: boolean) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [freq, setFreq] = useState<number | null>(null);
  const listeners = useRef(new Set<(freq: number | null) => void>());
  const stopAudio = useRef<() => void>(() => {});
  const pausedRef = useRef(paused);
  useLayoutEffect(() => {
    pausedRef.current = paused;
  });

  const stop = useCallback(() => {
    stopAudio.current();
    stopAudio.current = () => {};
    setStatus("idle");
    setFreq(null);
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("starting");
    let stream: MediaStream;
    try {
      // Sin procesamiento de voz: filtran y deforman el sonido de la cuerda.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setStatus(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "unavailable"
            : "error",
      );
      return;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    // Bloque grande: las cuerdas graves (73–82 Hz) necesitan varios ciclos.
    analyser.fftSize = 4096;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    const recent: { f: number; t: number }[] = [];
    let lastHeard = -Infinity;
    let lastDetect = 0;
    let lastUi = 0;
    let raf = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastDetect < DETECT_EVERY || pausedRef.current) return;
      lastDetect = now;
      analyser.getFloatTimeDomainData(buffer);
      const reading = detectPitch(buffer, ctx.sampleRate);
      if (reading) {
        recent.push({ f: reading.freq, t: now });
        lastHeard = now;
      }
      while (recent.length && now - recent[0].t > SMOOTH_MS) recent.shift();
      const value =
        recent.length && now - lastHeard < SILENCE_MS
          ? median(recent.map((r) => r.f))
          : null;
      listeners.current.forEach((listener) => listener(value));
      if (now - lastUi >= UI_EVERY) {
        lastUi = now;
        setFreq(value);
      }
    };
    raf = requestAnimationFrame(loop);
    stopAudio.current = () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((track) => track.stop());
      void ctx.close();
    };
    setStatus("listening");
  }, []);

  /* Se apaga al ocultar la pestaña (y al salir de la página). */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopAudio.current();
    };
  }, [stop]);

  const subscribe = useCallback((listener: (freq: number | null) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return { status, freq, start, stop, subscribe };
}
