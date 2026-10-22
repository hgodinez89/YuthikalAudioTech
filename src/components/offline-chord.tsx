"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { findCatalogChord, type CatalogChord } from "@/lib/chord-catalog";
import { loadCatalog } from "@/lib/chord-catalog-client";
import { isInstrument, type Instrument } from "@/lib/instruments";
import { ChordDetailView } from "./chord-detail-view";
import { InstrumentNav } from "./instrument-nav";

/** La ruta pedida viaja en el hash: /es/offline#/es/guitar/chords/c-major */
const CHORD_PATH = /^#\/(?:es|en)\/([a-z]+)\/chords\/([a-z0-9-]+)\/?$/;

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** En el servidor y al hidratar no hay hash: sale el aviso genérico. */
const useHash = () =>
  useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );

type Found = { instrument: Instrument; slug: string; chord: CatalogChord };

/**
 * Si la página que no se pudo abrir es la ficha de un acorde y su catálogo
 * está guardado, la pinta desde ahí; si no, deja el aviso sin conexión.
 */
export function OfflineChord({ children }: { children: ReactNode }) {
  const hash = useHash();
  const [found, setFound] = useState<Found | null>(null);

  const [, instrument, slug] = CHORD_PATH.exec(hash) ?? [];

  useEffect(() => {
    if (!isInstrument(instrument) || !slug) return;
    let alive = true;
    loadCatalog(instrument)
      .then((catalog) => {
        const chord = findCatalogChord(catalog, slug);
        if (alive && chord) setFound({ instrument, slug, chord });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [instrument, slug]);

  if (!found || found.instrument !== instrument || found.slug !== slug) return children;

  return (
    <>
      <main id="main" tabIndex={-1} className="flex-1 pb-[76px] outline-none md:pb-0">
        <ChordDetailView
          instrument={found.instrument}
          chord={found.chord}
          positions={found.chord.positions}
        />
      </main>
      {/* Secciones en móvil, como en las páginas del instrumento. */}
      <InstrumentNav instrument={found.instrument} />
    </>
  );
}
