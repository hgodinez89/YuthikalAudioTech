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
    additionalPrecacheEntries: ["es", "en"].map((locale) => ({
      url: `/${locale}/offline`,
      revision,
    })),
    // Script clásico (no módulo): lo admiten todos los navegadores con service worker.
    esbuildOptions: { format: "iife" },
  });
