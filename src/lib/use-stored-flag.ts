"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Preferencia guardada en el dispositivo; sin almacenamiento, null. */
export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
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

/**
 * Sí/no recordado en el dispositivo (video abierto, scroll sincronizado…).
 * Antes de hidratar devuelve `initial` (el servidor no conoce la preferencia).
 */
export function useStoredFlag(storageKey: string, initial: boolean) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [value, setValue] = useState(() => {
    const saved = typeof window === "undefined" ? null : readPref(storageKey);
    return saved === null ? initial : saved === "1";
  });
  // Se guarda en un efecto: el estado puede cambiar durante el render
  // (apertura automática del video al reproducir) y ahí no se tocan efectos externos.
  useEffect(() => {
    if (mounted) writePref(storageKey, value ? "1" : "0");
  }, [mounted, value, storageKey]);
  return [mounted ? value : initial, setValue] as const;
}
