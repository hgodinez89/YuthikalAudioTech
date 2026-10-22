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

/**
 * En una página sin conexión, la ruta pedida sin idioma y con su búsqueda
 * (/es/offline/songs#/es/guitar/songs?list=x → /guitar/songs?list=x); en
 * cualquier otra, null. Se lee al momento (p. ej. al cambiar de idioma).
 */
export function offlineTarget(): string | null {
  if (!/^\/(?:es|en)\/offline(?:\/|$)/.test(window.location.pathname)) return null;
  const target = /^#\/(?:es|en)(\/[^#]*)$/.exec(window.location.hash)?.[1];
  // Solo rutas del propio sitio.
  return target && !target.startsWith("//") && !target.includes("\\") ? target : null;
}
