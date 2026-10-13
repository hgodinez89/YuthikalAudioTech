"use client";

import { GripHorizontal, Maximize2, Minimize2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  clampVideoWidth,
  parseStoredWidth,
  resizedWidth,
  VIDEO_KEY_STEP,
  VIDEO_LARGE_WIDTH,
  VIDEO_MIN_WIDTH,
  type VideoCorner,
} from "@/lib/video-size";

const CORNER_KEY = "yk-video-corner";
const SIZE_KEY = "yk-video-size";

/* Ubicación por esquina, con márgenes por variables CSS (ver `insets`). */
const CORNER_CLASS: Record<VideoCorner, string> = {
  tl: "left-4 top-[var(--video-top)]",
  tr: "right-4 top-[var(--video-top)]",
  bl: "left-4 bottom-[var(--video-bottom-mobile)] sm:bottom-[var(--video-bottom)]",
  br: "right-4 bottom-[var(--video-bottom-mobile)] sm:bottom-[var(--video-bottom)]",
};

/** Márgenes de la pantalla donde flota el video (px). */
export type VideoInsets = { top: number; bottom: number; bottomMobile: number };

/* Calibración: bajo el header del sitio y sobre la barra de transporte. */
const DEFAULT_INSETS: VideoInsets = { top: 88, bottom: 120, bottomMobile: 156 };

/**
 * Abierto/cerrado del video, recordado por pantalla en el dispositivo. Antes
 * de hidratar devuelve `initial` (el servidor no conoce la preferencia).
 */
export function useVideoOpen(storageKey: string, initial: boolean) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(() => {
    const saved = typeof window === "undefined" ? null : readPref(storageKey);
    return saved === null ? initial : saved === "1";
  });
  // Se guarda en un efecto: el estado puede cambiar durante el render
  // (apertura automática al reproducir) y ahí no se tocan efectos externos.
  useEffect(() => {
    if (mounted) writePref(storageKey, open ? "1" : "0");
  }, [mounted, open, storageKey]);
  return [mounted ? open : initial, setOpen] as const;
}

/* El asa va en la esquina libre (opuesta al anclaje), con su cursor. */
const HANDLE_CLASS: Record<VideoCorner, string> = {
  br: "left-0 top-0 cursor-nwse-resize",
  tl: "bottom-0 right-0 cursor-nwse-resize",
  bl: "right-0 top-0 cursor-nesw-resize",
  tr: "bottom-0 left-0 cursor-nesw-resize",
};
/* Rotación del dibujo del asa (diagonales hacia la esquina libre). */
const HANDLE_ROTATION: Record<VideoCorner, number> = { tl: 0, bl: -90, br: 180, tr: 90 };

function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: dura solo esta visita */
  }
}

const noopSubscribe = () => () => {};

/**
 * Mini-reproductor flotante: el nodo donde se monta el iframe de YouTube
 * (`containerRef`) nunca cambia de lugar en el DOM —mover un iframe lo
 * recarga—; solo se reposiciona con CSS. Se arrastra y se acomoda en la
 * esquina más cercana, y se redimensiona (16:9) desde la esquina libre.
 * Esquina y ancho se recuerdan en el dispositivo.
 *
 * "Cerrar" no desmonta el iframe (eso destruiría el reproductor y cortaría
 * el audio): la tarjeta sale de la pantalla con su tamaño real.
 */
