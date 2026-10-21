/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type RuntimeCaching,
  type SerwistPlugin,
  type SerwistGlobalConfig,
} from "serwist";
import { staticAssets } from "@/lib/offline-cache";

/*
 * Service worker: consulta sin conexión de lo público ya visitado.
 *
 * Reglas (en orden; gana la primera que coincide):
 *  1. Lo privado o con sesión NUNCA se guarda: canciones, login, auth, api,
 *     y cualquier origen externo (Supabase, YouTube).
 *  2. Archivos con hash de Next: primero caché (nunca cambian).
 *  3. Páginas y datos de navegación (RSC) públicos: primero la red; sin ella,
 *     la copia guardada. Así con conexión nunca se ve contenido viejo.
 * Sin copia guardada, una página redirige a /{idioma}/offline (precargada).
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/* Rutas con datos del usuario o de sesión: solo red. */
const PRIVATE = /^\/(?:(?:es|en)\/(?:login|[^/]+\/songs)(?:\/|$)|auth\/|api\/|serwist\/)/;

const DAY = 24 * 60 * 60;

/*
 * Sin red y sin copia guardada, una página redirige a /{idioma}/offline con la
 * dirección pedida en el fragmento (#/es/guitar/songs). Redirigir (en vez de
 * servirla en la dirección original) evita que el header se hidrate con una
 * ruta que no es la de la página.
 */
const offlineRedirect: SerwistPlugin = {
  handlerDidError: async ({ request }) => {
    if (request.mode !== "navigate") return undefined;
    const url = new URL(request.url);
    const locale = /^\/en(?:\/|$)/.test(url.pathname) ? "en" : "es";
    return Response.redirect(`/${locale}/offline#${url.pathname}${url.search}`, 302);
  },
};

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url }) => !sameOrigin || PRIVATE.test(url.pathname),
    handler: new NetworkOnly({ plugins: [offlineRedirect] }),
  },
  {
    matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
    // Sin caducidad por tiempo: una página guardada los necesita aunque
    // pasen semanas sin abrir el sitio (con hash, nunca quedan viejos).
    handler: new CacheFirst({
      cacheName: "yk-static",
      plugins: [new ExpirationPlugin({ maxEntries: 500 })],
    }),
  },
  {
    matcher: /\.(?:png|svg|ico|webp|jpg|jpeg)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "yk-images",
      plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * DAY })],
    }),
  },
  {
    // Navegación del cliente (RSC) y sus precargas: cada variante tiene su ?_rsc=.
    matcher: ({ request }) => request.headers.get("RSC") === "1",
    handler: new NetworkFirst({
      cacheName: "yk-rsc",
      networkTimeoutSeconds: 5,
      plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * DAY })],
    }),
  },
  {
    // Páginas y el catálogo (al abrirlas, al pedir guardarlas desde la app
    // con CACHE_URLS o con «Descargar [instrumento]»). Sin caducidad por
    // tiempo: con red siempre se piden de nuevo; sin ella, la copia sirve
    // aunque sea vieja. El tope alcanza para los 3 instrumentos en 2 idiomas.
    matcher: ({ request }) => request.method === "GET",
    handler: new NetworkFirst({
      cacheName: "yk-pages",
      networkTimeoutSeconds: 5,
      plugins: [new ExpirationPlugin({ maxEntries: 1000 }), offlineRedirect],
    }),
  },
];

const serwist = new Serwist({
  // Solo se precargan la página sin conexión y el inicio de regreso (el
  // destino de «Ir al inicio» y del logo): el resto se guarda al usarlo, así
  // la primera visita no descarga el sitio entero.
  precacheEntries: (self.__SW_MANIFEST ?? []).filter((entry) =>
    /\/(?:offline|home)$/.test(typeof entry === "string" ? entry : entry.url),
  ),
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();

/*
 * Los JS/CSS de las páginas precargadas: la página sin conexión pinta la
 * ficha de un acorde y el inicio elige instrumento con su propio código, que
 * quizá nunca se cargó con red. Pasan por la regla de los archivos de Next.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const assets = new Set<string>();
      for (const url of ["/es/offline", "/es/home"]) {
        const page = await serwist.matchPrecache(url);
        if (page) for (const asset of staticAssets(await page.text())) assets.add(asset);
      }
      await Promise.allSettled(
        [...assets].map((asset) =>
          serwist.handleRequest({ request: new Request(asset), event }),
        ),
      );
    })(),
  );
});
