"use client";

import { catalogUrl, type Catalog } from "./chord-catalog";
import type { Instrument } from "./instruments";

const loaded = new Map<Instrument, Promise<Catalog>>();

/**
 * Catálogo local de un instrumento (una vez por visita). Con red viene del
 * CDN y el service worker se queda una copia; sin red, esa copia.
 */
export function loadCatalog(instrument: Instrument): Promise<Catalog> {
  let catalog = loaded.get(instrument);
  if (!catalog) {
    catalog = fetch(catalogUrl(instrument)).then((res) => {
      if (!res.ok) throw new Error(`catalog ${res.status}`);
      return res.json() as Promise<Catalog>;
    });
    // Un fallo (sin red ni copia) no se recuerda: se reintenta la próxima vez.
    catalog.catch(() => loaded.delete(instrument));
    loaded.set(instrument, catalog);
  }
  return catalog;
}

/**
 * Deja el catálogo guardado para usarlo sin conexión, en un momento libre y
 * sin «ahorro de datos» (lo llaman las páginas de acordes al abrirse con red).
 */
export function warmCatalog(instrument: Instrument) {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection;
  if (!navigator.onLine || connection?.saveData) return;
  const run = () => void loadCatalog(instrument).catch(() => {});
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 5000 });
  else setTimeout(run, 2000);
}
