"use client";

import { useEffect, useSyncExternalStore } from "react";
import { INSTRUMENTS, type Instrument } from "./instruments";

/*
 * Qué instrumentos están descargados («Descargar [instrumento]») en un
 * idioma. Lo comparten la tarjeta de descarga del inicio, sus botones de
 * instrumento y el menú de instrumento del header, así nunca se contradicen.
 * La marca vive en localStorage (con la dirección que la prueba) y se
 * comprueba contra la caché: el navegador puede haber borrado la copia.
 */

export type OfflineInstruments = Partial<Record<Instrument, boolean>>;

const storageKey = (locale: string, instrument: Instrument) =>
  `yk-offline-${locale}-${instrument}`;

const EMPTY: OfflineInstruments = {};
let state: Record<string, OfflineInstruments> = {};
const listeners = new Set<() => void>();

function set(locale: string, instrument: Instrument, saved: boolean) {
  if (state[locale]?.[instrument] === saved) return;
  state = { ...state, [locale]: { ...state[locale], [instrument]: saved } };
  listeners.forEach((l) => l());
}

function readMark(locale: string, instrument: Instrument): string | null {
  try {
    return localStorage.getItem(storageKey(locale, instrument));
  } catch {
    return null;
  }
}

/** Revisa los 3 instrumentos de un idioma (marca + copia aún guardada). */
function refresh(locale: string) {
  for (const instrument of INSTRUMENTS) {
    const mark = readMark(locale, instrument);
    if (!mark) {
      set(locale, instrument, false);
      continue;
    }
    // Las marcas de la primera versión guardaban la fecha: se prueba el catálogo.
    const probe = mark.startsWith("/") ? mark : `/catalog/${instrument}.json`;
    caches.match(probe).then(
      (hit) => set(locale, instrument, Boolean(hit)),
      () => set(locale, instrument, false),
    );
  }
}

/** Lo llama la descarga al terminar; `probe` es una dirección que solo ella guarda. */
export function markDownloaded(locale: string, instrument: Instrument, probe: string) {
  try {
    localStorage.setItem(storageKey(locale, instrument), probe);
  } catch {}
  set(locale, instrument, true);
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  navigator.serviceWorker?.addEventListener("controllerchange", onChange);
  return () => {
    listeners.delete(onChange);
    navigator.serviceWorker?.removeEventListener("controllerchange", onChange);
  };
}

const hasWorker = () => Boolean(navigator.serviceWorker?.controller);

/**
 * Estado por instrumento (sin comprobar aún: ausente). `null` sin service
 * worker (en desarrollo o sin soporte): entonces no hay nada que indicar.
 */
export function useOfflineInstruments(locale: string): OfflineInstruments | null {
  const worker = useSyncExternalStore(subscribe, hasWorker, () => false);
  const saved = useSyncExternalStore(
    subscribe,
    () => state[locale] ?? EMPTY,
    () => EMPTY,
  );

  useEffect(() => {
    if (!worker) return;
    refresh(locale);
    // Una descarga en otra pestaña.
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith(`yk-offline-${locale}-`)) refresh(locale);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [worker, locale]);

  return worker ? saved : null;
}

/** Enlace del menú a la tarjeta de descarga del inicio: /home#offline-piano */
export const offlineHash = (instrument: Instrument) => `#offline-${instrument}`;

export function parseOfflineHash(hash: string): Instrument | null {
  const id = /^#offline-([a-z]+)$/.exec(hash)?.[1];
  return INSTRUMENTS.find((i) => i === id) ?? null;
}
