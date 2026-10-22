"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";

/* Páginas de respaldo sin conexión: /offline y /offline/songs. */
const OFFLINE_PAGE = /^\/offline(?:\/|$)/;

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * Ruta de la app sin idioma (como usePathname). En las páginas sin conexión,
 * la ruta que se pidió, que el service worker deja en el fragmento
 * (/es/offline/songs#/es/guitar/songs → /guitar/songs): así el header y la
 * barra inferior muestran el instrumento y la sección de verdad.
 */
export function useAppPathname(): string {
  const pathname = usePathname();
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
  if (!OFFLINE_PAGE.test(pathname)) return pathname;
  return /^#\/(?:es|en)(\/[^?#]*)/.exec(hash)?.[1] ?? pathname;
}
