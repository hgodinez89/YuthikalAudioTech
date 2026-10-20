import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

/**
 * Idioma en la URL (/es/…, /en/…): las páginas públicas se generan una vez
 * por idioma y Google indexa ambos. Las rutas sin idioma las redirige
 * `src/proxy.ts` al preferido (cookie) o al español; aquí no se detecta.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
  localeCookie: false,
});
