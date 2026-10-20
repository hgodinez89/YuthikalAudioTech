import { defaultLocale, locales } from "@/i18n/config";

/** URL pública del sitio: dominio de producción de Vercel (variable de sistema). */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

/**
 * Canónica y versiones por idioma de una página pública (`path` sin el
 * idioma, p. ej. "/guitar/chords"; "" para el inicio). Relativas a metadataBase.
 */
export function localeAlternates(locale: string, path: string) {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${defaultLocale}${path}`,
    },
  };
}