export function FloatingVideo({
  containerRef,
  open,
  onClose,
  insets = DEFAULT_INSETS,
  overlay = false,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onClose: () => void;
  insets?: VideoInsets;
  /** Sobre un overlay a pantalla completa (Karaoke, z-50): capa más alta. */
  overlay?: boolean;
}) {
  const t = useTranslations("player");
  // Preferencias del navegador solo tras hidratar (el servidor no las conoce).
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [corner, setCorner] = useState<VideoCorner>(() => {
    const saved = typeof window === "undefined" ? null : readPref(CORNER_KEY);
    return saved === "tl" || saved === "tr" || saved === "bl" ? saved : "br";
  });
  const [savedWidth, setSavedWidth] = useState(() =>
    parseStoredWidth(typeof window === "undefined" ? null : readPref(SIZE_KEY)),
  );
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [resizing, setResizing] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const resizeStart = useRef<{ x: number; y: number; width: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const placement = mounted ? corner : "br";
  const width = mounted ? savedWidth : VIDEO_MIN_WIDTH;
  const busy = drag !== null || resizing;

  const applyWidth = (next: number) => {
    const value = clampVideoWidth(next);
    setSavedWidth(value);
    writePref(SIZE_KEY, String(value));
  };

  /* --- mover --- */
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ dx: 0, dy: 0 });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    setDrag({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y });
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      // Esquina más cercana según el centro de la tarjeta al soltar.
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const next = `${cy < window.innerHeight / 2 ? "t" : "b"}${
        cx < window.innerWidth / 2 ? "l" : "r"
      }` as VideoCorner;
      setCorner(next);
      writePref(CORNER_KEY, next);
    }
    setDrag(null);
  };

  /* --- redimensionar (asa en la esquina libre) --- */
  const onResizeDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    // Se parte del ancho visible (el CSS puede estar limitándolo).
    const visibleWidth = cardRef.current?.getBoundingClientRect().width ?? width;
    resizeStart.current = { x: e.clientX, y: e.clientY, width: visibleWidth };
    setResizing(true);
  };
  const onResizeMove = (e: PointerEvent<HTMLButtonElement>) => {
    const from = resizeStart.current;
    if (!from) return;
    setSavedWidth(
      resizedWidth(from.width, e.clientX - from.x, e.clientY - from.y, placement),
    );
  };
  const onResizeUp = () => {
    if (!resizeStart.current) return;
    resizeStart.current = null;
    setResizing(false);
    writePref(SIZE_KEY, String(savedWidth));
  };
  const onResizeKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? VIDEO_KEY_STEP
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -VIDEO_KEY_STEP
          : 0;
    if (!step) return;
    // Que las flechas no lleguen a los atajos de la calibración (±5 s).
    e.preventDefault();
    e.stopPropagation();
    const visibleWidth = cardRef.current?.getBoundingClientRect().width ?? width;
    applyWidth(visibleWidth + step);
  };

  /* Tamaños rápidos: chico (mínimo) ↔ grande. */
  const isSmall = width < VIDEO_LARGE_WIDTH;
  const toggleSize = () => applyWidth(isSmall ? VIDEO_LARGE_WIDTH : VIDEO_MIN_WIDTH);

  return (
    <div
      ref={cardRef}
      aria-hidden={!open}
      className={`fixed ${overlay ? "z-[60]" : "z-40"} w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-edge-2 bg-surface shadow-[0_18px_44px_rgba(0,0,0,0.55)] sm:w-[min(var(--video-w),calc(100vw-32px),calc((100dvh-var(--video-top)-var(--video-bottom)-32px)*16/9))] ${
        open
          ? CORNER_CLASS[placement]
          : "pointer-events-none -left-[9999px] top-0 opacity-0"
      } ${busy ? "" : "transition-[top,bottom,left,right] duration-200"}`}
      style={
        {
          "--video-w": `${width}px`,
          "--video-top": `${insets.top}px`,
          "--video-bottom": `${insets.bottom}px`,
          "--video-bottom-mobile": `${insets.bottomMobile}px`,
          ...(drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : {}),
        } as CSSProperties
      }
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title={t("videoMove")}
        className={`flex h-8 touch-none select-none items-center justify-between border-b border-edge px-2.5 ${
          // Espacio para el asa cuando cae arriba (anclada abajo).
          placement === "br" ? "sm:pl-8" : placement === "bl" ? "sm:pr-8" : ""
        } ${drag ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <span className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-tert">
          <GripHorizontal size={15} strokeWidth={2} />
          {t("video")}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSize}
            aria-label={isSmall ? t("videoLarger") : t("videoSmaller")}
            title={isSmall ? t("videoLarger") : t("videoSmaller")}
            className="hidden size-6 cursor-pointer place-items-center rounded-md text-sub hover:bg-edge hover:text-ink sm:grid"
          >
            {isSmall ? (
              <Maximize2 size={13} strokeWidth={2.2} />
            ) : (
              <Minimize2 size={13} strokeWidth={2.2} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("videoClose")}
            title={t("videoClose")}
            className="grid size-6 cursor-pointer place-items-center rounded-md text-sub hover:bg-edge hover:text-ink"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </span>
      </div>
      {/* Aquí monta el iframe el motor de audio; mientras se mueve o se
          redimensiona no debe robar los eventos del puntero. */}
      <div
        ref={containerRef}
        className={`aspect-video w-full bg-black ${busy ? "pointer-events-none" : ""}`}
      />

      {/* Asa de redimensión (no en celular: el video ya ocupa el ancho) */}
      <button
        type="button"
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onPointerCancel={onResizeUp}
        onDoubleClick={() => applyWidth(VIDEO_MIN_WIDTH)}
        onKeyDown={onResizeKey}
        aria-label={t("videoResize")}
        title={t("videoResizeHint")}
        className={`absolute z-10 hidden size-5 touch-none place-items-center rounded-[6px] bg-surface/85 text-sub hover:text-accent focus-visible:text-accent sm:grid ${HANDLE_CLASS[placement]}`}
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          aria-hidden
          style={{ transform: `rotate(${HANDLE_ROTATION[placement]}deg)` }}
        >
          <path d="M11 1 1 11M11 6 6 11" />
        </svg>
      </button>
    </div>
  );
}
