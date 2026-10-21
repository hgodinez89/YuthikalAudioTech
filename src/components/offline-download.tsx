"use client";

import { CircleCheck, CloudOff, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Instrument } from "@/lib/instruments";
import { staticAssets } from "@/lib/offline-cache";
import { instrumentDownloadUrls } from "@/lib/offline-download";
import { useOnline } from "@/lib/use-online";
import { markDownloaded, type OfflineInstruments } from "@/lib/use-offline-instruments";

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
  /** Sin red y sin descargar: el botón espera la conexión. */
  needsConnection: string;
};

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
 * escalas listos sin conexión, con su avance. `saved` viene de
 * useOfflineInstruments (lo comparte con los botones de instrumento).
 */
export function OfflineDownload({
  locale,
  instrument,
  saved,
  highlight,
  labels,
}: {
  locale: string;
  instrument: Instrument;
  saved: OfflineInstruments;
  /** Se llegó desde «Descargar» del menú: se resalta un momento. */
  highlight: boolean;
  labels: DownloadLabels;
}) {
  const online = useOnline();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const abort = useRef<AbortController | null>(null);
  const urls = instrumentDownloadUrls(locale, instrument);
  const probe = urls.at(-2)!; // la última escala: solo la guarda una descarga (o visitarla)

  // Sin almacenamiento persistente, el navegador puede borrar la copia.
  useEffect(() => {
    void navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => {});
  }, []);

  // Cambiar de instrumento o salir de la página corta la descarga en curso.
  useEffect(() => () => abort.current?.abort(), [instrument]);

  const isSaved = saved[instrument] === true;

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
        markDownloaded(locale, instrument, probe);
        setStatus({ kind: "idle" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus({ kind: "error" });
      });
  };

  const downloading = status.kind === "downloading";
  const button =
    "shrink-0 cursor-pointer rounded-[10px] border border-edge-2 px-3.5 py-2 text-[13px] font-semibold text-ink hover:border-accent disabled:cursor-default disabled:opacity-60";

  const waiting = !online && !isSaved;

  return (
    <div
      id={`offline-${instrument}`}
      className={`flex scroll-mt-24 flex-col gap-2 rounded-[14px] border bg-surface-3 px-[18px] py-3.5 transition-[border-color,box-shadow] duration-500 motion-reduce:transition-none ${
        highlight
          ? "border-accent shadow-[0_0_0_3px_rgb(53_214_232/0.18)]"
          : "border-edge"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3.5">
        {isSaved && !downloading ? (
          <CircleCheck size={18} strokeWidth={2} className="shrink-0 text-accent" />
        ) : waiting ? (
          <CloudOff size={18} strokeWidth={2} className="shrink-0 text-mute" />
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
                : waiting
                  ? labels.needsConnection
                  : labels.size}
          </div>
        </div>
        {/* Sin red: solo si falta descargarlo, deshabilitado hasta que vuelva. */}
        {(online || !isSaved) && (
          <button
            type="button"
            onClick={start}
            disabled={downloading || !online}
            className={button}
          >
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
