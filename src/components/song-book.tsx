"use client";

import {
  AlignJustify,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize,
  Minimize,
  Minus,
  Plus,
  Scaling,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react";
import { flushSync } from "react-dom";
import { ChordSheet, type ChordDataMap } from "./chord-sheet";
import {
  bookLayout,
  clampStart,
  clampZoom,
  pageAt,
  PAGE_PADDING,
  stepZoom,
  turnPage,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type BookLayout,
} from "@/lib/book";
import type { SheetSection } from "@/lib/chordpro";
import { smoothBehavior } from "@/lib/motion";
import { readPref, writePref } from "@/lib/use-stored-flag";

/* Modo libro solo donde hay espacio para páginas a lo alto. */
const BOOK_QUERY = "(min-width: 768px) and (min-height: 560px)";
const MODE_KEY = "yk-sheet-mode";
const zoomKey = (songId: string) => `yk-book-zoom:${songId}`;
const pageKey = (songId: string) => `yk-book-page:${songId}`;

/* Página actual: solo dura la sesión del navegador (sessionStorage). */
function readSession(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: se vuelve a la primera página */
  }
}
/* Espacio al pie de cada página para su número. */
const PAGE_FOOTER = 22;

function subscribeMedia(onChange: () => void) {
  const mql = window.matchMedia(BOOK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Vista de la canción: "Libro" (páginas a la altura de la pantalla, zoom,
 * controles) en pantallas grandes, o "Continuo" (scroll) como siempre.
 */
export function SongBook({
  songId,
  sections,
  chords,
}: {
  songId: string;
  sections: SheetSection[];
  chords: ChordDataMap;
}) {
  const t = useTranslations("book");
  // false en el servidor y al hidratar: el modo libro aparece tras montar.
  const canBook = useSyncExternalStore(
    subscribeMedia,
    () => window.matchMedia(BOOK_QUERY).matches,
    () => false,
  );
  const [mode, setMode] = useState<"book" | "scroll">(() =>
    readPref(MODE_KEY) === "scroll" ? "scroll" : "book",
  );
  const choose = (next: "book" | "scroll") => {
    setMode(next);
    writePref(MODE_KEY, next);
  };

  if (canBook && mode === "book") {
    return (
      <BookView
        songId={songId}
        sections={sections}
        chords={chords}
        onContinuous={() => choose("scroll")}
      />
    );
  }

  return (
    <div className="max-w-[860px]">
      {canBook && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => choose("book")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-edge-2 bg-surface-2 px-3.5 py-2 text-[13px] font-semibold text-sub hover:text-ink"
          >
            <BookOpen size={15} strokeWidth={2} />
            {t("bookMode")}
          </button>
        </div>
      )}
      <ChordSheet sections={sections} chords={chords} />
    </div>
  );
}

function BookView({
  songId,
  sections,
  chords,
  onContinuous,
}: {
  songId: string;
  sections: SheetSection[];
  chords: ChordDataMap;
  onContinuous: () => void;
}) {
  const t = useTranslations("book");
  const [zoom, setZoom] = useState(() => {
    const saved = Number(readPref(zoomKey(songId)));
    return saved ? clampZoom(saved) : 1;
  });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [count, setCount] = useState(1);
  // Página donde quedaste (en esta sesión): al volver de Editar/Audio caes ahí.
  const [start, setStart] = useState(() => Number(readSession(pageKey(songId))) || 0);
  const [fullscreen, setFullscreen] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  /* Valores vivos para los callbacks (observer, teclado) sin re-suscribirse;
     se actualizan en layout effect, así también dentro de flushSync. */
  const live = useRef({ zoom, size, start, count });
  useLayoutEffect(() => {
    live.current = { zoom, size, start, count };
  });
  /* Línea que estaba primera en pantalla, para no perder el lugar al re-paginar. */
  const anchor = useRef<number | null>(null);
  const smooth = useRef(false);

  const layout = bookLayout(size.width, zoom);
  const { visible, stride } = layout;

  const lineElements = () =>
    Array.from(columnsRef.current?.querySelectorAll<HTMLElement>("[data-line]") ?? []);

  /* Página donde se VE un elemento: se usan sus rectángulos visibles
     (getClientRects da uno por fragmento); offsetLeft no es fiable para
     contenido repartido entre columnas. `last` = su último fragmento. */
  const pageOf = (el: Element, stride: number, last = false) => {
    const container = columnsRef.current;
    const rects = el.getClientRects();
    const rect = rects[last ? rects.length - 1 : 0];
    if (!container || !rect) return 0;
    const x = rect.left - container.getBoundingClientRect().left + container.scrollLeft;
    return pageAt(x, stride);
  };

  /* Páginas usadas: la del último contenido real (líneas y, salvo que se pida
     solo la letra, la leyenda de acordes). No se usa un marcador al final
     porque el margen de la última sección podría empujarlo a una página vacía. */
  const pagesUsed = (stride: number, lyricsOnly = false) => {
    const blocks = columnsRef.current?.querySelectorAll<HTMLElement>(
      lyricsOnly ? "[data-line]" : "[data-line], [data-legend]",
    );
    let last = 0;
    blocks?.forEach((el) => {
      last = Math.max(last, pageOf(el, stride, true));
    });
    return last + 1;
  };

  const captureAnchor = () => {
    const { size: s, zoom: z, start: st } = live.current;
    // Sin ancho aún (primera medición) no hay página real que anclar: se
    // conserva `start` tal cual (p. ej. la página restaurada de la sesión).
    if (s.width <= 0) {
      anchor.current = null;
      return;
    }
    const { stride: sw } = bookLayout(s.width, z);
    const index = lineElements().findIndex((el) => pageOf(el, sw) >= st);
    anchor.current = index >= 0 ? index : null;
  };

  /* Cuenta las páginas tras un cambio de tamaño o zoom y vuelve al lugar anclado. */
  const measure = useCallback((next: BookLayout) => {
    if (!columnsRef.current || next.stride <= 0) return;
    const pages = pagesUsed(next.stride);
    const anchored = anchor.current !== null ? lineElements()[anchor.current] : undefined;
    const target = anchored ? pageOf(anchored, next.stride) : live.current.start;
    smooth.current = false;
    setCount(pages);
    setStart(clampStart(target, pages, next.visible));
    // Solo lee refs y el DOM (pagesUsed/pageOf/lineElements): estable a propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Tamaño del área de páginas: re-pagina al cambiar ventana u orientación. */
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      captureAnchor();
      flushSync(() => setSize({ width, height }));
      measure(bookLayout(width, live.current.zoom));
    });
    observer.observe(area);
    // Las fuentes web re-paginan al terminar de cargar: se vuelve a contar.
    const remeasure = () => {
      captureAnchor();
      measure(bookLayout(live.current.size.width, live.current.zoom));
    };
    document.fonts.ready.then(remeasure);
    document.fonts.addEventListener("loadingdone", remeasure);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", remeasure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure]);

  /* Desplazar hasta la primera página visible (animado al navegar). */
  useEffect(() => {
    columnsRef.current?.scrollTo({
      left: start * stride,
      behavior: smooth.current ? smoothBehavior() : "auto",
    });
    smooth.current = true;
    writeSession(pageKey(songId), String(start));
  }, [start, stride, songId]);

  const applyZoom = (next: number) => {
    const z = clampZoom(next);
    captureAnchor();
    flushSync(() => setZoom(z));
    writePref(zoomKey(songId), String(z));
    measure(bookLayout(live.current.size.width, z));
  };

  /* Zoom más grande con el que toda la letra entra en las páginas visibles. */
  const fitToScreen = () => {
    const width = live.current.size.width;
    for (let z = ZOOM_MAX; z >= ZOOM_MIN - 1e-9; z -= ZOOM_STEP) {
      const candidate = clampZoom(z);
      const next = bookLayout(width, candidate);
      flushSync(() => setZoom(candidate));
      // Se ajusta la letra (lo que se toca); los diagramas pueden seguir después.
      if (pagesUsed(next.stride, true) <= next.visible) {
        writePref(zoomKey(songId), String(candidate));
        anchor.current = null;
        measure(next);
        return;
      }
    }
    applyZoom(1); // no cabe ni al mínimo: tamaño normal, legible
  };

  const go = (target: number) => setStart(clampStart(target, count, visible));
  const turn = (direction: 1 | -1) =>
    setStart(turnPage(start, count, visible, direction));

  /* Pantalla completa: overlay propio + Fullscreen API si el navegador la da. */
  const toggleFullscreen = () => {
    if (!fullscreen) {
      setFullscreen(true);
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      setFullscreen(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  };
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* Teclado y pedales Bluetooth (envían flechas / Av Pág / Re Pág). */
  const keyActions = useRef({ turn, go, applyZoom, toggleFullscreen, fullscreen });
  useLayoutEffect(() => {
    keyActions.current = { turn, go, applyZoom, toggleFullscreen, fullscreen };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // El destino puede no ser un elemento (window/document): solo se ignoran
      // las teclas mientras se escribe en un campo.
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const a = keyActions.current;
      const { count: c, zoom: z } = live.current;
      const handled = (() => {
        switch (e.key) {
          case "ArrowRight":
          case "PageDown":
            a.turn(1);
            return true;
          case "ArrowLeft":
          case "PageUp":
            a.turn(-1);
            return true;
          case " ":
            a.turn(e.shiftKey ? -1 : 1);
            return true;
          case "Home":
            a.go(0);
            return true;
          case "End":
            a.go(c);
            return true;
          case "+":
          case "=":
            a.applyZoom(stepZoom(z, 1));
            return true;
          case "-":
            a.applyZoom(stepZoom(z, -1));
            return true;
          case "0":
            a.applyZoom(1);
            return true;
          case "f":
          case "F":
            a.toggleFullscreen();
            return true;
          case "Escape":
            if (a.fullscreen) a.toggleFullscreen();
            return a.fullscreen;
          default:
            return false;
        }
      })();
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Pantalla siempre encendida mientras se lee (si el navegador lo permite). */
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          lock = sentinel;
        })
        .catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      lock?.release().catch(() => {});
    };
  }, []);

  /* Táctil: tocar el tercio izquierdo/derecho o deslizar pasa de página. */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    touch.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const from = touch.current;
    touch.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      turn(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 1 / 3) turn(-1);
    else if (x > 2 / 3) turn(1);
  };

  const lastVisible = Math.min(start + visible, count);
  const atStart = start === 0;
  const atEnd = start + visible >= count;
  const pagesLabel =
    lastVisible - start <= 1
      ? t("page", { n: start + 1, total: count })
      : t("pages", { from: start + 1, to: lastVisible, total: count });

  const iconButton =
    "grid size-10 cursor-pointer place-items-center rounded-[11px] border border-edge-2 bg-surface-2 text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div
      data-book
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col gap-3 bg-page p-4"
          : "flex min-h-0 flex-1 flex-col gap-3"
      }
    >
      {/* ÁREA DE PÁGINAS */}
      <div
        ref={areaRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="group relative min-h-[320px] flex-1 touch-pan-y select-none"
      >
        <div
          ref={columnsRef}
          className="relative isolate h-full overflow-hidden"
          style={{
            columnCount: visible,
            columnGap: layout.columnGap,
            columnFill: "auto",
            padding: `${PAGE_PADDING}px ${PAGE_PADDING}px ${PAGE_PADDING + PAGE_FOOTER}px`,
          }}
        >
          {/* Tarjetas de página detrás de las columnas */}
          {size.width > 0 &&
            Array.from({ length: count }, (_, i) => (
              <div
                key={i}
                aria-hidden
                className="absolute top-0 -z-10 rounded-2xl border border-edge yk-raised"
                style={{ left: i * stride, width: layout.cardWidth, height: size.height }}
              >
                <span className="absolute inset-x-0 bottom-3 text-center text-[11px] tabular-nums text-mute">
                  {i + 1} / {count}
                </span>
              </div>
            ))}
          <ChordSheet sections={sections} chords={chords} showFab={false} zoom={zoom} />
        </div>

        {/* Flechas laterales */}
        <button
          type="button"
          onClick={() => turn(-1)}
          disabled={atStart}
          aria-label={t("previous")}
          className="absolute left-1 top-1/2 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-edge-2 bg-surface/80 text-sub opacity-0 shadow-pop backdrop-blur transition-opacity hover:text-ink group-hover:opacity-100 disabled:hidden [@media(hover:none)]:opacity-100"
        >
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={() => turn(1)}
          disabled={atEnd}
          aria-label={t("next")}
          className="absolute right-1 top-1/2 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-edge-2 bg-surface/80 text-sub opacity-0 shadow-pop backdrop-blur transition-opacity hover:text-ink group-hover:opacity-100 disabled:hidden [@media(hover:none)]:opacity-100"
        >
          <ChevronRight size={24} strokeWidth={2.2} />
        </button>
      </div>

      {/* BARRA DE CONTROLES */}
      <div className="shrink-0">
        <div className="mb-2.5 h-[3px] overflow-hidden rounded-[3px] bg-edge">
          <div
            className="h-full rounded-[3px] bg-[linear-gradient(90deg,var(--grad-from),var(--grad-to))] transition-[width] duration-300"
            style={{ width: `${(lastVisible / Math.max(count, 1)) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => go(0)}
              disabled={atStart}
              aria-label={t("first")}
              title={t("first")}
              className={iconButton}
            >
              <ChevronsLeft size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => turn(-1)}
              disabled={atStart}
              aria-label={t("previous")}
              title={t("previous")}
              className={iconButton}
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <span className="min-w-[150px] px-2 text-center text-[13px] font-semibold tabular-nums text-sub">
              {pagesLabel}
            </span>
            <button
              type="button"
              onClick={() => turn(1)}
              disabled={atEnd}
              aria-label={t("next")}
              title={t("next")}
              className={iconButton}
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => go(count)}
              disabled={atEnd}
              aria-label={t("last")}
              title={t("last")}
              className={iconButton}
            >
              <ChevronsRight size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyZoom(stepZoom(zoom, -1))}
              disabled={zoom <= ZOOM_MIN}
              aria-label={t("zoomOut")}
              title={t("zoomOut")}
              className={iconButton}
            >
              <Minus size={17} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={() => applyZoom(1)}
              title={t("zoomReset")}
              className="min-w-[58px] cursor-pointer rounded-[10px] px-1.5 py-2 text-center text-[13px] font-semibold tabular-nums text-sub hover:text-ink"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => applyZoom(stepZoom(zoom, 1))}
              disabled={zoom >= ZOOM_MAX}
              aria-label={t("zoomIn")}
              title={t("zoomIn")}
              className={iconButton}
            >
              <Plus size={17} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={fitToScreen}
              title={t("fitHint")}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[11px] border border-edge-2 bg-surface-2 px-3 text-[13px] font-semibold text-sub hover:text-ink"
            >
              <Scaling size={16} strokeWidth={2} />
              {t("fit")}
            </button>
            <span className="mx-1 h-6 w-px bg-edge" />
            <button
              type="button"
              onClick={onContinuous}
              title={t("continuousMode")}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[11px] border border-edge-2 bg-surface-2 px-3 text-[13px] font-semibold text-sub hover:text-ink"
            >
              <AlignJustify size={16} strokeWidth={2} />
              {t("continuous")}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
              title={fullscreen ? t("exitFullscreen") : t("fullscreen")}
              className="yk-gradient grid size-10 cursor-pointer place-items-center rounded-[11px]"
            >
              {fullscreen ? (
                <Minimize size={17} strokeWidth={2.2} />
              ) : (
                <Maximize size={17} strokeWidth={2.2} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
