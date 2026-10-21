import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

/* Versión de las páginas precargadas (offline): cambia con cada commit, así
   un deploy nuevo renueva su copia. */
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

/* Sirve /serwist/sw.js (estático, generado en el build con esbuild). */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    // Siempre disponibles sin conexión: la página de respaldo y el inicio de
    // regreso (si no, «Ir al inicio» volvería a la página de respaldo).
    additionalPrecacheEntries: ["es", "en"].flatMap((locale) =>
      ["offline", "home"].map((page) => ({ url: `/${locale}/${page}`, revision })),
    ),
    // esbuild nativo (dependencia instalada). Por defecto Serwist usa el nativo
    // solo en Windows y esbuild-wasm en el resto: en Vercel (Linux) fallaba.
    useNativeEsbuild: true,
    // Script clásico (no módulo): lo admiten todos los navegadores con service worker.
    esbuildOptions: { format: "iife" },
  });
