"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Preferencia guardada en el dispositivo; sin almacenamiento, null. */
export function readPref(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: dura solo esta visita */
  }
}

const noopSubscribe = () => () => {};

/** false en el servidor y al hidratar; true ya montado en el navegador. */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Valor recordado en el dispositivo (orden de la lista, video abierto…).
 * Antes de hidratar devuelve `initial` (el servidor no conoce la preferencia);
 * `parse` devuelve null para un valor guardado inválido.
 */
export function useStoredValue<T>(
  storageKey: string,
  initial: T,
  parse: (raw: string) => T | null,
  serialize: (value: T) => string,
) {
  const mounted = useMounted();
  const [value, setValue] = useState<T>(() => {
    const saved = readPref(storageKey);
    return (saved === null ? null : parse(saved)) ?? initial;
  });
  // Se guarda en un efecto: el estado puede cambiar durante el render
  // (apertura automática del video al reproducir) y ahí no se tocan efectos externos.
  useEffect(() => {
    if (mounted) writePref(storageKey, serialize(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serialize es puro
  }, [mounted, value, storageKey]);
  return [mounted ? value : initial, setValue] as const;
}

const parseFlag = (raw: string) => (raw === "1" ? true : raw === "0" ? false : null);
const serializeFlag = (value: boolean) => (value ? "1" : "0");

/** Sí/no recordado en el dispositivo (video abierto, scroll sincronizado…). */
export function useStoredFlag(storageKey: string, initial: boolean) {
  return useStoredValue(storageKey, initial, parseFlag, serializeFlag);
}
