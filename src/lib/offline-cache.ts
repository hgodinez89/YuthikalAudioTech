/**
 * Páginas públicas que se guardan para consultarlas sin conexión al
 * visitarlas: portada, inicio de regreso y las secciones de referencia de
 * cada instrumento. Nunca canciones ni login (privadas o con sesión).
 */
const PUBLIC_PAGE =
  /^\/(?:es|en)(?:\/?|\/home|\/(?:guitar|ukulele|piano)\/(?:basics|chords|scales)(?:\/[\w-]+)*)\/?$/;

export function isOfflineCacheable(pathname: string): boolean {
  return PUBLIC_PAGE.test(pathname);
}

/**
 * Pide al service worker guardar la página actual si aún no está guardada.
 * Al abrir una dirección el service worker ya la guarda; esto cubre las
 * navegaciones dentro de la app (que solo piden datos, no la página).
 */
export async function keepForOffline(pathname: string): Promise<void> {
  const controller = navigator.serviceWorker?.controller;
  if (!controller || !navigator.onLine || !isOfflineCacheable(pathname)) return;
  // Con «ahorro de datos» no se descarga nada extra.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection;
  if (connection?.saveData) return;
  try {
    if (await caches.match(pathname)) return;
  } catch {
    return;
  }
  controller.postMessage({ type: "CACHE_URLS", payload: { urlsToCache: [pathname] } });
}
