import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

/*
 * Acceso directo en la pantalla de inicio (Android/iOS). Se abre en el
 * navegador (no standalone): en iOS una app standalone guarda cookies aparte
 * y el login con Google por redirección perdería la sesión.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("metadata");
  return {
    name: t("title"),
    short_name: "Yuthikal",
    description: t("description"),
    start_url: "/",
    display: "browser",
    background_color: "#05070a",
    theme_color: "#05070a",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
