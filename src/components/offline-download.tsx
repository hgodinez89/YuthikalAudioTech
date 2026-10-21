"use client";

import { CircleCheck, Download } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Instrument } from "@/lib/instruments";
import { staticAssets } from "@/lib/offline-cache";
import { instrumentDownloadUrls } from "@/lib/offline-download";
import { useOnline } from "@/lib/use-online";

export type DownloadLabels = {
  cta: Record<Instrument, string>;
  done: Record<Instrument, string>;
  /** Texto del botón. */
  action: string;
  size: string;
  /** Con «{percent}» para el avance. */
  progress: string;
  update: string;
  error: string;
  retry: string;
  hint: string;
};

function subscribeController(onChange: () => void) {
  navigator.serviceWorker?.addEventListener("controllerchange", onChange);
  return () => navigator.serviceWorker?.removeEventListener("controllerchange", onChange);
}

/** ¿Hay service worker al mando? (sin él, en desarrollo, no hay descarga). */
const useServiceWorker = () =>
  useSyncExternalStore(
    subscribeController,
    () => Boolean(navigator.serviceWorker?.controller),
    () => false,
  );

const storageKey = (locale: string, instrument: Instrument) =>
  `yk-offline-${locale}-${instrument}`;

function readSaved(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/** Corre `task` sobre cada elemento, de a `size` a la vez. */
async function inPool<T>(items: T[], size: number, task: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

/**
 * Pide cada página con red: el service worker se queda la copia (como al
 * visitarla). Luego, los JS/CSS/fuentes que usan y aún no están guardados.
 */
async function downloadAll(
  urls: string[],
  signal: AbortSignal,
  onProgress: (done: number) => void,
) {
  const assets = new Set<string>();
  let done = 0;
  await inPool(urls, 4, async (url) => {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    if (res.headers.get("content-type")?.includes("text/html")) {
      for (const asset of staticAssets(await res.text())) assets.add(asset);
    } else {
      await res.arrayBuffer();
    }
    onProgress(++done);
  });
  await inPool([...assets], 4, async (asset) => {
    if (await caches.match(asset)) return;
    const res = await fetch(asset, { signal });
    if (!res.ok) throw new Error(`${asset} ${res.status}`);
    await res.arrayBuffer();
  });
}

type Status =
  { kind: "idle" } | { kind: "downloading"; percent: number } | { kind: "error" };

/**
 * «Descargar [instrumento]» del inicio de regreso: deja Básicos, acordes y
 * escalas listos sin conexión, con su avance. Solo aparece con service worker.
 */
export function OfflineDownload({
  locale,
  instrument,
  labels,
}: {
  locale: string;
  instrument: Instrument;
  labels: DownloadLabels;
}) {
  const hasWorker = useServiceWorker();
  const online = useOnline();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Descargado (y aún guardado) por instrumento; null = sin comprobar.
  const [saved, setSaved] = useState<Partial<Record<Instrument, boolean>>>({});
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const abort = useRef<AbortController | null>(null);
  const key = storageKey(locale, instrument);
  const urls = instrumentDownloadUrls(locale, instrument);
  const probe = urls.at(-2)!; // la última escala: solo la guarda una descarga (o visitarla)

  // Lo marcado como descargado puede haberlo borrado el navegador: se comprueba.
  useEffect(() => {
    if (!hasWorker || saved[instrument] !== undefined) return;
    const flagged = readSaved(key);
    void (flagged ? caches.match(probe) : Promise.resolve(undefined)).then(
      (hit) => setSaved((s) => ({ ...s, [instrument]: flagged && Boolean(hit) })),
      () => setSaved((s) => ({ ...s, [instrument]: false })),
    );
  }, [hasWorker, instrument, key, probe, saved]);

  // Sin almacenamiento persistente, el navegador puede borrar la copia.
  useEffect(() => {
    if (!hasWorker) return;
    void navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => {});
  }, [hasWorker]);

  // Cambiar de instrumento o salir de la página corta la descarga en curso.
  useEffect(() => () => abort.current?.abort(), [instrument]);

  if (!hasWorker) return null;
  const isSaved = saved[instrument] === true;
  if (!online && !isSaved) return null;

  const start = () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    // Pedirlo dentro del clic: algunos navegadores lo atan al gesto.
    void navigator.storage
      ?.persist?.()
      .then(setPersisted)
      .catch(() => {});
    setStatus({ kind: "downloading", percent: 0 });
    const total = urls.length + 1; // + los archivos de Next
    downloadAll(urls, controller.signal, (done) =>
      setStatus({ kind: "downloading", percent: Math.round((done / total) * 100) }),
    )
      .then(() => {
        try {
          localStorage.setItem(key, String(Date.now()));
        } catch {}
        setSaved((s) => ({ ...s, [instrument]: true }));
        setStatus({ kind: "idle" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus({ kind: "error" });
      });
  };

  const downloading = status.kind === "downloading";
  const button =
    "shrink-0 cursor-pointer rounded-[10px] border border-edge-2 px-3.5 py-2 text-[13px] font-semibold text-ink hover:border-accent disabled:cursor-default disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-edge bg-surface-3 px-[18px] py-3.5">
      <div className="flex flex-wrap items-center gap-3.5">
        {isSaved && !downloading ? (
          <CircleCheck size={18} strokeWidth={2} className="shrink-0 text-accent" />
        ) : (
          <Download size={18} strokeWidth={2} className="shrink-0 text-accent" />
        )}
        <div className="min-w-[200px] flex-1">
          <div className="text-[15px] font-semibold">
            {isSaved && !downloading ? labels.done[instrument] : labels.cta[instrument]}
          </div>
          <div className="text-[13px] text-sub" aria-live="polite">
            {downloading
              ? labels.progress.replace("{percent}", String(status.percent))
              : status.kind === "error"
                ? labels.error
                : labels.size}
          </div>
        </div>
        {online && (
          <button type="button" onClick={start} disabled={downloading} className={button}>
            {status.kind === "error"
              ? labels.retry
              : isSaved
                ? labels.update
                : labels.action}
          </button>
        )}
      </div>
      {downloading && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={status.percent}
          className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="yk-gradient h-full rounded-full transition-[width] duration-200"
            style={{ width: `${status.percent}%` }}
          />
        </div>
      )}
      {isSaved && persisted === false && !downloading && (
        <p className="text-[12.5px] text-tert">{labels.hint}</p>
      )}
    </div>
  );
}
